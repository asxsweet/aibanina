import { DailyMessage } from '../types';

// ==========================================
// ЖЕКЕЛЕНДІРУ — тек осыны өзгерт, есім бүкіл
// сайт бойынша автоматты түрде қойылады
// ==========================================
export const PARTNER_NAME = 'Aibanina';

// ==========================================
// САЙТ ТҮС ПАЛИТРАСЫ (ЖЕКЕЛЕНДІРУГЕ ҚОЛДАУ)
// ==========================================
export const COLOR_PALETTE = {
  bgNight: '#FDFBF7',       // Жылы кремді фон
  bgCard: 'rgba(247, 242, 234, 0.9)', // Мөлдір ашық карточка
  goldAccent: '#A9784F',    // Карамельді-қоңыр (жұлдыздар, акценттер)
  goldGlow: '#D8C3A5',      // Акцент жарқырауы
  pinkAccent: '#C97B8C',    // Басылған тозаңды раушан (жүрекшелер)
  pinkLight: '#E3B3BE',     // Ашық қызғылт жарқырау
  purpleBorder: 'rgba(169, 120, 79, 0.25)', // Талғампаз жиек
  textPrimary: '#5C3D26',   // Жылы қою қоңыр мәтін
  textMuted: '#B99B7A',     // Басылған бежевый
};

