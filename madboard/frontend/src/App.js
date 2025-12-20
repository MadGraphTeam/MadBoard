import React, { useState, useEffect } from 'react';
import {
  Box,
  AppBar,
  Toolbar,
  Tab,
  Tabs,
  Typography,
  Switch,
} from '@mui/material';
import Layout from './components/Layout';
import Sidebar from './components/Sidebar';
import MainContent from './components/MainContent';

function App({ isDarkMode, onThemeToggle }) {
  const [selectedTab, setSelectedTab] = useState(0);

  const handleTabChange = (event, newValue) => {
    setSelectedTab(newValue);
  };

  return (
    <Layout>
      <Sidebar />
      <Box component="main" sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
        <AppBar position="static">
          <Toolbar>
            <Typography variant="h6" sx={{ flexGrow: 1 }}>
              MadBoard
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="body2">
                {isDarkMode ? '🌙' : '☀️'}
              </Typography>
              <Switch
                checked={isDarkMode}
                onChange={onThemeToggle}
                color="default"
              />
            </Box>
          </Toolbar>
          <Tabs
            value={selectedTab}
            onChange={handleTabChange}
            textColor="inherit"
            indicatorColor="secondary"
          >
            <Tab label="Home" />
            <Tab label="Dashboard" />
            <Tab label="Settings" />
          </Tabs>
        </AppBar>
        <Box sx={{ flexGrow: 1, p: 3 }}>
          <MainContent selectedTab={selectedTab} />
        </Box>
      </Box>
    </Layout>
  );
}

export default App;
