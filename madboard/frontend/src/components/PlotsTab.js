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
} from "@mui/material";
import {
  ComposedChart,
  Line,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
} from "recharts";

// Unicode superscript characters for exponents
const SUPERSCRIPT_MAP = {
  0: "⁰",
  1: "¹",
  2: "²",
  3: "³",
  4: "⁴",
  5: "⁵",
  6: "⁶",
  7: "⁷",
  8: "⁸",
  9: "⁹",
  "-": "⁻",
};

// Format number as mantissa · 10^exponent using unicode superscript
function formatScientificTick(value) {
  if (value === 0) return "0";

  const exponent = Math.floor(Math.log10(Math.abs(value)));
  const mantissa = value / Math.pow(10, exponent);

  // Round mantissa to 2 decimal places
  const roundedMantissa = Math.round(mantissa * 100) / 100;

  // Format exponent with superscript
  const exponentStr = exponent.toString();
  const exponentSuperscript = exponentStr
    .split("")
    .map((char) => SUPERSCRIPT_MAP[char])
    .join("");

  // If mantissa is essentially 1, just show the exponent
  if (Math.abs(roundedMantissa - 1) < 0.001) {
    return "10" + exponentSuperscript;
  }

  // Otherwise show mantissa · 10^exponent
  return `${roundedMantissa}⋅10${exponentSuperscript}`;
}

// Color palette for different runs
const RUN_COLORS = [
  "#8884d8",
  "#82ca9d",
  "#ffc658",
  "#ff7c7c",
  "#8dd1e1",
  "#d084d0",
  "#a4de6c",
  "#ffc658",
];

function PlotsTab({ selectedRun, runsData }) {
  const [scales, setScales] = useState({}); // Track linear/log scale per histogram
  const [enabledRuns, setEnabledRuns] = useState(null); // null means use default
  const allRuns = useMemo(() => Object.keys(runsData), [runsData]);

  // Collect all histograms from all runs to determine which runs have histograms
  const runsWithHistograms = useMemo(() => {
    const runs = new Set();
    Object.entries(runsData).forEach(([runName, runInfo]) => {
      if (runInfo && runInfo.histograms && runInfo.histograms.length > 0) {
        runs.add(runName);
      }
    });
    return Array.from(runs);
  }, [runsData]);

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

  // Collect all histograms from enabled runs
  const allHistogramsByName = useMemo(() => {
    const histogramsByName = {};

    runsToShow.forEach((runName) => {
      const runInfo = runsData[runName];
      if (!runInfo || !runInfo.histograms) return;

      runInfo.histograms.forEach((histogram) => {
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
  }, [runsToShow, runsData]);

  // Transform histograms into separate chart data arrays per run
  const chartDataByName = useMemo(() => {
    const data = {};

    Object.entries(allHistogramsByName).forEach(([name, histogramList]) => {
      // Create separate run data for each run
      const runDataArrays = {};

      histogramList.forEach(({ runName, histogram }) => {
        const { min, max, bin_values, bin_errors } = histogram;

        // Exclude first and last entries
        const values = bin_values.slice(1, -1);
        const errors = bin_errors.slice(1, -1);

        // Generate equally spaced x-axis values for this run
        const numBins = values.length;
        const step = (max - min) / numBins;

        // Create data points for this run with its own x values
        const runData = values.map((val, index) => ({
          x: min + index * step,
          y: val,
          yError: [val - errors[index], val + errors[index]],
        }));

        // Add final point for step completeness
        runData.push({
          x: max,
          y: values[numBins - 1],
          yError: [
            values[numBins - 1] - errors[numBins - 1],
            values[numBins - 1] + errors[numBins - 1],
          ],
        });

        runDataArrays[runName] = runData;
      });

      data[name] = {
        runDataArrays,
        histogramList,
      };
    });

    return data;
  }, [allHistogramsByName]);

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
          <Typography variant="h6">Plots</Typography>
          <Typography variant="body2" color="text.secondary">
            No histograms available
          </Typography>
        </CardContent>
      </Card>
    );
  }

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
      {/* Run selection checkboxes */}
      <Card>
        <CardContent>
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
      {Object.entries(chartDataByName).map(
        ([histogramName, { runDataArrays, histogramList }]) => {
          const scale = scales[histogramName] || "linear";

          // Compute x-axis domain from all selected runs
          let xMin = Infinity;
          let xMax = -Infinity;
          histogramList.forEach(({ runName }) => {
            const data = runDataArrays[runName];
            if (data && data.length > 0) {
              const dataMin = Math.min(...data.map((point) => point.x));
              const dataMax = Math.max(...data.map((point) => point.x));
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
                        value: histogramName,
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
                        value: "Cross section (pb)",
                        angle: -90,
                        position: "insideLeft",
                      }}
                    />
                    <Legend />

                    {/* Render error areas and lines for each run */}
                    {histogramList.map(({ runName }) => {
                      const color = runColorMap[runName];
                      let displayData = runDataArrays[runName];

                      // Replace non-positive values with null for log scale
                      if (scale === "log") {
                        displayData = displayData.map((point) => ({
                          ...point,
                          y: point.y > 0 ? point.y : null,
                          yError: Array.isArray(point.yError)
                            ? [
                                point.yError[0] > 0 ? point.yError[0] : null,
                                point.yError[1] > 0 ? point.yError[1] : null,
                              ]
                            : point.yError,
                        }));
                      }

                      return [
                        <Area
                          key={`area_${runName}`}
                          type="stepAfter"
                          dataKey="yError"
                          data={displayData}
                          stroke="none"
                          fill={color}
                          fillOpacity={0.2}
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
                      ];
                    })}
                  </ComposedChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          );
        },
      )}
    </Box>
  );
}

export default PlotsTab;
