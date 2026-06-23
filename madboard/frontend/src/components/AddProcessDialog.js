import React, { useState } from "react";
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
} from "@mui/material";

function AddProcessDialog({ open, onClose, onSubmit, existingProcesses }) {
  const [processStr, setProcessStr] = useState("");
  const [processName, setProcessName] = useState("");
  const [awaitingConfirm, setAwaitingConfirm] = useState(false);
  const [error, setError] = useState("");

  const reset = () => {
    setProcessStr("");
    setProcessName("");
    setAwaitingConfirm(false);
    setError("");
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleSubmit = () => {
    if (!processStr.trim()) {
      setError("Process string is required");
      return;
    }
    if (!processName.trim()) {
      setError("Output folder name is required");
      return;
    }
    if (existingProcesses.includes(processName.trim()) && !awaitingConfirm) {
      setAwaitingConfirm(true);
      return;
    }
    onSubmit(processStr.trim(), processName.trim());
    reset();
    onClose();
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>Add Process</DialogTitle>
      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        {awaitingConfirm && (
          <Alert severity="warning" sx={{ mb: 2 }}>
            A process named &ldquo;{processName}&rdquo; already exists. Click{" "}
            <strong>Overwrite</strong> to replace it.
          </Alert>
        )}
        <TextField
          label="Process String"
          value={processStr}
          onChange={(e) => {
            setProcessStr(e.target.value);
            setError("");
          }}
          onKeyDown={handleKeyDown}
          fullWidth
          margin="normal"
          placeholder="e.g. p p > t t~"
          autoFocus
        />
        <TextField
          label="Output Folder Name"
          value={processName}
          onChange={(e) => {
            setProcessName(e.target.value);
            setError("");
            setAwaitingConfirm(false);
          }}
          onKeyDown={handleKeyDown}
          fullWidth
          margin="normal"
          placeholder="e.g. tt_production"
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>Cancel</Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          color={awaitingConfirm ? "warning" : "primary"}
        >
          {awaitingConfirm ? "Overwrite" : "Generate"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default AddProcessDialog;
