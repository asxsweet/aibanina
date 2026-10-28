import React, { useCallback, useEffect, useState } from 'react';
import {
  Loader2, Plane, HeartHandshake, PartyPopper, Gift, PenLine, AlertCircle, Check, Trash2, RefreshCw,
} from 'lucide-react';
import { DAILY_MESSAGES } from '../data/constants';
import { getCurrentUser } from '../utils/authUtils';
import { getTodayDateString } from '../utils/constellationUtils';
import { fetchUsersProgress } from '../utils/trackingUtils';
import {
  fetchMessageOverrides, saveMessageOverride, deleteMessageOverride, MessageOverride,
} from '../utils/adminUtils';
import {
  fetchJoint, checkinJoint, fetchMeeting, adminSetMeeting, adminClearMeeting,
  adminListSpecialDays, adminSaveSpecialDay, adminDeleteSpecialDay, adminSeedSpecialDays,
  adminListWishes, adminMarkWish, JointState, Meeting, AdminSpecialDay, WishRow,
} from '../utils/featureApi';
import { KK_MONTHS } from '../utils/streakUtils';

const card = 'rounded-2xl bg-[var(--bg-card)] border border-[var(--border)] p-4';
const input =
  'w-full rounded-xl border border-[var(--border)] bg-[var(--bg-soft)] px-3 py-2 text-sm text-[var(--text)] outline-none focus:border-[var(--accent)]/50';
const label = 'block text-[10px] uppercase tracking-[0.18em] text-[var(--text-faint)] mb-1';
const primary = 'px-4 py-2 rounded-full btn-gold text-xs font-bold active:scale-95 disabled:opacity-50';
const ghost =
  'px-3 py-1.5 rounded-full bg-[var(--bg-soft)] border border-[var(--border)] text-xs font-medium text-[var(--text-secondary)] hover:border-[var(--accent)]/40 active:scale-95';

const monthName = (m: number) => (KK_MONTHS[m - 1] || '').toLowerCase();

// --------------------------------------------------------------- content left

