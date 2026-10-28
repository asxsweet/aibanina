import React, { useState } from 'react';
import { X, Flame, Star, RotateCcw, Sparkles, BookOpen, Heart, Check, Gauge, UserRound, ChevronRight, Lock, Shield } from 'lucide-react';
import { UserProgress } from '../types';
import { DAILY_MESSAGES, MILESTONE_BONUSES } from '../data/constants';
import { DifficultyName, getUnlockedThemes } from '../utils/constellationUtils';
import { THEME_IDS, THEME_META, ThemeName } from '../data/themes';
import { MAX_SHIELDS, SHIELD_EVERY_STREAK, SHIELD_PRICE, PEEK_PRICE, WISH_PRICE, DAILY_STAR_STARDUST } from '../utils/streakUtils';
import { AppUser } from '../utils/authUtils';
import { useGameSettings, updateGameSettings, type GameQuality } from '../utils/gameSettings';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  progress: UserProgress;
  user?: AppUser;
  onLogout?: () => void;
  onResetProgress: () => void;
  onUnlockNextDayDev: () => void;
  onSetTheme: (theme: ThemeName) => void;
  onSetDifficulty: (difficulty: DifficultyName) => void;
  onOpenProfile: () => void;
}

// Streak needed to unlock each theme — used only to show a "Стрик: N" label
// next to a still-locked one.
const THEME_UNLOCK_STREAK: Partial<Record<ThemeName, number>> = Object.fromEntries(
  MILESTONE_BONUSES.map((m) => [m.theme, m.streak])
);

const THEME_OPTIONS: { id: ThemeName; label: string; icon: React.ElementType }[] = THEME_IDS.map((id) => ({
  id,
  label: THEME_META[id].label,
  icon: THEME_META[id].icon,
}));

const DIFFICULTY_OPTIONS: { id: DifficultyName; label: string }[] = [
  { id: 'easy', label: 'Жеңіл' },
  { id: 'medium', label: 'Орташа' },
  { id: 'hard', label: 'Қиын' },
];

