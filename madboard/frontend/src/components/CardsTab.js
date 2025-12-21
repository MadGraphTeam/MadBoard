import React, { useState, useEffect } from "react";
import {
  List,
  ListItem,
  ListItemText,
  IconButton,
  CircularProgress,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
} from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import Editor from "@monaco-editor/react";

function CardsTab({ selectedProcess, isDarkMode }) {
  const [cards, setCards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editingCard, setEditingCard] = useState(null);
  const [cardContent, setCardContent] = useState("");
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

  const handleEdit = async (cardName) => {
    try {
      const response = await fetch(
        `/api/processes/${selectedProcess}/cards/${cardName}`,
      );
      if (!response.ok) throw new Error("Failed to fetch card");
      const data = await response.json();
      setEditingCard(cardName);
      setCardContent(data.content);
    } catch (err) {
      console.error(err);
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
      if (!response.ok) throw new Error("Failed to save card");
      setEditingCard(null);
      setCardContent("");
    } catch (err) {
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setEditingCard(null);
    setCardContent("");
  };

  if (loading) return <CircularProgress />;
  if (error) return <Alert severity="error">{error}</Alert>;

  if (editingCard) {
    return (
      <Dialog open={true} onClose={handleCancel} maxWidth="md" fullWidth>
        <DialogTitle>Edit {editingCard}</DialogTitle>
        <DialogContent sx={{ p: 2 }}>
          <Editor
            height="400px"
            defaultLanguage="python"
            value={cardContent}
            onChange={(value) => setCardContent(value || "")}
            theme={isDarkMode ? "vs-dark" : "vs-light"}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCancel}>Cancel</Button>
          <Button onClick={handleSave} variant="contained" disabled={isSaving}>
            {isSaving ? "Saving..." : "Save"}
          </Button>
        </DialogActions>
      </Dialog>
    );
  }

  return (
    <List>
      {cards.map((card) => (
        <ListItem
          key={card}
          secondaryAction={
            <IconButton onClick={() => handleEdit(card)} color="primary">
              <EditIcon />
            </IconButton>
          }
        >
          <ListItemText primary={card} />
        </ListItem>
      ))}
    </List>
  );
}

export default CardsTab;
