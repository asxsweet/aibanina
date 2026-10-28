// Жүрек аулау (catch) — hearts fall, the catcher follows the finger.
//
// Rewrite notes: everything runs on ONE requestAnimationFrame loop with delta
// time; entities live in refs and paint through transform-only updates.
// New items: gold (+25), frost (slow-mo), magnet, broken-heart obstacle; a
// combo multiplier; lives; a time budget per round; three difficulty presets.

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { GameShell } from './shared/GameShell';
import { useGameShell } from './shared/useGameShell';
import {
  HeartGlyph,
  GoldHeartGlyph,
  FrostHeartGlyph,
  BrokenHeartGlyph,
  MagnetGlyph,
  BasketGlyph,
  SparkleGlyph,
} from './shared/art';
import type { GameComponentProps, GameId } from '../gameTypes';
import type { DifficultyName } from '../../utils/constellationUtils';
import { gameAudio, buzz } from '../../utils/gameSound';
import { useRafLoop } from '../../utils/gameLoop';

const GAME_ID: GameId = 'catch';

interface Preset {
  roundSec: number;
  targetHearts: number;
  spawnMs: number;
  speedMin: number; // px per second
  speedMax: number;
  lives: number;
  // weights of the spawn table
  table: Array<{ type: ItemType; weight: number }>;
  missCostsLife: boolean;
}

type ItemType = 'heart' | 'gold' | 'frost' | 'magnet' | 'broken';

const PRESETS: Record<DifficultyName, Preset> = {
  easy: {
    roundSec: 45,
    targetHearts: 12,
    spawnMs: 900,
    speedMin: 55,
    speedMax: 95,
    lives: 3,
    table: [
      { type: 'heart', weight: 62 },
      { type: 'gold', weight: 8 },
      { type: 'frost', weight: 8 },
      { type: 'magnet', weight: 6 },
      { type: 'broken', weight: 16 },
    ],
    missCostsLife: false,
  },
  medium: {
    roundSec: 40,
    targetHearts: 16,
    spawnMs: 750,
    speedMin: 75,
    speedMax: 125,
    lives: 3,
    table: [
      { type: 'heart', weight: 54 },
      { type: 'gold', weight: 8 },
      { type: 'frost', weight: 8 },
      { type: 'magnet', weight: 6 },
      { type: 'broken', weight: 24 },
    ],
    missCostsLife: true,
  },
  hard: {
    roundSec: 35,
    targetHearts: 20,
    spawnMs: 600,
    speedMin: 95,
    speedMax: 150,
    lives: 3,
    table: [
      { type: 'heart', weight: 46 },
      { type: 'gold', weight: 7 },
      { type: 'frost', weight: 7 },
      { type: 'magnet', weight: 6 },
      { type: 'broken', weight: 34 },
    ],
    missCostsLife: true,
  },
};

const ITEM_SIZE: Record<ItemType, number> = { heart: 34, gold: 38, frost: 34, magnet: 34, broken: 36 };
const BASE_POINTS: Record<ItemType, number> = { heart: 10, gold: 25, frost: 5, magnet: 5, broken: 0 };

interface FallingItem {
  id: number;
  type: ItemType;
  xPct: number; // 4..96
  yPx: number;
  speed: number; // px/s
  active: boolean;
}

interface VisualSlot {
  type: ItemType | null;
  key: number;
}

const POOL = 9;
const PARTICLE_POOL = 10;
const FLOAT_POOL = 4;

// The spawn logic needs pre-allocated inactive slots — otherwise items.current
// starts empty, findIndex() returns -1 and nothing ever falls.
const emptyItem = (): FallingItem => ({ id: 0, type: 'heart', xPct: 50, yPx: 0, speed: 0, active: false });
const freshPool = (): FallingItem[] => Array.from({ length: POOL }, emptyItem);

