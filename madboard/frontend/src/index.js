import React, { useState } from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';

function AppWithTheme() {
  const [isDarkMode, setIsDarkMode] = useState(false);

  const theme = createTheme({
    palette: {
      mode: isDarkMode ? 'dark' : 'light',
      primary: {
        main: '#1976d2',
      },
      secondary: {
        main: '#dc004e',
      },
    },
  });

  const handleThemeToggle = () => {
    setIsDarkMode(!isDarkMode);
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <App isDarkMode={isDarkMode} onThemeToggle={handleThemeToggle} />
    </ThemeProvider>
  );
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <AppWithTheme />
  </React.StrictMode>
);
