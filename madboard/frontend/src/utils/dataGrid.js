// The grids run at the compact density set in the theme; header and footer are
// pinned to the same height so that a table reads as one evenly spaced block.
export const ROW_HEIGHT = 36;

export const COMPACT_GRID_SX = {
  "& .MuiDataGrid-footerContainer": {
    minHeight: ROW_HEIGHT,
    height: ROW_HEIGHT,
  },
  "& .MuiTablePagination-toolbar": {
    minHeight: ROW_HEIGHT,
    height: ROW_HEIGHT,
  },
};

/**
 * Long header names are cut off rather than wrapped, so every column carries
 * its name as a tooltip unless it already brings a description of its own.
 */
export function withHeaderTooltips(columns) {
  return columns.map((column) => ({
    description: column.headerName,
    ...column,
  }));
}
