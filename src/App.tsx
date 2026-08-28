import React, { useState, useEffect, useCallback, useRef } from 'react';
import { UserProgress, DailyMessage, Photo } from './types';
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
import { logDayCompletion } from './utils/trackingUtils';
import { Heart, Sparkles, Moon, Star, BookOpen, X, Image, ShieldCheck } from 'lucide-react';

export default function App() {
  const [user, setUser] = useState<AppUser | null>(null);
  const [progress, setProgress] = useState<UserProgress>(getDefaultProgress());
  const [activeMessage, setActiveMessage] = useState<DailyMessage | null>(null);
  const [linkedPhotos, setLinkedPhotos] = useState<Photo[]>([]);
  const [messageOverrides, setMessageOverrides] = useState<Record<number, MessageOverride>>({});
  const [isTodayWinModal, setIsTodayWinModal] = useState<boolean>(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [isProfileOpen, setIsProfileOpen] = useState<boolean>(false);
  const [isAdminOpen, setIsAdminOpen] = useState<boolean>(false);
  const [isCapsulesOpen, setIsCapsulesOpen] = useState<boolean>(false);
  const [isDreamsOpen, setIsDreamsOpen] = useState<boolean>(false);
  const [activeMilestone, setActiveMilestone] = useState<MilestoneBonus | null>(null);
  const [isInitialized, setIsInitialized] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'all' | 'game' | 'map' | 'gallery'>('all');
  const [streakBrokenNotice, setStreakBrokenNotice] = useState<boolean>(false);

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

  return (
    <div
      data-theme={theme !== 'day' ? theme : undefined}
      className="min-h-screen bg-[var(--bg)] text-[var(--text)] flex flex-col justify-between relative overflow-x-hidden select-none pb-16"
    >
      {/* Background stars & ambient glows */}
      <NightSky theme={theme} />

      {/* Main Content Area */}
      <main className="relative z-10 w-full flex-1 flex flex-col items-center justify-start pb-8">
        {/* Header with counters and title */}
        <Header
          progress={progress}
          user={user}
          onToggleSound={handleToggleSound}
          onToggleTheme={handleToggleTheme}
          onOpenSettings={() => setIsSettingsOpen(true)}
          onOpenRules={() => setIsSettingsOpen(true)}
          onOpenProfile={() => setIsProfileOpen(true)}
          onOpenAdmin={() => setIsAdminOpen(true)}
          onOpenCapsules={() => setIsCapsulesOpen(true)}
          onOpenDreams={() => setIsDreamsOpen(true)}
          onLogout={handleLogout}
        />

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

        {/* Romantic Footer Note */}
        <footer className="mt-4 mb-2 text-center text-xs text-[var(--text-faint)] font-light flex items-center justify-center gap-1.5 px-4">
          <span>Біздің шоқжұлдыз күн сайын өсіп келеді</span>
          <Heart className="w-3.5 h-3.5 text-[var(--accent-2)] fill-[var(--accent-2)]" />
        </footer>
      </main>

      {/* Immersive UI Fixed Bottom Navigation Bar */}
      <nav className="fixed bottom-0 left-0 right-0 h-16 flex items-center justify-around px-1 bg-[var(--bg-nav)] backdrop-blur-xl border-t border-[var(--border)] z-30 shadow-[0_-4px_20px_var(--overlay)]">
        <button
          onClick={() => setActiveTab('all')}
          className={`flex flex-col items-center gap-0.5 text-[11px] transition-colors ${
            activeTab === 'all' ? 'text-[var(--accent)] font-bold' : 'text-[var(--text-faint)] hover:text-[var(--accent)]'
          }`}
        >
          <Sparkles className="w-5 h-5" />
          <span>Барлығы</span>
        </button>

        <button
          onClick={() => setActiveTab('game')}
          className={`flex flex-col items-center gap-0.5 text-[11px] transition-colors ${
            activeTab === 'game' ? 'text-[var(--accent)] font-bold' : 'text-[var(--text-faint)] hover:text-[var(--accent)]'
          }`}
        >
          <Moon className="w-5 h-5" />
          <span>Ойын</span>
        </button>

        <button
          onClick={() => setActiveTab('map')}
          className={`flex flex-col items-center gap-0.5 text-[11px] transition-colors ${
            activeTab === 'map' ? 'text-[var(--accent)] font-bold' : 'text-[var(--text-faint)] hover:text-[var(--accent)]'
          }`}
        >
          <Star className="w-5 h-5" />
          <span>Шоқжұлдыз</span>
        </button>

        <button
          onClick={() => setActiveTab('gallery')}
          className={`flex flex-col items-center gap-0.5 text-[11px] transition-colors ${
            activeTab === 'gallery' ? 'text-[var(--accent)] font-bold' : 'text-[var(--text-faint)] hover:text-[var(--accent)]'
          }`}
        >
          <Image className="w-5 h-5" />
          <span>Галерея</span>
        </button>
      </nav>

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

      {/* Admin Panel — statistics, per-day content editor, game schedule.
          Only ever opened via the admin-only Header button below, so no
          extra guard is needed here beyond that button not existing for
          non-admins. */}
      {user.role === 'admin' && (
        <AdminPanel isOpen={isAdminOpen} onClose={() => setIsAdminOpen(false)} />
      )}

      {/* Time Capsules — letters locked until a future date */}
      <TimeCapsuleModal
        isOpen={isCapsulesOpen}
        onClose={() => setIsCapsulesOpen(false)}
        isAdmin={user.role === 'admin'}
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
