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

// ---- Level tasarımları ----
// Her level farklı bir twist içerir; oyuncu sıkılmasın diye çeşitlilik.
const LEVELS = [
  { id: 1,  name: "Başlangıç",     emoji: "🍒", target: 300,  spawnMaxTier: 4 },
  { id: 2,  name: "Dar Kavanoz",   emoji: "🫙", target: 500,  spawnMaxTier: 4, jarWidthRatio: 0.72 },
  { id: 3,  name: "Zaman Yarışı",  emoji: "⏱️", target: 600,  spawnMaxTier: 4, timeLimit: 90 },
  { id: 4,  name: "Az Hamle",      emoji: "🎯", target: 700,  spawnMaxTier: 4, maxDrops: 30 },
  { id: 5,  name: "Ağır Çekim",    emoji: "🪨", target: 900,  spawnMaxTier: 5, gravity: 2.2 },
  { id: 6,  name: "Bombalar",      emoji: "💣", target: 1000, spawnMaxTier: 4, bombChance: 0.12 },
  { id: 7,  name: "Buz Pateni",    emoji: "🧊", target: 1100, spawnMaxTier: 5, friction: 0.02, restitution: 0.45 },
  { id: 8,  name: "Sadece Büyük",  emoji: "🍍", target: 1300, spawnTiers: [2, 3, 4, 5] },
  { id: 9,  name: "Yükselen Lav",  emoji: "🌋", target: 1400, spawnMaxTier: 4, risingDeath: 3.5 },
  { id: 10, name: "Düşük Çekim",   emoji: "🎈", target: 1500, spawnMaxTier: 5, gravity: 0.7, restitution: 0.5 },
  { id: 11, name: "Kaos",          emoji: "🌀", target: 1800, spawnMaxTier: 5, gravity: 1.8, bombChance: 0.08, jarWidthRatio: 0.85 },
  { id: 12, name: "Karpuz Ustası", emoji: "🍉", target: 2500, spawnMaxTier: 5, maxDrops: 60 },
];

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
  seed: null,
};
