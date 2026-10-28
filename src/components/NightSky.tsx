import React, { useEffect, useRef } from 'react';
import type { ThemeName } from '../data/themes';
import { startAtmosphere } from '../utils/atmosphere.js';

interface NightSkyProps {
  theme?: ThemeName;
}

// Әр теманың фоны (градиент)
const BACKGROUND_BY_THEME: Record<ThemeName, string> = {
  day: 'radial-gradient(circle at 50% 0%, #F7F0E3 0%, #FDFBF7 60%)',
  night: 'radial-gradient(circle at 50% 0%, #1B1140 0%, #0F081D 60%)',
  dawn: 'linear-gradient(160deg, #FFE8D6 0%, #F6DCE8 55%, #EDE1F5 100%)',
  mint: 'radial-gradient(circle at 50% 0%, #EDF1E6 0%, #F5F7F0 60%)',
  velvet: 'radial-gradient(120% 100% at 50% -10%, #1E2E28 0%, #0F1F1A 60%)',
  autumn: 'linear-gradient(170deg, #FFE9CC 0%, #FBF1E4 45%, #F6DDBF 100%)',
  winter: 'linear-gradient(180deg, #A9C7E4 0%, #D3E5F4 45%, #EAF3FA 100%)',
  treasure: 'radial-gradient(circle at 50% 0%, #FBF1D8 0%, #F6EBD3 55%, #EBD9B0 100%)',
  aurora: 'radial-gradient(120% 90% at 50% -10%, #11333A 0%, #0A1A1F 62%)',
  galaxy: 'radial-gradient(120% 100% at 50% -10%, #25185F 0%, #0B0B2A 62%)',
  gold: 'radial-gradient(110% 90% at 50% -10%, #2A2110 0%, #0C0A07 62%)',
  sakura: 'linear-gradient(160deg, #FFF8FB 0%, #FFE1EC 55%, #F4DDF5 100%)',
  ocean: 'radial-gradient(120% 100% at 50% -10%, #0A4960 0%, #061A2B 62%)',
  lavender: 'linear-gradient(160deg, #FBF8FF 0%, #EEE5FF 55%, #E5D8F5 100%)',
  sunset: 'linear-gradient(175deg, #F58B72 0%, #9A416F 45%, #321A42 100%)',
  retro: 'radial-gradient(circle at 50% 0%, #FFF5E5 0%, #F5E7D0 58%, #DEC39A 100%)',
  neon: 'radial-gradient(120% 100% at 50% -10%, #241049 0%, #090818 65%)',
  clouds: 'linear-gradient(180deg, #BDE8FF 0%, #EAF7FF 55%, #FFF3F8 100%)',
  kazakh: 'radial-gradient(120% 90% at 50% -10%, #0B4F78 0%, #071F3D 64%)',
  arabian: 'radial-gradient(110% 85% at 50% -10%, #24265F 0%, #080A27 68%)',
};

