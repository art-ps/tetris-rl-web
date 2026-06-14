import { useEffect, useRef } from "react";
import { PIECES, PIECE_COLORS, PIECE_IDS, rotationSize, type PieceName } from "../game/pieces";

export function NextPreview({ piece, cell = 14 }: { piece: PieceName; cell?: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const dpr = window.devicePixelRatio || 1;
    const cells = PIECES[piece][0];
    const [pw, ph] = rotationSize(cells);
    const w = 4 * cell;
    const h = 4 * cell;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    const ox = (4 - pw) / 2;
    const oy = (4 - ph) / 2;
    const color = PIECE_COLORS[PIECE_IDS[piece]];
    for (const [dx, dy] of cells) {
      const x = (ox + dx) * cell;
      const y = (oy + dy) * cell;
      ctx.shadowColor = color;
      ctx.shadowBlur = cell * 0.7;
      ctx.fillStyle = color;
      ctx.fillRect(x + 1, y + 1, cell - 2, cell - 2);
      ctx.shadowBlur = 0;
      ctx.fillStyle = "rgba(255,255,255,0.18)";
      ctx.fillRect(x + 2, y + 2, cell - 4, (cell - 4) * 0.38);
    }
  }, [piece, cell]);
  return <canvas ref={ref} />;
}

interface Props {
  score: number;
  lines: number;
  level: number;
}

export default function Hud({ score, lines, level }: Props) {
  return (
    <div className="hud">
      <div className="cell">
        <div className="k">Score</div>
        <div className="v">{score.toLocaleString("ru-RU")}</div>
      </div>
      <div className="cell">
        <div className="k">Lines</div>
        <div className="v">{lines}</div>
      </div>
      <div className="cell">
        <div className="k">Level</div>
        <div className="v">{level}</div>
      </div>
    </div>
  );
}
