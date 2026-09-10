import React, { useState, useEffect } from "react";
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  List,
  ListItem,
  ListItemText,
  Typography,
} from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import Editor from "@monaco-editor/react";
import { isTemplate } from "../utils/cards";

const CARD_PRIORITY = ["run_card.toml", "param_card.dat"];

function StartRunDialog({
  open,
  onClose,
  selectedProcess,
  isDarkMode,
  onRunStarted,
}) {
  const [cards, setCards] = useState([]);
  const [templateCards, setTemplateCards] = useState([]);
  const [loadingCards, setLoadingCards] = useState(false);
  const [error, setError] = useState(null);
  const [editingCard, setEditingCard] = useState(null);
  const [cardContent, setCardContent] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isStarting, setIsStarting] = useState(false);

  useEffect(() => {
    if (!open || !selectedProcess) return;
    setLoadingCards(true);
    setError(null);
    fetch(`/api/processes/${selectedProcess}/cards`)
      .then((r) => r.json())
      .then((d) => {
        const available = d.cards || [];
        // The cards worth a look before a run come first; the untouched
        // templates and the inactive cards are tucked away
        const active = available.filter((c) => !isTemplate(c));
        const priority = CARD_PRIORITY.filter((c) => active.includes(c));
        const rest = active.filter((c) => !CARD_PRIORITY.includes(c)).sort();
        setCards([...priority, ...rest]);
        setTemplateCards(available.filter(isTemplate).sort());
      })
      .catch(() => setError("Failed to load cards"))
      .finally(() => setLoadingCards(false));
  }, [open, selectedProcess]);

  const handleEdit = async (cardName) => {
    try {
      const r = await fetch(
        `/api/processes/${selectedProcess}/cards/${cardName}`,
      );
      if (!r.ok) throw new Error();
      const d = await r.json();
      setEditingCard(cardName);
      setCardContent(d.content);
    } catch {
      setError("Failed to load card");
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const r = await fetch(
        `/api/processes/${selectedProcess}/cards/${editingCard}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content: cardContent }),
        },
      );
      if (!r.ok) throw new Error();
      setEditingCard(null);
      setCardContent("");
    } catch {
      setError("Failed to save card");
    } finally {
      setIsSaving(false);
    }
  };

  const closeEditor = () => {
    setEditingCard(null);
    setCardContent("");
  };

  const handleStartRun = async () => {
    setIsStarting(true);
    setError(null);
    try {
      const r = await fetch(`/api/processes/${selectedProcess}/run`, {
        method: "POST",
      });
      const d = await r.json();
      if (!r.ok) {
        setError(d.error || "Failed to start run");
        return;
      }
      onRunStarted(d.task_id, d.name);
      handleClose();
    } catch {
      setError("Failed to start run");
    } finally {
      setIsStarting(false);
    }
  };

  const renderCardList = (cardNames) => (
    <List disablePadding>
      {cardNames.map((card, i) => (
        <React.Fragment key={card}>
          {i > 0 && <Divider />}
          <ListItem
            secondaryAction={
              <IconButton
                onClick={() => handleEdit(card)}
                title={`Edit ${card}`}
                size="small"
              >
                <EditIcon fontSize="small" />
              </IconButton>
            }
          >
            <ListItemText primary={card} />
          </ListItem>
        </React.Fragment>
      ))}
    </List>
  );

  const handleClose = () => {
    setEditingCard(null);
    setCardContent("");
    setError(null);
    onClose();
  };

  return (
    <>
      <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
        <DialogTitle>Start Run</DialogTitle>
        <DialogContent>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}
          {loadingCards ? (
            <Box sx={{ display: "flex", justifyContent: "center", p: 3 }}>
              <CircularProgress />
            </Box>
          ) : (
            <>
              {renderCardList(cards)}
              {cards.length === 0 && (
                <Alert severity="info">No cards found for this process.</Alert>
              )}
              {templateCards.length > 0 && (
                <Accordion disableGutters sx={{ mt: 2 }}>
                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Typography variant="body2">
                      Defaults and inactive cards ({templateCards.length})
                    </Typography>
                  </AccordionSummary>
                  <AccordionDetails sx={{ p: 0 }}>
                    {renderCardList(templateCards)}
                  </AccordionDetails>
                </Accordion>
              )}
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleStartRun}
            disabled={isStarting}
          >
            {isStarting ? "Starting…" : "Start Run"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Nested editor dialog */}
      <Dialog
        open={Boolean(editingCard)}
        onClose={closeEditor}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Edit {editingCard}</DialogTitle>
        <DialogContent sx={{ p: 2 }}>
          <Editor
            height="400px"
            path={editingCard || undefined}
            value={cardContent}
            onChange={(v) => setCardContent(v || "")}
            theme={isDarkMode ? "vs-dark" : "vs-light"}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={closeEditor}>Cancel</Button>
          <Button onClick={handleSave} variant="contained" disabled={isSaving}>
            {isSaving ? "Saving…" : "Save"}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}

export default StartRunDialog;
