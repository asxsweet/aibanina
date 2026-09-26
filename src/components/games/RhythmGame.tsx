import React, { useState, useRef, useEffect, useCallback } from 'react';
import { GameShell, GameStatus } from '../GameShell';
import { THEME_GAME_ASSETS } from '../../data/gameAssets';
import { soundFx } from '../../data/constants';
import { ThemeName, DifficultyName } from '../../utils/constellationUtils';
import { Shield } from 'lucide-react';

interface RhythmGameProps {
  theme?: ThemeName;
  difficulty?: DifficultyName;
  onSetDifficulty?: (difficulty: DifficultyName) => void;
  playedToday: boolean;
  soundEnabled: boolean;
  onGameWin: (isBonus: boolean) => void;
}

interface DifficultyConfig {
  cycleMs: number; // how long one ring pulse takes to reach the target
  hitWindow: number; // fraction of the cycle counted as a successful tap (near the end)
  lives: number;
  targetScore: number;
}

const CONFIG: Record<DifficultyName, DifficultyConfig> = {
  easy: { cycleMs: 1700, hitWindow: 0.26, lives: 5, targetScore: 8 },
  medium: { cycleMs: 1350, hitWindow: 0.18, lives: 4, targetScore: 10 },
  hard: { cycleMs: 1050, hitWindow: 0.12, lives: 3, targetScore: 12 },
};

export const RhythmGame: React.FC<RhythmGameProps> = ({
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
  const [beatKey, setBeatKey] = useState(0);
  const [feedback, setFeedback] = useState<'hit' | 'miss' | null>(null);

  const scoreRef = useRef(0);
  const livesRef = useRef(config.lives);
  const beatStartRef = useRef(0);
  const autoMissRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  scoreRef.current = score;
  livesRef.current = lives;

  useEffect(() => {
    if (gameStatus === 'won') onGameWin(isBonusMode);
  }, [gameStatus, isBonusMode, onGameWin]);

  const clearAutoMiss = () => {
    if (autoMissRef.current) {
      clearTimeout(autoMissRef.current);
      autoMissRef.current = null;
    }
  };

  const nextBeat = useCallback(() => {
    beatStartRef.current = performance.now();
    setBeatKey((k) => k + 1);
    clearAutoMiss();
    // If the player never taps at all, auto-register a miss shortly after
    // the ring completes its cycle.
    autoMissRef.current = setTimeout(() => {
      registerMiss();
    }, config.cycleMs * 1.25);
  }, [config.cycleMs]);

  const registerMiss = () => {
    clearAutoMiss();
    setFeedback('miss');
    if (soundEnabled) soundFx.playHit();
    const newLives = livesRef.current - 1;
    setLives(newLives);
    if (newLives <= 0) {
      setGameStatus('lost');
    } else {
      setTimeout(() => setFeedback(null), 300);
      nextBeat();
    }
  };

  const registerHit = () => {
    clearAutoMiss();
    setFeedback('hit');
    if (soundEnabled) soundFx.playCatch();
    const newScore = scoreRef.current + 1;
    setScore(newScore);
    if (newScore >= config.targetScore) {
      setGameStatus('won');
      if (soundEnabled) soundFx.playWinFanfare();
    } else {
      setTimeout(() => setFeedback(null), 250);
      nextBeat();
    }
  };

  const handleTap = () => {
    if (gameStatus !== 'playing') return;
    const elapsed = performance.now() - beatStartRef.current;
    const timing = elapsed / config.cycleMs;
    const withinWindow = timing >= 1 - config.hitWindow && timing <= 1 + config.hitWindow * 0.4;
    if (withinWindow) {
      registerHit();
    } else {
      registerMiss();
    }
  };

  const startGame = (bonus = false) => {
    if (!bonus && playedToday) return;
    setIsBonusMode(Boolean(bonus));
    setScore(0);
    setLives(config.lives);
    setFeedback(null);
    setGameStatus('playing');
    setTimeout(() => nextBeat(), 50);
  };

  useEffect(() => {
    return () => clearAutoMiss();
  }, []);

  return (
    <GameShell
      gameStatus={gameStatus}
      isBonusMode={isBonusMode}
      playedToday={playedToday}
      score={score}
      targetScore={config.targetScore}
      hudLabel="Ырғаққа түс"
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
      missionTitle="Ритмді ұстап қал"
      missionText="Ритімді ырғаққа діл түсір ерте немесе кеш істеп қойсаң саналмайды!"
      lostTitle="Ой,ритм болмай қалды!"
      lostText="Давай давай қайталап көр сенің қолыңнан келеді!"
      wonBonusText="Самая умная ,молодец жүрекшелерді жинадың."
      difficulty={difficulty}
      onSetDifficulty={onSetDifficulty}
      onStart={startGame}
    >
      <div className="relative w-full h-full flex items-center justify-center">
        {/* Static target ring */}
        <div className="absolute w-32 h-32 rounded-full border-2 border-[var(--accent-2)]" />

        {/* Pulsing ring — grows from 0 to full size over one cycle, restarts each beat */}
        <div
          key={beatKey}
          className="absolute w-32 h-32 rounded-full border-4 border-[var(--accent)]"
          style={{
            animation: gameStatus === 'playing' ? `rhythmPulse ${config.cycleMs}ms linear forwards` : 'none',
          }}
        />

        {/* Center tap button */}
        <button
          onClick={handleTap}
          className={`relative z-10 w-20 h-20 rounded-full flex items-center justify-center text-3xl transition-transform ${
            feedback === 'hit' ? 'scale-125' : feedback === 'miss' ? 'scale-90' : 'scale-100'
          }`}
          style={{
            background: feedback === 'hit' ? 'var(--accent)' : 'var(--bg-elevated)',
            border: '2px solid var(--accent)',
          }}
        >
          {assets.bonus}
        </button>
      </div>
    </GameShell>
  );
};
