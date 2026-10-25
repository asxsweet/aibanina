import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Play, RotateCcw, Star, Shield } from 'lucide-react';
import { DifficultyName, ThemeName } from '../../utils/constellationUtils';

interface Props { theme:ThemeName; difficulty:DifficultyName; onSetDifficulty:(d:DifficultyName)=>void; playedToday:boolean; soundEnabled:boolean; onGameStart?:()=>void; onGameWin:(bonus:boolean,score:number)=>void }
type Item={id:number;lane:number;y:number;bad:boolean};
const seconds:Record<DifficultyName,number>={easy:25,medium:30,hard:35};
const labels:Record<DifficultyName,string>={easy:'Жеңіл',medium:'Орташа',hard:'Қиын'};

export const StarRaceGame:React.FC<Props>=({difficulty,onSetDifficulty,playedToday,onGameStart,onGameWin})=>{
 const [status,setStatus]=useState<'idle'|'playing'|'done'>('idle'); const [lane,setLane]=useState(1); const [items,setItems]=useState<Item[]>([]); const [score,setScore]=useState(0); const [lives,setLives]=useState(3); const [left,setLeft]=useState(seconds[difficulty]); const bonus=useRef(playedToday); const scoreRef=useRef(0); const livesRef=useRef(3); const id=useRef(0);
 scoreRef.current=score;livesRef.current=lives;
 const finish=useCallback(()=>{setStatus('done');setItems([]);onGameWin(bonus.current,scoreRef.current)},[onGameWin]);
 const start=()=>{bonus.current=playedToday;setScore(0);setLives(3);setLeft(seconds[difficulty]);setItems([]);setLane(1);setStatus('playing');onGameStart?.()};
 useEffect(()=>{if(status!=='playing')return;const spawn=setInterval(()=>setItems(v=>[...v,{id:id.current++,lane:Math.floor(Math.random()*3),y:-8,bad:Math.random()<(difficulty==='hard'?.36:.25)}]),difficulty==='easy'?820:difficulty==='hard'?520:650);const tick=setInterval(()=>setItems(prev=>{const next:Item[]=[];for(const it of prev){const y=it.y+(difficulty==='hard'?7:5);if(y>=80&&y<=92&&it.lane===lane){if(it.bad){const n=livesRef.current-1;livesRef.current=n;setLives(n);if(n<=0)setTimeout(finish,0)}else{scoreRef.current+=10;setScore(scoreRef.current)}}else if(y<105)next.push({...it,y})}return next}),90);return()=>{clearInterval(spawn);clearInterval(tick)}},[status,difficulty,lane,finish]);
 useEffect(()=>{if(status!=='playing')return;const timer=setInterval(()=>setLeft(v=>{if(v<=1){setTimeout(finish,0);return 0}return v-1}),1000);return()=>clearInterval(timer)},[status,finish]);
 return <div className="relative h-[390px] overflow-hidden rounded-[32px] border border-[var(--border)] bg-[var(--bg-card)] shadow-xl">
  <div className="flex items-center justify-between border-b border-[var(--border)] bg-[var(--bg-soft)]/80 px-4 py-3 text-xs"><b>{score} ұпай</b><span className="text-[var(--accent)]">Жұлдызды жарыс</span><span>{left} сек · {'❤'.repeat(lives)}</span></div>
  {status==='playing'?<div className="relative h-[285px] touch-none bg-gradient-to-b from-[var(--bg-soft)]/20 to-[var(--accent)]/10">
    {[1,2].map(x=><div key={x} className="absolute inset-y-0 w-px bg-[var(--border)]" style={{left:`${x*33.333}%`}}/>)}
    {items.map(it=><div key={it.id} className="absolute grid h-8 w-8 place-items-center" style={{left:`calc(${it.lane*33.333+16.666}% - 16px)`,top:`${it.y}%`}}>{it.bad?<Shield className="h-7 w-7 text-rose-500"/>:<Star className="h-7 w-7 fill-[var(--accent)] text-[var(--accent)] drop-shadow"/>}</div>)}
    <div className="absolute bottom-2 grid h-11 w-11 place-items-center rounded-full border-2 border-[var(--accent)] bg-[var(--bg-elevated)] shadow-[0_0_20px_var(--accent-glow)] transition-all" style={{left:`calc(${lane*33.333+16.666}% - 22px)`}}><span className="text-xl">🚀</span></div>
    <div className="absolute inset-x-0 bottom-0 grid grid-cols-3"><button aria-label="Сол жол" onClick={()=>setLane(Math.max(0,lane-1))} className="h-24"/><button aria-label="Орта жол" onClick={()=>setLane(1)} className="h-24"/><button aria-label="Оң жол" onClick={()=>setLane(Math.min(2,lane+1))} className="h-24"/></div>
   </div>:<div className="flex h-[285px] flex-col items-center justify-center gap-3 p-6 text-center"><Star className="h-12 w-12 text-[var(--accent)]"/><h3 className="font-serif text-2xl text-[var(--accent)]">{status==='done'?`${score} ұпай жинадың!`:'Жұлдыздарды жина'}</h3><p className="text-xs text-[var(--text-muted)]">Үш жолдың арасында ауысып, жұлдыздарды жина және кедергілерден қаш. Рекорд екеуіңе де көрінеді.</p><div className="flex gap-1">{(['easy','medium','hard'] as DifficultyName[]).map(d=><button key={d} onClick={()=>onSetDifficulty(d)} className={`rounded-full px-3 py-1.5 text-xs ${d===difficulty?'bg-[var(--accent)] text-[var(--on-accent)]':'bg-[var(--bg-soft)]'}`}>{labels[d]}</button>)}</div><button onClick={start} className="btn-gold flex items-center gap-2 rounded-xl px-5 py-3">{status==='done'?<RotateCcw className="h-4 w-4"/>:<Play className="h-4 w-4"/>}{status==='done'?'Қайта ойнау':'Бастау'}</button></div>}
  {status==='playing'&&<div className="grid grid-cols-2 gap-2 p-2"><button onClick={()=>setLane(Math.max(0,lane-1))} className="rounded-xl bg-[var(--bg-soft)] py-3 text-lg">←</button><button onClick={()=>setLane(Math.min(2,lane+1))} className="rounded-xl bg-[var(--bg-soft)] py-3 text-lg">→</button></div>}
 </div>
};
