import React, { useEffect, useState } from "react";
import { Box, Card, CardContent, Chip, Stack, Typography } from "@mui/material";

/**
 * Names the process being shown and what it was generated from, which is
 * otherwise only visible in Cards/proc_card_mg5.dat.
 */
function ProcessHeader({ selectedProcess, runCount }) {
  const [definition, setDefinition] = useState(null);

  useEffect(() => {
    if (!selectedProcess) return;
    let cancelled = false;
    fetch(`/api/processes/${selectedProcess}/definition`)
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        if (!cancelled) setDefinition(data);
      })
      .catch(() => {
        if (!cancelled) setDefinition(null);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedProcess]);

  const processes = definition?.processes || [];

  return (
    <Card>
      <CardContent>
        <Stack direction="row" alignItems="center" spacing={1.5}>
          <Typography variant="h5">{selectedProcess}</Typography>
          {definition?.model && (
            <Chip label={definition.model} size="small" variant="outlined" />
          )}
          <Typography variant="body2" color="text.secondary">
            {runCount} run{runCount === 1 ? "" : "s"}
          </Typography>
        </Stack>
        {processes.length > 0 && (
          <Box sx={{ mt: 1 }}>
            {processes.map((process) => (
              <Typography
                key={process}
                variant="body2"
                sx={{ fontFamily: "monospace" }}
              >
                {process}
              </Typography>
            ))}
          </Box>
        )}
      </CardContent>
    </Card>
  );
}

export default ProcessHeader;
