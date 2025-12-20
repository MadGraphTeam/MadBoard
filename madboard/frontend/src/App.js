import React, { useState, useEffect } from 'react';
import {
  Box,
  AppBar,
  Toolbar,
  Drawer,
  Tab,
  Tabs,
  Typography,
  Container,
} from '@mui/material';
import Layout from './components/Layout';
import Sidebar from './components/Sidebar';
import MainContent from './components/MainContent';

function App() {
  const [selectedTab, setSelectedTab] = useState(0);
  const [apiStatus, setApiStatus] = useState('Loading...');

  useEffect(() => {
    // Check API status
    fetch('/api/status')
      .then(res => res.json())
      .then(data => setApiStatus(data.message))
      .catch(err => setApiStatus('API not available'));
  }, []);

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
            <Typography variant="body2">
              {apiStatus}
            </Typography>
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
