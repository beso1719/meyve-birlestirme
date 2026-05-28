// 🍉 Meyve Birleştirme — Suika tarzı oyun (matter.js)
const { Engine, World, Bodies, Body, Composite, Events } = Matter;

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

// Emoji resimlerini önceden yükle (her telefonda aynı görünür — Twemoji).
// Canvas bazı telefonlarda renkli emoji çizemediği için resim kullanıyoruz.
for (const f of FRUITS) {
  const img = new Image();
  img.crossOrigin = "anonymous";
  img.src = `https://cdn.jsdelivr.net/gh/jdecked/twemoji@15.1.0/assets/72x72/${f.code}.png`;
  f.img = img;
}
const SPAWN_MAX_TIER = 4; // sadece ilk 5 meyve düşürülür

// ---- Canvas / boyut ----
const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
const jar = canvas.parentElement;
let W = jar.clientWidth, H = jar.clientHeight;

// Meyveler kavanoz genişliğine göre ölçeklenir → her ekranda aynı oranda
// meyve sığar. Değer küçüldükçe meyveler küçülür ve oyun daha uzun sürer.
let S = 1;
let DROP_Y = 50;          // düşürme yüksekliği
let DEATH_Y = 90;         // bu çizgi üstünde kalırsa oyun biter

function fitCanvas() {
  W = jar.clientWidth;
  H = jar.clientHeight;
  canvas.width = W;
  canvas.height = H;
  S = W / 450;            // referans genişlik 450px → meyveler buna göre küçülür
  DROP_Y = H * 0.09;
  DEATH_Y = H * 0.15;
}
fitCanvas();

const WALL = 8;

// ---- Fizik motoru ----
const engine = Engine.create();
engine.gravity.y = 1.4;
const world = engine.world;

function makeWalls() {
  const opts = { isStatic: true, render: { visible: false }, friction: 0.4 };
  return [
    Bodies.rectangle(W / 2, H + 30, W, 60, opts),          // zemin
    Bodies.rectangle(-WALL / 2, H / 2, WALL, H * 2, opts),  // sol
    Bodies.rectangle(W + WALL / 2, H / 2, WALL, H * 2, opts),// sağ
  ];
}
let walls = makeWalls();
World.add(world, walls);

// ---- Oyun durumu ----
let score = 0;
let best = +localStorage.getItem("meyve_best") || 0;
let current = null;     // düşürülmeyi bekleyen meyve
let nextTier = randTier();
let canDrop = true;
let gameOver = false;
let dropX = W / 2;
const effects = [];     // birleşme efektleri

const scoreEl = document.getElementById("score");
const bestEl = document.getElementById("best");
const nextCanvas = document.getElementById("next");
const nextCtx = nextCanvas.getContext("2d");
bestEl.textContent = best;

function randTier() {
  return Math.floor(Math.random() * (SPAWN_MAX_TIER + 1));
}

function makeFruit(tier, x, y, isStatic = false) {
  const f = FRUITS[tier];
  const r = f.r * S;
  const body = Bodies.circle(x, y, r, {
    isStatic,
    restitution: 0.2,
    friction: 0.6,
    density: 0.001,
    label: "fruit",
  });
  body.tier = tier;
  body.radius = r;
  body.bornAt = performance.now();
  body.merging = false;
  return body;
}

function spawnCurrent() {
  const tier = nextTier;
  nextTier = randTier();
  current = makeFruit(tier, clampX(dropX, tier), DROP_Y, true);
  World.add(world, current);
  canDrop = true;
  drawNext();
}

function clampX(x, tier) {
  const r = FRUITS[tier].r * S;
  return Math.max(r + WALL, Math.min(W - r - WALL, x));
}

function drop() {
  if (!canDrop || !current || gameOver) return;
  Body.setStatic(current, false);
  current.bornAt = performance.now();
  current = null;
  canDrop = false;
  setTimeout(() => { if (!gameOver) spawnCurrent(); }, 520);
}

// ---- Birleşme ----
Events.on(engine, "collisionStart", (e) => {
  for (const pair of e.pairs) {
    const a = pair.bodyA, b = pair.bodyB;
    if (a.label !== "fruit" || b.label !== "fruit") continue;
    if (a.merging || b.merging) continue;
    if (a.tier !== b.tier) continue;
    if (a.tier >= MAX_TIER) {          // karpuz + karpuz → ikisi de yok
      a.merging = b.merging = true;
      addEffect((a.position.x + b.position.x) / 2, (a.position.y + b.position.y) / 2, MAX_TIER);
      World.remove(world, a); World.remove(world, b);
      addScore(100);
      continue;
    }
    a.merging = b.merging = true;
    const nx = (a.position.x + b.position.x) / 2;
    const ny = (a.position.y + b.position.y) / 2;
    const newTier = a.tier + 1;
    World.remove(world, a);
    World.remove(world, b);
    const nf = makeFruit(newTier, nx, ny, false);
    World.add(world, nf);
    addEffect(nx, ny, newTier);
    addScore((newTier + 1) * 2);
  }
});

function addScore(p) {
  score += p;
  scoreEl.textContent = score;
  if (score > best) {
    best = score;
    bestEl.textContent = best;
    localStorage.setItem("meyve_best", best);
  }
}

function addEffect(x, y, tier) {
  effects.push({ x, y, r: FRUITS[tier].r * S, t: 0 });
}

