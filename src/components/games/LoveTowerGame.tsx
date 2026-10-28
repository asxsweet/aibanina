// Махаббат мұнарасы (love tower) — the stacking classic, fully delta-timed.
//
// The hanging brick glides horizontally (position += speed × deltaTime), a tap
// drops it, the overlap with the tower top decides the new width, and the
// shaved-off slither falls away as a little chunk. ≥98% overlap is a Perfect
// Drop (combo chain, bonus points, sparkle sfx). The camera rises with the
// tower and the backdrop drifts ground → clouds → sky. Merê targets per
// difficulty; the daily task counts `perfects`.

import React, { useCallback, useMemo, useRef, useState } from 'react';
import { GameShell } from './shared/GameShell';
import { useGameShell } from './shared/useGameShell';
import { BlockGlyph, SparkleGlyph } from './shared/art';
import type { GameComponentProps, GameId } from '../gameTypes';
import type { DifficultyName } from '../../utils/constellationUtils';
import { gameAudio, buzz } from '../../utils/gameSound';
import { useRafLoop } from '../../utils/gameLoop';

const GAME_ID: GameId = 'love-tower';

interface Preset {
  targetFloors: number;
  speedPx: number; // base glide speed (grows a touch each floor)
  blockW: number; // starting width, % of the field
}

const PRESETS: Record<DifficultyName, Preset> = {
  easy: { targetFloors: 10, speedPx: 90, blockW: 60 },
  medium: { targetFloors: 14, speedPx: 125, blockW: 52 },
  hard: { targetFloors: 18, speedPx: 165, blockW: 44 },
};

const BLOCK_H = 30; // px
const PERFECT_PCT = 98;

interface StackBlock {
  x: number; // % of field
  w: number; // % of field
  perfect: boolean;
}

interface FallingChunk {
  x: number;
  w: number;
  key: number;
}

