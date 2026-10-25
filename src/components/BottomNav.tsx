import React from 'react';
import { House, Gamepad2, Star, Image as ImageIcon, CalendarHeart, BookHeart } from 'lucide-react';
import { AppTab } from '../types';

interface BottomNavProps {
  activeTab: AppTab;
  onSetActiveTab: (tab: AppTab) => void;
  hasNewInvite: boolean;
}

const ITEMS: { tab: AppTab; label: string; icon: React.ElementType }[] = [
  { tab: 'all', label: 'Басты', icon: House },
  { tab: 'game', label: 'Ойын', icon: Gamepad2 },
  { tab: 'map', label: 'Галактика', icon: Star },
  { tab: 'gallery', label: 'Галерея', icon: ImageIcon },
  { tab: 'date', label: 'Свидание', icon: CalendarHeart },
  { tab: 'story', label: 'Тарих', icon: BookHeart },
];

// Always-visible tab bar, so the sections that used to hide behind the
// hamburger menu (gallery, date, story…) are one tap away. The hamburger
// stays for the full list; a red dot on "Свидание" means a new invite.
export const BottomNav: React.FC<BottomNavProps> = ({ activeTab, onSetActiveTab, hasNewInvite }) => (
  <nav
    className="fixed bottom-0 inset-x-0 z-40 border-t border-[var(--border)] bg-[var(--bg-nav)] backdrop-blur-xl"
    style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
    aria-label="Негізгі навигация"
  >
    <div className="mx-auto flex max-w-xl items-stretch justify-between px-1">
      {ITEMS.map(({ tab, label, icon: Icon }) => {
        const active = activeTab === tab;
        return (
          <button
            key={tab}
            onClick={() => onSetActiveTab(tab)}
            aria-current={active ? 'page' : undefined}
            className={`relative flex flex-1 flex-col items-center gap-0.5 py-2 text-[10px] font-semibold transition active:scale-95 ${
              active ? 'text-[var(--accent)]' : 'text-[var(--text-muted)] hover:text-[var(--text)]'
            }`}
          >
            <span
              className={`flex h-7 w-11 items-center justify-center rounded-full transition ${
                active ? 'bg-[var(--accent)]/15' : ''
              }`}
            >
              <Icon className="h-[18px] w-[18px]" />
            </span>
            <span className="leading-none">{label}</span>
            {tab === 'date' && hasNewInvite && (
              <span className="absolute right-[22%] top-1.5 h-2 w-2 rounded-full bg-rose-500 border border-[var(--bg-nav)]" />
            )}
          </button>
        );
      })}
    </div>
  </nav>
);
