// The grids run at the compact density set in the theme, which scales the row
// and header heights by the same factor. Handing the header the default row
// height therefore lands it on exactly the row height (36px), where the
// default header height of 56 would make it taller.
export const HEADER_HEIGHT = 52;

// What the scaled rows actually measure, for the parts the density does not
// touch: header and footer are pinned to it so a table reads as one evenly
// spaced block.
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
