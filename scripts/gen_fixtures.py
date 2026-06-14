"""Generate reference fixtures from tetris-rl to validate the TypeScript port.

Plays a short heuristic game, capturing real board states, then records for each:
  - the board grid
  - current/next piece and the chosen placement's cleared lines
  - the 23-feature vector (extract_features)
  - the DQN Q-value for that afterstate
Also records the full valid-action set for several boards so the TS
getValidActions port can be checked exactly.

Run from an environment with torch + the tetris_rl package importable:
    PYTHONPATH=../tetris-rl python scripts/gen_fixtures.py

Writes src/game/__tests__/fixtures.json.
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

import numpy as np
import torch

HERE = Path(__file__).resolve().parent
PROJECT = HERE.parent
sys.path.insert(0, str(PROJECT.parent / "tetris-rl"))

from tetris_rl.agents.heuristic_agent import HeuristicAgent  # noqa: E402
from tetris_rl.env.features import extract_features  # noqa: E402
from tetris_rl.env.tetris import TetrisEnv  # noqa: E402
from tetris_rl.models import QNetwork  # noqa: E402

CKPT = PROJECT.parent / "tetris-rl" / "checkpoints" / "best.pt"
OUT = PROJECT / "src" / "game" / "__tests__" / "fixtures.json"


def load_qnet() -> QNetwork:
    checkpoint = torch.load(CKPT, map_location="cpu", weights_only=True)
    net = QNetwork(checkpoint["input_dim"])
    net.load_state_dict(checkpoint["q_network"])
    net.eval()
    return net


def q_value(net: QNetwork, features: np.ndarray) -> float:
    tensor = torch.from_numpy(np.asarray(features, dtype=np.float32))
    with torch.no_grad():
        return float(net(tensor).item())


def actions_payload(env: TetrisEnv) -> list[dict]:
    return [
        {
            "rotation": a.rotation,
            "x": a.x,
            "y": a.y,
            "linesCleared": a.lines_cleared,
        }
        for a in env.get_valid_actions()
    ]


def main() -> None:
    net = load_qnet()
    agent = HeuristicAgent()
    env = TetrisEnv(seed=7)

    feature_cases: list[dict] = []
    action_cases: list[dict] = []

    # Empty-board valid actions for every piece (deterministic, exact check).
    for piece in ("I", "O", "T", "S", "Z", "J", "L"):
        probe = TetrisEnv(seed=1)
        probe.board = np.zeros((20, 10), dtype=np.int8)
        probe.current_piece = piece
        probe._valid_actions = None
        action_cases.append(
            {
                "board": probe.board.tolist(),
                "piece": piece,
                "actions": actions_payload(probe),
            }
        )

    # Realistic mid-game states from a heuristic playthrough.
    for step in range(40):
        actions = env.get_valid_actions()
        if not actions:
            break
        if step % 4 == 0:
            board_before = env.board.tolist()
            piece = env.current_piece
            next_piece = env.next_piece
            # Feature/Q case using the chosen afterstate (afterstate + next piece).
            choice = agent.select_action(actions)
            chosen = actions[choice]
            feats = extract_features(
                chosen.board, next_piece, completed_lines=chosen.lines_cleared
            )
            feature_cases.append(
                {
                    "board": chosen.board.tolist(),
                    "piece": next_piece,
                    "completedLines": int(chosen.lines_cleared),
                    "features": [float(v) for v in feats],
                    "q": q_value(net, feats),
                }
            )
            action_cases.append(
                {"board": board_before, "piece": piece, "actions": actions_payload(env)}
            )
            env.step(choice)
        else:
            env.step(agent.select_action(actions))

    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(
        json.dumps(
            {"featureCases": feature_cases, "actionCases": action_cases}, indent=0
        ),
        encoding="utf-8",
    )
    print(f"wrote {OUT}: {len(feature_cases)} feature cases, {len(action_cases)} action cases")


if __name__ == "__main__":
    main()
