// Жұлдызды кристалдар (match-3) — a full state-machine cascade engine.
//
// idle → swapping → checking → removing (pop) → falling (gravity + refill)
// → checking → … until the board settles, then back to idle. An invalid swap
// visibly reverts; a valid swap can birth specials: a run of 4 becomes a
// striped crystal (cleans its row/column), a run of 5 births a star (wipes
// everything of that colour), and cross-shaped (T/L) matches make a bomb.
// Specials detonate each other when swept along. The win is a level goal
// (score within the move budget); the daily task reads the best cascade
// combo (`combos`). After 6 idle seconds a possible move pulses as a hint,
// and a board with zero possible moves reshuffles itself.

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import { GameShell } from './shared/GameShell';
import { useGameShell } from './shared/useGameShell';
import { CrystalGlyph, SparkleGlyph } from './shared/art';
import type { GameComponentProps, GameId } from '../gameTypes';
import type { DifficultyName } from '../../utils/constellationUtils';
import { gameAudio, buzz } from '../../utils/gameSound';
import {
  SIZE,
  adjacent,
  applyGravity,
  applyWave,
  buildWave,
  col,
  expandSpecials,
  findMatches,
  freshBoard,
  hasAnyRun,
  possibleMoves,
  randomBoard,
  row,
} from './match3Logic';
import type { Board } from './match3Logic';

const GAME_ID: GameId = 'match3';

interface Preset {
  moves: number;
  goal: number;
}

const PRESETS: Record<DifficultyName, Preset> = {
  easy: { moves: 24, goal: 1200 },
  medium: { moves: 20, goal: 2500 },
  hard: { moves: 16, goal: 4200 },
};

interface Popup {
  id: number;
  left: number; // %
  top: number; // %
  text: string;
  big: boolean;
}

const sleep = (ms: number): Promise<void> => new Promise((r) => window.setTimeout(r, ms));
const zeros = (): number[] => new Array(SIZE * SIZE).fill(0);
const falses = (): boolean[] => new Array(SIZE * SIZE).fill(false);

// ─────────────────────────────────────────────────────────────── component

