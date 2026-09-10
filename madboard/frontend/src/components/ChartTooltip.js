import React from "react";
import { Box, Paper, Typography } from "@mui/material";
import { formatNumber } from "../utils/formatting";

/**
 * Tooltip content shared by all charts. Series are drawn from separate data
 * arrays, so every entry carries its own x value: they are shown per row
 * unless all series agree on one, in which case it becomes the header.
 */
function ChartTooltip({ active, payload, xLabel }) {
  if (!active || !payload || payload.length === 0) return null;

  // The error band is drawn as its own area; it is reported together with the
  // value it belongs to instead of as a separate entry
  const entries = payload.filter((entry) => entry.dataKey !== "yError");
  if (entries.length === 0) return null;

  const xValues = entries.map((entry) => entry.payload?.x);
  const sharedX = xValues.every((x) => x === xValues[0]) ? xValues[0] : null;

  return (
    <Paper elevation={4} sx={{ px: 1.5, py: 1 }}>
      {sharedX !== undefined && sharedX !== null && (
        <Typography variant="caption" color="text.secondary">
          {xLabel ? `${xLabel} = ` : ""}
          {formatNumber(sharedX)}
        </Typography>
      )}
      {entries.map((entry, index) => {
        const band = entry.payload?.yError;
        const error =
          Array.isArray(band) && band[0] != null && band[1] != null
            ? (band[1] - band[0]) / 2
            : null;
        return (
          <Box
            key={`${entry.name}-${index}`}
            sx={{ display: "flex", alignItems: "center", gap: 1 }}
          >
            <Box
              sx={{
                width: 10,
                height: 10,
                borderRadius: "50%",
                backgroundColor: entry.color,
                flexShrink: 0,
              }}
            />
            <Typography variant="body2">
              {entry.name}
              {sharedX === null && xValues[index] != null
                ? ` (${formatNumber(xValues[index])})`
                : ""}
              : {formatNumber(entry.value)}
              {error !== null ? ` ± ${formatNumber(error)}` : ""}
            </Typography>
          </Box>
        );
      })}
    </Paper>
  );
}

export default ChartTooltip;
