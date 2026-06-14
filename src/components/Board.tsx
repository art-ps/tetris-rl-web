import { useEffect, useRef } from "react";
import { PIECE_COLORS } from "../game/pieces";
import type { Board as BoardGrid } from "../game/board";
import type { Cell } from "../game/pieces";

export const COLS = 10;
export const ROWS = 20;
const CELL = 27;
const GAP = 1;

export interface PieceLayer {
  cells: Cell[];
  x: number; // may be fractional during animation
  y: number;
  color: string; // must be a real color (hex/rgb), NOT a CSS var — canvas can't resolve var()
  style: "solid" | "ghost" | "landing";
  opacity?: number; // ghost stroke alpha override
  label?: string; // small text drawn above the placement
}

interface Props {
  board: BoardGrid;
  layers: PieceLayer[];
  accent: string;
  flashKey: number;
  dead: boolean;
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function fillCell(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  color: string,
  glow: boolean,
) {
  const x = cx * CELL + GAP;
  const y = cy * CELL + GAP;
  const s = CELL - GAP * 2;
  if (glow) {
    ctx.shadowColor = color;
    ctx.shadowBlur = 16;
  }
  ctx.fillStyle = color;
  roundRect(ctx, x, y, s, s, 5);
  ctx.fill();
  ctx.shadowBlur = 0;
  // glossy top highlight
  ctx.fillStyle = "rgba(255,255,255,0.18)";
  roundRect(ctx, x + 2, y + 2, s - 4, (s - 4) * 0.38, 3);
  ctx.fill();
}

function strokeCell(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  color: string,
  alpha = 0.55,
) {
  const x = cx * CELL + GAP;
  const y = cy * CELL + GAP;
  const s = CELL - GAP * 2;
  ctx.strokeStyle = color;
  ctx.globalAlpha = alpha;
  ctx.lineWidth = 2;
  ctx.shadowColor = color;
  ctx.shadowBlur = 7;
  roundRect(ctx, x + 1, y + 1, s - 2, s - 2, 4);
  ctx.stroke();
  ctx.shadowBlur = 0;
  ctx.globalAlpha = 1;
}

function landingCell(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  color: string,
) {
  const x = cx * CELL + GAP;
  const y = cy * CELL + GAP;
  const s = CELL - GAP * 2;
  // very translucent fill so the drop zone is a faint hint
  ctx.globalAlpha = 0.036;
  ctx.fillStyle = color;
  roundRect(ctx, x + 1, y + 1, s - 2, s - 2, 4);
  ctx.fill();
  // faint outline
  ctx.globalAlpha = 0.18;
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.shadowColor = color;
  ctx.shadowBlur = 2;
  roundRect(ctx, x + 1.5, y + 1.5, s - 3, s - 3, 4);
  ctx.stroke();
  ctx.shadowBlur = 0;
  ctx.globalAlpha = 1;
}

function drawLabel(
  ctx: CanvasRenderingContext2D,
  layer: PieceLayer,
  color: string,
) {
  let minX = Infinity;
  let minY = Infinity;
  for (const [dx, dy] of layer.cells) {
    minX = Math.min(minX, layer.x + dx);
    minY = Math.min(minY, layer.y + dy);
  }
  const px = minX * CELL + 2;
  const py = Math.max(10, minY * CELL - 3);
  ctx.font = "600 11px 'IBM Plex Mono', monospace";
  ctx.fillStyle = color;
  ctx.shadowColor = color;
  ctx.shadowBlur = 8;
  ctx.fillText(layer.label!, px, py);
  ctx.shadowBlur = 0;
}

export default function Board({ board, layers, accent, flashKey, dead }: Props) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const w = COLS * CELL;
    const h = ROWS * CELL;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);

    // faint grid
    ctx.strokeStyle = "rgba(120,150,220,0.06)";
    ctx.lineWidth = 1;
    for (let c = 1; c < COLS; c++) {
      ctx.beginPath();
      ctx.moveTo(c * CELL, 0);
      ctx.lineTo(c * CELL, h);
      ctx.stroke();
    }
    for (let r = 1; r < ROWS; r++) {
      ctx.beginPath();
      ctx.moveTo(0, r * CELL);
      ctx.lineTo(w, r * CELL);
      ctx.stroke();
    }

    // locked cells
    for (let y = 0; y < ROWS; y++) {
      for (let x = 0; x < COLS; x++) {
        const id = board[y][x];
        if (id) fillCell(ctx, x, y, PIECE_COLORS[id], false);
      }
    }

    // active / ghost / animating layers
    for (const layer of layers) {
      for (const [dx, dy] of layer.cells) {
        const cx = layer.x + dx;
        const cy = layer.y + dy;
        if (layer.style === "ghost") strokeCell(ctx, cx, cy, layer.color, layer.opacity);
        else if (layer.style === "landing") landingCell(ctx, cx, cy, layer.color);
        else fillCell(ctx, cx, cy, layer.color, true);
      }
      if (layer.label) drawLabel(ctx, layer, layer.color);
    }
  }, [board, layers, accent]);

  return (
    <div
      className={`board-wrap${flashKey ? " flash" : ""}${dead ? " dead" : ""}`}
      key={`${flashKey}-${dead}`}
    >
      <canvas ref={ref} />
    </div>
  );
}