const QUALITY_OPTIONS: { id: GameQuality; label: string }[] = [
  { id: 'auto', label: 'Автоматты' },
  { id: 'high', label: 'Жоғары' },
  { id: 'eco', label: 'Үнемді' },
];

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  progress,
  onResetProgress,
  onUnlockNextDayDev,
  onSetTheme,
  onSetDifficulty,
  onOpenProfile,
}) => {
  const [activeTab, setActiveTab] = useState<'rules' | 'archive' | 'settings'>('rules');
  const [confirmReset, setConfirmReset] = useState(false);
  const currentTheme: ThemeName = (progress.theme as ThemeName) || 'day';
  const currentDifficulty: DifficultyName = (progress.difficulty as DifficultyName) || 'medium';
  const unlockedThemes = getUnlockedThemes(progress);
  // Six-game preferences (sounds / music / vibrate / quality) — device-local.
  const gamePrefs = useGameSettings();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[var(--overlay)] backdrop-blur-md">
      <div className="relative w-full max-w-md bg-[var(--bg-elevated)]/95 rounded-[32px] sm:rounded-[40px] p-6 border border-[var(--border)] backdrop-blur-2xl shadow-[0_20px_50px_var(--overlay)] overflow-hidden max-h-[85vh] flex flex-col">
        {/* Top Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[var(--border)]">
          <h2 className="font-serif text-xl font-light italic text-[var(--accent)] flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-[var(--accent)]" />
            <span>Біздің шоқжұлдыз</span>
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full bg-[var(--bg-soft)] text-[var(--text-muted)] hover:text-[var(--text)] transition"
            aria-label="Жабу"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-1 my-3 p-1 rounded-2xl bg-[var(--bg-soft)] border border-[var(--border)] text-xs">
          <button
            onClick={() => setActiveTab('rules')}
            className={`flex-1 py-1.5 rounded-xl font-medium transition ${
              activeTab === 'rules'
                ? 'btn-gold font-bold shadow-sm'
                : 'text-[var(--text-muted)] hover:text-[var(--text)]'
            }`}
          >
            Ережелер
          </button>
          <button
            onClick={() => setActiveTab('archive')}
            className={`flex-1 py-1.5 rounded-xl font-medium transition ${
              activeTab === 'archive'
                ? 'btn-gold font-bold shadow-sm'
                : 'text-[var(--text-muted)] hover:text-[var(--text)]'
            }`}
          >
            Мұрағат ({progress.daysPlayed})
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={`flex-1 py-1.5 rounded-xl font-medium transition ${
              activeTab === 'settings'
                ? 'btn-gold font-bold shadow-sm'
                : 'text-[var(--text-muted)] hover:text-[var(--text)]'
            }`}
          >
            Баптаулар
          </button>
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto py-2 text-xs text-[var(--text-secondary)] leading-relaxed font-light space-y-3">
          {/* RULES TAB */}
          {activeTab === 'rules' && (
            <div className="space-y-3">
              <div className="p-3.5 rounded-2xl bg-[var(--bg-card)] border border-[var(--border)]">
                <div className="flex items-center gap-2 text-[var(--accent)] font-semibold text-sm mb-1">
                  <Flame className="w-4 h-4 text-[var(--accent)]" />
                  <span>Стрик қалай жұмыс істейді?</span>
                </div>
                <p>
                  Бір күн = бір жаңа жұлдыз. Күн сайын кіріп, қысқа мини-ойынды өтіп, тек бір жаңа хабарлама аш. Егер бір күнді өткізіп алсаң және қалқаның болмаса, стрик 1-ден қайта басталады — бірақ шоқжұлдыз бәрібір өсе береді, ешбір жұлдыз жоғалмайды.
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-[var(--bg-card)] border border-[var(--border)]">
                <div className="flex items-center gap-2 text-[var(--accent-2)] font-semibold text-sm mb-1">
                  <Star className="w-4 h-4 text-[var(--accent-2)]" />
                  <span>Өсіп келе жатқан шоқжұлдыз</span>
                </div>
                <p>
                  Әр күн шоқжұлдызға тек бір жарқыраған жұлдыз қосады. Прогресс пен жұлдыздар сақталады және мұрағатыңда мәңгі қалады.
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-[var(--bg-card)] border border-[var(--border)]">
                <div className="flex items-center gap-2 text-[var(--accent)] font-semibold text-sm mb-1">
                  <Shield className="w-4 h-4 text-[var(--accent)]" />
                  <span>Жұлдыз қалқаны</span>
                </div>
                <p>
                  Стрик әр {SHIELD_EVERY_STREAK}-күн сайын (7, 14, 21…) саған 1 қалқан сыйлайды. Бір күнді өткізіп алсаң, қалқан автоматты түрде стрикті сақтап қалады. Бір мезгілде ең көбі {MAX_SHIELDS} қалқан сақтауға болады, ал қалқан жетпесе, оны жұлдыз тозаңына ({SHIELD_PRICE} ✨) сатып алуға болады.
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-[var(--bg-card)] border border-[var(--border)]">
                <div className="flex items-center gap-2 text-[var(--accent-2)] font-semibold text-sm mb-1">
                  <Sparkles className="w-4 h-4 text-[var(--accent-2)]" />
                  <span>Жұлдыз тозаңы ✨</span>
                </div>
                <p>
                  Күнделікті жұлдызбен бірге {DAILY_STAR_STARDUST} ✨ аласың, ал бонустық ойындар да аздап тозаң береді (күніне шектеулі). Тозаңға мыналарды алуға болады: қалқан ({SHIELD_PRICE} ✨), ертеңгі жұлдыздың атына сығалау ({PEEK_PRICE} ✨) және саған тілек жіберу ({WISH_PRICE} ✨).
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-[var(--bg-card)] border border-[var(--border)]">
                <div className="flex items-center gap-2 text-[var(--accent)] font-semibold text-sm mb-1">
                  <Heart className="w-4 h-4 text-[var(--accent)]" />
                  <span>Бонустық ойын</span>
                </div>
                <p>
                  Егер бүгін жұлдызды алып қойған болсаң, жай ғана рахаттану үшін тағы ойнауға болады. Бұл — жаңа жұлдыз ашпайтын және стрикке әсер етпейтін бонустық ойын, бірақ ол аздап жұлдыз тозаңын береді ✨.
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-[var(--bg-card)] border border-[var(--border)]">
                <div className="flex items-center gap-2 text-[var(--accent)] font-semibold text-sm mb-1">
                  <BookOpen className="w-4 h-4 text-[var(--accent)]" />
                  <span>Дауыстық жұлдыздар</span>
                </div>
                <p>
                  Әр аптада (7, 14, 21 және 28-күндер) әдеттегі мәтін орнына жұлдызда қысқа дауыс жазбасы жасырылған.
                </p>
              </div>
            </div>
          )}

          {/* ARCHIVE TAB */}
          {activeTab === 'archive' && (
            <div className="space-y-2">
              {progress.daysPlayed === 0 ? (
                <div className="text-center py-8 text-[var(--text-faint)] italic">
                  Әзірге бірде-бір жұлдыз жинамадың. Алғашқы ойынды ойна!
                </div>
              ) : (
                DAILY_MESSAGES.slice(0, Math.min(progress.daysPlayed, DAILY_MESSAGES.length)).map((msg) => (
                  <div
                    key={msg.id}
                    className="p-3.5 rounded-2xl bg-[var(--bg-card)] border border-[var(--border)] hover:border-[var(--accent)]/40 transition"
                  >
                    <div className="flex items-center justify-between font-semibold text-[var(--accent)] mb-1">
                      <span>
                        Жұлдыз №{msg.dayNumber}: {msg.title}
                      </span>
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                    </div>
                    <p className="italic text-[11px] text-[var(--text-muted)] font-serif line-clamp-2">
                      «{msg.text}»
                    </p>
                  </div>
                ))
              )}
            </div>
          )}

          {/* SETTINGS TAB */}
          {activeTab === 'settings' && (
            <div className="space-y-3">
              {/* Profile link */}
              <button
                onClick={onOpenProfile}
                className="w-full flex items-center justify-between p-3.5 rounded-2xl bg-[var(--bg-card)] border border-[var(--border)] hover:border-[var(--accent)]/40 transition text-left"
              >
                <div className="flex items-center gap-2">
                  <UserRound className="w-4 h-4 text-[var(--accent)]" />
                  <span className="font-semibold text-[var(--accent)] text-xs">Профиль — атың және өзің туралы</span>
                </div>
                <ChevronRight className="w-4 h-4 text-[var(--text-faint)]" />
              </button>

              {/* Difficulty selector */}
              <div className="p-3.5 rounded-2xl bg-[var(--bg-card)] border border-[var(--border)]">
                <div className="flex items-center gap-2 font-semibold text-[var(--accent)] mb-1 text-xs">
                  <Gauge className="w-4 h-4 text-[var(--accent)]" />
                  Ойын қиындығы
                </div>
                <p className="text-[11px] text-[var(--text-muted)] mb-2">
                  Кез келген сәтте ауыстыруға болады — прогресс сақталады.
                </p>
                <div className="grid grid-cols-3 gap-2">
                  {DIFFICULTY_OPTIONS.map(({ id, label }) => (
                    <button
                      key={id}
                      onClick={() => onSetDifficulty(id)}
                      className={`py-2 rounded-xl text-xs font-semibold border transition ${
                        currentDifficulty === id
                          ? 'btn-gold'
                          : 'bg-[var(--bg-soft)] text-[var(--text-muted)] border-[var(--border)]'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Mini-game device preferences */}
              <div className="p-3.5 rounded-2xl bg-[var(--bg-card)] border border-[var(--border)]">
                <div className="flex items-center gap-2 font-semibold text-[var(--accent)] mb-2 text-xs">
                  <Sparkles className="w-4 h-4 text-[var(--accent)]" />
                  Ойын дыбыстары мен сапасы
                </div>
                <div className="space-y-1.5">
                  {(
                    [
                      { key: 'sfx', label: 'Ойын дыбыстары', hint: 'Түртудің, ұпайдың, рекордтың жіңішке дыбысы' },
                      { key: 'music', label: 'Ойын музыкасы', hint: 'Ерен жылы рояль-пады, әдепкі бойынша өшік' },
                      { key: 'vibrate', label: 'Діріл', hint: 'Телефонның қысқа діріл кері байланысы' },
                    ] as const
                  ).map(({ key, label, hint }) => (
                    <button
                      key={key}
                      onClick={() => updateGameSettings({ [key]: !gamePrefs[key] } as { sfx?: boolean; music?: boolean; vibrate?: boolean })}
                      className="w-full flex items-center justify-between gap-2 py-2.5 min-h-[44px] px-2 rounded-xl active:bg-[var(--bg-soft)]/70 transition text-left"
                    >
                      <span className="min-w-0">
                        <span className="block font-semibold text-[var(--text)] text-[11px]">{label}</span>
                        <span className="block text-[10px] text-[var(--text-faint)] leading-snug">{hint}</span>
                      </span>
                      <span
                        className={`shrink-0 relative w-10 h-6 rounded-full transition ${
                          gamePrefs[key] ? 'bg-[var(--accent)]' : 'bg-[var(--locked-fill)]'
                        }`}
                      >
                        <span
                          className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all ${
                            gamePrefs[key] ? 'left-[18px]' : 'left-0.5'
                          }`}
                        />
                      </span>
                    </button>
                  ))}
                </div>
                <div className="mt-2 pt-2 border-t border-[var(--border)]">
                  <div className="font-semibold text-[var(--text)] text-[11px] mb-1">Ойын сапасы</div>
                  <p className="text-[10px] text-[var(--text-faint)] mb-2">
                    Үнемді режим жарық анимациялар сақтайды — әлсіз телефондар мен қозғалысқа сезімтал экрандар үшін.
                  </p>
                  <div className="grid grid-cols-3 gap-2">
                    {QUALITY_OPTIONS.map(({ id, label }) => (
                      <button
                        key={id}
                        onClick={() => updateGameSettings({ quality: id })}
                        className={`py-2 min-h-[44px] rounded-xl text-[11px] font-semibold border transition ${
                          gamePrefs.quality === id
                            ? 'btn-gold'
                            : 'bg-[var(--bg-soft)] text-[var(--text-muted)] border-[var(--border)]'
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Theme selector */}
              <div className="p-3.5 rounded-2xl bg-[var(--bg-card)] border border-[var(--border)]">
                <div className="font-semibold text-[var(--accent)] mb-1 text-xs">
                  Сайт безендірілуі
                </div>
                <p className="text-[11px] text-[var(--text-muted)] mb-2">
                  Ашылған темалар арасында кез келген сәтте еркін ауыса аласың — прогресс жоғалмайды. Қалғандары стрик өскен сайын ашылады.
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {THEME_OPTIONS.map(({ id, label, icon: Icon }) => {
                    const isUnlocked = unlockedThemes.includes(id);
                    const requiredStreak = THEME_UNLOCK_STREAK[id];
                    return (
                      <button
                        key={id}
                        onClick={() => isUnlocked && onSetTheme(id)}
                        disabled={!isUnlocked}
                        title={!isUnlocked ? `${requiredStreak} күндік стрикпен ашылады` : undefined}
                        className={`flex items-center justify-center gap-1.5 py-2 px-2 rounded-xl text-[11px] font-semibold border transition ${
                          currentTheme === id
                            ? 'btn-gold'
                            : isUnlocked
                            ? 'bg-[var(--bg-soft)] text-[var(--text-muted)] border-[var(--border)]'
                            : 'bg-[var(--bg-soft)] text-[var(--text-faint)] border-[var(--border)] opacity-60 cursor-not-allowed'
                        }`}
                      >
                        {isUnlocked ? <Icon className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
                        {isUnlocked ? label : `${label} · 🔥${requiredStreak}`}
                      </button>
                    );
                  })}
                </div>
              </div>

              

              <div className="p-3.5 rounded-2xl bg-rose-500/5 border border-rose-400/30">
                <div className="font-semibold text-rose-500 mb-1 text-xs">
                  Прогрессті тастау
                </div>
                <p className="text-[11px] text-rose-500/70 mb-2">
                  Ағымдағы стрикті және жиналған жұлдыздар санын нөлге түсіреді. Бұл әрекетті болдырмау мүмкін емес.
                </p>

                {confirmReset ? (
                  <div className="flex items-center gap-2 mt-2">
                    <button
                      onClick={() => {
                        onResetProgress();
                        setConfirmReset(false);
                      }}
                      className="flex-1 py-1.5 rounded-xl bg-rose-600 text-white font-bold text-xs"
                    >
                      Иә, бәрін тастаймын
                    </button>
                    <button
                      onClick={() => setConfirmReset(false)}
                      className="px-3 py-1.5 rounded-xl bg-[var(--bg-soft)] text-[var(--text-secondary)] text-xs"
                    >
                      Болдырмау
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setConfirmReset(true)}
                    className="w-full py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 font-medium border border-rose-400/40 text-xs transition flex items-center justify-center gap-1.5"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Барлық прогрессті тастау</span>
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Bottom footer note */}
        <div className="pt-3 border-t border-[var(--border)] text-center text-[10px] text-[var(--text-faint)] font-light">
         Менің саған деген махаббатым ❤️
        </div>
      </div>
    </div>
  );
};
