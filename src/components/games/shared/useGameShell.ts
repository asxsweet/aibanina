// The shared brain behind every game: countdown → playing → (pause) → result.
//
// Games own their rules (score, lives, endings) but delegate everything that
// must behave identically in all six games to this hook:
//   * the 3 → 2 → 1 → Баста! countdown
//   * automatic pause when the phone hides (Page Visibility)
//   * pause-respecting round duration (record time never grows in pause)
//   * a unique roundId per round + the offline-safe record submission
//   * the unified result window data (own record / partner record / gaps)

import { useCallback, useEffect, useRef, useState } from 'react';
import type { GameId, GameOutcome, GameResultView, RoundMetrics } from '../../gameTypes';
import { newRoundId, postRoundOnce, type RoundResponse } from '../../../utils/records';
import { gameAudio } from '../../../utils/gameSound';
import type { DifficultyName } from '../../../utils/constellationUtils';

export type ShellPhase = 'idle' | 'countdown' | 'playing' | 'paused' | 'over';

export type HeadlineMetric = 'score' | 'lowSec' | 'lowMs';

export interface EndRoundPayload {
  scoreValue: number;
  metricValue?: number; // override the comparable value (avg ms, solve time)
  moves?: number;
  metrics?: RoundMetrics;
}

export interface UseGameShellOptions {
  gameId: GameId;
  difficulty: DifficultyName;
  metric: HeadlineMetric;
  /** A round counts as a "bonus replay" (no daily star, small stardust)
   *  whenever the daily star was already claimed today. */
  playedToday: boolean;
  /** Runs when a new round starts (before the countdown) — reset state here. */
  onBeforeStart?: () => void;
  /** Fired once when the round ends, for stardust / daily tasks. */
  onRoundEnd?: (info: { outcome: GameOutcome; bonus: boolean; metrics: RoundMetrics }) => void;
}

export interface ShellApi {
  phase: ShellPhase;
  countdownStep: number | null; // 3, 2, 1, then 0 = «Баста!»
  outcome: GameOutcome | null;
  bonusMode: boolean;
  result: GameResultView | null;
  startRound: () => void;
  endRound: (outcome: GameOutcome, payload?: EndRoundPayload) => void;
  pause: () => void;
  resume: () => void;
  restart: () => void;
  /** Ref-check for RAF loops — true only while the countdown is done and the round is live. */
  playingRef: { current: boolean };
}

function fmtInt(n: number): string {
  try {
    return Math.round(n).toLocaleString('kk-KZ');
  } catch {
    return String(Math.round(n));
  }
}

export function fmtHeadline(metric: HeadlineMetric, value: number): string {
  if (metric === 'lowMs') return `${fmtInt(value)} мс`;
  if (metric === 'lowSec') return `${(value / 1000).toFixed(1)} с`;
  return `${fmtInt(value)} ұпай`;
}

export function fmtHeadlineLabel(metric: HeadlineMetric): string {
  return metric === 'score' ? 'ұпай' : metric === 'lowMs' ? 'орташа реакция' : 'уақыт';
}

export function betterThan(metric: HeadlineMetric, mine: number, theirs: number): boolean {
  return metric === 'score' ? mine > theirs : mine < theirs;
}

export function gapText(metric: HeadlineMetric, mine: number, theirs: number): string {
  if (metric === 'score') {
    const diff = Math.round(mine - theirs);
    return diff >= 0
      ? `Сен ${fmtInt(diff)} ұпайға алдасың`
      : `Серіктес ${fmtInt(-diff)} ұпайға алда`;
  }
  if (metric === 'lowSec') {
    const diff = (mine - theirs) / 1000;
    return diff <= 0
      ? `Сен ${Math.abs(diff).toFixed(1)} с тезсің`
      : `Серіктес ${diff.toFixed(1)} с тез`;
  }
  const diff = Math.round(mine - theirs);
  return diff <= 0
    ? `Сен ${fmtInt(-diff)} мс тезсің`
    : `Серіктес ${fmtInt(diff)} мс тез`;
}

