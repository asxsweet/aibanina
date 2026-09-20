export interface DailyMessage {
  id: number;
  dayNumber: number;
  title: string;
  text: string;
  hint?: string;
  voiceUrl?: string; // optional mp3 for the weekly voice-message days (every 7th day)
}

export interface UserProgress {
  lastPlayedDate: string | null; // YYYY-MM-DD
  rewardDate: string | null; // date when the daily star was awarded
  streak: number;
  daysPlayed: number;
  unlockedDays: number[]; // Array of day indices unlocked (e.g. [1, 2, 3])
  isBonusPlay?: boolean;
  soundEnabled: boolean;
  theme?: 'day' | 'night' | 'dawn' | 'mint' | 'velvet';
  difficulty?: 'easy' | 'medium' | 'hard';
  seenMilestones?: number[]; // streak milestones (7/14/21/30) whose bonus-unlock popup has already been shown
}

// A short two-way reply the partner can leave on a given day's star —
// a mood emoji and/or a few words back, so the daily ritual isn't
// one-directional.
export interface DailyReply {
  dayNumber: number;
  mood?: string; // a single emoji
  text?: string;
  updatedAt: number; // timestamp (ms)
}

// A letter locked until a specific future date — a "time capsule" the
// admin writes now that only becomes readable once unlockDate arrives.
export interface TimeCapsule {
  id: string;
  title: string;
  text: string;
  unlockDate: string; // YYYY-MM-DD
  createdAt: number; // timestamp (ms)
}

// One entry in the shared "dreams / plans to do together" checklist.
export interface DreamItem {
  id: string;
  text: string;
  isDone: boolean;
  createdBy: string; // display name of whoever added it
  createdAt: number; // timestamp (ms)
}

// A single "where to go" option in the admin-managed list — admin can add,
// edit, and delete these from the admin panel; the partner picks one of
// them herself, alongside her own day/time choice (see DateInvite below).
export interface DatePlanOption {
  id: string;
  label: string; // emoji + text, e.g. '☕ Кофе' — admin writes this freely
}

// A "will you go out with me?" invite the admin sends from the admin
// panel. IMPORTANT: admin only ever manages the destination OPTIONS LIST
// (see DatePlanOption) and an optional personal note in advance — WHERE
// (which option), WHEN (day) and WHAT TIME are all deliberately left for
// the partner to choose herself, right after she says yes, exactly like
// the reference video's flow (ask -> she picks place/day/time -> letter).
// So plan/day/time all start out null and only get filled in by her single
// respond call at the end.
export interface DateInvite {
  id: string;
  day: string | null; // YYYY-MM-DD — null until she picks it
  time: string | null; // HH:MM — null until she picks it
  plan: string | null; // the DatePlanOption id she picked — null until then
  planLabel: string | null; // its label, copied at response time — null until then
  note: string; // admin's personal note, folded into the generated letter
  status: 'pending' | 'accepted';
  dodgeCount: number; // how many times "No" was dodged before she said yes
  createdAt: number;
  respondedAt: number | null;
}

// The site's main sections, navigated via the hamburger menu in Header.
export type AppTab = 'all' | 'game' | 'map' | 'gallery' | 'date';

export interface StarNode {
  id: number;
  dayNumber: number;
  x: number;
  y: number;
  message: DailyMessage;
  unlocked: boolean;
  unlockedDate?: string;
}

export interface GameItem {
  id: string;
  x: number; // percentage 0-100
  y: number; // percentage 0-100
  speed: number;
  type: 'heart' | 'golden_star' | 'asteroid';
  size: number;
  rotation: number;
}

export interface Particle {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
  alpha: number;
}

export interface Photo {
  id: string;
  dataUrl: string; // base64 image/video data (resized client-side before upload)
  mediaType: 'photo' | 'video';
  caption: string;
  uploadedBy: string; // display name of whoever added it
  uploadedAt: number; // timestamp (ms)
  isFavorite: boolean;
  reactions: string[]; // active emoji reactions, e.g. ['😍', '🥰']
  linkedDay: number | null; // constellation day number this photo is attached to
}
