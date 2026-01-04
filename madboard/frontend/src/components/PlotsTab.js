import React, { useMemo, useState } from "react";
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Stack,
} from "@mui/material";
import {
  ComposedChart,
  Line,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

function PlotsTab({ selectedRun, runsData }) {
  const [scales, setScales] = useState({}); // Track linear/log scale per histogram

  const histograms = useMemo(() => {
    if (!runsData[selectedRun]) {
      return [];
    }
    return runsData[selectedRun].histograms || [];
  }, [selectedRun, runsData]);

  const chartDataByName = useMemo(() => {
    const data = {};
    histograms.forEach((histogram) => {
      const { name, min, max, bin_values, bin_errors } = histogram;

      // Exclude first and last entries
      const values = bin_values.slice(1, -1);
      const errors = bin_errors.slice(1, -1);

      // Generate equally spaced x-axis values
      const numBins = values.length;
      const step = (max - min) / numBins;

      const chartData = [
        ...values.map((val, index) => ({
          x: min + index * step,
          y: val,
          yError: [val - errors[index], val + errors[index]],
        })),
        {
          x: min + numBins * step,
          y: values[numBins - 1],
          yError: [
            values[numBins - 1] - errors[numBins - 1],
            values[numBins - 1] + errors[numBins - 1],
          ],
        },
      ];

      data[name] = { chartData, min, max };
    });
    return data;
  }, [histograms]);

  const toggleScale = (name) => {
    setScales((prev) => ({
      ...prev,
      [name]: prev[name] === "log" ? "linear" : "log",
    }));
  };

  if (!selectedRun || histograms.length === 0) {
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
      {histograms.map((histogram) => {
        const { name } = histogram;
        let { chartData } = chartDataByName[name];
        const scale = scales[name] || "linear";

        // Replace non-positive values with null for log scale
        if (scale === "log") {
          chartData = chartData.map((point) => ({
            ...point,
            y: point.y > 0 ? point.y : null,
            yError:
              Array.isArray(point.yError) &&
              point.yError[0] > 0 &&
              point.yError[1] > 0
                ? point.yError
                : [null, null],
          }));
        }

        return (
          <Card key={name}>
            <CardContent>
              <Stack
                direction="row"
                justifyContent="space-between"
                alignItems="center"
                sx={{ mb: 2 }}
              >
                <Typography variant="h6">{name}</Typography>
                <Button
                  variant="outlined"
                  size="small"
                  onClick={() => toggleScale(name)}
                >
                  {scale === "linear" ? "Switch to Log" : "Switch to Linear"}
                </Button>
              </Stack>
              <ResponsiveContainer width="100%" height={400}>
                <ComposedChart data={chartData}>
                  <CartesianGrid opacity={0.5} />
                  <XAxis
                    dataKey="x"
                    domain={[chartData[0].x, chartData[chartData.length - 1].x]}
                    label={{
                      value: name,
                      position: "insideBottomRight",
                      offset: -5,
                    }}
                    type="number"
                  />
                  <YAxis
                    scale={scale}
                    domain={[scale == "log" ? "auto" : 0, "auto"]}
                    label={{
                      value: "Count",
                      angle: -90,
                      position: "insideLeft",
                    }}
                  />
                  {/*<Tooltip
                    formatter={(value) => value.toFixed(4)}
                    labelFormatter={(value) => `x: ${value.toFixed(2)}`}
                  />*/}
                  <Area
                    type="stepAfter"
                    dataKey="yError"
                    stroke="none"
                    fill="#8884d8"
                    fillOpacity={0.5}
                    isAnimationActive={false}
                  />
                  <Line
                    type="stepAfter"
                    dataKey="y"
                    stroke="#8884d8"
                    name={name}
                    isAnimationActive={false}
                    dot={false}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        );
      })}
    </Box>
  );
}

export default PlotsTab;
