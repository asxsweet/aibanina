import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Heart, Sparkles, Shield, RotateCcw, Play, CheckCircle2 } from 'lucide-react';
import { GameItem, Particle } from '../types';
import { soundFx } from '../data/constants';
import { THEME_GAME_ASSETS } from '../data/gameAssets';
import { ThemeName, DifficultyName } from '../utils/constellationUtils';

interface MiniGameProps {
  theme?: ThemeName;
  difficulty?: DifficultyName;
  onSetDifficulty?: (difficulty: DifficultyName) => void;
  playedToday: boolean;
  soundEnabled: boolean;
  onGameWin: (isBonus: boolean) => void;
}

// Same game, three difficulty presets — spawn rate, fall speed, hearts vs
// obstacles ratio, lives, and the score needed to win all scale together.
interface DifficultyConfig {
  label: string;
  spawnMs: number;
  speedMin: number;
  speedMax: number;
  lives: number;
  targetScore: number;
  itemTypes: ('heart' | 'golden_star' | 'asteroid')[];
}

const DIFFICULTY_CONFIG: Record<DifficultyName, DifficultyConfig> = {
  easy: {
    label: 'Жеңіл',
    spawnMs: 950,
    speedMin: 0.6,
    speedMax: 1.1,
    lives: 4,
    targetScore: 8,
    itemTypes: ['heart', 'heart', 'heart', 'heart', 'golden_star', 'asteroid'],
  },
  medium: {
    label: 'Орташа',
    spawnMs: 750,
    speedMin: 0.9,
    speedMax: 1.7,
    lives: 3,
    targetScore: 10,
    itemTypes: ['heart', 'heart', 'heart', 'golden_star', 'asteroid'],
  },
  hard: {
    label: 'Қиын',
    spawnMs: 550,
    speedMin: 1.3,
    speedMax: 2.3,
    lives: 2,
    targetScore: 12,
    itemTypes: ['heart', 'heart', 'golden_star', 'asteroid', 'asteroid'],
  },
};

