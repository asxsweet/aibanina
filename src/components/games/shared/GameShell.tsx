// The unified game frame used by all six games:
//   HUD (name · score · lives · time · combo · pause · sound · info)
//   → 3-2-1-Баста countdown → play field → pause panel → result window.
//
// Games render only their play field and feed numbers in through `hud`;
// everything a round must do identically lives here or in useGameShell.

import React, { useEffect, useState } from 'react';
import {
  Pause, Play, Volume2, VolumeX, Info, X, RotateCcw, Trophy, Home, Shuffle, Timer, Sparkles, ListChecks,
} from 'lucide-react';
import type { GameId } from '../../gameTypes';
import type { ShellApi } from './useGameShell';
import type { DifficultyName } from '../../../utils/constellationUtils';
import { gameAudio, buzz } from '../../../utils/gameSound';
import { updateGameSettings } from '../../../utils/gameSettings';
import { CardBackGlyph } from './art';

const DIFFICULTY_LABELS: Record<DifficultyName, string> = {
  easy: 'Жеңіл',
  medium: 'Орташа',
  hard: 'Қиын',
};

const TUTORIAL_KEY = 'nashe_game_tutorial_v1';

interface Mission {
  title: string;
  text: string;
  /** Up to three short how-to lines shown once, then via the ⓘ button. */
  steps: string[];
}

interface GameShellHud {
  score: number;
  targetScore?: number;
  lives?: { max: number; current: number };
  timerSec?: number;
  movesLabel?: string;
  combo?: number;
}

export interface GameShellProps {
  gameId: GameId;
  gameName: string;
  shell: ShellApi;
  difficulty: DifficultyName;
  onSetDifficulty?: (d: DifficultyName) => void;
  mission: Mission;
  hud: GameShellHud;
  /** Record line for the idle screen, e.g. "Сенікі: 980 · Серіктес: 1 140". */
  recordsLine?: string | null;
  /** Daily task status line for the idle screen. */
  taskLine?: string | null;
  /** Shown inside the result window when stardust / a task reward was paid. */
  rewardNote?: string | null;
  onAnotherGame: () => void;
  onOpenLeaderboard: () => void;
  onHome: () => void;
  heightClass?: string;
  children?: React.ReactNode;
}

interface TutorialBoxProps {
  gameId: GameId;
  steps: string[];
  onClose: () => void;
}

function TutorialBox({ gameId, steps, onClose }: TutorialBoxProps): React.ReactElement {
  const [step, setStep] = useState(0);
  const list = steps.slice(0, 3);
  const last = step >= list.length - 1;
  const finish = () => {
    try {
      localStorage.setItem(`${TUTORIAL_KEY}:${gameId}`, '1');
    } catch {
      // private mode — tutorial just shows again next session
    }
    onClose();
  };

  return (
    <div className="absolute inset-0 z-40 flex flex-col justify-end bg-[var(--overlay)]/60" onClick={(e) => e.stopPropagation()}>
      <div className="mx-3 mb-3 rounded-2xl bg-[var(--bg-elevated)]/96 border border-[var(--border)] p-4 shadow-xl">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] uppercase tracking-widest font-bold text-[var(--accent-2)] flex items-center gap-1.5">
            <Info className="w-3.5 h-3.5" /> Қалай ойнауға?
          </span>
          <button
            onClick={finish}
            aria-label="Нұсқаулықты жабу"
            className="w-11 h-9 -mr-1 flex items-center justify-center rounded-full text-[var(--text-muted)] hover:text-[var(--text)] active:scale-95 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <ol className="space-y-1.5">
          {list.map((s, i) => (
            <li
              key={i}
              className={`flex items-start gap-2 text-xs leading-relaxed transition-opacity ${
                i === step ? 'opacity-100 text-[var(--text)]' : 'opacity-35 text-[var(--text-secondary)]'
              }`}
            >
              <span className="w-4 h-4 mt-0.5 rounded-full bg-[var(--accent)]/15 text-[var(--accent)] text-[9px] font-bold flex items-center justify-center shrink-0">
                {i + 1}
              </span>
              {s}
            </li>
          ))}
        </ol>
        <div className="mt-3 flex items-center justify-between">
          <div className="flex gap-1">
            {list.map((_, i) => (
              <span
                key={i}
                className={`h-1.5 rounded-full transition-all ${i === step ? 'w-4 bg-[var(--accent)]' : 'w-1.5 bg-[var(--locked-fill)]'}`}
              />
            ))}
          </div>
          <button
            onClick={() => (last ? finish() : setStep((s) => s + 1))}
            className="px-5 py-2.5 min-h-[44px] rounded-xl btn-gold text-xs font-semibold active:scale-95 transition"
          >
            {last ? 'Түсіндім' : 'Әрі қарай'}
          </button>
        </div>
      </div>
    </div>
  );
}

