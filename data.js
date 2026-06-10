// 🍉 Oyun verileri: meyveler, leveller, modlar
// ---- Meyve tanımları (küçükten büyüğe) ----
const FRUITS = [
  { emoji: "🍒", code: "1f352", r: 16,  color: "#e74c3c" },
  { emoji: "🍓", code: "1f353", r: 22,  color: "#e84393" },
  { emoji: "🍇", code: "1f347", r: 29,  color: "#9b59b6" },
  { emoji: "🍊", code: "1f34a", r: 37,  color: "#f39c12" },
  { emoji: "🍎", code: "1f34e", r: 45,  color: "#e74c3c" },
  { emoji: "🍐", code: "1f350", r: 54,  color: "#a3cb38" },
  { emoji: "🍑", code: "1f351", r: 63,  color: "#ff9a8b" },
  { emoji: "🥭", code: "1f96d", r: 73,  color: "#f6b93b" },
  { emoji: "🍍", code: "1f34d", r: 84,  color: "#f1c40f" },
  { emoji: "🍈", code: "1f348", r: 96,  color: "#badc58" },
  { emoji: "🍉", code: "1f349", r: 110, color: "#2ecc71" },
];
const MAX_TIER = FRUITS.length - 1;

// Twemoji resimlerini önceden yükle (her cihazda aynı görünür)
for (const f of FRUITS) {
  const img = new Image();
  img.crossOrigin = "anonymous";
  img.src = `https://cdn.jsdelivr.net/gh/jdecked/twemoji@15.1.0/assets/72x72/${f.code}.png`;
  f.img = img;
}

// Özel cisimler (bomba vb.)
const SPECIAL = {
  bomb:  { emoji: "💣", code: "1f4a3", r: 30, color: "#34495e" },
};
for (const k in SPECIAL) {
  const s = SPECIAL[k];
  const img = new Image();
  img.crossOrigin = "anonymous";
  img.src = `https://cdn.jsdelivr.net/gh/jdecked/twemoji@15.1.0/assets/72x72/${s.code}.png`;
  s.img = img;
}

// Kampanya modunun adı (menüde ve başlıkta görünür)
const CAMPAIGN_NAME = "Meyve Seferi";
const CAMPAIGN_EMOJI = "🧭";

