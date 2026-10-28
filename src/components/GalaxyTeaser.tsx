import React from 'react';
import { ChevronRight, Sparkles } from 'lucide-react';

interface GalaxyTeaserProps {
  daysPlayed: number;
  onOpenAll: () => void;
}

// A shimmering mini-constellation preview linking to the full map tab.
// Pure decoration — a star path drawn with CSS variables, so every theme
// colors it automatically.
const StarLine = ({ x1, y1, x2, y2 }: { x1: number; y1: number; x2: number; y2: number }) => (
  <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="var(--accent)" strokeOpacity="0.35" strokeWidth="1" />
);

const StarDot = ({ cx, cy, r = 2.4, glow = false }: { cx: number; cy: number; r?: number; glow?: boolean }) => (
  <circle
    cx={cx}
    cy={cy}
    r={r}
    fill="var(--accent)"
    opacity={glow ? 0.95 : 0.6}
    style={glow ? { filter: 'drop-shadow(0 0 6px var(--accent-glow-strong))' } : undefined}
  />
);

export const GalaxyTeaser: React.FC<GalaxyTeaserProps> = ({ daysPlayed, onOpenAll }) => (
  <section className="w-full max-w-xl mx-auto px-4 mt-5">
    <div className="mb-2.5 flex items-end justify-between px-1">
      <h2 className="font-serif italic text-lg text-[var(--accent)]">Біздің Галактика</h2>
      <button
        onClick={onOpenAll}
        className="flex items-center gap-0.5 text-[11px] font-semibold text-[var(--accent)] transition hover:text-[var(--accent-dark)]"
        aria-label="Барлық шоқжұлдызды көру"
      >
        Барлығы
        <ChevronRight className="h-3.5 w-3.5" />
      </button>
    </div>

    <button
      onClick={onOpenAll}
      className="block w-full overflow-hidden rounded-[28px] border border-[var(--border)] bg-[var(--bg-card)] text-left shadow-sm backdrop-blur-md transition hover:border-[var(--accent)]/40 active:scale-[0.99]"
    >
      <svg viewBox="0 0 320 110" className="h-[110px] w-full" aria-hidden>
        <StarLine x1={40} y1={70} x2={92} y2={38} />
        <StarLine x1={92} y1={38} x2={138} y2={58} />
        <StarLine x1={138} y1={58} x2={182} y2={30} />
        <StarLine x1={182} y1={30} x2={228} y2={48} />
        <StarLine x1={228} y1={48} x2={272} y2={26} />

        <StarDot cx={40} cy={70} r={2} />
        <StarDot cx={92} cy={38} r={2.4} />
        <StarDot cx={138} cy={58} r={2} />
        <StarDot cx={182} cy={30} r={3} glow />
        <StarDot cx={228} cy={48} r={2.4} />
        <StarDot cx={272} cy={26} r={2} />

        <SparklesIcon />
      </svg>

      <div className="flex items-center justify-between border-t border-[var(--border)] bg-[var(--bg-soft)]/60 px-4 py-3">
        <span className="text-[12px] font-medium text-[var(--text)]">
          {daysPlayed} жұлдыз жарқырайды ✨
        </span>
        <ChevronRight className="h-4 w-4 text-[var(--text-faint)]" />
      </div>
    </button>
  </section>
);

// Tiny sparkle stroke drawn in accent color with plain SVG paths (no hex).
function SparklesIcon() {
  return (
    <g stroke="var(--accent-2)" strokeOpacity="0.5" strokeWidth="1.2" strokeLinecap="round" fill="none">
      <path d="M300 78 l0 12 M294 84 l12 0" />
      <path d="M60 20 l0 8 M56 24 l8 0" />
      <path d="M262 84 l0 6 M259 87 l6 0" />
    </g>
  );
}