// ---- Kontroller ----
function pointerX(e) {
  const rect = canvas.getBoundingClientRect();
  const cx = (e.touches ? e.touches[0].clientX : e.clientX) - rect.left;
  return cx * (W / rect.width);
}
canvas.addEventListener("mousemove", (e) => { dropX = pointerX(e); });
canvas.addEventListener("mousedown", drop);
canvas.addEventListener("touchmove", (e) => { dropX = pointerX(e); e.preventDefault(); }, { passive: false });
canvas.addEventListener("touchstart", (e) => { dropX = pointerX(e); }, { passive: true });
canvas.addEventListener("touchend", drop);
window.addEventListener("keydown", (e) => { if (e.code === "Space") { e.preventDefault(); drop(); } });

document.getElementById("restart").addEventListener("click", restart);

window.addEventListener("resize", () => {
  fitCanvas();
  Composite.remove(world, walls);
  walls = makeWalls();
  World.add(world, walls);
});

// ---- Oyun bitti ----
let overTimer = 0;
function checkGameOver(dt) {
  if (gameOver) return;
  let danger = false;
  for (const body of Composite.allBodies(world)) {
    if (body.label !== "fruit" || body === current) continue;
    if (performance.now() - body.bornAt < 1500) continue; // yeni düşeni sayma
    if (body.position.y - body.radius < DEATH_Y && Math.abs(body.velocity.y) < 0.4) {
      danger = true;
      break;
    }
  }
  overTimer = danger ? overTimer + dt : 0;
  if (overTimer > 1.6) endGame();
}

function endGame() {
  gameOver = true;
  document.getElementById("final-score").textContent = score;
  document.getElementById("final-best").textContent = best;
  document.getElementById("gameover").classList.remove("hidden");
}

function restart() {
  for (const body of Composite.allBodies(world)) {
    if (body.label === "fruit") World.remove(world, body);
  }
  score = 0; scoreEl.textContent = 0;
  overTimer = 0; gameOver = false;
  current = null; canDrop = true;
  nextTier = randTier();
  document.getElementById("gameover").classList.add("hidden");
  spawnCurrent();
}

// ---- Çizim ----
function drawFruit(x, y, tier, alpha = 1, scale = 1) {
  const f = FRUITS[tier];
  const r = f.r * scale * S;
  ctx.save();
  ctx.globalAlpha = alpha;
  // gölgeli renkli daire
  const grad = ctx.createRadialGradient(x - r * 0.3, y - r * 0.3, r * 0.2, x, y, r);
  grad.addColorStop(0, "#ffffff88");
  grad.addColorStop(0.25, f.color);
  grad.addColorStop(1, shade(f.color, -25));
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fillStyle = grad;
  ctx.shadowColor = "rgba(0,0,0,.25)";
  ctx.shadowBlur = 8;
  ctx.shadowOffsetY = 4;
  ctx.fill();
  ctx.shadowColor = "transparent";
  // meyve resmi (yüklendiyse); yüklenene kadar arkadaki renkli top görünür
  if (f.img && f.img.complete && f.img.naturalWidth > 0) {
    const d = r * 1.7;
    ctx.drawImage(f.img, x - d / 2, y - d / 2, d, d);
  } else {
    ctx.font = `${r * 1.5}px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(f.emoji, x, y + r * 0.05);
  }
  ctx.restore();
}

function shade(hex, p) {
  const n = parseInt(hex.slice(1), 16);
  let r = (n >> 16) + p, g = ((n >> 8) & 255) + p, b = (n & 255) + p;
  r = Math.max(0, Math.min(255, r)); g = Math.max(0, Math.min(255, g)); b = Math.max(0, Math.min(255, b));
  return `rgb(${r},${g},${b})`;
}

function drawNext() {
  nextCtx.clearRect(0, 0, 80, 80);
  const f = FRUITS[nextTier];
  if (f.img && f.img.complete && f.img.naturalWidth > 0) {
    nextCtx.drawImage(f.img, 16, 16, 48, 48);
  } else {
    const r = Math.min(32, f.r);
    nextCtx.font = `${r * 1.6}px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif`;
    nextCtx.textAlign = "center";
    nextCtx.textBaseline = "middle";
    nextCtx.fillText(f.emoji, 40, 42);
  }
}

function render() {
  ctx.clearRect(0, 0, W, H);

  // ölüm çizgisi
  ctx.strokeStyle = "rgba(231,76,60,.7)";
  ctx.lineWidth = 2;
  ctx.setLineDash([8, 6]);
  ctx.beginPath();
  ctx.moveTo(0, DEATH_Y);
  ctx.lineTo(W, DEATH_Y);
  ctx.stroke();
  ctx.setLineDash([]);

  // meyveler
  for (const body of Composite.allBodies(world)) {
    if (body.label !== "fruit") continue;
    ctx.save();
    ctx.translate(body.position.x, body.position.y);
    ctx.rotate(body.angle);
    ctx.translate(-body.position.x, -body.position.y);
    drawFruit(body.position.x, body.position.y, body.tier);
    ctx.restore();
  }

  // bekleyen meyve
  if (current) drawFruit(current.position.x, current.position.y, current.tier);

  // birleşme efektleri (halka)
  for (let i = effects.length - 1; i >= 0; i--) {
    const ef = effects[i];
    ef.t += 0.08;
    const a = 1 - ef.t;
    if (a <= 0) { effects.splice(i, 1); continue; }
    ctx.save();
    ctx.globalAlpha = a;
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(ef.x, ef.y, ef.r * (1 + ef.t), 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
}

// ---- Ana döngü ----
let last = performance.now();
function loop(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;

  if (current && canDrop) {
    Body.setPosition(current, { x: clampX(dropX, current.tier), y: DROP_Y });
  }

  Engine.update(engine, 1000 / 60);
  checkGameOver(dt);
  render();
  requestAnimationFrame(loop);
}

spawnCurrent();
requestAnimationFrame(loop);