const ContentStatus: React.FC = () => {
  const [partnerDays, setPartnerDays] = useState<number | null>(null);
  const [overrides, setOverrides] = useState<MessageOverride[]>([]);
  const [loading, setLoading] = useState(true);

  const [dayNumber, setDayNumber] = useState('');
  const [title, setTitle] = useState('');
  const [text, setText] = useState('');
  const [hint, setHint] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const me = getCurrentUser()?.email;
      const [users, list] = await Promise.all([fetchUsersProgress(), fetchMessageOverrides()]);
      const others = users.filter((u) => u.userId !== me);
      setPartnerDays(others.reduce((max, u) => Math.max(max, u.daysPlayed), 0));
      setOverrides(list);
    } catch {
      setPartnerDays(null);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Built-in texts cover days 1..N; days after that only have fresh text if the
  // admin wrote it here (otherwise the app repeats the old messages).
  const builtIn = DAILY_MESSAGES.length;
  const written = new Set(overrides.filter((o) => o.title && o.text).map((o) => o.dayNumber));
  let coveredUntil = builtIn;
  while (written.has(coveredUntil + 1)) coveredUntil += 1;
  const daysLeft = partnerDays === null ? null : coveredUntil - partnerDays;
  const extraDays = overrides.filter((o) => o.dayNumber > builtIn).sort((a, b) => a.dayNumber - b.dayNumber);

  const tone =
    daysLeft === null ? 'info' : daysLeft <= 0 ? 'bad' : daysLeft <= 14 ? 'warn' : 'good';
  const toneClass = {
    info: 'bg-[var(--bg-card)] border-[var(--border)] text-[var(--text-secondary)]',
    good: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700',
    warn: 'bg-amber-500/10 border-amber-500/40 text-amber-700',
    bad: 'bg-rose-500/10 border-rose-400/40 text-rose-600',
  }[tone];

  const save = async () => {
    const day = parseInt(dayNumber || String(coveredUntil + 1), 10);
    if (!day || day < 1) return setError('Күн нөмірін дұрыс жаз.');
    if (!title.trim() || !text.trim()) return setError('Тақырып пен мәтін бос болмауы керек.');
    setBusy(true);
    setError('');
    try {
      await saveMessageOverride(day, { title: title.trim(), text: text.trim(), hint: hint.trim() });
      setDayNumber('');
      setTitle('');
      setText('');
      setHint('');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Сақтау мүмкін болмады.');
    }
    setBusy(false);
  };

  return (
    <div className={card}>
      <div className="flex items-center gap-2 font-semibold text-[var(--accent)] mb-2">
        <PenLine className="w-4 h-4" /> Жаңа күндердің мәтіні
      </div>

      <div className={`rounded-xl border px-3 py-2 text-xs flex items-start gap-2 ${toneClass}`}>
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />}
        <span>
          {loading
            ? 'Тексеріп жатырмын…'
            : daysLeft === null
            ? `Мәтін ${coveredUntil}-күнге дейін бар. Серіктестің прогресін оқу мүмкін болмады.`
            : daysLeft > 0
            ? `Мәтін ${coveredUntil}-күнге дейін жеткілікті. Серіктес ${partnerDays}-күнде, яғни ${daysLeft} күнге жетеді.`
            : `Мәтін біткен! Серіктес ${partnerDays}-күнде, ал бірегей мәтін ${coveredUntil}-күнге дейін ғана бар — қазір ескі хабарламалар қайталанады. Төменнен жаңа күндерді жаз.`}
        </span>
      </div>

      <p className="text-[11px] text-[var(--text-muted)] mt-3 mb-2">
        Жаңа күнді (мысалы, {coveredUntil + 1}-күн) осы жерден жаз — сайт оны дәл сол күні көрсетеді.
      </p>

      <div className="space-y-2">
        <div className="grid grid-cols-3 gap-2">
          <div>
            <span className={label}>Күн №</span>
            <input
              type="number"
              min={1}
              value={dayNumber}
              onChange={(e) => setDayNumber(e.target.value)}
              placeholder={String(coveredUntil + 1)}
              className={input}
            />
          </div>
          <div className="col-span-2">
            <span className={label}>Тақырып</span>
            <input type="text" value={title} maxLength={120} onChange={(e) => setTitle(e.target.value)} className={input} />
          </div>
        </div>
        <div>
          <span className={label}>Мәтін</span>
          <textarea value={text} maxLength={1000} rows={4} onChange={(e) => setText(e.target.value)} className={`${input} resize-none`} />
        </div>
        <div>
          <span className={label}>Қосымша сөз (hint)</span>
          <input type="text" value={hint} maxLength={200} onChange={(e) => setHint(e.target.value)} className={input} />
        </div>
        {error && <p className="text-xs text-rose-500">{error}</p>}
        <div className="flex justify-end">
          <button onClick={save} disabled={busy} className={primary}>
            {busy ? 'Сақталуда…' : 'Сақтау'}
          </button>
        </div>
      </div>

      {extraDays.length > 0 && (
        <div className="mt-3 space-y-1.5">
          <span className={label}>Жазылған жаңа күндер</span>
          {extraDays.map((o) => (
            <div key={o.dayNumber} className="flex items-center justify-between gap-2 rounded-xl bg-[var(--bg-soft)] border border-[var(--border)] px-3 py-1.5 text-xs">
              <span className="truncate">
                <b className="text-[var(--accent)]">№{o.dayNumber}</b> · {o.title}
              </span>
              <button
                onClick={async () => {
                  await deleteMessageOverride(o.dayNumber).catch(() => undefined);
                  load();
                }}
                className="text-[var(--text-faint)] hover:text-rose-500"
                aria-label="Жою"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ------------------------------------------------------------------- meeting

const MeetingEditor: React.FC = () => {
  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [date, setDate] = useState('');
  const [place, setPlace] = useState('');
  const [msg, setMsg] = useState('');

  const load = useCallback(async () => {
    const m = await fetchMeeting();
    setMeeting(m);
    setDate(m?.date || '');
    setPlace(m?.label || '');
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const save = async () => {
    if (!date) return setMsg('Күнді таңда.');
    const r = await adminSetMeeting(date, place.trim());
    setMsg(r.ok ? 'Сақталды ✅' : r.error || 'Сақтау мүмкін болмады.');
    if (r.ok) load();
  };

  const clear = async () => {
    const ok = await adminClearMeeting();
    setMsg(ok ? 'Санауыш өшірілді.' : 'Өшіру мүмкін болмады.');
    if (ok) load();
  };

  return (
    <div className={card}>
      <div className="flex items-center gap-2 font-semibold text-[var(--accent)] mb-2">
        <Plane className="w-4 h-4" /> Кездесуге дейінгі санауыш
      </div>
      <p className="text-[11px] text-[var(--text-muted)] mb-2">
        Қыздың басты бетінде «Кездесуге N күн қалды» деп шығады.
        {meeting ? ` Қазір: ${meeting.date}${meeting.label ? ` · ${meeting.label}` : ''}.` : ' Қазір қойылмаған.'}
      </p>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <span className={label}>Күні</span>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={input} />
        </div>
        <div>
          <span className={label}>Қайда / жазба</span>
          <input type="text" value={place} maxLength={60} onChange={(e) => setPlace(e.target.value)} placeholder="Алматы" className={input} />
        </div>
      </div>
      <div className="flex items-center justify-between mt-3">
        <span className="text-[11px] text-[var(--text-muted)]">{msg}</span>
        <div className="flex gap-2">
          {meeting && <button onClick={clear} className={ghost}>Өшіру</button>}
          <button onClick={save} className={primary}>Сақтау</button>
        </div>
      </div>
    </div>
  );
};

// -------------------------------------------------------------- joint streak

const JointCard: React.FC = () => {
  const [joint, setJoint] = useState<JointState | null>(null);
  const [busy, setBusy] = useState(false);
  const today = getTodayDateString();

  useEffect(() => {
    fetchJoint(today).then(setJoint);
  }, [today]);

  const checkin = async () => {
    setBusy(true);
    const r = await checkinJoint(today);
    if (r) setJoint(r);
    setBusy(false);
  };

  return (
    <div className={card}>
      <div className="flex items-center gap-2 font-semibold text-[var(--accent)] mb-2">
        <HeartHandshake className="w-4 h-4" /> Біздің стрик (екеуміз)
      </div>
      <p className="text-[11px] text-[var(--text-muted)] mb-3">
        Күн «ортақ» болып саналу үшін екеуің де келуің керек: ол жұлдызын алады, сен төмендегі батырманы басасың.
      </p>
      {joint ? (
        <div className="flex items-center justify-between gap-3">
          <div className="text-xs space-y-0.5">
            <div className="text-[var(--text)] font-semibold">
              🔥 {joint.streak} күн <span className="text-[var(--text-muted)] font-normal">· рекорд {joint.best}</span>
            </div>
            <div className="text-[var(--text-muted)]">
              Ол бүгін: {joint.today.partner ? '✅' : '⏳'} · Сен: {joint.today.admin ? '✅' : '⏳'}
            </div>
          </div>
          <button onClick={checkin} disabled={busy || joint.today.admin} className={primary}>
            {joint.today.admin ? <span className="flex items-center gap-1"><Check className="w-3.5 h-3.5" /> Белгіленді</span> : 'Бүгін келдім 💛'}
          </button>
        </div>
      ) : (
        <Loader2 className="w-4 h-4 animate-spin text-[var(--accent)]" />
      )}
    </div>
  );
};

// -------------------------------------------------------------- special days

interface SpecialForm {
  id?: string;
  month: string;
  day: string;
  year: string;
  title: string;
  text: string;
  hint: string;
  emoji: string;
}
const emptyForm: SpecialForm = { month: '', day: '', year: '', title: '', text: '', hint: '', emoji: '🎉' };

const SpecialDays: React.FC = () => {
  const [items, setItems] = useState<AdminSpecialDay[]>([]);
  const [form, setForm] = useState<SpecialForm>(emptyForm);
  const [msg, setMsg] = useState('');

  const load = useCallback(async () => setItems(await adminListSpecialDays()), []);
  useEffect(() => {
    load();
  }, [load]);

  const set = (patch: Partial<SpecialForm>) => setForm((f) => ({ ...f, ...patch }));

  const save = async () => {
    const r = await adminSaveSpecialDay(
      {
        month: Number(form.month),
        day: Number(form.day),
        year: form.year.trim() ? Number(form.year) : null,
        title: form.title,
        text: form.text,
        hint: form.hint,
        emoji: form.emoji,
        enabled: true,
      },
      form.id
    );
    setMsg(r.ok ? 'Сақталды ✅' : r.error || 'Сақтау мүмкін болмады.');
    if (r.ok) {
      setForm(emptyForm);
      load();
    }
  };

  const seed = async () => {
    const added = await adminSeedSpecialDays();
    setMsg(added === null ? 'Қосу мүмкін болмады.' : added === 0 ? 'Стандартты күндер бұрыннан бар.' : `${added} күн қосылды ✅`);
    load();
  };

  const toggle = async (s: AdminSpecialDay) => {
    await adminSaveSpecialDay({ ...s, enabled: !s.enabled }, s.id);
    load();
  };

  return (
    <div className={card}>
      <div className="flex items-center gap-2 font-semibold text-[var(--accent)] mb-2">
        <PartyPopper className="w-4 h-4" /> Күнге байланған жұлдыздар
      </div>
      <p className="text-[11px] text-[var(--text-muted)] mb-3">
        Туған күн, мерейтой, 8 наурыз, Наурыз… Сол күні қыз сайтты ашқанда ерекше қалқымалы хат шығады. Жылды бос қалдырсаң, жыл сайын қайталанады.
      </p>

      {items.length === 0 && (
        <button onClick={seed} className={`${ghost} mb-3`}>
          Стандартты күндерді қосу (Жаңа жыл, 14 ақпан, 8 наурыз, Наурыз…)
        </button>
      )}

      <div className="space-y-1.5 mb-3">
        {items.map((s) => (
          <div key={s.id} className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-xs ${s.enabled ? 'bg-[var(--bg-soft)] border-[var(--border)]' : 'opacity-50 border-dashed border-[var(--border)]'}`}>
            <span className="text-base">{s.emoji}</span>
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-[var(--text)] truncate">{s.title}</div>
              <div className="text-[var(--text-muted)]">
                {s.day} {monthName(s.month)}{s.year ? ` ${s.year}` : ' · жыл сайын'}
              </div>
            </div>
            <button
              onClick={() => setForm({ id: s.id, month: String(s.month), day: String(s.day), year: s.year ? String(s.year) : '', title: s.title, text: s.text, hint: s.hint, emoji: s.emoji })}
              className="text-[var(--accent)] font-semibold"
            >
              Өңдеу
            </button>
            <button onClick={() => toggle(s)} className="text-[var(--text-muted)]">{s.enabled ? 'Өшіру' : 'Қосу'}</button>
            <button
              onClick={async () => {
                await adminDeleteSpecialDay(s.id);
                load();
              }}
              className="text-[var(--text-faint)] hover:text-rose-500"
              aria-label="Жою"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>

      <div className="space-y-2 border-t border-[var(--border)] pt-3">
        <div className="text-xs font-semibold text-[var(--text)]">{form.id ? 'Күнді өңдеу' : 'Жаңа күн қосу'}</div>
        <div className="grid grid-cols-4 gap-2">
          <div><span className={label}>Күн</span><input type="number" min={1} max={31} value={form.day} onChange={(e) => set({ day: e.target.value })} className={input} /></div>
          <div><span className={label}>Ай</span><input type="number" min={1} max={12} value={form.month} onChange={(e) => set({ month: e.target.value })} className={input} /></div>
          <div><span className={label}>Жыл</span><input type="number" value={form.year} onChange={(e) => set({ year: e.target.value })} placeholder="әр жыл" className={input} /></div>
          <div><span className={label}>Эмодзи</span><input type="text" maxLength={8} value={form.emoji} onChange={(e) => set({ emoji: e.target.value })} className={input} /></div>
        </div>
        <div><span className={label}>Тақырып</span><input type="text" maxLength={80} value={form.title} onChange={(e) => set({ title: e.target.value })} placeholder="Туған күнің құтты болсын!" className={input} /></div>
        <div><span className={label}>Мәтін</span><textarea rows={3} maxLength={2000} value={form.text} onChange={(e) => set({ text: e.target.value })} className={`${input} resize-none`} /></div>
        <div><span className={label}>Қосымша сөз</span><input type="text" maxLength={300} value={form.hint} onChange={(e) => set({ hint: e.target.value })} className={input} /></div>
        <div className="flex items-center justify-between">
          <span className="text-[11px] text-[var(--text-muted)]">{msg}</span>
          <div className="flex gap-2">
            {form.id && <button onClick={() => setForm(emptyForm)} className={ghost}>Бас тарту</button>}
            <button onClick={save} className={primary}>{form.id ? 'Жаңарту' : 'Қосу'}</button>
          </div>
        </div>
      </div>
    </div>
  );
};

// -------------------------------------------------------------------- wishes

const Wishes: React.FC = () => {
  const [wishes, setWishes] = useState<WishRow[] | null>(null);

  const load = useCallback(async () => setWishes(await adminListWishes()), []);
  useEffect(() => {
    load();
  }, [load]);

  const mark = async (w: WishRow) => {
    await adminMarkWish(w.id, w.status === 'done' ? 'new' : 'done');
    load();
  };

  const open = (wishes || []).filter((w) => w.status === 'new').length;

  return (
    <div className={card}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2 font-semibold text-[var(--accent)]">
          <Gift className="w-4 h-4" /> Тілектер {open > 0 && <span className="text-xs bg-rose-500 text-white rounded-full px-2 py-0.5">{open}</span>}
        </div>
        <button onClick={load} className="text-[var(--text-muted)] hover:text-[var(--accent)]" aria-label="Жаңарту">
          <RefreshCw className="w-3.5 h-3.5" />
        </button>
      </div>
      {wishes === null ? (
        <Loader2 className="w-4 h-4 animate-spin text-[var(--accent)]" />
      ) : wishes.length === 0 ? (
        <p className="text-xs text-[var(--text-faint)] italic">Әзірге тілек жоқ. Ол жұлдыз тозаңына тілек жібергенде осында шығады.</p>
      ) : (
        <div className="space-y-1.5">
          {wishes.map((w) => (
            <div key={w.id} className={`rounded-xl border px-3 py-2 text-xs ${w.status === 'done' ? 'opacity-60 bg-[var(--bg-soft)] border-[var(--border)]' : 'bg-[var(--accent)]/8 border-[var(--accent)]/30'}`}>
              <div className="text-[var(--text)]">{w.text}</div>
              <div className="flex items-center justify-between mt-1 text-[var(--text-muted)]">
                <span>{new Date(w.createdAt).toLocaleString('kk-KZ', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                <button onClick={() => mark(w)} className="text-[var(--accent)] font-semibold">
                  {w.status === 'done' ? 'Қайта ашу' : 'Орындалды ✓'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export const AdminExtras: React.FC = () => (
  <div className="space-y-4">
    <ContentStatus />
    <JointCard />
    <MeetingEditor />
    <SpecialDays />
    <Wishes />
  </div>
);