// ---- Level tasarımları ----
// Her level farklı bir twist içerir; oyuncu sıkılmasın diye çeşitlilik.
// reward = level ilk kez geçilince kazanılan altın.
const LEVELS = [
  { id: 1,  name: "Başlangıç",     emoji: "🍒", target: 250,  spawnMaxTier: 4, reward: 20 },
  { id: 2,  name: "Dar Kavanoz",   emoji: "🫙", target: 400,  spawnMaxTier: 4, jarWidthRatio: 0.8, reward: 25 },
  { id: 3,  name: "Zaman Yarışı",  emoji: "⏱️", target: 500,  spawnMaxTier: 4, timeLimit: 150, reward: 25 },
  { id: 4,  name: "Az Hamle",      emoji: "🎯", target: 550,  spawnMaxTier: 4, maxDrops: 45, reward: 30 },
  { id: 5,  name: "Ağır Çekim",    emoji: "🪨", target: 700,  spawnMaxTier: 5, gravity: 1.6, reward: 30 },
  { id: 6,  name: "Bombalar",      emoji: "💣", target: 800,  spawnMaxTier: 4, bombChance: 0.07, reward: 35 },
  { id: 7,  name: "Buz Pateni",    emoji: "🧊", target: 900,  spawnMaxTier: 5, friction: 0.03, restitution: 0.4, reward: 35 },
  { id: 8,  name: "Sadece Büyük",  emoji: "🍍", target: 1000, spawnTiers: [1, 2, 3, 4], reward: 40 },
  { id: 9,  name: "Yükselen Lav",  emoji: "🌋", target: 1100, spawnMaxTier: 4, risingDeath: 2.2, reward: 40 },
  { id: 10, name: "Düşük Çekim",   emoji: "🎈", target: 1200, spawnMaxTier: 5, gravity: 0.7, restitution: 0.5, reward: 45 },
  { id: 11, name: "Kaos",          emoji: "🌀", target: 1400, spawnMaxTier: 5, gravity: 1.4, bombChance: 0.05, jarWidthRatio: 0.92, reward: 50 },
  { id: 12, name: "Karpuz Ustası", emoji: "🍉", target: 1700, spawnMaxTier: 5, maxDrops: 90, reward: 60 },
  { id: 13, name: "Dar & Hızlı",   emoji: "🏃", target: 1200, spawnMaxTier: 4, jarWidthRatio: 0.82, timeLimit: 150, reward: 55 },
  { id: 14, name: "Bomba Yağmuru", emoji: "🌧️", target: 1500, spawnMaxTier: 4, bombChance: 0.12, reward: 55 },
  { id: 15, name: "Cam Kavanoz",   emoji: "🪟", target: 1600, spawnMaxTier: 5, friction: 0.02, restitution: 0.5, jarWidthRatio: 0.88, reward: 60 },
  { id: 16, name: "Volkan",        emoji: "🌋", target: 1800, spawnMaxTier: 5, risingDeath: 3, reward: 65 },
  { id: 17, name: "Uzayda",        emoji: "🚀", target: 1900, spawnMaxTier: 6, gravity: 0.6, restitution: 0.55, reward: 70 },
  { id: 18, name: "Tek Hamlede",   emoji: "🎴", target: 1900, spawnTiers: [2, 3, 4, 5], maxDrops: 70, reward: 70 },
  { id: 19, name: "Fırtına",       emoji: "🌪️", target: 2100, spawnMaxTier: 6, gravity: 1.7, bombChance: 0.06, jarWidthRatio: 0.85, reward: 75 },
  { id: 20, name: "Buzul Çağı",    emoji: "❄️", target: 2200, spawnMaxTier: 6, friction: 0.01, restitution: 0.5, timeLimit: 180, reward: 80 },
  { id: 21, name: "Yağmurlu Lav",  emoji: "☄️", target: 2400, spawnMaxTier: 5, risingDeath: 2.8, bombChance: 0.07, reward: 85 },
  { id: 22, name: "İğne Deliği",   emoji: "🪡", target: 2600, spawnMaxTier: 6, jarWidthRatio: 0.72, reward: 90 },
  { id: 23, name: "Son Sınav",     emoji: "🎓", target: 2900, spawnMaxTier: 6, gravity: 1.5, bombChance: 0.06, maxDrops: 120, reward: 100 },
  { id: 24, name: "Karpuz Kralı",  emoji: "👑", target: 3400, spawnMaxTier: 6, jarWidthRatio: 0.9, reward: 150 },
];

