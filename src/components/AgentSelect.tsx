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
    </motion.div>
  );
}
