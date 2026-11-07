// Жарыс — the couple's duel screen (new UI/UX).
//
//   * Hero duel strip: how many personal records each partner holds right
//     now («7 : 5» out of 6 games × 3 difficulties), crowns on the leader,
//     a live status line and the last-record time.
//   * Difficulty switcher (Жеңіл / Орташа / Қиын) — re-renders every game
//     card for the selected level.
//   * Six game cards, each in one of six states (per the design):
//       алда · артта («Кек») · тең · серіктес жоқ · бос · жаңа рекорд.
//     Both players' bars are drawn player-bound (Сен = accent, Ол = accent-2),
//     the leader's bar is longer; time games are compared "the less, the better".
//   * Tapping a card opens the bottom sheet: game stats (plays / per-level
//     score / last record), all three difficulty duels, «Ойнау» buttons and
//     the «Кек қайтар» revenge CTA.
//
// Everything is painted with the theme CSS variables, so the night theme
// (Жұлдызды түн) restyles the whole screen automatically.

import React, { useEffect, useMemo, useState } from 'react';
import {
  Crown, Flame, Loader2, Play, Send, Sparkles, Star, Swords, Timer, Trophy, X,
} from 'lucide-react';
import { GAME_ORDER, GAME_LABELS, GAME_ICONS } from './GameHub';
import { fetchScores, type ScoreRow, type ScoresResponse } from '../utils/featureApi';
import { getCurrentUser } from '../utils/authUtils';
import type { GameId } from './gameTypes';
import type { DifficultyName } from '../utils/constellationUtils';

interface LeaderboardModalProps {
  onClose: () => void;
  /** «Ойнау» басылғанда: сол ойынға ауыстырып, деңгейді қояды. */
  onPlay?: (gameId: GameId, difficulty: DifficultyName) => void;
  /** Қазіргі таңдалған деңгей — нейтрал «Ойнау» CTA-сы үшін. */
  currentDifficulty?: DifficultyName;
}

const DIFFICULTY_LABELS: Record<DifficultyName, string> = { easy: 'Жеңіл', medium: 'Орташа', hard: 'Қиын' };
const DIFFICULTY_ORDER: DifficultyName[] = ['easy', 'medium', 'hard'];
// Уақыт ойындары: аз = жақсы (және жолақты да «жақсылық» бойынша созамыз)
const TIME_GAMES: ReadonlySet<string> = new Set(['memory', 'reaction']);
// Соңғы 2 сағатта қойылған жеке рекорд «Жаңа рекорд!» жаңалығын көрсетеді
const RECORD_FRESH_MS = 2 * 60 * 60 * 1000;

type PairState = 'empty' | 'ahead' | 'behind' | 'tie' | 'rival-missing' | 'new-record';

interface Pair {
  mine: ScoreRow | null;
  theirs: ScoreRow | null;
  state: PairState;
  /** Көшбасшының артықшылығы (ұпай немесе мс). */
  margin: number;
  leaderIsMe: boolean;
}

const metricOf = (gameId: GameId): 'time' | 'score' => (TIME_GAMES.has(gameId) ? 'time' : 'score');

const fmtInt = (n: number): string => Math.round(n).toLocaleString('kk-KZ');

const fmtSeconds = (ms: number): string =>
  `${(ms / 1000).toLocaleString('kk-KZ', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} с`;

// «1 240» / «38,2 с» / «≈ 540 мс»
const fmtValue = (metric: 'time' | 'score', v: number): string => {
  if (metric === 'score') return fmtInt(v);
  if (v >= 5000) return fmtSeconds(v);
  return `≈ ${fmtInt(v)} мс`;
};

// «+60 ұпай» / «+3,3 с» / «+160 мс»
const fmtMargin = (metric: 'time' | 'score', diff: number): string => {
  if (metric === 'score') return `+${fmtInt(diff)} ұпай`;
  if (diff >= 5000) return `+${fmtSeconds(diff)}`;
  return `+${fmtInt(diff)} мс`;
};

