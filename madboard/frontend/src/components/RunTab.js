import React, { useMemo } from "react";
import { Box, Typography, CircularProgress } from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";
import {
  formatWithError,
  formatSIPrefix,
  formatRSD,
  formatEfficiency,
} from "../utils/formatting";

function RunTab({ selectedProcess, selectedRun, runsData }) {
  const { subprocessesRows, channelsRows } = useMemo(() => {
    if (!runsData[selectedRun]) {
      return { subprocessesRows: [], channelsRows: [] };
    }

    const data = runsData[selectedRun];
    const channels = data.channels || [];
    const groupedBySubprocess = {};

    // Group channels by subprocess
    channels.forEach((channel) => {
      const subprocess = channel.subprocess || 0;
      if (!groupedBySubprocess[subprocess]) {
        groupedBySubprocess[subprocess] = [];
      }
      groupedBySubprocess[subprocess].push(channel);
    });

    // Transform subprocesses to rows
    const subprocessRows = Object.entries(groupedBySubprocess).map(
      (entry, index) => {
        const [subprocess, channelList] = entry;
        // Calculate aggregate for subprocess
        const meanValue = channelList.reduce(
          (sum, ch) => sum + (ch.mean || 0),
          0,
        );
        const errorValue = Math.sqrt(
          channelList.reduce((sum, ch) => sum + (ch.error || 0) ** 2, 0),
        );
        const countBeforeCuts = channelList.reduce(
          (sum, ch) => sum + (ch.count || 0),
          0,
        );
        const countAfterCuts = channelList.reduce(
          (sum, ch) => sum + (ch.count_after_cuts || 0),
          0,
        );
        const countBeforeCutsOpt = channelList.reduce(
          (sum, ch) => sum + (ch.count_opt || 0),
          0,
        );
        const countAfterCutsOpt = channelList.reduce(
          (sum, ch) => sum + (ch.count_after_cuts_opt || 0),
          0,
        );
        const countUnweighted = channelList.reduce(
          (sum, ch) => sum + (ch.count_unweighted || 0),
          0,
        );
        const relStdDev =
          (errorValue / meanValue) * Math.sqrt(countBeforeCutsOpt);

        return {
          id: index,
          name: subprocess,
          crossSection: formatWithError(meanValue, errorValue),
          samplesBeforeCuts: formatSIPrefix(countBeforeCuts),
          samplesAfterCuts: formatSIPrefix(countAfterCuts),
          unweightedEvents: formatSIPrefix(countUnweighted),
          relativeStandardDeviation: formatRSD(relStdDev),
          unweightingEfficiencyBeforeCuts: formatEfficiency(
            countUnweighted,
            countBeforeCutsOpt,
          ),
          unweightingEfficiencyAfterCuts: formatEfficiency(
            countUnweighted,
            countAfterCutsOpt,
          ),
        };
      },
    );

    // Transform channels to rows
    const channelRows = channels.map((channel, index) => ({
      id: index,
      subprocess: channel.subprocess || 0,
      name: channel.name || `Channel ${index + 1}`,
      crossSection: formatWithError(channel.mean || 0, channel.error || 0),
      samplesBeforeCuts: formatSIPrefix(channel.count || 0),
      samplesAfterCuts: formatSIPrefix(channel.count_after_cuts || 0),
      unweightedEvents: formatSIPrefix(channel.count_unweighted || 0),
      relativeStandardDeviation: formatRSD(channel.rel_std_dev || 0),
      unweightingEfficiencyBeforeCuts: formatEfficiency(
        channel.count_unweighted || 0,
        channel.count_opt || 0,
      ),
      unweightingEfficiencyAfterCuts: formatEfficiency(
        channel.count_unweighted || 0,
        channel.count_after_cuts_opt || 0,
      ),
    }));

    return { subprocessesRows: subprocessRows, channelsRows: channelRows };
  }, [selectedRun, runsData]);

  const subprocessesColumns = [
    {
      field: "name",
      headerName: "Name",
      flex: 1,
      minWidth: 100,
      sortable: true,
    },
    {
      field: "crossSection",
      headerName: "Cross section",
      flex: 1,
      minWidth: 120,
      sortable: true,
    },
    {
      field: "samplesBeforeCuts",
      headerName: "Samples (before cuts)",
      flex: 1,
      minWidth: 100,
      sortable: true,
      hide: true,
    },
    {
      field: "samplesAfterCuts",
      headerName: "Samples (after cuts)",
      flex: 1,
      minWidth: 100,
      sortable: true,
    },
    {
      field: "relativeStandardDeviation",
      headerName: "Relative standard deviation",
      flex: 1,
      minWidth: 100,
      sortable: true,
    },
    {
      field: "unweightedEvents",
      headerName: "Unweighted events",
      flex: 1,
      minWidth: 120,
      sortable: true,
    },
    {
      field: "unweightingEfficiencyBeforeCuts",
      headerName: "Unweighting efficiency (before cuts)",
      flex: 1,
      minWidth: 100,
      sortable: true,
      hide: true,
    },
    {
      field: "unweightingEfficiencyAfterCuts",
      headerName: "Unweighting efficiency (after cuts)",
      flex: 1,
      minWidth: 100,
      sortable: true,
    },
  ];

  const channelsColumns = [
    {
      field: "subprocess",
      headerName: "Subprocess",
      flex: 1,
      minWidth: 100,
      sortable: true,
    },
    ...subprocessesColumns,
  ];

  if (!runsData[selectedRun]) {
    return <CircularProgress />;
  }

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
      <Box>
        <Typography variant="h6" sx={{ mb: 2 }}>
          Subprocesses
        </Typography>
        <Box sx={{ height: 300, width: "100%" }}>
          <DataGrid rows={subprocessesRows} columns={subprocessesColumns} />
        </Box>
      </Box>
      <Box>
        <Typography variant="h6" sx={{ mb: 2 }}>
          Channels
        </Typography>
        <Box sx={{ height: 300, width: "100%" }}>
          <DataGrid rows={channelsRows} columns={channelsColumns} />
        </Box>
      </Box>
    </Box>
  );
}

export default RunTab;