function readSfxOn(): boolean {
  try {
    const raw = localStorage.getItem('nashe_game_prefs_v1');
    if (!raw) return true;
    return (JSON.parse(raw).sfx as boolean) !== false;
  } catch {
    return true;
  }
}

export const GameShell: React.FC<GameShellProps> = ({
  gameId,
  gameName,
  shell,
  difficulty,
  onSetDifficulty,
  mission,
  hud,
  recordsLine,
  taskLine,
  rewardNote,
  onAnotherGame,
  onOpenLeaderboard,
  onHome,
  heightClass = 'h-[440px] sm:h-[470px]',
  children,
}) => {
  const [tutorialOpen, setTutorialOpen] = useState(false);
  const [soundOn, setSoundOn] = useState(readSfxOn);

  // First-visit tutorial opens itself ONCE, only on the idle screen (never in
  // the middle of a round); the ⓘ button reopens it at any time later.
  useEffect(() => {
    let seen = false;
    try {
      seen = localStorage.getItem(`${TUTORIAL_KEY}:${gameId}`) === '1';
    } catch {
      seen = true; // storage unavailable — don't nag
    }
    if (!seen && shell.phase === 'idle') setTutorialOpen(true);
  }, [gameId, shell.phase]);

  const toggleSfx = () => {
    const next = !soundOn;
    updateGameSettings({ sfx: next });
    setSoundOn(next);
    if (next) gameAudio.unlock();
    buzz(10);
  };

  const phase = shell.phase;
  const over = shell.result;
  const live = phase === 'playing' || phase === 'paused';

  return (
    <div
      className={`relative w-full ${heightClass} rounded-[28px] bg-[var(--bg-card)] border border-[var(--accent)]/20 shadow-[0_20px_50px_var(--overlay)] overflow-hidden select-none flex flex-col game-frame`}
    >
      {/* ── top HUD ─────────────────────────────────────────────── */}
      <div className="relative z-20 px-2 py-2 flex items-center gap-1 bg-[var(--bg-soft)]/80 backdrop-blur-md border-b border-[var(--border)]">
        {phase === 'playing' ? (
          <button
            onClick={() => {
              gameAudio.play('button');
              shell.pause();
            }}
            aria-label="Пауза"
            className="w-11 h-11 shrink-0 flex items-center justify-center rounded-full bg-[var(--bg-card)] text-[var(--accent)] border border-[var(--border)] active:scale-95 transition"
          >
            <Pause className="w-[18px] h-[18px]" />
          </button>
        ) : (
          <span className="w-2 shrink-0" />
        )}

        <div className="leading-none min-w-0">
          <div className="text-[9px] uppercase tracking-widest text-[var(--accent-2)] font-bold truncate">{gameName}</div>
          <div className="font-semibold text-lg text-[var(--text)] tabular-nums">
            {hud.score}
            {hud.targetScore !== undefined && (
              <span className="text-[11px] text-[var(--text-faint)]"> / {hud.targetScore}</span>
            )}
          </div>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center gap-0.5 px-1 min-w-0">
          {hud.timerSec !== undefined && (
            <div className="flex items-center gap-1 text-[var(--accent)] font-semibold text-sm tabular-nums">
              <Timer className="w-3.5 h-3.5" />
              {hud.timerSec}с
            </div>
          )}
          {hud.movesLabel && <div className="text-[10px] text-[var(--text-muted)] font-medium">{hud.movesLabel}</div>}
          {(hud.combo ?? 0) > 1 && (
            <div className="text-[10px] font-bold text-[var(--accent)] anim-combo-pop">Комбо ×{hud.combo}</div>
          )}
          <div className="text-[9px] uppercase tracking-wider text-[var(--text-faint)]">
            {DIFFICULTY_LABELS[difficulty]}
          </div>
        </div>

        <div className="flex items-center shrink-0">
          {hud.lives && (
            <div className="flex items-center gap-0.5 mr-1">
              {Array.from({ length: hud.lives.max }).map((_, i) => (
                <LifeDot key={i} filled={i < hud.lives!.current} />
              ))}
            </div>
          )}
          <button
            onClick={toggleSfx}
            aria-label={soundOn ? 'Дыбысты өшіру' : 'Дыбысты қосу'}
            className="w-11 h-11 flex items-center justify-center rounded-full text-[var(--text-muted)] hover:text-[var(--text)] active:scale-95 transition"
          >
            {soundOn ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>
          <button
            onClick={() => {
              setTutorialOpen(true);
              gameAudio.play('button');
            }}
            aria-label="Қалай ойнауға?"
            className="w-11 h-11 flex items-center justify-center rounded-full text-[var(--text-muted)] hover:text-[var(--text)] active:scale-95 transition"
          >
            <Info className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ── play field ──────────────────────────────────────────── */}
      <div className="relative flex-1">
        {live && children}
        {/* during 'over' the last frame keeps showing behind the result */}
      </div>

      {/* ── idle screen ─────────────────────────────────────────── */}
      {phase === 'idle' && (
        <div className="absolute inset-0 top-[62px] z-20 flex flex-col items-center justify-center gap-2.5 px-6 pb-6 pt-2 text-center bg-[var(--bg-elevated)]/94 backdrop-blur-xl">
          <div className="w-12 h-12 rounded-2xl bg-[var(--bg-soft)] border border-[var(--accent)]/25 flex items-center justify-center anim-idle-glow">
            <CardBackGlyph size={30} />
          </div>
          <h2 className="font-serif text-[22px] sm:text-2xl font-light italic text-[var(--accent)] leading-tight">
            {mission.title}
          </h2>
          <p className="text-xs text-[var(--text-muted)] max-w-[300px] leading-relaxed font-light">{mission.text}</p>
          {recordsLine && <p className="text-[11px] font-medium text-[var(--text-secondary)]">{recordsLine}</p>}
          {taskLine && (
            <p className="text-[11px] text-[var(--accent-2)] flex items-start gap-1.5 max-w-[290px] text-center leading-relaxed">
              <ListChecks className="w-3.5 h-3.5 shrink-0 mt-0.5" />
              <span>{taskLine}</span>
            </p>
          )}
          {onSetDifficulty && (
            <div className="flex items-center gap-1 p-1 rounded-full bg-[var(--bg-soft)] border border-[var(--border)]">
              {(['easy', 'medium', 'hard'] as DifficultyName[]).map((key) => (
                <button
                  key={key}
                  onClick={() => {
                    gameAudio.play('button');
                    onSetDifficulty(key);
                  }}
                  className={`px-3.5 py-2 min-h-[36px] rounded-full text-[11px] font-semibold transition ${
                    difficulty === key
                      ? 'bg-[var(--accent)] text-[var(--on-accent)]'
                      : 'text-[var(--text-muted)] hover:text-[var(--text)]'
                  }`}
                >
                  {DIFFICULTY_LABELS[key]}
                </button>
              ))}
            </div>
          )}
          <button
            onClick={shell.startRound}
            className="mt-1 px-8 py-3.5 min-h-[48px] rounded-2xl btn-gold text-sm flex items-center gap-2 active:scale-95 transition"
          >
            <Play className="w-4 h-4 fill-[var(--on-accent)]" />
            <span>Ойынды бастау</span>
          </button>
        </div>
      )}

      {/* ── countdown ───────────────────────────────────────────── */}
      {shell.countdownStep !== null && (
        <div className="absolute inset-0 z-40 flex items-center justify-center bg-[var(--overlay)]/30 pointer-events-none">
          <CountdownNumber step={shell.countdownStep} />
        </div>
      )}

      {/* ── pause panel ─────────────────────────────────────────── */}
      {phase === 'paused' && (
        <div className="absolute inset-0 top-[62px] z-30 flex flex-col items-center justify-center gap-3 px-6 text-center bg-[var(--bg-elevated)]/92 backdrop-blur-xl">
          <div className="w-14 h-14 rounded-full bg-[var(--accent)]/12 border border-[var(--accent)]/30 flex items-center justify-center text-[var(--accent)]">
            <Pause className="w-6 h-6" />
          </div>
          <h2 className="font-serif text-2xl font-light italic text-[var(--accent)]">Пауза</h2>
          <p className="text-xs text-[var(--text-muted)] max-w-[260px]">
            Таймер де, қозғалыс та тоқтатылды. Қалай жалғастырасың?
          </p>
          <div className="flex flex-col gap-2 w-full max-w-[240px]">
            <button
              onClick={() => {
                gameAudio.play('button');
                shell.resume();
              }}
              className="px-6 py-3 min-h-[48px] rounded-2xl btn-gold text-sm font-semibold flex items-center justify-center gap-2 active:scale-95 transition"
            >
              <Play className="w-4 h-4 fill-[var(--on-accent)]" /> Жалғастыру
            </button>
            <button
              onClick={shell.restart}
              className="px-6 py-3 min-h-[48px] rounded-2xl bg-[var(--bg-soft)] border border-[var(--border)] text-[var(--text-secondary)] text-sm font-semibold flex items-center justify-center gap-2 active:scale-95 transition"
            >
              <RotateCcw className="w-4 h-4" /> Қайта бастау
            </button>
            <button
              onClick={() => {
                gameAudio.play('button');
                onHome();
              }}
              className="px-6 py-3 min-h-[44px] rounded-2xl text-[var(--text-muted)] text-xs font-medium active:scale-95 transition"
            >
              Негізгі бетке қайту
            </button>
          </div>
        </div>
      )}

      {/* ── result window ───────────────────────────────────────── */}
      {phase === 'over' && over && (
        <div className="absolute inset-0 top-[62px] z-30 flex flex-col items-center justify-center gap-2 px-5 pb-4 text-center bg-[var(--bg-elevated)]/95 backdrop-blur-xl overflow-y-auto anim-result-in">
          {over.isNewRecord ? (
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-[var(--accent)]/15 border border-[var(--accent)]/40 text-[var(--accent)] text-[11px] font-bold uppercase tracking-widest anim-record-badge">
              <Trophy className="w-3.5 h-3.5" /> Жаңа рекорд!
            </div>
          ) : (
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-[var(--bg-soft)] border border-[var(--border)] text-[var(--text-muted)] text-[10px] font-semibold uppercase tracking-widest">
              {over.outcome === 'win' ? 'Тамаша!' : 'Келесі жолы бірлік жетеді'}
            </div>
          )}
          <div className="leading-none">
            <div className="font-serif text-4xl sm:text-5xl font-light text-[var(--accent)] tabular-nums">{over.headline}</div>
            <div className="text-[10px] uppercase tracking-widest text-[var(--text-faint)] mt-1">{over.headlineLabel}</div>
          </div>

          {(over.previousBest || over.rivalBest) && (
            <div className="flex items-center gap-4 text-xs text-[var(--text-secondary)]">
              {over.previousBest && <span>Бұрынғы: {over.previousBest}</span>}
              {over.rivalBest && <span>Серіктес: {over.rivalBest}</span>}
            </div>
          )}
          {over.gap && <p className="text-[11px] text-[var(--accent)] font-medium">{over.gap}</p>}
          {rewardNote && (
            <p className="text-[11px] text-[var(--accent-2)] font-semibold flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" /> {rewardNote}
            </p>
          )}
          {over.pendingSync && (
            <p className="text-[10px] text-[var(--text-faint)]">⏳ Нәтиже желіміз қалпа келгенде жасалады</p>
          )}
          {over.stats.length > 0 && (
            <div className="flex items-center justify-center gap-1.5 flex-wrap text-[10px] text-[var(--text-muted)]">
              {over.stats.map((s) => (
                <span key={s.label} className="px-2 py-1 rounded-full bg-[var(--bg-soft)] border border-[var(--border)]">
                  {s.label}: <b className="text-[var(--text-secondary)]">{s.value}</b>
                </span>
              ))}
            </div>
          )}
          <div className="mt-2 grid grid-cols-2 gap-2 w-full max-w-[300px]">
            <button
              onClick={shell.restart}
              className="px-4 py-3 min-h-[48px] rounded-2xl btn-gold text-sm font-semibold flex items-center justify-center gap-1.5 active:scale-95 transition"
            >
              <RotateCcw className="w-4 h-4" /> Қайта ойнау
            </button>
            <button
              onClick={() => {
                gameAudio.play('button');
                onAnotherGame();
              }}
              className="px-4 py-3 min-h-[48px] rounded-2xl bg-[var(--bg-soft)] border border-[var(--border)] text-[var(--text-secondary)] text-sm font-semibold flex items-center justify-center gap-1.5 active:scale-95 transition"
            >
              <Shuffle className="w-4 h-4" /> Басқа ойын
            </button>
            <button
              onClick={() => {
                gameAudio.play('button');
                onOpenLeaderboard();
              }}
              className="px-4 py-3 min-h-[44px] rounded-2xl bg-[var(--bg-soft)] border border-[var(--border)] text-[var(--text-secondary)] text-xs font-semibold flex items-center justify-center gap-1.5 active:scale-95 transition"
            >
              <Trophy className="w-3.5 h-3.5" /> Рекордтар
            </button>
            <button
              onClick={() => {
                gameAudio.play('button');
                onHome();
              }}
              className="px-4 py-3 min-h-[44px] rounded-2xl bg-[var(--bg-soft)] border border-[var(--border)] text-[var(--text-secondary)] text-xs font-semibold flex items-center justify-center gap-1.5 active:scale-95 transition"
            >
              <Home className="w-3.5 h-3.5" /> Негізгі бет
            </button>
          </div>
        </div>
      )}

      {tutorialOpen && (
        <TutorialBox gameId={gameId} steps={mission.steps} onClose={() => setTutorialOpen(false)} />
      )}
    </div>
  );
};

const LifeDot = function LifeDot({ filled, key: _k }: { filled: boolean; key?: React.Key }): React.ReactElement {
  return (
    <svg width="13" height="13" viewBox="0 0 40 40" aria-hidden>
      <path
        d="M20 35.5 C 8.5 27 3 19.5 3 12.6 C 3 6.6 7.3 3 11.9 3 C 15.6 3 18.5 5 20 8 C 21.5 5 24.4 3 28.1 3 C 32.7 3 37 6.6 37 12.6 C 37 19.5 31.5 27 20 35.5 Z"
        fill={filled ? '#E5484D' : 'none'}
        stroke={filled ? 'none' : 'var(--locked-fill)'}
        strokeWidth="3"
      />
    </svg>
  );
}

function CountdownNumber({ step }: { step: number }): React.ReactElement {
  const isStart = step === 0;
  return (
    <div
      key={step}
      className={`anim-count font-serif font-light text-[var(--accent)] drop-shadow-[0_0_25px_var(--accent-glow-strong)] ${
        isStart ? 'text-4xl italic' : 'text-7xl tabular-nums'
      }`}
    >
      {isStart ? 'Баста!' : String(step)}
    </div>
  );
}