// ==========================================
// 30 КҮНДЕЛІКТІ РОМАНТИКАЛЫҚ ХАБАРЛАМА
// (Өз жеке мәтіндеріңе оңай ауыстыруға болады)
// ==========================================
export const DAILY_MESSAGES: DailyMessage[] = [
  {
    id: 1,
    dayNumber: 1,
    title: 'Жақын адамым',
    text: 'Біздің бірге болуымызға арақашықтық кедергі емес,сенмен өткізген әр күнім қайда жүрсемде шексіз жылу сыйлайды.',
    hint: 'Сен мен ұзақ іздеген One Piece-імсің.'
    
  },
  {
    id: 2,
    dayNumber: 2,
    title: 'Сенің күлкің',
    text: 'Даже через экран күлкің менің скучный күнімді нұрландырады, так что өзіңнің қандай әдемі екеніңді ұмытпа!',
    hint: 'Дәл қазір күлімде моя тигрица:)'
  },
  {
    id: 3,
    dayNumber: 3,
    title: 'Менің мелодиям',
    text: 'Сенің дауысың один из звезд моем небе что освещает мой день ,Сенің дауысың -менің сүйікті музам.',
    hint: 'Сені мәңгі естігім келеді.'
  },
  {
    id: 4,
    dayNumber: 4,
    title: 'Ақылы көркіне сай',
    text: 'Сен мені менен жақсы білесің,сен және сенің поддержкаңмен өзімді мықты сезінемін,ты знай что сен менің өмірімдегі ең ақылды жанымсың.',
    hint: 'Ты моя самая умная.'
  },
  {
    id: 5,
    dayNumber: 5,
    title: 'Сокровище ',
    text: 'Бұл бітпейтін мұхиттар мен аралдардан іздеген бағалы қазынам,қанша бітпейтін қазыналардың ішіндегі хайырлысы.',
    hint: 'Лаф Тэйл = Тараз .'
  },
  {
    id: 6,
    dayNumber: 6,
    title: 'Мен қызғанамын...',
    text: 'Я знаю что у тебя тяжелые дни,Ты работаешь так сумасшедшая, как будто сен мені емес жұмысты жақсы көретін сияқтысың,так что жди, я сниму с твоих плеч эту тяжёлую работу.',
    hint: 'Өзіңе көп күш салма ,сен и так көп жұмыс жасайсың.'
  },
  {
    id: 7,
    dayNumber: 7,
    title: '1 апта = 7 жұлдыз',
    text: 'Толық 7 апта болыпты,әр жұлдыздағы сөздер менің саған деген сезімімнің дәлелі,если это тебе нравится тогда әрі қарай жұлдыздарды жина я уверен что тебе не будут скучноо!',
    voiceUrl: '/voice/day-07.mp3'
  },
  {
    id: 8,
    dayNumber: 8,
    title: 'Кружок',
    text: 'Твоя невораятная лицо я хочу его увидеть снова снова,хочу что ты отправишь мне где угодно сколько угодно везде, Я Санджи который кров течет из нос когда увижу тебя,знай что я не устаю твоим красотой.',
    hint: 'Твоя кружок самая лучшая.'
  },
  {
    id: 9,
    dayNumber: 9,
    title: 'Көздерің сенің',
    text: 'Аспанымдағы жұлдыздарымның бірі,мен көздеріңе қарап шынайылылық пен жылулықты сезем,я не вижу кроме твоих глаз как будто я смотрию на галактику.',
    hint: 'Смотрию тебя и таю.'
  },
  {
    id: 10,
    dayNumber: 10,
    title: 'Ондық жұлдыз',
    text: 'Ты большая молодец ,қадам қадам мен уже 10 жұлдызға келдің, өз сезімімді жұлдыздар арқылы білдірем деп үш ұйықтасамда түсіме кірмепті,бірақ бұған дәлел жалғыз сен яғни себеп-сіз, и дальше я хочу любить тебя.',
    hint: 'Себеп-сіз.'
  },
  {
    id: 11,
    dayNumber: 11,
    title: 'Моя умница',
    text: 'Сенің ақылдылығың,өз ойың мен алдыға қарай ұмтылысыңа таңқаламын,сен тек әдемі ғана емес,ең ақылды қызсың!',
    hint: 'МегаМозг.'
  },
  {
    id: 12,
    dayNumber: 12,
    title: 'П-поддержка',
    text: 'Сен өзің тынып тұрған поддержкасың если не ты я бы не делал ничего этого ,сенің арқаңда өзіңмің болашағымды көрем,сен менің алға тартушымсың.',
    hint: 'Бірге болсақ бәрі болады.'
  },
  {
    id: 13,
    dayNumber: 13,
    title: 'Сенің әзілдерің',
    text: 'Сенің қасыңда кішкентай баламын , әр айтқан әзілдерңе балаша шынайы күле аламын,кейде ұяламын но если ты то могу вечно смущаться над твой шуткой.',
    hint: 'Менің StundUPer-м.'
  },
  {
    id: 14,
    dayNumber: 14,
    title: 'Жұлдыздарға 2 апта',
    text: 'Айдың жартысы өтіп кетіпті,но бұл біздің жұлдыздар тоқтайды дегенді білдірмейді ,это только начало!',
    voiceUrl: '/voice/day-14.mp3'
  },
  {
    id: 15,
    dayNumber: 15,
    title: 'Шынайылылық',
    text: 'Бір бірімізге деген шынайылығымыз махабатымызды күшейте түседі.',
    hint: 'Я буду любить тебя искренно.'
  },
  {
    id: 16,
    dayNumber: 16,
    title: 'Я извращенец ноо',
    text: 'Өмірімнің соңына дейін,тек сені ғана жақсы көрсем,егер сен тек мендік болатын болсаң,бір жастақта картайатын болсақ, тогда пусть я буду извращенцем',
    hint: 'Сені ойламаған кезім болмаған.'
  },
  {
    id: 17,
    dayNumber: 17,
    title: 'Егер...',
    text: 'Я рад что бұйыртса у нас будет прекрасные дети потому что их матери такой очаровательная что они будет похоже на тебя.',
    hint: 'Армандағанның зияны жоқ шығар ия?.'
  },
  {
    id: 18,
    dayNumber: 18,
    title: 'Соңғы ставка дейді ғой',
    text: 'Қазір мен ештеңе білмимін қанша жерден ақылды болсам да нені дұрыс істедім,нені дұрыс емес ,егер шынымен Алла Тағала сені маған хайырлы қылған болса,барлық ставканы сізге тіксем болады ма?.',
    hint: 'Аа есть ли шанс у меня?.'
  },
  {
    id: 19,
    dayNumber: 19,
    title: 'Когда другие целуется...',
    text: 'Бұл моментті тек сенімен ғана елестетем это как будет ,қалай сезіледі я не знаю но я рад что мои первый поцелуй будут именно с тобой.',
    hint: 'Моя очаровашка .'
  },
  {
    id: 20,
    dayNumber: 20,
    title: 'Комфорт+',
    text: 'Я хочу что бы ты рядом со мной чувствовал комфорт и уют.',
    hint: 'Жылуым.'
  },
  {
    id: 21,
    dayNumber: 21,
    title: 'Сенім=доверия',
    text: 'Ты можеш положится на меня, ты можеш расказать как твой денек прошел, что интересного был, кто тебе обидел, устала ли ты все все что можеш сказать, арамыз көптеген шақырымдар болсада,әрқашан жылу беруге дайынмын.',
    hint: 'Ешқашан сөнбейтін алауым!',
    voiceUrl: '/voice/day-21.mp3'
  },
  {
    id: 22,
    dayNumber: 22,
    title: 'Бір толқында',
    text: 'Біздің желкен қай бағытта болса, біз сол бағытта жүре аламыз, алдымыздағы толқындарға төтеп бере аламыз, ауа райына қарамастан біздің кеме желкеннің бағытымен жүре алады өйткені біз бір бірімізді түсінеміз және поддержка бере аламыз, у нас такой вайб потому что у меня есть ты!',
    hint: 'Егер осы сөзіме қосылған болсаң галереяға қағаздан жасап кеме сал.'
  },
  {
    id: 23,
    dayNumber: 23,
    title: 'Эгоист',
    text: 'Өзі мейірімді,ақылды,өте әдемі,қылықты,түсінігі мол жан,сендей қызды жоғалтып алғым келмейді және басқаға да бергім келмейді,осындай қызғаншақ жігтті ұнатасың ба? ',
    hint: 'Тек сені ғана қызғанамын'
  },
  {
    id: 24,
    dayNumber: 24,
    title: 'Кездесуге асықпын',
    text: 'Алла тағала сендей жанды маған беріп, арақашықтықпен сынап қойды, арамызда мыңдаған шақырымдар болғанымен, әр күнім сенің жаныңда болғанмен іспеттес, бірақ шанайы көріп құшақтап, қол ұстасып, жүргенге ештенке жетпейді. ',
    hint: 'Менің әрбір минуттарым сені ойлаумен өтуде..'
  },
  {
    id: 25,
    dayNumber: 25,
    title: 'Сұлу едің сен неткен',
    text: 'Самая, самая, самая прекрасная девушка,ни кто не сравнится с твойм красатой, саған әрдайым қарап отырғым келеді. ',
    hint: 'Моя очаровательная леди.'
  },
  {
    id: 26,
    dayNumber: 26,
    title: 'Сөзсіз түсінісуің',
    text: 'Хабарламадағы бір нүктеден немесе дауыс ырғағынан менің көңіл-күйімді қалай сезінетініңе таңғаламын.',
    hint: 'Біз бір толқындамыз.'
  },
  {
    id: 27,
    dayNumber: 27,
    title: 'Сенің мінсіз әзіл-қалжыңың',
    text: 'Сенің тапқыр әзілдерің әрқашан дәл тиеді. Біздің жеңіл әрі көңілді қарым-қатынасымызды жақсы көремін!',
    hint: 'Сенімен ешқашан жалықпаймын.'
  },
  {
    id: 28,
    dayNumber: 28,
    title: 'Жүрегім саған тиесілі',
    text: 'Ешбір километр менің сезімімді әлсірете алмайды. Жүрегім тек сен үшін соғып келді және соғады.',
    hint: 'Мәңгі сенікімін.',
    voiceUrl: '/voice/day-28.mp3'
  },
  {
    id: 29,
    dayNumber: 29,
    title: 'Тұтас айдың алдында',
    text: 'Ертең біздің шоқжұлдызымыз отыз күндік шеңберді жабады! Бірақ біздің тарихымыз енді ғана басталып жатыр.',
    hint: 'Сен менің шексіз бақытыммын.'
  },
  {
    id: 30,
    dayNumber: 30,
    title: 'Жұлдызды аспанның толық шеңбері',
    text: '30 күн, 30 жұлдыз және мыңдаған жылы сәттер. Біздің шоқжұлдызымыз ең жарқын жарықпен жанып тұр! Сені күн сайын қаттырақ сүйемін!',
    hint: 'Шексіз махаббат ❤️'
  }
];

