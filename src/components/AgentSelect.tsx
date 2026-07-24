import { motion } from "framer-motion";
import { AGENT_META, type AgentKind } from "../ai/agents";

const ORDER: AgentKind[] = ["random", "heuristic", "dqn"];
const ACCENT: Record<AgentKind, [string, string]> = {
  random: ["#7c8cff", "rgba(124,140,255,0.35)"],
  heuristic: ["#ffb02e", "rgba(255,176,46,0.35)"],
  dqn: ["#2de2e6", "rgba(45,226,230,0.4)"],
};

export default function AgentSelect({ onPick }: { onPick: (k: AgentKind) => void }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <div className="brand">TETRIS</div>

      <div className="title">
        <h1>
          <span className="h-word">Человек</span>
          <span className="vs">×</span>
          <span className="a-word">Машина</span>
        </h1>
        <p>Выбери соперника · одинаковые фигуры · кто дольше выживет</p>
      </div>

      <div className="select-grid">
        {ORDER.map((kind, i) => {
          const meta = AGENT_META[kind];
          const [accent, glow] = ACCENT[kind];
          return (
            <motion.button
              key={kind}
              className="agent-card"
              style={
                {
                  "--accent": accent,
                  "--accent-glow": glow,
                } as React.CSSProperties
              }
              onClick={() => onPick(kind)}
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.08 * i, duration: 0.4, ease: "easeOut" }}
            >
              <div className="diff">{meta.difficulty}</div>
              <h3>{meta.label}</h3>
              <p>{meta.blurb}</p>
              <div className="play">Играть →</div>
            </motion.button>
          );
        })}
      </div>

      <motion.a
        className="gh-link"
        href="https://github.com/art-ps/tetris-rl-web"
        target="_blank"
        rel="noopener noreferrer"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4, duration: 0.4 }}
      >
        <svg viewBox="0 0 16 16" width="16" height="16" fill="currentColor" aria-hidden="true">
          <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27s1.36.09 2 .27c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8Z" />
        </svg>
        Открытый код на GitHub
      </motion.a>
    </motion.div>
  );
}
