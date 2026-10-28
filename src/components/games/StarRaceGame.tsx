// Жұлдызды жарыс (star race) — three lanes, one SVG ship, and the partner's
// best score chasing you as a ghost marker on the side track.
//
// Everything runs on one RAF loop with delta time and a pooled DOM list;
// the ship itself never re-renders — lane changes glide on a ~200ms CSS
// transform transition. A hit grants 1s of invulnerability (plus the screen
// shake), a shield bubble eats whole hits, ×2 doubles points for a while and
// the magnet widens the catch to the neighbouring lanes.

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { GameShell } from './shared/GameShell';
import { useGameShell } from './shared/useGameShell';
import {
  ShipGlyph,
  AsteroidGlyph,
  StarGlyph,
  ShieldBubbleGlyph,
  MagnetGlyph,
  SparkleGlyph,
} from './shared/art';
import type { GameComponentProps, GameId, RoundMetrics } from '../gameTypes';
import type { GameOutcome } from '../gameTypes';
import type { DifficultyName } from '../../utils/constellationUtils';
import { gameAudio, buzz } from '../../utils/gameSound';
import { fetchRoundSummary } from '../../utils/records';
import { useRafLoop } from '../../utils/gameLoop';

const GAME_ID: GameId = 'star-race';

const LANES = 3;
const ITEM_POOL = 10;
// The spawn logic needs pre-allocated inactive slots — otherwise items.current
// starts empty, findIndex() returns -1 and nothing ever falls.
const freshPool = (): Racer[] => Array.from({ length: ITEM_POOL }, () => ({ id: 0, type: 'star', lane: 1, yPx: 0, speed: 0, active: false }));

type PickupType = 'star' | 'gold' | 'shield' | 'x2' | 'magnet' | 'rock';

const BASE_POINTS: Record<PickupType, number> = {
  star: 10,
  gold: 25,
  shield: 5,
  x2: 5,
  magnet: 5,
  rock: 0,
};

interface Preset {
  roundSec: number;
  targetScore: number;
  spawnMs: number;
  speedMin: number;
  speedMax: number;
  obstacleWeight: number;
}

const PRESETS: Record<DifficultyName, Preset> = {
  easy: { roundSec: 30, targetScore: 50, spawnMs: 850, speedMin: 120, speedMax: 200, obstacleWeight: 24 },
  medium: { roundSec: 34, targetScore: 70, spawnMs: 680, speedMin: 150, speedMax: 250, obstacleWeight: 30 },
  hard: { roundSec: 38, targetScore: 95, spawnMs: 540, speedMin: 190, speedMax: 310, obstacleWeight: 36 },
};

const PICKUP_TABLE: Array<{ type: PickupType; weight: number }> = [
  { type: 'star', weight: 46 },
  { type: 'gold', weight: 7 },
  { type: 'shield', weight: 7 },
  { type: 'x2', weight: 6 },
  { type: 'magnet', weight: 6 },
];

interface Racer {
  id: number;
  type: PickupType;
  lane: number;
  yPx: number;
  speed: number;
  active: boolean;
}

interface VisualSlot {
  type: PickupType | null;
  key: number;
}

function pickType(obstacleWeight: number): PickupType {
  const total = PICKUP_TABLE.reduce((s, t) => s + t.weight, 0) + obstacleWeight;
  let roll = Math.random() * total;
  if (roll >= PICKUP_TABLE.reduce((s, t) => s + t.weight, 0)) return 'rock';
  for (const t of PICKUP_TABLE) {
    roll -= t.weight;
    if (roll <= 0) return t.type;
  }
  return 'star';
}

