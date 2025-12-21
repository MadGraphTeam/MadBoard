import React, { useState, useEffect } from "react";
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemText,
  IconButton,
  CircularProgress,
  Alert,
} from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";
import EditIcon from "@mui/icons-material/Edit";
import Editor from "@monaco-editor/react";

// Process Tab Component
function ProcessTab({ selectedProcess }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!selectedProcess) return;

    const fetchRuns = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/processes/${selectedProcess}/runs`);
        if (!response.ok) throw new Error("Failed to fetch runs");
        const data = await response.json();

        // Transform runs to rows format
        const processedRows = data.runs.map((run, index) => ({
          id: index,
          run,
          crossSection: "-",
          events: "-",
          status: "Pending",
        }));
        setRows(processedRows);
        setError(null);
      } catch (err) {
        setError(err.message);
        setRows([]);
      } finally {
        setLoading(false);
      }
    };

    fetchRuns();
  }, [selectedProcess]);

  const columns = [
    { field: "run", headerName: "Run", flex: 1, minWidth: 100, sortable: true },
    {
      field: "crossSection",
      headerName: "Cross section (pb)",
      flex: 1,
      minWidth: 120,
      sortable: true,
    },
    {
      field: "events",
      headerName: "Events",
      flex: 1,
      minWidth: 100,
      sortable: true,
    },
    {
      field: "status",
      headerName: "Status",
      flex: 1,
      minWidth: 100,
      sortable: true,
    },
  ];

  if (loading) return <CircularProgress />;
  if (error) return <Alert severity="error">{error}</Alert>;

  return (
    <Box sx={{ height: 400, width: "100%" }}>
      <DataGrid
        rows={rows}
        columns={columns}
        pageSize={5}
        rowsPerPageOptions={[5, 10, 20]}
        pagination
      />
    </Box>
  );
}

// Run Tab Component
function RunTab({ selectedProcess, selectedRun }) {
  const [subprocessesRows, setSubprocessesRows] = useState([]);
  const [channelsRows, setChannelsRows] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!selectedProcess || !selectedRun) return;

    const fetchRunInfo = async () => {
      try {
        setLoading(true);
        const response = await fetch(
          `/api/processes/${selectedProcess}/runs/${selectedRun}/info`,
        );
        if (!response.ok) throw new Error("Failed to fetch run info");

        // Placeholder data - in a real app, parse the JSON response
        setSubprocessesRows([
          {
            id: 1,
            name: "Subprocess 1",
            crossSection: "1.5",
            samples: "1000",
            unweightedEvents: "500",
          },
        ]);
        setChannelsRows([
          {
            id: 1,
            name: "Channel 1",
            crossSection: "1.5",
            samples: "1000",
            unweightedEvents: "500",
            rsd: "0.05",
            unweightingEfficiency: "0.95",
          },
        ]);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchRunInfo();
  }, [selectedProcess, selectedRun]);

  const subprocessesColumns = [
    {
      field: "name",
      headerName: "Name",
      flex: 1,
      minWidth: 100,
      sortable: true,
    },
    {
      field: "crossSection",
      headerName: "Cross section",
      flex: 1,
      minWidth: 120,
      sortable: true,
    },
    {
      field: "samples",
      headerName: "Samples",
      flex: 1,
      minWidth: 100,
      sortable: true,
    },
    {
      field: "unweightedEvents",
      headerName: "Unweighted events",
      flex: 1,
      minWidth: 120,
      sortable: true,
    },
  ];

  const channelsColumns = [
    {
      field: "name",
      headerName: "Name",
      flex: 1,
      minWidth: 100,
      sortable: true,
    },
    {
      field: "crossSection",
      headerName: "Cross section",
      flex: 1,
      minWidth: 120,
      sortable: true,
    },
    {
      field: "samples",
      headerName: "Samples",
      flex: 1,
      minWidth: 100,
      sortable: true,
    },
    {
      field: "unweightedEvents",
      headerName: "Unweighted events",
      flex: 1,
      minWidth: 120,
      sortable: true,
    },
    { field: "rsd", headerName: "RSD", flex: 1, minWidth: 80, sortable: true },
    {
      field: "unweightingEfficiency",
      headerName: "Unweighting efficiency",
      flex: 1,
      minWidth: 150,
      sortable: true,
    },
  ];

  if (loading) return <CircularProgress />;

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
      <Box>
        <Typography variant="h6" sx={{ mb: 2 }}>
          Subprocesses
        </Typography>
        <Box sx={{ height: 300, width: "100%" }}>
          <DataGrid
            rows={subprocessesRows}
            columns={subprocessesColumns}
            pageSize={5}
            rowsPerPageOptions={[5, 10]}
            pagination
          />
        </Box>
      </Box>
      <Box>
        <Typography variant="h6" sx={{ mb: 2 }}>
          Channels
        </Typography>
        <Box sx={{ height: 300, width: "100%" }}>
          <DataGrid
            rows={channelsRows}
            columns={channelsColumns}
            pageSize={5}
            rowsPerPageOptions={[5, 10]}
            pagination
          />
        </Box>
      </Box>
    </Box>
  );
}

// Cards Tab Component
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

// Plots Tab Component
function PlotsTab() {
  return (
    <Card>
      <CardContent>
        <Typography variant="h6">Plots</Typography>
        <Typography variant="body2" color="text.secondary">
          Plots placeholder - Coming soon
        </Typography>
      </CardContent>
    </Card>
  );
}

// Main Component
function MainContent({
  selectedProcess,
  selectedRun,
  selectedTab,
  isDarkMode,
}) {
  if (!selectedProcess) {
    return (
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "100%",
        }}
      >
        <Typography variant="h6" color="text.secondary">
          Please select a process
        </Typography>
      </Box>
    );
  }

  return (
    <Box>
      {selectedTab === 0 && <ProcessTab selectedProcess={selectedProcess} />}
      {selectedTab === 1 && selectedRun && (
        <RunTab selectedProcess={selectedProcess} selectedRun={selectedRun} />
      )}
      {(!selectedRun ? selectedTab === 1 : selectedTab === 2) && (
        <CardsTab selectedProcess={selectedProcess} isDarkMode={isDarkMode} />
      )}
      {(!selectedRun ? selectedTab === 2 : selectedTab === 3) && <PlotsTab />}
    </Box>
  );
}

export default MainContent;
