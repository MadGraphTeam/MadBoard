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
import { errorMessage, useNotify } from "./components/Notifications";

// Tabs are addressed by name: which tabs exist depends on the selected
// process and run, so a positional index would silently point at a different
// tab whenever that set changes.
const TAB_LABELS = {
  process: "Process",
  run: "Run",
  cards: "Cards",
  histograms: "Histograms",
  madnis: "MadNIS",
  scans: "Scans",
  diagrams: "Diagrams",
};

function App({ isDarkMode, onThemeToggle }) {
  const notify = useNotify();
  const [selectedTab, setSelectedTab] = useState("process");
  const [selectedProcess, setSelectedProcess] = useState(null);
  const [selectedRun, setSelectedRun] = useState(null);
  const [runsData, setRunsData] = useState({});
  const runsDataRef = useRef({});
  const refreshProcessRef = useRef(null);
  const [subprocesses, setSubprocesses] = useState([]);
  const [scans, setScans] = useState([]);

  // MadGraph background tasks
  const [tasks, setTasks] = useState([]);
  const tasksRef = useRef([]);
  const [openTaskId, setOpenTaskId] = useState(null);
  const [tasksMenuAnchor, setTasksMenuAnchor] = useState(null);
  const [sidebarRefreshKey, setSidebarRefreshKey] = useState(0);

  const hasPlotsAvailable = useMemo(() => {
    return Object.values(runsData).some(
      (runInfo) =>
        runInfo && runInfo.histograms && runInfo.histograms.length > 0,
    );
  }, [runsData]);

  const hasMadnisAvailable = useMemo(() => {
    return Object.values(runsData).some(
      (runInfo) =>
        runInfo &&
        runInfo.madnis_trainings &&
        runInfo.madnis_trainings.some(
          (t) => Array.isArray(t.batch) && t.batch.length > 0,
        ),
    );
  }, [runsData]);

  const hasScansAvailable = scans.length > 0;

  const hasDiagramsAvailable = subprocesses.length > 0;

  const availableTabs = useMemo(() => {
    const tabs = ["process"];
    if (selectedRun) tabs.push("run");
    tabs.push("cards");
    if (hasPlotsAvailable) tabs.push("histograms");
    if (hasMadnisAvailable) tabs.push("madnis");
    if (hasScansAvailable) tabs.push("scans");
    if (hasDiagramsAvailable) tabs.push("diagrams");
    return tabs;
  }, [
    selectedRun,
    hasPlotsAvailable,
    hasMadnisAvailable,
    hasScansAvailable,
    hasDiagramsAvailable,
  ]);

  // Fall back to the process tab when the active one no longer exists, e.g.
  // after switching to a process without histograms
  useEffect(() => {
    if (!availableTabs.includes(selectedTab)) {
      setSelectedTab("process");
    }
  }, [availableTabs, selectedTab]);

  const handleTabChange = (event, newValue) => {
    setSelectedTab(newValue);
  };

  const handleSelectProcess = (process) => {
    if (process !== selectedProcess) {
      setSelectedProcess(process);
      setSelectedRun(null);
      setSelectedTab("process");
      setRunsData({});
      setSubprocesses([]);
      setScans([]);
    }
  };

  const handleSelectRun = (run) => {
    setSelectedRun(run);
  };

  const handleSelectRunAndNavigate = (run) => {
    setSelectedRun(run);
    setSelectedTab("run");
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
  refreshProcessRef.current = handleRefreshProcess;

  const handleDeleteProcess = async () => {
    setSelectedProcess(null);
    setSelectedRun(null);
    setSelectedTab("process");
    setRunsData({});
    window.location.reload();
  };

  useEffect(() => {
    runsDataRef.current = runsData;
  }, [runsData]);

  useEffect(() => {
    tasksRef.current = tasks;
  }, [tasks]);

  useEffect(() => {
    if (!selectedProcess) return;
    fetch(`/api/processes/${selectedProcess}/subprocesses`)
      .then((res) => res.json())
      .then((data) => setSubprocesses(data.subprocesses || []))
      .catch(() => setSubprocesses([]));
  }, [selectedProcess]);

  // Scan summaries are written once a scan finishes, so refetch them whenever
  // the set of runs changes
  const runNamesKey = useMemo(
    () => Object.keys(runsData).sort().join(","),
    [runsData],
  );

  useEffect(() => {
    if (!selectedProcess) return;
    fetch(`/api/processes/${selectedProcess}/scans`)
      .then((res) => res.json())
      .then((data) => setScans(data.scans || []))
      .catch(() => setScans([]));
  }, [selectedProcess, runNamesKey]);

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

  const handleAddProcess = useCallback(
    async (processStr, processName) => {
      try {
        const resp = await fetch("/api/madgraph/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ process: processStr, name: processName }),
        });
        if (!resp.ok) {
          notify(await errorMessage(resp, "Failed to start MadGraph"));
          return;
        }
        const { task_id, name } = await resp.json();
        const newTask = { id: task_id, name, status: "running" };
        setTasks((prev) => [...prev, newTask]);
        setOpenTaskId(task_id);
      } catch (err) {
        notify(`Could not start MadGraph: ${err.message}`);
      }
    },
    [notify],
  );

  const handleTaskDone = useCallback(
    (taskId, status) => {
      const task = tasksRef.current.find((t) => t.id === taskId);
      if (task && status !== "done") {
        notify(
          `"${task.name}" ${status === "aborted" ? "was aborted" : "failed"}`,
        );
      }
      setTasks((prev) =>
        prev.map((t) => (t.id === taskId ? { ...t, status } : t)),
      );
      if (status === "done") {
        setSidebarRefreshKey((k) => k + 1);
      }
    },
    [notify],
  );

  const handleRunStarted = useCallback((taskId, name) => {
    setTasks((prev) => [...prev, { id: taskId, name, status: "running" }]);
    setOpenTaskId(taskId);
    setTimeout(() => refreshProcessRef.current?.(), 1000);
  }, []);

  const runningCount = tasks.filter((t) => t.status === "running").length;
  const openTask = tasks.find((t) => t.id === openTaskId) ?? null;

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
              {availableTabs.map((tab) => (
                <Tab key={tab} value={tab} label={TAB_LABELS[tab]} />
              ))}
            </Tabs>
          )}
        </AppBar>

        <Box sx={{ flexGrow: 1, p: 3, overflow: "auto" }}>
          {selectedTab !== "diagrams" ? (
            <MainContent
              selectedProcess={selectedProcess}
              selectedRun={selectedRun}
              onSelectRun={handleSelectRun}
              onSelectRunAndNavigate={handleSelectRunAndNavigate}
              selectedTab={selectedTab}
              isDarkMode={isDarkMode}
              runsData={runsData}
              scans={scans}
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
