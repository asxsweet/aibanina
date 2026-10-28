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
import { GameShell } from './shared/GameShell';
import { useGameShell } from './shared/useGameShell';
import { CrystalGlyph, SparkleGlyph } from './shared/art';
import type { CrystalSpecial } from './shared/art';
import type { GameComponentProps, GameId } from '../gameTypes';
import type { DifficultyName } from '../../utils/constellationUtils';
import { gameAudio, buzz } from '../../utils/gameSound';

const GAME_ID: GameId = 'match3';

const SIZE = 7;
const COLORS = 6;

interface Preset {
  moves: number;
  goal: number;
}

const PRESETS: Record<DifficultyName, Preset> = {
  easy: { moves: 24, goal: 1200 },
  medium: { moves: 20, goal: 2500 },
  hard: { moves: 16, goal: 4200 },
};

interface Cell {
  color: number;
  special: CrystalSpecial;
}

type Board = Cell[];

const sleep = (ms: number): Promise<void> => new Promise((r) => window.setTimeout(r, ms));

function randCell(): Cell {
  return { color: Math.floor(Math.random() * COLORS), special: 'none' };
}

function randomBoard(): Board {
  return Array.from({ length: SIZE * SIZE }, randCell);
}

const emptyRemoval = (): boolean[] => new Array(SIZE * SIZE).fill(false);

function row(i: number): number {
  return Math.floor(i / SIZE);
}

function col(i: number): number {
  return i % SIZE;
}

function idx(r: number, c: number): number {
  return r * SIZE + c;
}

function adjacent(a: number, b: number): boolean {
  return Math.abs(row(a) - row(b)) + Math.abs(col(a) - col(b)) === 1;
}

// Horizontal runs of ≥3 (returns cell index lists).
function runH(b: Board): number[][] {
  const runs: number[][] = [];
  for (let r = 0; r < SIZE; r++) {
    let k = 0;
    for (let c = 1; c <= SIZE; c++) {
      const end = c === SIZE;
      if (!end && b[idx(r, c)].color === b[idx(r, k)].color) continue;
      if (c - k >= 3) {
        const cells = [];
        for (let x = k; x < c; x++) cells.push(idx(r, x));
        runs.push(cells);
      }
      k = c;
    }
  }
  return runs;
}

// Vertical runs of ≥3.
function runV(b: Board): number[][] {
  const runs: number[][] = [];
  for (let c = 0; c < SIZE; c++) {
    let k = 0;
    for (let r = 1; r <= SIZE; r++) {
      const end = r === SIZE;
      if (!end && b[idx(r, c)].color === b[idx(k, c)].color) continue;
      if (r - k >= 3) {
        const cells = [];
        for (let x = k; x < r; x++) cells.push(idx(x, c));
        runs.push(cells);
      }
      k = r;
    }
  }
  return runs;
}

interface MatchInfo {
  h: number[][];
  v: number[][];
}

function findMatches(b: Board): MatchInfo {
  return { h: runH(b), v: runV(b) };
}

function hasAnyRun(b: Board): boolean {
  return runH(b).length > 0 || runV(b).length > 0;
}

// Any swap that would produce a run? (for hints + deadlock shuffle)
function possibleMoves(b: Board): Array<[number, number]> {
  const moves: Array<[number, number]> = [];
  for (let i = 0; i < SIZE * SIZE; i++) {
    if (i % SIZE < SIZE - 1) {
      const b2 = [...b];
      [b2[i], b2[i + 1]] = [b2[i + 1], b2[i]];
      if (hasAnyRun(b2)) moves.push([i, i + 1]);
    }
    if (i + SIZE < SIZE * SIZE) {
      const b2 = [...b];
      [b2[i], b2[i + SIZE]] = [b2[i + SIZE], b2[i]];
      if (hasAnyRun(b2)) moves.push([i, i + SIZE]);
    }
  }
  return moves;
}

/**
 * Decide what the removal wave looks like: which cells pop, which cells
 * birth specials, and at which index each special is born.
 */
interface Wave {
  removal: boolean[];
  births: Map<number, CrystalSpecial>;
}

