import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Autocomplete,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
} from "@mui/material";

const DEFAULT_MODEL = "sm";

// Particle names carry characters that have no place in a directory name
const NAME_REPLACEMENTS = [
  [/~/g, "x"],
  [/\+/g, "p"],
  [/-/g, "m"],
  [/>/g, "_"],
  [/[^A-Za-z0-9_]+/g, "_"],
];

/**
 * Suggest an output folder from the first process line, so that
 * "p p > t t~, t > w+ b" becomes "pp_ttx".
 */
function suggestedName(processText) {
  const firstLine = processText.split("\n")[0].split(",")[0].trim();
  if (!firstLine) return "";
  const name = NAME_REPLACEMENTS.reduce(
    (text, [pattern, replacement]) => text.replace(pattern, replacement),
    firstLine.replace(/\s+/g, ""),
  ).replace(/^_+|_+$/g, "");
  return name;
}

function AddProcessDialog({ open, onClose, onSubmit, existingProcesses }) {
  const [model, setModel] = useState(DEFAULT_MODEL);
  const [models, setModels] = useState([]);
  const [processStr, setProcessStr] = useState("");
  const [processName, setProcessName] = useState("");
  // Once the name is typed in by hand it is no longer derived from the process
  const [nameEdited, setNameEdited] = useState(false);
  const [awaitingConfirm, setAwaitingConfirm] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    fetch("/api/madgraph/models")
      .then((r) => r.json())
      .then((d) => setModels(d.models || []))
      .catch(() => setModels([]));
  }, [open]);

  const processes = useMemo(
    () =>
      processStr
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean),
    [processStr],
  );

  const effectiveName = nameEdited ? processName : suggestedName(processStr);

  const reset = () => {
    setModel(DEFAULT_MODEL);
    setProcessStr("");
    setProcessName("");
    setNameEdited(false);
    setAwaitingConfirm(false);
    setError("");
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleSubmit = () => {
    if (processes.length === 0) {
      setError("At least one process is required");
      return;
    }
    const name = effectiveName.trim();
    if (!name) {
      setError("Output folder name is required");
      return;
    }
    if (existingProcesses.includes(name) && !awaitingConfirm) {
      setAwaitingConfirm(true);
      return;
    }
    onSubmit(processes, name, model.trim());
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
            A process named &ldquo;{effectiveName}&rdquo; already exists. Click{" "}
            <strong>Overwrite</strong> to replace it.
          </Alert>
        )}
        <Autocomplete
          freeSolo
          options={models}
          value={model}
          onInputChange={(event, value) => {
            setModel(value);
            setError("");
          }}
          renderInput={(params) => (
            <TextField
              {...params}
              label="Model"
              margin="normal"
              helperText="Model to import before generating"
            />
          )}
        />
        <TextField
          label="Processes"
          value={processStr}
          onChange={(e) => {
            setProcessStr(e.target.value);
            setError("");
            setAwaitingConfirm(false);
          }}
          fullWidth
          multiline
          minRows={3}
          margin="normal"
          placeholder={"p p > t t~\np p > t t~ j"}
          helperText="One process per line; the lines after the first are added to the same output"
          autoFocus
        />
        <TextField
          label="Output Folder Name"
          value={effectiveName}
          onChange={(e) => {
            setNameEdited(true);
            setProcessName(e.target.value);
            setError("");
            setAwaitingConfirm(false);
          }}
          onKeyDown={handleKeyDown}
          fullWidth
          margin="normal"
          placeholder="e.g. tt_production"
          helperText={
            nameEdited ? " " : "Derived from the process, edit to override"
          }
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
