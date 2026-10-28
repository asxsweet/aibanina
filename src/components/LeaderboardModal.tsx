import React, { useEffect, useState } from 'react';
import { Trophy, Loader2 } from 'lucide-react';
import { ModalShell } from './ModalShell';
import { GAME_ORDER, GAME_LABELS } from './GameHub';
import { fetchScores, formatDuration, ScoreRow } from '../utils/featureApi';

interface LeaderboardModalProps {
  onClose: () => void;
}

const DIFFICULTY_LABELS: Record<string, string> = { easy: 'Жеңіл', medium: 'Орташа', hard: 'Қиын' };
const DIFFICULTY_ORDER = ['easy', 'medium', 'hard'];

// Best time or highest score per game and difficulty, for both players.
export const LeaderboardModal: React.FC<LeaderboardModalProps> = ({ onClose }) => {
  const [data, setData] = useState<{ me: string; scores: ScoreRow[] } | null>(null);
  const [loading, setLoading] = useState(true);

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

  const rowsFor = (gameId: string, difficulty: string) =>
    (data?.scores || [])
      .filter((s) => s.gameId === gameId && s.difficulty === difficulty)
      .sort((a, b) => (a.metric === 'score' ? b.bestValue - a.bestValue : a.bestValue - b.bestValue));

  const hasAny = (data?.scores.length || 0) > 0;

  return (
    <ModalShell title="Жарыс" icon={<Trophy className="w-5 h-5 text-[var(--accent)]" />} onClose={onClose}>
      {loading ? (
        <div className="flex justify-center py-10">
          <Loader2 className="w-6 h-6 animate-spin text-[var(--accent)]" />
        </div>
      ) : !data ? (
        <p className="text-center py-8 text-[var(--text-faint)] italic">
          Рекордтарды жүктеу мүмкін болмады. Кейінірек қайталап көр.
        </p>
      ) : !hasAny ? (
        <p className="text-center py-8 text-[var(--text-faint)] italic">
          Әзірге рекорд жоқ. Ойынды жеңіп, алғашқы рекордты қой!
        </p>
      ) : (
        <div className="space-y-3">
          <p className="text-[11px] text-[var(--text-muted)]">Уақыт ойынында — аз, ұпай ойынында — көп нәтиже жақсы 👑</p>
          {GAME_ORDER.map((gameId) => {
            const blocks = DIFFICULTY_ORDER.map((d) => ({ d, rows: rowsFor(gameId, d) })).filter((b) => b.rows.length > 0);
            if (blocks.length === 0) return null;
            return (
              <div key={gameId} className="rounded-2xl bg-[var(--bg-card)] border border-[var(--border)] p-3">
                <div className="font-semibold text-[var(--text)] mb-1.5">{GAME_LABELS[gameId]}</div>
                {blocks.map(({ d, rows }) => (
                  <div key={d} className="mb-1.5 last:mb-0">
                    <div className="text-[10px] uppercase tracking-wide text-[var(--accent-2)] font-semibold mb-0.5">
                      {DIFFICULTY_LABELS[d]}
                    </div>
                    {rows.map((row, i) => (
                      <div key={row.userId} className="flex items-center justify-between text-xs py-0.5">
                        <span className={row.userId === data.me ? 'font-bold text-[var(--accent)]' : 'text-[var(--text-secondary)]'}>
                          {i === 0 && rows.length > 1 ? '👑 ' : ''}
                          {row.userId === data.me ? 'Сен' : row.name || 'Ол'}
                        </span>
                        <span className="font-mono text-[var(--text)]">{row.metric === 'score' ? `${row.bestValue} ұпай` : formatDuration(row.bestValue)}</span>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      )}
    </ModalShell>
  );
};
