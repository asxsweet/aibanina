import React, { useMemo, useState } from 'react';
import { Heart, Music, Gift, Smile, Shuffle } from 'lucide-react';
import { ModalShell } from './ModalShell';
import { DAILY_MESSAGES } from '../data/constants';

const QUESTIONS = ['Біздің қай күніміз есіңде ерекше қалды?','Мені үш сөзбен сипатташы','Бірге қай жерге барғың келеді?','Менен үйренген бір нәрсең қандай?','Біздің ортақ арманымыз қандай?'];
const COUPONS = ['Бір құшақтау','Бірге кино көру','Сүйікті тағамың','Бір тілегіңді орындау','Телефонсыз ұзақ серуен'];
const key='love_warm_corner_v1';
type Data={answer:string;mood:string;used:string[];songs:string[]};
const load=():Data=>{try{return JSON.parse(localStorage.getItem(key)||'') as Data}catch{return{answer:'',mood:'',used:[],songs:[]}}};

export const LoveIdeasModal:React.FC<{onClose:()=>void}>=({onClose})=>{
 const [data,setData]=useState<Data>(load); const [song,setSong]=useState(''); const [memory,setMemory]=useState(0);
 const question=QUESTIONS[new Date().getDate()%QUESTIONS.length];
 const save=(next:Data)=>{setData(next);localStorage.setItem(key,JSON.stringify(next))};
 const msg=useMemo(()=>DAILY_MESSAGES[memory%DAILY_MESSAGES.length], [memory]);
 return <ModalShell title="Жылы бұрыш" icon={<Heart className="h-5 w-5"/>} onClose={onClose}>
  <div className="space-y-5">
   <section className="rounded-2xl bg-[var(--bg-soft)] p-4"><h3 className="font-bold text-[var(--text)]">Бүгінгі сұрақ</h3><p className="mt-1 text-xs">{question}</p><textarea value={data.answer} onChange={e=>save({...data,answer:e.target.value})} placeholder="Жауабыңды жаз…" className="mt-3 w-full rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-3 outline-none"/></section>
   <section><h3 className="flex items-center gap-2 font-bold text-[var(--text)]"><Smile className="h-4 w-4"/> Бүгінгі көңіл күйім</h3><div className="mt-2 flex flex-wrap gap-2">{['😊 Қуанышты','😍 Ғашық','😴 Шаршадым','😔 Көңілсіз','🤗 Қолдау керек'].map(m=><button key={m} onClick={()=>save({...data,mood:m})} className={`rounded-full border px-3 py-2 text-xs ${data.mood===m?'border-[var(--accent)] bg-[var(--accent)]/15':'border-[var(--border)]'}`}>{m}</button>)}</div></section>
   <section><h3 className="flex items-center gap-2 font-bold text-[var(--text)]"><Gift className="h-4 w-4"/> Романтикалық купондар</h3><div className="mt-2 grid grid-cols-1 gap-2">{COUPONS.map(c=>{const used=data.used.includes(c);return <button key={c} onClick={()=>save({...data,used:used?data.used.filter(x=>x!==c):[...data.used,c]})} className={`rounded-xl border p-3 text-left text-xs ${used?'border-emerald-400/40 bg-emerald-400/10 line-through opacity-70':'border-[var(--border)] bg-[var(--bg-card)]'}`}>🎟️ {c}</button>})}</div></section>
   <section className="rounded-2xl border border-[var(--border)] p-4"><h3 className="flex items-center gap-2 font-bold text-[var(--text)]"><Shuffle className="h-4 w-4"/> Кездейсоқ естелік</h3><p className="mt-2 font-serif text-lg text-[var(--accent)]">{msg.title}</p><p className="mt-1 text-xs leading-relaxed">{msg.text}</p><button onClick={()=>setMemory(Math.floor(Math.random()*DAILY_MESSAGES.length))} className="btn-gold mt-3 rounded-xl px-4 py-2 text-xs">Басқа естелік</button></section>
   <section><h3 className="flex items-center gap-2 font-bold text-[var(--text)]"><Music className="h-4 w-4"/> Біздің плейлист</h3><div className="mt-2 flex gap-2"><input value={song} onChange={e=>setSong(e.target.value)} placeholder="Ән атауы немесе сілтеме" className="min-w-0 flex-1 rounded-xl border border-[var(--border)] bg-[var(--bg-card)] px-3"/><button onClick={()=>{if(song.trim()){save({...data,songs:[...data.songs,song.trim()]});setSong('')}}} className="btn-gold rounded-xl px-3 py-2">Қосу</button></div><ul className="mt-2 space-y-1">{data.songs.map((s,i)=><li key={`${s}-${i}`} className="rounded-lg bg-[var(--bg-soft)] px-3 py-2 text-xs">🎵 {s}</li>)}</ul></section>
   <div className="grid grid-cols-3 gap-2 text-center text-xs"><div className="rounded-xl bg-[var(--bg-soft)] p-3"><b className="block text-lg text-[var(--accent)]">{data.used.length}</b>купон</div><div className="rounded-xl bg-[var(--bg-soft)] p-3"><b className="block text-lg text-[var(--accent)]">{data.songs.length}</b>ән</div><div className="rounded-xl bg-[var(--bg-soft)] p-3"><b className="block text-lg text-[var(--accent)]">{data.answer?1:0}</b>жауап</div></div>
  </div>
 </ModalShell>
};
