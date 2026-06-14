// Validates the TS port against reference values generated from tetris-rl.
// Regenerate fixtures with: scripts/gen_fixtures.py

import { describe, expect, it } from "vitest";
import { clearLines, collides, createBoard, dropY, type Board } from "../board";
import { extractFeatures } from "../features";
import { getValidActions } from "../placements";
import { PIECES, type PieceName } from "../pieces";
import { forward } from "../../ai/qnet";
import fixtures from "./fixtures.json";

interface FeatureCase {
  board: number[][];
  piece: PieceName;
  completedLines: number;
  features: number[];
  q: number;
}
interface ActionCase {
  board: number[][];
  piece: PieceName;
  actions: { rotation: number; x: number; y: number; linesCleared: number }[];
}

const featureCases = fixtures.featureCases as FeatureCase[];
const actionCases = fixtures.actionCases as ActionCase[];

describe("feature extraction matches tetris-rl", () => {
  featureCases.forEach((c, i) => {
    it(`case ${i}: 23 features within 1e-5`, () => {
      const got = extractFeatures(c.board, c.piece, c.completedLines);
      expect(got).toHaveLength(23);
      for (let k = 0; k < 23; k++) {
        expect(got[k]).toBeCloseTo(c.features[k], 5);
      }
    });
  });
});

describe("DQN forward pass matches PyTorch", () => {
  featureCases.forEach((c, i) => {
    it(`case ${i}: Q within 1e-4`, () => {
      expect(forward(c.features)).toBeCloseTo(c.q, 4);
    });
  });
});

describe("getValidActions matches tetris-rl", () => {
  actionCases.forEach((c, i) => {
    it(`case ${i} (${c.piece}): same placements`, () => {
      const got = getValidActions(c.board, c.piece).map((a) => ({
        rotation: a.rotation,
        x: a.x,
        y: a.y,
        linesCleared: a.linesCleared,
      }));
      expect(got).toEqual(c.actions);
    });
  });
});

describe("board mechanics", () => {
  it("clearLines removes full rows and drops the rest", () => {
    const board: Board = createBoard();
    board[19].fill(1); // full bottom row
    board[18][0] = 1; // partial row above
    const { board: out, cleared } = clearLines(board);
    expect(cleared).toBe(1);
    expect(out[19][0]).toBe(1); // partial row fell to the bottom
    expect(out[19].slice(1).every((v) => v === 0)).toBe(true);
    expect(out[18].every((v) => v === 0)).toBe(true);
  });

  it("collides on walls, floor, and occupied cells", () => {
    const board = createBoard();
    const flatI = PIECES.I[0]; // 4 cells wide
    expect(collides(board, flatI, -1, 0)).toBe(true); // left wall
    expect(collides(board, flatI, 7, 0)).toBe(true); // right wall (7+3=10)
    expect(collides(board, flatI, 0, 20)).toBe(true); // floor
    board[0][0] = 1;
    expect(collides(board, flatI, 0, 0)).toBe(true); // occupied
  });

  it("dropY lands a flat I-piece on the floor of an empty board", () => {
    const board = createBoard();
    expect(dropY(board, PIECES.I[0], 0)).toBe(19);
  });
});
