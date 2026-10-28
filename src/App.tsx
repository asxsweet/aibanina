import React, { useState, useEffect, useCallback, useRef } from 'react';
import { UserProgress, DailyMessage, Photo, AppTab, DateInvite } from './types';
import { DAILY_MESSAGES, MILESTONE_BONUSES, MilestoneBonus } from './data/constants';
import { fetchPhotos } from './utils/photoUtils';
import { fetchMessageOverrides, applyMessageOverride, MessageOverride } from './utils/adminUtils';
import {
  loadProgress,
  saveProgress,
  loadProgressFromMongo,
  reconcileProgress,
  getTodayDateString,
  isSameDay,
  getDefaultProgress,
  getUnlockedThemes,
  AVAILABLE_THEMES,
  ThemeName,
  AVAILABLE_DIFFICULTIES,
  DifficultyName,
} from './utils/constellationUtils';
import { getCurrentUser, refreshCurrentUser, logoutUser, updateUserProfile, AppUser } from './utils/authUtils';
import {
  applyDailyClaim,
  awardBonusStardust,
  buyShield,
  buyPeek,
  spendForWish,
  getEffectiveStreak,
  isStreakShielded,
  DAILY_STAR_STARDUST,
  WISH_PRICE,
} from './utils/streakUtils';
import {
  fetchJoint,
  checkinJoint,
  fetchMeeting,
  fetchSpecialDaysToday,
  sendWish,
  JointState,
  Meeting,
  SpecialDayItem,
} from './utils/featureApi';
import { THEME_META } from './data/themes';

import { NightSky } from './components/NightSky';
import { Header } from './components/Header';
import { GameHub, GAME_LABELS, useDailyGameId } from './components/GameHub';
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
import { OurStorySection } from './components/OurStorySection';
import { BottomNav } from './components/BottomNav';
import { StreakProgress } from './components/StreakProgress';
import { StreakCalendarModal } from './components/StreakCalendarModal';
import { StardustShopModal } from './components/StardustShopModal';
import { TomorrowTeaser } from './components/TomorrowTeaser';
import { MeetingCountdown } from './components/MeetingCountdown';
import { SpecialDayModal } from './components/SpecialDayModal';
import { LeaderboardModal } from './components/LeaderboardModal';
import { RewardFlight } from './components/RewardFlight';
import { ResultToast } from './components/ResultToast';
import { WelcomeTour } from './components/WelcomeTour';
import { LoveIdeasModal } from './components/LoveIdeasModal';
import { HomeStatTiles } from './components/HomeStatTiles';
import { TodaysStarCard } from './components/TodaysStarCard';
import { QuickActions } from './components/QuickActions';
import { GalaxyTeaser } from './components/GalaxyTeaser';
import { logDayCompletion } from './utils/trackingUtils';
import { fetchActiveDateInvite, respondToDateInvite } from './utils/dateInviteUtils';
import { Heart, Sparkles, BookOpen, X, LayoutDashboard } from 'lucide-react';

// Remembers, per browser, which invite id the partner has already seen —
// so the red notification dot only ever appears for a genuinely new
// pending invite, not one she's already opened the tab for.
const SEEN_INVITE_KEY = 'nashe_sozvezdie_seen_invite_id';