// ---- Meyve setleri (skinler) ----
// Her skin 11 kademe için emoji + twemoji kodu + renk verir.
// Varsayılan set = yukarıdaki FRUITS. Diğerleri markette satılır.
const SKINS = [
  {
    id: "fruit", name: "Klasik Meyve", price: 0, emoji: "🍉",
    set: FRUITS.map((f) => ({ emoji: f.emoji, code: f.code, color: f.color, r: f.r })),
  },
  {
    id: "animal", name: "Sevimli Hayvanlar", price: 150, emoji: "🐼",
    set: [
      { emoji: "🐭", code: "1f42d", color: "#b8c2cc" }, { emoji: "🐹", code: "1f439", color: "#f6b93b" },
      { emoji: "🐰", code: "1f430", color: "#dfe6e9" }, { emoji: "🐱", code: "1f431", color: "#fab1a0" },
      { emoji: "🐶", code: "1f436", color: "#e1a95f" }, { emoji: "🐼", code: "1f43c", color: "#dfe6e9" },
      { emoji: "🐨", code: "1f428", color: "#b2bec3" }, { emoji: "🦁", code: "1f981", color: "#f0932b" },
      { emoji: "🐯", code: "1f42f", color: "#f6b93b" }, { emoji: "🐮", code: "1f42e", color: "#ffeaa7" },
      { emoji: "🐲", code: "1f432", color: "#2ecc71" },
    ],
  },
  {
    id: "space", name: "Uzay", price: 200, emoji: "🪐",
    set: [
      { emoji: "🌑", code: "1f311", color: "#636e72" }, { emoji: "🌒", code: "1f312", color: "#74808a" },
      { emoji: "🌓", code: "1f313", color: "#95a5a6" }, { emoji: "🌔", code: "1f314", color: "#b2bec3" },
      { emoji: "🌕", code: "1f315", color: "#dfe6e9" }, { emoji: "⭐", code: "2b50",  color: "#f1c40f" },
      { emoji: "🌟", code: "1f31f", color: "#fdcb6e" }, { emoji: "☄️", code: "2604",  color: "#e17055" },
      { emoji: "🪐", code: "1fa90", color: "#e1b12c" }, { emoji: "🌍", code: "1f30d", color: "#0984e3" },
      { emoji: "☀️", code: "2600",  color: "#f39c12" },
    ],
  },
  {
    id: "sweet", name: "Tatlılar", price: 200, emoji: "🍩",
    set: [
      { emoji: "🍬", code: "1f36c", color: "#fd79a8" }, { emoji: "🍭", code: "1f36d", color: "#e84393" },
      { emoji: "🧁", code: "1f9c1", color: "#fab1a0" }, { emoji: "🍫", code: "1f36b", color: "#8d6e63" },
      { emoji: "🍪", code: "1f36a", color: "#d4a373" }, { emoji: "🍩", code: "1f369", color: "#e1a95f" },
      { emoji: "🎂", code: "1f382", color: "#ffeaa7" }, { emoji: "🍰", code: "1f370", color: "#fab1a0" },
      { emoji: "🥧", code: "1f967", color: "#e1b12c" }, { emoji: "🍦", code: "1f366", color: "#fdcbcb" },
      { emoji: "🍨", code: "1f368", color: "#ff7675" },
    ],
  },
  {
    id: "ball", name: "Spor Topları", price: 250, emoji: "⚽",
    set: [
      { emoji: "⚾", code: "26be",  color: "#ecf0f1" }, { emoji: "🎾", code: "1f3be", color: "#badc58" },
      { emoji: "🏐", code: "1f3d0", color: "#dfe6e9" }, { emoji: "⚽", code: "26bd",  color: "#2d3436" },
      { emoji: "🏀", code: "1f3c0", color: "#e17055" }, { emoji: "🎱", code: "1f3b1", color: "#2d3436" },
      { emoji: "🏈", code: "1f3c8", color: "#8d6e63" }, { emoji: "🏉", code: "1f3c9", color: "#6ab04c" },
      { emoji: "🥎", code: "1f94e", color: "#f6e58d" }, { emoji: "🎳", code: "1f3b3", color: "#487eb0" },
      { emoji: "🌐", code: "1f310", color: "#0984e3" },
    ],
  },
];

// Skin görsellerini önceden yükle
for (const sk of SKINS) {
  for (const it of sk.set) {
    if (!it.r) it.r = FRUITS[sk.set.indexOf(it)].r; // varsayılan yarıçaplar
    const img = new Image(); img.crossOrigin = "anonymous";
    img.src = `https://cdn.jsdelivr.net/gh/jdecked/twemoji@15.1.0/assets/72x72/${it.code}.png`;
    it.img = img;
  }
}
function getSkin(id) { return SKINS.find((s) => s.id === id) || SKINS[0]; }

// ---- Düello modları ----
const DUEL_MODES = [
  { id: "classic",  name: "Klasik Yarış",  emoji: "⚔️", timeLimit: 120, desc: "2 dakikada en yüksek skoru yapan kazanır.", win: "score" },
  { id: "target",   name: "Hedef Yarışı",  emoji: "🏁", target: 1500, timeLimit: 0, desc: "1500 skora ilk ulaşan kazanır, süre yok.", win: "target" },
  { id: "survival", name: "Hayatta Kal",   emoji: "💀", risingDeath: 2.5, timeLimit: 0, desc: "Ölüm çizgisi yükselir, son ayakta kalan kazanır.", win: "survive" },
  { id: "battle",   name: "Meyve Savaşı",  emoji: "🥊", risingDeath: 1.2, attacks: true, timeLimit: 0, desc: "1'e 1 savaş! Birleştirdikçe rakibe meyve fırlat, son ayakta kalan kazanır.", win: "survive" },
  { id: "coop",     name: "Ortak Hedef",   emoji: "🤝", target: 4000, timeLimit: 0, desc: "İkiniz birlikte 4000 skora ulaşın, süre yok.", win: "coop" },
];
function getDuelMode(id) { return DUEL_MODES.find((m) => m.id === id) || DUEL_MODES[0]; }

// Tüm modların ortak varsayılanları
const BASE_CFG = {
  gravity: 1.4,
  jarWidthRatio: 1,
  spawnMaxTier: 4,
  spawnTiers: null,
  friction: 0.6,
  restitution: 0.2,
  timeLimit: null,
  maxDrops: null,
  target: null,
  bombChance: 0,
  risingDeath: 0,
  attacks: false,
  seed: null,
};