// Әр теманың сахнасы (SVG viewBox 1000x700). Телефонда экранның төменгі 54%-ына тіркеледі (CSS).
const NaturalThemeArt: React.FC<{ theme: ThemeName }> = ({ theme }) => {
  const common = { className: 'natural-svg', viewBox: '0 0 1000 700', preserveAspectRatio: 'xMidYMax slice', 'aria-hidden': true } as const;
  if (theme === 'day') return <svg {...common}><defs><radialGradient id="sun"><stop stopColor="#fff7cf"/><stop offset="1" stopColor="#e7b96c" stopOpacity="0"/></radialGradient></defs><circle cx="690" cy="115" r="115" fill="url(#sun)"/><path d="M0 590 Q180 510 340 585 T700 570 T1000 560 V700H0Z" fill="#d9c8a8" opacity=".2"/></svg>;
  if (theme === 'night') return <svg {...common}><defs><mask id="cres"><rect width="1000" height="700" fill="white"/><circle cx="725" cy="115" r="54" fill="black"/></mask></defs><circle cx="690" cy="110" r="76" fill="#ffe88a" opacity=".88" mask="url(#cres)"/><path d="M0 610 Q170 560 350 610 T700 590 T1000 600V700H0Z" fill="#160f31" opacity=".9"/></svg>;
  if (theme === 'dawn') return <svg {...common}><circle cx="510" cy="235" r="90" fill="#ffbf91" opacity=".52"/><path d="M0 560 Q170 410 350 570 Q540 390 730 570 Q850 470 1000 560V700H0Z" fill="#c9acd7" opacity=".3"/><g fill="#fff" opacity=".42" className="natural-drift"><ellipse cx="180" cy="180" rx="105" ry="25"/><ellipse cx="245" cy="165" rx="70" ry="35"/></g></svg>;
  if (theme === 'mint') return <svg {...common}><g fill="none" stroke="#71906b" strokeWidth="5" opacity=".28"><path d="M80 700Q130 510 100 320"/><path d="M900 700Q840 500 910 300"/></g><g fill="#87a97c" opacity=".3"><ellipse cx="115" cy="470" rx="45" ry="18" transform="rotate(-35 115 470)"/><ellipse cx="875" cy="430" rx="48" ry="19" transform="rotate(30 875 430)"/><ellipse cx="130" cy="560" rx="52" ry="20" transform="rotate(28 130 560)"/></g></svg>;
  if (theme === 'velvet') return <svg {...common}><defs><linearGradient id="gem" x2="1" y2="1"><stop stopColor="#ffe391"/><stop offset="1" stopColor="#548d70"/></linearGradient></defs><g opacity=".22" fill="url(#gem)" className="natural-pulse"><path d="M130 520l42-58 55 12 12 62-58 44z"/><path d="M800 180l34-45 48 10 10 47-50 35z"/></g><path d="M0 640Q260 590 500 635T1000 625V700H0Z" fill="#07140f" opacity=".7"/></svg>;
  if (theme === 'autumn') return <svg {...common}><defs><linearGradient id="autumnHill"><stop stopColor="#c77a3b"/><stop offset="1" stopColor="#e7b06c"/></linearGradient></defs><path d="M0 590Q180 480 360 590Q600 450 780 590Q900 530 1000 570V700H0Z" fill="url(#autumnHill)" opacity=".25"/><g stroke="#744324" strokeWidth="10" opacity=".22"><path d="M80 700Q120 490 85 300"/><path d="M920 700Q860 470 925 280"/></g></svg>;
  if (theme === 'winter') return <svg {...common}><path d="M0 590Q170 510 350 585T700 570T1000 560V700H0Z" fill="#fff" opacity=".7"/><path d="M0 620Q240 550 470 625T1000 600V700H0Z" fill="#bcd9eb" opacity=".36"/><g transform="translate(300 625) scale(1)"><path d="M0-130L46-52H20L60 12H-60L-20-52H-46Z" fill="#4f7f8a" opacity=".6"/><path d="M0-130L24-86H-24ZM-18-52L-28-34H28L18-52ZM-34 12L-46 30H46L34 12Z" fill="#fff" opacity=".85"/><rect x="-7" y="12" width="14" height="26" fill="#5b4636" opacity=".6"/></g><g transform="translate(840 640) scale(0.85)"><path d="M0-130L46-52H20L60 12H-60L-20-52H-46Z" fill="#4f7f8a" opacity=".6"/><path d="M0-130L24-86H-24ZM-18-52L-28-34H28L18-52ZM-34 12L-46 30H46L34 12Z" fill="#fff" opacity=".85"/><rect x="-7" y="12" width="14" height="26" fill="#5b4636" opacity=".6"/></g><g transform="translate(205 650) scale(0.6)"><path d="M0-130L46-52H20L60 12H-60L-20-52H-46Z" fill="#4f7f8a" opacity=".6"/><path d="M0-130L24-86H-24ZM-18-52L-28-34H28L18-52ZM-34 12L-46 30H46L34 12Z" fill="#fff" opacity=".85"/><rect x="-7" y="12" width="14" height="26" fill="#5b4636" opacity=".6"/></g><g transform="translate(930 655) scale(0.55)"><path d="M0-130L46-52H20L60 12H-60L-20-52H-46Z" fill="#4f7f8a" opacity=".6"/><path d="M0-130L24-86H-24ZM-18-52L-28-34H28L18-52ZM-34 12L-46 30H46L34 12Z" fill="#fff" opacity=".85"/><rect x="-7" y="12" width="14" height="26" fill="#5b4636" opacity=".6"/></g><g transform="translate(600 560)"><path d="M-90 70V-5L0-70 90-5V70Z" fill="#30465a" opacity=".72"/><rect x="25" y="5" width="34" height="38" fill="#ffd878" className="natural-pulse"/><path d="M-42-48V-105H-18V-65" fill="#30465a"/><path d="M-30-110q35-35 55 0" fill="none" stroke="#fff" strokeWidth="10" opacity=".2" className="natural-drift"/></g></svg>;
  if (theme === 'treasure') return <svg {...common}><defs><linearGradient id="mapSea"><stop stopColor="#87b8b0" stopOpacity=".25"/><stop offset="1" stopColor="#4d7f7b" stopOpacity=".08"/></linearGradient></defs><path d="M190 190Q310 100 440 210T620 190T790 285" className="treasure-route" fill="none" stroke="#8c6239" strokeWidth="5" strokeDasharray="14 12" opacity=".55"/><g transform="translate(700 120)"><circle r="62" fill="#f2d59c" fillOpacity=".22" stroke="#8e6b34" strokeWidth="7"/><path d="M-48 0H48M0-48V48" stroke="#8e6b34" strokeWidth="3"/><path className="treasure-compass" d="M0-48L12 0 0 48-12 0Z" fill="#a84e37"/></g><g transform="translate(290 480)"><g className="treasure-ship"><path d="M-46 18H48L30 42H-28Z" fill="#75452f"/><path d="M0-70V20M4-62L55-5H4Z" fill="#f4dfb3" stroke="#8c6239" strokeWidth="3"/></g></g><path d="M0 520Q120 480 240 520T480 520T720 520T1000 520V700H0Z" fill="url(#mapSea)" className="natural-drift"/><g transform="translate(790 285)"><g className="treasure-x" stroke="#b33b2e" strokeWidth="13" strokeLinecap="round"><path d="M-24-24L24 24M24-24L-24 24"/></g></g></svg>;
  if (theme === 'aurora') return <svg {...common}><path d="M-50 210Q220 20 470 180T1050 80" fill="none" stroke="#5ef0b4" strokeWidth="55" opacity=".12" className="natural-drift"/><path d="M-20 300Q240 110 500 250T1030 150" fill="none" stroke="#aa82ff" strokeWidth="45" opacity=".12" className="natural-drift"/></svg>;
  if (theme === 'galaxy') return <svg {...common}><defs><radialGradient id="planet"><stop stopColor="#d7b8ff"/><stop offset="1" stopColor="#6d4fb5"/></radialGradient></defs><g className="natural-float"><circle cx="690" cy="150" r="70" fill="url(#planet)" opacity=".55"/><ellipse cx="690" cy="150" rx="125" ry="28" fill="none" stroke="#dfcfff" strokeWidth="7" opacity=".35" transform="rotate(-12 690 150)"/></g><path d="M70 520Q340 380 650 540T1000 470" fill="none" stroke="#a17cff" strokeWidth="30" opacity=".06"/></svg>;
  if (theme === 'gold') return <svg {...common}><defs><radialGradient id="goldGlow"><stop stopColor="#ffd96a"/><stop offset="1" stopColor="#ffd96a" stopOpacity="0"/></radialGradient></defs><circle cx="500" cy="270" r="190" fill="url(#goldGlow)" opacity=".16"/><g transform="translate(500 590)" fill="#f0c75e" opacity=".3"><path d="M-95 0L-115-95-55-48 0-120 55-48 115-95 95 0Z"/><rect x="-95" y="8" width="190" height="26" rx="6"/><circle cx="-115" cy="-98" r="9"/><circle cx="0" cy="-124" r="10"/><circle cx="115" cy="-98" r="9"/></g><path d="M0 650H1000" stroke="#f0c75e" strokeWidth="2" opacity=".25"/></svg>;
  if (theme === 'sakura') return <svg {...common}><g fill="none" stroke="#865267" strokeWidth="12" opacity=".2" className="natural-float"><path d="M0 170Q180 100 340 210"/><path d="M1000 120Q820 80 680 215"/></g><g fill="#e89ab7" opacity=".28"><circle cx="220" cy="150" r="15"/><circle cx="270" cy="174" r="13"/><circle cx="770" cy="135" r="16"/><circle cx="715" cy="176" r="12"/></g><path d="M0 580Q180 550 360 580T720 575T1000 580V700H0Z" fill="#cf9fbd" opacity=".18"/><g fill="none" stroke="#fff" opacity=".25" className="natural-pulse"><ellipse cx="240" cy="590" rx="70" ry="14"/><ellipse cx="720" cy="620" rx="55" ry="11"/></g></svg>;
  if (theme === 'ocean') return <svg {...common}><defs><linearGradient id="sea" y2="1"><stop stopColor="#5fd8e8" stopOpacity=".18"/><stop offset="1" stopColor="#06243a" stopOpacity=".7"/></linearGradient></defs><path d="M0 440Q120 390 240 440T480 440T720 440T1000 440V700H0Z" fill="url(#sea)" className="natural-drift"/><g fill="none" stroke="#9befff" opacity=".15"><path d="M80 560q45-50 90 0t90 0"/><path d="M700 520q45-50 90 0t90 0"/></g></svg>;
  if (theme === 'lavender') return <svg {...common}><g stroke="#76569a" strokeWidth="4" opacity=".25"><path d="M100 700Q130 500 110 350M170 700Q185 510 160 390M850 700Q820 500 850 360M920 700Q890 520 920 400"/></g><g fill="#9e7ac4" opacity=".34"><circle cx="112" cy="360" r="13"/><circle cx="102" cy="390" r="12"/><circle cx="158" cy="405" r="13"/><circle cx="850" cy="370" r="14"/><circle cx="918" cy="410" r="13"/></g></svg>;
  if (theme === 'sunset') return <svg {...common}><circle cx="500" cy="270" r="105" fill="#ffd08a" opacity=".5"/><path d="M0 590Q170 500 350 590Q550 430 740 590Q870 510 1000 580V700H0Z" fill="#2d183a" opacity=".62"/><g fill="none" stroke="#34203c" strokeWidth="5" opacity=".55"><path d="M160 230q20-18 40 0q20-18 40 0M760 190q18-15 36 0q18-15 36 0"/></g></svg>;
  if (theme === 'retro') return <svg {...common}><rect x="90" y="90" width="820" height="520" rx="22" fill="none" stroke="#8b5738" strokeWidth="5" opacity=".12"/><g fill="#73442f" opacity=".08"><circle cx="140" cy="160" r="2"/><circle cx="340" cy="280" r="3"/><circle cx="760" cy="190" r="2"/><circle cx="620" cy="510" r="3"/></g><path d="M0 620Q280 560 520 620T1000 610V700H0Z" fill="#8b5738" opacity=".1"/></svg>;
  if (theme === 'neon') return <svg {...common}><g fill="#181236" strokeWidth="3"><path d="M0 700V430h90v270M70 700V330h120v370M170 700V470h130v230M280 700V380h150v320M420 700V450h110v250M520 700V300h160v400M670 700V420h100v280M760 700V350h150v350M900 700V460h100v240"/></g><g stroke="#4cf4ff" opacity=".38"><path d="M95 350v330M540 325v350M785 375v300"/></g><g stroke="#ff4fd8" opacity=".32"><path d="M300 405v270M690 445v230M930 480v195"/></g></svg>;
  if (theme === 'clouds') return <svg {...common}><g fill="#fff" opacity=".48" className="natural-drift"><ellipse cx="180" cy="190" rx="125" ry="38"/><ellipse cx="115" cy="170" rx="70" ry="55"/><ellipse cx="760" cy="320" rx="150" ry="42"/><ellipse cx="830" cy="285" rx="82" ry="62"/></g><path d="M0 630Q230 570 460 630T1000 610V700H0Z" fill="#fff" opacity=".28"/></svg>;
  if (theme === 'kazakh') return <svg {...common}><defs>
    <radialGradient id="kzMoon"><stop stopColor="#fff6cc"/><stop offset="1" stopColor="#fff6cc" stopOpacity="0"/></radialGradient>
    <linearGradient id="kzMtn" x2="0" y2="1"><stop stopColor="#2f6c96"/><stop offset="1" stopColor="#0a2a4d"/></linearGradient>
    <pattern id="oyu" width="80" height="34" patternUnits="userSpaceOnUse"><path d="M5 17Q20-3 35 17Q50 37 65 17" fill="none" stroke="#f5d57a" strokeWidth="4"/></pattern>
    <pattern id="oyuS" width="30" height="12" patternUnits="userSpaceOnUse"><path d="M2 6Q8 0 15 6T28 6" fill="none" stroke="#c9972f" strokeWidth="2.4"/></pattern>
    <g id="kzYurt"><ellipse cy="98" rx="170" ry="12" fill="#000" opacity=".35"/><rect x="-115" y="26" width="230" height="70" fill="#e4d6b4"/><path d="M-120 30Q-120-52 0-64Q120-52 120 30Z" fill="#f0e6cc"/><path d="M0-60L-112 30M0-60L-56 30M0-60L56 30M0-60L112 30" stroke="#c9b68a" strokeWidth="2" opacity=".7"/><ellipse cy="-62" rx="24" ry="6" fill="#2b2012"/><rect x="-115" y="44" width="230" height="12" fill="url(#oyuS)"/><path d="M-118 62H118" stroke="#b4262c" strokeWidth="5"/><path d="M-22 96V54Q0 36 22 54V96Z" fill="#6b2a18"/><path d="M-15 96V58Q0 46 15 58V96Z" fill="#ffb44d" className="kz-flicker"/></g>
    <radialGradient id="kzFire"><stop stopColor="#ffb44d"/><stop offset="1" stopColor="#ff7a1a" stopOpacity="0"/></radialGradient></defs>
    <circle cx="690" cy="150" r="170" fill="url(#kzMoon)" opacity=".4" className="natural-pulse"/><circle cx="690" cy="150" r="54" fill="#fff4c4" opacity=".92"/>
    <path d="M0 470L110 360 190 430 300 300 400 420 520 330 640 440 760 350 880 430 1000 370V700H0Z" fill="url(#kzMtn)" opacity=".85"/>
    <path d="M300 300l-34 52 34-14 30 14zM760 350l-30 44 30-12 28 12zM110 360l-26 40 26-10 24 10z" fill="#e8f3ff" opacity=".7"/>
    <path d="M0 520Q200 460 420 520T800 500T1000 520V700H0Z" fill="#06152d" opacity=".92"/><path d="M0 595Q250 555 500 598T1000 582V700H0Z" fill="#040e20"/>
    <use href="#kzYurt" transform="translate(500 470) scale(1.35)"/><use href="#kzYurt" transform="translate(770 562) scale(.6)"/>
    <g transform="translate(300 582)"><circle r="64" fill="url(#kzFire)" className="kz-flicker"/><path d="M-14 14q14-46 14-46q10 22 14 46z" fill="#ffb44d" className="kz-flicker"/><path d="M-26 18h52" stroke="#3b2414" strokeWidth="7" strokeLinecap="round"/></g>
  </svg>;
  if (theme === 'arabian') return <svg {...common}><defs><mask id="arabMoon"><rect width="1000" height="700" fill="white"/><circle cx="715" cy="120" r="54" fill="black"/></mask></defs><circle cx="680" cy="115" r="78" fill="#f5c458" opacity=".85" mask="url(#arabMoon)"/><g fill="#07081d" opacity=".96"><path d="M0 700V610h145v90M110 700V505h58v195M139 505q0-60 0-60q0 0 0 60M265 700V570h220v130M305 570q70-115 140 0M385 700V470h42v230M406 470q0-45 0-45q0 0 0 45M610 700V590h210v110M650 590q65-95 130 0M740 700V500h45v200M762 500q0-42 0-42q0 0 0 42M900 700V615h100v85"/></g><path d="M0 610Q180 560 360 615T720 600T1000 610" fill="none" stroke="#c99442" strokeWidth="4" opacity=".2"/></svg>;
  return null;
};

// Тірі атмосфера (қар, жаңбыр, жапырақ, күлте, түтін, жұлдыз, қыран...) — utils/atmosphere.js
export const NightSky: React.FC<NightSkyProps> = ({ theme = 'day' }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const ctrlRef = useRef<{ setTheme: (t: string) => void; destroy: () => void } | null>(null);

  useEffect(() => {
    if (!canvasRef.current) return undefined;
    const ctrl = startAtmosphere(canvasRef.current, theme);
    ctrlRef.current = ctrl;
    return () => {
      ctrlRef.current = null;
      ctrl.destroy();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    ctrlRef.current?.setTheme(theme);
  }, [theme]);

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0" aria-hidden="true">
      <div className="absolute inset-0" style={{ background: BACKGROUND_BY_THEME[theme] }} />
      <NaturalThemeArt theme={theme} />
      <canvas ref={canvasRef} className="atmosphere-canvas absolute inset-0 h-full w-full" />
    </div>
  );
};
