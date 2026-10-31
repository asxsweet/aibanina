// Жұбын тап (memory) — a 3D-flip pairs game.
//
// Faces come from the couple's own gallery photos when possible (preloaded
// once, at the idle screen) — the shared SVG symbols fill whatever pairs the
// gallery can't cover, and everything falls back to symbols offline.
// The record metric is the fastest full solve (`lowSec`), moves are tracked
// alongside, and the machine is strictly idle → firstSelected → checking →
// (matched | hidden). One lock ref makes double-taps harmless.

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { GameShell } from './shared/GameShell';
import { useGameShell } from './shared/useGameShell';
import { MemorySymbolGlyph, CardBackGlyph, SparkleGlyph } from './shared/art';
import type { GameComponentProps, GameId } from '../gameTypes';
import type { DifficultyName } from '../../utils/constellationUtils';
import { gameAudio, buzz } from '../../utils/gameSound';
import { fetchPhotos } from '../../utils/photoUtils';

const GAME_ID: GameId = 'memory';

interface Preset {
  pairs: number;
  cols: number;
  limitMs: number; // solve budget — run out and the round is lost
}

const PRESETS: Record<DifficultyName, Preset> = {
  easy: { pairs: 6, cols: 4, limitMs: 90_000 }, // 4×3
  medium: { pairs: 8, cols: 4, limitMs: 110_000 }, // 4×4
  hard: { pairs: 10, cols: 5, limitMs: 130_000 }, // 5×4
};

type CardState = 'hidden' | 'open' | 'matched' | 'wrong';

interface CardFace {
  type: 'photo' | 'symbol';
  key: string; // photo dataUrl identity or symbol kind 0..7
}

interface BoardCard {
  id: number;
  face: CardFace;
  photoUrl: string | null;
  state: CardState;
}

// Photos are fetched/preloaded once on mount — flipping must never wait on
// a network request (the spec: preload, then instant).
const photoUrlsRef: { current: string[] } = { current: [] };
let photosRequested = false;

