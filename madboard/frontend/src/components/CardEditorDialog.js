import React from "react";
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
} from "@mui/material";
import RestoreIcon from "@mui/icons-material/Restore";
import Editor from "@monaco-editor/react";

/**
 * The card editor, shared by the cards tab and the start run dialog so that
 * editing a card is the same everywhere.
 */
function CardEditorDialog({
  cardName,
  content,
  savedContent,
  isDarkMode,
  isSaving,
  onChange,
  onCancel,
  onSave,
  onResetToDefault,
}) {
  const isModified = content !== savedContent;

  return (
    <Dialog
      open={cardName !== null && cardName !== undefined}
      onClose={onCancel}
      maxWidth="lg"
      fullWidth
      slotProps={{ paper: { sx: { height: "90vh" } } }}
    >
      <DialogTitle>
        Edit {cardName}
        {isModified ? " •" : ""}
      </DialogTitle>
      <DialogContent sx={{ p: 2 }}>
        <Editor
          height="100%"
          path={cardName || ""}
          value={content}
          onChange={(value) => onChange(value || "")}
          theme={isDarkMode ? "vs-dark" : "vs-light"}
          options={{
            // Cards are prose-heavy config files: wrap the comment lines
            // instead of cutting them off, and skip the minimap
            wordWrap: "on",
            minimap: { enabled: false },
            scrollBeyondLastLine: false,
          }}
        />
      </DialogContent>
      <DialogActions>
        {onResetToDefault && (
          <Button onClick={onResetToDefault} startIcon={<RestoreIcon />}>
            Reset to default
          </Button>
        )}
        <Box sx={{ flexGrow: 1 }} />
        <Button onClick={onCancel}>Cancel</Button>
        <Button
          onClick={onSave}
          variant="contained"
          disabled={isSaving || !isModified}
        >
          {isSaving ? "Saving..." : "Save"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default CardEditorDialog;
