import React, { useMemo } from "react";
import {
  Box,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Stack,
  Typography,
} from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";
import {
  formatWithError,
  formatSIPrefix,
  formatRSD,
  formatEfficiency,
} from "../utils/formatting";
import {
  COMPACT_GRID_SX,
  ROW_HEIGHT,
  withHeaderTooltips,
} from "../utils/dataGrid";

// The "before cuts" variants repeat the "after cuts" ones for most runs; they
// stay available in the column menu
const HIDDEN_COLUMNS = {
  samplesBeforeCuts: false,
  unweightingEfficiencyBeforeCuts: false,
};

const STATUS_COLORS = {
  done: "success",
  running: "warning",
  failed: "error",
  error: "error",
};

function formatDuration(seconds) {
  if (!Number.isFinite(seconds)) return null;
  if (seconds < 60) return `${seconds.toFixed(1)} s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} min ${Math.round(seconds % 60)} s`;
  return `${Math.floor(minutes / 60)} h ${minutes % 60} min`;
}

/** One headline number of the run */
function SummaryItem({ label, value }) {
  return (
    <Box sx={{ minWidth: 140 }}>
      <Typography variant="caption" color="text.secondary">
        {label}
      </Typography>
      <Typography variant="h6">{value}</Typography>
    </Box>
  );
}

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

  // Headline numbers of the run, taken from the process-level aggregate
  const summary = useMemo(() => {
    const data = runsData[selectedRun] || {};
    const process = data.process || {};
    const runTimes = data.run_times || {};
    const wallTime = Object.values(runTimes).reduce(
      (total, step) => total + (step?.wall_time_sec || 0),
      0,
    );
    const hasCross =
      typeof process.mean === "number" && typeof process.error === "number";
    return {
      status: data.status || "unknown",
      crossSection: hasCross
        ? formatWithError(process.mean, process.error)
        : "—",
      unweightedEvents:
        typeof process.count_unweighted === "number"
          ? formatSIPrefix(process.count_unweighted)
          : "—",
      samples:
        typeof process.count === "number" ? formatSIPrefix(process.count) : "—",
      relStdDev:
        typeof process.rel_std_dev === "number"
          ? formatRSD(process.rel_std_dev)
          : "—",
      runTime: wallTime > 0 ? formatDuration(wallTime) : null,
      seed: data.seed != null ? String(data.seed) : null,
    };
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
      {/* What this run is and how it came out */}
      <Card>
        <CardContent>
          <Stack
            direction="row"
            alignItems="center"
            spacing={1.5}
            sx={{ mb: 2 }}
          >
            <Typography variant="h5">{selectedRun}</Typography>
            <Chip
              label={summary.status}
              size="small"
              color={STATUS_COLORS[summary.status] || "default"}
            />
            <Typography variant="body2" color="text.secondary">
              {selectedProcess}
            </Typography>
          </Stack>
          <Box
            sx={{ display: "flex", flexWrap: "wrap", columnGap: 5, rowGap: 2 }}
          >
            <SummaryItem
              label="Cross section (pb)"
              value={summary.crossSection}
            />
            <SummaryItem
              label="Unweighted events"
              value={summary.unweightedEvents}
            />
            <SummaryItem label="Samples" value={summary.samples} />
            <SummaryItem
              label="Relative standard deviation"
              value={summary.relStdDev}
            />
            {summary.runTime && (
              <SummaryItem label="Run time" value={summary.runTime} />
            )}
            {summary.seed && <SummaryItem label="Seed" value={summary.seed} />}
          </Box>
        </CardContent>
      </Card>

      <Box>
        <Typography variant="h6" sx={{ mb: 2 }}>
          Subprocesses
        </Typography>
        <DataGrid
          rows={subprocessesRows}
          columns={withHeaderTooltips(subprocessesColumns)}
          autoHeight
          columnHeaderHeight={ROW_HEIGHT}
          sx={COMPACT_GRID_SX}
          initialState={{ columns: { columnVisibilityModel: HIDDEN_COLUMNS } }}
        />
      </Box>
      <Box>
        <Typography variant="h6" sx={{ mb: 2 }}>
          Channels
        </Typography>
        <DataGrid
          rows={channelsRows}
          columns={withHeaderTooltips(channelsColumns)}
          autoHeight
          columnHeaderHeight={ROW_HEIGHT}
          sx={COMPACT_GRID_SX}
          initialState={{ columns: { columnVisibilityModel: HIDDEN_COLUMNS } }}
        />
      </Box>
    </Box>
  );
}

export default RunTab;
