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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Typography,
} from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";
import VisibilityIcon from "@mui/icons-material/Visibility";
import DeleteIcon from "@mui/icons-material/Delete";
import DownloadIcon from "@mui/icons-material/Download";
import { formatWithError, formatSIPrefix } from "../utils/formatting";

function ProcessTab({
  selectedProcess,
  onSelectRun,
  onSelectRunAndNavigate,
  runsData,
  onRefreshProcess,
}) {
  const [anchorEl, setAnchorEl] = useState(null);
  const [downloadMenuRun, setDownMenuRun] = useState(null);
  const [confirmDialog, setConfirmDialog] = useState({
    open: false,
    title: "",
    message: "",
    onConfirm: null,
  });

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
    if (onSelectRunAndNavigate) {
      onSelectRunAndNavigate(runName);
    } else {
      onSelectRun(runName);
    }
  };

  const handleRowClick = (params) => {
    onSelectRun(params.row.run);
  };

  const handleDeleteRun = (runName) => {
    setConfirmDialog({
      open: true,
      title: "Delete Run",
      message: `Are you sure you want to delete run "${runName}"?`,
      onConfirm: async () => {
        try {
          const response = await fetch(
            `/api/processes/${selectedProcess}/runs/${runName}`,
            { method: "DELETE" },
          );
          if (!response.ok) throw new Error("Failed to delete run");
          // Reset selected run if the deleted run was selected
          if (onSelectRun && runName === runsData[runName]?.name) {
            onSelectRun(null);
          }
          if (onRefreshProcess) {
            onRefreshProcess();
          }
        } catch (err) {
          console.error("Error deleting run:", err);
          alert("Failed to delete run");
        }
        setConfirmDialog({ ...confirmDialog, open: false });
      },
    });
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

  const handleDeleteProcess = () => {
    setConfirmDialog({
      open: true,
      title: "Delete Process",
      message: `Are you sure you want to delete the entire process "${selectedProcess}"? This cannot be undone.`,
      onConfirm: async () => {
        try {
          const response = await fetch(`/api/processes/${selectedProcess}`, {
            method: "DELETE",
          });
          if (!response.ok) throw new Error("Failed to delete process");
          window.location.reload();
        } catch (err) {
          console.error("Error deleting process:", err);
          alert("Failed to delete process");
        }
      },
    });
  };

  const handleDeleteAllRuns = () => {
    setConfirmDialog({
      open: true,
      title: "Delete All Runs",
      message:
        "Are you sure you want to delete all runs in this process? This cannot be undone.",
      onConfirm: async () => {
        try {
          for (const runEntry of Object.entries(runsData)) {
            const runName = runEntry[0];
            const response = await fetch(
              `/api/processes/${selectedProcess}/runs/${runName}`,
              { method: "DELETE" },
            );
            if (!response.ok)
              throw new Error(`Failed to delete run ${runName}`);
          }
          if (onRefreshProcess) {
            onRefreshProcess();
          }
        } catch (err) {
          console.error("Error deleting runs:", err);
          alert("Failed to delete runs");
        }
        setConfirmDialog({ ...confirmDialog, open: false });
      },
    });
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
          <IconButton
            size="small"
            onClick={(e) =>
              handleDownloadClick(e, params.row.run, params.row.files)
            }
            title="Download files"
            color="primary"
            disabled={!params.row.files || params.row.files.length === 0}
          >
            <DownloadIcon fontSize="small" />
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

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
      <Box sx={{ height: 400, width: "100%" }}>
        {Object.keys(runsData).length === 0 ? (
          <Box
            sx={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              height: "100%",
              backgroundColor: "background.paper",
              borderRadius: 1,
              border: "1px solid",
              borderColor: "divider",
            }}
          >
            <Typography variant="body1" color="text.secondary">
              No runs found
            </Typography>
          </Box>
        ) : (
          <DataGrid rows={rows} columns={columns} onRowClick={handleRowClick} />
        )}
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

      {/* Confirmation Dialog */}
      <Dialog
        open={confirmDialog.open}
        onClose={() => setConfirmDialog({ ...confirmDialog, open: false })}
      >
        <DialogTitle>{confirmDialog.title}</DialogTitle>
        <DialogContent>
          <Typography>{confirmDialog.message}</Typography>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setConfirmDialog({ ...confirmDialog, open: false })}
          >
            Cancel
          </Button>
          <Button
            onClick={confirmDialog.onConfirm}
            variant="contained"
            color="error"
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      {/* Process management buttons */}
      <Stack direction="row" spacing={2} sx={{ mt: 2 }}>
        <Button
          variant="outlined"
          color="error"
          onClick={handleDeleteAllRuns}
          size="small"
          disabled={Object.keys(runsData).length === 0}
        >
          Delete All Runs
        </Button>
        <Button
          variant="outlined"
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