export const StarRaceGame: React.FC<GameComponentProps> = ({
  difficulty,
  onSetDifficulty,
  playedToday,
  recordsLine,
  taskLine,
  rewardNote,
  onRoundEnd,
  onAnotherGame,
  onOpenLeaderboard,
  onHome,
}) => {
  const preset = PRESETS[difficulty];

  // ── HUD-facing state ───────────────────────────────────────────────────
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [timeSec, setTimeSec] = useState(preset.roundSec);
  const [slots, setSlots] = useState<VisualSlot[]>(() =>
    Array.from({ length: ITEM_POOL }, () => ({ type: null, key: 0 }))
  );
  const [shielded, setShielded] = useState(false);
  const [boosted, setBoosted] = useState(false);
  const [magnetOn, setMagnetOn] = useState(false);
  const [shake, setShake] = useState(0);
  const [lane, setLane] = useState(1);
  // rival ghost (best score of the other player on this difficulty)
  const [ghost, setGhost] = useState<{ name: string; bestValue: number } | null>(null);

  // ── live data (refs) ───────────────────────────────────────────────────
  const fieldRef = useRef<HTMLDivElement>(null);
  const itemEls = useRef<(HTMLDivElement | null)[]>([]);
  const shipRef = useRef<HTMLDivElement>(null);
  const items = useRef<Racer[]>([]);
  const laneTargetRef = useRef(1);
  const laneRef = useRef(1);
  const scoreRef = useRef(0);
  const livesRef = useRef(3);
  const timeLeftRef = useRef(preset.roundSec * 1000);
  const lastSecRef = useRef(preset.roundSec);
  const spawnAccRef = useRef(0);
  const nextIdRef = useRef(1);
  const shieldUntilRef = useRef(0);
  const boostUntilRef = useRef(0);
  const magnetUntilRef = useRef(0);
  const invulnUntilRef = useRef(0);
  const presetRef = useRef(preset);
  presetRef.current = preset;

  // The partner record ghost: fetched once per difficulty from the rounds API.
  useEffect(() => {
    let cancelled = false;
    fetchRoundSummary(GAME_ID, difficulty).then((s) => {
      if (cancelled || !s?.rival?.bestValue) return;
      setGhost({ name: s.rival.name, bestValue: s.rival.bestValue });
    });
    return () => {
      cancelled = true;
    };
  }, [difficulty]);

  const shell = useGameShell({
    gameId: GAME_ID,
    difficulty,
    metric: 'score',
    playedToday,
    onBeforeStart: useCallback(() => {
      const p = presetRef.current;
      scoreRef.current = 0;
      livesRef.current = 3;
      timeLeftRef.current = p.roundSec * 1000;
      lastSecRef.current = p.roundSec;
      spawnAccRef.current = 0;
      nextIdRef.current = 1;
      shieldUntilRef.current = 0;
      boostUntilRef.current = 0;
      magnetUntilRef.current = 0;
      invulnUntilRef.current = 0;
      laneTargetRef.current = 1;
      laneRef.current = 1;
      items.current = freshPool();
      setScore(0);
      setLives(3);
      setTimeSec(p.roundSec);
      setSlots(Array.from({ length: ITEM_POOL }, () => ({ type: null, key: 0 })));
      setShielded(false);
      setBoosted(false);
      setMagnetOn(false);
      setShake(0);
      setLane(1);
    }, []),
    onRoundEnd,
  });

  const setScoreState = (): void => {
    setScore(scoreRef.current);
  };

  const endRound = useCallback(
    (win: boolean, metrics: RoundMetrics) => {
      const outcome: GameOutcome = win ? 'win' : 'loss';
      shell.endRound(outcome, { scoreValue: scoreRef.current, metrics });
    },
    [shell]
  );

  // ── the loop ───────────────────────────────────────────────────────────
  const step = useCallback(
    (dtMs: number, now: number) => {
      const field = fieldRef.current;
      if (!field) return;
      const p = presetRef.current;
      const dt = dtMs / 1000;
      const fieldH = field.clientHeight;

      // clock
      timeLeftRef.current -= dtMs;
      const sec = Math.max(0, Math.ceil(timeLeftRef.current / 1000));
      if (sec !== lastSecRef.current) {
        lastSecRef.current = sec;
        setTimeSec(sec);
      }
      if (timeLeftRef.current <= 0) {
        endRound(scoreRef.current >= p.targetScore, { score: scoreRef.current });
        return;
      }

      // effects lifecycle
      if (shieldUntilRef.current && now > shieldUntilRef.current) {
        shieldUntilRef.current = 0;
        setShielded(false);
      }
      if (boostUntilRef.current && now > boostUntilRef.current) {
        boostUntilRef.current = 0;
        setBoosted(false);
      }
      if (magnetUntilRef.current && now > magnetUntilRef.current) {
        magnetUntilRef.current = 0;
        setMagnetOn(false);
      }

      // speed ramps up over the round
      const progress = 1 - timeLeftRef.current / (p.roundSec * 1000);
      const ramp = 1 + progress * 0.55;
      const laneX = (l: number): number => ((l + 0.5) / LANES) * field.clientWidth;

      // spawn
      spawnAccRef.current += dtMs;
      if (spawnAccRef.current >= p.spawnMs) {
        spawnAccRef.current = 0;
        const free = items.current.findIndex((it) => !it.active);
        if (free >= 0) {
          const type = pickType(p.obstacleWeight);
          const item: Racer = {
            id: nextIdRef.current++,
            type,
            lane: Math.floor(Math.random() * LANES),
            yPx: -36,
            speed: (p.speedMin + Math.random() * (p.speedMax - p.speedMin)) * ramp,
            active: true,
          };
          items.current[free] = item;
          setSlots((prev) => {
            if (prev[free].key === item.id && prev[free].type === type) return prev;
            const next = [...prev];
            next[free] = { type, key: item.id };
            return next;
          });
        }
      }

      // items
      const shipY = fieldH - 66;
      const magnet = now < magnetUntilRef.current;
      for (let i = 0; i < items.current.length; i++) {
        const it = items.current[i];
        if (!it || !it.active) continue;
        it.yPx += it.speed * dt * ramp;
        const hitZone = it.yPx > shipY - 22 && it.yPx < shipY + 34;
        const sameLane = hitZone && it.lane === laneRef.current;
        // magnet: pickups in the two neighbouring lane slots count as ours
        const magnetPull =
          hitZone && magnet && it.type !== 'rock' && Math.abs(it.lane - laneRef.current) === 1;
        if (sameLane || magnetPull) {
          it.active = false;
          if (it.type === 'rock') {
            if (now < invulnUntilRef.current) {
              // still blinking out of the last hit — ignore
            } else if (now < shieldUntilRef.current) {
              shieldUntilRef.current = 0;
              setShielded(false);
              invulnUntilRef.current = now + 1000;
              gameAudio.play('shield');
              buzz(25);
              setShake((s) => s + 1);
            } else {
              livesRef.current = Math.max(0, livesRef.current - 1);
              invulnUntilRef.current = now + 1000;
              setLives(livesRef.current);
              setShake((s) => s + 1);
              gameAudio.play('error');
              buzz([30, 50, 30]);
              if (livesRef.current === 0) {
                endRound(false, { score: scoreRef.current });
                return;
              }
            }
          } else {
            const mult = now < boostUntilRef.current ? 2 : 1;
            scoreRef.current += BASE_POINTS[it.type] * mult;
            setScoreState();
            gameAudio.play(it.type === 'gold' ? 'gold' : it.type === 'star' ? 'point' : 'shield');
            buzz(8);
            if (it.type === 'shield') {
              shieldUntilRef.current = now + 8000;
              setShielded(true);
              invulnUntilRef.current = 0;
            }
            if (it.type === 'x2') {
              boostUntilRef.current = now + 6000;
              setBoosted(true);
            }
            if (it.type === 'magnet') {
              magnetUntilRef.current = now + 5000;
              setMagnetOn(true);
            }
          }
          continue;
        }
        if (it.yPx > fieldH + 40) it.active = false;
      }

      // paint items (transform-only)
      for (let i = 0; i < ITEM_POOL; i++) {
        const el = itemEls.current[i];
        const it = items.current[i];
        if (!el) continue;
        if (!it || !it.active) {
          if (el.dataset.on === '1') {
            el.style.opacity = '0';
            el.dataset.on = '0';
          }
          continue;
        }
        el.dataset.on = '1';
        el.style.opacity = '1';
        el.style.transform = `translate3d(${laneX(it.lane) - 17}px, ${it.yPx}px, 0)`;
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [endRound]
  );

  useRafLoop(shell.phase === 'playing', step);

  // lane ask → state (for HUD-free visuals the ship keeps its own transform)
  const askLane = useCallback((next: number) => {
    const clamped = Math.max(0, Math.min(LANES - 1, next));
    if (clamped === laneTargetRef.current) return;
    laneTargetRef.current = clamped;
    laneRef.current = clamped;
    setLane(clamped);
    gameAudio.play('flip');
    buzz(6);
  }, []);

  // ── controls: keyboard / buttons / swipe ───────────────────────────────
  useEffect(() => {
    if (shell.phase !== 'playing') return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' || e.key === 'a') askLane(laneTargetRef.current - 1);
      if (e.key === 'ArrowRight' || e.key === 'd') askLane(laneTargetRef.current + 1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [shell.phase, askLane]);

  useEffect(() => {
    const el = fieldRef.current;
    if (!el || shell.phase !== 'playing') return;
    let lastX = 0;
    const onTouch = (e: TouchEvent) => {
      e.preventDefault();
      if (e.touches.length === 0) return;
      const x = e.touches[0].clientX;
      if (lastX !== 0) {
        const dx = x - lastX;
        if (Math.abs(dx) > 26) {
          askLane(laneTargetRef.current + (dx > 0 ? 1 : -1));
          lastX = x;
        }
      } else {
        lastX = x;
      }
    };
    const reset = () => {
      lastX = 0;
    };
    el.addEventListener('touchstart', onTouch, { passive: false });
    el.addEventListener('touchmove', onTouch, { passive: false });
    el.addEventListener('touchend', reset);
    return () => {
      el.removeEventListener('touchstart', onTouch);
      el.removeEventListener('touchmove', onTouch);
      el.removeEventListener('touchend', reset);
    };
  }, [shell.phase, askLane]);

  // ── glyph chooser ──────────────────────────────────────────────────────
  const itemGlyph = useCallback((type: PickupType) => {
    switch (type) {
      case 'gold':
        return <StarGlyph size={34} color="#F4B942" />;
      case 'shield':
        return <ShieldBubbleGlyph size={34} />;
      case 'magnet':
        return <MagnetGlyph size={30} />;
      case 'x2':
        return (
          <span
            className="inline-flex h-[30px] w-[30px] items-center justify-center rounded-full bg-[var(--accent)] text-[11px] font-black text-[var(--on-accent)] shadow-[0_0_14px_var(--accent-glow)]"
            aria-hidden
          >
            ×2
          </span>
        );
      case 'rock':
        return <AsteroidGlyph size={34} />;
      default:
        return <StarGlyph size={34} color="var(--accent)" />;
    }
  }, []);

  const steps = useMemo(
    () => [
      'Свип немесе ← → батырмаларымен үш жолдан біреуін таңда.',
      'Жұлдыз +10, алтын жұлдыз +25; ×2 ұпай еселеу, магнит қас-жақ жолдарды қамтиды, қалқан соғысты жейді.',
      'Астероид жақынласа қаш — ол өмірді алады. Дәл соққыдан кейін 1 с қорғансыз.',
    ],
    []
  );

  const ghostPct = ghost
    ? Math.max(4, Math.min(96, (ghost.bestValue / (preset.targetScore * 1.25)) * 100))
    : 0;

  return (
    <GameShell
      gameId={GAME_ID}
      gameName="Жұлдызды жарыс"
      shell={shell}
      difficulty={difficulty}
      onSetDifficulty={onSetDifficulty}
      mission={{
        title: `${preset.targetScore} ұпай — бір ұшқанда`,
        text: 'Жұлдыздарды жина, астероидтардан қаш. Серіктесіңнің ең жақсы нәтижесі жаныңда ghost-кеме ретінде көрінеді!',
        steps,
      }}
      hud={{
        score,
        targetScore: preset.targetScore,
        lives: { max: 3, current: lives },
        timerSec: timeSec,
      }}
      recordsLine={recordsLine}
      taskLine={taskLine}
      rewardNote={rewardNote}
      onAnotherGame={onAnotherGame}
      onOpenLeaderboard={onOpenLeaderboard}
      onHome={onHome}
      heightClass="h-[500px] sm:h-[530px]"
    >
      <div className="absolute inset-0 flex flex-col">
        <div
          ref={fieldRef}
          className={`relative flex-1 overflow-hidden game-field bg-gradient-to-b from-[var(--bg-soft)]/40 via-[var(--bg-card)]/30 to-[var(--accent)]/12 ${
            shake > 0 && shell.phase === 'playing' ? 'anim-shake' : ''
          }`}
          style={{ touchAction: 'none' }}
        >
          {/* lane dividers */}
          {[1, 2].map((l) => (
            <div
              key={l}
              className="absolute inset-y-0 w-px bg-[var(--border)]"
              style={{ left: `${(l / LANES) * 100}%` }}
            />
          ))}

          {/* rival ghost track on the right edge */}
          {ghost && (
            <div className="absolute right-1 top-2 bottom-2 w-3 flex flex-col items-center pointer-events-none">
              <div className="relative h-full w-px bg-[var(--border)]/70">
                <div
                  className="absolute -left-1.5 h-4 w-4 opacity-45"
                  style={{ top: `${100 - ghostPct}%` }}
                  title={ghost.name}
                >
                  <ShipGlyph size={16} />
                </div>
              </div>
            </div>
          )}

          {/* state chips */}
          <div className="absolute left-2 top-2 flex flex-col gap-1 pointer-events-none">
            {shielded && (
              <span className="px-2 py-0.5 rounded-full bg-[#60BEFF]/20 border border-[#8FD3F4]/70 text-[9px] font-bold text-[#8FD3F4]">
                ҚАЛҚАН
              </span>
            )}
            {boosted && (
              <span className="px-2 py-0.5 rounded-full bg-[var(--accent)]/20 border border-[var(--accent)]/70 text-[9px] font-bold text-[var(--accent)]">
                ×2
              </span>
            )}
            {magnetOn && (
              <span className="px-2 py-0.5 rounded-full bg-[var(--bg-elevated)]/85 border border-[var(--border)] text-[9px] font-bold text-[var(--text-secondary)]">
                МАГНИТ
              </span>
            )}
          </div>

          {/* pooled falling items */}
          {slots.map((slot, i) => (
            <div
              key={i}
              ref={(el) => {
                itemEls.current[i] = el;
              }}
              className="absolute left-0 top-0 pointer-events-none will-change-transform"
              style={{ opacity: 0 }}
            >
              {slot.type ? itemGlyph(slot.type) : null}
            </div>
          ))}

          {/* ambient sparkles */}
          {[0, 1, 2].map((i) => (
            <span
              key={`s${i}`}
              className="absolute text-[var(--accent-2)]/60 pointer-events-none anim-hint-pulse"
              style={{ left: `${8 + i * 30}%`, top: `${20 + i * 22}%`, animationDelay: `${i * 0.7}s` }}
            >
              <SparkleGlyph size={14} />
            </span>
          ))}

          {/* the ship — lane glide via CSS transition */}
          <div
            ref={shipRef}
            className="absolute bottom-3 pointer-events-none will-change-transform"
            style={{
              transform: `translate3d(calc(${((lane + 0.5) / LANES) * 100}% - 24px), 0, 0)`,
              transition: 'transform 0.19s cubic-bezier(0.2, 0.9, 0.3, 1.2)',
            }}
          >
            <div
              style={{
                filter: shielded ? 'drop-shadow(0 0 10px rgba(140,214,255,.9))' : undefined,
                transform: 'rotate(6deg) scale(0.92)',
                transformOrigin: '50% 80%',
              }}
            >
              <ShipGlyph size={48} />
            </div>
          </div>
        </div>

        {/* big 44px+ lane buttons */}
        <div className="shrink-0 grid grid-cols-2 gap-2 px-2 py-2 bg-[var(--bg-soft)]/60 border-t border-[var(--border)]" style={{ touchAction: 'none' }}>
          <button
            type="button"
            aria-label="Сол жол"
            className="h-[52px] rounded-2xl bg-[var(--bg-card)] border border-[var(--border)] text-[var(--accent)] font-bold text-2xl active:scale-95 active:bg-[var(--accent)]/15 transition"
            onClick={() => askLane(laneRef.current - 1)}
          >
            ←
          </button>
          <button
            type="button"
            aria-label="Оң жол"
            className="h-[52px] rounded-2xl bg-[var(--bg-card)] border border-[var(--border)] text-[var(--accent)] font-bold text-2xl active:scale-95 active:bg-[var(--accent)]/15 transition"
            onClick={() => askLane(laneRef.current + 1)}
          >
            →
          </button>
        </div>
      </div>
    </GameShell>
  );
};
