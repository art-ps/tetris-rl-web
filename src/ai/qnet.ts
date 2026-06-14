// Manual forward pass of the trained DQN (MLP 23->128->128->64->1, ReLU between).
// Mirrors tetris_rl/models/q_network.py running on the exported weights.json.

import weights from "./weights.json";

interface Layer {
  w: number[][]; // shape (out, in)
  b: number[]; // shape (out,)
}

const LAYERS = weights.layers as Layer[];
export const INPUT_DIM = weights.input_dim as number;
export const MODEL_METADATA = weights.metadata as Record<string, unknown>;

function linear(input: number[], layer: Layer): number[] {
  const { w, b } = layer;
  const out = new Array<number>(w.length);
  for (let i = 0; i < w.length; i++) {
    const row = w[i];
    let sum = b[i];
    for (let j = 0; j < row.length; j++) sum += row[j] * input[j];
    out[i] = sum;
  }
  return out;
}

function relu(input: number[]): number[] {
  return input.map((v) => (v > 0 ? v : 0));
}

/** Map a 23-feature vector to a scalar Q-value. */
export function forward(features: number[]): number {
  let x = features;
  for (let i = 0; i < LAYERS.length; i++) {
    x = linear(x, LAYERS[i]);
    if (i < LAYERS.length - 1) x = relu(x);
  }
  return x[0];
}
