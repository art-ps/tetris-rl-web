// Central match state (Zustand). Pure rules live in game/engine.ts; this wires
// them into the lockstep flow: human plays a piece, then the AI places the same
// piece, then both advance together.

import { create } from "zustand";
import { createBoard, type Board } from "./game/board";
import {
  canSpawn,
  hardDropY,
  isLanded,
  lockPiece,
  spawnPiece,
  tryMove,
  tryRotate,
  type ActivePiece,
} from "./game/engine";
import { getValidActions, type Placement } from "./game/placements";
import { PieceBag } from "./game/rng";
import type { PieceName } from "./game/pieces";
import { createAgent, DqnAgent, type Agent, type AgentKind } from "./ai/agents";

const TOP_N = 4;

/** A ranked DQN candidate placement, for the "AI thinking" overlay. */
export interface Thought {
  rotation: number;
  x: number;
  y: number;
  q: number;
  rank: number;
}

/** Top-N placements the DQN is weighing for `piece` (empty for other agents). */
function computeThoughts(
  agent: Agent,
  board: Board,
  piece: PieceName,
  next: PieceName,
): Thought[] {
  if (!(agent instanceof DqnAgent)) return [];
  const actions = getValidActions(board, piece);
  if (actions.length === 0) return [];
  const qs = agent.qValues(actions, next);
  return qs
    .map((q, i) => ({ q, i }))
    .sort((a, b) => b.q - a.q)
    .slice(0, TOP_N)
    .map((e, rank) => ({
      rotation: actions[e.i].rotation,
      x: actions[e.i].x,
      y: actions[e.i].y,
      q: e.q,
      rank,
    }));
}

export type Screen = "select" | "match";
export type Phase = "human" | "aiAnim" | "over";
export type Winner = "human" | "ai" | "draw";

export interface AiAnim {
  piece: PieceName;
  rotation: number;
  fromX: number;
  toX: number;
  toY: number;
}

interface NonState {
  bag: PieceBag;
  agent: Agent;
  aiTarget: Placement | null;
}

interface MatchState extends NonState {
  screen: Screen;
  phase: Phase;
  agentKind: AgentKind;

  current: PieceName;
  next: PieceName;

  humanBoard: Board;
  aiBoard: Board;
  human: ActivePiece;
  aiAnim: AiAnim | null;

  placed: number;
  humanScore: number;
  humanLines: number;
  aiScore: number;
  aiLines: number;

  humanClearFlash: number; // lines cleared on the human's last lock (UI pulse)
  aiClearFlash: number;
  winner: Winner | null;
  thoughts: Thought[]; // DQN top candidates for the current piece on the AI board
  paused: boolean;

  start: (kind: AgentKind) => void;
  toMenu: () => void;
  togglePause: () => void;
  moveLeft: () => void;
  moveRight: () => void;
  rotate: () => void;
  softDrop: () => void;
  hardDrop: () => void;
  gravityTick: () => void;
  finishAi: () => void;
}

const ANIM_FALLBACK: AiAnim | null = null;

