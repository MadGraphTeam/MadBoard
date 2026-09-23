import React, { useMemo, useState } from "react";
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
} from "@mui/material";
import {
  ComposedChart,
  Line,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { formatAxisTick, RUN_COLORS } from "../utils/formatting";
import ChartTooltip from "./ChartTooltip";

// The two histogram sources a run's info.json may provide: the existing
// weighted on-the-fly histograms, and histograms rebinned from the final
// unweighted output, which also carry scale/PDF systematic uncertainties.
const MODE_FIELD = {
  weighted: "histograms",
  unweighted: "event_histograms",
};

function runHasMode(runInfo, mode) {
  const field = MODE_FIELD[mode];
  return Boolean(
    runInfo && Array.isArray(runInfo[field]) && runInfo[field].length > 0,
  );
}

// Combine the per-bin scale-variation envelope and PDF uncertainty into a
// single asymmetric systematic band around the central value, adding the two
// sources in quadrature (the usual treatment for independent theory
// uncertainties).
function systematicBand(value, index, scaleEnvelope, pdfUncertainty) {
  if (!scaleEnvelope || !pdfUncertainty) return null;
  const scaleUp = Math.max(scaleEnvelope.high[index] - value, 0);
  const scaleDown = Math.max(value - scaleEnvelope.low[index], 0);
  const pdfUp = pdfUncertainty.uncertainty_up[index];
  const pdfDown = pdfUncertainty.uncertainty_down[index];
  const up = Math.sqrt(scaleUp * scaleUp + pdfUp * pdfUp);
  const down = Math.sqrt(scaleDown * scaleDown + pdfDown * pdfDown);
  return [value - down, value + up];
}

function PlotsTab({ selectedRun, runsData }) {
  const [scales, setScales] = useState({}); // Track linear/log scale per histogram
  const [enabledRuns, setEnabledRuns] = useState(null); // null means use default
  const [histogramMode, setHistogramMode] = useState(null); // null means use default
  const [showSystematics, setShowSystematics] = useState(true);
  const allRuns = useMemo(() => Object.keys(runsData), [runsData]);

  // Collect all runs that have histograms in either mode
  const runsWithHistograms = useMemo(() => {
    const runs = new Set();
    Object.entries(runsData).forEach(([runName, runInfo]) => {
      if (
        runHasMode(runInfo, "weighted") ||
        runHasMode(runInfo, "unweighted")
      ) {
        runs.add(runName);
      }
    });
    return Array.from(runs);
  }, [runsData]);

  // Which of the two histogram modes are on offer from at least one run
  const availableModes = useMemo(() => {
    const modes = new Set();
    runsWithHistograms.forEach((runName) => {
      const runInfo = runsData[runName];
      if (runHasMode(runInfo, "weighted")) modes.add("weighted");
      if (runHasMode(runInfo, "unweighted")) modes.add("unweighted");
    });
    return modes;
  }, [runsWithHistograms, runsData]);

  // Default to the unweighted output when available, since it also carries
  // systematic uncertainties; fall back to whatever mode actually exists.
  const mode =
    histogramMode && availableModes.has(histogramMode)
      ? histogramMode
      : availableModes.has("unweighted")
        ? "unweighted"
        : "weighted";

  // Determine which runs to show
  const runsToShow = useMemo(() => {
    if (enabledRuns !== null) {
      return enabledRuns; // User has made a selection
    }
    // Default behavior: show selected run if available and has histograms, otherwise all runs with histograms
    if (
      selectedRun &&
      runsData[selectedRun] &&
      runsWithHistograms.includes(selectedRun)
    ) {
      return [selectedRun];
    }
    return runsWithHistograms;
  }, [enabledRuns, selectedRun, runsData, runsWithHistograms]);

  // Create a fixed color mapping for all runs
  const runColorMap = useMemo(() => {
    const colorMap = {};
    allRuns.forEach((runName, index) => {
      colorMap[runName] = RUN_COLORS[index % RUN_COLORS.length];
    });
    return colorMap;
  }, [allRuns]);

  // Collect all histograms from enabled runs, for the selected mode. A run
  // that doesn't have data for that mode simply contributes nothing.
  const allHistogramsByName = useMemo(() => {
    const histogramsByName = {};
    const field = MODE_FIELD[mode];

    runsToShow.forEach((runName) => {
      const runInfo = runsData[runName];
      const histograms = runInfo && runInfo[field];
      if (!histograms) return;

      histograms.forEach((histogram) => {
        const { name } = histogram;
        if (!histogramsByName[name]) {
          histogramsByName[name] = [];
        }
        histogramsByName[name].push({
          runName,
          histogram,
        });
      });
    });

    return histogramsByName;
  }, [runsToShow, runsData, mode]);

  // Transform histograms into separate chart data arrays per run
  const chartDataByName = useMemo(() => {
    const data = {};

    Object.entries(allHistogramsByName).forEach(([name, histogramList]) => {
      // Create separate run data for each run
      const runDataArrays = {};

      histogramList.forEach(({ runName, histogram }) => {
        const { min, max, bin_values, bin_errors } = histogram;
        const pdfUncertainty =
          histogram.pdf_uncertainty && histogram.pdf_uncertainty[0];
        const scaleEnvelope = histogram.scale_envelope;
        const hasSystematics = Boolean(pdfUncertainty && scaleEnvelope);

        // Exclude first and last entries (under/overflow)
        const values = bin_values.slice(1, -1);
        const errors = bin_errors.slice(1, -1);
        const scaleEnvelopeInner = scaleEnvelope && {
          high: scaleEnvelope.high.slice(1, -1),
          low: scaleEnvelope.low.slice(1, -1),
        };
        const pdfUncertaintyInner = pdfUncertainty && {
          uncertainty_up: pdfUncertainty.uncertainty_up.slice(1, -1),
          uncertainty_down: pdfUncertainty.uncertainty_down.slice(1, -1),
        };

        // Generate equally spaced x-axis values for this run
        const numBins = values.length;
        const step = (max - min) / numBins;

        const makePoint = (index, x) => {
          const val = values[index];
          const point = {
            x,
            y: val / step,
            yError: [
              (val - errors[index]) / step,
              (val + errors[index]) / step,
            ],
          };
          if (hasSystematics) {
            const band = systematicBand(
              val,
              index,
              scaleEnvelopeInner,
              pdfUncertaintyInner,
            );
            point.ySyst = [band[0] / step, band[1] / step];
          }
          return point;
        };

        // Create data points for this run with its own x values
        const runData = values.map((_, index) =>
          makePoint(index, min + index * step),
        );

        // Add final point for step completeness
        runData.push(makePoint(numBins - 1, max));

        runDataArrays[runName] = { data: runData, hasSystematics };
      });

      data[name] = {
        runDataArrays,
        histogramList,
      };
    });

    return data;
  }, [allHistogramsByName]);

  const anySystematics = useMemo(
    () =>
      Object.values(chartDataByName).some(({ runDataArrays }) =>
        Object.values(runDataArrays).some((run) => run.hasSystematics),
      ),
    [chartDataByName],
  );

  const toggleScale = (name) => {
    setScales((prev) => ({
      ...prev,
      [name]: prev[name] === "log" ? "linear" : "log",
    }));
  };

  const toggleRun = (runName) => {
    setEnabledRuns((prev) => {
      const current = prev || runsToShow;
      if (current.includes(runName)) {
        return current.filter((r) => r !== runName);
      } else {
        return [...current, runName];
      }
    });
  };

  const handleSelectAll = () => {
    setEnabledRuns(runsWithHistograms);
  };

  const handleDeselectAll = () => {
    setEnabledRuns([]);
  };

  if (runsWithHistograms.length === 0) {
    return (
      <Card>
        <CardContent>
          <Typography variant="h6">Histograms</Typography>
          <Typography variant="body2" color="text.secondary">
            No histograms available
          </Typography>
        </CardContent>
      </Card>
    );
  }

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
      {/* Mode and run selection controls */}
      <Card>
        <CardContent>
          {availableModes.size > 1 && (
            <Stack
              direction="row"
              spacing={2}
              alignItems="center"
              sx={{ mb: 2, flexWrap: "wrap" }}
            >
              <ToggleButtonGroup
                value={mode}
                exclusive
                onChange={(event, newMode) =>
                  newMode && setHistogramMode(newMode)
                }
                size="small"
              >
                <ToggleButton value="weighted">
                  Weighted (on-the-fly)
                </ToggleButton>
                <ToggleButton value="unweighted">
                  Unweighted output (+ systematics)
                </ToggleButton>
              </ToggleButtonGroup>
              {mode === "unweighted" && anySystematics && (
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={showSystematics}
                      onChange={(e) => setShowSystematics(e.target.checked)}
                    />
                  }
                  label="Show systematic uncertainty"
                />
              )}
            </Stack>
          )}
          <Stack
            direction="row"
            justifyContent="space-between"
            alignItems="center"
            sx={{ mb: 2 }}
          >
            <Typography variant="subtitle1">Select runs to display:</Typography>
            <Stack direction="row" spacing={1}>
              <Button size="small" variant="outlined" onClick={handleSelectAll}>
                Select all
              </Button>
              <Button
                size="small"
                variant="outlined"
                onClick={handleDeselectAll}
              >
                Deselect all
              </Button>
            </Stack>
          </Stack>
          <Stack direction="row" spacing={2} sx={{ flexWrap: "wrap" }}>
            {runsWithHistograms.map((runName) => (
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
        </CardContent>
      </Card>

      {/* Histogram charts */}
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: {
            xs: "1fr",
            md: "repeat(2, 1fr)",
            xl: "repeat(3, 1fr)",
          },
          gap: 3,
        }}
      >
        {Object.entries(chartDataByName).map(
          ([histogramName, { runDataArrays, histogramList }]) => {
            const scale = scales[histogramName] || "linear";

            // Compute x-axis domain from all selected runs
            let xMin = Infinity;
            let xMax = -Infinity;
            histogramList.forEach(({ runName }) => {
              const run = runDataArrays[runName];
              if (run && run.data.length > 0) {
                const dataMin = Math.min(...run.data.map((point) => point.x));
                const dataMax = Math.max(...run.data.map((point) => point.x));
                xMin = Math.min(xMin, dataMin);
                xMax = Math.max(xMax, dataMax);
              }
            });
            const xDomain =
              xMin !== Infinity && xMax !== -Infinity ? [xMin, xMax] : [0, 1];

            return (
              <Card key={histogramName}>
                <CardContent>
                  <Stack
                    direction="row"
                    justifyContent="space-between"
                    alignItems="center"
                    sx={{ mb: 2 }}
                  >
                    <Typography variant="h6">{histogramName}</Typography>
                    <Button
                      variant="outlined"
                      size="small"
                      onClick={() => toggleScale(histogramName)}
                    >
                      {scale === "linear"
                        ? "Switch to Log"
                        : "Switch to Linear"}
                    </Button>
                  </Stack>
                  <ResponsiveContainer width="100%" height={400}>
                    <ComposedChart>
                      <CartesianGrid opacity={0.5} />
                      <XAxis
                        dataKey="x"
                        domain={xDomain}
                        label={{
                          value: histogramName,
                          position: "insideBottomRight",
                          offset: -5,
                        }}
                        type="number"
                      />
                      <YAxis
                        scale={scale}
                        domain={[scale === "log" ? "auto" : 0, "auto"]}
                        tickFormatter={formatAxisTick}
                        width={70}
                        label={{
                          value: "Cross section (pb)",
                          angle: -90,
                          position: "insideLeft",
                        }}
                      />
                      <Tooltip
                        content={<ChartTooltip xLabel={histogramName} />}
                      />
                      <Legend />

                      {/* Render systematic bands, error areas and lines for each run */}
                      {histogramList.flatMap(({ runName }) => {
                        const color = runColorMap[runName];
                        const run = runDataArrays[runName];
                        if (!run) return [];
                        const drawSystematics =
                          run.hasSystematics &&
                          mode === "unweighted" &&
                          showSystematics;

                        // Replace non-positive values with null for log scale
                        const displayData =
                          scale === "log"
                            ? run.data.map((point) => ({
                                ...point,
                                y: point.y > 0 ? point.y : null,
                                yError: Array.isArray(point.yError)
                                  ? [
                                      point.yError[0] > 0
                                        ? point.yError[0]
                                        : null,
                                      point.yError[1] > 0
                                        ? point.yError[1]
                                        : null,
                                    ]
                                  : point.yError,
                                ySyst: Array.isArray(point.ySyst)
                                  ? [
                                      point.ySyst[0] > 0
                                        ? point.ySyst[0]
                                        : null,
                                      point.ySyst[1] > 0
                                        ? point.ySyst[1]
                                        : null,
                                    ]
                                  : point.ySyst,
                              }))
                            : run.data;

                        return [
                          drawSystematics && (
                            <Area
                              key={`syst_${runName}`}
                              type="stepAfter"
                              dataKey="ySyst"
                              data={displayData}
                              stroke="none"
                              fill={color}
                              fillOpacity={0.1}
                              isAnimationActive={false}
                              legendType="none"
                            />
                          ),
                          <Area
                            key={`area_${runName}`}
                            type="stepAfter"
                            dataKey="yError"
                            data={displayData}
                            stroke="none"
                            fill={color}
                            fillOpacity={0.25}
                            isAnimationActive={false}
                            legendType="none"
                          />,
                          <Line
                            key={`line_${runName}`}
                            type="stepAfter"
                            dataKey="y"
                            data={displayData}
                            stroke={color}
                            name={runName}
                            isAnimationActive={false}
                            dot={false}
                          />,
                        ].filter(Boolean);
                      })}
                    </ComposedChart>
                  </ResponsiveContainer>
                  {mode === "unweighted" &&
                    showSystematics &&
                    histogramList.some(
                      ({ runName }) => runDataArrays[runName]?.hasSystematics,
                    ) && (
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{ display: "block", mt: 1 }}
                      >
                        Darker band: statistical uncertainty. Lighter band:
                        scale &amp; PDF systematic uncertainty (added in
                        quadrature).
                      </Typography>
                    )}
                </CardContent>
              </Card>
            );
          },
        )}
      </Box>
    </Box>
  );
}

export default PlotsTab;
