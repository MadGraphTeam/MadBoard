import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  Box,
  AppBar,
  Toolbar,
  Tab,
  Tabs,
  Typography,
  Switch,
} from "@mui/material";
import Layout from "./components/Layout";
import Sidebar from "./components/Sidebar";
import MainContent from "./components/MainContent";

function App({ isDarkMode, onThemeToggle }) {
  const [selectedTab, setSelectedTab] = useState(0);
  const [selectedProcess, setSelectedProcess] = useState(null);
  const [selectedRun, setSelectedRun] = useState(null);
  const [runsData, setRunsData] = useState({}); // Map of run name to run info
  const runsDataRef = useRef({});

  // Check if any run has histograms
  const hasPlotsAvailable = useMemo(() => {
    return Object.values(runsData).some(
      (runInfo) =>
        runInfo && runInfo.histograms && runInfo.histograms.length > 0,
    );
  }, [runsData]);

  const handleTabChange = (event, newValue) => {
    setSelectedTab(newValue);
  };

  const handleSelectProcess = (process) => {
    // Only reset data if switching to a different process
    if (process !== selectedProcess) {
      setSelectedProcess(process);
      setSelectedRun(null);
      setSelectedTab(0);
      setRunsData({});
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
    // Refresh the current process's runs without full page reload
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

  // Keep ref in sync with state
  useEffect(() => {
    runsDataRef.current = runsData;
  }, [runsData]);

  // Fetch all runs for the selected process
  useEffect(() => {
    if (!selectedProcess) return;

    const fetchAllRuns = async () => {
      try {
        const response = await fetch(`/api/processes/${selectedProcess}/runs`);
        if (!response.ok) throw new Error("Failed to fetch runs");
        const data = await response.json();

        // New API returns a list of objects with name and info
        const newRunsData = {};
        for (const runObj of data.runs) {
          newRunsData[runObj.name] = runObj;
        }
        console.log("Fetched runs data:", newRunsData);
        setRunsData(newRunsData);
      } catch (err) {
        console.error("Failed to fetch runs:", err);
      }
    };

    fetchAllRuns();

    // Set up auto-refresh for non-done runs
    const interval = setInterval(async () => {
      try {
        // Only re-fetch info for non-done runs, don't re-fetch the run list
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

  return (
    <Layout>
      <Sidebar
        onSelectProcess={handleSelectProcess}
        onSelectRun={handleSelectRun}
        selectedProcess={selectedProcess}
        selectedRun={selectedRun}
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
                src="/logo-dark.png"
                alt="MadBoard Logo"
                style={{ height: 40 }}
              />
              <Typography variant="h5">MadBoard</Typography>
            </Box>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <Typography variant="body2">
                {isDarkMode ? "🌙" : "☀️"}
              </Typography>
              <Switch
                checked={isDarkMode}
                onChange={onThemeToggle}
                color="default"
              />
            </Box>
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
            </Tabs>
          )}
        </AppBar>
        <Box sx={{ flexGrow: 1, p: 3, overflow: "auto" }}>
          <MainContent
            selectedProcess={selectedProcess}
            selectedRun={selectedRun}
            onSelectRun={handleSelectRun}
            onSelectRunAndNavigate={handleSelectRunAndNavigate}
            selectedTab={selectedTab}
            isDarkMode={isDarkMode}
            runsData={runsData}
            onRefreshProcess={handleRefreshProcess}
          />
        </Box>
      </Box>
    </Layout>
  );
}

export default App;
