import React, { useState } from 'react';
import {
  Star, Volume2, VolumeX, Settings, Heart, LogOut, UserRound, Sun,
  Mail, ListChecks, Menu, X, Sparkles, Image as ImageIcon, CalendarHeart, LayoutDashboard, BookHeart,
  CalendarDays, Trophy, ShoppingBag, Gamepad2,
} from 'lucide-react';
import { UserProgress, AppTab } from '../types';
import { AppUser } from '../utils/authUtils';
import { THEME_META } from '../data/themes';

interface HeaderProps {
  progress: UserProgress;
  // The streak to show right now (a lapsed streak the shields can't save reads 0).
  streak: number;
  user: AppUser;
  activeTab: AppTab;
  onSetActiveTab: (tab: AppTab) => void;
  hasNewInvite: boolean;
  onToggleSound: () => void;
  onToggleTheme: () => void;
  onOpenSettings: () => void;
  onOpenRules: () => void;
  onOpenProfile: () => void;
  onOpenAdmin: () => void;
  onOpenCapsules: () => void;
  onOpenDreams: () => void;
  onOpenCalendar: () => void;
  onOpenShop: () => void;
  onOpenLeaderboard: () => void;
  onOpenIdeas: () => void;
  onLogout: () => void;
}

const KAZ_MONTHS = [
  'қаңтар', 'ақпан', 'наурыз', 'сәуір', 'мамыр', 'маусым',
  'шілде', 'тамыз', 'қыркүйек', 'қазан', 'қараша', 'желтоқсан',
];

// getDay(): 0 = Sunday … 6 = Saturday
const KAZ_SHORT_WEEKDAYS = ['Жк', 'Дс', 'Сс', 'Ср', 'Бс', 'Жм', 'Сб'];

function greeting(hour: number): string {
  if (hour < 5) return 'Қайырлы түн';
  if (hour < 12) return 'Қайырлы таң';
  if (hour < 18) return 'Қайырлы күн';
  return 'Қайырлы кеш';
}

