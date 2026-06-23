import React, {
  useState,
  useEffect,
  useRef,
  useMemo,
  useCallback,
} from "react";
import {
  Box,
  AppBar,
  Toolbar,
  Tab,
  Tabs,
  Typography,
  IconButton,
  Tooltip,
  Badge,
  Menu,
  MenuItem,
  ListItemText,
  Chip,
} from "@mui/material";
import LightModeIcon from "@mui/icons-material/LightMode";
import DarkModeIcon from "@mui/icons-material/DarkMode";
import PendingActionsIcon from "@mui/icons-material/PendingActions";
import Layout from "./components/Layout";
import Sidebar from "./components/Sidebar";
import MainContent from "./components/MainContent";
import DiagramsTab from "./components/DiagramsTab";
import TaskOutputModal from "./components/TaskOutputModal";

function App({ isDarkMode, onThemeToggle }) {
  const [selectedTab, setSelectedTab] = useState(0);
  const [selectedProcess, setSelectedProcess] = useState(null);
  const [selectedRun, setSelectedRun] = useState(null);
  const [runsData, setRunsData] = useState({});
  const runsDataRef = useRef({});
  const [subprocesses, setSubprocesses] = useState([]);

  // MadGraph background tasks
  const [tasks, setTasks] = useState([]);
  const [openTaskId, setOpenTaskId] = useState(null);
  const [tasksMenuAnchor, setTasksMenuAnchor] = useState(null);
  const [sidebarRefreshKey, setSidebarRefreshKey] = useState(0);

  const hasPlotsAvailable = useMemo(() => {
    return Object.values(runsData).some(
      (runInfo) =>
        runInfo && runInfo.histograms && runInfo.histograms.length > 0,
    );
  }, [runsData]);

  const hasDiagramsAvailable = subprocesses.length > 0;

  const handleTabChange = (event, newValue) => {
    setSelectedTab(newValue);
  };

  const handleSelectProcess = (process) => {
    if (process !== selectedProcess) {
      setSelectedProcess(process);
      setSelectedRun(null);
      setSelectedTab(0);
      setRunsData({});
      setSubprocesses([]);
    }
  };

  const handleSelectRun = (run) => {
    setSelectedRun(run);
  };

  const handleSelectRunAndNavigate = (run) => {
    setSelectedRun(run);
    setSelectedTab(1);
  };

  const handleRefreshProcess = async () => {
    if (!selectedProcess) return;
    try {
      const response = await fetch(`/api/processes/${selectedProcess}/runs`);
      if (!response.ok) throw new Error("Failed to fetch runs");
      const data = await response.json();
      const newRunsData = {};
      for (const runObj of data.runs) {
        newRunsData[runObj.name] = runObj;
      }
      setRunsData(newRunsData);
      runsDataRef.current = newRunsData;
    } catch (err) {
      console.error("Failed to refresh process:", err);
    }
  };

  const handleDeleteProcess = async () => {
    setSelectedProcess(null);
    setSelectedRun(null);
    setSelectedTab(0);
    setRunsData({});
    window.location.reload();
  };

  useEffect(() => {
    runsDataRef.current = runsData;
  }, [runsData]);

  useEffect(() => {
    if (!selectedProcess) return;
    fetch(`/api/processes/${selectedProcess}/subprocesses`)
      .then((res) => res.json())
      .then((data) => setSubprocesses(data.subprocesses || []))
      .catch(() => setSubprocesses([]));
  }, [selectedProcess]);

  useEffect(() => {
    if (!selectedProcess) return;

    const fetchAllRuns = async () => {
      try {
        const response = await fetch(`/api/processes/${selectedProcess}/runs`);
        if (!response.ok) throw new Error("Failed to fetch runs");
        const data = await response.json();
        const newRunsData = {};
        for (const runObj of data.runs) {
          newRunsData[runObj.name] = runObj;
        }
        setRunsData(newRunsData);
      } catch (err) {
        console.error("Failed to fetch runs:", err);
      }
    };

    fetchAllRuns();

    const interval = setInterval(async () => {
      try {
        const newRunsData = { ...runsDataRef.current };
        for (const [runName, runInfo] of Object.entries(runsDataRef.current)) {
          if (runInfo.status !== "done" && runInfo.status !== "unknown") {
            try {
              const infoResponse = await fetch(
                `/api/processes/${selectedProcess}/runs/${runName}/info`,
              );
              if (infoResponse.ok) {
                const infoData = await infoResponse.json();
                newRunsData[runName] = infoData;
                setRunsData(newRunsData);
              }
            } catch (err) {
              console.error(`Failed to fetch info for run ${runName}:`, err);
            }
          }
        }
      } catch (err) {
        console.error("Failed to update runs:", err);
      }
    }, 10000);

    return () => clearInterval(interval);
  }, [selectedProcess]);

  // ── MadGraph task management ────────────────────────────────────────────────

  const handleAddProcess = useCallback(async (processStr, processName) => {
    try {
      const resp = await fetch("/api/madgraph/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ process: processStr, name: processName }),
      });
      if (!resp.ok) {
        const err = await resp.json();
        console.error("Failed to start MadGraph:", err.error);
        return;
      }
      const { task_id, name } = await resp.json();
      const newTask = { id: task_id, name, status: "running" };
      setTasks((prev) => [...prev, newTask]);
      setOpenTaskId(task_id);
    } catch (err) {
      console.error("Error starting MadGraph process:", err);
    }
  }, []);

  const handleTaskDone = useCallback((taskId, status) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, status } : t)),
    );
    if (status === "done") {
      setSidebarRefreshKey((k) => k + 1);
    }
  }, []);

  const handleRunStarted = useCallback((taskId, name) => {
    setTasks((prev) => [...prev, { id: taskId, name, status: "running" }]);
    setOpenTaskId(taskId);
  }, []);

  const runningCount = tasks.filter((t) => t.status === "running").length;
  const openTask = tasks.find((t) => t.id === openTaskId) ?? null;

  const diagramsTabIndex =
    (selectedRun ? 1 : 0) + 2 + (hasPlotsAvailable ? 1 : 0);

  return (
    <Layout>
      <Sidebar
        onSelectProcess={handleSelectProcess}
        onSelectRun={handleSelectRun}
        selectedProcess={selectedProcess}
        selectedRun={selectedRun}
        onAddProcess={handleAddProcess}
        refreshKey={sidebarRefreshKey}
      />
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        <AppBar position="sticky" sx={{ top: 0, zIndex: 1200 }}>
          <Toolbar>
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 1.5,
                flexGrow: 1,
              }}
            >
              <img
                src="/logo-dark.svg"
                alt="MadBoard Logo"
                style={{ height: 40 }}
              />
              <Typography variant="h5">MadBoard</Typography>
            </Box>
            {tasks.length > 0 && (
              <Tooltip title="Background tasks">
                <IconButton
                  onClick={(e) => setTasksMenuAnchor(e.currentTarget)}
                  color="inherit"
                >
                  <Badge badgeContent={runningCount} color="warning">
                    <PendingActionsIcon />
                  </Badge>
                </IconButton>
              </Tooltip>
            )}
            <Tooltip
              title={
                isDarkMode ? "Switch to light mode" : "Switch to dark mode"
              }
            >
              <IconButton onClick={onThemeToggle} color="inherit">
                {isDarkMode ? <LightModeIcon /> : <DarkModeIcon />}
              </IconButton>
            </Tooltip>
          </Toolbar>
          {selectedProcess && (
            <Tabs
              value={selectedTab}
              onChange={handleTabChange}
              textColor="inherit"
              indicatorColor="secondary"
            >
              <Tab label="Process" />
              {selectedRun && <Tab label="Run" />}
              <Tab label="Cards" />
              {hasPlotsAvailable && <Tab label="Plots" />}
              {hasDiagramsAvailable && <Tab label="Diagrams" />}
            </Tabs>
          )}
        </AppBar>

        <Box sx={{ flexGrow: 1, p: 3, overflow: "auto" }}>
          {selectedTab !== diagramsTabIndex || !hasDiagramsAvailable ? (
            <MainContent
              selectedProcess={selectedProcess}
              selectedRun={selectedRun}
              onSelectRun={handleSelectRun}
              onSelectRunAndNavigate={handleSelectRunAndNavigate}
              selectedTab={selectedTab}
              isDarkMode={isDarkMode}
              runsData={runsData}
              onRefreshProcess={handleRefreshProcess}
              onDeleteProcess={handleDeleteProcess}
              onRunStarted={handleRunStarted}
            />
          ) : (
            <DiagramsTab
              selectedProcess={selectedProcess}
              subprocesses={subprocesses}
              isDarkMode={isDarkMode}
            />
          )}
        </Box>
      </Box>

      {/* Background tasks dropdown */}
      <Menu
        anchorEl={tasksMenuAnchor}
        open={Boolean(tasksMenuAnchor)}
        onClose={() => setTasksMenuAnchor(null)}
      >
        {tasks.map((task) => (
          <MenuItem
            key={task.id}
            onClick={() => {
              setOpenTaskId(task.id);
              setTasksMenuAnchor(null);
            }}
            sx={{ gap: 1 }}
          >
            <ListItemText primary={task.name} />
            <Chip
              label={task.status}
              size="small"
              color={
                task.status === "done"
                  ? "success"
                  : task.status === "error"
                    ? "error"
                    : "warning"
              }
            />
          </MenuItem>
        ))}
      </Menu>

      {/* Task output modal */}
      <TaskOutputModal
        open={openTaskId !== null}
        task={openTask}
        onClose={() => setOpenTaskId(null)}
        onTaskDone={handleTaskDone}
      />

      <style>{`
        @keyframes madboard-blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }
      `}</style>
    </Layout>
  );
}

export default App;
