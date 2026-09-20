import React, { useState } from 'react';
import {
  Star, Volume2, VolumeX, Settings, Heart, LogOut, UserRound, Sun, Moon, Sunrise, Leaf, Gem,
  Mail, ListChecks, Menu, X, Sparkles, Image as ImageIcon, CalendarHeart, LayoutDashboard,
} from 'lucide-react';
import { UserProgress, AppTab } from '../types';
import { AppUser } from '../utils/authUtils';
import { PARTNER_NAME } from '../data/constants';

interface HeaderProps {
  progress: UserProgress;
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
  onLogout: () => void;
}

const NAV_ITEMS: { tab: AppTab; label: string; icon: React.ElementType }[] = [
  { tab: 'all', label: 'Барлығы', icon: Sparkles },
  { tab: 'game', label: 'Ойын', icon: Moon },
  { tab: 'map', label: 'Шоқжұлдыз', icon: Star },
  { tab: 'gallery', label: 'Галерея', icon: ImageIcon },
  { tab: 'date', label: 'Свидание', icon: CalendarHeart },
];

const THEME_ICON: Record<string, React.ElementType> = {
  day: Sun,
  night: Moon,
  dawn: Sunrise,
  mint: Leaf,
  velvet: Gem,
};

const THEME_LABEL: Record<string, string> = {
  day: 'Жылы күн',
  night: 'Жұлдызды түн',
  dawn: 'Таң',
  mint: 'Жасыл бақ',
  velvet: 'Түн бархаты',
};