export function useGameShell(options: UseGameShellOptions): ShellApi {
  const { gameId, difficulty, metric, onBeforeStart, onRoundEnd } = options;
  const [phase, setPhase] = useState<ShellPhase>('idle');
  const [countdownStep, setCountdownStep] = useState<number | null>(null);
  const [outcome, setOutcome] = useState<GameOutcome | null>(null);
  const [bonusMode, setBonusMode] = useState(false);
  const [result, setResult] = useState<GameResultView | null>(null);

  const playingRef = useRef(false);
  const timeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const startedAtRef = useRef(0);
  const pausedTotalRef = useRef(0);
  const pauseStartRef = useRef(0);
  const roundIdRef = useRef('');
  const bonusRef = useRef(false);
  const optsRef = useRef(options);
  optsRef.current = options;

  const clearCountdown = useCallback(() => {
    timeoutsRef.current.forEach(clearTimeout);
    timeoutsRef.current = [];
  }, []);

  useEffect(
    () => () => {
      // Component closed mid-countdown: clear every pending tick.
      clearCountdown();
      playingRef.current = false;
    },
    [clearCountdown]
  );

  const runCountdown = useCallback((isBonus: boolean) => {
    clearCountdown();
    setCountdownStep(3);
    const schedule = (fn: () => void, ms: number) => {
      timeoutsRef.current.push(setTimeout(fn, ms));
    };
    for (let step = 2; step >= 1; step--) {
      schedule(() => setCountdownStep(step), (3 - step) * 700);
    }
    schedule(() => {
      setCountdownStep(0); // «Баста!»
      gameAudio.play('start');
    }, 2100);
    schedule(() => {
      setCountdownStep(null);
      setPhase('playing');
      playingRef.current = true;
      startedAtRef.current = Date.now();
      pausedTotalRef.current = 0;
    }, 2700);
  }, [clearCountdown]);

  const startRound = useCallback(() => {
    clearCountdown();
    const isBonus = optsRef.current.playedToday;
    bonusRef.current = isBonus;
    setBonusMode(isBonus);
    setOutcome(null);
    setResult(null);
    gameAudio.unlock();
    gameAudio.play('button');
    optsRef.current.onBeforeStart?.();
    setPhase('countdown');
    runCountdown(isBonus);
  }, [clearCountdown, runCountdown]);

  const pause = useCallback(() => {
    setPhase((prev) => {
      if (prev !== 'playing') return prev;
      playingRef.current = false;
      pauseStartRef.current = Date.now();
      return 'paused';
    });
  }, []);

  const resume = useCallback(() => {
    setPhase((prev) => {
      if (prev !== 'paused') return prev;
      if (pauseStartRef.current) {
        pausedTotalRef.current += Date.now() - pauseStartRef.current;
        pauseStartRef.current = 0;
      }
      playingRef.current = true;
      return 'playing';
    });
  }, []);

  // Automatic pause when the browser/app goes to the background. On return the
  // player lands on the pause panel and chooses «Жалғастыру» or «Қайта бастау».
  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') {
        setPhase((prev) => {
          if (prev !== 'playing') return prev;
          playingRef.current = false;
          pauseStartRef.current = Date.now();
          return 'paused';
        });
      }
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, []);

  const restart = useCallback(() => {
    // Fresh round keeps the bonus flag of the current session.
    clearCountdown();
    setOutcome(null);
    setResult(null);
    gameAudio.play('button');
    optsRef.current.onBeforeStart?.();
    setPhase('countdown');
    runCountdown(bonusRef.current);
  }, [clearCountdown, runCountdown]);

  const endRound = useCallback(
    (endOutcome: GameOutcome, payload: EndRoundPayload = { scoreValue: 0 }) => {
      if (!playingRef.current) return; // stale event (pause/already over)
      playingRef.current = false;
      clearCountdown();
      const finishedAt = Date.now();
      if (pauseStartRef.current) {
        pausedTotalRef.current += finishedAt - pauseStartRef.current;
        pauseStartRef.current = 0;
      }
      const durationMs = Math.max(0, finishedAt - startedAtRef.current - pausedTotalRef.current);
      const scoreValue = Math.max(0, Math.round(payload.scoreValue || 0));
      const metricValue =
        payload.metricValue !== undefined ? Math.max(0, Math.round(payload.metricValue)) : scoreValue;
      const moves = Math.max(0, Math.round(payload.moves || 0));
      const metrics: RoundMetrics = {
        score: scoreValue,
        ...(payload.metrics || {}),
      };

      setOutcome(endOutcome);
      setPhase('over');
      gameAudio.play(endOutcome === 'win' ? 'win' : 'miss');

      const info = optsRef.current;
      info.onRoundEnd?.({ outcome: endOutcome, bonus: bonusRef.current, metrics });

      // Optimistic result window; the server response refines it in place.
      setResult({
        outcome: endOutcome,
        headline: fmtHeadline(metric, metric === 'score' ? scoreValue : metricValue),
        headlineLabel: fmtHeadlineLabel(metric),
        isNewRecord: false,
        previousBest: null,
        rivalBest: null,
        gap: null,
        stats: [],
        pendingSync: false,
      });

      const roundId = roundIdRef.current || newRoundId();
      roundIdRef.current = roundId;
      void postRoundOnce({
        roundId,
        gameId,
        difficulty,
        startedAt: startedAtRef.current,
        finishedAt,
        durationMs,
        metric: metric === 'score' ? 'score' : 'time',
        metricValue: metric === 'score' ? scoreValue : metricValue,
        scoreValue,
        moves,
        result: endOutcome,
      }).then((res: RoundResponse | null) => {
        if (!res) {
          setResult((prev) => (prev ? { ...prev, pendingSync: true } : prev));
          return;
        }
        setResult((prev) => {
          if (!prev) return prev;
          const rivalValue = res.rival?.bestValue ?? null;
          return {
            ...prev,
            isNewRecord: endOutcome === 'win' && res.isRecord,
            previousBest: res.previousBest !== null ? fmtHeadline(metric, res.previousBest) : prev.previousBest,
            rivalBest: rivalValue !== null ? fmtHeadline(metric, rivalValue) : prev.rivalBest,
            gap: rivalValue !== null ? gapText(metric, metricValue, rivalValue) : prev.gap,
            stats: res.personal
              ? [
                  { label: 'Ойын саны', value: String(res.personal.plays) },
                  { label: 'Бүгін', value: String(res.personal.todayCount) },
                  { label: 'Осы апта', value: String(res.personal.weekCount) },
                ]
              : [],
          };
        });
        if (endOutcome === 'win' && res.isRecord) {
          gameAudio.play('record');
        }
      });
    },
    [gameId, difficulty, metric, clearCountdown]
  );

  return {
    phase,
    countdownStep,
    outcome,
    bonusMode,
    result,
    startRound,
    endRound,
    pause,
    resume,
    restart,
    playingRef,
  };
}
