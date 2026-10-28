// Game audio engine — one shared Web Audio context, no files, no reloads.
// Every effect is a tiny synth voice (oscillator + gain envelope), so tapping
// never has to wait on a network request, and cleanup is just node.stop().
// Effects respect the `sfx` toggle, background music respects `music`.

import { getGameSettings } from './gameSettings';

export type SfxKind =
  | 'button' | 'point' | 'gold' | 'combo' | 'error' | 'miss'
  | 'countdown' | 'start' | 'win' | 'record' | 'drop' | 'perfect'
  | 'shield' | 'swap' | 'flip' | 'shuffle';

class GameAudio {
  private ctx: AudioContext | null = null;

  private ensure(): AudioContext | null {
    if (!this.ctx && typeof window !== 'undefined') {
      const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (Ctor) {
        try {
          this.ctx = new Ctor();
        } catch {
          this.ctx = null;
        }
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      void this.ctx.resume().catch(() => undefined);
    }
    return this.ctx;
  }

  // Called from the first real user gesture (start button) so iOS unlocks audio.
  unlock(): void {
    this.ensure();
  }

  private tone(
    freq: number,
    at: number,
    dur: number,
    opts: { type?: OscillatorType; gain?: number; slideTo?: number } = {}
  ): void {
    const ctx = this.ensure();
    if (!ctx) return;
    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = opts.type ?? 'sine';
      osc.frequency.setValueAtTime(freq, at);
      if (opts.slideTo) osc.frequency.exponentialRampToValueAtTime(opts.slideTo, at + dur);
      const peak = opts.gain ?? 0.14;
      gain.gain.setValueAtTime(0.0001, at);
      gain.gain.exponentialRampToValueAtTime(peak, at + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.0001, at + dur);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(at);
      osc.stop(at + dur + 0.05);
    } catch {
      // audio locked / context gone — silently skip
    }
  }

  // --- game-wide music pad: slow, warm, two-voice chord progression ----------
  private musicTimer: ReturnType<typeof setInterval> | null = null;
  private musicVoices: { osc: OscillatorNode; gain: GainNode }[] = [];

  private chordAt(at: number, freqs: number[], dur: number): void {
    const ctx = this.ctx;
    if (!ctx) return;
    for (const freq of freqs) {
      try {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, at);
        gain.gain.setValueAtTime(0.0001, at);
        gain.gain.linearRampToValueAtTime(0.028, at + 1.4);
        gain.gain.linearRampToValueAtTime(0.0001, at + dur);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(at);
        osc.stop(at + dur + 0.1);
        this.musicVoices.push({ osc, gain });
      } catch {
        // skip a voice
      }
    }
  }

  startMusic(): void {
    if (!getGameSettings().music) return;
    if (this.musicTimer) return;
    const ctx = this.ensure();
    if (!ctx) return;
    // D-major-ish lullaby: I – vi – IV – V, 7.2s per bar, no beat — just warmth.
    const chords = [
      [293.66, 369.99, 440.0], // D F# A
      [246.94, 329.63, 369.99], // B D F# (vi)
      [311.13, 369.99, 493.88], // E#.. substituteG
      [293.66, 349.23, 440.0], // D F A
    ];
    let bar = 0;
    const playBar = () => {
      if (!getGameSettings().music) return;
      const at = (this.ctx?.currentTime ?? 0) + 0.05;
      this.chordAt(at, chords[bar % chords.length], 7.4);
      this.chordAt(at + 3.6, [220.0], 0.35); // a gentle octave tick mid-bar
      bar += 1;
    };
    playBar();
    this.musicTimer = setInterval(playBar, 7200);
  }

  stopMusic(): void {
    if (this.musicTimer) {
      clearInterval(this.musicTimer);
      this.musicTimer = null;
    }
    for (const v of this.musicVoices) {
      try {
        v.gain.gain.cancelScheduledValues(this.ctx?.currentTime ?? 0);
        v.osc.stop(this.ctx ? (this.ctx as AudioContext).currentTime + 0.05 : 0.05);
      } catch {
        // already stopped
      }
    }
    this.musicVoices = [];
  }

  // --- one-shot effects -------------------------------------------------------
  play(kind: SfxKind, opts: { combo?: number } = {}): void {
    const { sfx } = getGameSettings();
    if (!sfx) return;
    const at = (this.ctx?.currentTime ?? 0) + 0.01;
    switch (kind) {
      case 'button':
        this.tone(660, at, 0.07, { type: 'triangle', gain: 0.08, slideTo: 880 });
        break;
      case 'flip':
        this.tone(520, at, 0.06, { type: 'triangle', gain: 0.07, slideTo: 700 });
        break;
      case 'point':
        this.tone(660, at, 0.14, { type: 'sine', slideTo: 990 });
        this.tone(990, at + 0.06, 0.12, { gain: 0.07 });
        break;
      case 'gold':
        [784, 988, 1319].forEach((f, i) => this.tone(f, at + i * 0.055, 0.22, { gain: 0.1 }));
        break;
      case 'combo': {
        const step = Math.min(4, Math.max(1, opts.combo ?? 1));
        const base = 523.25 * Math.pow(2, (step - 1) / 6); // climbs with the combo
        this.tone(base, at, 0.16, { type: 'sine' });
        this.tone(base * 1.5, at + 0.07, 0.14, { gain: 0.08 });
        break;
      }
      case 'error':
        this.tone(196, at, 0.2, { type: 'triangle', gain: 0.11, slideTo: 110 });
        break;
      case 'miss':
        this.tone(330, at, 0.12, { type: 'triangle', gain: 0.08, slideTo: 250 });
        break;
      case 'countdown':
        this.tone(880, at, 0.12, { gain: 0.09 });
        break;
      case 'start':
        this.tone(587.33, at, 0.3, { type: 'sine', gain: 0.16 });
        this.tone(880, at + 0.1, 0.35, { gain: 0.12 });
        break;
      case 'win':
        [523.25, 659.25, 783.99, 1046.5].forEach((f, i) =>
          this.tone(f, at + i * 0.11, 0.4, { gain: 0.13 })
        );
        break;
      case 'record':
        [659.25, 783.99, 1046.5, 1318.5].forEach((f, i) =>
          this.tone(f, at + i * 0.09, 0.5, { type: 'sine', gain: 0.12 })
        );
        this.tone(1567.98, at + 0.42, 0.5, { gain: 0.08 });
        break;
      case 'drop':
        this.tone(440, at, 0.09, { type: 'triangle', gain: 0.09, slideTo: 330 });
        break;
      case 'perfect':
        this.tone(987.77, at, 0.2, { gain: 0.12 });
        this.tone(1479.98, at + 0.08, 0.24, { gain: 0.1 });
        break;
      case 'shield':
        this.tone(311.13, at, 0.3, { type: 'sine', gain: 0.12, slideTo: 622.25 });
        break;
      case 'swap':
        this.tone(587.33, at, 0.08, { type: 'triangle', gain: 0.07, slideTo: 740 });
        break;
      case 'shuffle':
        [392, 494, 587, 740].forEach((f, i) => this.tone(f, at + i * 0.08, 0.25, { gain: 0.08 }));
        break;
    }
  }
}

export const gameAudio = new GameAudio();

// Short device haptics, guarded behind both the setting and browser support.
export function buzz(pattern: number | number[]): void {
  const { vibrate } = getGameSettings();
  if (!vibrate) return;
  try {
    navigator.vibrate?.(pattern);
  } catch {
    // unsupported — fine
  }
}
