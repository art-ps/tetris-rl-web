import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import AgentSelect from "./components/AgentSelect";
import Board, { type PieceLayer } from "./components/Board";
import Hud, { NextPreview } from "./components/Hud";
import { hardDropY, gravityInterval, levelOf } from "./game/engine";
import { PIECES, PIECE_COLORS, PIECE_IDS } from "./game/pieces";
import { AGENT_META } from "./ai/agents";
import { music } from "./audio/music";
import { useMatch } from "./store";

const AI_ANIM_MS = 420;
const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);

// Real hex colors (canvas cannot resolve the matching CSS custom properties).
const HUMAN_HEX = "#ffb02e";
const AI_HEX = "#2de2e6";

/** Russian plural for line counts: 1 линия, 2 линии, 5 линий. */
function plural(n: number): string {
  const forms = ["линия", "линии", "линий"];
  const mod100 = n % 100;
  const mod10 = n % 10;
  if (mod100 >= 11 && mod100 <= 14) return forms[2];
  if (mod10 === 1) return forms[0];
  if (mod10 >= 2 && mod10 <= 4) return forms[1];
  return forms[2];
}

/** Returns an id that increments whenever `value` grows (drives clear pulses). */
function useFlash(value: number): number {
  const [id, setId] = useState(0);
  const prev = useRef(value);
  useEffect(() => {
    if (value > prev.current) setId((i) => i + 1);
    prev.current = value;
  }, [value]);
  return id;
}

