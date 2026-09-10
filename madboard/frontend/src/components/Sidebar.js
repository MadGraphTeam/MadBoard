import React, { useState, useEffect, useMemo } from "react";
import {
  Alert,
  Box,
  CircularProgress,
  Collapse,
  Drawer,
  IconButton,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import FileIcon from "@mui/icons-material/Description";
import FolderIcon from "@mui/icons-material/Folder";
import MenuIcon from "@mui/icons-material/Menu";
import SearchIcon from "@mui/icons-material/Search";
import RefreshIcon from "@mui/icons-material/Refresh";
import UnfoldLessIcon from "@mui/icons-material/UnfoldLess";
import AddProcessDialog from "./AddProcessDialog";

const DRAWER_WIDTH = 280;

function Sidebar({
  onSelectProcess,
  onSelectRun,
  selectedProcess,
  selectedRun,
  onAddProcess,
  refreshKey,
  open,
  onToggle,
}) {
  const [expandedItems, setExpandedItems] = useState({});
  const [processes, setProcesses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [status, setStatus] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [filter, setFilter] = useState("");

  const fetchProcesses = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/processes");
      if (!response.ok) throw new Error("Failed to fetch processes");
      const data = await response.json();
      setProcesses(data.processes);
      setError(null);
    } catch (err) {
      setError(err.message);
      setProcesses([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProcesses();
  }, [refreshKey]);

  useEffect(() => {
    fetch("/api/madgraph/status")
      .then((r) => r.json())
      .then((d) => setStatus(d))
      .catch(() => setStatus(null));
  }, []);

  const madgraphAvailable = status?.available || false;

  const collapseAll = () => setExpandedItems({});

  const toggleExpanded = (itemLabel) => {
    setExpandedItems((prev) => ({
      ...prev,
      [itemLabel]: !prev[itemLabel],
    }));
  };

  const visibleProcesses = useMemo(() => {
    const needle = filter.trim().toLowerCase();
    if (!needle) return processes;
    return processes.filter((process) =>
      process.name.toLowerCase().includes(needle),
    );
  }, [processes, filter]);

  const handleDialogSubmit = (processStr, processName) => {
    onAddProcess(processStr, processName);
  };

  return (
    <>
      <Drawer
        variant="persistent"
        anchor="left"
        open={open}
        sx={{
          width: open ? DRAWER_WIDTH : 0,
          flexShrink: 0,
          "& .MuiDrawer-paper": {
            width: DRAWER_WIDTH,
            boxSizing: "border-box",
            overflowX: "hidden",
            display: "flex",
            flexDirection: "column",
          },
        }}
      >
        <Box
          sx={{
            p: 2,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            position: "sticky",
            top: 0,
            zIndex: 1100,
            backgroundColor: "background.paper",
            borderBottom: "1px solid",
            borderColor: "divider",
          }}
        >
          <span style={{ fontWeight: "bold" }}>Processes</span>
          <Box sx={{ display: "flex", gap: 0.5 }}>
            {madgraphAvailable && (
              <Tooltip title="Add process">
                <IconButton onClick={() => setDialogOpen(true)} size="small">
                  <AddIcon />
                </IconButton>
              </Tooltip>
            )}
            <IconButton
              onClick={fetchProcesses}
              size="small"
              title="Refresh processes"
            >
              <RefreshIcon />
            </IconButton>
            <IconButton onClick={collapseAll} size="small" title="Collapse all">
              <UnfoldLessIcon />
            </IconButton>
            <Tooltip title="Hide process list">
              <IconButton onClick={onToggle} size="small">
                <MenuIcon />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>
        <Box sx={{ px: 2, py: 1 }}>
          <TextField
            size="small"
            fullWidth
            placeholder="Filter processes"
            value={filter}
            onChange={(event) => setFilter(event.target.value)}
            slotProps={{
              input: {
                startAdornment: (
                  <SearchIcon fontSize="small" sx={{ mr: 1, opacity: 0.6 }} />
                ),
              },
            }}
          />
        </Box>
        {loading && (
          <Box sx={{ display: "flex", justifyContent: "center", p: 2 }}>
            <CircularProgress size={40} />
          </Box>
        )}
        {error && (
          <Box sx={{ p: 2 }}>
            <Alert severity="error">{error}</Alert>
          </Box>
        )}
        {!loading && !error && (
          <List sx={{ overflow: "auto", flexGrow: 1 }}>
            {visibleProcesses.length === 0 && (
              <Box sx={{ px: 2, py: 1 }}>
                <ListItemText
                  secondary={
                    processes.length === 0
                      ? "No processes found"
                      : "No process matches the filter"
                  }
                />
              </Box>
            )}
            {visibleProcesses.map((process) => (
              <React.Fragment key={process.name}>
                <ListItem disablePadding>
                  <ListItemButton
                    sx={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      backgroundColor:
                        selectedProcess === process.name
                          ? "rgba(25, 118, 210, 0.12)"
                          : "transparent",
                      "&:hover": {
                        backgroundColor:
                          selectedProcess === process.name
                            ? "rgba(25, 118, 210, 0.16)"
                            : "action.hover",
                      },
                    }}
                    onClick={() => onSelectProcess(process.name)}
                  >
                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        flex: 1,
                        minWidth: 0,
                        overflow: "hidden",
                      }}
                    >
                      <ListItemIcon sx={{ flexShrink: 0 }}>
                        <FolderIcon />
                      </ListItemIcon>
                      <Tooltip title={process.name} enterDelay={700}>
                        <ListItemText
                          primary={process.name}
                          slotProps={{ primary: { noWrap: true } }}
                        />
                      </Tooltip>
                    </Box>
                    <IconButton
                      edge="end"
                      size="small"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleExpanded(process.name);
                      }}
                      sx={{ mr: 1, flexShrink: 0 }}
                    >
                      {expandedItems[process.name] ? (
                        <ExpandLessIcon />
                      ) : (
                        <ExpandMoreIcon />
                      )}
                    </IconButton>
                  </ListItemButton>
                </ListItem>
                <Collapse
                  in={expandedItems[process.name]}
                  timeout="auto"
                  unmountOnExit
                >
                  <List component="div" disablePadding>
                    {process.runs.map((run) => (
                      <ListItem key={run} disablePadding>
                        <ListItemButton
                          sx={{
                            pl: 6,
                            minWidth: 0,
                            backgroundColor:
                              selectedRun === run &&
                              selectedProcess === process.name
                                ? "rgba(220, 0, 78, 0.12)"
                                : "transparent",
                            "&:hover": {
                              backgroundColor:
                                selectedRun === run &&
                                selectedProcess === process.name
                                  ? "rgba(220, 0, 78, 0.16)"
                                  : "action.hover",
                            },
                          }}
                          onClick={() => {
                            onSelectProcess(process.name);
                            onSelectRun(run);
                          }}
                        >
                          <ListItemIcon sx={{ minWidth: 40, flexShrink: 0 }}>
                            <FileIcon />
                          </ListItemIcon>
                          <ListItemText
                            primary={run}
                            slotProps={{ primary: { noWrap: true } }}
                          />
                        </ListItemButton>
                      </ListItem>
                    ))}
                  </List>
                </Collapse>
              </React.Fragment>
            ))}
          </List>
        )}
        <Box
          sx={{
            mt: "auto",
            px: 2,
            py: 1,
            borderTop: "1px solid",
            borderColor: "divider",
          }}
        >
          <Tooltip title={status?.working_directory || ""}>
            <Typography
              variant="caption"
              color="text.secondary"
              noWrap
              component="div"
            >
              {status?.working_directory
                ? status.working_directory.split("/").pop()
                : "…"}
            </Typography>
          </Tooltip>
          <Tooltip
            title={
              status?.madgraph_path ||
              "Start MadBoard with --madgraph=<path> to generate processes"
            }
          >
            <Typography
              variant="caption"
              color="text.secondary"
              noWrap
              component="div"
            >
              {madgraphAvailable ? "MadGraph found" : "No MadGraph executable"}
            </Typography>
          </Tooltip>
        </Box>
      </Drawer>
      <AddProcessDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onSubmit={handleDialogSubmit}
        existingProcesses={processes.map((p) => p.name)}
      />
    </>
  );
}

export default Sidebar;
