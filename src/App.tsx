import React, { useState, useEffect, useCallback, useRef } from 'react';
import { UserProgress, DailyMessage, Photo, AppTab, DateInvite } from './types';
import { DAILY_MESSAGES, MILESTONE_BONUSES, MilestoneBonus } from './data/constants';
import { fetchPhotos } from './utils/photoUtils';
import { fetchMessageOverrides, applyMessageOverride, MessageOverride } from './utils/adminUtils';
import {
  loadProgress,
  saveProgress,
  loadProgressFromMongo,
  getTodayDateString,
  isSameDay,
  isYesterday,
  getDefaultProgress,
  getUnlockedThemes,
  AVAILABLE_THEMES,
  ThemeName,
  AVAILABLE_DIFFICULTIES,
  DifficultyName,
} from './utils/constellationUtils';
import { getCurrentUser, logoutUser, updateUserProfile, AppUser } from './utils/authUtils';

import { NightSky } from './components/NightSky';
import { Header } from './components/Header';
import { GameHub } from './components/GameHub';
import { ConstellationMap } from './components/ConstellationMap';
import { MessageCard } from './components/MessageCard';
import { SettingsModal } from './components/SettingsModal';
import { ProfileModal } from './components/ProfileModal';
import { Gallery } from './components/Gallery';
import { AdminPanel } from './components/AdminPanel';
import { AuthScreen } from './components/AuthScreen';
import { TimeCapsuleModal } from './components/TimeCapsuleModal';
import { DreamsModal } from './components/DreamsModal';
import { MilestoneModal } from './components/MilestoneModal';
import { NextRewardCountdown } from './components/NextRewardCountdown';
import { DateInviteSection } from './components/DateInviteSection';
import { logDayCompletion } from './utils/trackingUtils';
import { fetchActiveDateInvite, respondToDateInvite } from './utils/dateInviteUtils';
import { Heart, Sparkles, BookOpen, X, LayoutDashboard } from 'lucide-react';

// Remembers, per browser, which invite id the partner has already seen —
// so the red notification dot only ever appears for a genuinely new
// pending invite, not one she's already opened the tab for.
const SEEN_INVITE_KEY = 'nashe_sozvezdie_seen_invite_id';

