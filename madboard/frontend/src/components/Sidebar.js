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

const DEFAULT_DRAWER_WIDTH = 280;
const MIN_DRAWER_WIDTH = 180;
const MAX_DRAWER_WIDTH = 700;
const WIDTH_STORAGE_KEY = "madboard.sidebarWidth";

function storedWidth() {
  try {
    const value = Number(window.localStorage.getItem(WIDTH_STORAGE_KEY));
    if (value >= MIN_DRAWER_WIDTH && value <= MAX_DRAWER_WIDTH) return value;
  } catch {
    // storage can be unavailable, fall back to the default width
  }
  return DEFAULT_DRAWER_WIDTH;
}

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
  const [width, setWidth] = useState(storedWidth);
  const [resizing, setResizing] = useState(false);

  // Drag the right edge of the drawer to give the process names more room
  useEffect(() => {
    if (!resizing) return;

    const handleMove = (event) => {
      const next = Math.min(
        MAX_DRAWER_WIDTH,
        Math.max(MIN_DRAWER_WIDTH, event.clientX),
      );
      setWidth(next);
    };
    const handleUp = () => setResizing(false);

    document.addEventListener("mousemove", handleMove);
    document.addEventListener("mouseup", handleUp);
    // Keep the cursor and the text selection sane while dragging
    const previousCursor = document.body.style.cursor;
    const previousSelect = document.body.style.userSelect;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";

    return () => {
      document.removeEventListener("mousemove", handleMove);
      document.removeEventListener("mouseup", handleUp);
      document.body.style.cursor = previousCursor;
      document.body.style.userSelect = previousSelect;
    };
  }, [resizing]);

  useEffect(() => {
    if (resizing) return;
    try {
      window.localStorage.setItem(WIDTH_STORAGE_KEY, String(width));
    } catch {
      // a width that cannot be stored is not worth reporting
    }
  }, [width, resizing]);

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

  const handleDialogSubmit = (processes, processName, model) => {
    onAddProcess(processes, processName, model);
  };

  return (
    <>
      <Drawer
        variant="persistent"
        anchor="left"
        open={open}
        sx={{
          width: open ? width : 0,
          flexShrink: 0,
          "& .MuiDrawer-paper": {
            width,
            boxSizing: "border-box",
            display: "flex",
            flexDirection: "column",
            overflowX: "hidden",
            transition: resizing ? "none" : undefined,
          },
        }}
      >
        <Box
          onMouseDown={(event) => {
            event.preventDefault();
            setResizing(true);
          }}
          onDoubleClick={() => setWidth(DEFAULT_DRAWER_WIDTH)}
          sx={{
            position: "absolute",
            top: 0,
            right: 0,
            bottom: 0,
            width: "5px",
            cursor: "col-resize",
            zIndex: 1200,
            "&:hover": { backgroundColor: "primary.main", opacity: 0.4 },
          }}
        />
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
