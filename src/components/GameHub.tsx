// GameHub — the lobby of the six love games.
//
// Keeps the beloved rotation logic (a deterministic daily game + the admin's
// pinned overrides + the manual picker), and now hands every game the full
// shared contract: record lines (own best vs partner), the daily task line,
// the reward note, and the unified callbacks. The offline round queue's
// flusher is installed once here. Daily-task rewards flow through
// `onRewardClaimed` so the stardust counter stays in App.

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Shuffle, Heart, Grid3x3, Target, Rocket, Layers3, Gem } from 'lucide-react';
import { CatchGame } from './games/CatchGame';
import { MemoryGame } from './games/MemoryGame';
import { ReactionGame } from './games/ReactionGame';
import { StarRaceGame } from './games/StarRaceGame';
import { LoveTowerGame } from './games/LoveTowerGame';
import { Match3Game } from './games/Match3Game';
import { LeaderboardModal } from './LeaderboardModal';
import type { GameComponentProps, GameOutcome, GameId, RoundMetrics } from './gameTypes';
import type { DifficultyName, ThemeName } from '../utils/constellationUtils';
import { fetchGameSchedule } from '../utils/adminUtils';
import { fetchRoundSummary, installRoundQueueFlusher, type RoundSummary } from '../utils/records';
import { getDailyTaskProgress, reportTaskProgress, claimDailyTask } from '../utils/dailyTask';
import { getTodayDateString } from '../utils/constellationUtils';

export const GAME_ORDER: GameId[] = ['catch', 'memory', 'reaction', 'star-race', 'love-tower', 'match3'];

// Deterministic daily rotation (both partners land on the same game) plus
// the admin panel's pinned per-day overrides, which take priority.
// Shared with the home screen's "today's star" card so both always show
// the very same game of the day.
export function useDailyGameId(daysPlayed: number): GameId {
  const [scheduleOverrides, setScheduleOverrides] = useState<Record<number, string>>({});

  useEffect(() => {
    fetchGameSchedule()
      .then((list) => {
        const map: Record<number, string> = {};
        list.forEach((s) => {
          map[s.dayNumber] = s.gameId;
        });
        setScheduleOverrides(map);
      })
      .catch(() => {
        // non-critical — just falls back to the automatic rotation
      });
  }, []);

  const upcomingDay = Math.max(1, daysPlayed + 1);
  const scheduledGameId = scheduleOverrides[upcomingDay] as GameId | undefined;
  const rotationGameId = GAME_ORDER[Math.max(0, daysPlayed) % GAME_ORDER.length];
  return scheduledGameId && GAME_ORDER.includes(scheduledGameId) ? scheduledGameId : rotationGameId;
}

export interface GameHubProps {
  theme: ThemeName;
  difficulty: DifficultyName;
  onSetDifficulty: (difficulty: DifficultyName) => void;
  playedToday: boolean;
  daysPlayed: number; // used to deterministically rotate the daily game
  onGameWin: (isBonus: boolean) => void; // daily star / bonus stardust flow (App)
  /** Pays the one-time-per-day daily task reward (+7 stardust). */
  onRewardClaimed?: (stardust: number) => void;
  /** Result-screen «Негізгі бет» / pause «Басты бетке» buttons. */
  onHome: () => void;
  /** Bumping this number opens the game picker (the home card's «Ойынды ауыстыру»). */
  pickerSignal?: number;
}

export const GAME_LABELS: Record<GameId, string> = {
  catch: 'Жүрек аулау',
  memory: 'Жұбын тап',
  reaction: 'Дәл тап',
  'star-race': 'Жұлдызды жарыс',
  'love-tower': 'Махаббат мұнарасы',
  match3: 'Жұлдызды кристалдар',
};

const GAME_ICONS: Record<GameId, React.ElementType> = {
  catch: Heart,
  memory: Grid3x3,
  reaction: Target,
  'star-race': Rocket,
  'love-tower': Layers3,
  match3: Gem,
};

// Metric is game-bound (server whitelists per game): score games show raw
// points, timing games show the faster-the-better value.
function fmtMetricValue(metric: string, value: number): string {
  if (metric === 'score') return `${Math.round(value).toLocaleString('kk-KZ')} ұпай`;
  if (value >= 5000) return `${(value / 1000).toFixed(1)} с`;
  return `≈ ${Math.round(value)} мс`;
}

