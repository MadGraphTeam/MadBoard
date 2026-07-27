import React from "react";
import { Box, Typography } from "@mui/material";
import { useMemo } from "react";
import ProcessTab from "./ProcessTab";
import RunTab from "./RunTab";
import CardsTab from "./CardsTab";
import PlotsTab from "./PlotsTab";
import MadNisTab from "./MadNisTab";

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
  onRunStarted,
}) {
  // Check if any run has histograms
  const hasPlotsAvailable = useMemo(() => {
    return Object.values(runsData).some(
      (runInfo) =>
        runInfo && runInfo.histograms && runInfo.histograms.length > 0,
    );
  }, [runsData]);

  // Check if any run has MadNIS training data with a per-checkpoint "batch" array
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

  const cardsTabIndex = selectedRun ? 2 : 1;
  const histogramsTabIndex = hasPlotsAvailable ? cardsTabIndex + 1 : null;
  const madnisTabIndex = hasMadnisAvailable
    ? (histogramsTabIndex ?? cardsTabIndex) + 1
    : null;

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
          isDarkMode={isDarkMode}
          onRunStarted={onRunStarted}
        />
      )}
      {selectedTab === 1 && selectedRun && (
        <RunTab
          selectedProcess={selectedProcess}
          selectedRun={selectedRun}
          runsData={runsData}
        />
      )}
      {selectedTab === cardsTabIndex && (
        <CardsTab selectedProcess={selectedProcess} isDarkMode={isDarkMode} />
      )}
      {hasPlotsAvailable && selectedTab === histogramsTabIndex && (
        <PlotsTab selectedRun={selectedRun} runsData={runsData} />
      )}
      {hasMadnisAvailable && selectedTab === madnisTabIndex && (
        <MadNisTab selectedRun={selectedRun} runsData={runsData} />
      )}
    </Box>
  );
}

export default MainContent;
