import React, { useState, useCallback } from "react";
import {
  Box,
  Typography,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  CircularProgress,
  Alert,
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  Tooltip,
  Chip,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import DownloadIcon from "@mui/icons-material/Download";
import CloseIcon from "@mui/icons-material/Close";

function downloadSvg(svg, diagramNumber) {
  const blob = new Blob([svg], { type: "image/svg+xml" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `diagram_${diagramNumber}.svg`;
  a.click();
  URL.revokeObjectURL(url);
}

function DiagramCard({ diagram, isDarkMode, onClick }) {
  const [hovered, setHovered] = useState(false);

  const handleDownload = (e) => {
    e.stopPropagation();
    downloadSvg(diagram.svg, diagram.diagram_number);
  };

  return (
    <Box
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      sx={{
        border: "1px solid",
        borderColor: "divider",
        borderRadius: 1,
        p: 1,
        cursor: "pointer",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 0.5,
        position: "relative",
        "&:hover": { bgcolor: "action.hover" },
        width: 330,
        flexShrink: 0,
      }}
    >
      {hovered && (
        <Tooltip title="Download SVG">
          <IconButton
            size="small"
            onClick={handleDownload}
            sx={{
              position: "absolute",
              top: 4,
              right: 4,
              bgcolor: "background.paper",
              "&:hover": { bgcolor: "action.selected" },
              zIndex: 1,
            }}
          >
            <DownloadIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      )}
      <Box
        sx={{
          width: "100%",
          "& svg": { width: "100%", height: "auto", display: "block" },
          ...(isDarkMode && { filter: "invert(1)" }),
        }}
        dangerouslySetInnerHTML={{ __html: diagram.svg }}
      />
      <Box
        sx={{
          display: "flex",
          flexWrap: "wrap",
          gap: 0.5,
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <Typography variant="caption" color="text.secondary">
          #{diagram.diagram_number}
        </Typography>
        {Object.entries(diagram.orders).map(([key, val]) => (
          <Chip
            key={key}
            label={`${key}=${val}`}
            size="small"
            variant="outlined"
            sx={{ fontSize: "0.65rem", height: 18 }}
          />
        ))}
      </Box>
    </Box>
  );
}

function SubprocessSection({ processName, subprocName, isDarkMode }) {
  const [diagrams, setDiagrams] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [expanded, setExpanded] = useState(false);
  const [zoomedDiagram, setZoomedDiagram] = useState(null);

  const fetchDiagrams = useCallback(async () => {
    if (diagrams !== null) return;
    setLoading(true);
    try {
      const res = await fetch(
        `/api/processes/${processName}/subprocesses/${subprocName}/diagrams`,
      );
      if (!res.ok) throw new Error("Failed to fetch diagrams");
      const data = await res.json();
      setDiagrams(data.diagrams);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [processName, subprocName, diagrams]);

  const handleChange = (_, isExpanded) => {
    setExpanded(isExpanded);
    if (isExpanded) fetchDiagrams();
  };

  return (
    <>
      <Accordion expanded={expanded} onChange={handleChange}>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="subtitle1" fontFamily="monospace">
            {subprocName}
          </Typography>
        </AccordionSummary>
        <AccordionDetails>
          {loading && <CircularProgress size={24} />}
          {error && <Alert severity="error">{error}</Alert>}
          {diagrams && (
            <Box sx={{ display: "flex", flexWrap: "wrap", gap: 2 }}>
              {diagrams.map((diagram) => (
                <DiagramCard
                  key={diagram.diagram_number}
                  diagram={diagram}
                  isDarkMode={isDarkMode}
                  onClick={() => setZoomedDiagram(diagram)}
                />
              ))}
            </Box>
          )}
        </AccordionDetails>
      </Accordion>

      <Dialog
        open={zoomedDiagram !== null}
        onClose={() => setZoomedDiagram(null)}
        maxWidth="md"
        fullWidth
      >
        {zoomedDiagram && (
          <>
            <DialogTitle
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                pr: 1,
              }}
            >
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <Typography variant="h6">
                  Diagram #{zoomedDiagram.diagram_number}
                </Typography>
                {Object.entries(zoomedDiagram.orders).map(([key, val]) => (
                  <Chip
                    key={key}
                    label={`${key}=${val}`}
                    size="small"
                    variant="outlined"
                  />
                ))}
              </Box>
              <Box>
                <Tooltip title="Download SVG">
                  <IconButton
                    onClick={() =>
                      downloadSvg(
                        zoomedDiagram.svg,
                        zoomedDiagram.diagram_number,
                      )
                    }
                  >
                    <DownloadIcon />
                  </IconButton>
                </Tooltip>
                <IconButton onClick={() => setZoomedDiagram(null)}>
                  <CloseIcon />
                </IconButton>
              </Box>
            </DialogTitle>
            <DialogContent>
              <Box
                sx={{
                  "& svg": { width: "100%", height: "auto", display: "block" },
                  ...(isDarkMode && { filter: "invert(1)" }),
                }}
                dangerouslySetInnerHTML={{ __html: zoomedDiagram.svg }}
              />
            </DialogContent>
          </>
        )}
      </Dialog>
    </>
  );
}

function DiagramsTab({ selectedProcess, subprocesses, isDarkMode }) {
  if (!subprocesses || subprocesses.length === 0) {
    return <Alert severity="info">No subprocesses with diagrams found.</Alert>;
  }

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
      {subprocesses.map((subprocName) => (
        <SubprocessSection
          key={subprocName}
          processName={selectedProcess}
          subprocName={subprocName}
          isDarkMode={isDarkMode}
        />
      ))}
    </Box>
  );
}

export default DiagramsTab;
