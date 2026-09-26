import React, { useState, useEffect, useCallback, useRef } from 'react';
import { GameShell, GameStatus } from '../GameShell';
import { THEME_MEMORY_SYMBOLS } from '../../data/gameAssets';
import { soundFx } from '../../data/constants';
import { ThemeName, DifficultyName } from '../../utils/constellationUtils';
import { Timer } from 'lucide-react';

interface MemoryGameProps {
  theme?: ThemeName;
  difficulty?: DifficultyName;
  onSetDifficulty?: (difficulty: DifficultyName) => void;
  playedToday: boolean;
  soundEnabled: boolean;
  onGameWin: (isBonus: boolean) => void;
}

interface DifficultyConfig {
  pairs: number;
  timeLimit: number; // seconds
  cols: number;
}

const CONFIG: Record<DifficultyName, DifficultyConfig> = {
  easy: { pairs: 4, timeLimit: 60, cols: 4 },
  medium: { pairs: 6, timeLimit: 45, cols: 4 },
  hard: { pairs: 8, timeLimit: 35, cols: 4 },
};

interface Card {
  id: number;
  symbol: string;
  flipped: boolean;
  matched: boolean;
}

function buildDeck(symbols: string[], pairs: number): Card[] {
  const chosen = symbols.slice(0, pairs);
  const deck: Card[] = [...chosen, ...chosen].map((symbol, i) => ({
    id: i,
    symbol,
    flipped: false,
    matched: false,
  }));
  // Fisher-Yates shuffle
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

export const MemoryGame: React.FC<MemoryGameProps> = ({
  theme = 'day',
  difficulty = 'medium',
  onSetDifficulty,
  playedToday,
  soundEnabled,
  onGameWin,
}) => {
  const config = CONFIG[difficulty] || CONFIG.medium;
  const symbols = THEME_MEMORY_SYMBOLS[theme] || THEME_MEMORY_SYMBOLS.day;

  const [gameStatus, setGameStatus] = useState<GameStatus>('idle');
  const [isBonusMode, setIsBonusMode] = useState(playedToday);
  const [cards, setCards] = useState<Card[]>([]);
  const [flippedIds, setFlippedIds] = useState<number[]>([]);
  const [matchedCount, setMatchedCount] = useState(0);
  const [timeLeft, setTimeLeft] = useState(config.timeLimit);
  const lockRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (gameStatus !== 'playing') return;
    timerRef.current = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          setGameStatus('lost');
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [gameStatus]);

  useEffect(() => {
    if (gameStatus === 'won') {
      onGameWin(isBonusMode);
    }
  }, [gameStatus, isBonusMode, onGameWin]);

  const handleCardClick = useCallback((id: number) => {
    if (lockRef.current) return;
    setCards((prev) => {
      const card = prev.find((c) => c.id === id);
      if (!card || card.flipped || card.matched) return prev;
      return prev.map((c) => (c.id === id ? { ...c, flipped: true } : c));
    });
    setFlippedIds((prev) => {
      const next = [...prev, id];
      if (next.length === 2) {
        lockRef.current = true;
        setTimeout(() => {
          setCards((current) => {
            const [firstId, secondId] = next;
            const first = current.find((c) => c.id === firstId);
            const second = current.find((c) => c.id === secondId);
            if (first && second && first.symbol === second.symbol) {
              if (soundEnabled) soundFx.playCatch();
              setMatchedCount((m) => {
                const newCount = m + 1;
                if (newCount >= config.pairs) {
                  setGameStatus('won');
                  if (soundEnabled) soundFx.playWinFanfare();
                }
                return newCount;
              });
              return current.map((c) =>
                c.id === firstId || c.id === secondId ? { ...c, matched: true } : c
              );
            }
            if (soundEnabled) soundFx.playHit();
            return current.map((c) =>
              c.id === firstId || c.id === secondId ? { ...c, flipped: false } : c
            );
          });
          lockRef.current = false;
          setFlippedIds([]);
        }, 700);
      }
      return next;
    });
  }, [config.pairs, soundEnabled]);

  const startGame = (bonus = false) => {
    if (!bonus && playedToday) return;
    setIsBonusMode(Boolean(bonus));
    setCards(buildDeck(symbols, config.pairs));
    setFlippedIds([]);
    setMatchedCount(0);
    setTimeLeft(config.timeLimit);
    lockRef.current = false;
    setGameStatus('playing');
  };

  return (
    <GameShell
      gameStatus={gameStatus}
      isBonusMode={isBonusMode}
      playedToday={playedToday}
      score={matchedCount}
      targetScore={config.pairs}
      hudLabel="Жұбын тап"
      hudRight={
        <div className="flex items-center gap-1 text-[var(--accent)]">
          <Timer className="w-3.5 h-3.5" />
          <span className="text-xs font-semibold">{timeLeft}s</span>
        </div>
      }
      missionTitle={`Жұптарын ${config.pairs} рет тап`}
      missionText="Уақыт аяқталмас бұрын карталарды ашып жұбын тап!"
      lostTitle="Ой,уақыт аяқталып қойды!"
     lostText="Давай давай қайталап көр сенің қолыңнан келеді!"
    wonBonusText="Самая умная ,молодец барлығын таптың."
      difficulty={difficulty}
      onSetDifficulty={onSetDifficulty}
      onStart={startGame}
      heightClass="h-[380px]"
    >
      <div
        className="grid gap-2 p-4 h-full content-center"
        style={{ gridTemplateColumns: `repeat(${config.cols}, minmax(0, 1fr))` }}
      >
        {cards.map((card) => (
          <button
            key={card.id}
            onClick={() => handleCardClick(card.id)}
            disabled={card.flipped || card.matched}
            className={`aspect-square rounded-xl flex items-center justify-center text-2xl transition-all duration-300 ${
              card.flipped || card.matched
                ? 'bg-[var(--accent)]/15 border border-[var(--accent)]/40 scale-100'
                : 'bg-[var(--bg-soft)] border border-[var(--border)] hover:border-[var(--accent)]/30'
            } ${card.matched ? 'opacity-50' : ''}`}
          >
            {card.flipped || card.matched ? card.symbol : ''}
          </button>
        ))}
      </div>
    </GameShell>
  );
};
