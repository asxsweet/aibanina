import React, { useState } from 'react';
import { Heart, Gamepad2, Palette, X, ChevronRight } from 'lucide-react';

const slides = [
  { icon: Heart, title: 'Біздің шоқжұлдызға қош келдің', text: 'Күн сайын ойын ойнап, жаңа жұлдыз бен саған арналған хабарламаны аш.' },
  { icon: Gamepad2, title: 'Ойна және естелік жина', text: 'Мини-ойындар, фотолар, армандар, уақыт капсуласы және ортақ тарих бір жерде сақталады.' },
  { icon: Palette, title: 'Өз әлеміңді таңда', text: 'Стрик өскен сайын жаңа дизайн темалары ашылады. Қалаған темаңа Баптаулардан ауыса аласың.' },
];

export const WelcomeTour: React.FC = () => {
  const [open, setOpen] = useState(() => typeof window !== 'undefined' && localStorage.getItem('love_welcome_seen_v1') !== '1');
  const [step, setStep] = useState(0);
  if (!open) return null;
  const slide = slides[step]; const Icon = slide.icon;
  const close = () => { localStorage.setItem('love_welcome_seen_v1', '1'); setOpen(false); };
  return <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/55 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label="Сайтпен танысу">
    <div className="glass-card relative w-full max-w-md rounded-[32px] p-7 text-center">
      <button onClick={close} className="absolute right-4 top-4 rounded-full p-2 text-[var(--text-muted)] hover:bg-[var(--bg-soft)]" aria-label="Жабу"><X className="h-5 w-5" /></button>
      <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-[var(--accent)]/15 text-[var(--accent)]"><Icon className="h-8 w-8" /></div>
      <p className="mb-2 text-[10px] font-bold uppercase tracking-[.3em] text-[var(--accent-2)]">{step + 1} / {slides.length}</p>
      <h2 className="font-serif text-3xl text-[var(--text)]">{slide.title}</h2>
      <p className="mt-3 leading-relaxed text-[var(--text-muted)]">{slide.text}</p>
      <div className="mt-7 flex justify-center gap-2">{slides.map((_,i)=><span key={i} className={`h-2 rounded-full transition-all ${i===step?'w-7 bg-[var(--accent)]':'w-2 bg-[var(--border)]'}`} />)}</div>
      <button onClick={() => step < slides.length-1 ? setStep(step+1) : close()} className="btn-gold mt-6 flex w-full items-center justify-center gap-2 rounded-2xl py-3">
        {step < slides.length-1 ? 'Келесі' : 'Бастау'} <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  </div>;
};