// «бүгін» / «5 мин бұрын» / «18 сағат бұрын» / «2 күн бұрын»
const agoText = (ts: number, now: number): string => {
  const dayStart = new Date(now);
  dayStart.setHours(0, 0, 0, 0);
  if (ts >= dayStart.getTime()) return 'бүгін';
  const min = Math.max(1, Math.round((now - ts) / 60000));
  if (min < 60) return `${min} мин бұрын`;
  const h = Math.round(min / 60);
  if (h < 24) return `${h} сағат бұрын`;
  return `${Math.round(h / 24)} күн бұрын`;
};

// «жақсылық» — ұпай ойынында көбірек, уақыт ойынында аздауырек
const goodOf = (metric: 'time' | 'score', v: number): number => (metric === 'score' ? v : 1 / Math.max(1, v));

function pairOf(mine: ScoreRow | null, theirs: ScoreRow | null, now: number): Pair {
  if (!mine && !theirs) return { mine, theirs, state: 'empty', margin: 0, leaderIsMe: false };
  if (mine && !theirs) return { mine, theirs, state: 'rival-missing', margin: 0, leaderIsMe: true };
  if (!mine && theirs) {
    // Мен әлі ойнамағанмын — ол алда (еркін маржамен)
    return { mine, theirs, state: 'behind', margin: theirs.bestValue, leaderIsMe: false };
  }
  const metric = mine!.metric;
  const a = mine!.bestValue;
  const b = theirs!.bestValue;
  if (a === b) return { mine, theirs, state: 'tie', margin: 0, leaderIsMe: false };
  const iWin = metric === 'score' ? a > b : a < b;
  const freshRecord = iWin && now - mine!.updatedAt < RECORD_FRESH_MS;
  return {
    mine,
    theirs,
    state: freshRecord ? 'new-record' : iWin ? 'ahead' : 'behind',
    margin: Math.abs(a - b),
    leaderIsMe: iWin,
  };
}

// Жолақтың ұзындығы — «жақсылық» қатынасы: көшбасшы әрқашан ұзынырақ
const barPct = (metric: 'time' | 'score', row: ScoreRow | null, other: ScoreRow | null): number => {
  if (!row) return 0;
  if (!other) return 100;
  const max = Math.max(goodOf(metric, row.bestValue), goodOf(metric, other.bestValue));
  if (max <= 0) return 0;
  return Math.max(10, Math.round((goodOf(metric, row.bestValue) / max) * 100));
};

// ─── ұсақ бөлшектер ────────────────────────────────────────────────────────

const PlayerRow: React.FC<{
  label: string;
  value: string;
  pct: number;
  crown: boolean;
  mine: boolean;
}> = ({ label, value, pct, crown, mine }) => (
  <div className="mb-1.5 last:mb-0">
    <div className="flex items-center justify-between gap-2 text-[11px] leading-none mb-1">
      <span
        className={`flex items-center gap-1 font-semibold ${
          mine ? 'text-[var(--accent)]' : 'text-[var(--accent-2)]'
        }`}
      >
        {crown && <Crown className="w-3 h-3" />}
        {label}
      </span>
      <span className="font-bold text-[var(--text)] tabular-nums">{value}</span>
    </div>
    <div className="h-1.5 rounded-full bg-[var(--bg-soft)] border border-[var(--border)]/50 overflow-hidden">
      <div
        className={`h-full rounded-full ${mine ? 'bg-[var(--accent)]' : 'bg-[var(--accent-2)]'}`}
        style={{ width: `${pct}%` }}
      />
    </div>
  </div>
);

type BadgeKind = 'flame' | 'plain' | 'kek' | 'record';

