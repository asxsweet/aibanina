import { ThemeName } from '../utils/constellationUtils';

// Shared theme reskin table — every mini-game pulls its player/collectible/
// bonus/obstacle emoji from here so all games in the rotation feel visually
// consistent with the active site theme, without duplicating the table in
// every game file.
export interface ThemeGameAssets {
  player: string;
  collect: string; // main collectible (+1 point)
  bonus: string; // rare collectible (+2 points)
  obstacle: string; // avoid this
  missionTitle: string;
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
    missionTitle: '10 жүрекшені жина',
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
    missionTitle: '10 жүрекшені жина',
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
    missionTitle: '10 гүл жапырағын жина',
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
    missionTitle: '10 гүлді жина',
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
    missionTitle: '10 асыл тасты жина',
    missionText: 'Ағып жатқан жұлдызды 🌠 басқар, асыл тастарды 💎 ұста және жарғанаттан 🦇 қаш — жаңа хабарлама ашылады!',
    lostTitle: 'Блинн жарғанат жұлдызға тиіп қойды!',
    lostText: 'Давай давай қайталап көр сенің қолыңнан келеді!',
    wonBonusText: 'Самая умная ,молодец жүрекшелерді жинадың.',
  },
};

// Extra symbol pool used by the memory-match game (needs more distinct
// symbols than just collect/bonus/obstacle) — themed per active palette.
export const THEME_MEMORY_SYMBOLS: Record<ThemeName, string[]> = {
  day: ['💕', '⭐', '🌙', '💫', '🌹', '💌', '💖', '🕊️'],
  night: ['💕', '⭐', '🌙', '💫', '🌹', '💌', '💖', '🕊️'],
  dawn: ['🌸', '☀️', '🎈', '🌅', '🌷', '🦩', '🍑', '🌼'],
  mint: ['🌼', '🐝', '🦋', '🍃', '🌿', '🌱', '🍀', '🌻'],
  velvet: ['💎', '✨', '🌠', '🔮', '👑', '🦇', '🌌', '💜'],
};
