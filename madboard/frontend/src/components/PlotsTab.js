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
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

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

  // Determine which runs to show
  const runsToShow = useMemo(() => {
    if (enabledRuns !== null) {
      return enabledRuns; // User has made a selection
    }
    // Default behavior: show selected run if available, otherwise all runs
    if (selectedRun && runsData[selectedRun]) {
      return [selectedRun];
    }
    return Object.keys(runsData);
  }, [enabledRuns, selectedRun, runsData]);

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

  // Transform histograms into chart data
  const chartDataByName = useMemo(() => {
    const data = {};

    Object.entries(allHistogramsByName).forEach(([name, histogramList]) => {
      const chartData = {};

      histogramList.forEach(({ runName, runIndex, histogram }) => {
        const { min, max, bin_values, bin_errors } = histogram;

        // Exclude first and last entries
        const values = bin_values.slice(1, -1);
        const errors = bin_errors.slice(1, -1);

        // Generate equally spaced x-axis values
        const numBins = values.length;
        const step = (max - min) / numBins;

        // Create data points for this run
        const runData = [
          ...values.map((val, index) => ({
            x: min + index * step,
            [`y_${runName}`]: val,
            [`yError_${runName}`]: [val - errors[index], val + errors[index]],
          })),
          {
            x: min + numBins * step,
            [`y_${runName}`]: values[numBins - 1],
            [`yError_${runName}`]: [
              values[numBins - 1] - errors[numBins - 1],
              values[numBins - 1] + errors[numBins - 1],
            ],
          },
        ];

        // Merge into chart data
        runData.forEach((point, index) => {
          if (!chartData[index]) {
            chartData[index] = { x: point.x };
          }
          chartData[index] = { ...chartData[index], ...point };
        });
      });

      data[name] = {
        chartData: Object.values(chartData),
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

  if (allRuns.length === 0) {
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
          <Typography variant="subtitle1" sx={{ mb: 2 }}>
            Select runs to display:
          </Typography>
          <Stack direction="row" spacing={2} sx={{ flexWrap: "wrap" }}>
            {allRuns.map((runName) => (
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
        ([histogramName, { chartData, histogramList }]) => {
          const scale = scales[histogramName] || "linear";

          // Filter data for log scale
          let displayData = chartData;
          if (scale === "log") {
            displayData = chartData.map((point) => {
              const newPoint = { x: point.x };
              Object.entries(point).forEach(([key, value]) => {
                if (key === "x") return;
                if (Array.isArray(value)) {
                  newPoint[key] = [
                    value[0] > 0 ? value[0] : null,
                    value[1] > 0 ? value[1] : null,
                  ];
                } else {
                  newPoint[key] = value > 0 ? value : null;
                }
              });
              return newPoint;
            });
          }
          console.log(displayData);

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
                  <ComposedChart data={displayData}>
                    <CartesianGrid opacity={0.5} />
                    <XAxis
                      dataKey="x"
                      domain={[
                        displayData[0]?.x || 0,
                        displayData[displayData.length - 1]?.x || 1,
                      ]}
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
                      label={{
                        value: "Count",
                        angle: -90,
                        position: "insideLeft",
                      }}
                    />
                    {/*<Tooltip
                    formatter={(value) => (value !== null ? value.toFixed(4) : "N/A")}
                    labelFormatter={(value) => `x: ${value.toFixed(2)}`}
                  />*/}
                    <Legend />

                    {/* Render error areas and lines for each run */}
                    {histogramList.map(({ runName }) => {
                      const color = runColorMap[runName];
                      return [
                        <Area
                          type="stepAfter"
                          dataKey={`yError_${runName}`}
                          stroke="none"
                          fill={color}
                          fillOpacity={0.2}
                          isAnimationActive={false}
                          legendType="none"
                        />,
                        <Line
                          type="stepAfter"
                          dataKey={`y_${runName}`}
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
