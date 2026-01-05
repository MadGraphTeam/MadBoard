import React, { useMemo, useState } from "react";
import {
  Box,
  CircularProgress,
  Alert,
  IconButton,
  Button,
  Menu,
  MenuItem,
  Stack,
} from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";
import VisibilityIcon from "@mui/icons-material/Visibility";
import DeleteIcon from "@mui/icons-material/Delete";
import DownloadIcon from "@mui/icons-material/Download";
import { formatWithError, formatSIPrefix } from "../utils/formatting";

function ProcessTab({
  selectedProcess,
  onSelectRun,
  runsData,
  onRefreshProcess,
}) {
  const [anchorEl, setAnchorEl] = useState(null);
  const [downloadMenuRun, setDownMenuRun] = useState(null);

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
        files: runInfo.files || [],
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
        // Refresh the current process instead of reloading the whole page
        if (onRefreshProcess) {
          onRefreshProcess();
        }
      } catch (err) {
        console.error("Error deleting run:", err);
        alert("Failed to delete run");
      }
    }
  };

  const handleDownloadClick = (event, runName, files) => {
    setAnchorEl(event.currentTarget);
    setDownMenuRun({ runName, files });
  };

  const handleDownloadFile = (runName, filename) => {
    const link = document.createElement("a");
    link.href = `/api/processes/${selectedProcess}/runs/${runName}/download/${filename}`;
    link.click();
    setAnchorEl(null);
    setDownMenuRun(null);
  };

  const handleDeleteProcess = async () => {
    if (
      window.confirm(
        `Are you sure you want to delete the entire process "${selectedProcess}"? This cannot be undone.`,
      )
    ) {
      try {
        const response = await fetch(`/api/processes/${selectedProcess}`, {
          method: "DELETE",
        });
        if (!response.ok) throw new Error("Failed to delete process");
        // Reload the entire app to return to process list
        window.location.reload();
      } catch (err) {
        console.error("Error deleting process:", err);
        alert("Failed to delete process");
      }
    }
  };

  const handleDeleteAllRuns = async () => {
    if (
      window.confirm(
        `Are you sure you want to delete all runs in this process? This cannot be undone.`,
      )
    ) {
      try {
        // Delete each run
        for (const runEntry of Object.entries(runsData)) {
          const runName = runEntry[0];
          const response = await fetch(
            `/api/processes/${selectedProcess}/runs/${runName}`,
            { method: "DELETE" },
          );
          if (!response.ok) throw new Error(`Failed to delete run ${runName}`);
        }
        // Refresh after all deletions
        if (onRefreshProcess) {
          onRefreshProcess();
        }
      } catch (err) {
        console.error("Error deleting runs:", err);
        alert("Failed to delete runs");
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
      flex: 0.7,
      minWidth: 140,
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
          {params.row.files && params.row.files.length > 0 && (
            <IconButton
              size="small"
              onClick={(e) =>
                handleDownloadClick(e, params.row.run, params.row.files)
              }
              title="Download files"
              color="primary"
            >
              <DownloadIcon fontSize="small" />
            </IconButton>
          )}
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
    <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
      <Box sx={{ height: 400, width: "100%" }}>
        <DataGrid rows={rows} columns={columns} />
      </Box>

      {/* Download menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={() => setAnchorEl(null)}
      >
        {downloadMenuRun &&
          downloadMenuRun.files.map((file) => (
            <MenuItem
              key={file}
              onClick={() => handleDownloadFile(downloadMenuRun.runName, file)}
            >
              {file}
            </MenuItem>
          ))}
      </Menu>

      {/* Process management buttons */}
      <Stack direction="row" spacing={2} sx={{ mt: 2 }}>
        <Button
          variant="contained"
          color="error"
          onClick={handleDeleteAllRuns}
          size="small"
        >
          Delete All Runs
        </Button>
        <Button
          variant="contained"
          color="error"
          onClick={handleDeleteProcess}
          size="small"
        >
          Delete Process
        </Button>
      </Stack>
    </Box>
  );
}

export default ProcessTab;
