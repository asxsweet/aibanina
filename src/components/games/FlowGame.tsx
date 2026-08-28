import React, { useState, useRef, useEffect, useCallback } from 'react';
import { GameShell, GameStatus } from '../GameShell';
import { THEME_GAME_ASSETS } from '../../data/gameAssets';
import { soundFx } from '../../data/constants';
import { GameItem, Particle } from '../../types';
import { ThemeName, DifficultyName } from '../../utils/constellationUtils';
import { Shield } from 'lucide-react';

interface FlowGameProps {
  theme?: ThemeName;
  difficulty?: DifficultyName;
  onSetDifficulty?: (difficulty: DifficultyName) => void;
  playedToday: boolean;
  soundEnabled: boolean;
  onGameWin: (isBonus: boolean) => void;
}

interface DifficultyConfig {
  channelWidth: number; // percent
  driftForce: number; // percent per ms
  oscSpeed: number;
  lives: number;
  targetScore: number;
  spawnMs: number;
}

const CONFIG: Record<DifficultyName, DifficultyConfig> = {
  easy: { channelWidth: 72, driftForce: 0.009, oscSpeed: 0.0007, lives: 4, targetScore: 8, spawnMs: 850 },
  medium: { channelWidth: 56, driftForce: 0.016, oscSpeed: 0.0010, lives: 3, targetScore: 10, spawnMs: 700 },
  hard: { channelWidth: 42, driftForce: 0.024, oscSpeed: 0.0014, lives: 2, targetScore: 12, spawnMs: 560 },
};

