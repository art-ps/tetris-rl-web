// Port of board mechanics from tetris_rl/env/tetris.py and features.py.
// Board is Board[y][x]: row-major, y = 0 at the top, y grows downward.

import type { Rotation } from "./pieces";

export const WIDTH = 10;
export const HEIGHT = 20;

export type Board = number[][];

export function createBoard(width = WIDTH, height = HEIGHT): Board {
  return Array.from({ length: height }, () => new Array<number>(width).fill(0));
}

export function cloneBoard(board: Board): Board {
  return board.map((row) => row.slice());
}

/** True if any cell of `rotation` placed at (x, y) is out of bounds or overlaps. */
export function collides(
  board: Board,
  rotation: Rotation,
  x: number,
  y: number,
): boolean {
  const height = board.length;
  const width = board[0].length;
  for (const [dx, dy] of rotation) {
    const bx = x + dx;
    const by = y + dy;
    if (bx < 0 || bx >= width || by < 0 || by >= height || board[by][bx]) {
      return true;
    }
  }
  return false;
}

/** Lowest y at which `rotation` rests after a hard drop in column `x`, or null. */
export function dropY(board: Board, rotation: Rotation, x: number): number | null {
  if (collides(board, rotation, x, 0)) return null;
  let y = 0;
  while (!collides(board, rotation, x, y + 1)) y += 1;
  return y;
}

/** Return a new board with `rotation` stamped at (x, y) using `pieceId`. */
export function placePiece(
  board: Board,
  rotation: Rotation,
  x: number,
  y: number,
  pieceId: number,
): Board {
  const next = cloneBoard(board);
  for (const [dx, dy] of rotation) {
    next[y + dy][x + dx] = pieceId;
  }
  return next;
}

/** Remove full rows, dropping the rest; returns the new board and cleared count. */
export function clearLines(board: Board): { board: Board; cleared: number } {
  const width = board[0].length;
  const remaining = board.filter((row) => row.some((cell) => cell === 0));
  const cleared = board.length - remaining.length;
  if (cleared === 0) return { board, cleared: 0 };
  const empty = Array.from({ length: cleared }, () =>
    new Array<number>(width).fill(0),
  );
  return { board: [...empty, ...remaining], cleared };
}

/** Occupied height of every column (port of features.column_heights). */
export function columnHeights(board: Board): number[] {
  const height = board.length;
  const width = board[0].length;
  const heights = new Array<number>(width).fill(0);
  for (let x = 0; x < width; x++) {
    for (let y = 0; y < height; y++) {
      if (board[y][x]) {
        heights[x] = height - y;
        break;
      }
    }
  }
  return heights;
}

/** Count empty cells with at least one filled cell above (port of count_holes). */
export function countHoles(board: Board): number {
  const height = board.length;
  const width = board[0].length;
  let holes = 0;
  for (let x = 0; x < width; x++) {
    let seen = false;
    for (let y = 0; y < height; y++) {
      if (board[y][x]) seen = true;
      else if (seen) holes += 1;
    }
  }
  return holes;
}

/** Sum of well depths between columns and walls (port of count_wells). */
export function countWells(board: Board): number {
  const height = board.length;
  const width = board[0].length;
  const heights = columnHeights(board);
  let wells = 0;
  for (let x = 0; x < width; x++) {
    const left = x > 0 ? heights[x - 1] : height;
    const right = x < width - 1 ? heights[x + 1] : height;
    wells += Math.max(0, Math.min(left, right) - heights[x]);
  }
  return wells;
}

/** Sum of absolute adjacent column height differences. */
export function bumpiness(heights: number[]): number {
  let total = 0;
  for (let i = 0; i < heights.length - 1; i++) {
    total += Math.abs(heights[i] - heights[i + 1]);
  }
  return total;
}