export const LoveTowerGame: React.FC<GameComponentProps> = ({
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
  const [floors, setFloors] = useState(0);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [blocks, setBlocks] = useState<StackBlock[]>([]);
  const [blockW, setBlockW] = useState(preset.blockW);
  const [chunks, setChunks] = useState<FallingChunk[]>([]);
  const [perfectFlash, setPerfectFlash] = useState(0);
  const [skyStage, setSkyStage] = useState(0); // 0 ground · 1 clouds · 2 sky

  // ── live data (refs) ───────────────────────────────────────────────────
  const fieldRef = useRef<HTMLDivElement>(null);
  const sliderRef = useRef<HTMLDivElement>(null);
  const xRef = useRef(2); // current hanging block x, % of field
  const dirRef = useRef(1);
  const topRef = useRef<StackBlock | null>(null); // the tower's topmost block
  const floorsRef = useRef(0);
  const scoreRef = useRef(0);
  const comboRef = useRef(0);
  const perfectsRef = useRef(0);
  const widthRef = useRef(preset.blockW);
  const endedRef = useRef(false);
  const presetRef = useRef(preset);
  presetRef.current = preset;
  const chunkKeyRef = useRef(1);

  const paint = useCallback((): void => {
    if (sliderRef.current) {
      sliderRef.current.style.transform = `translate3d(${xRef.current * (fieldRef.current?.clientWidth ?? 340) / 100}px, 0, 0)`;
    }
  }, []);

  const shell = useGameShell({
    gameId: GAME_ID,
    difficulty,
    metric: 'score',
    playedToday,
    onBeforeStart: useCallback(() => {
      const p = presetRef.current;
      xRef.current = 2;
      dirRef.current = 1;
      topRef.current = null;
      floorsRef.current = 0;
      scoreRef.current = 0;
      comboRef.current = 0;
      perfectsRef.current = 0;
      widthRef.current = p.blockW;
      endedRef.current = false;
      chunkKeyRef.current = 1;
      setFloors(0);
      setScore(0);
      setCombo(0);
      setBlocks([]);
      setBlockW(p.blockW);
      setChunks([]);
      setPerfectFlash(0);
      setSkyStage(0);
    }, []),
    onRoundEnd,
  });

  // ── glide loop (delta-time — identical feel at 60 and 120 Hz screens) ──
  const step = useCallback(
    (dtMs: number) => {
      if (endedRef.current) return;
      const field = fieldRef.current;
      const p = presetRef.current;
      const fieldW = field?.clientWidth ?? 340;
      const speed = (p.speedPx + floorsRef.current * 4) * (fieldW / 340); // px/s
      xRef.current += (dirRef.current * speed * dtMs) / 1000 / (fieldW / 100);
      const maxX = 97 - widthRef.current;
      if (xRef.current < 2) {
        xRef.current = 2;
        dirRef.current = 1;
      } else if (xRef.current > maxX) {
        xRef.current = maxX;
        dirRef.current = -1;
      }
      paint();
    },
    [paint]
  );

  useRafLoop(shell.phase === 'playing', step);

  // ── the drop ───────────────────────────────────────────────────────────
  const drop = useCallback(() => {
    if (!shell.playingRef.current || endedRef.current) return;
    const fieldW = fieldRef.current?.clientWidth ?? 340;
    const x = xRef.current;
    const w = widthRef.current;
    let overlap: number;
    if (!topRef.current) {
      overlap = w; // anywhere is fine for the foundation
    } else {
      const left = Math.max(topRef.current.x, x);
      const right = Math.min(topRef.current.x + topRef.current.w, x + w);
      overlap = right - left;
    }
    const pctOverlap = (overlap / w) * 100;

    if (pctOverlap <= 3) {
      // cut clean through — tower lost
      endedRef.current = true;
      gameAudio.play('miss');
      buzz([40, 60, 40]);
      setChunks((c) => [...c, { x, w, key: chunkKeyRef.current++ }]);
      shell.endRound('loss', {
        scoreValue: scoreRef.current,
        metrics: { perfects: perfectsRef.current },
      });
      return;
    }

    const isPerfect = pctOverlap >= PERFECT_PCT;
    const newX = topRef.current ? Math.max(topRef.current.x, x) : x;
    const landed: StackBlock = { x: newX, w: overlap, perfect: isPerfect };
    floorsRef.current += 1;
    topRef.current = landed;
    setFloors(floorsRef.current);
    setBlocks((prev) => [...prev.slice(-26), landed]); // keep a rolling window

    if (isPerfect) {
      comboRef.current += 1;
      perfectsRef.current += 1;
      scoreRef.current += 100 + comboRef.current * 20;
      gameAudio.play('perfect');
      buzz(18);
      setPerfectFlash((f) => f + 1);
      window.setTimeout(() => setPerfectFlash(0), 850);
    } else {
      comboRef.current = 0;
      scoreRef.current += Math.round(overlap * (100 / w));
      gameAudio.play('drop');
      buzz(8);
    }
    setScore(scoreRef.current);
    setCombo(comboRef.current > 1 ? comboRef.current : 0);

    // the shaved-off piece tumbles away
    if (pctOverlap < 100) {
      setChunks((c) => [...c.slice(-2), { x, w: w - overlap, key: chunkKeyRef.current++ }]);
      window.setTimeout(() => setChunks((c) => c.slice(1)), 900);
    }

    if (floorsRef.current >= presetRef.current.targetFloors && !endedRef.current) {
      endedRef.current = true;
      shell.endRound('win', {
        scoreValue: scoreRef.current,
        metrics: { perfects: perfectsRef.current },
      });
      return;
    }

    // reset the hanging block for the next floor
    xRef.current = 2;
    dirRef.current = 1;
    widthRef.current = overlap;
    setBlockW(overlap);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shell.playingRef, shell.endRound, paint]);

  // ── render ─────────────────────────────────────────────────────────────
  const floorsNow = floorsRef.current;
  const cameraY = Math.max(0, floorsNow * BLOCK_H - 260);
  const skyFor = useMemo(
    () => (floorsNow >= 9 ? 2 : floorsNow >= 4 ? 1 : 0),
    [floorsNow]
  );
  const sky = Math.max(skyFor, skyStage);

  const steps = useMemo(
    () => [
      'Блок сырғып келеді. Экранды бір бас: блок мұнараның басына түседі.',
      '98%-тен дәл түссе — Perfect Drop: комбо мен үлкен бонус. Болмаса блок жіңішкереді.',
      'Мұнарадан тыс түскен блок ойынды аяқтайды — таймингті сақта!',
    ],
    []
  );

  // sky stack height → backdrop layers opacity
  const groundOp = sky === 0 ? 0.9 : sky === 1 ? 0.3 : 0.06;
  const cloudOp = sky >= 1 ? 1 : 0;

  return (
    <GameShell
      gameId={GAME_ID}
      gameName="Махаббат мұнарасы"
      shell={shell}
      difficulty={difficulty}
      onSetDifficulty={onSetDifficulty}
      mission={{
        title: `${preset.targetFloors} қабат мұнара`,
        text: 'Екеуің үшін бірге мұнараны көтер! Дәл түсіру Perfect Drop комбинеретінін, ұпай — рекордын құрайды.',
        steps,
      }}
      hud={{
        score,
        targetScore: undefined,
        lives: undefined,
        timerSec: undefined,
        movesLabel: `${floors} қабат`,
        combo,
      }}
      recordsLine={recordsLine}
      taskLine={taskLine}
      rewardNote={rewardNote}
      onAnotherGame={onAnotherGame}
      onOpenLeaderboard={onOpenLeaderboard}
      onHome={onHome}
      heightClass="h-[460px] sm:h-[490px]"
    >
      <div
        ref={fieldRef}
        onClick={drop}
        onKeyDown={(e) => {
          if (e.key === ' ' || e.key === 'Enter') drop();
        }}
        role="button"
        tabIndex={0}
        className="absolute inset-0 overflow-hidden game-field cursor-pointer outline-none"
        style={{ touchAction: 'none' }}
      >
        {/* backdrop layers: ground → clouds → sky */}
        <div
          className="absolute inset-0 pointer-events-none transition-opacity duration-1000"
          style={{
            opacity: groundOp,
            background: 'linear-gradient(to top, var(--accent-2, #C97B8C) 0%, transparent 42%)',
          }}
        />
        <div
          className="absolute inset-0 pointer-events-none transition-opacity duration-1000"
          style={{ opacity: cloudOp }}
        >
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="absolute rounded-full bg-white/25 blur-[2px]"
              style={{
                width: 90 + i * 26,
                height: 26 + i * 6,
                left: `${8 + i * 27}%`,
                top: `${14 + i * 12}%`,
              }}
            />
          ))}
        </div>

        {/* floored stack + hanging block, camera-lifted */}
        <div
          className="absolute left-0 right-0 will-change-transform"
          style={{
            bottom: 26,
            transform: `translateY(-${cameraY}px)`,
            transition: 'transform 0.5s ease-out',
          }}
        >
          {/* the riding landing pad */}
          <div className="absolute left-[14%] right-[14%] h-[6px] rounded-full bg-[var(--text-muted)]/30 -bottom-[8px]" />

          {/* landed blocks (rolling window) */}
          {blocks.map((b, i) => (
            <div
              key={i}
              className="absolute left-0 will-change-transform"
              style={{
                bottom: i * BLOCK_H,
                width: `${b.w}%`,
                transform: `translateX(${(b.x / 100) * (fieldRef.current?.clientWidth ?? 340)}px)`,
              }}
            >
              <BlockGlyph width="100%" height={BLOCK_H - 4} perfect={b.perfect} />
            </div>
          ))}

          {/* the hanging, gliding block */}
          <div
            className="absolute left-0 will-change-transform"
            style={{ bottom: blocks.length * BLOCK_H, width: `${blockW}%` }}
          >
            <div ref={sliderRef} className="relative">
              <BlockGlyph width="100%" height={BLOCK_H - 4} />
            </div>
          </div>
        </div>

        {/* falling cut chunks */}
        {chunks.map((c) => (
          <div
            key={c.key}
            className="absolute left-0 pointer-events-none"
            style={{
              width: `${c.w}%`,
              transform: `translateX(${(c.x / 100) * (fieldRef.current?.clientWidth ?? 340)}px)`,
              bottom: 26 + blocks.length * BLOCK_H,
            }}
          >
            <div
              className="anim-chunk-fall"
              style={{
                width: '100%',
                opacity: 0.85,
                transformOrigin: '50% 0',
              }}
            >
              <BlockGlyph width="100%" height={BLOCK_H - 4} className="opacity-90" />
            </div>
          </div>
        ))}

        {/* perfect drop flash */}
        {perfectFlash > 0 && (
          <div key={perfectFlash} className="absolute inset-0 pointer-events-none flex items-center justify-center">
            <span className="anim-combo-pop text-[var(--accent)] font-black text-xl drop-shadow-[0_0_16px_var(--accent-glow-strong)] flex items-center gap-1.5">
              <SparkleGlyph size={18} /> PERFECT!
            </span>
          </div>
        )}

        <div className="absolute bottom-0 left-0 right-0 text-center text-[9px] uppercase tracking-wider text-[var(--text-faint)] pointer-events-none pb-0.5">
          Бір түртін — бір блок · тайминг маңызды
        </div>
      </div>
    </GameShell>
  );
};
