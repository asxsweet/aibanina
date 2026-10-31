// Жұлдызды кристалдар — таза логика (React-сыз), сондықтан оңай тестіленеді.
import type { CrystalSpecial } from './shared/art';

export const SIZE = 7;
export const COLORS = 6;

export interface Cell {
  color: number;
  special: CrystalSpecial;
  /** жаңа туған арнайы кристалл (тек анимация үшін, бір толқынға ғана) */
  born?: boolean;
}
export type Board = Cell[];

export function randCell(): Cell {
  return { color: Math.floor(Math.random() * COLORS), special: 'none' };
}
export function randomBoard(): Board {
  return Array.from({ length: SIZE * SIZE }, randCell);
}
export const emptyFlags = (): boolean[] => new Array(SIZE * SIZE).fill(false);

export const row = (i: number): number => Math.floor(i / SIZE);
export const col = (i: number): number => i % SIZE;
export const idx = (r: number, c: number): number => r * SIZE + c;
export const adjacent = (a: number, b: number): boolean =>
  Math.abs(row(a) - row(b)) + Math.abs(col(a) - col(b)) === 1;

// Көлденең қатарлар (≥3)
function runH(b: Board): number[][] {
  const runs: number[][] = [];
  for (let r = 0; r < SIZE; r++) {
    let k = 0;
    for (let c = 1; c <= SIZE; c++) {
      if (c < SIZE && b[idx(r, c)].color === b[idx(r, k)].color) continue;
      if (c - k >= 3) {
        const cells: number[] = [];
        for (let x = k; x < c; x++) cells.push(idx(r, x));
        runs.push(cells);
      }
      k = c;
    }
  }
  return runs;
}

// Тік қатарлар (≥3)
function runV(b: Board): number[][] {
  const runs: number[][] = [];
  for (let c = 0; c < SIZE; c++) {
    let k = 0;
    for (let r = 1; r <= SIZE; r++) {
      if (r < SIZE && b[idx(r, c)].color === b[idx(k, c)].color) continue;
      if (r - k >= 3) {
        const cells: number[] = [];
        for (let x = k; x < r; x++) cells.push(idx(x, c));
        runs.push(cells);
      }
      k = r;
    }
  }
  return runs;
}

export interface MatchInfo {
  h: number[][];
  v: number[][];
}
export const findMatches = (b: Board): MatchInfo => ({ h: runH(b), v: runV(b) });
export const hasAnyRun = (b: Board): boolean => runH(b).length > 0 || runV(b).length > 0;

