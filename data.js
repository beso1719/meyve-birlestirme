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
  {
    id: "face", name: "Suratlar", price: 150, emoji: "😎",
    set: [
      { emoji: "😀", code: "1f600", color: "#ffd95a" }, { emoji: "😁", code: "1f601", color: "#ffcf3f" },
      { emoji: "😂", code: "1f602", color: "#ffc107" }, { emoji: "😊", code: "1f60a", color: "#ffb74d" },
      { emoji: "😍", code: "1f60d", color: "#ff7675" }, { emoji: "😎", code: "1f60e", color: "#fdcb6e" },
      { emoji: "🤩", code: "1f929", color: "#feca57" }, { emoji: "😡", code: "1f621", color: "#e74c3c" },
      { emoji: "🤯", code: "1f92f", color: "#fab1a0" }, { emoji: "🥳", code: "1f973", color: "#f368e0" },
      { emoji: "👹", code: "1f479", color: "#d63031" },
    ],
  },
  {
    id: "flower", name: "Çiçek Bahçesi", price: 180, emoji: "🌸",
    set: [
      { emoji: "🌱", code: "1f331", color: "#55efc4" }, { emoji: "🌿", code: "1f33f", color: "#2ecc71" },
      { emoji: "🍀", code: "1f340", color: "#27ae60" }, { emoji: "🌷", code: "1f337", color: "#fd79a8" },
      { emoji: "🌹", code: "1f339", color: "#e74c3c" }, { emoji: "🌺", code: "1f33a", color: "#ff6b81" },
      { emoji: "🌻", code: "1f33b", color: "#feca57" }, { emoji: "🌸", code: "1f338", color: "#ffb8d9" },
      { emoji: "💐", code: "1f490", color: "#ff9ff3" }, { emoji: "🌼", code: "1f33c", color: "#fff200" },
      { emoji: "🪷", code: "1fab7", color: "#fab1c4" },
    ],
  },
  {
    id: "gem", name: "Mücevherler", price: 250, emoji: "💎",
    set: [
      { emoji: "🔸", code: "1f538", color: "#f0932b" }, { emoji: "🔶", code: "1f536", color: "#e67e22" },
      { emoji: "💠", code: "1f4a0", color: "#74b9ff" }, { emoji: "🔹", code: "1f539", color: "#54a0ff" },
      { emoji: "🔷", code: "1f537", color: "#0984e3" }, { emoji: "🟣", code: "1f7e3", color: "#9b59b6" },
      { emoji: "🟡", code: "1f7e1", color: "#f1c40f" }, { emoji: "🟢", code: "1f7e2", color: "#2ecc71" },
      { emoji: "🟠", code: "1f7e0", color: "#e67e22" }, { emoji: "💎", code: "1f48e", color: "#00cec9" },
      { emoji: "👑", code: "1f451", color: "#ffd700" },
    ],
  },
  {
    id: "sea", name: "Deniz Canlıları", price: 220, emoji: "🐙",
    set: [
      { emoji: "🐚", code: "1f41a", color: "#fab1a0" }, { emoji: "🐌", code: "1f40c", color: "#d4a373" },
      { emoji: "🦐", code: "1f990", color: "#ff7675" }, { emoji: "🦀", code: "1f980", color: "#e74c3c" },
      { emoji: "🐙", code: "1f419", color: "#e056fd" }, { emoji: "🐠", code: "1f420", color: "#feca57" },
      { emoji: "🐡", code: "1f421", color: "#f6e58d" }, { emoji: "🦑", code: "1f991", color: "#ffb8b8" },
      { emoji: "🐬", code: "1f42c", color: "#74b9ff" }, { emoji: "🦈", code: "1f988", color: "#95a5a6" },
      { emoji: "🐳", code: "1f433", color: "#0984e3" },
    ],
  },
  {
    id: "food", name: "Fast Food", price: 200, emoji: "🍔",
    set: [
      { emoji: "🍟", code: "1f35f", color: "#feca57" }, { emoji: "🌭", code: "1f32d", color: "#e17055" },
      { emoji: "🍕", code: "1f355", color: "#e74c3c" }, { emoji: "🍔", code: "1f354", color: "#d4a373" },
      { emoji: "🌮", code: "1f32e", color: "#f6b93b" }, { emoji: "🌯", code: "1f32f", color: "#e1b12c" },
      { emoji: "🥪", code: "1f96a", color: "#f8c291" }, { emoji: "🍗", code: "1f357", color: "#cd6133" },
      { emoji: "🥩", code: "1f969", color: "#c0392b" }, { emoji: "🍖", code: "1f356", color: "#a0522d" },
      { emoji: "🍱", code: "1f371", color: "#ff7979" },
    ],
  },
  {
    id: "weather", name: "Gökyüzü", price: 200, emoji: "🌈",
    set: [
      { emoji: "⭐", code: "2b50",  color: "#f1c40f" }, { emoji: "🌙", code: "1f319", color: "#fdcb6e" },
      { emoji: "☁️", code: "2601",  color: "#dfe6e9" }, { emoji: "🌈", code: "1f308", color: "#74b9ff" },
      { emoji: "⚡", code: "26a1",  color: "#ffeaa7" }, { emoji: "🔥", code: "1f525", color: "#e17055" },
      { emoji: "💧", code: "1f4a7", color: "#74b9ff" }, { emoji: "❄️", code: "2744",  color: "#a4dcf5" },
      { emoji: "🌪️", code: "1f32a", color: "#b2bec3" }, { emoji: "☀️", code: "2600",  color: "#f39c12" },
      { emoji: "🌊", code: "1f30a", color: "#0984e3" },
    ],
  },
  {
    id: "car", name: "Taşıtlar", price: 250, emoji: "🚗",
    set: [
      { emoji: "🛹", code: "1f6f9", color: "#e17055" }, { emoji: "🛴", code: "1f6f4", color: "#636e72" },
      { emoji: "🚲", code: "1f6b2", color: "#0984e3" }, { emoji: "🏍️", code: "1f3cd", color: "#2d3436" },
      { emoji: "🚗", code: "1f697", color: "#e74c3c" }, { emoji: "🚙", code: "1f699", color: "#3498db" },
      { emoji: "🚌", code: "1f68c", color: "#f1c40f" }, { emoji: "🚒", code: "1f692", color: "#c0392b" },
      { emoji: "🚜", code: "1f69c", color: "#27ae60" }, { emoji: "🚂", code: "1f682", color: "#8d6e63" },
      { emoji: "🚀", code: "1f680", color: "#636e72" },
    ],
  },
  {
    id: "heart", name: "Kalpler", price: 180, emoji: "❤️",
    set: [
      { emoji: "❤️", code: "2764",  color: "#e74c3c" }, { emoji: "🧡", code: "1f9e1", color: "#e67e22" },
      { emoji: "💛", code: "1f49b", color: "#f1c40f" }, { emoji: "💚", code: "1f49a", color: "#2ecc71" },
      { emoji: "💙", code: "1f499", color: "#3498db" }, { emoji: "💜", code: "1f49c", color: "#9b59b6" },
      { emoji: "🤎", code: "1f90e", color: "#8d6e63" }, { emoji: "🖤", code: "1f5a4", color: "#2d3436" },
      { emoji: "🤍", code: "1f90d", color: "#ecf0f1" }, { emoji: "💗", code: "1f497", color: "#fd79a8" },
      { emoji: "💖", code: "1f496", color: "#ff6b81" },
    ],
  },
  {
    id: "party", name: "Parti", price: 230, emoji: "🎉",
    set: [
      { emoji: "🎈", code: "1f388", color: "#e74c3c" }, { emoji: "🎉", code: "1f389", color: "#f1c40f" },
      { emoji: "🎊", code: "1f38a", color: "#fd79a8" }, { emoji: "🎁", code: "1f381", color: "#e84393" },
      { emoji: "🎀", code: "1f380", color: "#ff7675" }, { emoji: "🪅", code: "1fa85", color: "#f368e0" },
      { emoji: "🎂", code: "1f382", color: "#ffeaa7" }, { emoji: "🧨", code: "1f9e8", color: "#c0392b" },
      { emoji: "✨", code: "2728",  color: "#feca57" }, { emoji: "🎆", code: "1f386", color: "#9b59b6" },
      { emoji: "🎇", code: "1f387", color: "#fdcb6e" },
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
  { id: "battle",   name: "Meyve Savaşı",  emoji: "🥊", attacks: true, deathLineRatio: 0.08, timeLimit: 0, desc: "1'e 1 savaş! Birleştirdikçe rakibe meyve fırlat. Meyvesi önce çizgiye değen kaybeder.", win: "survive" },
  { id: "tug",      name: "Halat Çekme",   emoji: "🪢", attacks: true, gap: 600, deathLineRatio: 0.1, timeLimit: 0, desc: "Çekişmeli kapışma! Skoru çek, rakibe 600 fark atan kazanır. Birleştirmeler rakibe meyve de yollar.", win: "tug" },
  { id: "blitz",    name: "Hızlı Tur",     emoji: "⚡", timeLimit: 60, desc: "60 saniye! En yüksek skoru yapan kazanır.", win: "score" },
  { id: "sprint",   name: "Sprint 1000",   emoji: "🏃", target: 1000, timeLimit: 0, desc: "1000 skora ilk ulaşan kazanır, süre yok.", win: "target" },
  { id: "bombwar",  name: "Bomba Savaşı",  emoji: "💣", bombChance: 0.18, timeLimit: 90, desc: "Bombalar yağarken 90 sn'de en yüksek skor kazanır.", win: "score" },
  { id: "chaos",    name: "Kaos Savaşı",   emoji: "🌀", attacks: true, bombChance: 0.1, gravity: 1.8, deathLineRatio: 0.1, timeLimit: 0, desc: "Bombalı meyve savaşı! Hem rakibe fırlat hem hayatta kal, çizgiye değen kaybeder.", win: "survive" },
  { id: "mega",     name: "Karpuz Yarışı", emoji: "🍉", target: 2500, timeLimit: 0, desc: "2500 skora ilk ulaşan kazanır, uzun maraton.", win: "target" },
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
  deathLineRatio: 0.15,
  gap: 0,
  seed: null,
};