// ==========================================
// АПТАЛЫҚ ФОТО-ТАПСЫРМАЛАР (Галерея)
// Әр 7 күнде бір рет ауысады, daysPlayed бойынша
// есептеледі. Өз тапсырмаларыңды осында өзгерт.
// ==========================================
export interface WeeklyChallenge {
  week: number;
  emoji: string;
  title: string;
  prompt: string;
}

export const WEEKLY_CHALLENGES: WeeklyChallenge[] = [
  {
    week: 1,
    emoji: '📸',
    title: 'Бүгінгі көңіл-күй',
    prompt: 'Дәл қазір қай жерде отырсаң да, сол сәтті бір суретке түсіріп қос.',
  },
  {
    week: 2,
    emoji: '☕',
    title: 'Таңғы сәт',
    prompt: 'Бүгінгі таңғы кофеңді, ас үстеліңді немесе терезеден көрінген көріністі түсіріп жібер.',
  },
  {
    week: 3,
    emoji: '🎧',
    title: 'Дауыс хабары',
    prompt: 'Галереяға өзіңнің қысқа видеоңды қос — тек 10 секунд сәлемдесу де жеткілікті.',
  },
  {
    week: 4,
    emoji: '🌙',
    title: 'Кештің көрінісі',
    prompt: 'Бүгінгі күн аяқталар алдында, айналаңдағы бір нәрсенің суретін түсір.',
  },
  {
    week: 5,
    emoji: '💌',
    title: 'Ескі естелік',
    prompt: 'Телефоныңдағы ескі суреттердің бірін тауып, неге ұнайтынын қолтаңбада жаз.',
  },
];

