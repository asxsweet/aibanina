import React, { useState, useMemo, useEffect } from 'react';
import { Shuffle, Heart, Grid3x3, Target, Music, Rabbit, Waves } from 'lucide-react';
import { MiniGame } from './MiniGame';
import { MemoryGame } from './games/MemoryGame';
import { ReactionGame } from './games/ReactionGame';
import { RhythmGame } from './games/RhythmGame';
import { JumpGame } from './games/JumpGame';
import { FlowGame } from './games/FlowGame';
import { ThemeName, DifficultyName } from '../utils/constellationUtils';
import { fetchGameSchedule } from '../utils/adminUtils';

export type GameId = 'catch' | 'memory' | 'reaction' | 'rhythm' | 'jump' | 'flow';

interface GameHubProps {
  theme: ThemeName;
  difficulty: DifficultyName;
  onSetDifficulty: (difficulty: DifficultyName) => void;
  playedToday: boolean;
  soundEnabled: boolean;
  onGameWin: (isBonus: boolean) => void;
  daysPlayed: number; // used to deterministically rotate the daily game
}

const GAME_ORDER: GameId[] = ['catch', 'memory', 'reaction', 'rhythm', 'jump', 'flow'];

const GAME_LABELS: Record<GameId, string> = {
  catch: 'Жүрек аулау',
  memory: 'Жұбын тап',
  reaction: 'Дәл тап',
  rhythm: 'Ырғаққа түс',
  jump: 'Секір және секір',
  flow: 'Ағысқа қарсы',
};

const GAME_ICONS: Record<GameId, React.ElementType> = {
  catch: Heart,
  memory: Grid3x3,
  reaction: Target,
  rhythm: Music,
  jump: Rabbit,
  flow: Waves,
};

export const GameHub: React.FC<GameHubProps> = ({
  theme,
  difficulty,
  onSetDifficulty,
  playedToday,
  soundEnabled,
  onGameWin,
  daysPlayed,
}) => {
  // The day's default game rotates deterministically through all six, so
  // every new day naturally brings a different game without repeating the
  // same one two days in a row — unless the admin pinned a specific game
  // to this day via the admin panel, which takes priority.
  const [scheduleOverrides, setScheduleOverrides] = useState<Record<number, string>>({});

  useEffect(() => {
    fetchGameSchedule()
      .then((list) => {
        const map: Record<number, string> = {};
        list.forEach((s) => { map[s.dayNumber] = s.gameId; });
        setScheduleOverrides(map);
      })
      .catch(() => {
        // non-critical — just falls back to the automatic rotation
      });
  }, []);

  const upcomingDay = Math.max(1, daysPlayed + 1);
  const scheduledGameId = scheduleOverrides[upcomingDay] as GameId | undefined;
  const rotationGameId = GAME_ORDER[Math.max(0, daysPlayed) % GAME_ORDER.length];
  const dailyGameId = scheduledGameId && GAME_ORDER.includes(scheduledGameId) ? scheduledGameId : rotationGameId;
  const [manualOverride, setManualOverride] = useState<GameId | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);

  const activeGameId = manualOverride || dailyGameId;

  const commonProps = {
    theme,
    difficulty,
    onSetDifficulty,
    playedToday,
    soundEnabled,
    onGameWin,
  };

  const activeGame = useMemo(() => {
    switch (activeGameId) {
      case 'memory':
        return <MemoryGame {...commonProps} />;
      case 'reaction':
        return <ReactionGame {...commonProps} />;
      case 'rhythm':
        return <RhythmGame {...commonProps} />;
      case 'jump':
        return <JumpGame {...commonProps} />;
      case 'flow':
        return <FlowGame {...commonProps} />;
      case 'catch':
      default:
        return <MiniGame {...commonProps} />;
    }
  }, [activeGameId, theme, difficulty, playedToday, soundEnabled, onGameWin]);

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
    </div>
  );
};
