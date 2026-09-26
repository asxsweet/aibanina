import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { Heart, Sparkles, Volume2, VolumeX, RotateCcw } from 'lucide-react';
import { StoryStage, StoryStatus } from '../types';
import { fetchStoryStages, fetchStoryStatus, answerStory } from '../utils/storyUtils';

interface OurStorySectionProps {
  onExit: () => void;
}

// Playful, ever-so-slightly-teasing lines cycled through as she keeps
// tapping "Ойланып көрейін..." instead of "Иә" — mirrors the reference
// script's tone without ever actually blocking or annoying her.
const DODGE_CAPTIONS = [
  'Шынымен ойланып көргің келе ме? 🥺',
  'Мен күте аламын... ❤️',
  'Бір кішкентай «Иә» жеткілікті ғой 😌❤️',
  'Әлі де ойланып жатырсың ба? 😄',
  'Жүрегім сені күтіп тұр... ❤️',
];

function findStage(stages: StoryStage[], key: string): StoryStage | undefined {
  return stages.find((s) => s.key === key);
}

// A single reveal beat — fades/slides in once it scrolls into view, never
// re-triggers (viewport once: true), matching the "scroll reveal" the
// original script asked for.
const Beat: React.FC<{ children: React.ReactNode; delay?: number }> = ({ children, delay = 0 }) => (
  <motion.div
    initial={{ opacity: 0, y: 28 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true, amount: 0.5 }}
    transition={{ duration: 0.7, delay, ease: 'easeOut' }}
  >
    {children}
  </motion.div>
);

const NUMBERED_KEYS = ['met', 'knew', 'used_to', 'waited', 'thought'];
const NUMBER_LABEL: Record<string, string> = {
  met: '01',
  knew: '02',
  used_to: '03',
  waited: '04',
  thought: '05',
};