export const useMatch = create<MatchState>((set, get) => {
  /** Lock the human piece, then compute the AI's placement and start its anim. */
  function lockHumanThenAi(active: ActivePiece) {
    const s = get();
    const locked = lockPiece(s.humanBoard, s.current, active);

    // AI plays the same current piece on its own board.
    const actions = getValidActions(s.aiBoard, s.current);
    if (actions.length === 0) {
      // AI cannot place the piece -> AI tops out, human survives.
      set({
        humanBoard: locked.board,
        humanScore: s.humanScore + locked.scoreGained,
        humanLines: s.humanLines + locked.linesCleared,
        humanClearFlash: locked.linesCleared,
        phase: "over",
        winner: "human",
      });
      return;
    }
    const idx = s.agent.selectAction(actions, s.next);
    const target = actions[idx];

    set({
      humanBoard: locked.board,
      humanScore: s.humanScore + locked.scoreGained,
      humanLines: s.humanLines + locked.linesCleared,
      humanClearFlash: locked.linesCleared,
      phase: "aiAnim",
      aiTarget: target,
      aiAnim: {
        piece: s.current,
        rotation: target.rotation,
        fromX: spawnPiece(s.current).x,
        toX: target.x,
        toY: target.y,
      },
    });
  }

  /** After the AI animation completes: apply its placement, then advance both. */
  function applyAiAndAdvance() {
    const s = get();
    const target = s.aiTarget;
    if (!target) return;

    const aiBoard = target.board;
    const aiScore = s.aiScore + (LINE_VALUE[target.linesCleared] ?? 0);
    const aiLines = s.aiLines + target.linesCleared;
    const placed = s.placed + 1;

    const current = s.next;
    const next = s.bag.draw();

    const humanAlive = canSpawn(s.humanBoard, current);
    const aiAlive = getValidActions(aiBoard, current).length > 0;

    if (!humanAlive || !aiAlive) {
      let winner: Winner;
      if (humanAlive && !aiAlive) winner = "human";
      else if (!humanAlive && aiAlive) winner = "ai";
      else winner = decideByScore(s.humanScore, aiScore, s.humanLines, aiLines);
      set({
        aiBoard,
        aiScore,
        aiLines,
        aiClearFlash: target.linesCleared,
        placed,
        phase: "over",
        winner,
        aiAnim: ANIM_FALLBACK,
        aiTarget: null,
        thoughts: [],
      });
      return;
    }

    set({
      aiBoard,
      aiScore,
      aiLines,
      aiClearFlash: target.linesCleared,
      placed,
      current,
      next,
      human: spawnPiece(current),
      phase: "human",
      aiAnim: ANIM_FALLBACK,
      aiTarget: null,
      thoughts: computeThoughts(s.agent, aiBoard, current, next),
    });
  }

  return {
    bag: new PieceBag(1),
    agent: createAgent("random"),
    aiTarget: null,

    screen: "select",
    phase: "human",
    agentKind: "dqn",

    current: "I",
    next: "I",
    humanBoard: createBoard(),
    aiBoard: createBoard(),
    human: spawnPiece("I"),
    aiAnim: null,

    placed: 0,
    humanScore: 0,
    humanLines: 0,
    aiScore: 0,
    aiLines: 0,
    humanClearFlash: 0,
    aiClearFlash: 0,
    winner: null,
    thoughts: [],
    paused: false,

    start: (kind) => {
      const seed = (Math.random() * 2 ** 32) >>> 0;
      const bag = new PieceBag(seed);
      const current = bag.draw();
      const next = bag.draw();
      const agent = createAgent(kind);
      const aiBoard = createBoard();
      set({
        screen: "match",
        phase: "human",
        agentKind: kind,
        agent,
        bag,
        current,
        next,
        humanBoard: createBoard(),
        aiBoard,
        human: spawnPiece(current),
        aiAnim: null,
        aiTarget: null,
        placed: 0,
        humanScore: 0,
        humanLines: 0,
        aiScore: 0,
        aiLines: 0,
        humanClearFlash: 0,
        aiClearFlash: 0,
        winner: null,
        thoughts: computeThoughts(agent, aiBoard, current, next),
        paused: false,
      });
    },

    toMenu: () => set({ screen: "select", phase: "human", winner: null, paused: false }),

    togglePause: () => {
      const s = get();
      if (s.screen !== "match" || s.phase === "over") return;
      set({ paused: !s.paused });
    },

    moveLeft: () => {
      const s = get();
      if (s.phase !== "human" || s.paused) return;
      set({ human: tryMove(s.humanBoard, s.current, s.human, -1, 0) });
    },
    moveRight: () => {
      const s = get();
      if (s.phase !== "human" || s.paused) return;
      set({ human: tryMove(s.humanBoard, s.current, s.human, 1, 0) });
    },
    rotate: () => {
      const s = get();
      if (s.phase !== "human" || s.paused) return;
      set({ human: tryRotate(s.humanBoard, s.current, s.human) });
    },
    softDrop: () => {
      const s = get();
      if (s.phase !== "human" || s.paused) return;
      if (isLanded(s.humanBoard, s.current, s.human)) {
        lockHumanThenAi(s.human);
      } else {
        set({ human: tryMove(s.humanBoard, s.current, s.human, 0, 1) });
      }
    },
    hardDrop: () => {
      const s = get();
      if (s.phase !== "human" || s.paused) return;
      const y = hardDropY(s.humanBoard, s.current, s.human);
      lockHumanThenAi({ ...s.human, y });
    },
    gravityTick: () => {
      const s = get();
      if (s.phase !== "human" || s.paused) return;
      if (isLanded(s.humanBoard, s.current, s.human)) {
        lockHumanThenAi(s.human);
      } else {
        set({ human: tryMove(s.humanBoard, s.current, s.human, 0, 1) });
      }
    },
    finishAi: () => applyAiAndAdvance(),
  };
});

if (import.meta.env.DEV) {
  (window as unknown as { __match: typeof useMatch }).__match = useMatch;
}

const LINE_VALUE = [0, 100, 300, 500, 800];

function decideByScore(
  hScore: number,
  aScore: number,
  hLines: number,
  aLines: number,
): Winner {
  if (hScore !== aScore) return hScore > aScore ? "human" : "ai";
  if (hLines !== aLines) return hLines > aLines ? "human" : "ai";
  return "draw";
}