export default function App() {
  const [user, setUser] = useState<AppUser | null>(null);
  const [progress, setProgress] = useState<UserProgress>(getDefaultProgress());
  const [activeMessage, setActiveMessage] = useState<DailyMessage | null>(null);
  const [linkedPhotos, setLinkedPhotos] = useState<Photo[]>([]);
  const [messageOverrides, setMessageOverrides] = useState<Record<number, MessageOverride>>({});
  const [isTodayWinModal, setIsTodayWinModal] = useState<boolean>(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [isProfileOpen, setIsProfileOpen] = useState<boolean>(false);
  // Only meaningful for admin accounts: true while the admin is intentionally
  // looking at the regular partner-facing UI (see the full-screen dashboard
  // branch below) instead of the admin dashboard.
  const [previewMode, setPreviewMode] = useState<boolean>(false);
  const [isCapsulesOpen, setIsCapsulesOpen] = useState<boolean>(false);
  const [isDreamsOpen, setIsDreamsOpen] = useState<boolean>(false);
  const [activeMilestone, setActiveMilestone] = useState<MilestoneBonus | null>(null);
  const [isInitialized, setIsInitialized] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<AppTab>('all');
  const [streakBrokenNotice, setStreakBrokenNotice] = useState<boolean>(false);

  // Date invite ("will you go out with me?") — polled from the backend so
  // a brand-new invite the admin sends shows up as a toast + a red dot on
  // the hamburger menu without needing a page reload.
  const [dateInvite, setDateInvite] = useState<DateInvite | null>(null);
  const [dateInviteLoading, setDateInviteLoading] = useState<boolean>(true);
  const [inviteToast, setInviteToast] = useState<boolean>(false);

  // Keep a light-weight copy of the shared gallery around so the
  // constellation map can show a camera badge on days that have a linked
  // photo, and the reward card can show that photo alongside its message.
  // Also refreshes admin content overrides here, so an edit the admin makes
  // shows up without needing a full reload.
  // Refetched whenever the map/gallery/"all" view becomes visible so a
  // newly-linked photo or edited message shows up without a full reload.
  useEffect(() => {
    if (!user || !isInitialized) return;
    if (activeTab === 'map' || activeTab === 'all' || activeTab === 'gallery') {
      fetchPhotos().then(setLinkedPhotos).catch(() => {
        // non-critical — the map just won't show camera badges this time
      });
      fetchMessageOverrides()
        .then((list) => {
          const map: Record<number, MessageOverride> = {};
          list.forEach((o) => { map[o.dayNumber] = o; });
          setMessageOverrides(map);
        })
        .catch(() => {
          // non-critical — falls back to the built-in default messages
        });
    }
  }, [activeTab, user, isInitialized]);

  // Which invite id has already been shown to this browser — read once from
  // localStorage, then kept in sync with a ref so the polling interval below
  // always sees the latest value without needing to recreate itself.
  const [seenInviteId, setSeenInviteId] = useState<string | null>(() =>
    typeof window !== 'undefined' ? localStorage.getItem(SEEN_INVITE_KEY) : null
  );
  const seenInviteIdRef = useRef<string | null>(seenInviteId);

  const markInviteSeen = useCallback((id: string) => {
    localStorage.setItem(SEEN_INVITE_KEY, id);
    seenInviteIdRef.current = id;
    setSeenInviteId(id);
  }, []);

  // Poll for the active date invite so a brand-new one the admin sends
  // shows up as a toast + red dot without needing a page reload. Toasts
  // once per genuinely new invite id, never repeats for the same one.
  const lastToastedIdRef = useRef<string | null>(null);
  useEffect(() => {
    if (!user || !isInitialized) return;
    let cancelled = false;

    const poll = () => {
      fetchActiveDateInvite()
        .then((invite) => {
          if (cancelled) return;
          setDateInvite(invite);
          setDateInviteLoading(false);
          if (
            invite &&
            invite.status === 'pending' &&
            invite.id !== seenInviteIdRef.current &&
            lastToastedIdRef.current !== invite.id
          ) {
            lastToastedIdRef.current = invite.id;
            setInviteToast(true);
          }
        })
        .catch(() => setDateInviteLoading(false));
    };

    poll();
    const interval = setInterval(poll, 30000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [user, isInitialized]);

  // Opening the "Свидание" tab counts as having seen the current invite —
  // clears the red dot and dismisses any lingering toast.
  useEffect(() => {
    if (activeTab === 'date' && dateInvite) {
      markInviteSeen(dateInvite.id);
      setInviteToast(false);
    }
  }, [activeTab, dateInvite, markInviteSeen]);

  const hasNewInvite = !!dateInvite && dateInvite.status === 'pending' && dateInvite.id !== seenInviteId;

  const handleRespondToInvite = useCallback(
    async (day: string, time: string, plan: string, planLabel: string, dodgeCount: number) => {
      if (!dateInvite) return;
      const updated = await respondToDateInvite(dateInvite.id, day, time, plan, planLabel, dodgeCount);
      setDateInvite(updated);
    },
    [dateInvite]
  );

  const todayStr = getTodayDateString();
  const rewardDate = progress.rewardDate || progress.lastPlayedDate;
  const playedToday = !!rewardDate && isSameDay(rewardDate);
  const hasRewardToday = !!rewardDate && isSameDay(rewardDate);
  const progressUpdateGuardRef = useRef<string | null>(null);

  const autoShownDateRef = useRef<string | null>(null);

  // Active visual theme — freely toggled from the Header or Settings;
  // persisted per-user alongside the rest of progress.
  const theme: ThemeName = AVAILABLE_THEMES.includes(progress.theme as ThemeName)
    ? (progress.theme as ThemeName)
    : 'day';

  // Active game difficulty — chosen right on the game's start screen (or
  // in Settings); persisted per-user alongside the rest of progress.
  const difficulty: DifficultyName = AVAILABLE_DIFFICULTIES.includes(progress.difficulty as DifficultyName)
    ? (progress.difficulty as DifficultyName)
    : 'medium';

  // Themes unlocked so far by streak milestones (day is always available).
  const unlockedThemes = getUnlockedThemes(progress.streak, progress.seenMilestones || []);

  // Detect a newly-reached streak milestone (7/14/21/30) and pop the
  // celebration modal once — seenMilestones remembers which ones have
  // already been shown so it never repeats, even if the streak later dips
  // and climbs back past the same threshold.
  useEffect(() => {
    if (!isInitialized) return;
    const seen = progress.seenMilestones || [];
    const next = MILESTONE_BONUSES.find((m) => progress.streak >= m.streak && !seen.includes(m.streak));
    if (next) {
      setActiveMilestone(next);
      setProgress((prev) => ({
        ...prev,
        seenMilestones: [...new Set([...(prev.seenMilestones || []), next.streak])],
      }));
    }
  }, [progress.streak, progress.seenMilestones, isInitialized]);

  const showCurrentMessage = useCallback((dayNumber: number) => {
    const msgIndex = (Math.max(1, dayNumber) - 1) % DAILY_MESSAGES.length;
    const base = { ...DAILY_MESSAGES[msgIndex], dayNumber };
    setActiveMessage(applyMessageOverride(base, messageOverrides[dayNumber]));
    setIsTodayWinModal(true);
  }, [messageOverrides]);

  useEffect(() => {
    if (!user || !isInitialized || !playedToday) return;
    // Only auto-open the reward once per day. Without this guard, closing
    // the modal (which sets activeMessage to null) re-triggered this effect
    // and immediately reopened the same card, making it impossible to close.
    if (autoShownDateRef.current === todayStr) return;

    autoShownDateRef.current = todayStr;
    showCurrentMessage(Math.max(1, progress.daysPlayed));
  }, [user, isInitialized, playedToday, progress.daysPlayed, todayStr, showCurrentMessage]);

  useEffect(() => {
    const currentUser = getCurrentUser();
    setUser(currentUser);
  }, []);

  useEffect(() => {
    if (!user) {
      setIsInitialized(false);
      return;
    }

    const loaded = loadProgress(user.email);
    setProgress(loaded);
    setIsInitialized(true);

    loadProgressFromMongo().then((remote) => {
      // Only adopt the remote copy when it is genuinely ahead of (or newer
      // than) what we already loaded locally. Never overwrite fresher local
      // progress just because a remote record happens to exist — that was
      // causing a stale Mongo snapshot to silently reset "played today",
      // letting the same day get counted twice.
      const shouldUseRemote = !!remote && (
        remote.daysPlayed > loaded.daysPlayed ||
        (remote.daysPlayed === loaded.daysPlayed && (
          !loaded.lastPlayedDate ||
          (remote.lastPlayedDate && remote.lastPlayedDate > loaded.lastPlayedDate)
        ))
      );

      if (shouldUseRemote) {
        setProgress(remote);
      }
    });
  }, [user?.email]);

  // Save progress whenever progress state updates
  useEffect(() => {
    if (isInitialized && user) {
      saveProgress(progress, user.email);
    }
  }, [progress, isInitialized, user?.email]);

  const updateProgress = useCallback(() => {
    if (!user) return;
    if (progress.lastPlayedDate === todayStr || progressUpdateGuardRef.current === todayStr) return;

    progressUpdateGuardRef.current = todayStr;

    const previousDate = progress.lastPlayedDate;
    const nextDaysPlayed = progress.daysPlayed + 1;
    let nextStreak = progress.streak;

    if (!previousDate) {
      nextStreak = 1;
      setStreakBrokenNotice(false);
    } else if (isYesterday(previousDate)) {
      nextStreak += 1;
      setStreakBrokenNotice(false);
    } else {
      // A day (or more) was missed. The streak resets, but this is never framed
      // as a punishment — the constellation itself keeps growing regardless.
      nextStreak = 1;
      setStreakBrokenNotice(true);
    }

    const updatedProgress: UserProgress = {
      ...progress,
      lastPlayedDate: todayStr,
      rewardDate: todayStr,
      daysPlayed: nextDaysPlayed,
      streak: nextStreak,
      unlockedDays: [...new Set([...progress.unlockedDays, nextDaysPlayed])],
    };

    setProgress(updatedProgress);

    // Log exactly when this day's star was earned — fire-and-forget, so a
    // slow/offline connection never blocks the actual reward from showing.
    logDayCompletion(user.email, nextDaysPlayed).catch(() => {
      // Non-fatal — only the admin's history view is affected.
    });
  }, [progress, todayStr, user]);

  const handleGameWin = useCallback((isBonus: boolean) => {
    if (isBonus || hasRewardToday || progressUpdateGuardRef.current === todayStr) {
      const currentDay = Math.max(1, progress.daysPlayed);
      showCurrentMessage(currentDay);
      return;
    }

    const nextDay = progress.daysPlayed + 1;
    updateProgress();
    showCurrentMessage(nextDay);
  }, [hasRewardToday, progress.daysPlayed, showCurrentMessage, todayStr, updateProgress]);

  // Toggle Sound FX
  const handleToggleSound = () => {
    setProgress((prev) => ({
      ...prev,
      soundEnabled: !prev.soundEnabled,
    }));
  };

  // Toggle / set visual theme — freely switchable at any time, no restrictions
  const handleSetTheme = (nextTheme: ThemeName) => {
    setProgress((prev) => ({
      ...prev,
      theme: nextTheme,
    }));
  };

  const handleToggleTheme = () => {
    // Only cycles through themes already unlocked by a streak milestone —
    // an as-yet-unearned theme is skipped rather than silently applied.
    const currentIndex = unlockedThemes.indexOf(theme);
    const nextTheme = unlockedThemes[(currentIndex + 1) % unlockedThemes.length];
    handleSetTheme(nextTheme);
  };

  // Set game difficulty — freely switchable any time, including mid-session
  // from the game's own start screen.
  const handleSetDifficulty = (nextDifficulty: DifficultyName) => {
    setProgress((prev) => ({
      ...prev,
      difficulty: nextDifficulty,
    }));
  };

  // Update profile (name / bio) — persists to the auth store and refreshes
  // the current session so the new name shows everywhere immediately.
  const handleUpdateProfile = (updates: { name: string; bio: string }) => {
    if (!user) return;
    try {
      const updatedUser = updateUserProfile(user.email, updates);
      setUser(updatedUser);
    } catch (err) {
      console.error('Failed to update profile:', err);
    }
  };

  // Reset Progress Handler
  const handleResetProgress = () => {
    const resetState: UserProgress = { ...getDefaultProgress(), theme };
    setProgress(resetState);
    if (user) saveProgress(resetState, user.email);
    setActiveMessage(null);
  };

  const handleLogout = () => {
    logoutUser();
    setUser(null);
    setProgress(getDefaultProgress());
    setIsInitialized(false);
    setActiveMessage(null);
    setIsSettingsOpen(false);
  };

  // Dev mode: unlock next day for testing
  const handleUnlockNextDayDev = () => {
    const nextDayNum = progress.daysPlayed + 1;
    const newStreak = progress.streak + 1;
    const updated: UserProgress = {
      ...progress,
      daysPlayed: nextDayNum,
      streak: newStreak,
      lastPlayedDate: todayStr,
      rewardDate: todayStr,
      unlockedDays: [...progress.unlockedDays, nextDayNum],
    };
    setProgress(updated);

    const msgIndex = (nextDayNum - 1) % DAILY_MESSAGES.length;
    const base = { ...DAILY_MESSAGES[msgIndex], dayNumber: nextDayNum };
    setActiveMessage(applyMessageOverride(base, messageOverrides[nextDayNum]));
    setIsTodayWinModal(true);
  };

  if (!user) {
    return <AuthScreen onAuthSuccess={setUser} />;
  }

  if (!isInitialized) {
    return (
      <div className="min-h-screen bg-[var(--bg)] flex items-center justify-center text-[var(--accent)]">
        <Sparkles className="w-8 h-8 animate-spin text-[var(--accent)]" />
      </div>
    );
  }

  // Admin accounts land straight on the full-screen control dashboard —
  // no modal, no extra click. "Партнер көзімен қарау" flips previewMode so
  // the admin can see (and test) the exact experience the partner gets,
  // then a floating button brings them straight back to the dashboard.
  if (user.role === 'admin' && !previewMode) {
    return (
      <div data-theme={theme !== 'day' ? theme : undefined} className="min-h-screen bg-[var(--bg)] text-[var(--text)]">
        <AdminPanel
          isOpen
          mode="page"
          onPreview={() => setPreviewMode(true)}
          onLogout={handleLogout}
        />
      </div>
    );
  }

  return (
    <div
      data-theme={theme !== 'day' ? theme : undefined}
      className="min-h-screen bg-[var(--bg)] text-[var(--text)] flex flex-col justify-between relative overflow-x-hidden select-none"
    >
      {/* Background stars & ambient glows */}
      <NightSky theme={theme} />

      {/* Main Content Area */}
      <main className="relative z-10 w-full flex-1 flex flex-col items-center justify-start pb-8">
        {/* Header with counters and title */}
        <Header
          progress={progress}
          user={user}
          activeTab={activeTab}
          onSetActiveTab={setActiveTab}
          hasNewInvite={hasNewInvite}
          onToggleSound={handleToggleSound}
          onToggleTheme={handleToggleTheme}
          onOpenSettings={() => setIsSettingsOpen(true)}
          onOpenRules={() => setIsSettingsOpen(true)}
          onOpenProfile={() => setIsProfileOpen(true)}
          onOpenAdmin={() => setPreviewMode(false)}
          onOpenCapsules={() => setIsCapsulesOpen(true)}
          onOpenDreams={() => setIsDreamsOpen(true)}
          onLogout={handleLogout}
        />

        {/* Date invite toast — a new pending invite showed up while she's
            somewhere else on the site. Tapping it jumps straight to the
            "Свидание" tab; the red dot on the hamburger stays until then. */}
        {inviteToast && dateInvite && (
          <div className="w-full max-w-xl mx-auto px-4 -mt-1 mb-1">
            <button
              onClick={() => {
                setActiveTab('date');
                setInviteToast(false);
              }}
              className="w-full flex items-center gap-2.5 p-3.5 rounded-2xl bg-[var(--accent)]/10 border border-[var(--accent)]/30 text-left hover:bg-[var(--accent)]/15 transition"
            >
              <Heart className="w-4 h-4 text-[var(--accent)] flex-shrink-0 fill-[var(--accent)]" />
              <span className="flex-1 text-xs font-medium text-[var(--text)]">
                Саған шақыру келді 💌 Қарау үшін бас
              </span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setInviteToast(false);
                }}
                className="text-[var(--text-faint)] hover:text-[var(--text)] flex-shrink-0"
                aria-label="Жасыру"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </button>
          </div>
        )}

        {/* Live countdown to the next available star — only relevant once
            today's has already been claimed. Ticks independently so it
            never triggers a re-render of the game, map, or gallery. */}
        <NextRewardCountdown visible={hasRewardToday} />

        {/* Soft, non-punishing notice when a streak resets — the constellation
            itself is never lost, only the daily-in-a-row counter. */}
        {streakBrokenNotice && (
          <div className="w-full max-w-xl mx-auto px-4 -mt-1 mb-1">
            <div className="flex items-start gap-2.5 p-3.5 rounded-2xl bg-[var(--accent-2)]/8 border border-[var(--accent-2)]/25 text-left">
              <Heart className="w-4 h-4 text-[var(--accent-2)] flex-shrink-0 mt-0.5" />
              <p className="flex-1 text-xs text-[var(--accent-2-dark)] leading-relaxed">
                Стрик үзілді — бұл қалыпты жағдай. Шоқжұлдыз бәрібір әр жаңа жұлдызбен өсе береді.
              </p>
              <button
                onClick={() => setStreakBrokenNotice(false)}
                className="text-[var(--accent-2)] hover:text-[var(--accent-2-dark)] flex-shrink-0"
                aria-label="Жасыру"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* Views */}
        {(activeTab === 'all' || activeTab === 'game') && (
          <GameHub
            theme={theme}
            difficulty={difficulty}
            onSetDifficulty={handleSetDifficulty}
            playedToday={playedToday}
            soundEnabled={progress.soundEnabled}
            onGameWin={handleGameWin}
            daysPlayed={progress.daysPlayed}
          />
        )}

        {(activeTab === 'all' || activeTab === 'map') && (
          <ConstellationMap
            daysPlayed={progress.daysPlayed}
            unlockedDays={progress.unlockedDays}
            linkedPhotos={linkedPhotos}
            onSelectStar={(message) => {
              setActiveMessage(applyMessageOverride(message, messageOverrides[message.dayNumber]));
              setIsTodayWinModal(false);
            }}
          />
        )}

        {activeTab === 'gallery' && <Gallery currentUserName={user.name} daysPlayed={progress.daysPlayed} />}

        {activeTab === 'date' && (
          <DateInviteSection
            invite={dateInvite}
            isAdmin={user.role === 'admin' && !previewMode}
            loading={dateInviteLoading}
            onRespond={handleRespondToInvite}
            onExit={() => setActiveTab('all')}
            onOpenAdmin={() => setPreviewMode(false)}
          />
        )}

        {/* Romantic Footer Note */}
        <footer className="mt-4 mb-2 text-center text-xs text-[var(--text-faint)] font-light flex items-center justify-center gap-1.5 px-4">
          <span>Біздің шоқжұлдыз күн сайын өсіп келеді</span>
          <Heart className="w-3.5 h-3.5 text-[var(--accent-2)] fill-[var(--accent-2)]" />
        </footer>
      </main>

      {/* Bottom navigation now lives in the hamburger menu (see Header) */}

      {/* Unlocked Message Popup Card */}
      <MessageCard
        message={activeMessage}
        onClose={() => setActiveMessage(null)}
        isTodayWin={isTodayWinModal}
        linkedPhoto={
          activeMessage
            ? linkedPhotos.find((p) => p.linkedDay === activeMessage.dayNumber) || null
            : null
        }
      />

      {/* Settings & Rules Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        progress={progress}
        user={user}
        onLogout={handleLogout}
        onResetProgress={handleResetProgress}
        onUnlockNextDayDev={handleUnlockNextDayDev}
        onSetTheme={handleSetTheme}
        onSetDifficulty={handleSetDifficulty}
        onOpenProfile={() => {
          setIsSettingsOpen(false);
          setIsProfileOpen(true);
        }}
      />

      {/* Profile Modal — view/edit name and short bio */}
      <ProfileModal
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
        user={user}
        onSave={handleUpdateProfile}
      />

      {/* Preview mode: the admin is intentionally looking at the regular
          partner-facing UI to test it. A floating button always brings them
          straight back to the full-screen admin dashboard. */}
      {user.role === 'admin' && previewMode && (
        <button
          onClick={() => setPreviewMode(false)}
          className="fixed bottom-5 right-4 z-40 flex items-center gap-1.5 px-4 py-2.5 rounded-full bg-[var(--accent)] text-[var(--on-accent)] text-xs font-bold shadow-[0_8px_24px_var(--overlay)] active:scale-95 transition"
        >
          <LayoutDashboard className="w-3.5 h-3.5" />
          Дашбордқа оралу
        </button>
      )}

      {/* Time Capsules — letters locked until a future date */}
      <TimeCapsuleModal
        isOpen={isCapsulesOpen}
        onClose={() => setIsCapsulesOpen(false)}
        isAdmin={user.role === 'admin' && !previewMode}
      />

      {/* Shared dreams / plans checklist */}
      <DreamsModal
        isOpen={isDreamsOpen}
        onClose={() => setIsDreamsOpen(false)}
        currentUserName={user.name}
      />

      {/* Streak milestone celebration — unlocks a new theme */}
      <MilestoneModal
        milestone={activeMilestone}
        onClose={() => setActiveMilestone(null)}
        onApplyTheme={handleSetTheme}
      />
    </div>
  );
}
