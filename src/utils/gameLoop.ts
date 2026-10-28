// Tiny RAF game-loop helper with delta time.
//
// position += speed * (deltaMs / 1000)
//
// Delta is clamped so a background tab that slept for 5 s doesn't teleport
// every falling heart across the field on return. The loop NEVER touches
// React state — games keep their entities in refs and paint by mutating
// transforms (translate3d), which is what keeps weak phones at 60 FPS.

export type LoopCallback = (deltaMs: number, now: number) => void;

export interface GameLoop {
  start(): void;
  stop(): void;
  readonly running: boolean;
}

export function createGameLoop(cb: LoopCallback, maxDeltaMs = 80): GameLoop {
  let handle: number | null = null;
  let last = 0;
  let active = false;

  const tick = (now: number) => {
    if (!active) return;
    const delta = last === 0 ? 16 : Math.min(maxDeltaMs, now - last);
    last = now;
    cb(delta, now);
    handle = requestAnimationFrame(tick);
  };

  return {
    get running() {
      return active;
    },
    start() {
      if (active) return;
      active = true;
      last = 0;
      handle = requestAnimationFrame(tick);
    },
    stop() {
      active = false;
      if (handle !== null) {
        cancelAnimationFrame(handle);
        handle = null;
      }
    },
  };
}

import { useEffect, useRef } from 'react';

export function useRafLoop(
  active: boolean,
  cb: LoopCallback,
  maxDeltaMs = 80
): void {
  const cbRef = useRef(cb);
  cbRef.current = cb;

  useEffect(() => {
    if (!active) return;
    const loop = createGameLoop((delta, now) => cbRef.current(delta, now), maxDeltaMs);
    loop.start();
    return () => loop.stop();
  }, [active, maxDeltaMs]);
}
