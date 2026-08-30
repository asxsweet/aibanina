import React, { useState, useEffect, useMemo } from 'react';
import {
  X, ShieldCheck, BarChart3, BookOpen, Gamepad2, Loader2, Save, RotateCcw,
  Image as ImageIcon, Heart, Video as VideoIcon, Link2, Check, Users, Flame,
  CalendarCheck, AlertCircle, User, Clock, Volume2, RefreshCw, XCircle, CheckCircle2, HelpCircle,
} from 'lucide-react';
import { DAILY_MESSAGES } from '../data/constants';
import {
  fetchMessageOverrides, saveMessageOverride, deleteMessageOverride,
  fetchGameSchedule, saveGameScheduleDay, deleteGameScheduleDay,
  fetchAdminStats, applyMessageOverride,
  MessageOverride, AdminStats,
} from '../utils/adminUtils';
import { fetchUsersProgress, fetchDayLogs, UserProgressSnapshot, DayLogEntry } from '../utils/trackingUtils';
import { fetchAllReplies } from '../utils/extrasUtils';
import { DailyReply } from '../types';
import { getCurrentUser } from '../utils/authUtils';
import { checkAudioUrl, AudioCheckResult } from '../utils/audioUtils';

interface AdminPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

const GAME_OPTIONS: { id: string; label: string }[] = [
  { id: 'catch', label: 'Жүрек аулау' },
  { id: 'memory', label: 'Тап жұп' },
  { id: 'reaction', label: 'Дәл тап' },
  { id: 'rhythm', label: 'Ырғаққа түс' },
  { id: 'jump', label: 'Шексіз секіру' },
  { id: 'flow', label: 'Ағысқа қарсы' },
];

const KK_MONTHS = [
  'қаңтар', 'ақпан', 'наурыз', 'сәуір', 'мамыр', 'маусым',
  'шілде', 'тамыз', 'қыркүйек', 'қазан', 'қараша', 'желтоқсан',
];

