import React, { useState, useEffect } from "react";
import { Box, Typography, CircularProgress } from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";

function RunTab({ selectedProcess, selectedRun }) {
  const [subprocessesRows, setSubprocessesRows] = useState([]);
  const [channelsRows, setChannelsRows] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!selectedProcess || !selectedRun) return;

    const fetchRunInfo = async () => {
      try {
        setLoading(true);
        const response = await fetch(
          `/api/processes/${selectedProcess}/runs/${selectedRun}/info`,
        );
        if (!response.ok) throw new Error("Failed to fetch run info");

        // Placeholder data - in a real app, parse the JSON response
        setSubprocessesRows([
          {
            id: 1,
            name: "Subprocess 1",
            crossSection: "1.5",
            samples: "1000",
            unweightedEvents: "500",
          },
        ]);
        setChannelsRows([
          {
            id: 1,
            name: "Channel 1",
            crossSection: "1.5",
            samples: "1000",
            unweightedEvents: "500",
            rsd: "0.05",
            unweightingEfficiency: "0.95",
          },
        ]);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchRunInfo();
  }, [selectedProcess, selectedRun]);

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
      field: "samples",
      headerName: "Samples",
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
  ];

  const channelsColumns = [
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
      field: "samples",
      headerName: "Samples",
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
    { field: "rsd", headerName: "RSD", flex: 1, minWidth: 80, sortable: true },
    {
      field: "unweightingEfficiency",
      headerName: "Unweighting efficiency",
      flex: 1,
      minWidth: 150,
      sortable: true,
    },
  ];

  if (loading) return <CircularProgress />;

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
      <Box>
        <Typography variant="h6" sx={{ mb: 2 }}>
          Subprocesses
        </Typography>
        <Box sx={{ height: 300, width: "100%" }}>
          <DataGrid
            rows={subprocessesRows}
            columns={subprocessesColumns}
            pageSize={5}
            rowsPerPageOptions={[5, 10]}
            pagination
          />
        </Box>
      </Box>
      <Box>
        <Typography variant="h6" sx={{ mb: 2 }}>
          Channels
        </Typography>
        <Box sx={{ height: 300, width: "100%" }}>
          <DataGrid
            rows={channelsRows}
            columns={channelsColumns}
            pageSize={5}
            rowsPerPageOptions={[5, 10]}
            pagination
          />
        </Box>
      </Box>
    </Box>
  );
}

export default RunTab;