export const Match3Game: React.FC<GameComponentProps> = ({
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

  // ── HUD-facing state ───────────────────────────────────────────────────
  const [boardWin, setBoardWin] = useState<Board>(randomBoard);
  const [uids, setUids] = useState<number[]>(() => Array.from({ length: SIZE * SIZE }, (_, i) => i + 1));
  const [selected, setSelected] = useState<number | null>(null);
  const [moves, setMoves] = useState(preset.moves);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [removal, setRemoval] = useState<boolean[] | null>(null);
  const [falls, setFalls] = useState<number[]>(zeros);
  const [born, setBorn] = useState<boolean[]>(falses);
  const [intro, setIntro] = useState(true); // бастапқы «түсу» анимациясы
  const [badPair, setBadPair] = useState<[number, number] | null>(null);
  const [popups, setPopups] = useState<Popup[]>([]);
  const [hint, setHint] = useState<[number, number] | null>(null);
  const [shake, setShake] = useState(0);

  // ── live data (refs) ───────────────────────────────────────────────────
  const boardRef = useRef<Board>(boardWin); // synced each render
  const uidRef = useRef(uids);
  const busyRef = useRef(false);
  const movesRef = useRef(preset.moves);
  const scoreRef = useRef(0);
  const comboRef = useRef(0); // live cascade counter
  const bestComboRef = useRef(0);
  const endedRef = useRef(false);
  const nextUidRef = useRef(SIZE * SIZE + 1);
  const popupIdRef = useRef(1);
  const cellEls = useRef<Array<HTMLButtonElement | null>>([]);
  const dragRef = useRef<{ i: number; x: number; y: number; done: boolean } | null>(null);
  const presetRef = useRef(preset);
  presetRef.current = preset;

  boardRef.current = boardWin;
  uidRef.current = uids;

  const shell = useGameShell({
    gameId: GAME_ID,
    difficulty,
    metric: 'score',
    playedToday,
    onBeforeStart: useCallback(() => {
      const fresh = freshBoard();
      boardRef.current = fresh;
      uidRef.current = Array.from({ length: SIZE * SIZE }, (_, i) => i + 1);
      nextUidRef.current = SIZE * SIZE + 1;
      busyRef.current = false;
      movesRef.current = presetRef.current.moves;
      scoreRef.current = 0;
      comboRef.current = 0;
      bestComboRef.current = 0;
      endedRef.current = false;
      setIntro(true);
      setFalls(zeros());
      setBorn(falses());
      setBadPair(null);
      setPopups([]);
      setBoardWin(fresh);
      setUids(uidRef.current);
      setSelected(null);
      setMoves(presetRef.current.moves);
      setScore(0);
      setCombo(0);
      setRemoval(null);
      setHint(null);
      setShake(0);
    }, []),
    onRoundEnd,
  });

  // ── ұпай көрсеткіші (жарылған жердің үстінде қалқып шығады) ────────────
  const addPopup = useCallback((cleared: boolean[], gain: number, cascade: number) => {
    let sr = 0, sc = 0, n = 0;
    cleared.forEach((f, i) => { if (f) { sr += row(i); sc += col(i); n += 1; } });
    if (!n) return;
    const id = popupIdRef.current++;
    const p: Popup = {
      id,
      left: ((sc / n + 0.5) / SIZE) * 100,
      top: ((sr / n + 0.5) / SIZE) * 100,
      text: cascade > 1 ? `×${cascade}  +${gain}` : `+${gain}`,
      big: cascade > 1,
    };
    setPopups((cur) => [...cur.slice(-4), p]);
    window.setTimeout(() => setPopups((cur) => cur.filter((x) => x.id !== id)), 900);
  }, []);

  // ── cascade engine ─────────────────────────────────────────────────────
  const settle = useCallback(async (swapCells: number[]): Promise<void> => {
    let cascade = 0;
    for (let guard = 0; guard < 14; guard++) {
      if (!shell.playingRef.current || endedRef.current) return;
      const info = findMatches(boardRef.current);
      if (info.h.length === 0 && info.v.length === 0) break;
      cascade += 1;
      comboRef.current = cascade;
      setCombo(cascade);
      if (cascade > bestComboRef.current) bestComboRef.current = cascade;
      gameAudio.play(cascade > 1 ? 'combo' : 'point', { combo: cascade });
      buzz(10);

      const wave = buildWave(info, cascade === 1 ? swapCells : []);
      const { removal: expanded, detonations } = expandSpecials(boardRef.current, wave.removal);
      const cleared = expanded.filter(Boolean).length;
      const gain = cleared * 50 + detonations * 30 + cascade * 25;
      scoreRef.current += gain;
      setScore(scoreRef.current);
      addPopup(expanded, gain, cascade);

      // 1) жарылу анимациясы
      setRemoval(expanded);
      await sleep(290);
      if (!shell.playingRef.current) return;

      // 2) жойылғандар кетеді, туғандар арнайы кристалл болып қалады, қалғаны құлайды
      const { next, moved, fall } = applyGravity(applyWave(boardRef.current, wave, expanded));
      const bornFlags = next.map((c) => !!c.born);
      boardRef.current = next.map((c) => ({ color: c.color, special: c.special })); // born белгісін тазалау
      const nextUids = [...uidRef.current];
      for (let i = 0; i < nextUids.length; i++) if (moved[i] || bornFlags[i]) nextUids[i] = nextUidRef.current++;
      setFalls(fall);
      setBorn(bornFlags);
      setBoardWin(boardRef.current);
      setUids(nextUids);
      setRemoval(null);
      const maxFall = Math.max(...fall, 1);
      await sleep(210 + maxFall * 55); // құлау анимациясы біткенше
      setFalls(zeros());
      setBorn(falses());
      if (!shell.playingRef.current) return;
    }
    comboRef.current = 0;
    setCombo(0);
  }, [shell.playingRef, addPopup]);

  // ── екі кристалдың орын ауыстыруы (анимациямен) ────────────────────────
  // go=true: кристалдар бір-біріне қарай сырғиды; bounce=true: жүріс жарамсыз — қайта сырғып оралады
  const slideCells = useCallback(async (a: number, b: number, bounce: boolean): Promise<void> => {
    const ea = cellEls.current[a];
    const eb = cellEls.current[b];
    if (!ea || !eb) return;
    const ra = ea.getBoundingClientRect();
    const rb = eb.getBoundingClientRect();
    const dx = rb.left + rb.width / 2 - (ra.left + ra.width / 2);
    const dy = rb.top + rb.height / 2 - (ra.top + ra.height / 2);
    ea.style.zIndex = '3';
    eb.style.zIndex = '2';
    ea.style.transform = `translate(${dx}px, ${dy}px)`;
    eb.style.transform = `translate(${-dx}px, ${-dy}px)`;
    await sleep(200);
    if (bounce) {
      ea.style.transform = '';
      eb.style.transform = '';
      await sleep(200);
      ea.style.zIndex = '';
      eb.style.zIndex = '';
    }
  }, []);

  // Тақта жаңарғаннан кейін transform-ды анимациясыз тазалайды (секіру болмасын)
  const resetCells = useCallback((a: number, b: number): void => {
    [cellEls.current[a], cellEls.current[b]].forEach((el) => {
      if (!el) return;
      el.style.transition = 'none';
      el.style.transform = '';
      el.style.zIndex = '';
      void el.offsetWidth;
      el.style.transition = '';
    });
  }, []);

  const trySwap = useCallback(
    (a: number, b: number) => {
      if (!shell.playingRef.current || endedRef.current || busyRef.current) return;
      setHint(null);
      setSelected(null);
      const before = boardRef.current;
      const attempt = [...before];
      [attempt[a], attempt[b]] = [attempt[b], attempt[a]];
      busyRef.current = true;

      void (async () => {
        gameAudio.play('swap');
        if (!hasAnyRun(attempt)) {
          // жарамсыз жүріс: сырғып барып, қайта оралады да сәл сілкінеді
          await slideCells(a, b, true);
          gameAudio.play('miss');
          buzz(12);
          setBadPair([a, b]);
          setShake((s) => s + 1);
          window.setTimeout(() => setBadPair(null), 260);
          busyRef.current = false;
          return;
        }
        await slideCells(a, b, false);
        // ТАҚТАНЫ бір кадрда жаңартып, transform-ды сол кадрда тазалаймыз — көзге секіру білінбейді
        flushSync(() => {
          boardRef.current = attempt;
          setBoardWin(attempt);
          setIntro(false);
        });
        resetCells(a, b);
        if (!shell.playingRef.current || endedRef.current) {
          busyRef.current = false;
          return;
        }
        await settle([a, b]);
        busyRef.current = false;
        if (!shell.playingRef.current || endedRef.current) return;

        movesRef.current = Math.max(0, movesRef.current - 1);
        setMoves(movesRef.current);

        if (scoreRef.current >= presetRef.current.goal) {
          endedRef.current = true;
          gameAudio.play('win');
          shell.endRound('win', {
            scoreValue: scoreRef.current,
            moves: presetRef.current.moves - movesRef.current,
            metrics: { combos: bestComboRef.current },
          });
        } else if (movesRef.current <= 0) {
          endedRef.current = true;
          shell.endRound('loss', {
            scoreValue: scoreRef.current,
            metrics: { combos: bestComboRef.current },
          });
        } else if (possibleMoves(boardRef.current).length === 0) {
          // жүріс қалмады → тақта өзі араласады
          gameAudio.play('shuffle');
          const shuffled = freshBoard();
          boardRef.current = shuffled;
          setUids(Array.from({ length: SIZE * SIZE }, (_, k) => nextUidRef.current + k));
          nextUidRef.current += SIZE * SIZE;
          setIntro(true);
          setBoardWin(shuffled);
        }
      })();
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [shell.playingRef, shell.endRound, settle, slideCells, resetCells]
  );

  // Түрту: бірінші кристалды белгілеп, екіншісін түртсе — екеуі ауысады
  const handleTap = useCallback(
    (i: number) => {
      if (!shell.playingRef.current || endedRef.current || busyRef.current) return;
      setHint(null);
      if (selected === null) {
        gameAudio.play('button');
        setSelected(i);
      } else if (selected === i) {
        gameAudio.play('flip');
        setSelected(null);
      } else if (!adjacent(selected, i)) {
        gameAudio.play('button');
        setSelected(i);
      } else {
        trySwap(selected, i);
      }
    },
    [selected, shell.playingRef, trySwap]
  );

  // Свайп: кристалды басып қасындағысына қарай сырғыту (телефонда ыңғайлы)
  const onCellPointerDown = (i: number, e: React.PointerEvent): void => {
    dragRef.current = { i, x: e.clientX, y: e.clientY, done: false };
  };
  const onCellPointerMove = (e: React.PointerEvent): void => {
    const d = dragRef.current;
    if (!d || d.done) return;
    const dx = e.clientX - d.x;
    const dy = e.clientY - d.y;
    if (Math.hypot(dx, dy) < 18) return;
    d.done = true;
    let t: number;
    if (Math.abs(dx) > Math.abs(dy)) {
      if (dx > 0 ? col(d.i) === SIZE - 1 : col(d.i) === 0) return;
      t = d.i + (dx > 0 ? 1 : -1);
    } else {
      t = d.i + (dy > 0 ? SIZE : -SIZE);
      if (t < 0 || t >= SIZE * SIZE) return;
    }
    trySwap(d.i, t);
  };
  const onCellClick = (i: number): void => {
    if (dragRef.current?.done) {
      dragRef.current = null; // свайптан кейінгі «click» санамайды
      return;
    }
    handleTap(i);
  };

  // ── idle hint (a possible move pulses after 6s of silence) ────────────
  useEffect(() => {
    if (shell.phase !== 'playing' || busyRef.current) return;
    const iv = setInterval(() => {
      if (busyRef.current || !shell.playingRef.current) return;
      const mv = possibleMoves(boardRef.current)[0];
      setHint(mv ?? null);
    }, 6000);
    return () => clearInterval(iv);
  }, [shell.phase, boardWin]);

  // ── render ─────────────────────────────────────────────────────────────
  const steps = useMemo(
    () => [
      'Екі көрші кристалды түртіп ауыстыр (немесе бір кристалды қасындағысына қарай сырғыт) — 3+ бірдей қатар жиналса бәрі жойылады.',
      '4 қатар — Жолақты кристалл (бір жол/баған), 5 қатар — Жұлдыз, Т/Г пішіні — Бомба.',
      'Қозғалыс аз қалғанда мақсатқа (ұпай жинауға) ұмтыл; каскад көп болса — ұпай да көп.',
    ],
    []
  );

  return (
    <GameShell
      gameId={GAME_ID}
      gameName="Жұлдызды кристалдар"
      shell={shell}
      difficulty={difficulty}
      onSetDifficulty={onSetDifficulty}
      mission={{
        title: `Мақсат: ${preset.goal} ұпай · ${preset.moves} жүріс`,
        text: 'Ауыстырып қатар құрып, каскад жаса. Бомба мен жұлдызды кристалдар көмегімен де іске асыр.',
        steps,
      }}
      hud={{
        score,
        targetScore: preset.goal,
        lives: undefined,
        timerSec: undefined,
        movesLabel: `${moves} жүріс`,
        combo,
      }}
      recordsLine={recordsLine}
      taskLine={taskLine}
      rewardNote={rewardNote}
      onAnotherGame={onAnotherGame}
      onOpenLeaderboard={onOpenLeaderboard}
      onHome={onHome}
      heightClass="h-[520px] sm:h-[550px]"
    >
      <div
        className={`absolute inset-0 flex flex-col items-center justify-center px-2 game-field overflow-hidden ${
          shake > 0 && shell.phase === 'playing' && !badPair ? 'anim-shake' : ''
        }`}
        style={{ touchAction: 'none' }}
      >
        <div className="relative w-full max-w-[352px]">
          <div
            className="grid w-full gap-[3px] p-1.5 rounded-2xl overflow-hidden bg-[var(--bg-soft)]/70 border border-[var(--border)]"
            style={{ gridTemplateColumns: `repeat(${SIZE}, minmax(0, 1fr))` }}
          >
            {boardWin.map((cell, i) => {
              const isHint = !!hint && (i === hint[0] || i === hint[1]);
              const isPop = !!removal && removal[i];
              const anim = isPop ? 'cell-pop' : born[i] ? 'cell-born' : falls[i] > 0 ? 'cell-fall' : intro ? 'cell-new' : '';
              const isSel = selected === i;
              const isNeighbor = selected !== null && !isSel && adjacent(selected, i);
              const isBad = !!badPair && (i === badPair[0] || i === badPair[1]);
              return (
                <button
                  key={uids[i] + '-' + i}
                  ref={(el) => {
                    cellEls.current[i] = el;
                  }}
                  onClick={() => onCellClick(i)}
                  onPointerDown={(e) => onCellPointerDown(i, e)}
                  onPointerMove={onCellPointerMove}
                  aria-label="Кристалл"
                  data-c={cell.color}
                  data-s={cell.special}
                  aria-pressed={isSel}
                  className={`m3-cell aspect-square rounded-lg flex items-center justify-center active:scale-90 ${
                    isSel ? 'm3-selected' : isNeighbor ? 'm3-neighbor' : 'bg-transparent'
                  } ${isHint ? 'anim-hint-pulse' : ''} ${isBad ? 'm3-bad' : ''} ${anim}`}
                  style={falls[i] > 0 ? ({ '--fall': falls[i] } as React.CSSProperties) : undefined}
                >
                  <CrystalGlyph colorIndex={cell.color} special={cell.special} size={30} />
                </button>
              );
            })}
          </div>

          {/* ұпай көрсеткіштері */}
          {popups.map((p) => (
            <span
              key={p.id}
              className={`m3-popup absolute pointer-events-none font-black whitespace-nowrap text-[var(--accent)] drop-shadow-[0_2px_6px_rgba(0,0,0,.35)] ${
                p.big ? 'text-lg' : 'text-sm'
              }`}
              style={{ left: `${p.left}%`, top: `${p.top}%` }}
            >
              {p.text}
            </span>
          ))}
        </div>
        <p className="mt-2 text-[10px] text-[var(--text-faint)] flex items-center gap-1 pointer-events-none">
          <SparkleGlyph size={10} /> {moves} жүріс · мақсат {preset.goal}
        </p>
      </div>
    </GameShell>
  );
};