const Badge: React.FC<{ kind: BadgeKind; children: React.ReactNode; icon?: React.ReactNode }> = ({
  kind,
  children,
  icon,
}) => {
  const cls =
    kind === 'flame'
      ? 'bg-[var(--accent-2)]/12 border-[var(--accent-2)]/45 text-[var(--accent-2)]'
      : kind === 'kek' || kind === 'record'
        ? 'bg-[var(--accent)] border-[var(--accent)] text-[var(--on-accent)]'
        : 'bg-[var(--bg-soft)] border-[var(--border)] text-[var(--text-secondary)]';
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[9px] font-bold ${cls}`}>
      {icon}
      {children}
    </span>
  );
};

// Күй белгісі: карточкада қысқа, төменгі терезеде толық мәтін
function stateBadge(p: Pair, metric: 'time' | 'score', long: boolean): React.ReactElement | null {
  switch (p.state) {
    case 'ahead':
      return (
        <Badge kind="flame" icon={<Flame className="w-3 h-3" />}>
          Алдасың · {fmtMargin(metric, p.margin)}
        </Badge>
      );
    case 'new-record':
      return (
        <Badge kind="record" icon={<Sparkles className="w-3 h-3" />}>
          Жаңа рекорд!
        </Badge>
      );
    case 'behind':
      return (
        <>
          <Badge kind="plain">Ол {long ? 'алда · ' : ''}{fmtMargin(metric, p.margin)}</Badge>
          {!long && (
            <Badge kind="kek" icon={<Swords className="w-3 h-3" />}>
              Кек
            </Badge>
          )}
        </>
      );
    case 'tie':
      return <Badge kind="plain">Тең! 🤝</Badge>;
    case 'rival-missing':
      return (
        <Badge kind="plain" icon={<Send className="w-3 h-3" />}>
          Ол әлі ойнамаған
        </Badge>
      );
    default:
      return null;
  }
}

const StatTile: React.FC<{ value: string; label: string }> = ({ value, label }) => (
  <div className="rounded-xl bg-[var(--bg-soft)] border border-[var(--border)] px-2 py-2 text-center">
    <div className="font-serif text-lg font-light text-[var(--accent)] tabular-nums leading-none">{value}</div>
    <div className="text-[9px] text-[var(--text-faint)] mt-1 leading-tight">{label}</div>
  </div>
);

// ─── негізгі компонент ─────────────────────────────────────────────────────

export const LeaderboardModal: React.FC<LeaderboardModalProps> = ({
  onClose,
  onPlay,
  currentDifficulty = 'easy',
}) => {
  const [data, setData] = useState<ScoresResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [diff, setDiff] = useState<DifficultyName>(currentDifficulty);
  const [detail, setDetail] = useState<GameId | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchScores().then((res) => {
      if (cancelled) return;
      setData(res);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const now = useMemo(() => Date.now(), []);

  // Нақты есімдер: «Сен» — өз профиль есімі, «Ол» — админ таңдаған жарыс
  // серіктесі (әлі ойламаған болса да), әйтпесе нәтижесі бар қарсылас есімі.
  const playerName = useMemo(() => {
    const n = getCurrentUser()?.name?.trim();
    return n || '';
  }, []);
  const rivalName = useMemo(() => {
    return (
      data?.duel?.rival?.name?.trim() ||
      (data?.scores ?? []).find((s) => s.userId !== data?.me && s.name?.trim())?.name?.trim() ||
      ''
    );
  }, [data]);
  // Аватар ішіндегі әріп
  const myInitial = (playerName.charAt(0) || 'С').toUpperCase();
  const rivalInitial = (rivalName.charAt(0) || 'О').toUpperCase();
  // Жолақ атаулары: «Сен · Айгерім» / «Ол · Аслан»
  const myLabel = playerName ? `Сен · ${playerName}` : 'Сен';
  const rivalLabel = rivalName ? `Ол · ${rivalName}` : 'Ол';

  // (game, difficulty) → мен + серіктес. Админ жұп таңдаған болса — тек сонымен
  // (басқа акаунттар еленбейді), әйтпесе басқа ойыншылардың ең жақсысымен.
  const pairs = useMemo(() => {
    const map = new Map<string, Pair>();
    for (const g of GAME_ORDER) {
      for (const d of DIFFICULTY_ORDER) map.set(`${g}:${d}`, pairOf(null, null, now));
    }
    const rivalId = data?.duel?.rival?.userId || null;
    for (const row of data?.scores ?? []) {
      const gid = row.gameId as GameId;
      const d = row.difficulty as DifficultyName;
      if (!GAME_ORDER.includes(gid) || !DIFFICULTY_ORDER.includes(d)) continue;
      const key = `${gid}:${d}`;
      const cur = map.get(key)!;
      if (row.userId === data?.me) {
        map.set(key, pairOf(row, cur.theirs, now));
      } else if (
        rivalId === row.userId &&
        (!cur.theirs ||
          (row.metric === 'score'
            ? row.bestValue > cur.theirs.bestValue
            : row.bestValue < cur.theirs.bestValue))
      ) {
        map.set(key, pairOf(cur.mine, row, now));
      }
    }
    return map;
  }, [data, now]);

  const pair = (g: GameId, d: DifficultyName): Pair => pairs.get(`${g}:${d}`) ?? pairOf(null, null, now);

  // Жалпы есеп: әр ойын/деңгейдегі рекордтардың 7 : 5-і
  const tally = useMemo(() => {
    let myWins = 0;
    let rivalWins = 0;
    let lastRecordTs = 0;
    for (const p of pairs.values()) {
      if (p.state === 'ahead' || p.state === 'rival-missing' || p.state === 'new-record') myWins += 1;
      else if (p.state === 'behind') rivalWins += 1;
      const ts = Math.max(p.mine?.updatedAt ?? 0, p.theirs?.updatedAt ?? 0);
      if (ts > lastRecordTs) lastRecordTs = ts;
    }
    return { myWins, rivalWins, lastRecordTs: lastRecordTs || null };
  }, [pairs]);

  const leadDiff = Math.abs(tally.myWins - tally.rivalWins);
  const statusLine =
    tally.myWins > tally.rivalWins
      ? `Жалпы есепте алдасың 👑 · Ол ${leadDiff} рекордпен қуып келеді`
      : tally.rivalWins > tally.myWins
        ? `Жалпы есепте арттаң · тағы ${leadDiff} рекорд алсаң теңелесің`
        : 'Жалпы есеп тең 👑 · кім тезірек алдырады?';

  const renderPlayButton = (g: GameId, d: DifficultyName, small: boolean) =>
    onPlay && (
      <button
        onClick={(e) => {
          e.stopPropagation();
          onPlay(g, d);
        }}
        className={`${
          small ? 'px-3.5 py-2 min-h-[36px] text-[11px]' : 'w-full py-2.5 min-h-[40px] text-xs'
        } rounded-xl btn-gold font-semibold flex items-center justify-center gap-1.5 active:scale-95 transition`}
      >
        <Play className="w-3.5 h-3.5 fill-[var(--on-accent)]" /> Ойнау
      </button>
    );

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[var(--overlay)] backdrop-blur-md"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Жарыс"
    >
      <div
        className="relative w-full max-w-md max-h-[85vh] flex flex-col rounded-[32px] bg-[var(--bg-elevated)]/95 border border-[var(--border)] backdrop-blur-2xl shadow-[0_20px_50px_var(--overlay)] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── header ─────────────────────────────────────────────── */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-[var(--border)] shrink-0">
          <h2 className="font-serif text-xl font-light italic text-[var(--accent)] flex items-center gap-2">
            <Trophy className="w-5 h-5 text-[var(--accent)]" />
            <span>Жарыс</span>
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full bg-[var(--bg-soft)] text-[var(--text-muted)] hover:text-[var(--text)] transition"
            aria-label="Жабу"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* ── body ───────────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
          {loading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="w-6 h-6 animate-spin text-[var(--accent)]" />
            </div>
          ) : !data ? (
            <p className="text-center py-8 text-[var(--text-faint)] italic">
              Рекордтарды жүктеу мүмкін болмады. Кейінірек қайталап көр.
            </p>
          ) : (
            <>
              {/* дуэль жолағы */}
              <div className="rounded-3xl bg-[var(--bg-card)] border border-[var(--accent)]/25 px-4 pt-6 pb-4 shadow-[0_10px_30px_var(--overlay)]">
                <div className="flex items-center justify-between gap-2">
                  {/* Сен */}
                  <div className="flex flex-col items-center gap-1.5 w-16">
                    <div className="relative">
                      {tally.myWins >= tally.rivalWins && (
                        <Crown
                          className="absolute -top-4 left-1/2 -translate-x-1/2 w-4 h-4 text-[var(--accent)]"
                          fill="currentColor"
                        />
                      )}
                      <div
                        className={`w-12 h-12 rounded-full flex items-center justify-center font-black text-lg ${
                          tally.myWins >= tally.rivalWins
                            ? 'bg-[var(--accent)] text-[var(--on-accent)]'
                            : 'bg-[var(--accent)]/15 text-[var(--accent)] border border-[var(--accent)]/40'
                        }`}
                      >
                        {myInitial}
                      </div>
                    </div>
                    <span
                      className="text-[10px] font-bold text-[var(--text-secondary)] text-center leading-tight max-w-16 break-words"
                      title={myLabel}
                    >
                      {myLabel}
                    </span>
                  </div>

                  {/* есеп */}
                  <div className="text-center">
                    <div className="font-serif text-4xl font-light text-[var(--text)] tabular-nums leading-none">
                      {tally.myWins}
                      <span className="text-[var(--text-faint)]"> : </span>
                      {tally.rivalWins}
                    </div>
                    {tally.lastRecordTs && (
                      <div className="text-[9px] text-[var(--text-faint)] mt-1.5">
                        рекорд саны · {agoText(tally.lastRecordTs, now)}
                      </div>
                    )}
                  </div>

                  {/* Ол */}
                  <div className="flex flex-col items-center gap-1.5 w-16">
                    <div className="relative">
                      {tally.rivalWins > tally.myWins && (
                        <Crown
                          className="absolute -top-4 left-1/2 -translate-x-1/2 w-4 h-4 text-[var(--accent-2)]"
                          fill="currentColor"
                        />
                      )}
                      <div
                        className={`w-12 h-12 rounded-full flex items-center justify-center font-black text-lg ${
                          tally.rivalWins > tally.myWins
                            ? 'bg-[var(--accent-2)] text-white'
                            : 'bg-[var(--accent-2)]/15 text-[var(--accent-2)] border border-[var(--accent-2)]/40'
                        }`}
                      >
                        {rivalInitial}
                      </div>
                    </div>
                    <span
                      className="text-[10px] font-bold text-[var(--text-secondary)] text-center leading-tight max-w-16 break-words"
                      title={rivalLabel}
                    >
                      {rivalLabel}
                    </span>
                  </div>
                </div>
                <p className="mt-4 text-center text-[11px] font-semibold text-[var(--accent)] leading-snug px-2">
                  {statusLine}
                </p>
              </div>

              {/* деңгей ауыстырғыш */}
              <div className="flex items-center gap-1 p-1 rounded-full bg-[var(--bg-soft)] border border-[var(--border)]">
                {DIFFICULTY_ORDER.map((d) => (
                  <button
                    key={d}
                    onClick={() => setDiff(d)}
                    className={`flex-1 px-3 py-2 min-h-[36px] rounded-full text-[11px] font-semibold transition ${
                      diff === d
                        ? 'bg-[var(--bg-elevated)] text-[var(--text)] shadow-sm'
                        : 'text-[var(--text-muted)] hover:text-[var(--text)]'
                    }`}
                  >
                    {DIFFICULTY_LABELS[d]}
                  </button>
                ))}
              </div>

              {/* аңыз: уақыт ойынында аз — жақсы, ұпай ойынында көп — жақсы */}
              <div className="flex items-center justify-center gap-4 text-[9px] text-[var(--text-faint)]">
                <span className="flex items-center gap-1">
                  <Timer className="w-3 h-3" /> аз = жақсы
                </span>
                <span className="flex items-center gap-1">
                  <Star className="w-3 h-3" /> көп = жақсы
                </span>
              </div>

              {/* 6 ойын карточкасы */}
              <div className="grid grid-cols-2 gap-2 pt-1">
                {GAME_ORDER.map((g) => {
                  const p = pair(g, diff);
                  const metric = metricOf(g);
                  const Icon = GAME_ICONS[g];
                  const header = (
                    <div className="flex items-center gap-1.5 mb-2">
                      <Icon className="w-3.5 h-3.5 text-[var(--accent)] shrink-0" />
                      <span className="text-[11px] font-bold text-[var(--text)] leading-tight">
                        {GAME_LABELS[g]}
                      </span>
                    </div>
                  );

                  if (p.state === 'empty') {
                    return (
                      <div
                        key={g}
                        role="button"
                        tabIndex={0}
                        onClick={() => setDetail(g)}
                        onKeyDown={(e) => e.key === 'Enter' && setDetail(g)}
                        className="text-left rounded-2xl border border-dashed border-[var(--border)] bg-[var(--bg-card)]/60 p-3 cursor-pointer hover:border-[var(--accent)]/40 transition"
                      >
                        {header}
                        <p className="text-[10px] text-[var(--text-muted)] leading-relaxed mb-2">
                          Әлі ешкім ойнамаған. Алғашқы рекордты қой!
                        </p>
                        {renderPlayButton(g, diff, true)}
                      </div>
                    );
                  }

                  return (
                    <div
                      key={g}
                      role="button"
                      tabIndex={0}
                      onClick={() => setDetail(g)}
                      onKeyDown={(e) => e.key === 'Enter' && setDetail(g)}
                      className={`text-left rounded-2xl border bg-[var(--bg-card)] p-3 cursor-pointer transition ${
                        p.state === 'new-record'
                          ? 'border-[var(--accent)]/60 shadow-[0_0_18px_var(--accent-glow)]'
                          : 'border-[var(--border)] hover:border-[var(--accent)]/40'
                      }`}
                    >
                      {header}
                      <PlayerRow
                        mine
                        label={myLabel}
                        crown={p.leaderIsMe}
                        value={p.mine ? fmtValue(metric, p.mine.bestValue) : '—'}
                        pct={barPct(metric, p.mine, p.theirs)}
                      />
                      <PlayerRow
                        mine={false}
                        label={rivalLabel}
                        crown={p.state === 'behind'}
                        value={p.theirs ? fmtValue(metric, p.theirs.bestValue) : '—'}
                        pct={barPct(metric, p.theirs, p.mine)}
                      />
                      <div className="flex items-center flex-wrap gap-1 mt-2">
                        {stateBadge(p, metric, false)}
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>

        {/* ── ойын мәліметі: төменгі терезе ──────────────────────── */}
        {detail && !loading && data && (
          <div className="absolute inset-0 z-20 flex flex-col justify-end" onClick={() => setDetail(null)}>
            <div className="absolute inset-0 bg-[var(--overlay)]/45" />
            <div
              className="relative max-h-[88%] overflow-y-auto rounded-t-[28px] bg-[var(--bg-elevated)] border-t border-[var(--border)] shadow-[0_-12px_40px_var(--overlay)] p-5 pb-6 anim-sheet-up"
              onClick={(e) => e.stopPropagation()}
            >
              {(() => {
                const g = detail;
                const metric = metricOf(g);
                const Icon = GAME_ICONS[g];
                const rows = DIFFICULTY_ORDER.map((d) => ({ d, p: pair(g, d) }));
                const totalPlays = rows.reduce(
                  (s, r) => s + (r.p.mine?.plays ?? 0) + (r.p.theirs?.plays ?? 0),
                  0
                );
                const levelWins = rows.filter(
                  (r) => r.p.state === 'ahead' || r.p.state === 'new-record' || r.p.state === 'rival-missing'
                ).length;
                const levelLosses = rows.filter((r) => r.p.state === 'behind').length;
                const lastTs = Math.max(
                  ...rows.map((r) => Math.max(r.p.mine?.updatedAt ?? 0, r.p.theirs?.updatedAt ?? 0))
                );
                // «Кек қайтар»: серіктес алда тұрған ең жақын деңгей
                const revenge =
                  rows
                    .filter((r) => r.p.state === 'behind')
                    .sort((a, b) => a.p.margin - b.p.margin)[0] ?? null;

                return (
                  <>
                    <div className="w-10 h-1 rounded-full bg-[var(--border)] mx-auto mb-3" />

                    {/* атаулы */}
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-11 h-11 rounded-2xl bg-[var(--bg-soft)] border border-[var(--accent)]/25 flex items-center justify-center shrink-0">
                        <Icon className="w-5 h-5 text-[var(--accent)]" />
                      </div>
                      <div className="min-w-0">
                        <div className="font-bold text-[var(--text)] leading-tight">{GAME_LABELS[g]}</div>
                        <div className="text-[10px] text-[var(--text-faint)] flex items-center gap-1 mt-0.5">
                          {metric === 'score' ? (
                            <>
                              <Star className="w-3 h-3" /> ұпай ойыны · көп = жақсы
                            </>
                          ) : (
                            <>
                              <Timer className="w-3 h-3" /> уақыт ойыны · аз = жақсы
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* статистика */}
                    <div className="grid grid-cols-3 gap-2 mb-3">
                      <StatTile value={String(totalPlays)} label="рет ойналды" />
                      <StatTile value={`${levelWins} : ${levelLosses}`} label="деңгей есебі" />
                      <StatTile value={lastTs ? agoText(lastTs, now) : '—'} label="соңғы рекорд" />
                    </div>

                    {/* 3 деңгей */}
                    <div className="space-y-2 mb-3">
                      {rows.map((r) => {
                        const m = r.p.mine;
                        const t = r.p.theirs;
                        const leaderRow = r.p.leaderIsMe ? m : t;
                        return (
                          <div
                            key={r.d}
                            className={`rounded-2xl border p-3 bg-[var(--bg-card)]/70 ${
                              r.p.state === 'empty' ? 'border-dashed border-[var(--border)]' : 'border-[var(--border)]'
                            }`}
                          >
                            <div className="flex items-center justify-between gap-2 mb-2 flex-wrap">
                              <span className="text-[10px] uppercase tracking-widest font-bold text-[var(--accent-2)]">
                                {DIFFICULTY_LABELS[r.d]}
                              </span>
                              <span className="flex items-center gap-1 flex-wrap justify-end">
                                {stateBadge(r.p, metric, true)}
                              </span>
                            </div>

                            {r.p.state !== 'empty' && (
                              <>
                                <PlayerRow
                                  mine
                                  label={myLabel}
                                  crown={r.p.leaderIsMe}
                                  value={m ? fmtValue(metric, m.bestValue) : '—'}
                                  pct={barPct(metric, m, t)}
                                />
                                <PlayerRow
                                  mine={false}
                                  label={rivalLabel}
                                  crown={r.p.state === 'behind'}
                                  value={t ? fmtValue(metric, t.bestValue) : '—'}
                                  pct={barPct(metric, t, m)}
                                />
                              </>
                            )}

                            {/* кім қашан қойды */}
                            {!m && !t ? (
                              <div className="flex items-center justify-between gap-2 mt-2">
                                <p className="text-[10px] text-[var(--text-muted)] leading-snug">
                                  Әлі ешкім ойнамаған. Алғашқы рекордты қой!
                                </p>
                                {renderPlayButton(g, r.d, true)}
                              </div>
                            ) : r.p.state === 'tie' ? (
                              <p className="text-[10px] text-[var(--text-faint)] mt-2">
                                Екеуің де тең тұрсыңдар 🤝 · {m?.plays ?? 0} рет ойнадың
                              </p>
                            ) : leaderRow ? (
                              <div className="flex items-center justify-between gap-2 mt-2">
                                <p className="text-[10px] text-[var(--text-faint)] leading-snug">
                                  {r.p.leaderIsMe ? 'Сен' : 'Ол'} {agoText(leaderRow.updatedAt, now)} қойды ·{' '}
                                  {leaderRow.plays} рет ойналды
                                </p>
                                {!r.p.leaderIsMe && !m && renderPlayButton(g, r.d, true)}
                              </div>
                            ) : null}
                          </div>
                        );
                      })}
                    </div>

                    {/* CTA */}
                    {onPlay && (
                      <button
                        onClick={() => onPlay(g, revenge ? revenge.d : currentDifficulty)}
                        className="w-full py-3.5 min-h-[50px] rounded-2xl btn-gold text-sm font-semibold flex items-center justify-center gap-2 active:scale-95 transition"
                      >
                        {revenge ? (
                          <>
                            <Swords className="w-4 h-4" /> Кек қайтар · {DIFFICULTY_LABELS[revenge.d]} деңгей
                          </>
                        ) : (
                          <>
                            <Play className="w-4 h-4 fill-[var(--on-accent)]" /> Ойнау ·{' '}
                            {DIFFICULTY_LABELS[currentDifficulty]} деңгей
                          </>
                        )}
                      </button>
                    )}
                    <p className="text-center text-[10px] text-[var(--text-faint)] mt-2.5">
                      Рекордты жаңартсаң, ол хабарлама алады 💌
                    </p>
                  </>
                );
              })()}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
