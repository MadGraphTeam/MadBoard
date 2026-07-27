import React, { useEffect, useMemo, useState } from "react";
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Stack,
  FormControlLabel,
  Checkbox,
  ToggleButton,
  ToggleButtonGroup,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
} from "@mui/material";
import {
  ComposedChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { formatScientificTick, RUN_COLORS } from "../utils/formatting";

// Preferred display order for quantity charts; anything not listed here
// falls back to the end, in whatever order it appears in the data.
const QUANTITY_ORDER = [
  "losses",
  "channel_counts",
  "generated_events",
  "learning_rates",
  "buffered_fractions",
  "buffer_sizes",
];

// Turn a snake_case field name into a human-readable title
function formatQuantityName(key) {
  return key
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

// Only trainings with a per-checkpoint "batch" array can be plotted; skip
// any run whose data doesn't match that format.
function getPlottableTrainings(runInfo) {
  if (!runInfo || !runInfo.madnis_trainings) return [];
  return runInfo.madnis_trainings.filter(
    (t) => Array.isArray(t.batch) && t.batch.length > 0,
  );
}

// Average an array-valued field across all subprocess trainings of a run
function averageAcrossSubprocesses(trainings, key) {
  const arrays = trainings.map((t) => t[key]).filter(Array.isArray);
  if (arrays.length === 0) return [];
  const length = Math.min(...arrays.map((arr) => arr.length));
  const batch = trainings[0].batch;
  const points = [];
  for (let i = 0; i < length; i++) {
    const mean = arrays.reduce((sum, arr) => sum + arr[i], 0) / arrays.length;
    points.push({ x: batch[i], y: mean });
  }
  return points;
}

function MadNisTab({ selectedRun, runsData }) {
  const [mode, setMode] = useState("subprocess"); // "subprocess" | "average"
  const [scales, setScales] = useState({}); // Track linear/log scale per quantity

  // Runs that have plottable MadNIS training data
  const runsWithMadnis = useMemo(() => {
    return Object.keys(runsData).filter(
      (runName) => getPlottableTrainings(runsData[runName]).length > 0,
    );
  }, [runsData]);

  // Fixed color mapping for runs (used in average mode)
  const runColorMap = useMemo(() => {
    const colorMap = {};
    runsWithMadnis.forEach((runName, index) => {
      colorMap[runName] = RUN_COLORS[index % RUN_COLORS.length];
    });
    return colorMap;
  }, [runsWithMadnis]);

  // Quantities to plot: array-valued fields other than "batch"
  const quantityKeys = useMemo(() => {
    for (const runName of runsWithMadnis) {
      const trainings = getPlottableTrainings(runsData[runName]);
      if (trainings.length > 0) {
        const keys = Object.keys(trainings[0]).filter(
          (key) => key !== "batch" && Array.isArray(trainings[0][key]),
        );
        return keys.sort((a, b) => {
          const indexA = QUANTITY_ORDER.indexOf(a);
          const indexB = QUANTITY_ORDER.indexOf(b);
          if (indexA === -1 && indexB === -1) return 0;
          if (indexA === -1) return 1;
          if (indexB === -1) return -1;
          return indexA - indexB;
        });
      }
    }
    return [];
  }, [runsWithMadnis, runsData]);

  // ── Mode: single run, per-subprocess curves ─────────────────────────────
  const [singleRun, setSingleRun] = useState(null);
  const [enabledSubprocesses, setEnabledSubprocesses] = useState(null); // null means use default

  const effectiveSingleRun = useMemo(() => {
    if (singleRun && runsWithMadnis.includes(singleRun)) return singleRun;
    if (selectedRun && runsWithMadnis.includes(selectedRun)) return selectedRun;
    return runsWithMadnis[0] || null;
  }, [singleRun, selectedRun, runsWithMadnis]);

  const trainingsForSingleRun = useMemo(() => {
    if (!effectiveSingleRun) return [];
    return getPlottableTrainings(runsData[effectiveSingleRun]);
  }, [effectiveSingleRun, runsData]);

  const subprocessIds = useMemo(
    () => trainingsForSingleRun.map((t) => t.subprocess),
    [trainingsForSingleRun],
  );

  // Reset subprocess selection whenever the selected run changes
  useEffect(() => {
    setEnabledSubprocesses(null);
  }, [effectiveSingleRun]);

  const subprocessesToShow = useMemo(() => {
    if (enabledSubprocesses !== null) return enabledSubprocesses;
    return subprocessIds;
  }, [enabledSubprocesses, subprocessIds]);

  const subprocessColorMap = useMemo(() => {
    const colorMap = {};
    subprocessIds.forEach((id, index) => {
      colorMap[id] = RUN_COLORS[index % RUN_COLORS.length];
    });
    return colorMap;
  }, [subprocessIds]);

  const toggleSubprocess = (id) => {
    setEnabledSubprocesses((prev) => {
      const current = prev !== null ? prev : subprocessesToShow;
      if (current.includes(id)) {
        return current.filter((s) => s !== id);
      }
      return [...current, id];
    });
  };

  const handleSelectAllSubprocesses = () =>
    setEnabledSubprocesses(subprocessIds);
  const handleDeselectAllSubprocesses = () => setEnabledSubprocesses([]);

  // ── Mode: average over subprocesses, multiple runs ──────────────────────
  const [enabledRuns, setEnabledRuns] = useState(null); // null means use default

  const runsToShow = useMemo(() => {
    if (enabledRuns !== null) return enabledRuns;
    return runsWithMadnis;
  }, [enabledRuns, runsWithMadnis]);

  const toggleRun = (runName) => {
    setEnabledRuns((prev) => {
      const current = prev !== null ? prev : runsToShow;
      if (current.includes(runName)) {
        return current.filter((r) => r !== runName);
      }
      return [...current, runName];
    });
  };

  const handleSelectAllRuns = () => setEnabledRuns(runsWithMadnis);
  const handleDeselectAllRuns = () => setEnabledRuns([]);

  const toggleScale = (name) => {
    setScales((prev) => ({
      ...prev,
      [name]: prev[name] === "log" ? "linear" : "log",
    }));
  };

  // Build the per-quantity series to plot, depending on the active mode
  const seriesByQuantity = useMemo(() => {
    const data = {};
    quantityKeys.forEach((key) => {
      if (mode === "subprocess") {
        data[key] = trainingsForSingleRun
          .filter((t) => subprocessesToShow.includes(t.subprocess))
          .map((t) => ({
            id: t.subprocess,
            label: `Subprocess ${t.subprocess}`,
            color: subprocessColorMap[t.subprocess],
            points: t.batch.map((b, i) => ({ x: b, y: t[key][i] })),
          }));
      } else {
        data[key] = runsToShow
          .map((runName) => {
            const trainings = getPlottableTrainings(runsData[runName]);
            if (trainings.length === 0) return null;
            return {
              id: runName,
              label: runName,
              color: runColorMap[runName],
              points: averageAcrossSubprocesses(trainings, key),
            };
          })
          .filter(Boolean);
      }
    });
    return data;
  }, [
    quantityKeys,
    mode,
    trainingsForSingleRun,
    subprocessesToShow,
    subprocessColorMap,
    runsToShow,
    runsData,
    runColorMap,
  ]);

  if (runsWithMadnis.length === 0) {
    return (
      <Card>
        <CardContent>
          <Typography variant="h6">MadNIS</Typography>
          <Typography variant="body2" color="text.secondary">
            No MadNIS training data available
          </Typography>
        </CardContent>
      </Card>
    );
  }

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
      {/* Mode and selection controls */}
      <Card>
        <CardContent>
          <ToggleButtonGroup
            value={mode}
            exclusive
            onChange={(event, newMode) => newMode && setMode(newMode)}
            size="small"
            sx={{ mb: 2 }}
          >
            <ToggleButton value="subprocess">
              Single run &middot; per-subprocess curves
            </ToggleButton>
            <ToggleButton value="average">
              Multiple runs &middot; averaged over subprocesses
            </ToggleButton>
          </ToggleButtonGroup>

          {mode === "subprocess" ? (
            <>
              <FormControl
                size="small"
                sx={{ minWidth: 240, mb: 2, display: "block" }}
              >
                <InputLabel id="madnis-run-select-label">Run</InputLabel>
                <Select
                  labelId="madnis-run-select-label"
                  label="Run"
                  value={effectiveSingleRun || ""}
                  onChange={(e) => setSingleRun(e.target.value)}
                >
                  {runsWithMadnis.map((runName) => (
                    <MenuItem key={runName} value={runName}>
                      {runName}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <Stack
                direction="row"
                justifyContent="space-between"
                alignItems="center"
                sx={{ mb: 2 }}
              >
                <Typography variant="subtitle1">
                  Select subprocesses to display:
                </Typography>
                <Stack direction="row" spacing={1}>
                  <Button
                    size="small"
                    variant="outlined"
                    onClick={handleSelectAllSubprocesses}
                  >
                    Select all
                  </Button>
                  <Button
                    size="small"
                    variant="outlined"
                    onClick={handleDeselectAllSubprocesses}
                  >
                    Deselect all
                  </Button>
                </Stack>
              </Stack>
              <Stack direction="row" spacing={2} sx={{ flexWrap: "wrap" }}>
                {subprocessIds.map((id) => (
                  <FormControlLabel
                    key={id}
                    control={
                      <Checkbox
                        checked={subprocessesToShow.includes(id)}
                        onChange={() => toggleSubprocess(id)}
                      />
                    }
                    label={`Subprocess ${id}`}
                  />
                ))}
              </Stack>
            </>
          ) : (
            <>
              <Stack
                direction="row"
                justifyContent="space-between"
                alignItems="center"
                sx={{ mb: 2 }}
              >
                <Typography variant="subtitle1">
                  Select runs to display:
                </Typography>
                <Stack direction="row" spacing={1}>
                  <Button
                    size="small"
                    variant="outlined"
                    onClick={handleSelectAllRuns}
                  >
                    Select all
                  </Button>
                  <Button
                    size="small"
                    variant="outlined"
                    onClick={handleDeselectAllRuns}
                  >
                    Deselect all
                  </Button>
                </Stack>
              </Stack>
              <Stack direction="row" spacing={2} sx={{ flexWrap: "wrap" }}>
                {runsWithMadnis.map((runName) => (
                  <FormControlLabel
                    key={runName}
                    control={
                      <Checkbox
                        checked={runsToShow.includes(runName)}
                        onChange={() => toggleRun(runName)}
                      />
                    }
                    label={runName}
                  />
                ))}
              </Stack>
            </>
          )}
        </CardContent>
      </Card>

      {/* Quantity charts */}
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", lg: "1fr 1fr" },
          gap: 3,
        }}
      >
        {quantityKeys.map((key) => {
          const scale = scales[key] || "linear";
          const series = seriesByQuantity[key] || [];

          let xMax = -Infinity;
          series.forEach(({ points }) => {
            points.forEach((point) => {
              xMax = Math.max(xMax, point.x);
            });
          });
          const xDomain = xMax !== -Infinity ? [0, xMax] : [0, 1];

          return (
            <Card key={key}>
              <CardContent>
                <Stack
                  direction="row"
                  justifyContent="space-between"
                  alignItems="center"
                  sx={{ mb: 2 }}
                >
                  <Typography variant="h6">
                    {formatQuantityName(key)}
                  </Typography>
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={() => toggleScale(key)}
                  >
                    {scale === "linear" ? "Switch to Log" : "Switch to Linear"}
                  </Button>
                </Stack>
                <ResponsiveContainer width="100%" height={400}>
                  <ComposedChart>
                    <CartesianGrid opacity={0.5} />
                    <XAxis
                      dataKey="x"
                      domain={xDomain}
                      label={{
                        value: "Batch",
                        position: "insideBottomRight",
                        offset: -5,
                      }}
                      type="number"
                    />
                    <YAxis
                      scale={scale}
                      domain={[scale === "log" ? "auto" : 0, "auto"]}
                      tickFormatter={
                        scale === "log" ? formatScientificTick : undefined
                      }
                      label={{
                        value: formatQuantityName(key),
                        angle: -90,
                        position: "insideLeft",
                      }}
                    />
                    <Legend />

                    {series.map(({ id, label, color, points }) => {
                      let displayPoints = points;
                      if (scale === "log") {
                        displayPoints = points.map((point) => ({
                          ...point,
                          y: point.y > 0 ? point.y : null,
                        }));
                      }

                      return (
                        <Line
                          key={id}
                          type="linear"
                          dataKey="y"
                          data={displayPoints}
                          stroke={color}
                          name={label}
                          isAnimationActive={false}
                          dot={false}
                        />
                      );
                    })}
                  </ComposedChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          );
        })}
      </Box>
    </Box>
  );
}

export default MadNisTab;