export const FlowGame: React.FC<FlowGameProps> = ({
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
  const [playerX, setPlayerX] = useState(50);
  const [walls, setWalls] = useState({ left: 14, right: 86 });
  const [items, setItems] = useState<GameItem[]>([]);
  const [particles, setParticles] = useState<Particle[]>([]);
  const [wallFlash, setWallFlash] = useState(false);

  const scoreRef = useRef(0);
  const livesRef = useRef(config.lives);
  const playerXRef = useRef(50);
  const draggingUntilRef = useRef(0);
  const startTimeRef = useRef(0);
  const lastSpawnRef = useRef(0);
  const lastWallSoundRef = useRef(0);
  const rafRef = useRef<number | null>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const lastTimeRef = useRef(0);

  scoreRef.current = score;
  livesRef.current = lives;
  playerXRef.current = playerX;

  useEffect(() => {
    if (gameStatus === 'won') onGameWin(isBonusMode);
  }, [gameStatus, isBonusMode, onGameWin]);

  const setPlayerFromClientX = (clientX: number) => {
    if (!stageRef.current) return;
    const rect = stageRef.current.getBoundingClientRect();
    let x = ((clientX - rect.left) / rect.width) * 100;
    x = Math.max(4, Math.min(96, x));
    playerXRef.current = x;
    setPlayerX(x);
    draggingUntilRef.current = performance.now() + 120; // brief grace period after touch ends
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (gameStatus !== 'playing') return;
    setPlayerFromClientX(e.clientX);
  };

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const onTouchMove = (e: TouchEvent) => {
      if (gameStatus !== 'playing' || e.touches.length === 0) return;
      e.preventDefault();
      setPlayerFromClientX(e.touches[0].clientX);
    };
    stage.addEventListener('touchmove', onTouchMove, { passive: false });
    return () => stage.removeEventListener('touchmove', onTouchMove);
  }, [gameStatus]);

  const spawnParticles = useCallback((x: number, y: number, color: string) => {
    const newParticles: Particle[] = Array.from({ length: 10 }).map(() => {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 3 + 1;
      return {
        id: Math.random().toString(36).slice(2, 9),
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color,
        size: Math.random() * 5 + 2,
        alpha: 1,
      };
    });
    setParticles((prev) => [...prev, ...newParticles]);
  }, []);

  const loop = useCallback((timestamp: number) => {
    if (gameStatus !== 'playing') return;
    if (startTimeRef.current === 0) {
      startTimeRef.current = timestamp;
      lastTimeRef.current = timestamp;
      lastSpawnRef.current = timestamp;
    }
    const dt = timestamp - lastTimeRef.current;
    lastTimeRef.current = timestamp;
    const t = timestamp - startTimeRef.current;

    // Channel walls drift side to side over time
    const center = 50 + 22 * Math.sin(t * config.oscSpeed);
    const left = Math.max(4, center - config.channelWidth / 2);
    const right = Math.min(96, center + config.channelWidth / 2);
    setWalls({ left, right });

    // Current pushes the player sideways unless they're actively steering
    if (timestamp > draggingUntilRef.current) {
      const driftDir = Math.sin(t * config.oscSpeed * 1.4);
      let nextX = playerXRef.current + driftDir * config.driftForce * dt;
      nextX = Math.max(2, Math.min(98, nextX));
      playerXRef.current = nextX;
      setPlayerX(nextX);
    }

    // Wall collision
    if (playerXRef.current < left + 3 || playerXRef.current > right - 3) {
      if (soundEnabled && timestamp - lastWallSoundRef.current > 350) {
        soundFx.playHit();
        lastWallSoundRef.current = timestamp;
      }
      const newLives = livesRef.current - 1;
      livesRef.current = newLives;
      setLives(newLives);
      setWallFlash(true);
      setTimeout(() => setWallFlash(false), 200);
      // Nudge back toward channel center so it's not an instant repeat hit
      const nudged = Math.max(left + 6, Math.min(right - 6, playerXRef.current));
      playerXRef.current = nudged;
      setPlayerX(nudged);
      if (newLives <= 0) {
        setGameStatus('lost');
      }
    }

    // Spawn falling items within the current channel bounds
    if (timestamp - lastSpawnRef.current > config.spawnMs) {
      lastSpawnRef.current = timestamp;
      const isObstacle = Math.random() < 0.28;
      const spawnX = left + 10 + Math.random() * Math.max(10, right - left - 20);
      setItems((prev) => [
        ...prev,
        {
          id: Math.random().toString(36).slice(2, 9),
          x: spawnX,
          y: -8,
          speed: 0.9 + Math.random() * 0.6,
          type: isObstacle ? 'asteroid' : 'heart',
          size: 30,
          rotation: 0,
        },
      ]);
    }

    // Move items + check collisions
    setItems((prev) => {
      const remaining: GameItem[] = [];
      for (const item of prev) {
        const newY = item.y + item.speed;
        const dx = Math.abs(item.x - playerXRef.current);
        const dy = Math.abs(newY - 82);
        if (dx < 10 && dy < 6) {
          if (item.type === 'heart') {
            if (soundEnabled) soundFx.playCatch();
            const newScore = scoreRef.current + 1;
            setScore(newScore);
            spawnParticles(item.x, 82, 'var(--accent-2)');
            if (newScore >= config.targetScore) {
              setGameStatus('won');
              if (soundEnabled) soundFx.playWinFanfare();
            }
          } else {
            if (soundEnabled) soundFx.playHit();
            const newLives = livesRef.current - 1;
            livesRef.current = newLives;
            setLives(newLives);
            spawnParticles(item.x, 82, 'var(--text-muted)');
            if (newLives <= 0) setGameStatus('lost');
          }
          continue;
        }
        if (newY < 100) remaining.push({ ...item, y: newY });
      }
      return remaining;
    });

    setParticles((prev) =>
      prev
        .map((p) => ({ ...p, x: p.x + p.vx, y: p.y + p.vy, alpha: p.alpha - 0.04 }))
        .filter((p) => p.alpha > 0)
    );

    rafRef.current = requestAnimationFrame(loop);
  }, [gameStatus, config, spawnParticles, soundEnabled]);

  useEffect(() => {
    if (gameStatus === 'playing') {
      rafRef.current = requestAnimationFrame(loop);
    }
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [gameStatus, loop]);

  const startGame = (bonus = false) => {
    if (!bonus && playedToday) return;
    setIsBonusMode(Boolean(bonus));
    setScore(0);
    setLives(config.lives);
    setPlayerX(50);
    playerXRef.current = 50;
    setItems([]);
    setParticles([]);
    startTimeRef.current = 0;
    setGameStatus('playing');
  };

  return (
    <GameShell
      gameStatus={gameStatus}
      isBonusMode={isBonusMode}
      playedToday={playedToday}
      score={score}
      targetScore={config.targetScore}
      hudLabel="Ағысқа қарсы"
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
      missionTitle={`Жүректерді ${config.targetScore} рет жина`}
      missionText="Толқындардан абай бол саусағыңмен басқарып жүректердіжина жиектерден абай бол!"
      lostTitle="Блин толқын алып кетті!"
      lostText="Давай давай қайталап көр сенің қолыңнан келеді!"
    wonBonusText="Самая умная ,молодец жүрекшелерді жинадың."
      difficulty={difficulty}
      onSetDifficulty={onSetDifficulty}
      onStart={startGame}
    >
      <div
        ref={stageRef}
        onPointerMove={handlePointerMove}
        style={{ touchAction: 'none' }}
        className={`relative w-full h-full touch-none transition-colors ${wallFlash ? 'bg-[var(--accent-2)]/10' : ''}`}
      >
        {/* Channel walls */}
        <div
          className="absolute top-0 bottom-0 bg-[var(--overlay)]"
          style={{ left: 0, width: `${walls.left}%` }}
        />
        <div
          className="absolute top-0 bottom-0 bg-[var(--overlay)]"
          style={{ right: 0, width: `${100 - walls.right}%` }}
        />
        <div className="absolute top-0 bottom-0 w-0.5 bg-[var(--accent-2)]/50" style={{ left: `${walls.left}%` }} />
        <div className="absolute top-0 bottom-0 w-0.5 bg-[var(--accent-2)]/50" style={{ left: `${walls.right}%` }} />

        {/* Particles */}
        {particles.map((p) => (
          <div
            key={p.id}
            className="absolute rounded-full pointer-events-none"
            style={{
              left: `${p.x}%`, top: `${p.y}%`,
              width: `${p.size}px`, height: `${p.size}px`,
              backgroundColor: p.color, opacity: p.alpha,
            }}
          />
        ))}

        {/* Falling items */}
        {items.map((item) => (
          <div
            key={item.id}
            className="absolute -translate-x-1/2 -translate-y-1/2 text-2xl"
            style={{ left: `${item.x}%`, top: `${item.y}%` }}
          >
            {item.type === 'heart' ? assets.collect : assets.obstacle}
          </div>
        ))}

        {/* Player */}
        <div
          className="absolute bottom-[18%] -translate-x-1/2 text-3xl filter drop-shadow-[0_0_10px_var(--accent-glow)]"
          style={{ left: `${playerX}%` }}
        >
          {assets.player}
        </div>

        <div className="absolute bottom-1 left-0 right-0 text-center text-[10px] text-[var(--accent-2)]/80 pointer-events-none font-medium uppercase tracking-wider">
          Саусағыыңмен басқар
        </div>
      </div>
    </GameShell>
  );
};
