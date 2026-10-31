// Determines what opens after the daily game: the classic letter or an
// "about me" question. The choice is ALWAYS derived from stored data —
// built-in letters + the admin's per-day override — never from Math.random,
// so reloading the page or switching devices can never change what opens.
//
// Backward compatibility: overrides written before this feature (and days
// with no override at all) are treated as letters.

import { DAILY_MESSAGES } from '../data/constants';
import type { DailyContent, DailyMessage } from '../types';
import type { MessageOverride } from './adminUtils';

const LETTER_MAX_LENGTH = 1000;

// Deprecated / unknown categories fall back to 'relationship'.
function normalizeCategory(value: unknown): DailyContent['questionCategory'] {
  const allowed = ['favorites', 'memory', 'relationship', 'future', 'fun'];
  return allowed.includes(value as string) ? (value as DailyContent['questionCategory']) : 'relationship';
}

// Kazakh labels for the question categories (modal + admin panel).
export const QUESTION_CATEGORY_LABELS: Record<string, string> = {
  favorites: 'Таңдаулылар',
  memory: 'Естеліктер',
  relationship: 'Қатынас',
  future: 'Болашақ',
  fun: 'Қызық',
};

export function getQuestionId(dayNumber: number): string {
  return `day-${dayNumber}-question`;
}

// Builds a content object for a day by merging the built-in rotation letter
// with the admin's override (if any). Pure and synchronous — same inputs,
// same output, everywhere.
export function buildDailyContent(
  dayNumber: number,
  override?: MessageOverride
): DailyContent {
  const safeDay = Math.max(1, Math.floor(dayNumber));
  const base: DailyMessage = {
    ...DAILY_MESSAGES[(safeDay - 1) % DAILY_MESSAGES.length],
    dayNumber: safeDay,
  };

  if (override && override.contentType === 'question') {
    return {
      dayNumber: safeDay,
      contentType: 'question',
      questionId: override.questionId || getQuestionId(safeDay),
      question: (override.question || '').slice(0, LETTER_MAX_LENGTH),
      questionHint: override.questionHint || '',
      questionCategory: normalizeCategory(override.questionCategory),
    };
  }

  // Built-in question day (a `question` entry in constants.ts) — used when
  // the admin hasn't touched this day at all; any admin override wins.
  if (!override && typeof base.question === 'string' && base.question.trim()) {
    return {
      dayNumber: safeDay,
      contentType: 'question',
      questionId: base.questionId || getQuestionId(safeDay),
      question: base.question.slice(0, LETTER_MAX_LENGTH),
      questionHint: base.questionHint || '',
      questionCategory: normalizeCategory(base.questionCategory),
    };
  }

  // Letter (default). Override's letter fields win field-by-field, exactly
  // like the old applyMessageOverride behavior.
  return {
    dayNumber: safeDay,
    contentType: 'letter',
    title: override?.title ?? base.title,
    text: override?.text ?? base.text,
    hint: override?.hint ?? base.hint,
    voiceUrl: override?.voiceUrl ?? base.voiceUrl,
  };
}

// The day's content type given the current override map (already fetched
// from the server). Everything unknown counts as a letter.
export function getDailyContentType(dayNumber: number, override?: MessageOverride): 'letter' | 'question' {
  if (override?.contentType === 'question') return 'question';
  if (!override) {
    const base = DAILY_MESSAGES[(Math.max(1, Math.floor(dayNumber)) - 1) % DAILY_MESSAGES.length];
    if (typeof base.question === 'string' && base.question.trim()) return 'question';
  }
  return 'letter';
}

// True when the answer text is acceptable: at least 1 visible character,
// at most 1000, not only whitespace.
export function validateAnswer(answer: string): { ok: boolean; error?: string } {
  const trimmed = answer.trim();
  if (!trimmed) return { ok: false, error: 'Жауапты жазыңыз.' };
  if (trimmed.length > 1000) return { ok: false, error: 'Жауап 1000 символдан аспауы керек.' };
  return { ok: true };
}
