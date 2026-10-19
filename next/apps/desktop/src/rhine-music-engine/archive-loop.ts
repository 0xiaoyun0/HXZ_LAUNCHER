// Geometry coordinates only; deliberately independent of LINKING activity data.
export type ArchiveCell = { lane: number; row: number };
export type ArchiveNavigation = { axis: 'row' | 'lane'; direction: number } | { cell: ArchiveCell };
export const LOOP_COLUMNS = 9;
export const LOOP_ROWS = 32;
export const COLUMN_SPACING = 5.2;
export const ROW_SPACING = .62;
const POOL_LANES = [0, 1, 2, 3, 4, -2, -1, 5, 6];
export const wrap = (value: number, count: number) => ((value % count) + count) % count;
export const nearestOccurrence = (value: number, center: number, period: number) => value + Math.floor((center - value + period / 2) / period) * period;
export const poolCell = (index: number): ArchiveCell => ({lane: POOL_LANES[Math.floor(index / LOOP_ROWS)], row: index % LOOP_ROWS});
export const cellKey = (cell: ArchiveCell) => `${cell.lane}:${cell.row}`;
export const sameCell = (a: ArchiveCell, b: ArchiveCell) => a.lane === b.lane && a.row === b.row;
