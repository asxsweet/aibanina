import React, { useLayoutEffect, useRef, useState } from 'react';
import { Star } from 'lucide-react';

interface RewardFlightProps {
  day: number; // the star that was just earned
  onDone: () => void;
}

const FLIGHT_MS = 1150;

// After a new star is claimed, a glowing star flies from the middle of the
// screen to its place on the map (or, when the map isn't on screen, to the
// star counter in the header).
export const RewardFlight: React.FC<RewardFlightProps> = ({ day, onDone }) => {
  const [vector, setVector] = useState<{ x: number; y: number; dx: number; dy: number } | null>(null);
  const doneRef = useRef(onDone);
  doneRef.current = onDone;

  useLayoutEffect(() => {
    const startX = window.innerWidth / 2;
    const startY = window.innerHeight / 2;

    const onScreen = (el: Element | null): el is Element => {
      if (!el) return false;
      const r = el.getBoundingClientRect();
      return r.width > 0 && r.bottom > 0 && r.top < window.innerHeight && r.right > 0 && r.left < window.innerWidth;
    };

    const mapStar = document.querySelector(`[data-star-day="${day}"]`);
    const counter = document.querySelector('[data-flight-target="stars"]');
    const target = onScreen(mapStar) ? mapStar : onScreen(counter) ? counter : null;

    if (!target) {
      doneRef.current();
      return;
    }
    const r = target.getBoundingClientRect();
    setVector({ x: startX, y: startY, dx: r.left + r.width / 2 - startX, dy: r.top + r.height / 2 - startY });

    const timer = window.setTimeout(() => doneRef.current(), FLIGHT_MS + 60);
    return () => window.clearTimeout(timer);
  }, [day]);

  if (!vector) return null;

  return (
    <div
      className="fixed z-[70] pointer-events-none animate-star-flight"
      aria-hidden="true"
      style={
        {
          left: vector.x,
          top: vector.y,
          marginLeft: -14,
          marginTop: -14,
          opacity: 0,
          '--fly-x': `${vector.dx}px`,
          '--fly-y': `${vector.dy}px`,
        } as React.CSSProperties
      }
    >
      <Star
        className="w-7 h-7 text-[var(--accent)] fill-[var(--accent)]"
        style={{ filter: 'drop-shadow(0 0 10px var(--accent-glow-strong))' }}
      />
    </div>
  );
};
