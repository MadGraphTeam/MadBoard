import React, { useMemo } from "react";
import { Box, CircularProgress, Alert, IconButton } from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";
import VisibilityIcon from "@mui/icons-material/Visibility";
import DeleteIcon from "@mui/icons-material/Delete";
import { formatWithError, formatSIPrefix } from "../utils/formatting";

function ProcessTab({ selectedProcess, onSelectRun, runsData }) {
  const rows = useMemo(() => {
    return Object.entries(runsData).map((entry, index) => {
      const [runName, runInfo] = entry;
      const process = runInfo.process || {};
      return {
        id: index,
        run: runName,
        crossSection: formatWithError(process.mean || 0, process.error || 0),
        unweightedEvents: formatSIPrefix(process.count_unweighted || 0),
        status: runInfo.status || "unknown",
      };
    });
  }, [runsData]);

  const handleViewRun = (runName) => {
    onSelectRun(runName);
  };

  const handleDeleteRun = async (runName) => {
    if (window.confirm(`Are you sure you want to delete run "${runName}"?`)) {
      try {
        const response = await fetch(
          `/api/processes/${selectedProcess}/runs/${runName}`,
          { method: "DELETE" },
        );
        if (!response.ok) throw new Error("Failed to delete run");
        // Trigger a refresh by notifying the parent
        window.location.reload();
      } catch (err) {
        console.error("Error deleting run:", err);
        alert("Failed to delete run");
      }
    }
  };

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
      field: "unweightedEvents",
      headerName: "Unweighted events",
      flex: 1,
      minWidth: 120,
      sortable: true,
    },
    {
      field: "status",
      headerName: "Status",
      flex: 1,
      minWidth: 100,
      sortable: true,
    },
    {
      field: "actions",
      headerName: "Actions",
      flex: 0.5,
      minWidth: 100,
      sortable: false,
      filterable: false,
      renderCell: (params) => (
        <Box
          sx={{
            display: "flex",
            gap: 0.5,
            alignItems: "center",
            height: "100%",
          }}
        >
          <IconButton
            size="small"
            onClick={() => handleViewRun(params.row.run)}
            title="View run"
          >
            <VisibilityIcon fontSize="small" />
          </IconButton>
          <IconButton
            size="small"
            onClick={() => handleDeleteRun(params.row.run)}
            title="Delete run"
            color="error"
          >
            <DeleteIcon fontSize="small" />
          </IconButton>
        </Box>
      ),
    },
  ];

  if (Object.keys(runsData).length === 0) {
    return <CircularProgress />;
  }

  return (
    <Box sx={{ height: 400, width: "100%" }}>
      <DataGrid rows={rows} columns={columns} />
    </Box>
  );
}

export default ProcessTab;
