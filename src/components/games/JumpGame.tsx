import React, { useState, useRef, useEffect, useCallback } from 'react';
import { GameShell, GameStatus } from '../GameShell';
import { THEME_GAME_ASSETS } from '../../data/gameAssets';
import { soundFx } from '../../data/constants';
import { ThemeName, DifficultyName } from '../../utils/constellationUtils';
import { Shield } from 'lucide-react';

interface JumpGameProps {
  theme?: ThemeName;
  difficulty?: DifficultyName;
  onSetDifficulty?: (difficulty: DifficultyName) => void;
  playedToday: boolean;
  soundEnabled: boolean;
  onGameWin: (isBonus: boolean) => void;
}

interface DifficultyConfig {
  speed: number; // % of stage width per ms
  spawnMs: number;
  jumpMs: number;
  lives: number;
  targetScore: number;
}

const CONFIG: Record<DifficultyName, DifficultyConfig> = {
  easy: { speed: 0.016, spawnMs: 1400, jumpMs: 600, lives: 4, targetScore: 8 },
  medium: { speed: 0.024, spawnMs: 1100, jumpMs: 520, lives: 3, targetScore: 10 },
  hard: { speed: 0.034, spawnMs: 850, jumpMs: 440, lives: 2, targetScore: 12 },
};

const PLAYER_X = 16; // fixed horizontal position, percent
const HIT_RADIUS = 6; // percent

interface Obstacle {
  id: number;
  x: number;
  passed: boolean;
}

export const JumpGame: React.FC<JumpGameProps> = ({
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
  const [obstacles, setObstacles] = useState<Obstacle[]>([]);
  const [isJumping, setIsJumping] = useState(false);
  const [hitFlash, setHitFlash] = useState(false);

  const scoreRef = useRef(0);
  const livesRef = useRef(config.lives);
  const isJumpingRef = useRef(false);
  const lastSpawnRef = useRef(0);
  const rafRef = useRef<number | null>(null);
  const nextIdRef = useRef(0);
  const jumpTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  scoreRef.current = score;
  livesRef.current = lives;
  isJumpingRef.current = isJumping;

  useEffect(() => {
    if (gameStatus === 'won') onGameWin(isBonusMode);
  }, [gameStatus, isBonusMode, onGameWin]);

  const loop = useCallback((timestamp: number) => {
    if (gameStatus !== 'playing') return;
    if (lastSpawnRef.current === 0) lastSpawnRef.current = timestamp;

    setObstacles((prev) => {
      let hitThisFrame = false;
      const moved = prev
        .map((o) => ({ ...o, x: o.x - config.speed * 16.7 }))
        .filter((o) => {
          if (o.x < -10) return false;
          // Collision zone check
          if (!o.passed && Math.abs(o.x - PLAYER_X) < HIT_RADIUS) {
            if (!isJumpingRef.current) {
              hitThisFrame = true;
              return false; // remove obstacle on collision
            }
          }
          if (!o.passed && o.x < PLAYER_X - HIT_RADIUS) {
            o.passed = true;
            scoreRef.current += 1;
            setScore(scoreRef.current);
            if (soundEnabled) soundFx.playCatch();
          }
          return true;
        });

      if (hitThisFrame) {
        if (soundEnabled) soundFx.playHit();
        const newLives = livesRef.current - 1;
        livesRef.current = newLives;
        setLives(newLives);
        setHitFlash(true);
        setTimeout(() => setHitFlash(false), 200);
        if (newLives <= 0) {
          setGameStatus('lost');
        }
      }

      return moved;
    });

    if (timestamp - lastSpawnRef.current > config.spawnMs) {
      lastSpawnRef.current = timestamp;
      nextIdRef.current += 1;
      setObstacles((prev) => [...prev, { id: nextIdRef.current, x: 105, passed: false }]);
    }

    if (scoreRef.current >= config.targetScore) {
      setGameStatus('won');
      if (soundEnabled) soundFx.playWinFanfare();
      return;
    }

    rafRef.current = requestAnimationFrame(loop);
  }, [gameStatus, config, soundEnabled]);

  useEffect(() => {
    if (gameStatus === 'playing') {
      rafRef.current = requestAnimationFrame(loop);
    }
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [gameStatus, loop]);

  const handleJump = () => {
    if (gameStatus !== 'playing' || isJumping) return;
    setIsJumping(true);
    if (jumpTimeoutRef.current) clearTimeout(jumpTimeoutRef.current);
    jumpTimeoutRef.current = setTimeout(() => setIsJumping(false), config.jumpMs);
  };

  const startGame = (bonus = false) => {
    if (!bonus && playedToday) return;
    setIsBonusMode(Boolean(bonus));
    setScore(0);
    setLives(config.lives);
    setObstacles([]);
    setIsJumping(false);
    lastSpawnRef.current = 0;
    setGameStatus('playing');
  };

  useEffect(() => {
    return () => {
      if (jumpTimeoutRef.current) clearTimeout(jumpTimeoutRef.current);
    };
  }, []);

  return (
    <GameShell
      gameStatus={gameStatus}
      isBonusMode={isBonusMode}
      playedToday={playedToday}
      score={score}
      targetScore={config.targetScore}
      hudLabel="Секір және секір"
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
      missionTitle={`Кедергілерден ${config.targetScore} секір`}
      missionText="Экранды басу арқылы кедергілерден секір"
      lostTitle="Ой қадалып қалдың!"
      lostText="Давай давай қайталап көр сенің қолыңнан келеді!"
      wonBonusText="Самая умная ,молодец ."
      difficulty={difficulty}
      onSetDifficulty={onSetDifficulty}
      onStart={startGame}
    >
      <div
        onClick={handleJump}
        className={`relative w-full h-full cursor-pointer transition-colors ${hitFlash ? 'bg-[var(--accent-2)]/10' : ''}`}
      >
        {/* Ground line */}
        <div className="absolute bottom-[22%] left-0 right-0 h-px bg-[var(--border)]" />

        {/* Player */}
        <div
          className="absolute text-3xl transition-transform"
          style={{
            left: `${PLAYER_X}%`,
            bottom: isJumping ? '42%' : '22%',
            transform: 'translate(-50%, 50%)',
            transitionDuration: `${config.jumpMs / 2}ms`,
            transitionTimingFunction: isJumping ? 'ease-out' : 'ease-in',
          }}
        >
          {assets.player}
        </div>

        {/* Obstacles */}
        {obstacles.map((o) => (
          <div
            key={o.id}
            className="absolute text-2xl"
            style={{ left: `${o.x}%`, bottom: '22%', transform: 'translate(-50%, 50%)' }}
          >
            {assets.obstacle}
          </div>
        ))}

        <div className="absolute bottom-1 left-0 right-0 text-center text-[10px] text-[var(--accent-2)]/80 pointer-events-none font-medium uppercase tracking-wider">
          Секіру үшін экранды бас
        </div>
      </div>
    </GameShell>
  );
};