export const CatchGame: React.FC<GameComponentProps> = ({
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

  // ── HUD-facing state (updated sparingly) ────────────────────────────────
  const [hearts, setHearts] = useState(0);
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(preset.lives);
  const [combo, setCombo] = useState(0);
  const [timeSec, setTimeSec] = useState(preset.roundSec);
  const [slots, setSlots] = useState<VisualSlot[]>(() =>
    Array.from({ length: POOL }, () => ({ type: null, key: 0 }))
  );
  const [slowActive, setSlowActive] = useState(false);
  const [shake, setShake] = useState(0);

  // ── live game data (refs only) ──────────────────────────────────────────
  const fieldRef = useRef<HTMLDivElement>(null);
  const catcherRef = useRef<HTMLDivElement>(null);
  const itemEls = useRef<(HTMLDivElement | null)[]>([]);
  const sparkleEls = useRef<(HTMLSpanElement | null)[]>([]);
  const floatEls = useRef<(HTMLSpanElement | null)[]>([]);
  const catcherXPct = useRef(50);
  const items = useRef<FallingItem[]>([]);
  const heartsRef = useRef(0);
  const scoreRef = useRef(0);
  const livesRef = useRef(preset.lives);
  const comboRef = useRef(0);
  const timeLeftRef = useRef(preset.roundSec * 1000);
  const lastSecRef = useRef(preset.roundSec);
  const slowUntilRef = useRef(0);
  const magnetUntilRef = useRef(0);
  const spawnAccRef = useRef(0);
  const nextIdRef = useRef(1);
  const slowActiveRef = useRef(false);
  const particles = useRef(
    Array.from({ length: PARTICLE_POOL }, () => ({ active: false, x: 0, y: 0, vx: 0, vy: 0, life: 0, warm: false }))
  );
  const floats = useRef(
    Array.from({ length: FLOAT_POOL }, () => ({ active: false, x: 0, y: 0, life: 0, text: '' }))
  );
  const presetRef = useRef(preset);
  presetRef.current = preset;
  const resetPool = useCallback(() => {
    items.current = freshPool(); // economically reuses the same static pool
  }, []);

  const shell = useGameShell({
    gameId: GAME_ID,
    difficulty,
    metric: 'score',
    playedToday,
    onBeforeStart: useCallback(() => {
      heartsRef.current = 0;
      scoreRef.current = 0;
      livesRef.current = presetRef.current.lives;
      comboRef.current = 0;
      timeLeftRef.current = presetRef.current.roundSec * 1000;
      lastSecRef.current = presetRef.current.roundSec;
      slowUntilRef.current = 0;
      magnetUntilRef.current = 0;
      spawnAccRef.current = 0;
      resetPool();
      nextIdRef.current = 1;
      particles.current.forEach((p) => (p.active = false));
      floats.current.forEach((f) => (f.active = false));
      catcherXPct.current = 50;
      setHearts(0);
      setScore(0);
      setLives(presetRef.current.lives);
      setCombo(0);
      setTimeSec(presetRef.current.roundSec);
      setSlowActive(false);
      setSlots(Array.from({ length: POOL }, () => ({ type: null, key: 0 })));
    }, []),
    onRoundEnd,
  });

  // ── spawning ────────────────────────────────────────────────────────────
  const spawn = useCallback(() => {
    const p = presetRef.current;
    const total = p.table.reduce((s, t) => s + t.weight, 0);
    let roll = Math.random() * total;
    let type: ItemType = 'heart';
    for (const t of p.table) {
      roll -= t.weight;
      if (roll <= 0) {
        type = t.type;
        break;
      }
    }
    const free = items.current.findIndex((it) => !it.active);
    const item: FallingItem = {
      id: nextIdRef.current++,
      type,
      xPct: 6 + Math.random() * 88,
      yPx: -40,
      speed: p.speedMin + Math.random() * (p.speedMax - p.speedMin),
      active: true,
    };
    if (free >= 0) {
      items.current[free] = item;
      setSlots((prev) => {
        if (prev[free].key === item.id && prev[free].type === type) return prev;
        const next = [...prev];
        next[free] = { type, key: item.id };
        return next;
      });
    }
  }, []);

  // ── helpers ─────────────────────────────────────────────────────────────
  const burstParticles = useCallback((xPct: number, yPx: number, warm: boolean) => {
    for (const p of particles.current) {
      if (p.active) continue;
      p.active = true;
      p.x = xPct;
      p.y = yPx;
      const a = Math.random() * Math.PI * 2;
      const sp = 40 + Math.random() * 90;
      p.vx = Math.cos(a) * sp;
      p.vy = Math.sin(a) * sp - 40;
      p.life = 1;
      p.warm = warm; // touches the colour of the burst
      break;
    }
  }, []);

  const popFloat = useCallback((xPct: number, yPx: number, text: string) => {
    for (const f of floats.current) {
      if (f.active) continue;
      f.active = true;
      f.x = xPct;
      f.y = yPx;
      f.life = 1;
      f.text = text;
      break;
    }
  }, []);

  const loseLife = useCallback((soft: boolean) => {
    livesRef.current = Math.max(0, livesRef.current - 1);
    setLives(livesRef.current);
    comboRef.current = 0;
    setCombo(0);
    setShake((s) => s + 1);
    buzz(soft ? 20 : [18, 40, 18]);
    if (livesRef.current === 0) {
      shell.endRound('loss', { scoreValue: scoreRef.current });
    }
  }, [shell]);

  // ── the one and only game loop ──────────────────────────────────────────
  const step = useCallback(
    (dtMs: number, now: number) => {
      const p = presetRef.current;
      const dt = Math.min(dtMs, 80) / 1000;
      const field = fieldRef.current;
      if (!field) return;

      // clock
      timeLeftRef.current -= dtMs;
      const sec = Math.max(0, Math.ceil(timeLeftRef.current / 1000));
      if (sec !== lastSecRef.current) {
        lastSecRef.current = sec;
        setTimeSec(sec);
      }
      if (timeLeftRef.current <= 0) {
        const win = heartsRef.current >= p.targetHearts;
        shell.endRound(win ? 'win' : 'loss', { scoreValue: scoreRef.current, metrics: { score: scoreRef.current } });
        return;
      }
      const fieldW = field.clientWidth;
      const fieldH = field.clientHeight;
      const catcherPx = (catcherXPct.current / 100) * fieldW;
      const catcherY = fieldH - 40;
      const slow = now < slowUntilRef.current ? 0.45 : 1;

      // spawn pacing
      spawnAccRef.current += dtMs;
      if (spawnAccRef.current >= p.spawnMs) {
        spawnAccRef.current = 0;
        spawn();
      }

      // effects
      const slowNow = now < slowUntilRef.current;
      // combo glow escalation is CSS-driven through data attribute
      if (field.dataset.combo !== String(Math.min(3, Math.floor(comboRef.current / 3)))) {
        field.dataset.combo = String(Math.min(3, Math.floor(comboRef.current / 3)));
      }

      // items
      const remaining: { idx: number; item: FallingItem }[] = [];
      for (let i = 0; i < items.current.length; i++) {
        const it = items.current[i];
        if (!it || !it.active) continue;
        let xPct = it.xPct;
        // magnet pulls collectibles toward the catcher
        if (now < magnetUntilRef.current && it.type !== 'broken') {
          xPct += ((catcherXPct.current - xPct) * Math.min(1, dt * 3.2));
        }
        const yPx = it.yPx + it.speed * dt * slow;
        const caught =
          yPx > catcherY - 30 &&
          yPx < catcherY + 26 &&
          Math.abs(((xPct / 100) * fieldW - catcherPx)) < 34;
        const escaped = yPx > fieldH + 40;
        if (escaped && (it.type === 'heart' || it.type === 'gold') && presetRef.current.missCostsLife) {
          loseLife(true);
        } else if (escaped && (it.type === 'heart' || it.type === 'gold')) {
          comboRef.current = 0;
          setCombo(0);
        }
        if (caught) {
          it.active = false;
          if (it.type === 'broken') {
            gameAudio.play('error');
            loseLife(false);
          } else {
            const comboN = comboRef.current + 1;
            comboRef.current = comboN;
            setCombo(comboN);
            const mult = 1 + Math.min(2, Math.floor(comboN / 4)); // ×1 … ×3
            const points = BASE_POINTS[it.type] * mult;
            scoreRef.current += points;
            setScore(scoreRef.current);
            popFloat(xPct, yPx, `+${points}`);
            burstParticles(xPct, yPx, it.type === 'gold' || it.type === 'heart');
            if (it.type === 'gold') {
              gameAudio.play('gold');
              heartsRef.current += 1;
              setHearts(heartsRef.current);
            } else if (comboN > 1 && comboN % 3 === 0) {
              gameAudio.play('combo', { combo: comboN });
            } else {
              gameAudio.play('point');
            }
            if (it.type === 'heart') {
              heartsRef.current += 1;
              setHearts(heartsRef.current);
            }
            if (it.type === 'frost') {
              slowUntilRef.current = now + 2600;
              slowActiveRef.current = true;
              setSlowActive(true);
            }
            if (it.type === 'magnet') magnetUntilRef.current = now + 4000;
            if (heartsRef.current >= p.targetHearts && livesRef.current > 0) {
              shell.endRound('win', { scoreValue: scoreRef.current, metrics: { score: scoreRef.current } });
              return;
            }
          }
        } else if (!escaped) {
          remaining.push({ idx: i, item: { ...it, xPct, yPx } });
        } else {
          it.active = false;
        }
      }
      // write back positions for survivors
      for (const { idx, item } of remaining) {
        items.current[idx] = item;
      }

      // paint items (transform-only)
      for (let i = 0; i < POOL; i++) {
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
        // x is % of the field width, y is px — both in one translate3d:
        el.style.transform = `translate3d(${(it.xPct / 100) * fieldW}px, ${it.yPx}px, 0)`;
      }

      // catcher
      if (catcherRef.current) {
        catcherRef.current.style.transform = `translate3d(calc(${catcherXPct.current}% - 32px), 0, 0)`;
      }

      // particles (DOM paints)
      for (let i = 0; i < PARTICLE_POOL; i++) {
        const pr = particles.current[i];
        const el = sparkleEls.current[i];
        if (!el) continue;
        if (!pr.active) continue;
        pr.x += (pr.vx / fieldW) * 100 * dt;
        pr.y += pr.vy * dt;
        pr.vy += 160 * dt;
        pr.life -= dt * 1.6;
        el.style.color = pr.warm ? '#F4B942' : '#E5484D';
        if (pr.life <= 0) {
          pr.active = false;
          el.style.opacity = '0';
          continue;
        }
        el.style.opacity = String(Math.max(0, pr.life));
        el.style.transform = `translate3d(${(pr.x / 100) * fieldW}px, ${pr.y}px, 0) scale(${0.6 + pr.life * 0.6})`;
      }

      // floating +points
      for (let i = 0; i < FLOAT_POOL; i++) {
        const f = floats.current[i];
        const el = floatEls.current[i];
        if (!el) continue;
        if (!f.active) continue;
        f.y -= 46 * dt;
        f.life -= dt * 1.4;
        if (f.life <= 0) {
          f.active = false;
          el.style.opacity = '0';
          continue;
        }
        el.style.opacity = String(Math.min(1, f.life * 1.4));
        el.style.transform = `translate3d(${(f.x / 100) * fieldW}px, ${f.y}px, 0)`;
      }

      // slow-mo visual stuck check
      if (!slowNow && slowActiveRef.current) {
        slowActiveRef.current = false;
        setSlowActive(false);
      }
      if (slowNow) slowActiveRef.current = true;
    },
    [spawn, shell]
  );

  // The loop only breathes while a round is actually live (paused/hidden = frozen).
  useRafLoop(shell.phase === 'playing', step);

  // ── controls ────────────────────────────────────────────────────────────
  useEffect(() => {
    const el = fieldRef.current;
    if (!el || shell.phase !== 'playing') return;
    const setFromClientX = (clientX: number) => {
      const rect = el.getBoundingClientRect();
      const pct = Math.max(4, Math.min(96, ((clientX - rect.left) / rect.width) * 100));
      catcherXPct.current = pct;
    };
    const onTouch = (e: TouchEvent) => {
      if (e.touches.length === 0) return;
      e.preventDefault();
      setFromClientX(e.touches[0].clientX);
    };
    const onPointer = (e: PointerEvent) => {
      if (e.pointerType === 'touch') return;
      setFromClientX(e.clientX);
    };
    el.addEventListener('touchmove', onTouch, { passive: false });
    el.addEventListener('touchstart', onTouch, { passive: false });
    el.addEventListener('pointermove', onPointer);
    el.addEventListener('mousedown', onPointer as EventListener);
    return () => {
      el.removeEventListener('touchmove', onTouch);
      el.removeEventListener('touchstart', onTouch);
      el.removeEventListener('pointermove', onPointer);
      el.removeEventListener('mousedown', onPointer as EventListener);
    };
  }, [shell.phase]);

  useEffect(() => {
    if (shell.phase !== 'playing') return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' || e.key === 'a') catcherXPct.current = Math.max(4, catcherXPct.current - 7);
      if (e.key === 'ArrowRight' || e.key === 'd') catcherXPct.current = Math.min(96, catcherXPct.current + 7);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [shell.phase]);

  // ── render ──────────────────────────────────────────────────────────────
  const itemGlyph = useCallback((type: ItemType) => {
    switch (type) {
      case 'gold':
        return <GoldHeartGlyph size={ITEM_SIZE.gold} />;
      case 'frost':
        return <FrostHeartGlyph size={ITEM_SIZE.frost} />;
      case 'magnet':
        return <MagnetGlyph size={ITEM_SIZE.magnet} />;
      case 'broken':
        return <BrokenHeartGlyph size={ITEM_SIZE.broken} />;
      default:
        return <HeartGlyph size={ITEM_SIZE.heart} />;
    }
  }, []);

  const steps = useMemo(
    () => [
      'Саусағыңмен немесе тышқанмен себетті солға-оңға жылжыт.',
      'Қызыл жүректер +10, алтын жүрек +25 ұпай; көк жүрек уақытты аздап медет, магнит жүректерді өзіне тартады.',
      'Сынған жүректен аулақ бол — ол өмірді алады. Жүректі өткізіп алсаң комбо нөлге түседі.',
    ],
    []
  );

  return (
    <GameShell
      gameId={GAME_ID}
      gameName="Жүрек аулау"
      shell={shell}
      difficulty={difficulty}
      onSetDifficulty={onSetDifficulty}
      mission={{
        title: `${preset.targetHearts} жүрек аула`,
        text: `Уақыт бітпей тұрып жүректерді жина. Әдемі комби жасасаң ұпай көбейеді!`,
        steps,
      }}
      hud={{
        score,
        targetScore: preset.targetHearts,
        lives: { max: preset.lives, current: lives },
        timerSec: timeSec,
        combo,
      }}
      recordsLine={recordsLine}
      taskLine={taskLine}
      rewardNote={rewardNote}
      onAnotherGame={onAnotherGame}
      onOpenLeaderboard={onOpenLeaderboard}
      onHome={onHome}
      heightClass="h-[450px] sm:h-[480px]"
    >
      <div
        ref={fieldRef}
        data-combo="0"
        className={`absolute inset-0 overflow-hidden bg-gradient-to-b from-[var(--bg-soft)]/40 to-[var(--accent)]/10 game-field ${
          shake > 0 && shell.phase === 'playing' ? 'anim-shake' : ''
        }`}
        style={{ touchAction: 'none' }}
      >
        {/* combo glow layer */}
        <div className="absolute inset-0 pointer-events-none combo-glow" />

        {/* slow-mo tint */}
        {slowActive && shell.phase === 'playing' && (
          <div className="absolute inset-0 pointer-events-none bg-[#5AB0E8]/10 anim-fade-in" />
        )}

        {/* falling items pool */}
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

        {/* particle pool */}
        {Array.from({ length: PARTICLE_POOL }).map((_, i) => (
          <span
            key={i}
            ref={(el) => {
              sparkleEls.current[i] = el;
            }}
            className="absolute left-0 top-0 text-[var(--accent)] pointer-events-none will-change-transform"
            style={{ opacity: 0 }}
          >
            <SparkleGlyph size={12} className="text-current" />
          </span>
        ))}

        {/* floating score pool */}
        {Array.from({ length: FLOAT_POOL }).map((_, i) => (
          <span
            key={i}
            ref={(el) => {
              floatEls.current[i] = el;
            }}
            className="absolute left-0 top-0 font-bold text-sm text-[var(--accent)] drop-shadow pointer-events-none will-change-transform"
            style={{ opacity: 0 }}
          />
        ))}

        {/* catcher */}
        <div
          ref={catcherRef}
          className="absolute bottom-1.5 left-0 pointer-events-none will-change-transform"
        >
          <BasketGlyph size={64} />
        </div>

        <div className="absolute bottom-0 left-0 right-0 text-center text-[9px] uppercase tracking-wider text-[var(--text-faint)] pointer-events-none pb-0.5">
          Басып-сүйреп жылжыт · жан-жаққа
        </div>
      </div>
    </GameShell>
  );
};
