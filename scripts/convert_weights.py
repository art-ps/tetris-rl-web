"""Convert a trained tetris-rl DQN checkpoint into a plain JSON weights file.

Reads the PyTorch state_dict from best.pt and writes src/ai/weights.json with the
four Linear layers (weight + bias) so the browser can run inference without torch.

Usage:
    python scripts/convert_weights.py [path/to/best.pt] [path/to/weights.json]

Defaults:
    checkpoint: checkpoints/best.pt
    output:     src/ai/weights.json
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

import torch

HERE = Path(__file__).resolve().parent
PROJECT = HERE.parent
DEFAULT_CKPT = PROJECT / "checkpoints" / "best.pt"
DEFAULT_OUT = PROJECT / "src" / "ai" / "weights.json"

# Sequential indices of the Linear layers inside QNetwork.network.
LINEAR_INDICES = (0, 2, 4, 6)


def main() -> None:
    ckpt_path = Path(sys.argv[1]) if len(sys.argv) > 1 else DEFAULT_CKPT
    out_path = Path(sys.argv[2]) if len(sys.argv) > 2 else DEFAULT_OUT

    checkpoint = torch.load(ckpt_path, map_location="cpu", weights_only=True)
    state = checkpoint["q_network"]

    layers = []
    for idx in LINEAR_INDICES:
        weight = state[f"network.{idx}.weight"]  # shape (out, in)
        bias = state[f"network.{idx}.bias"]  # shape (out,)
        layers.append(
            {
                "w": weight.tolist(),
                "b": bias.tolist(),
            }
        )

    payload = {
        "input_dim": int(checkpoint["input_dim"]),
        "layers": layers,
        "metadata": checkpoint.get("metadata", {}),
    }

    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(json.dumps(payload), encoding="utf-8")

    shapes = " -> ".join(
        f"{len(layer['w'][0])}x{len(layer['w'])}" for layer in layers
    )
    print(f"wrote {out_path} ({out_path.stat().st_size} bytes)")
    print(f"layers: {shapes}")
    print(f"metadata: {payload['metadata']}")


if __name__ == "__main__":
    main()
