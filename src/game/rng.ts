// Seeded RNG so both boards receive the identical piece sequence.

import { PIECE_NAMES, type PieceName } from "./pieces";

/** mulberry32: small deterministic PRNG returning floats in [0, 1). */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Deterministic stream of tetromino names from a seed. */
export class PieceBag {
  private next: () => number;

  constructor(seed: number) {
    this.next = mulberry32(seed);
  }

  draw(): PieceName {
    const index = Math.floor(this.next() * PIECE_NAMES.length);
    return PIECE_NAMES[index];
  }
}
