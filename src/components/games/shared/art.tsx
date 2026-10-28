// Hand-drawn SVG art shared by all six games. Replaces every emoji sprite
// with crisp vector art that scales with the theme (colours come from CSS
// vars where possible, semantic colours stay fixed — a red heart must always
// read as "good", a broken one as "bad", in every theme).

import React from 'react';

export interface GlyphProps {
  size?: number;
  className?: string;
  style?: React.CSSProperties;
}

const svg = (size: number, className?: string, style?: React.CSSProperties) => ({
  width: size,
  height: size,
  viewBox: '0 0 40 40',
  className,
  style,
  'aria-hidden': true as const,
});

const HEART_PATH =
  'M20 35.5 C 8.5 27 3 19.5 3 12.6 C 3 6.6 7.3 3 11.9 3 C 15.6 3 18.5 5 20 8 C 21.5 5 24.4 3 28.1 3 C 32.7 3 37 6.6 37 12.6 C 37 19.5 31.5 27 20 35.5 Z';

/** Red heart — the base +1 collectible in Жүрек аулау. */
export function HeartGlyph({ size = 32, className, style }: GlyphProps): React.ReactElement {
  return (
    <svg {...svg(size, className, style)}>
      <path d={HEART_PATH} fill="#E5484D" />
      <path d="M12 9.5 C 10 10.5 8.8 12.6 9 15" stroke="rgba(255,255,255,.75)" strokeWidth="2" strokeLinecap="round" fill="none" />
    </svg>
  );
}

/** Gold heart — rare, worth a lot. */
export function GoldHeartGlyph({ size = 32, className, style }: GlyphProps): React.ReactElement {
  return (
    <svg {...svg(size, className, style)}>
      <defs>
        <linearGradient id="ghg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#FFE08A" />
          <stop offset="0.55" stopColor="#F4B942" />
          <stop offset="1" stopColor="#C98A1B" />
        </linearGradient>
      </defs>
      <path d={HEART_PATH} fill="url(#ghg)" stroke="#A9784F" strokeWidth="0.8" />
      <circle cx="13.5" cy="10" r="1.6" fill="rgba(255,255,255,.9)" />
      <circle cx="27.5" cy="24" r="1.1" fill="rgba(255,255,255,.7)" />
    </svg>
  );
}

/** Frost heart — briefly slows everything down. */
export function FrostHeartGlyph({ size = 32, className, style }: GlyphProps): React.ReactElement {
  return (
    <svg {...svg(size, className, style)}>
      <path d={HEART_PATH} fill="#5AB0E8" />
      <path d="M20 10 v20 M11 15 l18 10 M29 15 l-18 10" stroke="rgba(255,255,255,.65)" strokeWidth="1.6" strokeLinecap="round" />
      <circle cx="13" cy="10" r="1.5" fill="rgba(255,255,255,.9)" />
    </svg>
  );
}

/** Broken heart — the obstacle; costs a life and resets the combo. */
export function BrokenHeartGlyph({ size = 32, className, style }: GlyphProps): React.ReactElement {
  return (
    <svg {...svg(size, className, style)}>
      <path d={HEART_PATH} fill="#6B4A3E" opacity="0.9" />
      <path d="M20 6 L16.5 14 L22 19 L17.5 27 L20 34" stroke="var(--bg, #FFF)" strokeWidth="2.4" fill="none" strokeLinejoin="bevel" />
    </svg>
  );
}

/** Magnet pickup — hearts drift to the catcher for a while. */
export function MagnetGlyph({ size = 32, className, style }: GlyphProps): React.ReactElement {
  return (
    <svg {...svg(size, className, style)}>
      <path d="M13 5 v13 a7 7 0 0 0 14 0 V5" stroke="#C1C7CE" strokeWidth="6" fill="none" strokeLinecap="butt" />
      <path d="M10 9 v4 M30 9 v4" stroke="#E5484D" strokeWidth="6" strokeLinecap="butt" />
      <path d="M10 9 v4 M30 9 v4" stroke="#F2F4F7" strokeWidth="2" strokeLinecap="butt" />
      <circle cx="27" cy="30" r="1.4" fill="#8FA3B8" />
      <circle cx="12" cy="33" r="1" fill="#8FA3B8" />
    </svg>
  );
}

