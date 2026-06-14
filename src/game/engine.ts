// Match rules shared by both boards: spawn, gravity curve, locking, scoring.

import {
  clearLines,
  collides,
  cloneBoard,
  WIDTH,
  type Board,
} from "./board";
import { PIECES, PIECE_IDS, rotationSize, type PieceName } from "./pieces";

export const LINE_SCORES = [0, 100, 300, 500, 800] as const;

export function lineScore(lines: number): number {
  return LINE_SCORES[lines] ?? 0;
}

export interface ActivePiece {
  rotation: number;
  x: number;
  y: number;
}

/** Centered top spawn for a piece's first rotation. */
export function spawnPiece(piece: PieceName): ActivePiece {
  const [w] = rotationSize(PIECES[piece][0]);
  return { rotation: 0, x: Math.floor((WIDTH - w) / 2), y: 0 };
}

/** Whether a freshly spawned piece fits (false => top-out). */
export function canSpawn(board: Board, piece: PieceName): boolean {
  const s = spawnPiece(piece);
  return !collides(board, PIECES[piece][s.rotation], s.x, s.y);
}

/** Gravity interval (ms) as a function of pieces already placed. */
export function gravityInterval(placed: number): number {
  return Math.max(110, 800 - placed * 8);
}

/** A "level" purely for HUD display. */
export function levelOf(placed: number): number {
  return Math.floor(placed / 10) + 1;
}

const KICKS = [0, -1, 1, -2, 2];

/** Try to rotate; apply a small horizontal kick if the naive rotation collides. */
export function tryRotate(
  board: Board,
  piece: PieceName,
  active: ActivePiece,
): ActivePiece {
  const rotations = PIECES[piece];
  const nextRot = (active.rotation + 1) % rotations.length;
  const cells = rotations[nextRot];
  for (const kick of KICKS) {
    const x = active.x + kick;
    if (!collides(board, cells, x, active.y)) {
      return { rotation: nextRot, x, y: active.y };
    }
  }
  return active;
}

/** Move by (dx, dy) if the target is free; otherwise return the original. */
export function tryMove(
  board: Board,
  piece: PieceName,
  active: ActivePiece,
  dx: number,
  dy: number,
): ActivePiece {
  const cells = PIECES[piece][active.rotation];
  if (!collides(board, cells, active.x + dx, active.y + dy)) {
    return { ...active, x: active.x + dx, y: active.y + dy };
  }
  return active;
}

/** True when the piece cannot fall any further and must lock. */
export function isLanded(board: Board, piece: PieceName, active: ActivePiece): boolean {
  return collides(board, PIECES[piece][active.rotation], active.x, active.y + 1);
}

/** Hard-drop the active piece to its resting y. */
export function hardDropY(board: Board, piece: PieceName, active: ActivePiece): number {
  const cells = PIECES[piece][active.rotation];
  let y = active.y;
  while (!collides(board, cells, active.x, y + 1)) y += 1;
  return y;
}

export interface LockResult {
  board: Board;
  linesCleared: number;
  scoreGained: number;
}

/** Stamp the active piece, clear full rows, and return the new board + score. */
export function lockPiece(
  board: Board,
  piece: PieceName,
  active: ActivePiece,
): LockResult {
  const stamped = cloneBoard(board);
  const id = PIECE_IDS[piece];
  for (const [dx, dy] of PIECES[piece][active.rotation]) {
    stamped[active.y + dy][active.x + dx] = id;
  }
  const { board: cleared, cleared: linesCleared } = clearLines(stamped);
  return { board: cleared, linesCleared, scoreGained: lineScore(linesCleared) };
}
