// Procedural 8-bit "Korobeiniki" (the classic Tetris theme, a 19th-century
// Russian folk tune in the public domain). Synthesized with WebAudio square
// waves — no audio assets, no licensing concerns.

const NOTE: Record<string, number> = {
  A3: 220.0,
  B3: 246.94,
  C4: 261.63,
  D4: 293.66,
  E4: 329.63,
  F4: 349.23,
  G4: 392.0,
  A4: 440.0,
  B4: 493.88,
  C5: 523.25,
  D5: 587.33,
  E5: 659.25,
  F5: 698.46,
  G5: 783.99,
  A5: 880.0,
};

// [note, beats]; "r" = rest. Eight bars of 4/4 = the recognizable A-theme loop.
const MELODY: [string, number][] = [
  ["E5", 1], ["B4", 0.5], ["C5", 0.5], ["D5", 1], ["C5", 0.5], ["B4", 0.5],
  ["A4", 1], ["A4", 0.5], ["C5", 0.5], ["E5", 1], ["D5", 0.5], ["C5", 0.5],
  ["B4", 1.5], ["C5", 0.5], ["D5", 1], ["E5", 1],
  ["C5", 1], ["A4", 1], ["A4", 1], ["r", 1],
  ["D5", 1], ["F5", 0.5], ["A5", 1], ["G5", 0.5], ["F5", 1],
  ["E5", 1], ["C5", 1], ["E5", 1], ["D5", 0.5], ["C5", 0.5],
  ["B4", 1], ["B4", 0.5], ["C5", 0.5], ["D5", 1], ["E5", 1],
  ["C5", 1], ["A4", 1], ["A4", 1], ["r", 1],
];

const BPM = 144;
const BEAT = 60 / BPM;

class Music {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private playing = false;
  private timer: number | null = null;

  private ensure() {
    if (this.ctx) return;
    const Ctx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext;
    this.ctx = new Ctx();
    this.master = this.ctx.createGain();
    this.master.gain.value = 0.16;
    this.master.connect(this.ctx.destination);
  }

  private voice(freq: number, start: number, dur: number) {
    const ctx = this.ctx!;
    const gain = ctx.createGain();
    const peak = 0.9;
    const len = Math.max(0.08, dur * 0.92);
    gain.gain.setValueAtTime(0, start);
    gain.gain.linearRampToValueAtTime(peak, start + 0.008);
    gain.gain.exponentialRampToValueAtTime(peak * 0.6, start + len * 0.5);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + len);
    gain.connect(this.master!);

    const lead = ctx.createOscillator();
    lead.type = "square";
    lead.frequency.value = freq;
    lead.connect(gain);
    lead.start(start);
    lead.stop(start + len);

    // soft sub-octave for body (same melody one octave down -> always in key)
    const sub = ctx.createOscillator();
    sub.type = "triangle";
    sub.frequency.value = freq / 2;
    const subGain = ctx.createGain();
    subGain.gain.value = 0.5;
    sub.connect(subGain);
    subGain.connect(gain);
    sub.start(start);
    sub.stop(start + len);
  }

  private scheduleLoop(from: number) {
    let t = from;
    for (const [note, beats] of MELODY) {
      const dur = beats * BEAT;
      if (note !== "r") this.voice(NOTE[note], t, dur);
      t += dur;
    }
    const loopEnd = t;
    const ms = (loopEnd - this.ctx!.currentTime - 0.06) * 1000;
    this.timer = window.setTimeout(() => {
      if (this.playing) this.scheduleLoop(loopEnd);
    }, Math.max(0, ms));
  }

  /** Start (or resume) the loop. Must be triggered from a user gesture. */
  play() {
    this.ensure();
    if (this.playing) return;
    this.ctx!.resume();
    this.playing = true;
    this.master!.gain.setValueAtTime(0.16, this.ctx!.currentTime);
    this.scheduleLoop(this.ctx!.currentTime + 0.1);
  }

  stop() {
    this.playing = false;
    if (this.timer !== null) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    if (this.ctx && this.master) {
      const now = this.ctx.currentTime;
      this.master.gain.cancelScheduledValues(now);
      this.master.gain.setValueAtTime(this.master.gain.value, now);
      this.master.gain.linearRampToValueAtTime(0, now + 0.12);
    }
  }
}

export const music = new Music();
