import React, { useMemo } from 'react';
import { ThemeName } from '../utils/constellationUtils';

interface NightSkyProps {
  theme?: ThemeName;
}

const BACKGROUND_BY_THEME: Record<ThemeName, string> = {
  day: 'radial-gradient(circle at 50% 0%, #F7F0E3 0%, #FDFBF7 60%)',
  night: 'radial-gradient(circle at 50% 0%, #1B1140 0%, #0F081D 60%)',
  dawn: 'linear-gradient(160deg, #FFE8D6 0%, #F6DCE8 55%, #EDE1F5 100%)',
  mint: 'radial-gradient(circle at 50% 0%, #EDF1E6 0%, #F5F7F0 60%)',
  velvet: 'radial-gradient(120% 100% at 50% -10%, #1E2E28 0%, #0F1F1A 60%)',
};

// Speck colors tuned per theme so drifting flecks read well against each background
const SPECK_BASE_BY_THEME: Record<ThemeName, string> = {
  day: 'var(--border)',
  night: '#FFFFFF',
  dawn: '#FFFFFF',
  mint: '#FFFFFF',
  velvet: '#F5EFDD',
};

export const NightSky: React.FC<NightSkyProps> = ({ theme = 'day' }) => {
  // Generate soft floating specks with position, size, opacity, and drifting speed
  const stars = useMemo(() => {
    return Array.from({ length: 46 }).map((_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 2.2 + 1,
      duration: (Math.random() * 3 + 2).toFixed(1),
      delay: (Math.random() * 4).toFixed(1),
      colorKey: i % 4 === 0 ? 'accent-2' : i % 3 === 0 ? 'accent' : 'faint',
    }));
  }, []);

  const speckColor = (key: string) => {
    if (key === 'accent-2') return 'var(--accent-2)';
    if (key === 'accent') return 'var(--accent)';
    return SPECK_BASE_BY_THEME[theme];
  };

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
      {/* Ambient background gradient — a distinct look per theme */}
      <div
        className="absolute inset-0 transition-colors duration-500"
        style={{ background: BACKGROUND_BY_THEME[theme] }}
      />

      {/* Soft ambient glows */}
      <div className="absolute top-40 left-10 w-72 h-72 bg-[var(--accent-2)] rounded-full opacity-[0.06] blur-[100px] pointer-events-none" />
      <div className="absolute bottom-32 right-10 w-64 h-64 bg-[var(--accent)] rounded-full opacity-[0.07] blur-[80px] pointer-events-none" />

      {/* Drifting flecks of light */}
      {stars.map((s) => (
        <div
          key={s.id}
          className="absolute rounded-full animate-twinkle"
          style={{
            left: `${s.x}%`,
            top: `${s.y}%`,
            width: `${s.size}px`,
            height: `${s.size}px`,
            backgroundColor: speckColor(s.colorKey),
            boxShadow: s.size > 2 ? `0 0 6px ${speckColor(s.colorKey)}66` : 'none',
            '--twinkle-duration': `${s.duration}s`,
            '--twinkle-delay': `${s.delay}s`,
          } as React.CSSProperties}
        />
      ))}
    </div>
  );
};