export default function App() {
  const s = useMatch();
  const [aiProgress, setAiProgress] = useState(0);
  const [showHint, setShowHint] = useState(false);
  const [musicOn, setMusicOn] = useState(true);

  // Music plays during a match; stop it whenever we leave to the menu.
  useEffect(() => {
    if (s.screen !== "match") music.stop();
  }, [s.screen]);

  // Pause silences the music; resuming restarts it if enabled.
  useEffect(() => {
    if (s.screen !== "match") return;
    if (s.paused) music.stop();
    else if (musicOn) music.play();
  }, [s.paused]);

  function handlePick(k: Parameters<typeof s.start>[0]) {
    s.start(k);
    if (musicOn) music.play(); // called inside the click gesture (autoplay-safe)
  }

  function toggleMusic(on: boolean) {
    setMusicOn(on);
    if (on && s.screen === "match") music.play();
    else if (!on) music.stop();
  }

  // --- input ---
  useEffect(() => {
    if (s.screen !== "match") return;
    const onKey = (e: KeyboardEvent) => {
      const st = useMatch.getState();
      switch (e.key) {
        case "ArrowLeft":
          e.preventDefault();
          st.moveLeft();
          break;
        case "ArrowRight":
          e.preventDefault();
          st.moveRight();
          break;
        case "ArrowUp":
        case "x":
          e.preventDefault();
          st.rotate();
          break;
        case "ArrowDown":
          e.preventDefault();
          st.softDrop();
          break;
        case " ":
          e.preventDefault();
          st.hardDrop();
          break;
        case "Escape":
        case "p":
        case "P":
        case "З":
        case "з":
          e.preventDefault();
          st.togglePause();
          break;
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [s.screen]);

  // --- game loop: gravity for the human, animation for the AI ---
  useEffect(() => {
    if (s.screen !== "match") return;
    let raf = 0;
    let prev = performance.now();
    let lastDrop = prev;
    let animStart = 0;
    let animatingFor: typeof s.aiAnim = null;

    const tick = (now: number) => {
      const dt = now - prev;
      prev = now;
      const st = useMatch.getState();
      if (st.paused) {
        // freeze all timers so nothing advances while paused
        lastDrop += dt;
        animStart += dt;
        raf = requestAnimationFrame(tick);
        return;
      }
      if (st.phase === "human") {
        if (now - lastDrop >= gravityInterval(st.placed)) {
          st.gravityTick();
          lastDrop = now;
        }
      } else if (st.phase === "aiAnim" && st.aiAnim) {
        if (animatingFor !== st.aiAnim) {
          animatingFor = st.aiAnim;
          animStart = now;
        }
        const p = Math.min(1, (now - animStart) / AI_ANIM_MS);
        setAiProgress(p);
        if (p >= 1) {
          st.finishAi();
          lastDrop = now;
          animatingFor = null;
        }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [s.screen]);

  const humanFlash = useFlash(s.humanLines);
  const aiFlash = useFlash(s.aiLines);

  if (s.screen === "select") {
    return (
      <div className="app">
        <AnimatePresence mode="wait">
          <AgentSelect key="select" onPick={handlePick} />
        </AnimatePresence>
      </div>
    );
  }

  // --- build human layers (ghost + active) ---
  const curCells = PIECES[s.current][s.human.rotation];
  const curColor = PIECE_COLORS[PIECE_IDS[s.current]];
  const ghostY = hardDropY(s.humanBoard, s.current, s.human);
  const humanLayers: PieceLayer[] = [
    { cells: curCells, x: s.human.x, y: ghostY, color: curColor, style: "landing" },
    { cells: curCells, x: s.human.x, y: s.human.y, color: curColor, style: "solid" },
  ];

  // --- build AI layers (waiting ghost, or animating piece) ---
  const aiLayers: PieceLayer[] = [];
  if (s.phase === "aiAnim" && s.aiAnim) {
    const a = s.aiAnim;
    const p = easeOut(aiProgress);
    aiLayers.push({
      cells: PIECES[a.piece][a.rotation],
      x: a.fromX + (a.toX - a.fromX) * Math.min(1, aiProgress * 1.4),
      y: a.toY * p,
      color: PIECE_COLORS[PIECE_IDS[a.piece]],
      style: "solid",
    });
  } else if (s.phase === "human") {
    if (s.agentKind === "dqn" && showHint && s.thoughts.length > 0) {
      // Visualize the DQN's deliberation: top candidate placements, brightest
      // for the move it will actually make.
      for (const t of s.thoughts) {
        aiLayers.push({
          cells: PIECES[s.current][t.rotation],
          x: t.x,
          y: t.y,
          color: AI_HEX,
          // faint ranked outlines; the chosen move is marked by its label only
          style: "ghost",
          opacity: Math.max(0.45, 0.9 - t.rank * 0.18) * 0.3,
          label: t.rank === 0 ? `▶ Q ${Math.round(t.q)}` : undefined,
        });
      }
    } else {
      const cells = PIECES[s.current][0];
      aiLayers.push({
        cells,
        x: Math.floor((10 - Math.max(...cells.map((c) => c[0])) - 1) / 2),
        y: 0,
        color: AI_HEX,
        style: "ghost",
      });
    }
  }

  const meta = AGENT_META[s.agentKind];

  return (
    <div className="app">
      <div className="arena">
        <div className="side">
          <div className="side-head">
            <span className="who">Ты</span>
            <span className="tag">Human</span>
          </div>
          <Board
            board={s.humanBoard}
            layers={humanLayers}
            accent={HUMAN_HEX}
            flashKey={humanFlash}
            dead={s.phase === "over" && s.winner === "ai"}
          />
          <Hud
            score={s.humanScore}
            lines={s.humanLines}
            level={levelOf(s.placed)}
          />
        </div>

        <div className="center-col">
          <div className="next-panel">
            <div className="k">Следующая</div>
            <div className="frame">
              <NextPreview piece={s.next} cell={20} />
            </div>
            <div className="arrow">↓ ↓</div>
          </div>
          {s.agentKind === "dqn" && (
            <label className="hint-toggle">
              <input
                type="checkbox"
                checked={showHint}
                onChange={(e) => setShowHint(e.target.checked)}
              />
              <span className="box" />
              Подсказка
            </label>
          )}
        </div>

        <div className="side ai">
          <div className="side-head">
            <span className="who">{meta.label} AI</span>
            <span className="tag">{meta.difficulty}</span>
          </div>
          <Board
            board={s.aiBoard}
            layers={aiLayers}
            accent={AI_HEX}
            flashKey={aiFlash}
            dead={s.phase === "over" && s.winner === "human"}
          />
          <Hud
            score={s.aiScore}
            lines={s.aiLines}
            level={levelOf(s.placed)}
          />
        </div>
      </div>

      <div className="hint">
        <kbd>←</kbd> <kbd>→</kbd> двигать · <kbd>↑</kbd> поворот ·{" "}
        <kbd>↓</kbd> вниз · <kbd>Space</kbd> сброс · <kbd>P</kbd> / <kbd>Esc</kbd> пауза
        {s.agentKind === "dqn" && showHint && (
          <div style={{ marginTop: 8 }}>
            циан-контуры — варианты, которые взвешивает DQN · <b>▶</b> — выбранный ход
          </div>
        )}
      </div>

      <AnimatePresence>
        {s.paused && s.phase !== "over" && (
          <PauseOverlay
            musicOn={musicOn}
            onMusic={toggleMusic}
            onResume={() => s.togglePause()}
            onMenu={() => s.toMenu()}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {s.phase === "over" && <Result />}
      </AnimatePresence>
    </div>
  );
}

function PauseOverlay({
  musicOn,
  onMusic,
  onResume,
  onMenu,
}: {
  musicOn: boolean;
  onMusic: (on: boolean) => void;
  onResume: () => void;
  onMenu: () => void;
}) {
  return (
    <motion.div
      className="overlay pause"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div
        className="result"
        initial={{ scale: 0.9, y: 16 }}
        animate={{ scale: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 240, damping: 22 }}
      >
        <div className="verdict draw">Пауза</div>
        <div className="pause-controls">
          <label className="hint-toggle">
            <input
              type="checkbox"
              checked={musicOn}
              onChange={(e) => onMusic(e.target.checked)}
            />
            <span className="box" />
            ♪ Музыка
          </label>
        </div>
        <div>
          <button className="btn" onClick={onResume}>
            Продолжить
          </button>
          <button className="btn ghost" onClick={onMenu}>
            В меню
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

function Result() {
  const s = useMatch();
  const win = s.winner === "human";
  const draw = s.winner === "draw";
  const verdict = draw ? "Ничья" : win ? "Победа" : "Поражение";
  const cls = draw ? "draw" : win ? "win" : "lose";
  return (
    <motion.div
      className="overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div
        className="result"
        initial={{ scale: 0.85, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 220, damping: 20 }}
      >
        <div className={`verdict ${cls}`}>{verdict}</div>
        <div className="stats">
          Ты — <b>{s.humanScore.toLocaleString("ru-RU")}</b> ({s.humanLines}{" "}
          {plural(s.humanLines)})
          {"  ·  "}
          AI — <b>{s.aiScore.toLocaleString("ru-RU")}</b> ({s.aiLines}{" "}
          {plural(s.aiLines)})
        </div>
        <button className="btn" onClick={() => s.start(s.agentKind)}>
          Реванш
        </button>
        <button className="btn ghost" onClick={() => s.toMenu()}>
          Сменить соперника
        </button>
      </motion.div>
    </motion.div>
  );
}
