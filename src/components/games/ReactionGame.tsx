// Дәл тап (reaction) — a multi-round reflex-meter, measured with
// performance.now(). The target appears after a random 1200–4000ms wait, and
// fake decoys flash during the wait to punish twitchy taps. The record is
// the AVERAGE round time (`lowMs`) — a single lucky burst can't hold the
// record; a slow round later in the game still pulls the average down.

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { GameShell } from './shared/GameShell';
import { useGameShell } from './shared/useGameShell';
import { HeartGlyph, GoldHeartGlyph, SparkleGlyph } from './shared/art';
import type { GameComponentProps, GameId } from '../gameTypes';
import type { DifficultyName } from '../../utils/constellationUtils';
import { gameAudio, buzz } from '../../utils/gameSound';

const GAME_ID: GameId = 'reaction';

interface Preset {
  rounds: number;
  waitMinMs: number;
  waitMaxMs: number;
  /** Rounds that vanish untapped cost a life (usually 2 misses → 3rd = out). */
  lives: number;
  /** ms before the live target expires (counts as a miss). */
  windowMs: number;
  /** Early-tap penalty added straight to that round's time. */
  earlyPenaltyMs: number;
}

const PRESETS: Record<DifficultyName, Preset> = {
  easy: { rounds: 5, waitMinMs: 1200, waitMaxMs: 3200, lives: 3, windowMs: 1600, earlyPenaltyMs: 250 },
  medium: { rounds: 7, waitMinMs: 1200, waitMaxMs: 3600, lives: 2, windowMs: 1250, earlyPenaltyMs: 300 },
  hard: { rounds: 10, waitMinMs: 1400, waitMaxMs: 4000, lives: 2, windowMs: 1000, earlyPenaltyMs: 350 },
};

/** decoy slots never sit on the true target spot; typed via index */
const DECOY_SPOTS = [
  { left: '20%', top: '24%' },
  { left: '74%', top: '58%' },
];

type Phase = 'waiting' | 'live' | 'between';

