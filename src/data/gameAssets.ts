import type { ThemeName } from './themes';

// Shared theme reskin table — every mini-game pulls its player/collectible/
// bonus/obstacle emoji from here so all games in the rotation feel visually
// consistent with the active site theme, without duplicating the table in
// every game file.
export interface ThemeGameAssets {
  player: string;
  collect: string; // main collectible (+1 point)
  bonus: string; // rare collectible (+2 points)
  obstacle: string; // avoid this
  missionTitle: string; // may contain {n} — replaced with the round's target score
  missionText: string;
  lostTitle: string;
  lostText: string;
  wonBonusText: string;
}

export const THEME_GAME_ASSETS: Record<ThemeName, ThemeGameAssets> = {
  day: {
    player: '🌙',
    collect: '💕',
    bonus: '⭐',
    obstacle: '🪨',
    missionTitle: '{n} жүрекшені жина',
    missionText: 'Айды 🌙 басқар, түсіп жатқан жүректерді 💕 ұста және тастардан 🪨 қаш !',
    lostTitle: 'Блиин тас айға тиіп қойдыы',
    lostText: 'Давай қайталап көр сенің қолыңнан келеді',
    wonBonusText: 'Самая умная ,молодец жүрекшелерді жинадың',
  },
  night: {
    player: '🌙',
    collect: '💕',
    bonus: '⭐',
    obstacle: '🪨',
    missionTitle: '{n} жүрекшені жина',
    missionText: 'Айды 🌙 басқар, түсіп жатқан жүректерді 💕 ұста және тастардан 🪨 қаш !',
    lostTitle: 'Блиин тас айға тиіп қойдыы!',
    lostText: 'Давай давай қайталап көр сенің қолыңнан келеді',
    wonBonusText: 'Самая умная ,молодец жүрекшелерді жинадың',
  },
  dawn: {
    player: '🎈',
    collect: '🌸',
    bonus: '☀️',
    obstacle: '☁️',
    missionTitle: '{n} гүл жапырағын жина',
    missionText: 'Әуе шарын 🎈 басқар, түсіп жатқан гүл жапырақтарын 🌸 ұста және бұлттардан ☁️ қаш !',
    lostTitle: 'Блин бұлт шарға тиіп қойды!',
    lostText: 'Давай давай қайталап көр сенің қолыңнан келеді!',
    wonBonusText: 'Самая умная ,молодец жүрекшелерді жинадың',
  },
  mint: {
    player: '🦋',
    collect: '🌼',
    bonus: '🐝',
    obstacle: '🥀',
    missionTitle: '{n} гүлді жина',
    missionText: 'Көбелекті 🦋 басқар, түсіп жатқан гүлдерді 🌼 ұста және тікенектерден 🥀 қаш жаңа хабарлама ашылады !',
    lostTitle: 'Ой, тікенек қанатқа тиді!',
    lostText: 'Давай давай қайталап көр сенің қолыңнан келеді!',
    wonBonusText: 'Самая умная ,молодец жүрекшелерді жинадың.',
  },
  velvet: {
    player: '🌠',
    collect: '💎',
    bonus: '✨',
    obstacle: '🦇',
    missionTitle: '{n} асыл тасты жина',
    missionText: 'Ағып жатқан жұлдызды 🌠 басқар, асыл тастарды 💎 ұста және жарғанаттан 🦇 қаш — жаңа хабарлама ашылады!',
    lostTitle: 'Блинн жарғанат жұлдызға тиіп қойды!',
    lostText: 'Давай давай қайталап көр сенің қолыңнан келеді!',
    wonBonusText: 'Самая умная ,молодец жүрекшелерді жинадың.',
  },
  autumn: {
    player: '🦔',
    collect: '🍂',
    bonus: '🌰',
    obstacle: '🌧️',
    missionTitle: '{n} күзгі жапырақты жина',
    missionText: 'Кірпіні 🦔 басқар, түсіп жатқан жапырақтарды 🍂 ұста және жаңбырдан 🌧️ қаш — жаңа хабарлама ашылады!',
    lostTitle: 'Ой, жаңбыр жауып кетті!',
    lostText: 'Давай давай қайталап көр сенің қолыңнан келеді!',
    wonBonusText: 'Самая умная, молодец, жапырақтарды жинадың!',
  },
  winter: {
    player: '⛄',
    collect: '❄️',
    bonus: '🎁',
    obstacle: '🧊',
    missionTitle: '{n} қар ұшқынын жина',
    missionText: 'Аққалақайды ⛄ басқар, түсіп жатқан қар ұшқындарын ❄️ ұста және мұздан 🧊 қаш — жаңа хабарлама ашылады!',
    lostTitle: 'Ой, мұз аққалақайға тиіп кетті!',
    lostText: 'Давай давай қайталап көр сенің қолыңнан келеді!',
    wonBonusText: 'Самая умная, молодец, қар ұшқындарын жинадың!',
  },
  treasure: {
    player: '⛵',
    collect: '🪙',
    bonus: '💎',
    obstacle: '🌊',
    missionTitle: '{n} теңге жина',
    missionText: 'Кемені ⛵ басқар, суға түскен теңгелерді 🪙 ұста және үлкен толқындардан 🌊 қаш — жаңа хабарлама ашылады!',
    lostTitle: 'Ой, толқын кемеге соқты!',
    lostText: 'Давай давай қайталап көр сенің қолыңнан келеді!',
    wonBonusText: 'Самая умная, молодец, қазынаны таптың!',
  },
  aurora: {
    player: '🦉',
    collect: '✨',
    bonus: '🌌',
    obstacle: '☁️',
    missionTitle: '{n} жарқылды жина',
    missionText: 'Үкіні 🦉 басқар, аврора жарқылдарын ✨ ұста және бұлттардан ☁️ қаш — жаңа хабарлама ашылады!',
    lostTitle: 'Ой, бұлт үкіге тиіп кетті!',
    lostText: 'Давай давай қайталап көр сенің қолыңнан келеді!',
    wonBonusText: 'Самая умная, молодец, жарқылдарды жинадың!',
  },
  galaxy: {
    player: '🚀',
    collect: '⭐',
    bonus: '🪐',
    obstacle: '☄️',
    missionTitle: '{n} жұлдыз жина',
    missionText: 'Зымыранды 🚀 басқар, жұлдыздарды ⭐ ұста және метеориттерден ☄️ қаш — жаңа хабарлама ашылады!',
    lostTitle: 'Ой, метеорит зымыранға тиді!',
    lostText: 'Давай давай қайталап көр сенің қолыңнан келеді!',
    wonBonusText: 'Самая умная, молодец, жұлдыздарды жинадың!',
  },
  gold: {
    player: '👑',
    collect: '🪙',
    bonus: '💎',
    obstacle: '🔥',
    missionTitle: '{n} алтын тиын жина',
    missionText: 'Тәжді 👑 басқар, алтын тиындарды 🪙 ұста және оттан 🔥 қаш — жаңа хабарлама ашылады!',
    lostTitle: 'Ой, от тәжге тиіп кетті!',
    lostText: 'Давай давай қайталап көр сенің қолыңнан келеді!',
    wonBonusText: 'Самая умная, молодец, алтынды жинадың!',
  },
  sakura: { player:'🦋',collect:'🌸',bonus:'💮',obstacle:'🌧️',missionTitle:'{n} сакура гүлін жина',missionText:'Көбелекті басқар, сакура гүлдерін жина!',lostTitle:'Жаңбыр басталды!',lostText:'Тағы бір рет байқап көр!',wonBonusText:'Сакура бағы сен үшін гүлдеді!' },
  ocean: { player:'🐬',collect:'🐚',bonus:'💎',obstacle:'🦈',missionTitle:'{n} інжу жина',missionText:'Дельфинді басқар, інжулерді жина!',lostTitle:'Акула жақындап қалды!',lostText:'Толқынмен бірге қайта жүз!',wonBonusText:'Мұхит қазынасын таптың!' },
  lavender: { player:'🦋',collect:'🪻',bonus:'✨',obstacle:'🌪️',missionTitle:'{n} лаванда жина',missionText:'Лаванда гүлдерін жинап, желден қаш!',lostTitle:'Жел күшейіп кетті!',lostText:'Қайта байқап көр!',wonBonusText:'Лаванда арманы орындалды!' },
  sunset: { player:'🕊️',collect:'☀️',bonus:'💖',obstacle:'☁️',missionTitle:'{n} күн сәулесін жина',missionText:'Күн батардағы сәулелерді жина!',lostTitle:'Бұлт жолды жапты!',lostText:'Күн қайта шығады!',wonBonusText:'Күн батуы саған арналған!' },
  retro: { player:'📻',collect:'💌',bonus:'🌹',obstacle:'📼',missionTitle:'{n} хат жина',missionText:'Ескі махаббат хаттарын жина!',lostTitle:'Пленка шатасып қалды!',lostText:'Қайта айналдырып көр!',wonBonusText:'Естеліктер қайта жанданды!' },
  neon: { player:'🏎️',collect:'💜',bonus:'⚡',obstacle:'🚧',missionTitle:'{n} неон жүрек жина',missionText:'Неон қалада жүректерді жина!',lostTitle:'Кедергіге соғылдың!',lostText:'Қаланы қайта бағындыр!',wonBonusText:'Неон шамдары сен үшін жанды!' },
  clouds: { player:'🎈',collect:'☁️',bonus:'🌈',obstacle:'⛈️',missionTitle:'{n} жұмсақ бұлт жина',missionText:'Әуе шарымен бұлттарды жина!',lostTitle:'Найзағай жақындады!',lostText:'Ашық аспанға қайта көтеріл!',wonBonusText:'Кемпірқосақ ашылды!' },
  kazakh: { player:'🐎',collect:'✨',bonus:'🪙',obstacle:'⛰️',missionTitle:'{n} алтын белгі жина',missionText:'Тұлпармен даладағы белгілерді жина!',lostTitle:'Тау жолды бөгеді!',lostText:'Тұлпармен қайта шап!',wonBonusText:'Ұлы дала жұлдызы жанды!' },
  arabian: { player:'🧞',collect:'🌙',bonus:'💎',obstacle:'🏜️',missionTitle:'{n} ай сәулесін жина',missionText:'Шөл аспанындағы ай сәулелерін жина!',lostTitle:'Құмды дауыл басталды!',lostText:'Сиқырлы сапарды қайта баста!',wonBonusText:'Араб түнінің қазынасы ашылды!' },
};

