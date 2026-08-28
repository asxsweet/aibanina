import React, { useState } from 'react';
import { Sparkles, Mail, Lock, Star } from 'lucide-react';
import { AppUser, loginUser, registerUser } from '../utils/authUtils';
import { PARTNER_NAME } from '../data/constants';

interface AuthScreenProps {
  onAuthSuccess: (user: AppUser) => void;
}

// Note: the auth screen always renders in the default "day" theme, since a
// user's theme preference lives in their saved progress, which isn't loaded
// yet at this point. Theme choice takes effect right after signing in.
export const AuthScreen: React.FC<AuthScreenProps> = ({ onAuthSuccess }) => {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    setError('');

    try {
      if (mode === 'login') {
        const user = loginUser(email, password);
        onAuthSuccess(user);
      } else {
        const user = registerUser(email, password);
        onAuthSuccess(user);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Кіру мүмкін болмады.');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#FDFBF7] px-4 py-10 text-[#5C3D26]">
      <div className="w-full max-w-md rounded-[36px] border border-[#E4D8C4] bg-white/90 p-6 shadow-[0_24px_80px_rgba(92,61,38,0.15)] backdrop-blur-xl">
        <div className="flex items-center justify-center mb-4">
          <div className="rounded-full bg-[#A9784F]/15 border border-[#A9784F]/30 p-3 shadow-[0_0_30px_rgba(169,120,79,0.2)]">
            <Sparkles className="w-7 h-7 text-[#A9784F]" />
          </div>
        </div>

        <div className="text-center mb-5">
          <p className="text-[10px] uppercase tracking-[0.35em] text-[#C97B8C] font-bold">Жеке кабинет</p>
          <h1 className="mt-2 font-serif text-4xl italic text-[#A9784F]">Біздің шоқжұлдыз</h1>
          <p className="mt-1 text-xs text-[#9B7A66] italic">{PARTNER_NAME}</p>
        </div>

        <div className="mb-5 grid grid-cols-2 rounded-2xl bg-[#F0E6D6] p-1 border border-[#E4D8C4]">
          <button
            type="button"
            onClick={() => setMode('login')}
            className={`rounded-xl py-2.5 text-sm font-medium transition ${
              mode === 'login' ? 'bg-[#A9784F] text-[#FDFBF7]' : 'text-[#8B7A66] hover:text-[#5C3D26]'
            }`}
          >
            Кіру
          </button>
          <button
            type="button"
            onClick={() => setMode('register')}
            className={`rounded-xl py-2.5 text-sm font-medium transition ${
              mode === 'register' ? 'bg-[#A9784F] text-[#FDFBF7]' : 'text-[#8B7A66] hover:text-[#5C3D26]'
            }`}
          >
            Тіркелу
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <label className="block">
            <span className="mb-2 flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-[#8B7A66]">
              <Mail className="w-3.5 h-3.5 text-[#A9784F]" />
              Пошта
            </span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full rounded-2xl border border-[#E4D8C4] bg-[#F7F2EA] px-4 py-3 text-sm text-[#5C3D26] placeholder:text-[#B99B7A] outline-none transition focus:border-[#A9784F]/50 focus:bg-[#F0E6D6]"
              required
            />
          </label>

          <label className="block">
            <span className="mb-2 flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-[#8B7A66]">
              <Lock className="w-3.5 h-3.5 text-[#A9784F]" />
              Құпия сөз
            </span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Кемінде 6 таңба"
              className="w-full rounded-2xl border border-[#E4D8C4] bg-[#F7F2EA] px-4 py-3 text-sm text-[#5C3D26] placeholder:text-[#B99B7A] outline-none transition focus:border-[#A9784F]/50 focus:bg-[#F0E6D6]"
              required
            />
          </label>

          {error && (
            <div className="rounded-2xl border border-rose-400/30 bg-rose-400/10 px-3 py-2 text-xs text-rose-600">
              {error}
            </div>
          )}

          <button type="submit" className="w-full rounded-2xl bg-[#A9784F] px-4 py-3 text-sm font-bold text-[#FDFBF7] shadow-[0_12px_25px_rgba(169,120,79,0.25)] transition hover:scale-[1.01]">
            {mode === 'login' ? 'Аккаунтқа кіру' : 'Аккаунт жасау'}
          </button>
        </form>

        <div className="mt-5 flex items-center justify-center gap-2 text-[10px] uppercase tracking-[0.2em] text-[#B99B7A]">
          <Star className="w-3.5 h-3.5 text-[#A9784F]" />
          Жұлдыздарың профильде сақталады
        </div>
      </div>
    </div>
  );
};