/** Five-point star, shared by several games. */
export function StarGlyph({ size = 28, className, style, color = 'var(--accent, #F4B942)' }: GlyphProps & { color?: string }): React.ReactElement {
  return (
    <svg {...svg(size, className, style)}>
      <path
        d="M20 3 L24.2 13.6 L35.6 14.4 L26.8 21.8 L29.6 32.9 L20 26.8 L10.4 32.9 L13.2 21.8 L4.4 14.4 L15.8 13.6 Z"
        fill={color}
      />
      <circle cx="15" cy="16" r="1.2" fill="rgba(255,255,255,.8)" />
    </svg>
  );
}

/** The playable spacecraft (Жұлдызды жарыс) — no more rocket emoji. */
export function ShipGlyph({ size = 40, className, style }: GlyphProps): React.ReactElement {
  return (
    <svg {...svg(size, className, style)}>
      <defs>
        <linearGradient id="shb" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#EDEFF5" />
          <stop offset="0.5" stopColor="#B9C4D4" />
          <stop offset="1" stopColor="#7E8CA0" />
        </linearGradient>
      </defs>
      <path className="sr-flame" d="M20 34 C 17.5 39 22.5 39 20 42 Z M20 34 C 16 39.5 24 39.5 20 44 Z" fill="#F4B942" opacity="0.9" />
      <path d="M20 4 C 25.5 10 27 18 25.5 27 L 14.5 27 C 13 18 14.5 10 20 4 Z" fill="url(#shb)" stroke="#4E5B70" strokeWidth="1" />
      <path d="M14.5 27 L 9 33 L 15 33 Z" fill="#A9784F" />
      <path d="M25.5 27 L 31 33 L 25 33 Z" fill="#A9784F" />
      <circle cx="20" cy="17" r="4.4" fill="#8FD3F4" stroke="#4E5B70" strokeWidth="1.2" />
      <circle cx="18.4" cy="15.6" r="1.4" fill="rgba(255,255,255,.85)" />
      <path d="M15.5 30 h9" stroke="#F4B942" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

/** Asteroid obstacle for the race. */
export function AsteroidGlyph({ size = 30, className, style }: GlyphProps): React.ReactElement {
  return (
    <svg {...svg(size, className, style)}>
      <path
        d="M20 4 L29 8 L35 16 L32 26 L23 33 L12 32 L5 24 L6 13 Z"
        fill="#6B5A4E"
        stroke="#4A3E35"
        strokeWidth="1.2"
      />
      <circle cx="14" cy="14" r="2.4" fill="#8A7668" />
      <circle cx="25" cy="22" r="3.2" fill="#5B4C41" />
      <circle cx="16" cy="25" r="1.6" fill="#8A7668" />
    </svg>
  );
}

/** Translucent shield bubble around the ship. */
export function ShieldBubbleGlyph({ size = 52, className, style }: GlyphProps): React.ReactElement {
  return (
    <svg {...svg(size, className, style)}>
      <circle cx="20" cy="20" r="16" fill="rgba(96,190,255,.18)" stroke="rgba(140,214,255,.85)" strokeWidth="1.6" />
      <path d="M8 14 A 14 14 0 0 1 20 6" stroke="rgba(255,255,255,.9)" strokeWidth="2" fill="none" strokeLinecap="round" />
    </svg>
  );
}

/** The catcher basket (Жүрек аулау) — a soft two-tone bowl with a rim glow. */
export function BasketGlyph({ size = 64, className, style }: GlyphProps): React.ReactElement {
  return (
    <svg {...svg(size, className, style)}>
      <defs>
        <linearGradient id="bsk" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="var(--accent-2, #C97B8C)" />
          <stop offset="1" stopColor="var(--accent, #A9784F)" />
        </linearGradient>
      </defs>
      <ellipse cx="20" cy="12" rx="16" ry="4.5" fill="rgba(255,255,255,.35)" />
      <path d="M4 12 C 6 24 13 29 20 29 C 27 29 34 24 36 12 Z" fill="url(#bsk)" />
      <ellipse cx="20" cy="12" rx="16" ry="4.5" fill="none" stroke="rgba(255,255,255,.7)" strokeWidth="1.5" />
      <path d="M11 19 C 13 23 16 25.5 20 26" stroke="rgba(255,255,255,.45)" strokeWidth="1.6" fill="none" strokeLinecap="round" />
    </svg>
  );
}

/** Tower block (Махаббат мұнарасы) — a warm brick with a soft top light. */
export function BlockGlyph({ width = 100, height = 26, perfect = false, className, style }: {
  width?: number | string;
  height?: number | string;
  perfect?: boolean;
  className?: string;
  style?: React.CSSProperties;
}): React.ReactElement {
  const isDim = style?.opacity !== undefined && (style.opacity as number) < 1;
  return (
    <svg width={width} height={height} viewBox="0 0 100 26" preserveAspectRatio="none" className={className} style={style} aria-hidden>
      <defs>
        <linearGradient id={`blk${perfect ? 'p' : ''}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="var(--accent-2, #C97B8C)" />
          <stop offset="1" stopColor="var(--accent, #A9784F)" />
        </linearGradient>
      </defs>
      <rect x="1.5" y="1.5" width="97" height="23" rx="4" fill={isDim ? 'var(--locked-fill, #D8C3A5)' : `url(#blk${perfect ? 'p' : ''})`} stroke={perfect ? 'rgba(255,255,255,.95)' : 'rgba(0,0,0,.18)'} strokeWidth={perfect ? 1.6 : 1} />
      <rect x="6" y="4" width={perfect ? 88 : 60} height="2.6" rx="1.3" fill="rgba(255,255,255,.5)" />
      <rect x="12" y="14" width="52" height="2.2" rx="1.1" fill="rgba(0,0,0,.10)" />
    </svg>
  );
}

// ---------------------------------------------------------------- crystals

const CRYSTAL_COLORS: [string, string][] = [
  ['#E5484D', '#FFB3B6'], // red
  ['#7B6CFF', '#D5D0FF'], // violet
  ['#2FB9C9', '#C3F2F8'], // cyan
  ['#F4B942', '#FFEBAD'], // gold
  ['#4FC27B', '#C9F3D8'], // green
  ['#EC6B55', '#FFD0C8'], // coral
];

export type CrystalSpecial = 'none' | 'stripedH' | 'stripedV' | 'star' | 'bomb';

/** A gem that differs by shape AND colour, so weak eyes and color-blind
 *  players can still play Жұлдызды кристалдар. */
export function CrystalGlyph({ colorIndex, special = 'none', size = 34, className, style }: GlyphProps & {
  colorIndex: number;
  special?: CrystalSpecial;
}): React.ReactElement {
  const [dark, light] = CRYSTAL_COLORS[colorIndex % CRYSTAL_COLORS.length];
  const uid = `cg${colorIndex}${special}`;
  if (special === 'star') {
    return (
      <svg {...svg(size, className, style)}>
        <defs>
          <linearGradient id={uid} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#FFF3C4" />
            <stop offset="0.5" stopColor="#F4B942" />
            <stop offset="1" stopColor="#E5484D" />
          </linearGradient>
        </defs>
        <path
          d="M20 2 L25.5 13.5 L38 15.2 L28.8 23.8 L31.4 36.4 L20 30.2 L8.6 36.4 L11.2 23.8 L2 15.2 L14.5 13.5 Z"
          fill={`url(#${uid})`}
          stroke="#FFF"
          strokeWidth="1.1"
        />
      </svg>
    );
  }
  const gemPath = 'M11 5 h18 l7 10 -16 21 -16 -21 Z';
  return (
    <svg {...svg(size, className, style)}>
      <defs>
        <linearGradient id={uid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={light} />
          <stop offset="0.55" stopColor={dark} />
          <stop offset="1" stopColor={dark} />
        </linearGradient>
      </defs>
      <path d={gemPath} fill={`url(#${uid})`} stroke="rgba(255,255,255,.85)" strokeWidth="1.1" />
      <path d="M11 5 l9 10 9 -10 M3 15 h34 M20 15 v21" fill="none" stroke="rgba(255,255,255,.4)" strokeWidth="1" />
      {special === 'stripedH' && (
        <g stroke="rgba(255,255,255,.95)" strokeWidth="2.4" strokeLinecap="round">
          <path d="M8 17 h24" />
          <path d="M10 21.5 h20" />
        </g>
      )}
      {special === 'stripedV' && (
        <g stroke="rgba(255,255,255,.95)" strokeWidth="2.4" strokeLinecap="round">
          <path d="M16.5 10 v20" />
          <path d="M23.5 10 v20" />
        </g>
      )}
      {special === 'bomb' && (
        <g>
          <circle cx="20" cy="18" r="7.5" fill="rgba(255,255,255,.25)" stroke="#FFF" strokeWidth="1.4" />
          <path
            d="M20 12.6 L21.8 16.2 L25.8 16.8 L22.9 19.5 L23.6 23.4 L20 21.5 L16.4 23.4 L17.1 19.5 L14.2 16.8 L18.2 16.2 Z"
            fill="#FFF"
          />
        </g>
      )}
    </svg>
  );
}

// ------------------------------------------------------- memory card faces

export function MemorySymbolGlyph({ kind, size = 30, className, style }: GlyphProps & { kind: number }): React.ReactElement {
  const A = 'var(--accent, #A9784F)';
  const B = 'var(--accent-2, #C97B8C)';
  switch (kind) {
    case 0: // heart
      return (
        <svg {...svg(size, className, style)}>
          <path d={HEART_PATH} fill={B} />
          <circle cx="13" cy="10" r="1.6" fill="rgba(255,255,255,.8)" />
        </svg>
      );
    case 1: // crescent moon
      return (
        <svg {...svg(size, className, style)}>
          <path d="M25 4 A 15 15 0 1 0 25 36 A 12 12 0 1 1 25 4 Z" fill={A} />
        </svg>
      );
    case 2: // star
      return <StarGlyph size={size} color={A} />;
    case 3: // flower
      return (
        <svg {...svg(size, className, style)}>
          {[0, 72, 144, 216, 288].map((a) => (
            <ellipse key={a} cx="20" cy="11" rx="5.4" ry="8.4" fill={B} transform={`rotate(${a} 20 20)`} />
          ))}
          <circle cx="20" cy="20" r="4.6" fill="#FFE08A" />
        </svg>
      );
    case 4: // love letter
      return (
        <svg {...svg(size, className, style)}>
          <rect x="5" y="9" width="30" height="22" rx="3.5" fill="#FFF6EA" stroke={A} strokeWidth="1.6" />
          <path d="M5 12 L20 22 L35 12" fill="none" stroke={A} strokeWidth="1.8" />
          <path d="M20 16.5 L23.6 14.2 L21.8 17.6 L24.5 18.4 L20 20.4 Z" fill={B} />
        </svg>
      );
    case 5: // ring with a gem
      return (
        <svg {...svg(size, className, style)}>
          <circle cx="20" cy="23" r="10" fill="none" stroke="#E8C15A" strokeWidth="3.4" />
          <path d="M20 6 l6 5 -6 5 -6 -5 Z" fill="#8FD3F4" stroke="#E8C15A" strokeWidth="1.2" />
        </svg>
      );
    case 6: // compass rose ("my way home is you")
      return (
        <svg {...svg(size, className, style)}>
          <circle cx="20" cy="20" r="14" fill="none" stroke={A} strokeWidth="2" />
          <path d="M20 8 L23 18 L30 20 L23 22 L20 32 L17 22 L10 20 L17 18 Z" fill={B} />
        </svg>
      );
    default: // infinity
      return (
        <svg {...svg(size, className, style)}>
          <path
            d="M13 20 C 13 15 6 15 6 20 C 6 25 13 25 13 20 C 13 15 20 14 20 20 C 20 26 27 25 27 20 C 27 15 20 15 20 20 C 20 26 13 25 13 20 Z"
            fill="none"
            stroke={A}
            strokeWidth="2.6"
            transform="translate(3.5 0)"
          />
        </svg>
      );
  }
}

/** Memory card back — the "closed" side with a subtle ornamental heart. */
export function CardBackGlyph({ size = 40, className, style }: GlyphProps): React.ReactElement {
  return (
    <svg {...svg(size, className, style)}>
      <path d={HEART_PATH} fill="none" stroke="var(--accent, #A9784F)" strokeOpacity="0.55" strokeWidth="1.6" />
      <circle cx="20" cy="19" r="2" fill="var(--accent, #A9784F)" fillOpacity="0.5" />
    </svg>
  );
}

/** Small floating sparkle used by particle bursts. */
export function SparkleGlyph({ size = 10, className, style }: GlyphProps): React.ReactElement {
  return (
    <svg {...svg(size, className, style)}>
      <path d="M20 2 C 21 12 22 14 20 20 C 18 14 19 12 20 2 Z M20 38 C 21 28 22 26 20 20 C 18 26 19 28 20 38 Z M2 20 C 12 21 14 22 20 20 C 14 18 12 19 2 20 Z M38 20 C 28 21 26 22 20 20 C 26 18 28 19 38 20 Z" fill="currentColor" />
    </svg>
  );
}

/** Lives display: filled / hollow heart chip. */
export function LifeHeartGlyph({ filled = true, size = 16, className, style }: GlyphProps & { filled?: boolean }): React.ReactElement {
  return (
    <svg {...svg(size, className, style)}>
      <path
        d={HEART_PATH}
        fill={filled ? '#E5484D' : 'none'}
        stroke={filled ? 'none' : 'var(--text-faint, #B99B7A)'}
        strokeWidth={filled ? 0 : 2}
      />
    </svg>
  );
}
