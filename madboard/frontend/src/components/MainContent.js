import React from "react";
import { Box, Typography } from "@mui/material";
import ProcessTab from "./ProcessTab";
import RunTab from "./RunTab";
import CardsTab from "./CardsTab";
import PlotsTab from "./PlotsTab";

function MainContent({
  selectedProcess,
  selectedRun,
  selectedTab,
  isDarkMode,
}) {
  if (!selectedProcess) {
    return (
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "100%",
        }}
      >
        <Typography variant="h6" color="text.secondary">
          Please select a process
        </Typography>
      </Box>
    );
  }

  return (
    <Box>
      {selectedTab === 0 && <ProcessTab selectedProcess={selectedProcess} />}
      {selectedTab === 1 && selectedRun && (
        <RunTab selectedProcess={selectedProcess} selectedRun={selectedRun} />
      )}
      {(!selectedRun ? selectedTab === 1 : selectedTab === 2) && (
        <CardsTab selectedProcess={selectedProcess} isDarkMode={isDarkMode} />
      )}
      {(!selectedRun ? selectedTab === 2 : selectedTab === 3) && <PlotsTab />}
    </Box>
  );
}

export default MainContent;