// Returns the active challenge for the given number of days played, cycling
// through the list above once the 5-week rotation completes.
export function getWeeklyChallenge(daysPlayed: number): WeeklyChallenge {
  const weekIndex = Math.floor(Math.max(0, daysPlayed) / 7) % WEEKLY_CHALLENGES.length;
  return WEEKLY_CHALLENGES[weekIndex];
}

// ==========================================
// STREAK-БОНУСТАРЫ ("ҚҰПИЯ ДЕҢГЕЙЛЕР")
// Стрик белгілі санға жеткенде арнайы тема
// ашылады. AVAILABLE_THEMES ретімен сәйкес:
// day (әдепкі) → night → dawn → mint → velvet
// ==========================================
export interface MilestoneBonus {
  streak: number;
  theme: 'night' | 'dawn' | 'mint' | 'velvet';
  title: string;
  text: string;
}

export const MILESTONE_BONUSES: MilestoneBonus[] = [
  {
    streak: 7,
    theme: 'night',
    title: '7 күндік стрик! 🔥',
    text: 'Бір апта қатарынан бірге болдық. Осы құрметке — жаңа "Жұлдызды түн" темасы саған арналған сыйлық.',
  },
  {
    streak: 14,
    theme: 'dawn',
    title: '14 күндік стрик! ✨',
    text: 'Екі апта — біздің шоқжұлдызымыз алыстан да жарқырап көрінеді. "Таң" темасы енді сенікі.',
  },
  {
    streak: 21,
    theme: 'mint',
    title: '21 күндік стрик! 🌿',
    text: 'Үш апта бойы бір күнді де жіберіп алмадың. "Жасыл бақ" темасы ашылды — саған сай, жайлы.',
  },
  {
    streak: 30,
    theme: 'velvet',
    title: '30 күндік стрик! 💎',
    text: 'Бір ай толық! Бұл — біздің қарым-қатынасымыздың ең асыл дәлелі. "Түн бархаты" темасы — соңғы, ең қымбат сыйлық.',
  },
];

// Helper to play synthesized audio sounds for gentle romantic feel
class SoundSynthesizer {
  private ctx: AudioContext | null = null;

  private init() {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  playCatch() {
    try {
      this.init();
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(523.25, this.ctx.currentTime); // C5
      osc.frequency.exponentialRampToValueAtTime(880, this.ctx.currentTime + 0.15); // A5
      gain.gain.setValueAtTime(0.15, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.2);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.22);
    } catch {
      // Audio context silenced or blocked
    }
  }

  playGoldenStar() {
    try {
      this.init();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      [587.33, 739.99, 880, 1174.66].forEach((freq, idx) => {
        const osc = this.ctx!.createOscillator();
        const gain = this.ctx!.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + idx * 0.05);
        gain.gain.setValueAtTime(0.12, now + idx * 0.05);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.05 + 0.25);
        osc.connect(gain);
        gain.connect(this.ctx!.destination);
        osc.start(now + idx * 0.05);
        osc.stop(now + idx * 0.05 + 0.28);
      });
    } catch {
      // Ignore audio fail
    }
  }

  playHit() {
    try {
      this.init();
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(180, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(90, this.ctx.currentTime + 0.2);
      gain.gain.setValueAtTime(0.15, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.22);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.23);
    } catch {
      // Ignore audio fail
    }
  }

  playWinFanfare() {
    try {
      this.init();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      const notes = [523.25, 659.25, 783.99, 1046.50]; // C, E, G, C6
      notes.forEach((freq, idx) => {
        const osc = this.ctx!.createOscillator();
        const gain = this.ctx!.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + idx * 0.12);
        gain.gain.setValueAtTime(0.15, now + idx * 0.12);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.12 + 0.4);
        osc.connect(gain);
        gain.connect(this.ctx!.destination);
        osc.start(now + idx * 0.12);
        osc.stop(now + idx * 0.12 + 0.45);
      });
    } catch {
      // Ignore
    }
  }
}

export const soundFx = new SoundSynthesizer();