export function possibleMoves(b: Board): Array<[number, number]> {
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

export interface Wave {
  /** жойылатын ұяшықтар (туатын арнайы кристалл ұяшығынан басқасы) */
  removal: boolean[];
  /** арнайы кристалл туатын ұяшықтар: индекс → түрі */
  births: Map<number, CrystalSpecial>;
}

/**
 * Жою толқынын құрады.
 * ТҮЗЕТУ: бұрын 3-қатар үшін де births.set(at,'none') жазылып, ол ұяшық «қалдырылатын» — сондықтан
 * 3 кристалдың біреуі әрқашан қалып қоятын. Енді тек арнайы кристалл туатын ұяшық ғана қалады
 * (4 қатар → жолақты, 5 → жұлдыз, Т/Г → бомба). Қарапайым 3-қатардың БАРЛЫҒЫ жойылады.
 * swapCells — ойыншы ауыстырған ұяшықтар: арнайы кристалл сол жерде туады.
 */
export function buildWave(info: MatchInfo, swapCells: number[] = []): Wave {
  const removal = emptyFlags();
  [...info.h, ...info.v].forEach((cells) => cells.forEach((i) => (removal[i] = true)));

  const births = new Map<number, CrystalSpecial>();
  // көлденең және тік қатар қиылысқан ұяшық (Т/Г) → бомба
  for (const hc of info.h) for (const vc of info.v) for (const i of hc) if (vc.includes(i)) births.set(i, 'bomb');

  const claimed = (cells: number[]): boolean => cells.some((i) => births.has(i));
  const spot = (cells: number[]): number => swapCells.find((i) => cells.includes(i)) ?? cells[Math.floor(cells.length / 2)];
  for (const cells of info.v) {
    if (cells.length < 4 || claimed(cells)) continue;
    births.set(spot(cells), cells.length >= 5 ? 'star' : 'stripedV');
  }
  for (const cells of info.h) {
    if (cells.length < 4 || claimed(cells)) continue;
    births.set(spot(cells), cells.length >= 5 ? 'star' : 'stripedH');
  }
  births.forEach((_sp, i) => (removal[i] = false)); // туатын кристалл өз ұяшығында қалады
  return { removal, births };
}

/** Арнайы кристалдар өзінен тыс ұяшықтарды да жояды (тізбекті жарылыс). */
export function expandSpecials(board: Board, removal: boolean[]): { removal: boolean[]; detonations: number } {
  const out = [...removal];
  let detonations = 0;
  const queue: number[] = [];
  for (let i = 0; i < out.length; i++) if (out[i]) queue.push(i);
  const queued = new Set<number>(queue);
  while (queue.length) {
    const i = queue.shift() as number;
    const cell = board[i];
    if (!cell || cell.special === 'none') continue;
    const spread: number[] = [];
    if (cell.special === 'stripedH') for (let c = 0; c < SIZE; c++) spread.push(idx(row(i), c));
    else if (cell.special === 'stripedV') for (let r = 0; r < SIZE; r++) spread.push(idx(r, col(i)));
    else if (cell.special === 'bomb') {
      for (let dr = -1; dr <= 1; dr++)
        for (let dc = -1; dc <= 1; dc++) {
          const r = row(i) + dr, c = col(i) + dc;
          if (r >= 0 && r < SIZE && c >= 0 && c < SIZE) spread.push(idx(r, c));
        }
    } else if (cell.special === 'star') {
      for (let j = 0; j < board.length; j++) if (board[j].color === cell.color) spread.push(j);
    }
    detonations += 1;
    for (const j of spread) {
      if (out[j]) continue;
      out[j] = true;
      if (!queued.has(j)) { queued.add(j); queue.push(j); }
    }
  }
  return { removal: out, detonations };
}

/** Бір толқынды тақтаға қолданады: жойылғандар кетеді, туғандар арнайы кристалл болады. */
export function applyWave(board: Board, wave: Wave, expanded: boolean[]): (Cell | undefined)[] {
  return board.map((cell, i) => {
    if (expanded[i]) return undefined; // жойылды (жарылыс ұстап қалған туған кристалл да)
    const birth = wave.births.get(i);
    if (birth && birth !== 'none') return { color: cell.color, special: birth, born: true };
    return { ...cell };
  });
}

/** Ауырлық күші: бос орындарды толтырады. fall — әр ұяшық неше қатар құлайтыны. */
export function applyGravity(board: (Cell | undefined)[]): { next: Board; moved: boolean[]; fall: number[] } {
  const next: Board = new Array(SIZE * SIZE);
  const moved = emptyFlags();
  const fall: number[] = new Array(SIZE * SIZE).fill(0);
  for (let c = 0; c < SIZE; c++) {
    let write = SIZE - 1;
    for (let r = SIZE - 1; r >= 0; r--) {
      const cell = board[idx(r, c)];
      if (!cell) continue;
      next[idx(write, c)] = cell;
      if (write !== r) { moved[idx(write, c)] = true; fall[idx(write, c)] = write - r; }
      write -= 1;
    }
    for (let r = write; r >= 0; r--) {
      next[idx(r, c)] = randCell();
      moved[idx(r, c)] = true;
      fall[idx(r, c)] = write + 1; // жоғарыдан түседі
    }
  }
  return { next, moved, fall };
}

/** Басында қатары жоқ, бірақ жүріс бар тақта. */
export function freshBoard(): Board {
  let b = randomBoard();
  for (let t = 0; t < 80 && (hasAnyRun(b) || possibleMoves(b).length === 0); t++) b = randomBoard();
  return b;
}