export const MiniGame: React.FC<MiniGameProps> = ({
  theme = 'day',
  difficulty = 'medium',
  onSetDifficulty,
  playedToday,
  soundEnabled,
  onGameWin,
}) => {
  const assets = THEME_GAME_ASSETS[theme] || THEME_GAME_ASSETS.day;
  const config = DIFFICULTY_CONFIG[difficulty] || DIFFICULTY_CONFIG.medium;

  const [gameStatus, setGameStatus] = useState<'idle' | 'playing' | 'won' | 'lost'>(
    playedToday ? 'idle' : 'idle'
  );
  const [isBonusMode, setIsBonusMode] = useState<boolean>(playedToday);

  // Game variables
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(config.lives);
  const [shipX, setShipX] = useState(50); // percentage 0-100%
  const [items, setItems] = useState<GameItem[]>([]);
  const [particles, setParticles] = useState<Particle[]>([]);

  const targetScore = config.targetScore;
  const gameAreaRef = useRef<HTMLDivElement>(null);
  const requestRef = useRef<number | null>(null);
  const lastSpawnRef = useRef<number>(0);
  const scoreRef = useRef(score);
  const livesRef = useRef(lives);
  const shipXRef = useRef(shipX);

  scoreRef.current = score;
  livesRef.current = lives;
  shipXRef.current = shipX;

  // Desktop mouse drag only — touch is handled separately below via a
  // native, non-passive listener so we can block the browser's default
  // page-scroll gesture while dragging (that conflict was the cause of the
  // sticky/laggy movement on phones).
  const handlePointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType === 'touch') return;
    if (gameStatus !== 'playing' || !gameAreaRef.current) return;
    const rect = gameAreaRef.current.getBoundingClientRect();
    const clientX = e.clientX;
    let newX = ((clientX - rect.left) / rect.width) * 100;
    newX = Math.max(8, Math.min(92, newX));
    setShipX(newX);
  }, [gameStatus]);

  // Native touch handling with { passive: false } so preventDefault actually
  // stops the browser from panning/scrolling the page while the finger drags
  // inside the game area — React's synthetic touch handlers are attached as
  // passive by default and can't block that, which is what caused the
  // stuttering "stuck, then jumps" feeling instead of smooth 1:1 tracking.
  useEffect(() => {
    const el = gameAreaRef.current;
    if (!el) return;

    const onTouchMoveNative = (e: TouchEvent) => {
      if (gameStatus !== 'playing' || e.touches.length === 0) return;
      e.preventDefault();
      const rect = el.getBoundingClientRect();
      const clientX = e.touches[0].clientX;
      let newX = ((clientX - rect.left) / rect.width) * 100;
      newX = Math.max(8, Math.min(92, newX));
      setShipX(newX);
    };

    el.addEventListener('touchmove', onTouchMoveNative, { passive: false });
    return () => el.removeEventListener('touchmove', onTouchMoveNative);
  }, [gameStatus]);

  // Keyboard navigation support
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (gameStatus !== 'playing') return;
      if (e.key === 'ArrowLeft' || e.key === 'a') {
        setShipX((prev) => Math.max(8, prev - 6));
      } else if (e.key === 'ArrowRight' || e.key === 'd') {
        setShipX((prev) => Math.min(92, prev + 6));
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameStatus]);

  // Spawn new falling items — type ratio and fall speed both scale with the
  // active difficulty preset.
  const spawnItem = useCallback(() => {
    const types = config.itemTypes;
    const type = types[Math.floor(Math.random() * types.length)];
    const speedRange = config.speedMax - config.speedMin;
    const newItem: GameItem = {
      id: Math.random().toString(36).substring(2, 9),
      x: Math.random() * 80 + 10, // 10% to 90%
      y: -10,
      speed: Math.random() * speedRange + config.speedMin,
      type,
      size: type === 'golden_star' ? 32 : type === 'asteroid' ? 34 : 30,
      rotation: Math.random() * 360,
    };
    setItems((prev) => [...prev, newItem]);
  }, [config]);

  // Spawn visual particle burst
  const spawnParticles = useCallback((x: number, y: number, color: string, count = 12) => {
    const newParticles: Particle[] = Array.from({ length: count }).map(() => {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 3 + 1;
      return {
        id: Math.random().toString(36).substring(2, 9),
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color,
        size: Math.random() * 5 + 2,
        alpha: 1,
      };
    });
    setParticles((prev) => [...prev, ...newParticles]);
  }, []);

  // Main Game Loop using requestAnimationFrame
  const updateGame = useCallback((timestamp: number) => {
    if (gameStatus !== 'playing') return;

    // Spawn timer
    if (timestamp - lastSpawnRef.current > config.spawnMs) {
      spawnItem();
      lastSpawnRef.current = timestamp;
    }

    // Update particles
    setParticles((prevParticles) =>
      prevParticles
        .map((p) => ({
          ...p,
          x: p.x + p.vx,
          y: p.y + p.vy,
          alpha: p.alpha - 0.04,
        }))
        .filter((p) => p.alpha > 0)
    );

    // Update items & check collisions
    setItems((prevItems) => {
      const remaining: GameItem[] = [];
      const shipWidth = 16; // collision threshold
      const shipY = 82; // ship y position percentage

      for (const item of prevItems) {
        const newY = item.y + item.speed;

        // Collision check with ship
        const distanceX = Math.abs(item.x - shipXRef.current);
        const distanceY = Math.abs(newY - shipY);

        if (distanceX < shipWidth && distanceY < 6) {
          // Hit ship!
          if (item.type === 'heart' || item.type === 'golden_star') {
            const addedScore = item.type === 'golden_star' ? 2 : 1;
            const newScore = scoreRef.current + addedScore;
            setScore(newScore);

            if (soundEnabled) {
              if (item.type === 'golden_star') soundFx.playGoldenStar();
              else soundFx.playCatch();
            }

            spawnParticles(
              item.x,
              shipY,
              item.type === 'golden_star' ? 'var(--accent)' : 'var(--accent-2)'
            );

            if (newScore >= targetScore) {
              setGameStatus('won');
              if (soundEnabled) soundFx.playWinFanfare();
            }
          } else if (item.type === 'asteroid') {
            const newLives = livesRef.current - 1;
            setLives(newLives);

            if (soundEnabled) soundFx.playHit();
            spawnParticles(item.x, shipY, 'var(--text-muted)', 16);

            if (newLives <= 0) {
              setGameStatus('lost');
            }
          }
        } else if (newY < 105) {
          remaining.push({ ...item, y: newY, rotation: item.rotation + 2 });
        }
      }
      return remaining;
    });

    requestRef.current = requestAnimationFrame(updateGame);
  }, [gameStatus, spawnItem, spawnParticles, soundEnabled, onGameWin, isBonusMode, config]);

  useEffect(() => {
    if (gameStatus === 'won') {
      onGameWin(isBonusMode);
    }
  }, [gameStatus, isBonusMode, onGameWin]);

  useEffect(() => {
    if (gameStatus === 'playing') {
      requestRef.current = requestAnimationFrame(updateGame);
    }
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [gameStatus, updateGame]);

  const startGame = (bonus = false) => {
    if (!bonus && playedToday) {
      return;
    }

    setIsBonusMode(Boolean(bonus));
    setScore(0);
    setLives(config.lives);
    setShipX(50);
    setItems([]);
    setParticles([]);
    setGameStatus('playing');
  };

  return (
    <div 
      ref={gameAreaRef}
      onPointerMove={handlePointerMove}
      style={{ touchAction: 'none' }}
      className="relative w-full h-[330px] rounded-[32px] sm:rounded-[40px] bg-[var(--bg-card)] border border-[var(--accent)]/20 backdrop-blur-xl shadow-[0_20px_50px_var(--overlay)] overflow-hidden select-none flex flex-col justify-between"
    >
        {/* Top HUD bar during game */}
        <div className="p-3.5 flex items-center justify-between text-xs font-medium z-10 bg-[var(--bg-soft)]/70 backdrop-blur-md border-b border-[var(--border)]">
          <div className="flex items-center gap-1.5 text-[var(--accent-2)]">
            <Heart className="w-4 h-4 fill-[var(--accent-2)] text-[var(--accent-2)] animate-pulse" />
            <span className="font-semibold text-sm text-[var(--text)]">
              {score} / {targetScore}
            </span>
          </div>

          <div className="text-[var(--accent)] text-[11px] font-serif tracking-wider uppercase">
            {isBonusMode ? 'Бонустық ойын' : 'Күндізгі миссия'} · {config.label}
          </div>

          <div className="flex items-center gap-1 text-[var(--accent)]">
            {Array.from({ length: config.lives }).map((_, i) => (
              <Shield
                key={i}
                className={`w-3.5 h-3.5 transition-all ${
                  i < lives
                    ? 'text-[var(--accent)] fill-[var(--accent)]/40 opacity-100'
                    : 'text-[var(--locked-fill)] opacity-50'
                }`}
              />
            ))}
          </div>
        </div>

        {/* GAME PLAY CANVAS / STAGE AREA */}
        {gameStatus === 'playing' && (
          <div className="relative w-full h-full overflow-hidden touch-none cursor-ew-resize">
            {/* Particles */}
            {particles.map((p) => (
              <div
                key={p.id}
                className="absolute rounded-full pointer-events-none"
                style={{
                  left: `${p.x}%`,
                  top: `${p.y}%`,
                  width: `${p.size}px`,
                  height: `${p.size}px`,
                  backgroundColor: p.color,
                  opacity: p.alpha,
                  boxShadow: `0 0 8px ${p.color}`,
                }}
              />
            ))}

            {/* Falling items — emoji swap based on active theme */}
            {items.map((item) => (
              <div
                key={item.id}
                className="absolute transform -translate-x-1/2 -translate-y-1/2 pointer-events-none transition-transform"
                style={{
                  left: `${item.x}%`,
                  top: `${item.y}%`,
                  transform: `translate(-50%, -50%) rotate(${item.rotation}deg)`,
                }}
              >
                {item.type === 'heart' && (
                  <div className="text-2xl drop-shadow-[0_0_10px_var(--accent2-glow-strong)]">
                    {assets.collect}
                  </div>
                )}
                {item.type === 'golden_star' && (
                  <div className="text-2xl drop-shadow-[0_0_12px_var(--accent-glow-strong)] animate-spin">
                    {assets.bonus}
                  </div>
                )}
                {item.type === 'asteroid' && (
                  <div className="text-2xl drop-shadow-[0_0_8px_var(--overlay)]">
                    {assets.obstacle}
                  </div>
                )}
              </div>
            ))}

            {/* Player craft — emoji swap based on active theme */}
            <div
              className="absolute bottom-6 transform -translate-x-1/2 pointer-events-none"
              style={{ left: `${shipX}%` }}
            >
              <div className="relative flex flex-col items-center">
                <div className="text-3xl filter drop-shadow-[0_0_15px_var(--accent-glow)] animate-float-slow">
                  {assets.player}
                </div>
                {/* Soft glow trail */}
                <div className="w-10 h-1.5 bg-[var(--accent)]/40 rounded-full blur-sm mt-[-4px]" />
              </div>
            </div>

            {/* Mobile touch guidance notice */}
            <div className="absolute bottom-1 left-0 right-0 text-center text-[10px] text-[var(--accent-2)]/80 pointer-events-none font-medium uppercase tracking-wider">
              Саусақпен солға/оңға жылжыт
            </div>
          </div>
        )}

        {/* OVERLAY STATES (START / PLAYED TODAY / WIN / LOSS) */}
        {gameStatus !== 'playing' && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center p-6 text-center bg-[var(--bg-elevated)]/92 backdrop-blur-xl">
            {/* Played today notice */}
            {gameStatus === 'idle' && playedToday && (
              <div className="flex flex-col items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-[var(--accent-2)]/15 border border-[var(--accent-2)]/35 flex items-center justify-center text-[var(--accent-2)]">
                  <CheckCircle2 className="w-7 h-7" />
                </div>
                <h2 className="font-serif text-2xl font-light italic text-[var(--accent)]">
                  Бүгінгі жұлдыз жанып қойды!
                </h2>
                <p className="text-xs text-[var(--text-muted)] max-w-xs leading-relaxed font-light">
                  Бүгін марапатты алып қойдың. Жаңа жұлдыз үшін ертең кел — бүгін тағы ойнау мүмкін емес.
                </p>

                {/* Difficulty switcher — available here too, so it's always
                    reachable regardless of whether today's star is already open */}
                {onSetDifficulty && (
                  <div className="flex items-center gap-1 p-1 rounded-full bg-[var(--bg-soft)] border border-[var(--border)] mt-1">
                    {(Object.keys(DIFFICULTY_CONFIG) as DifficultyName[]).map((key) => (
                      <button
                        key={key}
                        onClick={() => onSetDifficulty(key)}
                        className={`px-3 py-1.5 rounded-full text-[11px] font-semibold transition ${
                          difficulty === key
                            ? 'bg-[var(--accent)] text-[var(--on-accent)]'
                            : 'text-[var(--text-muted)] hover:text-[var(--text)]'
                        }`}
                      >
                        {DIFFICULTY_CONFIG[key].label}
                      </button>
                    ))}
                  </div>
                )}

                <button
                  onClick={() => startGame(true)}
                  className="mt-2 px-6 py-3 rounded-2xl btn-gold text-sm flex items-center gap-2"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>Жай ғана тағы ойнау</span>
                </button>
              </div>
            )}

            {/* First time play today */}
            {gameStatus === 'idle' && !playedToday && (
              <div className="flex flex-col items-center gap-3">
                <div className="w-14 h-14 rounded-full bg-[var(--accent)]/15 border border-[var(--accent)]/35 flex items-center justify-center text-[var(--accent)] animate-pulse-glow">
                  <Sparkles className="w-7 h-7" />
                </div>
                <div className="text-[10px] uppercase font-bold text-[var(--accent-2)] tracking-widest">
                  Күндізгі миссия
                </div>
                <h2 className="font-serif text-2xl sm:text-3xl font-light italic text-[var(--accent)]">
                  {assets.missionTitle}
                </h2>
                <p className="text-xs text-[var(--text-muted)] max-w-xs leading-relaxed font-light">
                  {assets.missionText}
                </p>

                {/* Difficulty switcher — easy to change right before playing */}
                {onSetDifficulty && (
                  <div className="flex items-center gap-1 p-1 rounded-full bg-[var(--bg-soft)] border border-[var(--border)] mt-1">
                    {(Object.keys(DIFFICULTY_CONFIG) as DifficultyName[]).map((key) => (
                      <button
                        key={key}
                        onClick={() => onSetDifficulty(key)}
                        className={`px-3 py-1.5 rounded-full text-[11px] font-semibold transition ${
                          difficulty === key
                            ? 'bg-[var(--accent)] text-[var(--on-accent)]'
                            : 'text-[var(--text-muted)] hover:text-[var(--text)]'
                        }`}
                      >
                        {DIFFICULTY_CONFIG[key].label}
                      </button>
                    ))}
                  </div>
                )}

                <button
                  onClick={() => startGame(false)}
                  className="mt-2 px-7 py-3.5 rounded-2xl btn-gold text-sm flex items-center gap-2"
                >
                  <Play className="w-4 h-4 fill-[var(--on-accent)]" />
                  <span>Ойынды бастау</span>
                </button>
              </div>
            )}

            {/* Game Lost */}
            {gameStatus === 'lost' && (
              <div className="flex flex-col items-center gap-3">
                <div className="text-4xl mb-1">🥺</div>
                <h2 className="font-serif text-xl font-light italic text-[var(--accent-2)]">
                  {assets.lostTitle}
                </h2>
                <p className="text-xs text-[var(--text-muted)] max-w-xs font-light">
                  {assets.lostText}
                </p>
                <button
                  onClick={() => startGame(isBonusMode)}
                  className="mt-2 px-6 py-3 rounded-2xl btn-gold text-sm flex items-center gap-2"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>Қайта байқау</span>
                </button>
              </div>
            )}

            {/* Game Won (for bonus plays) */}
            {gameStatus === 'won' && isBonusMode && (
              <div className="flex flex-col items-center gap-3">
                <div className="text-4xl mb-1">✨</div>
                <h2 className="font-serif text-2xl font-light italic text-[var(--accent)]">
                  Тамаша ойын!
                </h2>
                <p className="text-xs text-[var(--text-muted)] max-w-xs font-light">
                  {assets.wonBonusText}
                </p>
                <button
                  onClick={() => startGame(true)}
                  className="mt-2 px-6 py-3 rounded-2xl btn-gold text-sm flex items-center gap-2"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>Тағы ойнау</span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    );

};