export const Header: React.FC<HeaderProps> = ({
  progress,
  streak,
  user,
  activeTab,
  onSetActiveTab,
  hasNewInvite,
  onToggleSound,
  onToggleTheme,
  onOpenSettings,
  onOpenRules,
  onOpenProfile,
  onOpenAdmin,
  onOpenCapsules,
  onOpenDreams,
  onOpenCalendar,
  onOpenShop,
  onOpenLeaderboard,
  onOpenIdeas,
  onLogout,
}) => {
  const themeMeta = THEME_META[progress.theme || 'day'] || THEME_META.day;
  const ThemeIcon = themeMeta.icon || Sun;
  const [menuOpen, setMenuOpen] = useState(false);

  const now = new Date();
  const dateLine = `${now.getDate()} ${KAZ_MONTHS[now.getMonth()]} · ${KAZ_SHORT_WEEKDAYS[now.getDay()]} күні`;

  const navItems: { tab: AppTab; label: string; icon: React.ElementType }[] = [
    { tab: 'all', label: 'Басты', icon: Sparkles },
    { tab: 'game', label: 'Ойын', icon: Gamepad2 },
    { tab: 'map', label: 'Шоқжұлдыз', icon: Star },
    { tab: 'gallery', label: 'Галерея', icon: ImageIcon },
    { tab: 'date', label: 'Свидание', icon: CalendarHeart },
    { tab: 'story', label: 'Біздің тарихымыз', icon: BookHeart },
  ];

  const quickItems: { label: string; icon: React.ElementType; action: () => void }[] = [
    { label: 'Күнтізбе', icon: CalendarDays, action: onOpenCalendar },
    { label: 'Жұлдыз дүкені', icon: ShoppingBag, action: onOpenShop },
    { label: 'Жарыс', icon: Trophy, action: onOpenLeaderboard },
    { label: 'Хаттар', icon: Mail, action: onOpenCapsules },
    { label: 'Армандар', icon: ListChecks, action: onOpenDreams },
   // { label: 'Жылы бұрыш', icon: Heart, action: onOpenIdeas },
  ];

  return (
    <header className="relative z-30 w-full max-w-xl mx-auto pt-6 px-4 pb-2">
      {/* Title row — serif italic wordmark, theme + hamburger on the right */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col text-left min-w-0">
          <p className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.3em] text-[var(--accent-2)] font-semibold">
            <Heart className="w-3 h-3 fill-[var(--accent-2)] text-[var(--accent-2)]" />
            <Sparkles className="w-3 h-3 text-[var(--accent-2)]" />
          </p>
          <h1 className="font-serif italic font-light text-3xl sm:text-[34px] leading-tight text-[var(--accent)] mt-0.5">
            Біздің шоқжұлдыз
          </h1>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Theme toggle — cycles through every unlocked theme */}
          <button
            onClick={onToggleTheme}
            className="grid h-10 w-10 place-items-center rounded-full border border-[var(--border)] bg-[var(--bg-card)] text-[var(--text-secondary)] backdrop-blur-md transition hover:text-[var(--accent)] hover:border-[var(--accent)]/40 active:scale-95"
            title={`Тема: ${themeMeta.label} (ауыстыру үшін бас)`}
            aria-label="Тема ауыстыру"
          >
            <ThemeIcon className="h-4.5 w-4.5" />
          </button>

          {/* Hamburger — opens the full menu panel (sections + tools) */}
          <div className="relative">
            <button
              onClick={() => setMenuOpen((v) => !v)}
              className="relative grid h-10 w-10 place-items-center rounded-full border border-[var(--border)] bg-[var(--bg-card)] text-[var(--text-secondary)] backdrop-blur-md transition hover:text-[var(--accent)] hover:border-[var(--accent)]/40 active:scale-95"
              aria-label="Мәзір"
            >
              {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              {hasNewInvite && !menuOpen && (
                <span className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-rose-500 border-2 border-[var(--bg-card)]" />
              )}
            </button>

            {menuOpen && (
              <>
                <div className="fixed inset-0 z-30" onClick={() => setMenuOpen(false)} />
                <div className="absolute right-0 top-[calc(100%+8px)] z-40 w-60 max-h-[75vh] overflow-y-auto rounded-3xl border border-[var(--border)] bg-[var(--bg-elevated)]/95 p-1.5 shadow-[0_18px_44px_var(--overlay)] backdrop-blur-2xl">
                  {navItems.map(({ tab, label, icon: Icon }) => (
                    <button
                      key={tab}
                      onClick={() => {
                        onSetActiveTab(tab);
                        setMenuOpen(false);
                      }}
                      className={`relative flex w-full items-center gap-2.5 rounded-2xl px-3.5 py-2.5 text-sm text-left transition ${
                        activeTab === tab
                          ? 'bg-[var(--accent)]/12 font-bold text-[var(--accent)]'
                          : 'text-[var(--text-secondary)] hover:bg-[var(--bg-soft)]'
                      }`}
                    >
                      <Icon className="h-4 w-4 flex-shrink-0" />
                      <span className="flex-1">{label}</span>
                      {tab === 'date' && hasNewInvite && (
                        <span className="h-2 w-2 flex-shrink-0 rounded-full bg-rose-500" />
                      )}
                    </button>
                  ))}

                  <div className="my-1 border-t border-[var(--border)]" />

                  {quickItems.map(({ label, icon: Icon, action }) => (
                    <button
                      key={label}
                      onClick={() => {
                        action();
                        setMenuOpen(false);
                      }}
                      className="flex w-full items-center gap-2.5 rounded-2xl px-3.5 py-2.5 text-sm text-left text-[var(--text-secondary)] transition hover:bg-[var(--bg-soft)]"
                    >
                      <Icon className="h-4 w-4 flex-shrink-0 text-[var(--accent)]" />
                      <span className="flex-1">{label}</span>
                    </button>
                  ))}

                  <div className="my-1 border-t border-[var(--border)]" />

                  {/* Sound toggle lives in the menu now — one tap less on the top bar */}
                  <button
                    onClick={() => {
                      onToggleSound();
                      setMenuOpen(false);
                    }}
                    className="flex w-full items-center gap-2.5 rounded-2xl px-3.5 py-2.5 text-sm text-left text-[var(--text-secondary)] transition hover:bg-[var(--bg-soft)]"
                  >
                    {progress.soundEnabled ? <Volume2 className="h-4 w-4 text-[var(--accent)]" /> : <VolumeX className="h-4 w-4 text-[var(--text-faint)]" />}
                    <span className="flex-1">Дыбыс</span>
                    <span className="text-[10px] text-[var(--text-faint)]">
                      {progress.soundEnabled ? 'қосулы' : 'өшік'}
                    </span>
                  </button>

                  <button
                    onClick={() => {
                      onOpenSettings();
                      setMenuOpen(false);
                    }}
                    className="flex w-full items-center gap-2.5 rounded-2xl px-3.5 py-2.5 text-sm text-left text-[var(--text-secondary)] transition hover:bg-[var(--bg-soft)]"
                  >
                    <Settings className="h-4 w-4 flex-shrink-0 text-[var(--accent)]" />
                    <span className="flex-1">Баптаулар</span>
                  </button>

                  {user.role === 'admin' && (
                    <button
                      onClick={() => {
                        onOpenAdmin();
                        setMenuOpen(false);
                      }}
                      className="flex w-full items-center gap-2.5 rounded-2xl px-3.5 py-2.5 text-sm text-left text-[var(--text-secondary)] transition hover:bg-[var(--bg-soft)]"
                    >
                      <LayoutDashboard className="h-4 w-4 flex-shrink-0 text-[var(--accent)]" />
                      <span className="flex-1">Дашбордқа оралу</span>
                    </button>
                  )}

                  <button
                    onClick={() => {
                      onLogout();
                      setMenuOpen(false);
                    }}
                    className="flex w-full items-center gap-2.5 rounded-2xl px-3.5 py-2.5 text-sm text-left text-rose-500 transition hover:bg-rose-500/10"
                  >
                    <LogOut className="h-4 w-4 flex-shrink-0" />
                    <span className="flex-1">Шығу</span>
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Greeting + date + profile chip */}
      <div className="mt-3 flex items-center justify-between gap-3">
        <div className="min-w-0 text-left">
          <p className="text-[11px] font-medium text-[var(--text-muted)]">
            {greeting(now.getHours())}, <span className="text-[var(--text)]">{user.name}</span> ⭐
          </p>
          <p className="text-[10px] text-[var(--text-faint)]">{dateLine}</p>
        </div>

        <button
          onClick={onOpenProfile}
          className="flex flex-shrink-0 items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--bg-card)] px-3.5 py-2 text-[11px] font-semibold text-[var(--text-secondary)] backdrop-blur-md transition hover:border-[var(--accent)]/40 hover:text-[var(--accent)] active:scale-95"
          title="Профильді ашу"
        >
          <UserRound className="h-3.5 w-3.5 text-[var(--accent)]" />
          Профиль
        </button>
      </div>

    </header>
  );
};
