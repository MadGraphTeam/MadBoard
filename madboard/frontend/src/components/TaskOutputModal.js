import React, { useEffect, useRef, useState } from "react";
import {
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
} from "@mui/material";

// ANSI SGR color palettes (for a dark terminal background)
const FG = {
  30: "#2e3436",
  31: "#cc0000",
  32: "#4e9a06",
  33: "#c4a000",
  34: "#729fcf",
  35: "#75507b",
  36: "#06989a",
  37: "#d3d7cf",
  90: "#555753",
  91: "#ef2929",
  92: "#8ae234",
  93: "#fce94f",
  94: "#729fcf",
  95: "#ad7fa8",
  96: "#34e2e2",
  97: "#eeeeec",
};
const BG = {
  40: "#2e3436",
  41: "#cc0000",
  42: "#4e9a06",
  43: "#c4a000",
  44: "#3465a4",
  45: "#75507b",
  46: "#06989a",
  47: "#d3d7cf",
  100: "#555753",
  101: "#ef2929",
  102: "#8ae234",
  103: "#fce94f",
  104: "#729fcf",
  105: "#ad7fa8",
  106: "#34e2e2",
  107: "#eeeeec",
};

// Parse a string with ANSI CSI sequences into an array of {text, style} segments.
// Unknown / non-SGR sequences are silently dropped.
function parseAnsi(raw) {
  // Strip bare carriage returns (progress-bar overwrites)
  const text = raw.replace(/\r(?!\n)/g, "");

  const segments = [];
  // Match any CSI sequence: ESC [ <params> <final-byte>
  const csiRe = /\x1b\[([0-9;:]*)([A-Za-z])/g;
  let style = {};
  let last = 0;

  for (const m of text.matchAll(csiRe)) {
    if (m.index > last) {
      segments.push({ text: text.slice(last, m.index), style: { ...style } });
    }
    last = m.index + m[0].length;

    if (m[2] !== "m") continue; // only handle SGR

    const codes = m[1] === "" ? [0] : m[1].split(/[;:]/).map(Number);
    let i = 0;
    while (i < codes.length) {
      const c = codes[i];
      if (c === 0) {
        style = {};
      } else if (c === 1) {
        style = { ...style, fontWeight: "bold" };
      } else if (c === 2) {
        style = { ...style, opacity: 0.6 };
      } else if (c === 3) {
        style = { ...style, fontStyle: "italic" };
      } else if (c === 4) {
        style = { ...style, textDecoration: "underline" };
      } else if (c === 7) {
        // reverse: swap fg/bg — approximate with invert filter
        style = { ...style, filter: "invert(1)" };
      } else if (c === 9) {
        style = { ...style, textDecoration: "line-through" };
      } else if (c === 22) {
        const { fontWeight, opacity, ...rest } = style;
        style = rest;
      } else if (c === 23) {
        const { fontStyle, ...rest } = style;
        style = rest;
      } else if (c === 24) {
        const { textDecoration, ...rest } = style;
        style = rest;
      } else if (c === 39) {
        const { color, ...rest } = style;
        style = rest;
      } else if (c === 49) {
        const { backgroundColor, ...rest } = style;
        style = rest;
      } else if ((c >= 30 && c <= 37) || (c >= 90 && c <= 97)) {
        style = { ...style, color: FG[c] };
      } else if ((c >= 40 && c <= 47) || (c >= 100 && c <= 107)) {
        style = { ...style, backgroundColor: BG[c] };
      } else if (c === 38 || c === 48) {
        const prop = c === 38 ? "color" : "backgroundColor";
        if (codes[i + 1] === 2 && i + 4 < codes.length) {
          style = {
            ...style,
            [prop]: `rgb(${codes[i + 2]},${codes[i + 3]},${codes[i + 4]})`,
          };
          i += 4;
        } else if (codes[i + 1] === 5 && i + 2 < codes.length) {
          style = { ...style, [prop]: ansi256(codes[i + 2]) };
          i += 2;
        }
      }
      i++;
    }
  }

  if (last < text.length) {
    segments.push({ text: text.slice(last), style: { ...style } });
  }

  return segments;
}

// Rough approximation of the xterm 256-color palette
function ansi256(n) {
  if (n < 16) {
    const basic = [
      "#000000",
      "#800000",
      "#008000",
      "#808000",
      "#000080",
      "#800080",
      "#008080",
      "#c0c0c0",
      "#808080",
      "#ff0000",
      "#00ff00",
      "#ffff00",
      "#0000ff",
      "#ff00ff",
      "#00ffff",
      "#ffffff",
    ];
    return basic[n];
  }
  if (n >= 232) {
    const v = Math.round(((n - 232) / 23) * 255);
    return `rgb(${v},${v},${v})`;
  }
  n -= 16;
  const b = n % 6,
    g = Math.floor(n / 6) % 6,
    r = Math.floor(n / 36);
  const ch = (x) => (x === 0 ? 0 : 55 + x * 40);
  return `rgb(${ch(r)},${ch(g)},${ch(b)})`;
}

function AnsiLine({ text }) {
  const segments = parseAnsi(text);
  if (segments.length === 0) return <span> </span>;
  return (
    <>
      {segments.map((seg, i) =>
        seg.text ? (
          <span key={i} style={seg.style}>
            {seg.text}
          </span>
        ) : null,
      )}
    </>
  );
}

function TaskOutputModal({ open, task, onClose, onTaskDone }) {
  const [lines, setLines] = useState([]);
  const [termStatus, setTermStatus] = useState("running");
  const bottomRef = useRef(null);
  const esRef = useRef(null);

  useEffect(() => {
    if (!open || !task) {
      setLines([]);
      setTermStatus("running");
      return;
    }

    setLines([]);
    setTermStatus("running");

    if (esRef.current) {
      esRef.current.close();
    }

    const es = new EventSource(`/api/madgraph/tasks/${task.id}/stream`);
    esRef.current = es;

    es.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        if (data.done) {
          const s = data.status || "done";
          setTermStatus(s);
          onTaskDone?.(task.id, s);
          es.close();
          esRef.current = null;
          return;
        }
        if (data.line !== undefined) {
          setLines((prev) => [...prev, data.line]);
        }
      } catch {
        setLines((prev) => [...prev, e.data]);
      }
    };

    es.onerror = () => {
      setTermStatus("error");
      onTaskDone?.(task.id, "error");
      es.close();
      esRef.current = null;
    };

    return () => {
      es.close();
      esRef.current = null;
    };
  }, [open, task?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [lines]);

  const chipColor =
    termStatus === "done"
      ? "success"
      : termStatus === "error"
        ? "error"
        : "warning";

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        {task?.name}
        <Chip label={termStatus} color={chipColor} size="small" />
      </DialogTitle>
      <DialogContent>
        <Box
          sx={{
            backgroundColor: "#1a1a1a",
            color: "#d4d4d4",
            fontFamily: '"Courier New", Courier, monospace',
            fontSize: "0.8rem",
            p: 2,
            height: 450,
            overflow: "auto",
            borderRadius: 1,
            whiteSpace: "pre",
          }}
        >
          {lines.map((line, i) => (
            <div key={i}>
              <AnsiLine text={line} />
            </div>
          ))}
          {termStatus === "running" && (
            <span
              style={{
                display: "inline-block",
                animation: "madboard-blink 1s step-end infinite",
              }}
            >
              ▌
            </span>
          )}
          <div ref={bottomRef} />
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}

export default TaskOutputModal;
