import React from "react";
import { Box, Typography } from "@mui/material";
import { useMemo } from "react";
import ProcessTab from "./ProcessTab";
import RunTab from "./RunTab";
import CardsTab from "./CardsTab";
import PlotsTab from "./PlotsTab";
import MadNisTab from "./MadNisTab";
import ScansTab from "./ScansTab";

function MainContent({
  selectedProcess,
  selectedRun,
  onSelectRun,
  onSelectRunAndNavigate,
  selectedTab,
  isDarkMode,
  runsData,
  scans,
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

  const hasScansAvailable = scans.length > 0;

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
          Select a process to see its runs, cards and plots
        </Typography>
      </Box>
    );
  }

  return (
    <Box>
      {selectedTab === "process" && (
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
      {selectedTab === "run" && selectedRun && (
        <RunTab
          selectedProcess={selectedProcess}
          selectedRun={selectedRun}
          runsData={runsData}
        />
      )}
      {selectedTab === "cards" && (
        <CardsTab selectedProcess={selectedProcess} isDarkMode={isDarkMode} />
      )}
      {hasPlotsAvailable && selectedTab === "histograms" && (
        <PlotsTab selectedRun={selectedRun} runsData={runsData} />
      )}
      {hasMadnisAvailable && selectedTab === "madnis" && (
        <MadNisTab selectedRun={selectedRun} runsData={runsData} />
      )}
      {hasScansAvailable && selectedTab === "scans" && (
        <ScansTab selectedRun={selectedRun} scans={scans} />
      )}
    </Box>
  );
}

export default MainContent;
