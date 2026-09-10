import React, { useMemo, useState } from "react";
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Stack,
  Chip,
  Tooltip,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
} from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";
import { HEADER_HEIGHT, WRAPPED_HEADER_SX } from "../utils/dataGrid";
import {
  ComposedChart,
  Line,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
} from "recharts";
import {
  formatNumber,
  formatScientificTick,
  RUN_COLORS,
} from "../utils/formatting";
import ChartTooltip from "./ChartTooltip";

// The scan summary lists the cross section and its error as two independent
// result columns; the error is drawn as a band around the cross section
// instead of getting a plot of its own.
const ERROR_KEYS = { "cross(pb)": "error(pb)" };

// Label of a scanned parameter: the model variable name if MadGraph could
// resolve it, the raw block#id otherwise
function parameterLabel(parameter) {
  return parameter.name || parameter.id;
}

function ScansTab({ selectedRun, scans }) {
  const [selectedScanName, setSelectedScanName] = useState(null);
  const [xParameterId, setXParameterId] = useState(null);
  const [scales, setScales] = useState({});

  // Default to the scan the selected run belongs to
  const scan = useMemo(() => {
    if (scans.length === 0) return null;
    const byName = scans.find((s) => s.name === selectedScanName);
    if (byName) return byName;
    const bySelectedRun = scans.find((s) => s.runs.includes(selectedRun));
    return bySelectedRun || scans[0];
  }, [scans, selectedScanName, selectedRun]);

  const parameters = useMemo(() => (scan ? scan.scan_parameters : []), [scan]);
  const resultKeys = useMemo(() => (scan ? scan.result_keys : []), [scan]);
  const points = useMemo(() => (scan ? scan.points : []), [scan]);

  const xParameter = useMemo(() => {
    if (parameters.length === 0) return null;
    return parameters.find((p) => p.id === xParameterId) || parameters[0];
  }, [parameters, xParameterId]);

  const hasFailedPoints = useMemo(
    () => points.some((point) => point.exception),
    [points],
  );

  // ── Table ───────────────────────────────────────────────────────────────────

  const rows = useMemo(
    () =>
      points.map((point, index) => {
        const row = { id: index, run_name: point.run_name };
        parameters.forEach((parameter) => {
          row[`param_${parameter.id}`] = formatNumber(
            (point.parameters || {})[parameter.id],
          );
        });
        resultKeys.forEach((key) => {
          row[`result_${key}`] = formatNumber((point.results || {})[key]);
        });
        row.exception = point.exception || "";
        return row;
      }),
    [points, parameters, resultKeys],
  );

  const columns = useMemo(() => {
    const cols = [
      {
        field: "run_name",
        headerName: "Run",
        flex: 1,
        minWidth: 120,
        sortable: true,
      },
      ...parameters.map((parameter) => ({
        field: `param_${parameter.id}`,
        headerName: parameterLabel(parameter),
        description: parameter.id,
        flex: 1,
        minWidth: 120,
        sortable: true,
      })),
      ...resultKeys.map((key) => ({
        field: `result_${key}`,
        headerName: key,
        flex: 1,
        minWidth: 120,
        sortable: true,
      })),
    ];
    if (hasFailedPoints) {
      cols.push({
        field: "exception",
        headerName: "Error",
        flex: 1,
        minWidth: 200,
        sortable: false,
      });
    }
    return cols;
  }, [parameters, resultKeys, hasFailedPoints]);

  // ── Plots ───────────────────────────────────────────────────────────────────

  // One chart per result key, against the selected scan parameter. A scan over
  // several parameters is cut into one line per value of the other parameters,
  // so that each line varies in the plotted parameter only. Points whose
  // parameter or result is missing (a scan point that crashed, a non-numeric
  // parameter) cannot be placed on the axes and are left out.
  const seriesByKey = useMemo(() => {
    if (!xParameter) return {};
    const otherParameters = parameters.filter((p) => p.id !== xParameter.id);
    const data = {};
    resultKeys.forEach((key) => {
      const errorKey = ERROR_KEYS[key];
      const pointsByLabel = new Map();
      points.forEach((point) => {
        const x = (point.parameters || {})[xParameter.id];
        const y = (point.results || {})[key];
        if (typeof x !== "number" || typeof y !== "number") return;
        const label = otherParameters
          .map(
            (p) =>
              `${parameterLabel(p)} = ${formatNumber(
                (point.parameters || {})[p.id],
              )}`,
          )
          .join(", ");
        if (!pointsByLabel.has(label)) pointsByLabel.set(label, []);
        const error = errorKey ? (point.results || {})[errorKey] : null;
        pointsByLabel.get(label).push({
          x,
          y,
          yError:
            typeof error === "number" ? [y - error, y + error] : undefined,
        });
      });
      if (pointsByLabel.size > 0) {
        data[key] = Array.from(pointsByLabel.entries()).map(
          ([label, linePoints], index) => ({
            label,
            color: RUN_COLORS[index % RUN_COLORS.length],
            points: linePoints.sort((a, b) => a.x - b.x),
          }),
        );
      }
    });
    return data;
  }, [points, parameters, resultKeys, xParameter]);

  // Result keys that are only shown as the error band of another key
  const bandKeys = useMemo(
    () =>
      new Set(
        resultKeys
          .filter((key) => ERROR_KEYS[key] && seriesByKey[key])
          .map((key) => ERROR_KEYS[key]),
      ),
    [resultKeys, seriesByKey],
  );

  const plottedKeys = useMemo(
    () => Object.keys(seriesByKey).filter((key) => !bandKeys.has(key)),
    [seriesByKey, bandKeys],
  );

  const toggleScale = (key) => {
    setScales((prev) => ({
      ...prev,
      [key]: prev[key] === "log" ? "linear" : "log",
    }));
  };

  if (!scan) {
    return (
      <Card>
        <CardContent>
          <Typography variant="h6">Scans</Typography>
          <Typography variant="body2" color="text.secondary">
            No scan results available
          </Typography>
        </CardContent>
      </Card>
    );
  }

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
      {/* Scan and axis selection */}
      <Card>
        <CardContent>
          <Stack
            direction="row"
            spacing={2}
            alignItems="center"
            sx={{ flexWrap: "wrap", rowGap: 2 }}
          >
            {scans.length > 1 && (
              <FormControl size="small" sx={{ minWidth: 220 }}>
                <InputLabel id="scan-select-label">Scan</InputLabel>
                <Select
                  labelId="scan-select-label"
                  label="Scan"
                  value={scan.name}
                  onChange={(event) => setSelectedScanName(event.target.value)}
                >
                  {scans.map((s) => (
                    <MenuItem key={s.name} value={s.name}>
                      {s.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}
            {parameters.length > 1 && (
              <FormControl size="small" sx={{ minWidth: 220 }}>
                <InputLabel id="scan-x-select-label">
                  Plot against parameter
                </InputLabel>
                <Select
                  labelId="scan-x-select-label"
                  label="Plot against parameter"
                  value={xParameter.id}
                  onChange={(event) => setXParameterId(event.target.value)}
                >
                  {parameters.map((parameter) => (
                    <MenuItem key={parameter.id} value={parameter.id}>
                      {parameterLabel(parameter)}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}
            <Typography variant="body2" color="text.secondary">
              {points.length} scan point{points.length === 1 ? "" : "s"} over{" "}
              {parameters.map(parameterLabel).join(", ")}
            </Typography>
            {selectedRun && scan.runs.includes(selectedRun) && (
              <Tooltip title="The selected run is part of this scan">
                <Chip label={selectedRun} size="small" color="primary" />
              </Tooltip>
            )}
          </Stack>
        </CardContent>
      </Card>

      {/* Result table */}
      <Card>
        <CardContent>
          <Typography variant="h6" sx={{ mb: 2 }}>
            Scan {scan.name}
          </Typography>
          <Box sx={{ width: "100%" }}>
            <DataGrid
              rows={rows}
              columns={columns}
              autoHeight
              columnHeaderHeight={HEADER_HEIGHT}
              sx={WRAPPED_HEADER_SX}
            />
          </Box>
        </CardContent>
      </Card>

      {/* One chart per result */}
      {plottedKeys.length === 0 ? (
        <Card>
          <CardContent>
            <Typography variant="body2" color="text.secondary">
              No numeric results to plot for this scan
            </Typography>
          </CardContent>
        </Card>
      ) : (
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
          {plottedKeys.map((key) => {
            const scale = scales[key] || "linear";
            const series = seriesByKey[key];

            return (
              <Card key={key}>
                <CardContent>
                  <Stack
                    direction="row"
                    justifyContent="space-between"
                    alignItems="center"
                    sx={{ mb: 2 }}
                  >
                    <Typography variant="h6">{key}</Typography>
                    <Button
                      variant="outlined"
                      size="small"
                      onClick={() => toggleScale(key)}
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
                        domain={["dataMin", "dataMax"]}
                        label={{
                          value: parameterLabel(xParameter),
                          position: "insideBottomRight",
                          offset: -5,
                        }}
                        type="number"
                      />
                      <YAxis
                        scale={scale}
                        domain={["auto", "auto"]}
                        tickFormatter={
                          scale === "log" ? formatScientificTick : undefined
                        }
                      />
                      <RechartsTooltip
                        content={
                          <ChartTooltip xLabel={parameterLabel(xParameter)} />
                        }
                      />
                      {series.length > 1 && <Legend />}

                      {series.map(({ label, color, points: linePoints }) => {
                        let displayPoints = linePoints;
                        if (scale === "log") {
                          displayPoints = linePoints.map((point) => ({
                            ...point,
                            y: point.y > 0 ? point.y : null,
                            yError: point.yError
                              ? [
                                  point.yError[0] > 0 ? point.yError[0] : null,
                                  point.yError[1] > 0 ? point.yError[1] : null,
                                ]
                              : undefined,
                          }));
                        }

                        return [
                          displayPoints.some((point) => point.yError) && (
                            <Area
                              key={`area_${label}`}
                              type="linear"
                              dataKey="yError"
                              data={displayPoints}
                              stroke="none"
                              fill={color}
                              fillOpacity={0.2}
                              isAnimationActive={false}
                              legendType="none"
                            />
                          ),
                          <Line
                            key={`line_${label}`}
                            type="linear"
                            dataKey="y"
                            data={displayPoints}
                            stroke={color}
                            name={label || key}
                            isAnimationActive={false}
                            dot={{ r: 3 }}
                          />,
                        ];
                      })}
                    </ComposedChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            );
          })}
        </Box>
      )}
    </Box>
  );
}

export default ScansTab;
