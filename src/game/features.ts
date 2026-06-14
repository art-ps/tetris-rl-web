// Port of tetris_rl/env/features.py: extract_features -> 23-float vector.

import { bumpiness, columnHeights, countHoles, countWells, type Board } from "./board";
import { PIECE_NAMES, type PieceName } from "./pieces";

/**
 * 23 features: 6 base stats + 10 column heights + 7 piece one-hot.
 * Mirrors extract_features(board, piece, completed_lines, normalize=True).
 */
export function extractFeatures(
  board: Board,
  piece: PieceName,
  completedLines = 0,
): number[] {
  const height = board.length;
  const width = board[0].length;
  const heights = columnHeights(board);

  const aggregateHeight = heights.reduce((a, b) => a + b, 0);
  const maxHeight = heights.reduce((a, b) => Math.max(a, b), 0);
  const holes = countHoles(board);
  const bump = bumpiness(heights);
  const wells = countWells(board);

  const base = [aggregateHeight, maxHeight, holes, bump, completedLines, wells, ...heights];

  const denom = [
    height * width,
    height,
    height * width,
    height * Math.max(1, width - 1),
    4,
    height * width,
  ];
  for (let i = 0; i < 6; i++) base[i] /= denom[i];
  for (let i = 6; i < base.length; i++) base[i] /= height;

  const oneHot = new Array<number>(PIECE_NAMES.length).fill(0);
  oneHot[PIECE_NAMES.indexOf(piece)] = 1;

  return [...base, ...oneHot];
}
