import React, { useState, useEffect, useMemo } from "react";
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  List,
  ListItem,
  ListItemText,
  Tooltip,
  Typography,
} from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import DownloadIcon from "@mui/icons-material/Download";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import RestoreIcon from "@mui/icons-material/Restore";
import Editor from "@monaco-editor/react";
import { errorMessage, useNotify } from "./Notifications";

// A process directory holds a handful of cards that are actually used next to
// a dozen untouched templates ("*_default.*") and the cards MadGraph has
// switched off by prefixing them with a dot. Only the first group is of
// interest most of the time.
function isTemplate(cardName) {
  return cardName.startsWith(".") || /_default\.[^.]+$/.test(cardName);
}

/** Name of the template a card can be reset to, e.g. run_card_default.toml */
function defaultCardName(cardName) {
  const dot = cardName.lastIndexOf(".");
  if (dot <= 0) return `${cardName}_default`;
  return `${cardName.slice(0, dot)}_default${cardName.slice(dot)}`;
}

function CardsTab({ selectedProcess, isDarkMode }) {
  const notify = useNotify();
  const [cards, setCards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editingCard, setEditingCard] = useState(null);
  const [cardContent, setCardContent] = useState("");
  const [savedContent, setSavedContent] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!selectedProcess) return;

    const fetchCards = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/processes/${selectedProcess}/cards`);
        if (!response.ok) throw new Error("Failed to fetch cards");
        const data = await response.json();
        setCards(data.cards);
        setError(null);
      } catch (err) {
        setError(err.message);
        setCards([]);
      } finally {
        setLoading(false);
      }
    };

    fetchCards();
  }, [selectedProcess]);

  const { activeCards, templateCards } = useMemo(
    () => ({
      activeCards: cards.filter((card) => !isTemplate(card)),
      templateCards: cards.filter(isTemplate),
    }),
    [cards],
  );

  const fetchCardContent = async (cardName) => {
    const response = await fetch(
      `/api/processes/${selectedProcess}/cards/${cardName}`,
    );
    if (!response.ok) {
      throw new Error(
        await errorMessage(response, `Could not read ${cardName}`),
      );
    }
    const data = await response.json();
    return data.content;
  };

  const handleEdit = async (cardName) => {
    try {
      const content = await fetchCardContent(cardName);
      setEditingCard(cardName);
      setCardContent(content);
      setSavedContent(content);
    } catch (err) {
      notify(err.message);
    }
  };

  const handleResetToDefault = async () => {
    try {
      setCardContent(await fetchCardContent(defaultCardName(editingCard)));
      notify("Loaded the default card, save to apply it", "info");
    } catch (err) {
      notify(err.message);
    }
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      const response = await fetch(
        `/api/processes/${selectedProcess}/cards/${editingCard}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content: cardContent }),
        },
      );
      if (!response.ok) {
        throw new Error(await errorMessage(response, "Failed to save card"));
      }
      notify(`Saved ${editingCard}`, "success");
      setEditingCard(null);
      setCardContent("");
      setSavedContent("");
    } catch (err) {
      notify(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setEditingCard(null);
    setCardContent("");
    setSavedContent("");
  };

  const handleDownloadCard = (cardName) => {
    const link = document.createElement("a");
    link.href = `/api/processes/${selectedProcess}/cards/${cardName}/download`;
    link.click();
  };

  const renderCardList = (cardNames) => (
    <List disablePadding>
      {cardNames.map((card) => (
        <ListItem
          key={card}
          secondaryAction={
            <Box sx={{ display: "flex", gap: 0.5 }}>
              <Tooltip title="Download card">
                <IconButton
                  onClick={() => handleDownloadCard(card)}
                  color="primary"
                  size="small"
                >
                  <DownloadIcon fontSize="small" />
                </IconButton>
              </Tooltip>
              <Tooltip title="Edit card">
                <IconButton
                  onClick={() => handleEdit(card)}
                  color="primary"
                  size="small"
                >
                  <EditIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Box>
          }
        >
          <ListItemText primary={card} />
        </ListItem>
      ))}
    </List>
  );

  if (loading) return <CircularProgress />;
  if (error) return <Alert severity="error">{error}</Alert>;

  const hasDefault =
    editingCard !== null && cards.includes(defaultCardName(editingCard));
  const isModified = cardContent !== savedContent;

  return (
    <Box sx={{ maxWidth: 800 }}>
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" sx={{ mb: 1 }}>
            Cards
          </Typography>
          {activeCards.length > 0 ? (
            renderCardList(activeCards)
          ) : (
            <Typography variant="body2" color="text.secondary">
              No cards found
            </Typography>
          )}
        </CardContent>
      </Card>

      {templateCards.length > 0 && (
        <Accordion disableGutters>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography>
              Defaults and inactive cards ({templateCards.length})
            </Typography>
          </AccordionSummary>
          <AccordionDetails>{renderCardList(templateCards)}</AccordionDetails>
        </Accordion>
      )}

      <Dialog
        open={editingCard !== null}
        onClose={handleCancel}
        maxWidth="lg"
        fullWidth
        slotProps={{ paper: { sx: { height: "90vh" } } }}
      >
        <DialogTitle>
          Edit {editingCard}
          {isModified ? " •" : ""}
        </DialogTitle>
        <DialogContent sx={{ p: 2 }}>
          <Editor
            height="100%"
            path={editingCard || ""}
            value={cardContent}
            onChange={(value) => setCardContent(value || "")}
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
          {hasDefault && (
            <Button onClick={handleResetToDefault} startIcon={<RestoreIcon />}>
              Reset to default
            </Button>
          )}
          <Box sx={{ flexGrow: 1 }} />
          <Button onClick={handleCancel}>Cancel</Button>
          <Button
            onClick={handleSave}
            variant="contained"
            disabled={isSaving || !isModified}
          >
            {isSaving ? "Saving..." : "Save"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default CardsTab;
