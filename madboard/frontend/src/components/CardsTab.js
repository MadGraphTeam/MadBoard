import React, { useState, useEffect, useMemo } from "react";
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  Box,
  Card,
  CardContent,
  CircularProgress,
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
import CardEditorDialog from "./CardEditorDialog";
import { errorMessage, useNotify } from "./Notifications";
import { defaultCardName, isTemplate } from "../utils/cards";

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

      <CardEditorDialog
        cardName={editingCard}
        content={cardContent}
        savedContent={savedContent}
        isDarkMode={isDarkMode}
        isSaving={isSaving}
        onChange={setCardContent}
        onCancel={handleCancel}
        onSave={handleSave}
        onResetToDefault={hasDefault ? handleResetToDefault : null}
      />
    </Box>
  );
}

export default CardsTab;
