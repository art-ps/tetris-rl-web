// The three opponents: random, heuristic, and the trained DQN.
// All share selectAction(actions, nextPiece) -> index, mirroring tetris-rl agents.

import { bumpiness, columnHeights, countHoles } from "../game/board";
import { extractFeatures } from "../game/features";
import type { Placement } from "../game/placements";
import type { PieceName } from "../game/pieces";
import { forward } from "./qnet";

export type AgentKind = "random" | "heuristic" | "dqn";

export interface Agent {
  readonly kind: AgentKind;
  /** Choose a placement index. `nextPiece` feeds the DQN's afterstate features. */
  selectAction(actions: Placement[], nextPiece: PieceName): number;
}

export class RandomAgent implements Agent {
  readonly kind = "random";
  constructor(private rand: () => number = Math.random) {}

  selectAction(actions: Placement[]): number {
    return Math.floor(this.rand() * actions.length);
  }
}

export class HeuristicAgent implements Agent {
  readonly kind = "heuristic";

  private score(action: Placement): number {
    const heights = columnHeights(action.board);
    const aggregateHeight = heights.reduce((a, b) => a + b, 0);
    const holes = countHoles(action.board);
    const bump = bumpiness(heights);
    return (
      -0.5 * aggregateHeight -
      0.7 * holes -
      0.3 * bump +
      1.0 * action.linesCleared
    );
  }

  selectAction(actions: Placement[]): number {
    let best = 0;
    let bestScore = -Infinity;
    for (let i = 0; i < actions.length; i++) {
      const s = this.score(actions[i]);
      if (s > bestScore) {
        bestScore = s;
        best = i;
      }
    }
    return best;
  }
}

export class DqnAgent implements Agent {
  readonly kind = "dqn";

  /** Q-value of every candidate placement (afterstate board + next piece). */
  qValues(actions: Placement[], nextPiece: PieceName): number[] {
    return actions.map((a) =>
      forward(extractFeatures(a.board, nextPiece, a.linesCleared)),
    );
  }

  selectAction(actions: Placement[], nextPiece: PieceName): number {
    const qs = this.qValues(actions, nextPiece);
    let best = 0;
    for (let i = 1; i < qs.length; i++) if (qs[i] > qs[best]) best = i;
    return best;
  }
}

export function createAgent(kind: AgentKind, rand?: () => number): Agent {
  switch (kind) {
    case "random":
      return new RandomAgent(rand);
    case "heuristic":
      return new HeuristicAgent();
    case "dqn":
      return new DqnAgent();
  }
}

export const AGENT_META: Record<
  AgentKind,
  { label: string; difficulty: string; blurb: string }
> = {
  random: {
    label: "Random",
    difficulty: "Лёгкий",
    blurb: "Ставит фигуры наугад. Разминка.",
  },
  heuristic: {
    label: "Heuristic",
    difficulty: "Средний",
    blurb: "Жадная эвристика: высота, дырки, неровность.",
  },
  dqn: {
    label: "DQN",
    difficulty: "Сложный",
    blurb: "Натренированная нейросеть. Играет всерьёз.",
  },
};
