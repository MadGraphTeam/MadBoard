import React from 'react';
import { Card, CardContent, Typography, Box } from '@mui/material';

const tabContent = {
  0: {
    title: 'Welcome to MadBoard',
    description: 'This is the home page of your MadBoard application.',
  },
  1: {
    title: 'Dashboard',
    description: 'View your dashboard analytics and metrics here.',
  },
  2: {
    title: 'Settings',
    description: 'Configure your application settings.',
  },
};

function MainContent({ selectedTab }) {
  const content = tabContent[selectedTab] || tabContent[0];

  return (
    <Box>
      <Card>
        <CardContent>
          <Typography variant="h5" component="div" gutterBottom>
            {content.title}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {content.description}
          </Typography>
        </CardContent>
      </Card>
    </Box>
  );
}

export default MainContent;