function buildWave(board: Board, info: MatchInfo, swapIdx: number | null): Wave {
  const removal = emptyRemoval();
  const all = [...info.h, ...info.v];
  all.forEach((cells) => cells.forEach((i) => (removal[i] = true)));

  // a cell belonging to both an H and a V run (the cross point of T/L) → bomb
  const births = new Map<number, CrystalSpecial>();
  const crossCells: number[] = [];
  for (const hc of info.h) {
    for (const vc of info.v) {
      const shared = hc.filter((i) => vc.includes(i) && removal[i]);
      shared.forEach((i) => crossCells.push(i));
    }
  }
  crossCells.forEach((i) => births.set(i, 'bomb'));

  // runs still unclaimed → striped (4) or star (5)
  const claimed = (cells: number[]): boolean => cells.some((i) => births.has(i));
  const preferIdx = (cells: number[]): number => {
    if (swapIdx !== null && removal[swapIdx] && cells.includes(swapIdx)) return swapIdx;
    return cells[Math.floor(cells.length / 2)];
  };
  for (const cells of info.v) {
    if (claimed(cells)) continue;
    const at = preferIdx(cells);
    births.set(at, cells.length >= 5 ? 'star' : cells.length === 4 ? 'stripedV' : 'none');
  }
  for (const cells of info.h) {
    if (claimed(cells)) continue;
    const at = preferIdx(cells);
    births.set(at, cells.length >= 5 ? 'star' : cells.length === 4 ? 'stripedH' : 'none');
  }
  // a birth keeps its cell on the board
  births.forEach((_sp, i) => (removal[i] = false));
  void board;
  return { removal, births };
}

/** Expand specials into extra removals, chains included. */
function expandSpecials(board: Board, removal: boolean[]): { removal: boolean[]; detonations: number } {
  const out = [...removal];
  let detonations = 0;
  const queue: number[] = [];
  for (let i = 0; i < out.length; i++) if (out[i]) queue.push(i);
  const queued = new Set<number>(queue);

  while (queue.length) {
    const i = queue.shift() as number;
    const cell = board[i];
    if (!cell) continue;
    if (cell.special === 'none') continue;
    const spread: number[] = [];
    if (cell.special === 'stripedH') {
      for (let c = 0; c < SIZE; c++) spread.push(idx(row(i), c));
    } else if (cell.special === 'stripedV') {
      for (let r = 0; r < SIZE; r++) spread.push(idx(r, col(i)));
    } else if (cell.special === 'bomb') {
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          const r = row(i) + dr;
          const c = col(i) + dc;
          if (r >= 0 && r < SIZE && c >= 0 && c < SIZE) spread.push(idx(r, c));
        }
      }
    } else if (cell.special === 'star') {
      for (let j = 0; j < board.length; j++) if (board[j].color === cell.color) spread.push(j);
    }
    detonations += 1;
    for (const j of spread) {
      if (out[j]) continue;
      out[j] = true;
      if (!queued.has(j)) {
        queued.add(j);
        queue.push(j);
      }
    }
  }
  return { removal: out, detonations };
}

/** gravity: drop every crystal into the gaps, refill the exposed top */
function applyGravity(
  board: Board
): { next: Board; moved: boolean[] } {
  const next: Board = new Array(SIZE * SIZE);
  const moved = emptyRemoval();
  for (let c = 0; c < SIZE; c++) {
    let write = SIZE - 1;
    for (let r = SIZE - 1; r >= 0; r--) {
      const i = idx(r, c);
      const cell = board[i];
      if (!removed(cell)) {
        next[idx(write, c)] = cell;
        if (write !== r) moved[idx(write, c)] = true;
        write -= 1;
      }
    }
    for (let r = write; r >= 0; r--) {
      next[idx(r, c)] = randCell();
      moved[idx(r, c)] = true;
    }
  }
  return { next, moved };
}

