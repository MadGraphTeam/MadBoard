import React, { useState, useEffect } from "react";
import {
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Box,
  IconButton,
  Collapse,
  CircularProgress,
  Alert,
} from "@mui/material";
import MenuIcon from "@mui/icons-material/Menu";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import FolderIcon from "@mui/icons-material/Folder";
import FileIcon from "@mui/icons-material/Description";
import RefreshIcon from "@mui/icons-material/Refresh";
import UnfoldLessIcon from "@mui/icons-material/UnfoldLess";
import UnfoldMoreIcon from "@mui/icons-material/UnfoldMore";

const DRAWER_WIDTH = 360;

function Sidebar({
  onSelectProcess,
  onSelectRun,
  selectedProcess,
  selectedRun,
}) {
  const [open, setOpen] = useState(true);
  const [expandedItems, setExpandedItems] = useState({});
  const [processes, setProcesses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Fetch processes from API
    const fetchProcesses = async () => {
      try {
        setLoading(true);
        const response = await fetch("/api/processes");
        if (!response.ok) {
          throw new Error("Failed to fetch processes");
        }
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

    fetchProcesses();
  }, []);

  const toggleDrawer = () => {
    setOpen(!open);
  };

  const toggleExpanded = (itemLabel) => {
    setExpandedItems((prev) => ({
      ...prev,
      [itemLabel]: !prev[itemLabel],
    }));
  };

  const refreshProcesses = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/processes");
      if (!response.ok) {
        throw new Error("Failed to fetch processes");
      }
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

  const expandAll = () => {
    const newExpandedItems = {};
    processes.forEach((process) => {
      newExpandedItems[process.name] = true;
    });
    setExpandedItems(newExpandedItems);
  };

  const collapseAll = () => {
    setExpandedItems({});
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
          },
        }}
      >
        <Box
          sx={{
            p: 2,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <span style={{ fontWeight: "bold" }}>Processes</span>
          <Box sx={{ display: "flex", gap: 0.5 }}>
            <IconButton
              onClick={refreshProcesses}
              size="small"
              title="Refresh processes"
            >
              <RefreshIcon />
            </IconButton>
            <IconButton onClick={collapseAll} size="small" title="Collapse all">
              <UnfoldLessIcon />
            </IconButton>
            <IconButton onClick={expandAll} size="small" title="Expand all">
              <UnfoldMoreIcon />
            </IconButton>
            <IconButton onClick={toggleDrawer} size="small" title="Toggle menu">
              <MenuIcon />
            </IconButton>
          </Box>
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
          <List>
            {processes.map((process) => (
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
                      sx={{ display: "flex", alignItems: "center", flex: 1 }}
                    >
                      <ListItemIcon>
                        <FolderIcon />
                      </ListItemIcon>
                      <ListItemText primary={process.name} />
                    </Box>
                    <IconButton
                      edge="end"
                      size="small"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleExpanded(process.name);
                      }}
                      sx={{ mr: 1 }}
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
                          <ListItemIcon sx={{ minWidth: 40 }}>
                            <FileIcon />
                          </ListItemIcon>
                          <ListItemText primary={run} />
                        </ListItemButton>
                      </ListItem>
                    ))}
                  </List>
                </Collapse>
              </React.Fragment>
            ))}
          </List>
        )}
      </Drawer>
      {!open && (
        <Box sx={{ display: "flex", alignItems: "center", p: 1 }}>
          <IconButton onClick={toggleDrawer} size="small">
            <MenuIcon />
          </IconButton>
        </Box>
      )}
    </>
  );
}

export default Sidebar;
