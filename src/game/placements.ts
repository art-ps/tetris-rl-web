// Port of TetrisEnv.get_valid_actions: enumerate every hard-drop placement.

import { clearLines, dropY, placePiece, type Board } from "./board";
import { PIECES, PIECE_IDS, rotationSize, type PieceName } from "./pieces";

export interface Placement {
  rotation: number;
  x: number;
  y: number;
  linesCleared: number;
  board: Board;
}

/** All valid (rotation, x) hard-drop placements of `piece` on `board`. */
export function getValidActions(board: Board, piece: PieceName): Placement[] {
  const width = board[0].length;
  const pieceId = PIECE_IDS[piece];
  const rotations = PIECES[piece];
  const actions: Placement[] = [];

  for (let rotation = 0; rotation < rotations.length; rotation++) {
    const cells = rotations[rotation];
    const [rotWidth] = rotationSize(cells);
    for (let x = 0; x <= width - rotWidth; x++) {
      const y = dropY(board, cells, x);
      if (y === null) continue;
      const placed = placePiece(board, cells, x, y, pieceId);
      const { board: cleared, cleared: linesCleared } = clearLines(placed);
      actions.push({ rotation, x, y, linesCleared, board: cleared });
    }
  }
  return actions;
}