// Shown on the sign-in screen the first time she opens the updated site: accounts
// now live on the server, so the old browser-only login no longer counts.

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
  const [shieldNotice, setShieldNotice] = useState<string | null>(null);
  const [authNotice, setAuthNotice] = useState<string | undefined>();
  // The first save to the server waits until the server's copy has been
  // fetched — otherwise a fresh or stale device could overwrite newer progress.
  const [remoteSynced, setRemoteSynced] = useState<boolean>(false);

  const [isCalendarOpen, setIsCalendarOpen] = useState<boolean>(false);
  const [isShopOpen, setIsShopOpen] = useState<boolean>(false);
  const [isLeaderboardOpen, setIsLeaderboardOpen] = useState<boolean>(false);
  const [isIdeasOpen, setIsIdeasOpen] = useState<boolean>(false);
  const [joint, setJoint] = useState<JointState | null>(null);
  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [specialItems, setSpecialItems] = useState<SpecialDayItem[]>([]);
  const [resultLines, setResultLines] = useState<string[]>([]);
  const [flightDay, setFlightDay] = useState<number | null>(null);
  const [highlightDay, setHighlightDay] = useState<number | null>(null);
  // Day number of a star claimed THIS session — the reward flight only plays for those.
  const claimedDayRef = useRef<number | null>(null);

  // Date invite ("will you go out with me?") — polled from the backend so
  // a brand-new invite the admin sends shows up as a toast + a red dot on
  // the hamburger menu without needing a page reload.
  const [dateInvite, setDateInvite] = useState<DateInvite | null>(null);
  const [dateInviteLoading, setDateInviteLoading] = useState<boolean>(true);
  const [inviteToast, setInviteToast] = useState<boolean>(false);

  // Today's game for the home "star" card + the "switch game" signal that
  // raises the GameHub picker when she taps «Ойынды ауыстыру» at home.
  const dailyGameId = useDailyGameId(progress.daysPlayed);
  const [gamePickerSignal, setGamePickerSignal] = useState<number>(0);

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

  // Themes she owns: 'day' + the compensation theme + every milestone theme
  // reached so far (remembered in earnedThemes, so a streak reset never takes one away).
  const unlockedThemes = getUnlockedThemes(progress);

  // The streak to display: a lapsed streak that no shield can save reads 0.
  const effectiveStreak = getEffectiveStreak(progress, todayStr);
  const streakShielded = isStreakShielded(progress, todayStr);

  // Partner-facing UI is shown to the partner, and to the admin while previewing it.
  const showPartnerUi = !!user && (user.role !== 'admin' || previewMode);

  // Browser chrome (address bar, overscroll area) follows the active theme.
  useEffect(() => {
    const color = THEME_META[theme].themeColor;
    let meta = document.querySelector('meta[name="theme-color"]');
    if (!meta) {
      meta = document.createElement('meta');
      meta.setAttribute('name', 'theme-color');
      document.head.appendChild(meta);
    }
    meta.setAttribute('content', color);
    document.body.style.backgroundColor = color;
  }, [theme]);

  // Detect a newly-reached streak milestone (see MILESTONE_BONUSES) and pop the
  // celebration modal once — seenMilestones remembers which ones have
  // already been shown so it never repeats, even if the streak later dips
  // and climbs back past the same threshold. Only one popup at a time; if
  // several are due at once, the next appears after this one is closed.
  useEffect(() => {
    if (!isInitialized || activeMilestone) return;
    const seen = progress.seenMilestones || [];
    const next = MILESTONE_BONUSES.find((m) => progress.streak >= m.streak && !seen.includes(m.streak));
    if (next) {
      setActiveMilestone(next);
      setProgress((prev) => ({
        ...prev,
        seenMilestones: [...new Set([...(prev.seenMilestones || []), next.streak])],
        earnedThemes: [...new Set([...(prev.earnedThemes || []), next.theme])],
      }));
    }
  }, [progress.streak, progress.seenMilestones, isInitialized, activeMilestone]);

  // The message (with the admin's edits applied) for any day number.
  const getMessageForDay = useCallback(
    (dayNumber: number): DailyMessage => {
      const safeDay = Math.max(1, dayNumber);
      const base = { ...DAILY_MESSAGES[(safeDay - 1) % DAILY_MESSAGES.length], dayNumber: safeDay };
      return applyMessageOverride(base, messageOverrides[safeDay]);
    },
    [messageOverrides]
  );

  // Joint ("our") streak + the date-bound surprises + the meeting countdown all
  // come from the server and are refreshed once the player's own data is in sync.
  const playedTodayRef = useRef(false);
  playedTodayRef.current = !!(progress.rewardDate || progress.lastPlayedDate) && isSameDay((progress.rewardDate || progress.lastPlayedDate) as string);
  const streakRef = useRef(0);
  streakRef.current = progress.streak;

  useEffect(() => {
    if (!user || !isInitialized || !remoteSynced || !showPartnerUi) return;
    let cancelled = false;

    const load = async () => {
      const state = await fetchJoint(todayStr);
      if (cancelled || !state) return;
      // She claimed today's star earlier (offline / another device) but the
      // server hasn't heard — tell it now so "our streak" stays right.
      if (user.role !== 'admin' && playedTodayRef.current && !state.today.partner) {
        const synced = await checkinJoint(todayStr, streakRef.current);
        if (!cancelled && synced) setJoint(synced);
        return;
      }
      setJoint(state);
    };

    load();
    const id = setInterval(load, 90000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [user?.email, user?.role, isInitialized, remoteSynced, showPartnerUi, todayStr]);

  useEffect(() => {
    if (!user || !isInitialized || !remoteSynced || !showPartnerUi) return;
    let cancelled = false;
    fetchMeeting().then((m) => {
      if (!cancelled) setMeeting(m);
    });
    return () => {
      cancelled = true;
    };
  }, [user?.email, isInitialized, remoteSynced, showPartnerUi]);

  // A star tied to today's calendar date (birthday, 8 March…): shown once per day.
  useEffect(() => {
    if (!user || !isInitialized || !remoteSynced || !showPartnerUi) return;
    const seenKey = `nashe_special_seen_${user.email}_${todayStr}`;
    try {
      if (localStorage.getItem(seenKey)) return;
    } catch {
      // storage unavailable — worst case it shows again on reload
    }
    let cancelled = false;
    fetchSpecialDaysToday(todayStr).then((items) => {
      if (!cancelled && items.length > 0) setSpecialItems(items);
    });
    return () => {
      cancelled = true;
    };
  }, [user?.email, isInitialized, remoteSynced, showPartnerUi, todayStr]);

  const handleCloseSpecialDay = () => {
    if (user) {
      try {
        localStorage.setItem(`nashe_special_seen_${user.email}_${todayStr}`, '1');
      } catch {
        // ignore
      }
    }
    setSpecialItems([]);
  };

  // Result toast fades out on its own.
  useEffect(() => {
    if (resultLines.length === 0) return;
    const timer = setTimeout(() => setResultLines([]), 7000);
    return () => clearTimeout(timer);
  }, [resultLines]);

  // The just-earned star flares up on the map for a moment after the flight lands.
  useEffect(() => {
    if (highlightDay === null) return;
    const timer = setTimeout(() => setHighlightDay(null), 3500);
    return () => clearTimeout(timer);
  }, [highlightDay]);

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
    const cached = getCurrentUser();
    setUser(cached);
    if (cached) refreshCurrentUser().then(setUser);
  }, []);

  useEffect(() => {
    if (!user) {
      setIsInitialized(false);
      setRemoteSynced(false);
      return;
    }

    let cancelled = false;
    setRemoteSynced(false);

    const loaded = loadProgress(user.email);
    setProgress(loaded);
    setIsInitialized(true);

    loadProgressFromMongo()
      .then((remote) => {
        if (cancelled) return;
        // Compare with what is on screen NOW — she may already have played
        // while a sleeping server was waking up — not with the page-load
        // snapshot. The fresher copy wins; calendar days, earned themes and
        // shown popups from both copies are merged (see reconcileProgress).
        setProgress((current) => reconcileProgress(current, remote).progress);
      })
      .catch(() => {
        // Offline / server asleep: keep playing with the local copy.
      })
      .finally(() => {
        if (!cancelled) setRemoteSynced(true);
      });

    return () => {
      cancelled = true;
    };
  }, [user?.email]);

  // Save progress whenever progress state updates. Local storage always; the
  // server only once its own copy has been fetched (remoteSynced).
  useEffect(() => {
    if (isInitialized && user) {
      saveProgress(progress, user.email, { syncRemote: remoteSynced });
    }
  }, [progress, isInitialized, user?.email, remoteSynced]);

  const updateProgress = useCallback(() => {
    if (!user) return;
    if (progress.lastPlayedDate === todayStr || progressUpdateGuardRef.current === todayStr) return;

    progressUpdateGuardRef.current = todayStr;

    // Advances the day counter + streak (a shield bridges a missed day when
    // she has one), records today for the calendar and pays the daily stardust.
    const { progress: updatedProgress, streakBroken, shieldsUsed, shieldEarned } = applyDailyClaim(progress, todayStr);

    // A missed day is never framed as a punishment — the constellation itself
    // keeps growing, only the in-a-row counter restarts.
    setStreakBrokenNotice(streakBroken);
    if (shieldsUsed > 0) {
      setShieldNotice(
        shieldsUsed > 1
          ? `🛡️ Қалқан ${shieldsUsed} күнді құтқарды — стрик сақталды!`
          : '🛡️ Қалқан бір күнді құтқарды — стрик сақталды!'
      );
    } else if (shieldEarned) {
      setShieldNotice('🛡️ Жаңа жұлдыз қалқанын алдың! Ол бір өткізілген күнді жабады.');
    } else {
      setShieldNotice(null);
    }

    claimedDayRef.current = updatedProgress.daysPlayed;
    setProgress(updatedProgress);

    // Log exactly when this day's star was earned — fire-and-forget, so a
    // slow/offline connection never blocks the actual reward from showing.
    logDayCompletion(user.email, updatedProgress.daysPlayed).catch(() => {
      // Non-fatal — only the admin's history view is affected.
    });

    // "Our streak": tell the server she showed up today (it also pings him).
    checkinJoint(todayStr, updatedProgress.streak).then((state) => {
      if (state) setJoint(state);
    });
  }, [progress, todayStr, user]);

  // Раунд қазір де ойын көйлегінің өзінде /api/rounds жазбашысына жазылады
  // (nтеже терезесі ортақ). App тек тозаң / жұлдыз төлейді.
  const handleGameWin = useCallback(
    (isBonus: boolean) => {
      const alreadyClaimed = isBonus || hasRewardToday || progressUpdateGuardRef.current === todayStr;
      const lines: string[] = [];

      if (alreadyClaimed) {
        // Bonus replay: no new star, but a little stardust (capped per day).
        if (isBonus) {
          const award = awardBonusStardust(progress, difficulty, todayStr);
          setProgress(award.progress);
          lines.push(
            award.earned > 0
              ? `+${award.earned} ✨ жұлдыз тозаңы`
              : 'Бүгінгі бонус тозаңы таусылды ✨ — ертең тағы бар!'
          );
        }
        showCurrentMessage(Math.max(1, progress.daysPlayed));
      } else {
        lines.push(`+${DAILY_STAR_STARDUST} ✨ жұлдыз тозаңы`);
        updateProgress();
        showCurrentMessage(progress.daysPlayed + 1);
      }

      if (lines.length > 0) setResultLines(lines);
    },
    [hasRewardToday, progress, difficulty, todayStr, showCurrentMessage, updateProgress]
  );

  // Daily-task reward (once per day, GameHub guards it) → stardust counter.
  const handleRewardClaimed = useCallback((stardust: number) => {
    setProgress((prev) => ({
      ...prev,
      stardust: (prev.stardust || 0) + Math.max(0, Math.round(stardust)),
    }));
  }, []);

  // Closing the reward card of a star claimed just now sends it flying to its place on the map.
  const handleCloseMessage = useCallback(() => {
    if (activeMessage && isTodayWinModal && claimedDayRef.current === activeMessage.dayNumber) {
      claimedDayRef.current = null;
      setFlightDay(activeMessage.dayNumber);
    }
    setActiveMessage(null);
  }, [activeMessage, isTodayWinModal]);

  // --- Stardust shop ---------------------------------------------------
  const nextStarDay = progress.daysPlayed + 1;
  const nextStarMessage = getMessageForDay(nextStarDay);
  const peekRevealed = (progress.revealedDays || []).includes(nextStarDay);

  const handleBuyShield = () => {
    const result = buyShield(progress);
    if (result.ok && result.progress) setProgress(result.progress);
    return { ok: result.ok, reason: result.reason };
  };

  const handleBuyPeek = () => {
    const result = buyPeek(progress, nextStarDay);
    if (result.ok && result.progress) setProgress(result.progress);
    return { ok: result.ok, reason: result.reason };
  };

  // The wish is sent first and only paid for once the server has accepted it.
  const handleSendWish = async (text: string): Promise<{ ok: boolean; error?: string }> => {
    const check = spendForWish(progress);
    if (!check.ok) return { ok: false, error: check.reason };
    const response = await sendWish(text, WISH_PRICE);
    if (!response.ok) return { ok: false, error: response.error || 'Жіберу мүмкін болмады.' };
    setProgress((prev) => {
      const paid = spendForWish(prev);
      return paid.ok && paid.progress ? paid.progress : prev;
    });
    return { ok: true };
  };

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
  const handleUpdateProfile = async (updates: { name: string; bio: string }) => {
    if (!user) return;
    try {
      const updatedUser = await updateUserProfile(user.email, updates);
      setUser(updatedUser);
    } catch (err) {
      console.error('Failed to update profile:', err);
    }
  };

  // Reset Progress Handler
  const handleResetProgress = () => {
    // Everything restarts except what she has earned for good: the themes
    // (and the popups already shown for them) stay hers.
    const resetState: UserProgress = {
      ...getDefaultProgress(),
      theme,
      earnedThemes: progress.earnedThemes || [],
      seenMilestones: progress.seenMilestones || [],
      adminEditedAt: progress.adminEditedAt,
    };
    setProgress(resetState);
    // `reset` is the one write the server accepts with a LOWER star count.
    if (user) saveProgress(resetState, user.email, { reset: true, syncRemote: true });
    setActiveMessage(null);
    setStreakBrokenNotice(false);
    setShieldNotice(null);
  };

  const handleLogout = () => {
    logoutUser();
    setUser(null);
    setAuthNotice(undefined);
    setProgress(getDefaultProgress());
    setIsInitialized(false);
    setRemoteSynced(false);
    setJoint(null);
    setMeeting(null);
    setSpecialItems([]);
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
    return (
      <AuthScreen
        notice={authNotice}
        onAuthSuccess={(signedIn) => {
          setAuthNotice(undefined);
          setUser(signedIn);
        }}
      />
    );
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
      {showPartnerUi && <WelcomeTour />}

      {/* Main Content Area */}
      {/* pb-28 leaves room for the fixed bottom navigation bar */}
      <main className="relative z-10 w-full flex-1 flex flex-col items-center justify-start pb-28">
        {/* Header with counters and title */}
        <Header
          progress={progress}
          streak={effectiveStreak}
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
          onOpenCalendar={() => setIsCalendarOpen(true)}
          onOpenShop={() => setIsShopOpen(true)}
          onOpenLeaderboard={() => setIsLeaderboardOpen(true)}
          onOpenIdeas={() => setIsIdeasOpen(true)}
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

        {/* A shield just saved the streak / a new shield was earned */}
        {shieldNotice && (
          <div className="w-full max-w-xl mx-auto px-4 -mt-1 mb-1">
            <div className="flex items-start gap-2.5 p-3.5 rounded-2xl bg-[var(--accent)]/8 border border-[var(--accent)]/25 text-left">
              <p className="flex-1 text-xs text-[var(--text)] leading-relaxed">{shieldNotice}</p>
              <button
                onClick={() => setShieldNotice(null)}
                className="text-[var(--accent)] flex-shrink-0"
                aria-label="Жасыру"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* Home screen: countdown, today's star, weekly streak, quick actions,
            and the mini-galaxy teaser. */}
        {activeTab === 'all' && (
          <>
            <MeetingCountdown meeting={meeting} today={todayStr} />

            <TodaysStarCard
              dayNumber={nextStarDay}
              gameLabel={GAME_LABELS[dailyGameId]}
              playedToday={playedToday}
              difficulty={difficulty}
              onSetDifficulty={handleSetDifficulty}
              onPlay={() => setActiveTab('game')}
              onChangeGame={() => {
                setGamePickerSignal((n) => n + 1);
                setActiveTab('game');
              }}
            />

            <StreakProgress
              streak={effectiveStreak}
              bestStreak={progress.bestStreak || 0}
              shields={progress.shields || 0}
              stardust={progress.stardust || 0}
              shielded={streakShielded}
              earnedThemes={unlockedThemes}
              joint={joint}
              onOpenCalendar={() => setIsCalendarOpen(true)}
              onOpenShop={() => setIsShopOpen(true)}
              playedDates={progress.playedDates || []}
            />

            {hasRewardToday && (
              <TomorrowTeaser
                dayNumber={nextStarDay}
                title={nextStarMessage.title}
                revealed={peekRevealed}
                onOpenShop={() => setIsShopOpen(true)}
              />
            )}

            <QuickActions
              onOpenCalendar={() => setIsCalendarOpen(true)}
              onOpenShop={() => setIsShopOpen(true)}
              onOpenLeaderboard={() => setIsLeaderboardOpen(true)}
              onOpenCapsules={() => setIsCapsulesOpen(true)}
              onOpenDreams={() => setIsDreamsOpen(true)}
              onOpenIdeas={() => setIsIdeasOpen(true)}
            />

            <GalaxyTeaser daysPlayed={progress.daysPlayed} onOpenAll={() => setActiveTab('map')} />
          </>
        )}

        {/* Views */}
        {activeTab === 'game' && (
          <GameHub
            theme={theme}
            difficulty={difficulty}
            onSetDifficulty={handleSetDifficulty}
            playedToday={playedToday}
            onGameWin={handleGameWin}
            onRewardClaimed={handleRewardClaimed}
            onHome={() => setActiveTab('all')}
            daysPlayed={progress.daysPlayed}
            pickerSignal={gamePickerSignal}
          />
        )}

        {activeTab === 'map' && (
          <ConstellationMap
            daysPlayed={progress.daysPlayed}
            unlockedDays={progress.unlockedDays}
            linkedPhotos={linkedPhotos}
            highlightDay={highlightDay}
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

        {activeTab === 'story' && <OurStorySection onExit={() => setActiveTab('all')} />}

        {/* Romantic Footer Note */}
        <footer className="mt-4 mb-2 text-center text-xs text-[var(--text-faint)] font-light flex items-center justify-center gap-1.5 px-4">
          <span>Біздің шоқжұлдыз күн сайын өсіп келеді</span>
          <Heart className="w-3.5 h-3.5 text-[var(--accent-2)] fill-[var(--accent-2)]" />
        </footer>
      </main>

      {/* Always-visible tab bar (the hamburger menu in the Header keeps the full list) */}
      <BottomNav activeTab={activeTab} onSetActiveTab={setActiveTab} hasNewInvite={hasNewInvite} />

      {/* Unlocked Message Popup Card */}
      <MessageCard
        message={activeMessage}
        onClose={handleCloseMessage}
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
          className="fixed bottom-20 right-4 z-40 flex items-center gap-1.5 px-4 py-2.5 rounded-full bg-[var(--accent)] text-[var(--on-accent)] text-xs font-bold shadow-[0_8px_24px_var(--overlay)] active:scale-95 transition"
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

      {/* Streak calendar */}
      {isCalendarOpen && (
        <StreakCalendarModal
          today={todayStr}
          playedDates={progress.playedDates || []}
          shieldDates={progress.shieldDates || []}
          daysPlayed={progress.daysPlayed}
          streak={effectiveStreak}
          bestStreak={progress.bestStreak || 0}
          onClose={() => setIsCalendarOpen(false)}
        />
      )}

      {/* Stardust shop: shield, tomorrow's peek, wishes */}
      {isShopOpen && (
        <StardustShopModal
          stardust={progress.stardust || 0}
          shields={progress.shields || 0}
          nextDay={nextStarDay}
          nextTitle={nextStarMessage.title}
          peekRevealed={peekRevealed}
          canPeek={hasRewardToday}
          onBuyShield={handleBuyShield}
          onBuyPeek={handleBuyPeek}
          onSendWish={handleSendWish}
          onClose={() => setIsShopOpen(false)}
        />
      )}

      {/* Fastest-win records */}
      {isLeaderboardOpen && <LeaderboardModal onClose={() => setIsLeaderboardOpen(false)} />}
      {isIdeasOpen && <LoveIdeasModal onClose={() => setIsIdeasOpen(false)} />}

      {/* A surprise tied to today's calendar date */}
      {specialItems.length > 0 && <SpecialDayModal items={specialItems} onClose={handleCloseSpecialDay} />}

      {/* New star flies to its place on the map */}
      {flightDay !== null && (
        <RewardFlight
          day={flightDay}
          onDone={() => {
            setHighlightDay(flightDay);
            setFlightDay(null);
          }}
        />
      )}

      <ResultToast lines={resultLines} onClose={() => setResultLines([])} />
    </div>
  );
}
