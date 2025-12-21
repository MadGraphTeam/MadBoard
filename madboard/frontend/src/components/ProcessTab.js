import React, { useState, useEffect } from "react";
import { Box, CircularProgress, Alert } from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";

function ProcessTab({ selectedProcess }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!selectedProcess) return;

    const fetchRuns = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/processes/${selectedProcess}/runs`);
        if (!response.ok) throw new Error("Failed to fetch runs");
        const data = await response.json();

        // Transform runs to rows format
        const processedRows = data.runs.map((run, index) => ({
          id: index,
          run,
          crossSection: "-",
          events: "-",
          status: "Pending",
        }));
        setRows(processedRows);
        setError(null);
      } catch (err) {
        setError(err.message);
        setRows([]);
      } finally {
        setLoading(false);
      }
    };

    fetchRuns();
  }, [selectedProcess]);

  const columns = [
    { field: "run", headerName: "Run", flex: 1, minWidth: 100, sortable: true },
    {
      field: "crossSection",
      headerName: "Cross section (pb)",
      flex: 1,
      minWidth: 120,
      sortable: true,
    },
    {
      field: "events",
      headerName: "Events",
      flex: 1,
      minWidth: 100,
      sortable: true,
    },
    {
      field: "status",
      headerName: "Status",
      flex: 1,
      minWidth: 100,
      sortable: true,
    },
  ];

  if (loading) return <CircularProgress />;
  if (error) return <Alert severity="error">{error}</Alert>;

  return (
    <Box sx={{ height: 400, width: "100%" }}>
      <DataGrid
        rows={rows}
        columns={columns}
        pageSize={5}
        rowsPerPageOptions={[5, 10, 20]}
        pagination
      />
    </Box>
  );
}

export default ProcessTab;