// Extra symbol pool used by the memory-match game (needs more distinct
// symbols than just collect/bonus/obstacle) — themed per active palette.
export const THEME_MEMORY_SYMBOLS: Record<ThemeName, string[]> = {
  day: ['💕', '⭐', '🌙', '💫', '🌹', '💌', '💖', '🕊️'],
  night: ['💕', '⭐', '🌙', '💫', '🌹', '💌', '💖', '🕊️'],
  dawn: ['🌸', '☀️', '🎈', '🌅', '🌷', '🦩', '🍑', '🌼'],
  mint: ['🌼', '🐝', '🦋', '🍃', '🌿', '🌱', '🍀', '🌻'],
  velvet: ['💎', '✨', '🌠', '🔮', '👑', '🦇', '🌌', '💜'],
  autumn: ['🍂', '🍁', '🌰', '🍄', '🎃', '🦔', '🍎', '🌾'],
  winter: ['❄️', '⛄', '🎁', '🧣', '🕯️', '🦌', '🎄', '🌨️'],
  treasure: ['🪙', '💎', '🧭', '⛵', '🗺️', '🦜', '🐚', '🔑'],
  aurora: ['✨', '🌌', '🔮', '🦉', '🌠', '💚', '🌙', '🦌'],
  galaxy: ['⭐', '🪐', '🚀', '🌌', '☄️', '🛸', '🌙', '💫'],
  gold: ['🪙', '💎', '👑', '🏆', '📜', '🗝️', '🏅', '✨'],
  sakura: ['🌸','💮','🦋','🌷','💌','🍡','🌙','✨'],
  ocean: ['🐚','🐬','🌊','💎','🐠','🪸','⚓','🫧'],
  lavender: ['🪻','🦋','✨','💜','🌙','🔮','☁️','🕯️'],
  sunset: ['☀️','🌅','🕊️','💖','☁️','🌴','✨','🌊'],
  retro: ['📻','💌','🌹','📼','☎️','🎞️','🕰️','❤️'],
  neon: ['💜','⚡','🏎️','🌃','🎧','🪩','💎','🛸'],
  clouds: ['☁️','🌈','🎈','🕊️','☀️','🌤️','💧','⭐'],
  kazakh: ['🐎','✨','🪙','🦅','🏔️','🌙','☀️','💙'],
  arabian: ['🌙','🕌','💎','🪔','⭐','🏺','🐪','✨'],
};