function formatDateTimeKk(timestamp: number): string {
  const d = new Date(timestamp);
  const hh = d.getHours().toString().padStart(2, '0');
  const mm = d.getMinutes().toString().padStart(2, '0');
  return `${d.getDate()} ${KK_MONTHS[d.getMonth()]}, ${hh}:${mm}`;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<'stats' | 'content' | 'schedule' | 'partner' | 'audio'>('stats');

  const [stats, setStats] = useState<AdminStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);
  const [statsError, setStatsError] = useState('');

  const [overrides, setOverrides] = useState<Record<number, MessageOverride>>({});
  const [contentLoading, setContentLoading] = useState(false);
  const [selectedDay, setSelectedDay] = useState(1);
  const [formTitle, setFormTitle] = useState('');
  const [formText, setFormText] = useState('');
  const [formHint, setFormHint] = useState('');
  const [formVoiceUrl, setFormVoiceUrl] = useState('');
  const [contentSaving, setContentSaving] = useState(false);
  const [contentError, setContentError] = useState('');
  const [contentSaved, setContentSaved] = useState(false);

  const [schedule, setSchedule] = useState<Record<number, string>>({});
  const [scheduleLoading, setScheduleLoading] = useState(false);
  const [scheduleError, setScheduleError] = useState('');
  const [scheduleBusyDay, setScheduleBusyDay] = useState<number | null>(null);

  // --- Partner progress tracking ---
  const [usersProgress, setUsersProgress] = useState<UserProgressSnapshot[]>([]);
  const [dayLogs, setDayLogs] = useState<DayLogEntry[]>([]);
  const [allReplies, setAllReplies] = useState<DailyReply[]>([]);
  const [partnerLoading, setPartnerLoading] = useState(false);
  const [partnerError, setPartnerError] = useState('');
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [dayOrder, setDayOrder] = useState<'latest' | 'oldest'>('latest');
  const [expandedDay, setExpandedDay] = useState<number | null>(null);

  // --- Audio (voice message) health check ---
  const [audioResults, setAudioResults] = useState<Record<number, AudioCheckResult>>({});
  const [audioChecking, setAudioChecking] = useState(false);
  const [audioCheckedAt, setAudioCheckedAt] = useState<number | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    loadStats();
    loadContent();
    loadSchedule();
    loadPartnerData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const loadPartnerData = async () => {
    setPartnerLoading(true);
    setPartnerError('');
    try {
      const [users, logs, replies] = await Promise.all([
        fetchUsersProgress(),
        fetchDayLogs(),
        fetchAllReplies(),
      ]);
      setUsersProgress(users);
      setDayLogs(logs);
      setAllReplies(replies);
    } catch (err) {
      setPartnerError(err instanceof Error ? err.message : 'Қате шықты.');
    } finally {
      setPartnerLoading(false);
    }
  };

  const loadStats = async () => {
    setStatsLoading(true);
    setStatsError('');
    try {
      setStats(await fetchAdminStats());
    } catch (err) {
      setStatsError(err instanceof Error ? err.message : 'Қате шықты.');
    } finally {
      setStatsLoading(false);
    }
  };

  const loadContent = async () => {
    setContentLoading(true);
    try {
      const list = await fetchMessageOverrides();
      const map: Record<number, MessageOverride> = {};
      list.forEach((o) => { map[o.dayNumber] = o; });
      setOverrides(map);
    } catch (err) {
      // non-fatal — editor still works, just starts from defaults
    } finally {
      setContentLoading(false);
    }
  };

  const loadSchedule = async () => {
    setScheduleLoading(true);
    try {
      const list = await fetchGameSchedule();
      const map: Record<number, string> = {};
      list.forEach((s) => { map[s.dayNumber] = s.gameId; });
      setSchedule(map);
    } catch (err) {
      // non-fatal
    } finally {
      setScheduleLoading(false);
    }
  };

  useEffect(() => {
    const base = DAILY_MESSAGES[(selectedDay - 1) % DAILY_MESSAGES.length];
    const effective = applyMessageOverride(base, overrides[selectedDay]);
    setFormTitle(effective.title);
    setFormText(effective.text);
    setFormHint(effective.hint || '');
    setFormVoiceUrl(effective.voiceUrl || '');
    setContentError('');
    setContentSaved(false);
  }, [selectedDay, overrides]);

  const isCustomized = (day: number) => !!overrides[day];

  const handleSaveContent = async () => {
    setContentSaving(true);
    setContentError('');
    try {
      const updated = await saveMessageOverride(selectedDay, {
        title: formTitle,
        text: formText,
        hint: formHint,
        voiceUrl: formVoiceUrl,
      });
      setOverrides((prev) => ({ ...prev, [selectedDay]: updated }));
      setContentSaved(true);
      setTimeout(() => setContentSaved(false), 1800);
    } catch (err) {
      setContentError(err instanceof Error ? err.message : 'Сақтау мүмкін болмады.');
    } finally {
      setContentSaving(false);
    }
  };

  const handleRevertContent = async () => {
    setContentSaving(true);
    setContentError('');
    try {
      await deleteMessageOverride(selectedDay);
      setOverrides((prev) => {
        const next = { ...prev };
        delete next[selectedDay];
        return next;
      });
    } catch (err) {
      setContentError(err instanceof Error ? err.message : 'Қайтару мүмкін болмады.');
    } finally {
      setContentSaving(false);
    }
  };

  const handleAssignGame = async (day: number, gameId: string) => {
    setScheduleBusyDay(day);
    setScheduleError('');
    try {
      await saveGameScheduleDay(day, gameId);
      setSchedule((prev) => ({ ...prev, [day]: gameId }));
    } catch (err) {
      setScheduleError(err instanceof Error ? err.message : 'Қате шықты.');
    } finally {
      setScheduleBusyDay(null);
    }
  };

  const handleRevertSchedule = async (day: number) => {
    setScheduleBusyDay(day);
    setScheduleError('');
    try {
      await deleteGameScheduleDay(day);
      setSchedule((prev) => {
        const next = { ...prev };
        delete next[day];
        return next;
      });
    } catch (err) {
      setScheduleError(err instanceof Error ? err.message : 'Қате шықты.');
    } finally {
      setScheduleBusyDay(null);
    }
  };

  const uploaderEntries = useMemo(
    () => (stats ? Object.entries(stats.photosByUploader).sort((a, b) => b[1] - a[1]) : []),
    [stats]
  );

  // Everyone except the admin viewing this panel — in this two-person app
  // that's just the partner, but this stays correct even with more accounts.
  const partnerCandidates = useMemo(() => {
    const currentEmail = getCurrentUser()?.email;
    return usersProgress.filter((u) => u.userId !== currentEmail);
  }, [usersProgress]);

  useEffect(() => {
    if (selectedUserId || partnerCandidates.length === 0) return;
    setSelectedUserId(partnerCandidates[0].userId);
  }, [partnerCandidates, selectedUserId]);

  const selectedPartner = useMemo(
    () => partnerCandidates.find((u) => u.userId === selectedUserId) || null,
    [partnerCandidates, selectedUserId]
  );

  const dayLogLookup = useMemo(() => {
    const map: Record<number, number> = {};
    dayLogs
      .filter((l) => l.userId === selectedUserId)
      .forEach((l) => { map[l.dayNumber] = l.completedAt; });
    return map;
  }, [dayLogs, selectedUserId]);

  const replyLookup = useMemo(() => {
    const map: Record<number, DailyReply> = {};
    allReplies.forEach((r) => { map[r.dayNumber] = r; });
    return map;
  }, [allReplies]);

  // Every day (default or admin-overridden) that currently has a voice
  // message attached — this is the full list the audio check runs against.
  const voiceDays = useMemo(() => {
    return Array.from({ length: 30 }, (_, i) => i + 1)
      .map((day) => {
        const base = DAILY_MESSAGES[(day - 1) % DAILY_MESSAGES.length];
        const effective = applyMessageOverride(base, overrides[day]);
        return { day, voiceUrl: effective.voiceUrl || '' };
      })
      .filter((d) => !!d.voiceUrl);
  }, [overrides]);

  const runAudioCheck = async () => {
    if (voiceDays.length === 0) return;
    setAudioChecking(true);
    // Mark everything "checking" up front so the UI shows progress rather
    // than stale results while requests are in flight.
    setAudioResults((prev) => {
      const next = { ...prev };
      voiceDays.forEach((d) => { next[d.day] = { status: 'checking' }; });
      return next;
    });

    await Promise.all(
      voiceDays.map(async (d) => {
        const result = await checkAudioUrl(d.voiceUrl);
        setAudioResults((prev) => ({ ...prev, [d.day]: result }));
      })
    );

    setAudioChecking(false);
    setAudioCheckedAt(Date.now());
  };

  useEffect(() => {
    if (!isOpen || activeTab !== 'audio') return;
    if (audioCheckedAt === null && !audioChecking) {
      runAudioCheck();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, activeTab]);

  const brokenAudioCount = useMemo(
    () => Object.values(audioResults).filter((r) => r.status === 'missing' || r.status === 'error').length,
    [audioResults]
  );

  const partnerDayRows = useMemo(() => {
    if (!selectedPartner) return [];
    const days = Array.from({ length: selectedPartner.daysPlayed }, (_, i) => i + 1);
    const rows = days.map((day) => {
      const base = DAILY_MESSAGES[(day - 1) % DAILY_MESSAGES.length];
      const effective = applyMessageOverride(base, overrides[day]);
      // The day-log only exists for stars earned after this tracking feature
      // shipped. For the most recently earned day, the progress snapshot's
      // own lastPlayTimestamp already tells us exactly when — so that's used
      // as a fallback instead of ever showing "unknown" for today's star.
      const isLatestDay = day === selectedPartner.daysPlayed;
      const completedAt =
        dayLogLookup[day] || (isLatestDay ? selectedPartner.lastPlayTimestamp || null : null);
      return {
        day,
        title: effective.title,
        text: effective.text,
        hint: effective.hint,
        completedAt,
        reply: replyLookup[day] || null,
      };
    });
    return dayOrder === 'latest' ? [...rows].reverse() : rows;
  }, [selectedPartner, dayLogLookup, replyLookup, overrides, dayOrder]);

  const missingReplyCount = useMemo(
    () => partnerDayRows.filter((r) => !r.reply || (!r.reply.mood && !r.reply.text)).length,
    [partnerDayRows]
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[var(--overlay)] backdrop-blur-md">
      <div className="relative w-full max-w-lg bg-[var(--bg-elevated)]/95 rounded-[32px] sm:rounded-[40px] p-6 border border-[var(--border)] backdrop-blur-2xl shadow-[0_20px_50px_var(--overlay)] max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between pb-3 border-b border-[var(--border)]">
          <h2 className="font-serif text-xl font-light italic text-[var(--accent)] flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-[var(--accent)]" />
            <span>Әкімші панелі</span>
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full bg-[var(--bg-soft)] text-[var(--text-muted)] hover:text-[var(--text)] transition"
            aria-label="Жабу"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex items-center gap-1 my-3 p-1 rounded-2xl bg-[var(--bg-soft)] border border-[var(--border)] text-xs flex-shrink-0">
          <button
            onClick={() => setActiveTab('stats')}
            className={`flex-1 py-1.5 rounded-xl font-medium transition flex items-center justify-center gap-1 ${
              activeTab === 'stats' ? 'btn-gold font-bold shadow-sm' : 'text-[var(--text-muted)]'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            Статистика
          </button>
          <button
            onClick={() => setActiveTab('content')}
            className={`flex-1 py-1.5 rounded-xl font-medium transition flex items-center justify-center gap-1 ${
              activeTab === 'content' ? 'btn-gold font-bold shadow-sm' : 'text-[var(--text-muted)]'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            Мазмұн
          </button>
          <button
            onClick={() => setActiveTab('schedule')}
            className={`flex-1 py-1.5 rounded-xl font-medium transition flex items-center justify-center gap-1 ${
              activeTab === 'schedule' ? 'btn-gold font-bold shadow-sm' : 'text-[var(--text-muted)]'
            }`}
          >
            <Gamepad2 className="w-3.5 h-3.5" />
            Ойын кестесі
          </button>
          <button
            onClick={() => setActiveTab('partner')}
            className={`flex-1 py-1.5 rounded-xl font-medium transition flex items-center justify-center gap-1 relative ${
              activeTab === 'partner' ? 'btn-gold font-bold shadow-sm' : 'text-[var(--text-muted)]'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            Серіктес
            {missingReplyCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-rose-500 text-white text-[9px] font-bold flex items-center justify-center">
                {missingReplyCount > 9 ? '9+' : missingReplyCount}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('audio')}
            className={`flex-1 py-1.5 rounded-xl font-medium transition flex items-center justify-center gap-1 relative ${
              activeTab === 'audio' ? 'btn-gold font-bold shadow-sm' : 'text-[var(--text-muted)]'
            }`}
          >
            <Volume2 className="w-3.5 h-3.5" />
            Аудио
            {brokenAudioCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-rose-500 text-white text-[9px] font-bold flex items-center justify-center">
                {brokenAudioCount > 9 ? '9+' : brokenAudioCount}
              </span>
            )}
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {activeTab === 'stats' && (
            <div className="space-y-3">
              {statsLoading ? (
                <div className="flex flex-col items-center justify-center py-12 text-[var(--text-faint)]">
                  <Loader2 className="w-6 h-6 animate-spin mb-2" />
                  <span className="text-xs">Жүктелуде…</span>
                </div>
              ) : statsError ? (
                <div className="rounded-2xl border border-rose-400/30 bg-rose-400/10 px-3 py-2 text-xs text-rose-500">
                  {statsError}
                </div>
              ) : stats ? (
                <>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="p-3.5 rounded-2xl bg-[var(--bg-card)] border border-[var(--border)]">
                      <div className="flex items-center gap-1.5 text-[var(--accent)] mb-1">
                        <ImageIcon className="w-4 h-4" />
                        <span className="text-[10px] uppercase tracking-wide font-semibold">Барлық файл</span>
                      </div>
                      <div className="text-xl font-bold text-[var(--text)]">{stats.totalPhotos}</div>
                    </div>
                    <div className="p-3.5 rounded-2xl bg-[var(--bg-card)] border border-[var(--border)]">
                      <div className="flex items-center gap-1.5 text-[var(--accent-2)] mb-1">
                        <VideoIcon className="w-4 h-4" />
                        <span className="text-[10px] uppercase tracking-wide font-semibold">Видео</span>
                      </div>
                      <div className="text-xl font-bold text-[var(--text)]">{stats.totalVideos}</div>
                    </div>
                    <div className="p-3.5 rounded-2xl bg-[var(--bg-card)] border border-[var(--border)]">
                      <div className="flex items-center gap-1.5 text-[var(--accent-2)] mb-1">
                        <Heart className="w-4 h-4" />
                        <span className="text-[10px] uppercase tracking-wide font-semibold">Таңдаулы</span>
                      </div>
                      <div className="text-xl font-bold text-[var(--text)]">{stats.totalFavorites}</div>
                    </div>
                    <div className="p-3.5 rounded-2xl bg-[var(--bg-card)] border border-[var(--border)]">
                      <div className="flex items-center gap-1.5 text-[var(--accent)] mb-1">
                        <Link2 className="w-4 h-4" />
                        <span className="text-[10px] uppercase tracking-wide font-semibold">Жұлдызбен байланысты</span>
                      </div>
                      <div className="text-xl font-bold text-[var(--text)]">{stats.totalLinkedToStars}</div>
                    </div>
                  </div>

                  {uploaderEntries.length > 0 && (
                    <div className="p-3.5 rounded-2xl bg-[var(--bg-card)] border border-[var(--border)]">
                      <div className="text-[10px] uppercase tracking-wide font-semibold text-[var(--accent)] mb-2">
                        Кім қанша қосты
                      </div>
                      <div className="space-y-1.5">
                        {uploaderEntries.map(([name, count]) => (
                          <div key={name} className="flex items-center justify-between text-xs">
                            <span className="text-[var(--text-secondary)]">{name}</span>
                            <span className="font-semibold text-[var(--text)]">{count}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="p-3.5 rounded-2xl bg-[var(--bg-card)] border border-[var(--border)]">
                    <div className="text-[10px] uppercase tracking-wide font-semibold text-[var(--accent)] mb-2">
                      Мазмұн баптаулары
                    </div>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-[var(--text-secondary)]">Өзгертілген күндер</span>
                      <span className="font-semibold text-[var(--text)]">{stats.customizedDays} / 30</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-[var(--text-secondary)]">Тағайындалған ойындар</span>
                      <span className="font-semibold text-[var(--text)]">{stats.scheduledDays}</span>
                    </div>
                  </div>
                </>
              ) : null}
            </div>
          )}

          {activeTab === 'content' && (
            <div>
              <div className="flex items-center gap-1.5 mb-3 overflow-x-auto no-scrollbar pb-1">
                {Array.from({ length: 30 }, (_, i) => i + 1).map((day) => (
                  <button
                    key={day}
                    onClick={() => setSelectedDay(day)}
                    className={`flex-shrink-0 w-9 h-9 rounded-full text-xs font-semibold border transition flex items-center justify-center relative ${
                      selectedDay === day
                        ? 'bg-[var(--accent)] text-[var(--on-accent)] border-[var(--accent)]'
                        : 'bg-[var(--bg-card)] text-[var(--text-muted)] border-[var(--border)]'
                    }`}
                  >
                    {day}
                    {isCustomized(day) && (
                      <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-[var(--accent-2)]" />
                    )}
                  </button>
                ))}
              </div>

              {contentLoading ? (
                <div className="flex items-center justify-center py-10 text-[var(--text-faint)]">
                  <Loader2 className="w-5 h-5 animate-spin" />
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-[var(--accent)]">
                      {selectedDay}-күн {isCustomized(selectedDay) && '· өзгертілген'}
                    </span>
                    {isCustomized(selectedDay) && (
                      <button
                        onClick={handleRevertContent}
                        disabled={contentSaving}
                        className="flex items-center gap-1 text-[11px] text-[var(--text-faint)] hover:text-rose-500 transition disabled:opacity-50"
                      >
                        <RotateCcw className="w-3 h-3" />
                        Бастапқы күйге қайтару
                      </button>
                    )}
                  </div>

                  <label className="block">
                    <span className="mb-1 block text-[10px] uppercase tracking-wide text-[var(--text-muted)]">Тақырып</span>
                    <input
                      type="text"
                      value={formTitle}
                      onChange={(e) => setFormTitle(e.target.value)}
                      maxLength={120}
                      className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg-card)] px-3 py-2 text-sm text-[var(--text)] outline-none focus:border-[var(--accent)]/50"
                    />
                  </label>

                  <label className="block">
                    <span className="mb-1 block text-[10px] uppercase tracking-wide text-[var(--text-muted)]">Хабарлама мәтіні</span>
                    <textarea
                      value={formText}
                      onChange={(e) => setFormText(e.target.value)}
                      maxLength={1000}
                      rows={4}
                      className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg-card)] px-3 py-2 text-sm text-[var(--text)] outline-none resize-none focus:border-[var(--accent)]/50"
                    />
                  </label>

                  <label className="block">
                    <span className="mb-1 block text-[10px] uppercase tracking-wide text-[var(--text-muted)]">Кеңес (hint)</span>
                    <input
                      type="text"
                      value={formHint}
                      onChange={(e) => setFormHint(e.target.value)}
                      maxLength={200}
                      className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg-card)] px-3 py-2 text-sm text-[var(--text)] outline-none focus:border-[var(--accent)]/50"
                    />
                  </label>

                  <label className="block">
                    <span className="mb-1 block text-[10px] uppercase tracking-wide text-[var(--text-muted)]">Дауыс файлы (URL, міндетті емес)</span>
                    <input
                      type="text"
                      value={formVoiceUrl}
                      onChange={(e) => setFormVoiceUrl(e.target.value)}
                      placeholder="/voice/day-07.mp3"
                      maxLength={300}
                      className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg-card)] px-3 py-2 text-sm text-[var(--text)] placeholder:text-[var(--text-faint)] outline-none focus:border-[var(--accent)]/50"
                    />
                  </label>

                  {contentError && (
                    <div className="rounded-xl border border-rose-400/30 bg-rose-400/10 px-3 py-2 text-xs text-rose-500">
                      {contentError}
                    </div>
                  )}

                  <button
                    onClick={handleSaveContent}
                    disabled={contentSaving}
                    className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl btn-gold text-xs font-bold disabled:opacity-60"
                  >
                    {contentSaving ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : contentSaved ? (
                      <Check className="w-3.5 h-3.5" />
                    ) : (
                      <Save className="w-3.5 h-3.5" />
                    )}
                    {contentSaving ? 'Сақталуда…' : contentSaved ? 'Сақталды' : 'Сақтау'}
                  </button>
                </div>
              )}
            </div>
          )}

          {activeTab === 'partner' && (
            <div>
              {partnerLoading ? (
                <div className="flex flex-col items-center justify-center py-12 text-[var(--text-faint)]">
                  <Loader2 className="w-6 h-6 animate-spin mb-2" />
                  <span className="text-xs">Жүктелуде…</span>
                </div>
              ) : partnerError ? (
                <div className="rounded-2xl border border-rose-400/30 bg-rose-400/10 px-3 py-2 text-xs text-rose-500">
                  {partnerError}
                </div>
              ) : partnerCandidates.length === 0 ? (
                <div className="text-center py-10 text-xs text-[var(--text-faint)] italic">
                  Әзірге ешкім тіркеліп, ойнаған жоқ.
                </div>
              ) : (
                <>
                  {partnerCandidates.length > 1 && (
                    <div className="flex items-center gap-1.5 mb-3 overflow-x-auto no-scrollbar pb-1">
                      {partnerCandidates.map((u) => (
                        <button
                          key={u.userId}
                          onClick={() => { setSelectedUserId(u.userId); setExpandedDay(null); }}
                          className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold border transition ${
                            selectedUserId === u.userId
                              ? 'bg-[var(--accent)] text-[var(--on-accent)] border-[var(--accent)]'
                              : 'bg-[var(--bg-card)] text-[var(--text-muted)] border-[var(--border)]'
                          }`}
                        >
                          {u.name || u.userId}
                        </button>
                      ))}
                    </div>
                  )}

                  {selectedPartner && (
                    <>
                      <div className="grid grid-cols-3 gap-2 mb-3">
                        <div className="p-3 rounded-2xl bg-[var(--bg-card)] border border-[var(--border)] text-center">
                          <div className="text-lg font-bold text-[var(--text)]">{selectedPartner.daysPlayed}</div>
                          <div className="text-[9px] uppercase tracking-wide text-[var(--text-faint)]">Ағымдағы күн</div>
                        </div>
                        <div className="p-3 rounded-2xl bg-[var(--bg-card)] border border-[var(--border)] text-center">
                          <div className="flex items-center justify-center gap-1 text-lg font-bold text-[var(--accent)]">
                            <Flame className="w-3.5 h-3.5" />
                            {selectedPartner.streak}
                          </div>
                          <div className="text-[9px] uppercase tracking-wide text-[var(--text-faint)]">Стрик</div>
                        </div>
                        <div className="p-3 rounded-2xl bg-[var(--bg-card)] border border-[var(--border)] text-center">
                          <div className="text-[11px] font-semibold text-[var(--text)] leading-tight">
                            {selectedPartner.lastPlayedDate || '—'}
                          </div>
                          <div className="text-[9px] uppercase tracking-wide text-[var(--text-faint)]">Соңғы ойнаған</div>
                        </div>
                      </div>

                      {missingReplyCount > 0 && (
                        <div className="flex items-center gap-1.5 mb-3 px-3 py-2 rounded-xl border border-rose-400/30 bg-rose-400/10 text-[11px] text-rose-500">
                          <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                          {missingReplyCount} күнде "бүгінгі көңіл-күйің қалай?" жауабы толтырылмаған
                        </div>
                      )}

                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] uppercase tracking-wide text-[var(--text-muted)] font-semibold">
                          Күндер бойынша тарих
                        </span>
                        <button
                          onClick={() => setDayOrder((o) => (o === 'latest' ? 'oldest' : 'latest'))}
                          className="text-[11px] text-[var(--accent)] font-medium"
                        >
                          {dayOrder === 'latest' ? 'Соңғысынан' : 'Біріншісінен'}
                        </button>
                      </div>

                      <div className="space-y-2">
                        {partnerDayRows.map((row) => {
                          const hasReply = !!(row.reply && (row.reply.mood || row.reply.text));
                          const isExpanded = expandedDay === row.day;
                          return (
                            <div
                              key={row.day}
                              className="rounded-2xl bg-[var(--bg-card)] border border-[var(--border)] overflow-hidden"
                            >
                              <button
                                type="button"
                                onClick={() => setExpandedDay(isExpanded ? null : row.day)}
                                className="w-full flex items-center justify-between gap-2 p-3 text-left"
                              >
                                <div className="flex items-center gap-1.5 min-w-0">
                                  <span className="w-6 h-6 flex-shrink-0 rounded-full bg-[var(--accent)]/15 text-[var(--accent)] text-[11px] font-bold flex items-center justify-center">
                                    {row.day}
                                  </span>
                                  <span className="text-xs font-semibold text-[var(--text)] truncate">{row.title}</span>
                                  {!hasReply && (
                                    <AlertCircle className="w-3 h-3 flex-shrink-0 text-rose-500/80" />
                                  )}
                                </div>
                                <div className="flex items-center gap-1 flex-shrink-0 text-[10px] text-[var(--text-faint)]">
                                  <CalendarCheck className="w-3 h-3" />
                                  {row.completedAt ? formatDateTimeKk(row.completedAt) : 'белгісіз'}
                                </div>
                              </button>

                              {isExpanded && (
                                <div className="px-3 pb-3 pt-0.5 border-t border-[var(--border)] space-y-2.5">
                                  {/* Who + exactly when — the two things that
                                      were previously missing/unclear */}
                                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 pt-2.5 text-[11px]">
                                    <div className="flex items-center gap-1.5 text-[var(--text-secondary)]">
                                      <User className="w-3 h-3 text-[var(--accent)] flex-shrink-0" />
                                      <span className="font-semibold text-[var(--text)]">Тапсырған:</span>
                                      <span className="truncate">{selectedPartner?.name || selectedPartner?.userId}</span>
                                    </div>
                                    <div className="flex items-center gap-1.5 text-[var(--text-secondary)]">
                                      <Clock className="w-3 h-3 text-[var(--accent)] flex-shrink-0" />
                                      <span className="font-semibold text-[var(--text)]">Уақыты:</span>
                                      <span>{row.completedAt ? formatDateTimeKk(row.completedAt) : 'белгісіз'}</span>
                                    </div>
                                  </div>

                                  {/* Full constellation message content */}
                                  <div className="p-2.5 rounded-xl bg-[var(--bg-soft)] border border-[var(--border)]">
                                    <div className="text-[10px] uppercase tracking-wide font-semibold text-[var(--accent)] mb-1">
                                      {row.title}
                                    </div>
                                    <p className="text-xs text-[var(--text)] italic leading-relaxed">«{row.text}»</p>
                                    {row.hint && (
                                      <p className="text-[11px] text-[var(--accent-2)] mt-1.5">{row.hint}</p>
                                    )}
                                  </div>

                                  {/* Her reply to "how do you feel today" */}
                                  {hasReply ? (
                                    <div className="flex items-start gap-2 p-2.5 rounded-xl bg-[var(--bg-soft)] border border-[var(--border)]">
                                      {row.reply?.mood && <span className="text-base flex-shrink-0">{row.reply.mood}</span>}
                                      {row.reply?.text && (
                                        <span className="text-xs text-[var(--text-secondary)] leading-snug break-words">
                                          {row.reply.text}
                                        </span>
                                      )}
                                    </div>
                                  ) : (
                                    <div className="flex items-center gap-1.5 p-2.5 rounded-xl bg-rose-400/10 border border-rose-400/30 text-[11px] text-rose-500 italic">
                                      <AlertCircle className="w-3 h-3 flex-shrink-0" />
                                      "Бүгінгі көңіл-күйің қалай?" жауабы берілмеген
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </>
                  )}
                </>
              )}
            </div>
          )}

          {activeTab === 'schedule' && (
            <div>
              <p className="text-[11px] text-[var(--text-muted)] mb-3">
                Әр күнге қандай ойын шығатынын өзің тағайында. Тағайындалмаған күндер әдепкі кезекпен (6 ойын айналымы) жүреді.
              </p>

              {scheduleError && (
                <div className="mb-3 rounded-xl border border-rose-400/30 bg-rose-400/10 px-3 py-2 text-xs text-rose-500">
                  {scheduleError}
                </div>
              )}

              {scheduleLoading ? (
                <div className="flex items-center justify-center py-10 text-[var(--text-faint)]">
                  <Loader2 className="w-5 h-5 animate-spin" />
                </div>
              ) : (
                <div className="space-y-2">
                  {Array.from({ length: 30 }, (_, i) => i + 1).map((day) => (
                    <div
                      key={day}
                      className="flex items-center gap-2 p-2.5 rounded-xl bg-[var(--bg-card)] border border-[var(--border)]"
                    >
                      <span className="w-7 flex-shrink-0 text-xs font-semibold text-[var(--accent)]">{day}</span>
                      <select
                        value={schedule[day] || ''}
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val) handleAssignGame(day, val);
                          else handleRevertSchedule(day);
                        }}
                        disabled={scheduleBusyDay === day}
                        className="flex-1 rounded-lg border border-[var(--border)] bg-[var(--bg-soft)] px-2 py-1.5 text-xs text-[var(--text)] outline-none disabled:opacity-50"
                      >
                        <option value="">Автоматты кезек</option>
                        {GAME_OPTIONS.map((g) => (
                          <option key={g.id} value={g.id}>{g.label}</option>
                        ))}
                      </select>
                      {scheduleBusyDay === day && <Loader2 className="w-3.5 h-3.5 animate-spin text-[var(--accent)]" />}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'audio' && (
            <div>
              <p className="text-[11px] text-[var(--text-muted)] mb-3">
                Дауыстық хабарламасы бар әр күн үшін файл шынымен ашылып, ойнатылатынын тексереді
                (телефонда «шоқжұлдыз алғанда аудио ашылмайды» деген мәселе осы жерден көрінеді).
              </p>

              <button
                onClick={runAudioCheck}
                disabled={audioChecking || voiceDays.length === 0}
                className="w-full mb-3 flex items-center justify-center gap-1.5 py-2.5 rounded-xl btn-gold text-xs font-bold disabled:opacity-60"
              >
                {audioChecking ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <RefreshCw className="w-3.5 h-3.5" />
                )}
                {audioChecking ? 'Тексерілуде…' : 'Барлығын қайта тексеру'}
              </button>

              {audioCheckedAt && !audioChecking && (
                <p className="text-[10px] text-[var(--text-faint)] mb-3">
                  Соңғы тексеру: {formatDateTimeKk(audioCheckedAt)}
                  {brokenAudioCount > 0
                    ? ` · ${brokenAudioCount} күнде дауыс ашылмайды`
                    : ' · барлығы дұрыс ашылады'}
                </p>
              )}

              {voiceDays.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-center text-[var(--text-faint)] text-xs">
                  <Volume2 className="w-6 h-6 mb-2 opacity-50" />
                  Ешбір күнге дауыстық хабарлама тағайындалмаған
                </div>
              ) : (
                <div className="space-y-2">
                  {voiceDays.map(({ day, voiceUrl }) => {
                    const result = audioResults[day];
                    const status = result?.status;
                    return (
                      <div
                        key={day}
                        className="flex items-center gap-2 p-2.5 rounded-xl bg-[var(--bg-card)] border border-[var(--border)]"
                      >
                        <span className="w-7 flex-shrink-0 text-xs font-semibold text-[var(--accent)]">{day}</span>
                        <div className="flex-1 min-w-0">
                          <div className="text-xs text-[var(--text)] truncate">{voiceUrl}</div>
                          {result?.detail && (status === 'missing' || status === 'error') && (
                            <div className="text-[10px] text-rose-500 truncate">{result.detail}</div>
                          )}
                        </div>

                        {status === 'checking' && (
                          <Loader2 className="w-4 h-4 flex-shrink-0 animate-spin text-[var(--text-faint)]" />
                        )}
                        {status === 'ok' && (
                          <span className="flex items-center gap-1 flex-shrink-0 text-[10px] font-semibold text-emerald-600">
                            <CheckCircle2 className="w-4 h-4" /> Ашылады
                          </span>
                        )}
                        {(status === 'missing' || status === 'error') && (
                          <span className="flex items-center gap-1 flex-shrink-0 text-[10px] font-semibold text-rose-500">
                            <XCircle className="w-4 h-4" /> Ашылмайды
                          </span>
                        )}
                        {!status && (
                          <HelpCircle className="w-4 h-4 flex-shrink-0 text-[var(--text-faint)]" />
                        )}

                        {(status === 'missing' || status === 'error') && (
                          <button
                            onClick={() => {
                              setSelectedDay(day);
                              setActiveTab('content');
                            }}
                            className="flex-shrink-0 text-[10px] font-semibold text-[var(--accent)] underline underline-offset-2"
                          >
                            Түзету
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
