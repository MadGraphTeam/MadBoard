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
          }}
        >
          {lines.map((line, i) => (
            <div key={i}>{line || " "}</div>
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