export const Header: React.FC<HeaderProps> = ({
  progress,
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
  onLogout,
}) => {
  const currentTheme = progress.theme || 'day';
  const ThemeIcon = THEME_ICON[currentTheme] || Sun;
  const themeLabel = THEME_LABEL[currentTheme] || 'Жылы күн';
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="relative z-30 w-full max-w-xl mx-auto pt-5 px-4 pb-2 flex flex-col gap-3">
      {/* Title & Eyebrow Subtitle + hamburger nav */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col text-left">
          <h1 className="text-3xl sm:text-4xl italic font-light tracking-wide text-[var(--accent)] font-serif">
            Біздің шоқжұлдыз
          </h1>
          <p className="text-[10px] sm:text-xs uppercase tracking-[0.25em] text-[var(--accent-2)] font-semibold mt-0.5 flex items-center gap-1.5">
            <Heart className="w-3 h-3 text-[var(--accent-2)] fill-[var(--accent-2)] inline" />
            <span>{PARTNER_NAME}</span>
          </p>
        </div>

        {/* Hamburger nav — replaces the old fixed bottom tab bar. Opens a
            dropdown right under the button with all the section links; a
            red dot on "Свидание" means there's a new invite to see. */}
        <div className="relative flex-shrink-0">
          <button
            onClick={() => setMenuOpen((v) => !v)}
            className="relative p-2.5 rounded-full bg-[var(--bg-card)] border border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--accent)] transition hover:bg-[var(--bg-soft)] active:scale-95 shadow-sm"
            aria-label="Мәзір"
          >
            {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            {hasNewInvite && !menuOpen && (
              <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-rose-500 border-2 border-[var(--bg-card)]" />
            )}
          </button>

          {menuOpen && (
            <>
              {/* Backdrop to close on outside tap */}
              <div className="fixed inset-0 z-30" onClick={() => setMenuOpen(false)} />
              <div className="absolute right-0 top-[calc(100%+8px)] z-40 w-52 rounded-2xl bg-[var(--bg-elevated)]/98 border border-[var(--border)] shadow-[0_12px_30px_var(--overlay)] backdrop-blur-2xl overflow-hidden">
                {NAV_ITEMS.map(({ tab, label, icon: Icon }) => (
                  <button
                    key={tab}
                    onClick={() => {
                      onSetActiveTab(tab);
                      setMenuOpen(false);
                    }}
                    className={`w-full flex items-center gap-2.5 px-4 py-3 text-sm text-left transition relative ${
                      activeTab === tab
                        ? 'bg-[var(--accent)]/10 text-[var(--accent)] font-bold'
                        : 'text-[var(--text-secondary)] hover:bg-[var(--bg-soft)]'
                    }`}
                  >
                    <Icon className="w-4 h-4 flex-shrink-0" />
                    <span className="flex-1">{label}</span>
                    {tab === 'date' && hasNewInvite && (
                      <span className="w-2 h-2 rounded-full bg-rose-500 flex-shrink-0" />
                    )}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Badges row — wraps onto a second line on narrow phones instead of
          scrolling off the edge of the screen, so every badge always stays
          fully visible no matter how many there are. */}
      <div className="flex flex-wrap items-center gap-2">
        <div
          className="flex-shrink-0 flex items-center gap-2 bg-[var(--bg-card)] border border-[var(--border)] pl-1.5 pr-3 py-1.5 rounded-full shadow-sm cursor-pointer hover:scale-105 transition"
          onClick={onOpenProfile}
          title="Профильді ашу"
        >
          <div className="rounded-full bg-[var(--accent)]/15 p-1.5">
            <UserRound className="w-3.5 h-3.5 text-[var(--accent)]" />
          </div>
          <div className="flex flex-col leading-none text-left">
            <span className="text-[9px] uppercase tracking-[0.18em] text-[var(--text-faint)]">Профиль</span>
            <span className="text-[10px] text-[var(--text)] font-medium truncate max-w-[80px]">{user.name}</span>
          </div>
        </div>

        {/* Streak Counter Badge */}
        <div
          className="flex-shrink-0 flex items-center gap-2 bg-[var(--bg-card)] border border-[var(--border)] px-3 py-1.5 rounded-full shadow-sm cursor-pointer hover:scale-105 transition"
          onClick={onOpenRules}
          title="Күнделікті стрик"
        >
          <span className="text-[var(--accent)] text-base">🔥</span>
          <div className="flex flex-col leading-none text-left">
            <span className="text-sm font-bold text-[var(--text)]">{progress.streak}</span>
            <span className="text-[9px] uppercase text-[var(--accent-2)] font-bold tracking-wider">Стрик</span>
          </div>
        </div>

        {/* Stars Counter Badge */}
        <div
          className="flex-shrink-0 flex items-center gap-1.5 bg-[var(--bg-card)] border border-[var(--border)] px-2.5 py-1.5 rounded-full shadow-sm cursor-pointer hover:scale-105 transition"
          onClick={onOpenRules}
          title="Жиналған жұлдыздар"
        >
          <Star className="w-4 h-4 text-[var(--accent)] fill-[var(--accent)]/30" />
          <div className="flex flex-col leading-none text-left">
            <span className="text-sm font-bold text-[var(--text)]">{progress.daysPlayed}</span>
            <span className="text-[9px] uppercase text-[var(--accent-2)] font-bold tracking-wider">Жұлдыз</span>
          </div>
        </div>

        {/* Time Capsules Badge */}
        <div
          className="flex-shrink-0 flex items-center gap-1.5 bg-[var(--bg-card)] border border-[var(--border)] pl-1.5 pr-3 py-1.5 rounded-full shadow-sm cursor-pointer hover:scale-105 transition"
          onClick={onOpenCapsules}
          title="Уақыт капсулалары"
        >
          <div className="rounded-full bg-[var(--accent)]/15 p-1.5">
            <Mail className="w-3.5 h-3.5 text-[var(--accent)]" />
          </div>
          <span className="text-[11px] text-[var(--text)] font-medium whitespace-nowrap">Хаттар</span>
        </div>

        {/* Shared Dreams Badge */}
        <div
          className="flex-shrink-0 flex items-center gap-1.5 bg-[var(--bg-card)] border border-[var(--border)] pl-1.5 pr-3 py-1.5 rounded-full shadow-sm cursor-pointer hover:scale-105 transition"
          onClick={onOpenDreams}
          title="Бірлескен армандар"
        >
          <div className="rounded-full bg-[var(--accent)]/15 p-1.5">
            <ListChecks className="w-3.5 h-3.5 text-[var(--accent)]" />
          </div>
          <span className="text-[11px] text-[var(--text)] font-medium whitespace-nowrap">Армандар</span>
        </div>
      </div>

      {/* Actions row — theme / sound / settings / logout. Kept on its own
          row of icon-only buttons so it always fits on a phone screen,
          instead of being squeezed onto the end of the badges row. */}
      <div className="flex items-center justify-end gap-2">
        {/* Theme toggle — cycles freely through all 5 themes (день → ночь →
            рассвет → мятный сад → бархат → снова день) */}
        <button
          onClick={onToggleTheme}
          className="p-2 rounded-full bg-[var(--bg-card)] border border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--accent)] transition hover:bg-[var(--bg-soft)] active:scale-95 shadow-sm"
          title={`Тема: ${themeLabel} (ауыстыру үшін бас)`}
          aria-label="Тема ауыстыру"
        >
          <ThemeIcon className="w-4 h-4" />
        </button>

        <button
          onClick={onToggleSound}
          className="p-2 rounded-full bg-[var(--bg-card)] border border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--accent)] transition hover:bg-[var(--bg-soft)] active:scale-95 shadow-sm"
          title={progress.soundEnabled ? 'Дыбысты өшіру' : 'Дыбысты қосу'}
          aria-label="Дыбысты ауыстыру"
        >
          {progress.soundEnabled ? (
            <Volume2 className="w-4 h-4" />
          ) : (
            <VolumeX className="w-4 h-4 text-[var(--text-faint)]" />
          )}
        </button>

        {user.role === 'admin' && (
          <button
            onClick={onOpenAdmin}
            className="p-2 rounded-full bg-[var(--bg-card)] border border-[var(--accent)]/40 text-[var(--accent)] hover:bg-[var(--accent)]/10 transition active:scale-95 shadow-sm"
            title="Дашбордқа оралу"
            aria-label="Дашбордқа оралу"
          >
            <LayoutDashboard className="w-4 h-4" />
          </button>
        )}

        <button
          onClick={onOpenSettings}
          className="p-2 rounded-full bg-[var(--bg-card)] border border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--accent-2)] transition hover:bg-[var(--bg-soft)] active:scale-95 shadow-sm"
          title="Баптаулар"
          aria-label="Баптаулар"
        >
          <Settings className="w-4 h-4" />
        </button>

        <button
          onClick={onLogout}
          className="p-2 rounded-full bg-[var(--bg-card)] border border-[var(--border)] text-[var(--text-secondary)] hover:text-rose-500 transition hover:bg-[var(--bg-soft)] active:scale-95 shadow-sm"
          title="Аккаунттан шығу"
          aria-label="Аккаунттан шығу"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
};