function removed(cell: Cell | undefined): boolean {
  return !cell;
}

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
      let fresh = randomBoard();
      for (let tries = 0; tries < 60 && (hasAnyRun(fresh) || possibleMoves(fresh).length === 0); tries++) {
        fresh = randomBoard();
      }
      boardRef.current = fresh;
      uidRef.current = Array.from({ length: SIZE * SIZE }, (_, i) => i + 1);
      nextUidRef.current = SIZE * SIZE + 1;
      busyRef.current = false;
      movesRef.current = presetRef.current.moves;
      scoreRef.current = 0;
      comboRef.current = 0;
      bestComboRef.current = 0;
      endedRef.current = false;
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

  // ── cascade engine ─────────────────────────────────────────────────────
  const settle = useCallback(async (): Promise<void> => {
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

      const wave = buildWave(boardRef.current, info, null);
      const { removal: expanded, detonations } = expandSpecials(boardRef.current, wave.removal);
      const cleared = expanded.filter(Boolean).length;
      scoreRef.current += cleared * 50 + detonations * 30 + cascade * 25;
      setScore(scoreRef.current);

      // pop
      setRemoval(expanded);
      await sleep(240);
      if (!shell.playingRef.current) return;

      // merging births back onto the board: special cells survive the wave
      const after: Board = boardRef.current.map((c) => ({ ...c }));
      for (let i = 0; i < after.length; i++) {
        if (!expanded[i]) continue;
        const birth = wave.births.get(i);
        if (birth && birth !== 'none') {
          after[i] = { color: after[i].color, special: birth };
        } else {
          after[i] = undefined as unknown as Cell;
        }
      }
      const { next, moved } = applyGravity(after);
      boardRef.current = next;
      const nextUids = [...uidRef.current];
      for (let i = 0; i < nextUids.length; i++) if (moved[i]) nextUids[i] = nextUidRef.current++;
      setBoardWin(next);
      setUids(nextUids);
      setRemoval(null);
      await sleep(260); // fall/refill settle
      if (!shell.playingRef.current) return;
    }
    comboRef.current = 0;
    setCombo(0);
  }, [shell.playingRef]);

  const handleTap = useCallback(
    (i: number) => {
      if (!shell.playingRef.current || endedRef.current || busyRef.current) return;
      setHint(null);
      if (selected === null) {
        gameAudio.play('button');
        setSelected(i);
        return;
      }
      if (selected === i) {
        gameAudio.play('flip');
        setSelected(null);
        return;
      }
      if (!adjacent(selected, i)) {
        gameAudio.play('button');
        setSelected(i);
        return;
      }
      // swap attempt
      const before = boardRef.current;
      const attempt = [...before];
      [attempt[selected], attempt[i]] = [attempt[i], attempt[selected]];
      setSelected(null);

      if (!hasAnyRun(attempt)) {
        // fail swap → wiggle + revert
        gameAudio.play('miss');
        setShake((s) => s + 1);
        buzz(12);
        void (async () => {
          busyRef.current = true;
          boardRef.current = attempt;
          setBoardWin(attempt);
          await sleep(210);
          boardRef.current = before;
          setBoardWin(before);
          busyRef.current = false;
        })();
        return;
      }

      void (async () => {
        busyRef.current = true;
        boardRef.current = attempt;
        setBoardWin(attempt);
        gameAudio.play('swap');
        await sleep(200);
        if (!shell.playingRef.current || endedRef.current) {
          busyRef.current = false;
          return;
        }
        await settle();
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
          // deadlock → auto reshuffle until the board plays again
          gameAudio.play('shuffle');
          let shuffled = randomBoard();
          for (let tries = 0; tries < 60 && (hasAnyRun(shuffled) || possibleMoves(shuffled).length === 0); tries++) {
            shuffled = randomBoard();
          }
          boardRef.current = shuffled;
          setUids(Array.from({ length: SIZE * SIZE }, (_, k) => nextUidRef.current + k));
          nextUidRef.current += SIZE * SIZE;
          setBoardWin(shuffled);
        }
      })();
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [selected, shell.playingRef, shell.endRound, settle]
  );

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
      'Екі көрші кристалды түртіп ауыстыр — 3+ қатар жинаса құлап түседі.',
      '4 қатар — Жолақты кристал (бір баған/жол), 5 қатар — Жұлдыз, Т/Г пішіні — Бомба.',
      'Қозғалыс аз қалғанда мақсатқа (ұпай жинауға) ұмтыл; жерге еш жүріс қалмаса — ақтікше шешім.',
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
          shake > 0 && shell.phase === 'playing' ? 'anim-shake' : ''
        }`}
        style={{ touchAction: 'none' }}
      >
        <div
          className="grid w-full max-w-[352px] gap-[3px] p-1.5 rounded-2xl bg-[var(--bg-soft)]/70 border border-[var(--border)]"
          style={{ gridTemplateColumns: `repeat(${SIZE}, minmax(0, 1fr))` }}
        >
          {boardWin.map((cell, i) => {
            const isHint = !!hint && (i === hint[0] || i === hint[1]);
            return (
              <button
                key={uids[i] + '-' + i}
                onClick={() => handleTap(i)}
                aria-label="Кристалл"
                className={`aspect-square rounded-lg flex items-center justify-center transition active:scale-90 ${
                  selected === i ? 'scale-95 bg-[var(--accent)]/20' : 'bg-transparent'
                } ${isHint ? 'anim-hint-pulse' : ''} ${
                  removal && removal[i] ? 'cell-pop' : 'cell-new'
                }`}
              >
                <CrystalGlyph colorIndex={cell.color} special={cell.special} size={30} />
              </button>
            );
          })}
        </div>
        <p className="mt-2 text-[10px] text-[var(--text-faint)] flex items-center gap-1 pointer-events-none">
          <SparkleGlyph size={10} /> {moves} жүріс · мақсат {preset.goal}
        </p>
      </div>
    </GameShell>
  );
};