export const GameHub: React.FC<GameHubProps> = ({
  theme,
  difficulty,
  onSetDifficulty,
  playedToday,
  daysPlayed,
  onGameWin,
  onRewardClaimed,
  onHome,
  pickerSignal,
}) => {
  const dailyGameId = useDailyGameId(daysPlayed);

  const [pickerOpen, setPickerOpen] = useState(false);
  const [manualOverride, setManualOverride] = useState<GameId | null>(null);
  const [boardOpen, setBoardOpen] = useState(false);
  const [rewardNote, setRewardNote] = useState<string | null>(null);

  // «Ойынды ауыстыру» on the home card jumps here with the picker raised.
  useEffect(() => {
    if (pickerSignal && pickerSignal > 0) setPickerOpen(true);
  }, [pickerSignal]);

  const activeGameId = manualOverride || dailyGameId;

  // Offline round queue: one flusher per session, listening for online +
  // visibility events; rounds recorded while offline go out automatically.
  useEffect(() => {
    installRoundQueueFlusher();
  }, []);

  // ── record line (own best · partner's best) for the idle screen ──────
  const [summary, setSummary] = useState<RoundSummary | null>(null);
  useEffect(() => {
    let cancelled = false;
    setSummary(null);
    fetchRoundSummary(activeGameId, difficulty).then((s) => {
      if (cancelled) return;
      setSummary(s);
    });
    return () => {
      cancelled = true;
    };
  }, [activeGameId, difficulty, rewardNote]);

  const recordsText = useMemo(() => {
    if (!summary || summary.best === null) return null;
    const mine = `${fmtMetricValue(summary.metric, summary.best)}`;
    if (!summary.rival) return `Рекордың: ${mine}`;
    return `Сенікі: ${mine} · Серіктес (${summary.rival.name || 'ол'}): ${fmtMetricValue(
      summary.rival.metric,
      summary.rival.bestValue
    )}`;
  }, [summary]);

  // ── daily-task line ──────────────────────────────────────────────────
  const todayStr = getTodayDateString();
  const [taskPulse, setTaskPulse] = useState(0); // re-read after round ends
  const task = useMemo(() => getDailyTaskProgress(todayStr), [todayStr, taskPulse]);
  const taskText = useMemo(() => {
    if (task.task.gameId !== activeGameId) return null;
    const mark = task.done ? ' ✓ орындалды' : ` (${Math.max(0, task.best)}/${task.task.target})`;
    return `Күнделікті тапсырма: ${task.task.title}${mark} · +${task.task.reward} шаң`;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [task, activeGameId]);

  // ── round-end bridge: task progress → payment note → App's flow ──────
  const handleRoundEnd = useCallback(
    (gameId: GameId, info: { outcome: GameOutcome; bonus: boolean; metrics: RoundMetrics }) => {
      let note: string | null = null;
      const check = reportTaskProgress(todayStr, gameId, info.metrics);
      if (check.justCompleted) {
        claimDailyTask(todayStr);
        note = `Тапсырма орындалды: +${check.task.reward} жұлдызшен!`;
        onRewardClaimed?.(check.task.reward);
      }
      setTaskPulse((p) => p + 1);
      if (note) setRewardNote(note);
      onGameWin(info.bonus);
    },
    [todayStr, onGameWin, onRewardClaimed]
  );

  const onAnotherGame = useCallback(() => {
    setPickerOpen(true);
    setBoardOpen(true); // «Басқа ойын» → also raise the rival records table
  }, []);

  const commonProps: GameComponentProps = {
    theme,
    difficulty,
    onSetDifficulty,
    playedToday,
    recordsLine: recordsText,
    taskLine: taskText,
    rewardNote,
    onRoundEnd: (info) => handleRoundEnd(activeGameId, info),
    onAnotherGame,
    onOpenLeaderboard: () => setBoardOpen(true),
    onHome: () => {
      setRewardNote(null);
      onHome();
    },
  };

  const activeGame = useMemo(() => {
    switch (activeGameId) {
      case 'memory':
        return <MemoryGame {...commonProps} />;
      case 'reaction':
        return <ReactionGame {...commonProps} />;
      case 'star-race':
        return <StarRaceGame {...commonProps} />;
      case 'love-tower':
        return <LoveTowerGame {...commonProps} />;
      case 'match3':
        return <Match3Game {...commonProps} />;
      case 'catch':
      default:
        return <CatchGame {...commonProps} />;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeGameId, theme, difficulty, playedToday, recordsText, taskText, rewardNote, handleRoundEnd, onHome]);

  return (
    <div className="w-full max-w-lg mx-auto relative z-10 px-4">
      {/* Game picker toggle — lets you switch away from today's rotation game */}
      <div className="flex items-center justify-between mb-2 px-0.5">
        <span className="text-[11px] text-[var(--text-faint)] italic">
          Бүгінгі ойын: {GAME_LABELS[activeGameId]}
        </span>
        <button
          onClick={() => setPickerOpen((v) => !v)}
          className="flex items-center gap-1 text-[11px] font-semibold text-[var(--accent)] hover:text-[var(--accent-dark)] transition"
        >
          <Shuffle className="w-3.5 h-3.5" />
          Ойынды ауыстыру
        </button>
      </div>

      {pickerOpen && (
        <div className="grid grid-cols-3 gap-2 mb-3">
          {GAME_ORDER.map((id) => {
            const Icon = GAME_ICONS[id];
            const isActive = id === activeGameId;
            return (
              <button
                key={id}
                onClick={() => {
                  setManualOverride(id === dailyGameId ? null : id);
                  setRewardNote(null);
                  setPickerOpen(false);
                }}
                className={`flex flex-col items-center gap-1 py-2.5 rounded-2xl border text-[10px] font-semibold transition ${
                  isActive
                    ? 'bg-[var(--accent)] text-[var(--on-accent)] border-[var(--accent)]'
                    : 'bg-[var(--bg-card)] text-[var(--text-muted)] border-[var(--border)] hover:border-[var(--accent)]/40'
                }`}
              >
                <Icon className="w-4 h-4" />
                {GAME_LABELS[id]}
              </button>
            );
          })}
        </div>
      )}

      {activeGame}

      {boardOpen && <LeaderboardModal onClose={() => setBoardOpen(false)} />}
    </div>
  );
};