function usePreloadedPhotos(): void {
  useEffect(() => {
    if (photosRequested) return;
    photosRequested = true;
    fetchPhotos()
      .then((list) => {
        const urls = list
          .filter((p) => p.mediaType !== 'video' && /data:image|https?:|\//.test(p.dataUrl))
          .slice(0, 10)
          .map((p) => p.dataUrl);
        photoUrlsRef.current = urls;
        // Warm the browser cache so the first flip is instant.
        urls.forEach((src) => {
          const img = new Image();
          img.decoding = 'async';
          img.src = src;
        });
      })
      .catch(() => {
        // offline / no gallery — the SVG symbols carry the whole game
      });
  }, []);
}

function buildDeck(preset: Preset): BoardCard[] {
  const { pairs } = preset;
  const faces: CardFace[] = [];
  const photos = photoUrlsRef.current;
  const photoPairs = Math.min(pairs, photos.length);
  for (let i = 0; i < photoPairs; i++) {
    faces.push({ type: 'photo', key: `ph${i}` });
  }
  for (let i = 0; i < pairs - photoPairs; i++) {
    faces.push({ type: 'symbol', key: `sy${i % 8}` });
  }
  const doubled = [...faces, ...faces];
  for (let i = doubled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [doubled[i], doubled[j]] = [doubled[j], doubled[i]];
  }
  return doubled.map((face, id) => ({
    id,
    face,
    photoUrl: face.type === 'photo' ? photos[Number(face.key.slice(2))] ?? null : null,
    state: 'hidden',
  }));
}

export const MemoryGame: React.FC<GameComponentProps> = ({
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
  usePreloadedPhotos();

  // ── HUD-facing state ───────────────────────────────────────────────────
  const [cards, setCards] = useState<BoardCard[]>([]);
  const [matchedCount, setMatchedCount] = useState(0);
  const [moves, setMoves] = useState(0);
  const [combo, setCombo] = useState(0);
  const [timeSec, setTimeSec] = useState(Math.round(preset.limitMs / 1000));
  const [shake, setShake] = useState(0);

  // ── live data (refs) ───────────────────────────────────────────────────
  const lockedRef = useRef(false);
  const firstPickIdRef = useRef<number | null>(null);
  const scoreRef = useRef(0);
  const streakRef = useRef(0);
  const bestStreakRef = useRef(0);
  const movesRef = useRef(0);
  const matchedRef = useRef(0);
  const startTimeRef = useRef(0);
  const elapsedRef = useRef(0);
  const pausedTotalRef = useRef(0);
  const pauseStartRef = useRef(0);
  const lastSecRef = useRef(Math.round(preset.limitMs / 1000));
  const endedRef = useRef(false);
  const roundTokenRef = useRef(0); // жаңа раундта ескі таймерлер жұмыс істемесін
  const presetRef = useRef(preset);
  presetRef.current = preset;

  const shell = useGameShell({
    gameId: GAME_ID,
    difficulty,
    metric: 'lowSec',
    playedToday,
    onBeforeStart: useCallback(() => {
      const p = presetRef.current;
      roundTokenRef.current += 1;
      lockedRef.current = false;
      firstPickIdRef.current = null;
      scoreRef.current = 0;
      streakRef.current = 0;
      bestStreakRef.current = 0;
      movesRef.current = 0;
      matchedRef.current = 0;
      pausedTotalRef.current = 0;
      pauseStartRef.current = 0;
      elapsedRef.current = 0;
      endedRef.current = false;
      lastSecRef.current = Math.round(p.limitMs / 1000);
      setCards(buildDeck(p));
      setMatchedCount(0);
      setMoves(0);
      setCombo(0);
      setTimeSec(Math.round(p.limitMs / 1000));
      setShake(0);
    }, []),
    onRoundEnd,
  });

  const elapsedMs = useCallback((): number => {
    return Math.max(0, Date.now() - startTimeRef.current - pausedTotalRef.current);
  }, []);

  // Pause accounting (the solve time must never grow while paused).
  useEffect(() => {
    if (shell.phase === 'paused') {
      pauseStartRef.current = Date.now();
    } else if (shell.phase === 'playing' && pauseStartRef.current) {
      pausedTotalRef.current += Date.now() - pauseStartRef.current;
      pauseStartRef.current = 0;
    }
  }, [shell.phase]);

  // 500ms heartbeat: countdown clock + budget check. Paused rounds never tick.
  useEffect(() => {
    if (shell.phase !== 'playing') return;
    startTimeRef.current = Date.now() - elapsedRef.current - pausedTotalRef.current;
    const iv = setInterval(() => {
      if (!shell.playingRef.current || endedRef.current) return;
      const spent = (elapsedRef.current = elapsedMs());
      const left = presetRef.current.limitMs - spent;
      const sec = Math.max(0, Math.ceil(left / 1000));
      if (sec !== lastSecRef.current) {
        lastSecRef.current = sec;
        setTimeSec(sec);
      }
      if (left <= 0) {
        endedRef.current = true;
        shell.endRound('loss', {
          scoreValue: scoreRef.current,
          metricValue: spent,
          moves: movesRef.current,
          metrics: { matchStreak: bestStreakRef.current },
        });
      }
    }, 500);
    return () => clearInterval(iv);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shell.phase]);

  // ── the flip machine ───────────────────────────────────────────────────
  const handleCard = useCallback(
    (id: number) => {
      if (lockedRef.current || !shell.playingRef.current || endedRef.current) return;
      const card = cards[id];
      if (!card || card.state === 'matched' || card.state === 'open' || card.state === 'wrong') return;
      const token = roundTokenRef.current;
      gameAudio.play('flip');
      buzz(8);

      // idle → firstSelected: wait for the second card
      if (firstPickIdRef.current === null) {
        firstPickIdRef.current = id;
        setCards((prev) => prev.map((c) => (c.id === id ? { ...c, state: 'open' as CardState } : c)));
        return;
      }

      // firstSelected → checking: locked until this pair resolves
      const firstId = firstPickIdRef.current;
      firstPickIdRef.current = null;
      lockedRef.current = true;
      const first = cards[firstId];
      const isPair = !!first && first.face.key === card.face.key;
      movesRef.current += 1;
      setMoves(movesRef.current);
      setCards((prev) =>
        prev.map((c) => (c.id === id || c.id === firstId ? { ...c, state: 'open' as CardState } : c))
      );

      setTimeout(() => {
        if (token !== roundTokenRef.current) return;
        if (isPair) {
          // checking → matched
          streakRef.current += 1;
          bestStreakRef.current = Math.max(bestStreakRef.current, streakRef.current);
          const points = 60 + (streakRef.current - 1) * 15;
          scoreRef.current += points;
          matchedRef.current += 1;
          setMatchedCount(matchedRef.current); // HUD: табылған жұп саны
          setCombo(streakRef.current > 1 ? streakRef.current : 0);
          gameAudio.play(streakRef.current >= 3 ? 'combo' : 'point', { combo: streakRef.current });
          buzz(12);
          setCards((cur) =>
            cur.map((c) =>
              c.id === firstId || c.id === id ? { ...c, state: 'matched' as CardState } : c
            )
          );
          if (matchedRef.current >= presetRef.current.pairs && !endedRef.current) {
            endedRef.current = true;
            shell.endRound('win', {
              scoreValue: scoreRef.current,
              metricValue: elapsedMs(),
              moves: movesRef.current,
              metrics: { matchStreak: bestStreakRef.current },
            });
          }
        } else {
          // checking → wrong (карталар сілкінеді) → hidden again
          streakRef.current = 0;
          setCombo(0);
          gameAudio.play('miss');
          buzz([12, 30, 12]);
          setCards((cur) =>
            cur.map((c) =>
              c.id === firstId || c.id === id ? { ...c, state: 'wrong' as CardState } : c
            )
          );
          setTimeout(() => {
            if (token !== roundTokenRef.current) return;
            setCards((cur) =>
              cur.map((c) =>
                c.id === firstId || c.id === id ? { ...c, state: 'hidden' as CardState } : c
              )
            );
            lockedRef.current = false;
          }, 420);
          return;
        }
        lockedRef.current = false;
      }, isPair ? 380 : 520);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [cards, shell.playingRef, shell.endRound, elapsedMs]
  );

  // ── render helpers ─────────────────────────────────────────────────────
  const rows = Math.ceil((preset.pairs * 2) / preset.cols);

  const steps = useMemo(
    () => [
      'Картаны басып аш. Естелікке салып, екіншісін таб.',
      'Екі жүз бет бірдей болса — жұп қалады, болмаса — қайта жабылады.',
      'Аз жүріспен, тезірек шешу — үлкен рекорд. Фотолар сендердікі!',
    ],
    []
  );

  return (
    <GameShell
      gameId={GAME_ID}
      gameName="Жұбын тап"
      shell={shell}
      difficulty={difficulty}
      onSetDifficulty={onSetDifficulty}
      mission={{
        title: `Жұптарын тап — ${preset.pairs} жұп`,
        text: 'Естелікке салып жұп-жұбымен аш. Сендердің фотоларың жанның нөмірі!',
        steps,
      }}
      hud={{
        score: matchedCount,
        targetScore: preset.pairs,
        lives: undefined,
        timerSec: timeSec,
        combo,
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
        className={`absolute inset-0 flex flex-col items-center justify-center px-3 game-field ${
          shake > 0 && shell.phase === 'playing' ? 'anim-shake' : ''
        }`}
        style={{ touchAction: 'none' }}
      >
        {/* win sparkle wave */}
        {shell.phase === 'over' && shell.outcome === 'win' && (
          <div className="absolute inset-y-0 right-2 w-8 pointer-events-none z-20">
            {Array.from({ length: 6 }).map((_, i) => (
              <span
                key={i}
                className="absolute text-[var(--accent)] anim-sparkle-float"
                style={{ top: `${8 + i * 15}%`, animationDelay: `${i * 0.12}s` }}
              >
                <SparkleGlyph size={14} />
              </span>
            ))}
          </div>
        )}

        <div
          className="grid gap-1.5 sm:gap-2 w-full max-w-[360px]"
          style={{ gridTemplateColumns: `repeat(${preset.cols}, minmax(0, 1fr))` }}
        >
          {cards.map((card) => (
            <button
              key={card.id}
              onClick={() => handleCard(card.id)}
              disabled={card.state === 'matched'}
              aria-label={card.state === 'matched' ? 'Табылған жұп' : 'Жабық карта'}
              className={`flip-card aspect-square ${card.state !== 'hidden' ? 'is-flipped' : ''} ${
                card.state === 'matched' ? 'is-matched' : ''
              } ${card.state === 'wrong' ? 'is-wrong' : ''}`}
            >
              <span className="flip-inner">
                {/* closed side */}
                <span className="flip-face bg-[var(--bg-soft)] border border-[var(--border)] active:scale-95 transition-transform">
                  <CardBackGlyph size={26} />
                </span>
                {/* opened side */}
                <span className="flip-face flip-face-back bg-[var(--bg-elevated)] border border-[var(--accent)]/35">
                  {card.face.type === 'photo' && card.photoUrl ? (
                    <img
                      src={card.photoUrl}
                      alt=""
                      draggable={false}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <MemorySymbolGlyph kind={Number((card.face.key || 'sy0').slice(2))} size={26} />
                  )}
                </span>
              </span>
            </button>
          ))}
        </div>
      </div>
    </GameShell>
  );
};
