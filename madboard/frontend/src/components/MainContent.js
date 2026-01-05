import React from "react";
import { Box, Typography } from "@mui/material";
import { useMemo } from "react";
import ProcessTab from "./ProcessTab";
import RunTab from "./RunTab";
import CardsTab from "./CardsTab";
import PlotsTab from "./PlotsTab";

function MainContent({
  selectedProcess,
  selectedRun,
  onSelectRun,
  onSelectRunAndNavigate,
  selectedTab,
  isDarkMode,
  runsData,
  onRefreshProcess,
  onDeleteProcess,
}) {
  // Check if any run has histograms
  const hasPlotsAvailable = useMemo(() => {
    return Object.values(runsData).some(
      (runInfo) =>
        runInfo && runInfo.histograms && runInfo.histograms.length > 0,
    );
  }, [runsData]);

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
      {selectedTab === 0 && (
        <ProcessTab
          selectedProcess={selectedProcess}
          onSelectRun={onSelectRun}
          onSelectRunAndNavigate={onSelectRunAndNavigate}
          runsData={runsData}
          onRefreshProcess={onRefreshProcess}
          onDeleteProcess={onDeleteProcess}
        />
      )}
      {selectedTab === 1 && selectedRun && (
        <RunTab
          selectedProcess={selectedProcess}
          selectedRun={selectedRun}
          runsData={runsData}
        />
      )}
      {(!selectedRun ? selectedTab === 1 : selectedTab === 2) && (
        <CardsTab selectedProcess={selectedProcess} isDarkMode={isDarkMode} />
      )}
      {hasPlotsAvailable &&
        (!selectedRun ? selectedTab === 2 : selectedTab === 3) && (
          <PlotsTab selectedRun={selectedRun} runsData={runsData} />
        )}
    </Box>
  );
}

export default MainContent;
