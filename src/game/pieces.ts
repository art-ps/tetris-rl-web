// Port of tetris_rl/env/pieces.py. Cells are [x, y] (column, row); y grows downward.

export type Cell = [number, number];
export type Rotation = Cell[];

export const PIECE_NAMES = ["I", "O", "T", "S", "Z", "J", "L"] as const;
export type PieceName = (typeof PIECE_NAMES)[number];

// 1-based id used to colour the board (0 = empty).
export const PIECE_IDS: Record<PieceName, number> = {
  I: 1,
  O: 2,
  T: 3,
  S: 4,
  Z: 5,
  J: 6,
  L: 7,
};

export const PIECES: Record<PieceName, Rotation[]> = {
  I: [
    [[0, 0], [1, 0], [2, 0], [3, 0]],
    [[0, 0], [0, 1], [0, 2], [0, 3]],
  ],
  O: [[[0, 0], [1, 0], [0, 1], [1, 1]]],
  T: [
    [[0, 0], [1, 0], [2, 0], [1, 1]],
    [[0, 0], [0, 1], [1, 1], [0, 2]],
    [[1, 0], [0, 1], [1, 1], [2, 1]],
    [[1, 0], [0, 1], [1, 1], [1, 2]],
  ],
  S: [
    [[1, 0], [2, 0], [0, 1], [1, 1]],
    [[0, 0], [0, 1], [1, 1], [1, 2]],
  ],
  Z: [
    [[0, 0], [1, 0], [1, 1], [2, 1]],
    [[1, 0], [0, 1], [1, 1], [0, 2]],
  ],
  J: [
    [[0, 0], [0, 1], [1, 1], [2, 1]],
    [[0, 0], [1, 0], [0, 1], [0, 2]],
    [[0, 0], [1, 0], [2, 0], [2, 1]],
    [[1, 0], [1, 1], [0, 2], [1, 2]],
  ],
  L: [
    [[2, 0], [0, 1], [1, 1], [2, 1]],
    [[0, 0], [0, 1], [0, 2], [1, 2]],
    [[0, 0], [1, 0], [2, 0], [0, 1]],
    [[0, 0], [1, 0], [1, 1], [1, 2]],
  ],
};

// Neon palette indexed by piece id (index 0 unused / empty).
export const PIECE_COLORS = [
  "#0b0f1a", // 0 empty (unused for fills)
  "#22d3ee", // I cyan
  "#facc15", // O yellow
  "#a855f7", // T purple
  "#34d399", // S green
  "#f43f5e", // Z red
  "#3b82f6", // J blue
  "#fb923c", // L orange
] as const;

/** Return a rotation's [width, height] in cells. */
export function rotationSize(rotation: Rotation): [number, number] {
  let maxX = 0;
  let maxY = 0;
  for (const [x, y] of rotation) {
    if (x > maxX) maxX = x;
    if (y > maxY) maxY = y;
  }
  return [maxX + 1, maxY + 1];
}
