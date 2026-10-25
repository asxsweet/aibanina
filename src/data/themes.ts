import type React from 'react';
import {
  Sun, Moon, Sunrise, Leaf, Gem, TreeDeciduous, Snowflake, Compass, Waves, Orbit, Crown, Heart, Sparkles,
} from 'lucide-react';

// Single source of truth for the visual themes. The order here is the order
// themes unlock in (see MILESTONE_BONUSES in constants.ts) and the order the
// theme toggle cycles through.
export const THEME_IDS = [
  'day',
  'night',
  'dawn',
  'mint',
  'velvet',
  'autumn',
  'winter',
  'treasure',
  'aurora',
  'galaxy',
  'gold',
  'sakura',
  'ocean',
  'lavender',
  'sunset',
  'retro',
  'neon',
  'clouds',
  'kazakh',
  'arabian',
] as const;

export type ThemeName = (typeof THEME_IDS)[number];

export interface ThemeMeta {
  id: ThemeName;
  label: string;
  icon: React.ElementType;
  // Colour of the browser's address bar / status bar while this theme is
  // active (<meta name="theme-color">) — matches the theme's --bg.
  themeColor: string;
}

export const THEME_META: Record<ThemeName, ThemeMeta> = {
  day: { id: 'day', label: 'Жылы күн', icon: Sun, themeColor: '#FDFBF7' },
  night: { id: 'night', label: 'Жұлдызды түн', icon: Moon, themeColor: '#0F081D' },
  dawn: { id: 'dawn', label: 'Таң', icon: Sunrise, themeColor: '#FFE8D6' },
  mint: { id: 'mint', label: 'Жасыл бақ', icon: Leaf, themeColor: '#F5F7F0' },
  velvet: { id: 'velvet', label: 'Түн бархаты', icon: Gem, themeColor: '#0F1F1A' },
  autumn: { id: 'autumn', label: 'Алтын күз', icon: TreeDeciduous, themeColor: '#FBF1E4' },
  winter: { id: 'winter', label: 'Қысқы ертегі', icon: Snowflake, themeColor: '#F3F8FC' },
  treasure: { id: 'treasure', label: 'Қазына картасы', icon: Compass, themeColor: '#F6EBD3' },
  aurora: { id: 'aurora', label: 'Аврора', icon: Waves, themeColor: '#0A1A1F' },
  galaxy: { id: 'galaxy', label: 'Ғарыш', icon: Orbit, themeColor: '#0B0B2A' },
  gold: { id: 'gold', label: 'Алтын', icon: Crown, themeColor: '#0C0A07' },
  sakura: { id: 'sakura', label: 'Сакура', icon: Leaf, themeColor: '#FFF3F7' },
  ocean: { id: 'ocean', label: 'Мұхит түні', icon: Waves, themeColor: '#061A2B' },
  lavender: { id: 'lavender', label: 'Лаванда арманы', icon: Gem, themeColor: '#F4EFFF' },
  sunset: { id: 'sunset', label: 'Күн батуы', icon: Sunrise, themeColor: '#321A42' },
  retro: { id: 'retro', label: 'Ретро махаббат', icon: Heart, themeColor: '#F5E7D0' },
  neon: { id: 'neon', label: 'Неон қала', icon: Sparkles, themeColor: '#090818' },
  clouds: { id: 'clouds', label: 'Бұлттар әлемі', icon: Sun, themeColor: '#EAF7FF' },
  kazakh: { id: 'kazakh', label: 'Қазақы романтика', icon: Compass, themeColor: '#071F3D' },
  arabian: { id: 'arabian', label: 'Араб түні', icon: Moon, themeColor: '#080A27' },
};

export function isThemeName(value: unknown): value is ThemeName {
  return typeof value === 'string' && (THEME_IDS as readonly string[]).includes(value);
}
