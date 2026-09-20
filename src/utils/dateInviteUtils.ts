import { DateInvite, DatePlanOption } from '../types';

const API_BASE = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');

// --- "Where to go" options list (fully admin-managed) -----------------------

export async function fetchDatePlanOptions(): Promise<DatePlanOption[]> {
  const res = await fetch(`${API_BASE}/api/date-plan-options`);
  if (!res.ok) throw new Error('Нұсқаларды жүктеу мүмкін болмады.');
  const data = await res.json();
  return (data.options || []) as DatePlanOption[];
}

export async function addDatePlanOption(label: string): Promise<DatePlanOption> {
  const res = await fetch(`${API_BASE}/api/date-plan-options`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ label }),
  });
  if (!res.ok) throw new Error('Нұсқа қосу мүмкін болмады.');
  const data = await res.json();
  return data.option as DatePlanOption;
}

export async function editDatePlanOption(id: string, label: string): Promise<DatePlanOption> {
  const res = await fetch(`${API_BASE}/api/date-plan-options/${encodeURIComponent(id)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ label }),
  });
  if (!res.ok) throw new Error('Нұсқаны өзгерту мүмкін болмады.');
  const data = await res.json();
  return data.option as DatePlanOption;
}

export async function deleteDatePlanOption(id: string): Promise<void> {
  const res = await fetch(`${API_BASE}/api/date-plan-options/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error('Нұсқаны өшіру мүмкін болмады.');
}

// --- The invite itself -------------------------------------------------------

// The most recent invite (any status), or null if the admin has never
// sent one yet — used both to render the "Свидание" section and to poll
// for a brand-new pending invite (see App.tsx's notification logic).
export async function fetchActiveDateInvite(): Promise<DateInvite | null> {
  const res = await fetch(`${API_BASE}/api/date-invite/active`);
  if (!res.ok) throw new Error('Шақыруды жүктеу мүмкін болмады.');
  const data = await res.json();
  return (data.invite || null) as DateInvite | null;
}

// Admin grants access with just an optional personal note. WHICH place,
// WHICH day and WHAT time are all deliberately not part of this payload —
// she picks all three herself once she opens the invite (see
// respondToDateInvite below), from the admin-managed options list.
export async function sendDateInvite(note: string): Promise<DateInvite> {
  const res = await fetch(`${API_BASE}/api/date-invite`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ note }),
  });
  if (!res.ok) throw new Error('Шақыруды жіберу мүмкін болмады.');
  const data = await res.json();
  return data.invite as DateInvite;
}

// Admin edits the still-pending invite's note without retracting and
// resending a brand-new one.
export async function editDateInviteNote(note: string): Promise<DateInvite> {
  const res = await fetch(`${API_BASE}/api/date-invite/active`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ note }),
  });
  if (!res.ok) throw new Error('Өзгертулерді сақтау мүмкін болмады.');
  const data = await res.json();
  return data.invite as DateInvite;
}

// She says yes AND submits the place/day/time she picked in the same call —
// this is the single "seal it" step at the end of her own
// ask -> pick place/day/time flow (see DateInviteSection.tsx).
export async function respondToDateInvite(
  id: string,
  day: string,
  time: string,
  plan: string,
  planLabel: string,
  dodgeCount: number
): Promise<DateInvite> {
  const res = await fetch(`${API_BASE}/api/date-invite/${id}/respond`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ day, time, plan, planLabel, dodgeCount }),
  });
  if (!res.ok) throw new Error('Жауапты жіберу мүмкін болмады.');
  const data = await res.json();
  return data.invite as DateInvite;
}

// Retracts the current invite entirely — the "Свидание" section goes back
// to its locked state, as if nothing had been sent yet.
export async function cancelDateInvite(): Promise<void> {
  const res = await fetch(`${API_BASE}/api/date-invite/active`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Шақыруды болдырмау мүмкін болмады.');
}