export const OurStorySection: React.FC<OurStorySectionProps> = ({ onExit }) => {
  const [stages, setStages] = useState<StoryStage[]>([]);
  const [status, setStatus] = useState<StoryStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [viewMode, setViewMode] = useState<'recap' | 'full'>('recap');

  // The "Ойланып көрейін..." playful dodge
  const [dodgeCount, setDodgeCount] = useState(0);
  const [dodgeOffset, setDodgeOffset] = useState({ x: 0, y: 0 });

  const [answering, setAnswering] = useState(false);
  const [justAnswered, setJustAnswered] = useState(false); // true only during this session's celebration
  const [answerError, setAnswerError] = useState('');

  const [musicOn, setMusicOn] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    Promise.all([fetchStoryStages(), fetchStoryStatus()])
      .then(([st, stat]) => {
        setStages(st);
        setStatus(stat);
        setViewMode(stat.answered ? 'recap' : 'full');
      })
      .catch(() => setLoadError('Тарихты жүктеу мүмкін болмады. Қайта байқап көр.'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!audioRef.current) return;
    if (musicOn) audioRef.current.play().catch(() => {});
    else audioRef.current.pause();
  }, [musicOn]);

  const alreadyAnswered = !!status?.answered;
  const showQuestionInteractive = !alreadyAnswered && !justAnswered;
  const showFinale = alreadyAnswered || justAnswered;

  const dodgeTap = () => {
    setDodgeOffset({ x: (Math.random() - 0.5) * 60, y: (Math.random() - 0.5) * 18 });
    setDodgeCount((c) => c + 1);
  };

  const handleYes = async () => {
    if (answering) return;
    setAnswering(true);
    setAnswerError('');
    try {
      const updated = await answerStory(dodgeCount);
      setStatus(updated);
      setJustAnswered(true);
    } catch (err) {
      setAnswerError(err instanceof Error ? err.message : 'Қайталап көр.');
    } finally {
      setAnswering(false);
    }
  };

  const heartBurst = useMemo(
    () =>
      Array.from({ length: 26 }, (_, i) => ({
        id: i,
        left: Math.random() * 100,
        drift: (Math.random() - 0.5) * 120,
        duration: 1.8 + Math.random() * 1.4,
        delay: Math.random() * 0.6,
        size: 14 + Math.random() * 20,
        emoji: i % 5 === 0 ? '💫' : i % 3 === 0 ? '💖' : '❤️',
      })),
    [justAnswered]
  );

  const intro = findStage(stages, 'intro');
  const realized = findStage(stages, 'realized');
  const question = findStage(stages, 'question');
  const finalStage = findStage(stages, 'final');
  const musicUrl = status?.musicUrl;

  if (loading) {
    return (
      <div className="w-full max-w-xl mx-auto px-4 py-16 flex justify-center">
        <Sparkles className="w-7 h-7 animate-spin text-[var(--accent)]" />
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="w-full max-w-xl mx-auto px-4 py-16 text-center">
        <p className="text-sm text-rose-500">{loadError}</p>
      </div>
    );
  }

  // --- Recap: she already said yes, this is the quick "keepsake" view -----
  if (viewMode === 'recap') {
    return (
      <div className="w-full max-w-xl mx-auto px-4 py-10 flex flex-col items-center text-center gap-4">
        <Heart className="w-8 h-8 text-[var(--accent)] fill-[var(--accent)]/40 animate-pulse-glow rounded-full" />
        <h2 className="font-serif text-2xl italic text-[var(--accent)]">{finalStage?.title}</h2>
        <p className="text-sm text-[var(--text)] leading-relaxed whitespace-pre-line font-serif italic max-w-sm">
          {finalStage?.text}
        </p>
        <button
          onClick={() => setViewMode('full')}
          className="mt-2 px-4 py-2 rounded-xl border border-[var(--border)] bg-[var(--bg-card)] text-xs font-medium text-[var(--text-secondary)] flex items-center gap-1.5"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          Тарихты басынан қарау
        </button>
      </div>
    );
  }

  return (
    <div className="w-full max-w-xl mx-auto px-4 py-8 flex flex-col gap-24 pb-24 relative">
      {musicUrl && (
        <>
          <audio ref={audioRef} src={musicUrl} loop />
          <button
            onClick={() => setMusicOn((v) => !v)}
            className="fixed top-4 left-4 z-20 p-2.5 rounded-full bg-[var(--bg-card)]/90 border border-[var(--border)] text-[var(--text-secondary)] backdrop-blur-md shadow-sm"
            aria-label="Музыка"
          >
            {musicOn ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>
        </>
      )}

      {/* Intro */}
      {intro && (
        <Beat>
          <div className="text-center flex flex-col items-center gap-4 pt-6">
            <Heart className="w-7 h-7 text-[var(--accent)] fill-[var(--accent)]/30" />
            <p className="font-serif text-xl italic text-[var(--text)] leading-relaxed max-w-sm">{intro.title}</p>
            <p className="text-sm text-[var(--text-secondary)] leading-relaxed max-w-sm">{intro.text}</p>
          </div>
        </Beat>
      )}

      {/* 5 numbered beats */}
      {NUMBERED_KEYS.map((key) => {
        const stage = findStage(stages, key);
        if (!stage) return null;
        return (
          <Beat key={key}>
            <div className="rounded-[28px] bg-[var(--bg-card)] border border-[var(--border)] p-6 shadow-sm">
              <span className="block text-4xl font-serif italic text-[var(--accent)]/30 font-bold mb-1">
                {NUMBER_LABEL[key]}
              </span>
              <h3 className="font-serif text-xl italic text-[var(--text)] mb-2">{stage.title}</h3>
              <p className="text-sm text-[var(--text-secondary)] leading-relaxed">{stage.text}</p>
              {stage.photoUrl && (
                <img
                  src={stage.photoUrl}
                  alt={stage.title}
                  className="mt-4 w-full rounded-2xl border border-[var(--border)] object-cover max-h-72"
                />
              )}
              {key === 'waited' && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.5, duration: 0.4 }}
                  className="mt-4 inline-block px-3 py-1.5 rounded-2xl rounded-bl-sm bg-[var(--accent)]/10 text-[var(--accent)] text-xs font-medium"
                >
                  💬 Сәлем :)
                </motion.div>
              )}
            </div>
          </Beat>
        );
      })}

      {/* Dramatic reveal: "realized" — sequential lines with staggered delay */}
      {realized && (
        <Beat>
          <div className="text-center flex flex-col items-center gap-5 py-8">
            {realized.text.split('\n\n').map((line, i) => (
              <motion.p
                key={i}
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.9, duration: 0.8 }}
                className={
                  i === realized.text.split('\n\n').length - 2
                    ? 'font-serif text-2xl sm:text-3xl italic text-[var(--accent)] font-bold'
                    : 'text-sm text-[var(--text-secondary)]'
                }
              >
                {line}
              </motion.p>
            ))}
          </div>
        </Beat>
      )}

      {/* The big question */}
      {question && (
        <Beat>
          <div className="rounded-[28px] bg-[var(--bg-card)] border border-[var(--border)] p-6 shadow-sm text-center flex flex-col items-center gap-4">
            {question.text.split('\n\n').map((line, i) => (
              <p key={i} className="text-sm text-[var(--text-secondary)]">
                {line}
              </p>
            ))}

            <motion.div
              animate={{ scale: [1, 1.12, 1] }}
              transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
            >
              <Heart className="w-12 h-12 text-[var(--accent)] fill-[var(--accent)]/50" />
            </motion.div>

            <h2 className="font-serif text-2xl sm:text-3xl italic text-[var(--accent)] font-bold">
              {question.title}
            </h2>

            {showQuestionInteractive ? (
              <>
                {answerError && <p className="text-xs text-rose-500">{answerError}</p>}
                <div className="relative w-full flex flex-col items-center gap-3 pt-2">
                  <button
                    onClick={handleYes}
                    disabled={answering}
                    className="px-8 py-3 rounded-2xl btn-gold text-base font-bold disabled:opacity-60"
                  >
                    {answering ? 'Жіберілуде...' : 'Иә ❤️'}
                  </button>
                  <motion.button
                    animate={{ x: dodgeOffset.x, y: dodgeOffset.y }}
                    transition={{ type: 'spring', stiffness: 300, damping: 16 }}
                    onClick={dodgeTap}
                    className="px-6 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--bg-soft)] text-sm text-[var(--text-secondary)]"
                  >
                    Ойланып көрейін...
                  </motion.button>
                  {dodgeCount > 0 && (
                    <p className="text-xs text-[var(--text-faint)] h-4">
                      {DODGE_CAPTIONS[Math.min(dodgeCount - 1, DODGE_CAPTIONS.length - 1)]}
                    </p>
                  )}
                </div>
              </>
            ) : (
              <p className="text-xs text-[var(--text-faint)] italic">Жауап бұрыннан берілген ❤️</p>
            )}
          </div>
        </Beat>
      )}

      {/* Finale — appears once answered (this session or before) */}
      {showFinale && finalStage && (
        <Beat>
          <div className="relative text-center flex flex-col items-center gap-4 py-4">
            {justAnswered && (
              <div className="fixed inset-0 z-10 pointer-events-none overflow-hidden">
                {heartBurst.map((p) => (
                  <span
                    key={p.id}
                    className="absolute bottom-0 animate-float-up select-none"
                    style={{
                      left: `${p.left}%`,
                      fontSize: p.size,
                      // @ts-ignore — custom properties consumed by the keyframe
                      '--drift': `${p.drift}px`,
                      '--float-duration': `${p.duration}s`,
                      '--float-delay': `${p.delay}s`,
                    }}
                  >
                    {p.emoji}
                  </span>
                ))}
              </div>
            )}
            <Heart className="w-9 h-9 text-[var(--accent)] fill-[var(--accent)]/40" />
            <h2 className="font-serif text-2xl italic text-[var(--accent)]">{finalStage.title}</h2>
            <p className="text-sm text-[var(--text)] leading-relaxed whitespace-pre-line font-serif italic max-w-sm">
              {finalStage.text}
            </p>
            <button
              onClick={onExit}
              className="mt-2 px-5 py-2.5 rounded-xl btn-gold text-sm font-bold"
            >
              Жалғастыру
            </button>
          </div>
        </Beat>
      )}
    </div>
  );
};