export const ReactionGame: React.FC<GameComponentProps> = ({
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
  const [round, setRound] = useState(0); // completed rounds
  const [fastRounds, setFastRounds] = useState(0);
  const [lives, setLives] = useState(preset.lives);
  const [targetPos, setTargetPos] = useState<{ left: string; top: string; key: number } | null>(null);
  const [decoy, setDecoy] = useState<{ left: string; top: string; key: number } | null>(null);
  const [flash, setFlash] = useState<{ text: string; key: number; bad?: boolean } | null>(null);
  const [shake, setShake] = useState(0);

  // ── live data (refs) ───────────────────────────────────────────────────
  const phaseRef = useRef<Phase>('between');
  const targetShownAtRef = useRef(0);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const timesRef = useRef<number[]>([]); // per-round reaction ms (early penalties included)
  const fastCountRef = useRef(0);
  const livesRef = useRef(preset.lives);
  const roundRef = useRef(0);
  const scoreRef = useRef(0);
  const keyRef = useRef(1);
  const endedRef = useRef(false);
  const wasPausedRef = useRef(false);
  const presetRef = useRef(preset);
  presetRef.current = preset;

  const clearTimers = useCallback(() => {
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
  }, []);

  const shell = useGameShell({
    gameId: GAME_ID,
    difficulty,
    metric: 'lowMs',
    playedToday,
    onBeforeStart: useCallback(() => {
      clearTimers();
      phaseRef.current = 'between';
      targetShownAtRef.current = 0;
      timesRef.current = [];
      fastCountRef.current = 0;
      livesRef.current = presetRef.current.lives;
      roundRef.current = 0;
      scoreRef.current = 0;
      endedRef.current = false;
      wasPausedRef.current = false;
      setRound(0);
      setFastRounds(0);
      setLives(presetRef.current.lives);
      setTargetPos(null);
      setDecoy(null);
      setFlash(null);
      setShake(0);
    }, [clearTimers]),
    onRoundEnd,
  });

  // ── round flow ─────────────────────────────────────────────────────────
  const scheduleNext = useCallback(
    (targetRound: number) => {
      const p = presetRef.current;
      clearTimers(); // replace any pending decoy/go timers — never double-fire
      // between: a silent decoy tease in the middle of the wait
      const wait = p.waitMinMs + Math.random() * (p.waitMaxMs - p.waitMinMs);
      phaseRef.current = 'between';
      setTargetPos(null);
      setDecoy(null);

      const decoyAt = wait * (0.3 + Math.random() * 0.3);
      const decoySpot = DECOY_SPOTS[Math.floor(Math.random() * DECOY_SPOTS.length)];
      timersRef.current.push(
        setTimeout(() => {
          if (!shell.playingRef.current) return;
          gameAudio.play('flip'); // a teaser tone, NOT the go tone
          setDecoy({ ...decoySpot, key: keyRef.current++ });
          timersRef.current.push(
            setTimeout(() => setDecoy(null), 320 + Math.random() * 260)
          );
        }, decoyAt)
      );

      timersRef.current.push(
        setTimeout(() => {
          if (!shell.playingRef.current) return;
          setDecoy(null);
          phaseRef.current = 'live';
          targetShownAtRef.current = performance.now();
          gameAudio.play('countdown');
          buzz(15);
          setTargetPos({
            left: `${12 + Math.random() * 76}%`,
            top: `${14 + Math.random() * 66}%`,
            key: keyRef.current++,
          });
          // expire window → miss
          timersRef.current.push(
            setTimeout(() => {
              if (!shell.playingRef.current || phaseRef.current !== 'live') return;
              phaseRef.current = 'between';
              setTargetPos(null);
              setFlash({ text: 'Өтіп кетті!', key: keyRef.current++, bad: true });
              miss();
            }, p.windowMs)
          );
        }, wait)
      );

      roundRef.current = targetRound;
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [shell.playingRef, clearTimers]
  );

  const miss = useCallback(() => {
    livesRef.current = Math.max(0, livesRef.current - 1);
    setLives(livesRef.current);
    setShake((s) => s + 1);
    gameAudio.play('error');
    buzz([18, 40, 18]);
    // penalized in the average too — no free misses
    timesRef.current.push(presetRef.current.windowMs);
    recordShown(presetRef.current.windowMs);
    if (livesRef.current === 0 && !endedRef.current) {
      endedRef.current = true;
      clearTimers();
      setTargetPos(null);
      finish('loss');
      return;
    }
    if (roundRef.current >= presetRef.current.rounds && !endedRef.current) {
      allDone();
      return;
    }
    scheduleNext(roundRef.current + 1);
  }, [clearTimers, scheduleNext]);

  const recordShown = (ms: number): void => {
    setRound(roundRef.current);
    void ms;
  };

  const allDone = useCallback(() => {
    endedRef.current = true;
    clearTimers();
    finish('win');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clearTimers]);

  const finish = (outcome: 'win' | 'loss'): void => {
    const list = timesRef.current.length ? timesRef.current : [presetRef.current.windowMs];
    const avg = Math.round(list.reduce((s, t) => s + t, 0) / list.length);
    const score = Math.max(0, list.reduce((s, t) => s + Math.max(0, 1600 - t), 0));
    setTargetPos(null);
    setDecoy(null);
    shell.endRound(outcome, {
      scoreValue: outcome === 'win' ? score : scoreRef.current,
      metricValue: avg,
      metrics: { fastRounds: fastCountRef.current, avgMs: avg },
    });
  };

  // One master effect: on entering `playing` (first kickoff or resume after a
  // pause) it (re)schedules the round flow; anything else kills timers and
  // hides targets. Two effects would race here, so this is deliberately the
  // single owner of the reaction timeline.
  useEffect(() => {
    if (shell.phase === 'playing' && !endedRef.current) {
      const started = roundRef.current > 0;
      const next = started ? Math.max(1, Math.min(presetRef.current.rounds, roundRef.current + 1)) : 1;
      scheduleNext(next);
      return;
    }
    clearTimers();
    phaseRef.current = 'between';
    setTargetPos(null);
    setDecoy(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shell.phase]);

  useEffect(() => clearTimers, [clearTimers]);

  const hitTarget = useCallback(
    (early: boolean) => {
      if (!shell.playingRef.current || endedRef.current) return;
      if (early || phaseRef.current !== 'live') {
        // early tap onto the field/decoy: «Асықпа!» + penalty
        setFlash({ text: 'Асықпа!', key: keyRef.current++, bad: true });
        setShake((s) => s + 1);
        gameAudio.play('miss');
        buzz([20, 60, 20]);
        if (phaseRef.current !== 'live') {
          timesRef.current.push(presetRef.current.earlyPenaltyMs);
          scoreRef.current = Math.max(0, scoreRef.current - 15);
          scheduleNext(roundRef.current + 1);
        }
        return;
      }
      // live → tapped
      phaseRef.current = 'between';
      const t = performance.now() - targetShownAtRef.current;
      timesRef.current.push(t);
      scoreRef.current += Math.max(0, Math.round(1600 - t));
      setTargetPos(null);
      setRound(roundRef.current);
      if (t < 700) {
        fastCountRef.current += 1;
        setFastRounds(fastCountRef.current);
      }
      setFlash({ text: `${Math.round(t)} мс`, key: keyRef.current++ });
      gameAudio.play(t < 700 ? 'gold' : 'point');
      buzz(10);
      if (roundRef.current >= presetRef.current.rounds && !endedRef.current) {
        allDone();
        return;
      }
      scheduleNext(roundRef.current + 1);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [shell.playingRef, scheduleNext]
  );

  // ── render ─────────────────────────────────────────────────────────────
  const steps = useMemo(
    () => [
      'Экран тыныш тұрады. Жүрек пайда болған сәтте ғана бас!',
      'Жалған жүректер жанады — соларға басу «Асықпа!» деген айыппен түседі.',
      'Рекорд — әр раундтың орташа уақыты. Жай ғана бір саусақпен ұстап тұрма!',
    ],
    []
  );

  const avgSoFar =
    timesRef.current.length > 0
      ? Math.round(timesRef.current.reduce((s, t) => s + t, 0) / timesRef.current.length)
      : null;

  return (
    <GameShell
      gameId={GAME_ID}
      gameName="Дәл тап"
      shell={shell}
      difficulty={difficulty}
      onSetDifficulty={onSetDifficulty}
      mission={{
        title: `${preset.rounds} раунд — және де бас жеткілікті`,
        text: 'Күттің, жүрек пайда болды — БАС! Орташа реакция уақытың рекордқа жазылады.',
        steps,
      }}
      hud={{
        score: round,
        targetScore: preset.rounds,
        lives: { max: preset.lives, current: lives },
        timerSec: undefined,
        combo: undefined,
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
        onClick={() => hitTarget(true)}
        className={`absolute inset-0 game-field bg-gradient-to-b from-[var(--bg-soft)]/30 to-[var(--accent)]/10 ${
          shake > 0 && shell.phase === 'playing' ? 'anim-shake' : ''
        }`}
        style={{ touchAction: 'none', cursor: 'crosshair' }}
      >
        {/* wait-stage breath hint */}
        {phaseRef.current === 'between' && !targetPos && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none">
            <span
              className="text-[var(--text-faint)] anim-idle-glow rounded-2xl px-4 py-2 border border-[var(--border)]/60 text-[11px] uppercase tracking-widest"
              style={{ animation: 'fadeIn .3s ease-out' }}
            >
              Күт…
            </span>
          </div>
        )}

        {/* decoy */}
        {decoy && shell.phase === 'playing' && (
          <button
            type="button"
            aria-label="Жалған жүрек — баспа"
            onClick={(e) => {
              e.stopPropagation();
              hitTarget(true);
            }}
            className="absolute -translate-x-1/2 -translate-y-1/2 opacity-45 pointer-events-auto"
            style={{ left: decoy.left, top: decoy.top }}
          >
            <HeartGlyph size={38} />
          </button>
        )}

        {/* the live target */}
        {targetPos && shell.phase === 'playing' && (
          <button
            type="button"
            aria-label="Бас!"
            onClick={(e) => {
              e.stopPropagation();
              hitTarget(false);
            }}
            key={targetPos.key}
            className="absolute -translate-x-1/2 -translate-y-1/2 anim-count-fast pointer-events-auto"
            style={{ left: targetPos.left, top: targetPos.top }}
          >
            <GoldHeartGlyph size={52} className="drop-shadow-[0_0_18px_var(--accent-glow-strong)]" />
          </button>
        )}

        {/* per-round flash line, e.g. 240 мс / Асықпа! */}
        {flash && (
          <div
            key={flash.key}
            className={`absolute left-1/2 top-[10%] -translate-x-1/2 text-lg font-bold anim-combo-pop pointer-events-none ${
              flash.bad ? 'text-[#E5484D]' : 'text-[var(--accent)]'
            }`}
          >
            {flash.text}
          </div>
        )}

        {/* running average, always visible */}
        {avgSoFar !== null && (
          <div className="absolute right-2 top-2 z-10 px-2.5 py-1 rounded-full bg-[var(--bg-elevated)]/85 border border-[var(--border)] text-[10px] font-semibold text-[var(--text-secondary)] tabular-nums pointer-events-none">
            Орташа: {avgSoFar} мс
          </div>
        )}

        {/* speed sparkle pool (cosmetic) */}
        {shell.phase === 'playing' &&
          [0, 1, 2, 3, 4, 5].map((i) => (
            <span
              key={i}
              className="absolute text-[var(--accent-2)]/70 pointer-events-none anim-hint-pulse"
              style={{
                left: `${6 + i * 17}%`,
                top: `${70 + (i % 3) * 9}%`,
                animationDelay: `${i * 0.4}s`,
              }}
            >
              <SparkleGlyph size={10} />
            </span>
          ))}

        {/* tap area caption */}
        <div className="absolute bottom-0 left-0 right-0 text-center text-[9px] uppercase tracking-wider text-[var(--text-faint)] pointer-events-none pb-0.5">
          Жүрек шыққанда — түртіп қана
        </div>
      </div>
    </GameShell>
  );
};
