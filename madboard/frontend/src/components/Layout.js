import React from 'react';
import { Box } from '@mui/material';

function Layout({ children }) {
  return (
    <Box
      sx={{
        display: 'flex',
        height: '100vh',
        width: '100%',
        bgcolor: '#f5f5f5',
      }}
    >
      {children}
    </Box>
  );
}

export default Layout;
