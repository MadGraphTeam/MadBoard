import React, { useState, useEffect } from "react";
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

  const handleTabChange = (event, newValue) => {
    setSelectedTab(newValue);
  };

  const handleSelectProcess = (process) => {
    setSelectedProcess(process);
    // Reset run selection and tab when switching process
    setSelectedRun(null);
    setSelectedTab(0);
  };

  const handleSelectRun = (run) => {
    setSelectedRun(run);
  };

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
        sx={{ flexGrow: 1, display: "flex", flexDirection: "column" }}
      >
        <AppBar position="static">
          <Toolbar>
            <Typography variant="h6" sx={{ flexGrow: 1 }}>
              MadBoard
            </Typography>
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
              <Tab label="Plots" />
            </Tabs>
          )}
        </AppBar>
        <Box sx={{ flexGrow: 1, p: 3 }}>
          <MainContent
            selectedProcess={selectedProcess}
            selectedRun={selectedRun}
            selectedTab={selectedTab}
            isDarkMode={isDarkMode}
          />
        </Box>
      </Box>
    </Layout>
  );
}

export default App;
