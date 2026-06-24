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

// ── Color tables ──────────────────────────────────────────────────────────────
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

function ansi256(n) {
  if (n < 16)
    return [
      "#000",
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
    ][n];
  if (n >= 232) {
    const v = Math.round(((n - 232) / 23) * 255);
    return `rgb(${v},${v},${v})`;
  }
  n -= 16;
  const ch = (x) => (x === 0 ? 0 : 55 + x * 40);
  return `rgb(${ch(Math.floor(n / 36))},${ch(Math.floor(n / 6) % 6)},${ch(
    n % 6,
  )})`;
}

function sameStyle(a, b) {
  const ka = Object.keys(a),
    kb = Object.keys(b);
  if (ka.length !== kb.length) return false;
  for (const k of ka) if (a[k] !== b[k]) return false;
  return true;
}

// ── Virtual terminal emulator ─────────────────────────────────────────────────
// Matches CSI sequences (ESC [ ... X) or bare ESC + one char.
const ESC_RE = /\x1b(?:\[([^A-Za-z]*)([A-Za-z])|([^[]))/g;

class TerminalEmulator {
  constructor() {
    this.rows = [[]]; // rows[r][c] = { char, style }
    this.cursorRow = 0;
    this.cursorCol = 0;
    this.style = {};
    this.savedCursor = { row: 0, col: 0 };
  }

  _ensureRow(r) {
    while (this.rows.length <= r) this.rows.push([]);
  }

  _writeChar(ch) {
    this._ensureRow(this.cursorRow);
    const row = this.rows[this.cursorRow];
    while (row.length <= this.cursorCol) row.push({ char: " ", style: {} });
    row[this.cursorCol] = { char: ch, style: this.style };
    this.cursorCol++;
  }

  _processSGR(raw) {
    const codes = raw === "" ? [0] : raw.split(/[;:]/).map(Number);
    let i = 0;
    while (i < codes.length) {
      const c = codes[i];
      if (c === 0) {
        this.style = {};
      } else if (c === 1) this.style = { ...this.style, fontWeight: "bold" };
      else if (c === 2) this.style = { ...this.style, opacity: 0.6 };
      else if (c === 3) this.style = { ...this.style, fontStyle: "italic" };
      else if (c === 4)
        this.style = { ...this.style, textDecoration: "underline" };
      else if (c === 7) this.style = { ...this.style, filter: "invert(1)" };
      else if (c === 9)
        this.style = { ...this.style, textDecoration: "line-through" };
      else if (c === 22) {
        const { fontWeight, opacity, ...r } = this.style;
        this.style = r;
      } else if (c === 23) {
        const { fontStyle, ...r } = this.style;
        this.style = r;
      } else if (c === 24) {
        const { textDecoration, ...r } = this.style;
        this.style = r;
      } else if (c === 39) {
        const { color, ...r } = this.style;
        this.style = r;
      } else if (c === 49) {
        const { backgroundColor, ...r } = this.style;
        this.style = r;
      } else if ((c >= 30 && c <= 37) || (c >= 90 && c <= 97))
        this.style = { ...this.style, color: FG[c] };
      else if ((c >= 40 && c <= 47) || (c >= 100 && c <= 107))
        this.style = { ...this.style, backgroundColor: BG[c] };
      else if (c === 38 || c === 48) {
        const prop = c === 38 ? "color" : "backgroundColor";
        if (codes[i + 1] === 2 && i + 4 < codes.length) {
          this.style = {
            ...this.style,
            [prop]: `rgb(${codes[i + 2]},${codes[i + 3]},${codes[i + 4]})`,
          };
          i += 4;
        } else if (codes[i + 1] === 5 && i + 2 < codes.length) {
          this.style = { ...this.style, [prop]: ansi256(codes[i + 2]) };
          i += 2;
        }
      }
      i++;
    }
  }

  _eraseInLine(mode) {
    this._ensureRow(this.cursorRow);
    const row = this.rows[this.cursorRow];
    if (mode === 0) {
      // cursor → end
      for (let i = this.cursorCol; i < row.length; i++)
        row[i] = { char: " ", style: {} };
    } else if (mode === 1) {
      // start → cursor
      for (let i = 0; i <= Math.min(this.cursorCol, row.length - 1); i++)
        row[i] = { char: " ", style: {} };
    } else if (mode === 2) {
      // whole line
      this.rows[this.cursorRow] = [];
    }
  }

  _eraseInDisplay(mode) {
    if (mode === 0) {
      // cursor → end of display
      this._eraseInLine(0);
      for (let r = this.cursorRow + 1; r < this.rows.length; r++)
        this.rows[r] = [];
    } else if (mode === 1) {
      // start → cursor
      for (let r = 0; r < this.cursorRow; r++) this.rows[r] = [];
      this._eraseInLine(1);
    } else if (mode === 2 || mode === 3) {
      // whole display
      for (let r = 0; r < this.rows.length; r++) this.rows[r] = [];
    }
  }

  // Feed a chunk of text (may contain escape sequences and control chars).
  feed(text) {
    let last = 0;
    for (const m of text.matchAll(ESC_RE)) {
      if (m.index > last) this._writeRaw(text.slice(last, m.index));
      last = m.index + m[0].length;

      if (m[3] !== undefined) {
        // Bare ESC + single char (non-CSI)
        const ch = m[3];
        if (ch === "7")
          this.savedCursor = { row: this.cursorRow, col: this.cursorCol };
        else if (ch === "8") {
          this.cursorRow = this.savedCursor.row;
          this.cursorCol = this.savedCursor.col;
        } else if (ch === "M") this.cursorRow = Math.max(0, this.cursorRow - 1); // reverse index
        // all others ignored
        continue;
      }

      const params = m[1];
      const cmd = m[2];

      // Ignore DEC private / intermediate sequences
      if (/^[!?]/.test(params)) continue;

      const parts =
        params === "" ? [0] : params.split(";").map((s) => parseInt(s) || 0);
      const n = parts[0] || 1;

      switch (cmd) {
        case "m":
          this._processSGR(params);
          break;
        case "A":
          this.cursorRow = Math.max(0, this.cursorRow - n);
          break;
        case "B":
          this.cursorRow += n;
          this._ensureRow(this.cursorRow);
          break;
        case "C":
          this.cursorCol += n;
          break;
        case "D":
          this.cursorCol = Math.max(0, this.cursorCol - n);
          break;
        case "E":
          this.cursorRow += n;
          this.cursorCol = 0;
          this._ensureRow(this.cursorRow);
          break;
        case "F":
          this.cursorRow = Math.max(0, this.cursorRow - n);
          this.cursorCol = 0;
          break;
        case "G":
          this.cursorCol = Math.max(0, n - 1);
          break;
        case "H":
        case "f":
          this.cursorRow = Math.max(0, (parts[0] || 1) - 1);
          this.cursorCol = Math.max(0, (parts[1] || 1) - 1);
          this._ensureRow(this.cursorRow);
          break;
        case "J":
          this._eraseInDisplay(parts[0] || 0);
          break;
        case "K":
          this._eraseInLine(parts[0] || 0);
          break;
        case "s":
          this.savedCursor = { row: this.cursorRow, col: this.cursorCol };
          break;
        case "u":
          this.cursorRow = this.savedCursor.row;
          this.cursorCol = this.savedCursor.col;
          break;
        default:
          break;
      }
    }
    if (last < text.length) this._writeRaw(text.slice(last));
  }

  _writeRaw(text) {
    for (const ch of text) {
      const cp = ch.charCodeAt(0);
      if (ch === "\n") {
        this.cursorRow++;
        this.cursorCol = 0;
        this._ensureRow(this.cursorRow);
      } else if (ch === "\r") {
        this.cursorCol = 0;
      } else if (ch === "\t") {
        this.cursorCol = (Math.floor(this.cursorCol / 8) + 1) * 8;
      } else if (ch === "\x08") {
        this.cursorCol = Math.max(0, this.cursorCol - 1);
      } else if (ch === "\x07" || ch === "\x1b") {
        /* bell / stray ESC: ignore */
      } else if (cp >= 0x20) {
        this._writeChar(ch);
      }
    }
  }

  // Returns rows as arrays of {text, style} segments (adjacent same-style cells merged).
  getSnapshot() {
    return this.rows.map((row) => {
      if (row.length === 0) return [{ text: "", style: {} }];
      const segs = [];
      let txt = row[0].char,
        sty = row[0].style;
      for (let i = 1; i < row.length; i++) {
        if (sameStyle(row[i].style, sty)) {
          txt += row[i].char;
        } else {
          segs.push({ text: txt, style: sty });
          txt = row[i].char;
          sty = row[i].style;
        }
      }
      segs.push({ text: txt, style: sty });
      return segs;
    });
  }
}

// ── Component ─────────────────────────────────────────────────────────────────
function TaskOutputModal({ open, task, onClose, onTaskDone }) {
  const [snapshot, setSnapshot] = useState([]);
  const [termStatus, setTermStatus] = useState("running");
  const termRef = useRef(null);
  const bottomRef = useRef(null);
  const esRef = useRef(null);

  useEffect(() => {
    if (!open || !task) {
      setSnapshot([]);
      setTermStatus("running");
      return;
    }

    const term = new TerminalEmulator();
    termRef.current = term;
    setSnapshot([]);
    setTermStatus("running");

    if (esRef.current) esRef.current.close();

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
          term.feed(data.line + "\n");
          setSnapshot(term.getSnapshot());
        }
      } catch {
        // ignore parse errors
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
    bottomRef.current?.scrollIntoView({ behavior: "auto" });
  }, [snapshot]);

  const handleAbort = async () => {
    if (!task) return;
    await fetch(`/api/madgraph/tasks/${task.id}/abort`, { method: "POST" });
  };

  const chipColor =
    termStatus === "done"
      ? "success"
      : termStatus === "aborted"
        ? "default"
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
            fontFamily:
              '"Menlo", "Monaco", "Consolas", "Courier New", monospace',
            fontSize: "0.8rem",
            lineHeight: 1,
            letterSpacing: 0,
            wordSpacing: 0,
            p: 2,
            height: 450,
            overflow: "auto",
            borderRadius: 1,
            whiteSpace: "pre",
          }}
        >
          {snapshot.map((rowSegs, rowIdx) => (
            <div key={rowIdx}>
              {rowSegs.some((s) => s.text)
                ? rowSegs.map((seg, segIdx) =>
                    seg.text ? (
                      <span key={segIdx} style={seg.style}>
                        {seg.text}
                      </span>
                    ) : null,
                  )
                : " "}
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
        {termStatus === "running" && (
          <Button onClick={handleAbort} color="error">
            Abort
          </Button>
        )}
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}

export default TaskOutputModal;
