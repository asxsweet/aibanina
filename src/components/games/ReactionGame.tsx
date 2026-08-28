import React, { useState, useRef, useEffect, useCallback } from 'react';
import { GameShell, GameStatus } from '../GameShell';
import { THEME_GAME_ASSETS } from '../../data/gameAssets';
import { soundFx } from '../../data/constants';
import { ThemeName, DifficultyName } from '../../utils/constellationUtils';
import { Shield } from 'lucide-react';

interface ReactionGameProps {
  theme?: ThemeName;
  difficulty?: DifficultyName;
  onSetDifficulty?: (difficulty: DifficultyName) => void;
  playedToday: boolean;
  soundEnabled: boolean;
  onGameWin: (isBonus: boolean) => void;
}

interface DifficultyConfig {
  startMs: number;
  minMs: number;
  step: number; // ms shaved off per successful hit
  lives: number;
  targetScore: number;
}

const CONFIG: Record<DifficultyName, DifficultyConfig> = {
  easy: { startMs: 1400, minMs: 800, step: 40, lives: 5, targetScore: 8 },
  medium: { startMs: 1150, minMs: 600, step: 55, lives: 4, targetScore: 10 },
  hard: { startMs: 900, minMs: 420, step: 70, lives: 3, targetScore: 12 },
};

export const ReactionGame: React.FC<ReactionGameProps> = ({
  theme = 'day',
  difficulty = 'medium',
  onSetDifficulty,
  playedToday,
  soundEnabled,
  onGameWin,
}) => {
  const config = CONFIG[difficulty] || CONFIG.medium;
  const assets = THEME_GAME_ASSETS[theme] || THEME_GAME_ASSETS.day;

  const [gameStatus, setGameStatus] = useState<GameStatus>('idle');
  const [isBonusMode, setIsBonusMode] = useState(playedToday);
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(config.lives);
  const [target, setTarget] = useState<{ x: number; y: number; key: number } | null>(null);

  const scoreRef = useRef(0);
  const livesRef = useRef(config.lives);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const roundKeyRef = useRef(0);
  const stageRef = useRef<HTMLDivElement>(null);

  scoreRef.current = score;
  livesRef.current = lives;

  useEffect(() => {
    if (gameStatus === 'won') onGameWin(isBonusMode);
  }, [gameStatus, isBonusMode, onGameWin]);

  const clearRoundTimer = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  };

  const spawnRound = useCallback(() => {
    const x = 15 + Math.random() * 70;
    const y = 15 + Math.random() * 70;
    const key = roundKeyRef.current + 1;
    roundKeyRef.current = key;
    setTarget({ x, y, key });

    const duration = Math.max(config.minMs, config.startMs - scoreRef.current * config.step);
    clearRoundTimer();
    timeoutRef.current = setTimeout(() => {
      // Missed — target disappeared without a tap
      if (soundEnabled) soundFx.playHit();
      const newLives = livesRef.current - 1;
      setLives(newLives);
      setTarget(null);
      if (newLives <= 0) {
        setGameStatus('lost');
      } else {
        spawnRound();
      }
    }, duration);
  }, [config, soundEnabled]);

  const handleHit = () => {
    clearRoundTimer();
    if (soundEnabled) soundFx.playCatch();
    const newScore = scoreRef.current + 1;
    setScore(newScore);
    setTarget(null);
    if (newScore >= config.targetScore) {
      setGameStatus('won');
      if (soundEnabled) soundFx.playWinFanfare();
    } else {
      spawnRound();
    }
  };

  const startGame = (bonus = false) => {
    if (!bonus && playedToday) return;
    setIsBonusMode(Boolean(bonus));
    setScore(0);
    setLives(config.lives);
    setTarget(null);
    setGameStatus('playing');
    // Give layout a tick before spawning so stage dimensions are ready
    setTimeout(() => spawnRound(), 50);
  };

  useEffect(() => {
    return () => clearRoundTimer();
  }, []);

  return (
    <GameShell
      gameStatus={gameStatus}
      isBonusMode={isBonusMode}
      playedToday={playedToday}
      score={score}
      targetScore={config.targetScore}
      hudLabel="Дәл тап"
      hudRight={
        <div className="flex items-center gap-1">
          {Array.from({ length: config.lives }).map((_, i) => (
            <Shield
              key={i}
              className={`w-3.5 h-3.5 ${
                i < lives ? 'text-[var(--accent)] fill-[var(--accent)]/40' : 'text-[var(--locked-fill)] opacity-50'
              }`}
            />
          ))}
        </div>
      }
      missionTitle={`${config.targetScore} рет тап`}
      missionText="Шыққан сайын басып отырып діл табу керек!"
      lostTitle="Ой тезірек болып қойды!"
      lostText="Давай давай қайталап көр сенің қолыңнан келеді!"
    wonBonusText="Самая умная ,молодец барлығын жинадың."
      difficulty={difficulty}
      onSetDifficulty={onSetDifficulty}
      onStart={startGame}
    >
      <div ref={stageRef} className="relative w-full h-full">
        {target && (
          <button
            key={target.key}
            onClick={handleHit}
            className="absolute w-14 h-14 -translate-x-1/2 -translate-y-1/2 text-3xl flex items-center justify-center animate-[pop_0.15s_ease] drop-shadow-[0_0_10px_var(--accent-glow-strong)]"
            style={{ left: `${target.x}%`, top: `${target.y}%` }}
          >
            {assets.collect}
          </button>
        )}
      </div>
    </GameShell>
  );
};
