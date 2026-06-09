// 🍉 Meyve Birleştirme — motor (matter.js). Config + callback ile çalışır.
const { Engine, World, Bodies, Body, Composite, Events } = Matter;

// Deterministik RNG (düello için aynı seed = aynı meyve sırası)
function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const Game = (() => {
  const canvas = document.getElementById("game");
  const ctx = canvas.getContext("2d");
  const jar = canvas.parentElement;
  const nextCanvas = document.getElementById("next");
  const nextCtx = nextCanvas.getContext("2d");

  let W, H, S, DROP_Y, DEATH_Y, deathY0;
  const WALL = 8;
  let wallInset = 0; // dar kavanoz için iç duvar

  let engine, world, walls = [];
  let cfg, cbs, rng;
  let score, current, nextTier, nextIsBomb, curIsBomb;
  let canDrop, running, paused, dropCount, timeLeft;
  let dropX, overTimer, last, rafId, startedAt;
  let activeSet = FRUITS; // aktif skin meyve seti
  const effects = [];

  const sfx = (n, a) => { try { if (typeof Sound !== "undefined") Sound.play(n, a); } catch {} };
  const buzz = (ms) => { try { if (typeof Store !== "undefined") Store.buzz(ms); } catch {} };

  function fitCanvas() {
    W = jar.clientWidth; H = jar.clientHeight;
    canvas.width = W; canvas.height = H;
    S = (W * cfg.jarWidthRatio) / 450;
    wallInset = (W * (1 - cfg.jarWidthRatio)) / 2;
    DROP_Y = H * 0.09;
    deathY0 = H * 0.15;
    DEATH_Y = deathY0;
  }

  function makeWalls() {
    const opts = { isStatic: true, render: { visible: false }, friction: 0.4 };
    return [
      Bodies.rectangle(W / 2, H + 30, W, 60, opts),
      Bodies.rectangle(wallInset - WALL / 2, H / 2, WALL, H * 2, opts),
      Bodies.rectangle(W - wallInset + WALL / 2, H / 2, WALL, H * 2, opts),
    ];
  }

  function rebuildWalls() {
    Composite.remove(world, walls);
    walls = makeWalls();
    World.add(world, walls);
  }

  function randTier() {
    const tiers = cfg.spawnTiers || range(0, cfg.spawnMaxTier);
    return tiers[Math.floor(rng() * tiers.length)];
  }
  function range(a, b) { const o = []; for (let i = a; i <= b; i++) o.push(i); return o; }

  function clampX(x, tier, bomb) {
    const r = (bomb ? SPECIAL.bomb.r : FRUITS[tier].r) * S;
    return Math.max(r + wallInset + WALL, Math.min(W - wallInset - r - WALL, x));
  }

  function makeFruit(tier, x, y, isStatic = false) {
    const f = FRUITS[tier];
    const r = f.r * S;
    const body = Bodies.circle(x, y, r, {
      isStatic, restitution: cfg.restitution, friction: cfg.friction,
      density: 0.001, label: "fruit",
    });
    body.tier = tier; body.radius = r; body.bornAt = performance.now(); body.merging = false;
    return body;
  }
  function makeBomb(x, y, isStatic = false) {
    const r = SPECIAL.bomb.r * S;
    const body = Bodies.circle(x, y, r, {
      isStatic, restitution: 0.2, friction: cfg.friction, density: 0.001, label: "bomb",
    });
    body.radius = r; body.bornAt = performance.now();
    return body;
  }

  function spawnCurrent() {
    curIsBomb = nextIsBomb;
    if (curIsBomb) {
      current = makeBomb(clampX(dropX, 0, true), DROP_Y, true);
    } else {
      current = makeFruit(nextTier, clampX(dropX, nextTier), DROP_Y, true);
    }
    World.add(world, current);
    // sıradakini hazırla
    nextIsBomb = cfg.bombChance > 0 && rng() < cfg.bombChance;
    nextTier = randTier();
    canDrop = true;
    drawNext();
  }

  function drop() {
    if (!canDrop || !current || !running) return;
    if (curIsBomb) {
      explode(current.position.x, current.position.y);
      sfx("bomb"); buzz(40);
      World.remove(world, current);
      current = null; canDrop = false;
    } else {
      Body.setStatic(current, false);
      current.bornAt = performance.now();
      current = null; canDrop = false;
      sfx("drop");
    }
    dropCount++;
    if (cbs.onStats) cbs.onStats(stats());
    setTimeout(() => { if (running) spawnCurrent(); }, 480);
    if (cfg.maxDrops && dropCount >= cfg.maxDrops) {
      // son hamleden sonra meyvelerin oturmasını bekle
      setTimeout(() => { if (running) finish(score >= (cfg.target || 0)); }, 4000);
    }
  }

  function explode(x, y) {
    const R = 90 * S;
    for (const b of Composite.allBodies(world)) {
      if (b.label !== "fruit") continue;
      const dx = b.position.x - x, dy = b.position.y - y;
      if (Math.hypot(dx, dy) < R) {
        addEffect(b.position.x, b.position.y, b.tier);
        World.remove(world, b);
        addScore(5);
      }
    }
  }

  function onCollision(e) {
    for (const pair of e.pairs) {
      const a = pair.bodyA, b = pair.bodyB;
      if (a.label !== "fruit" || b.label !== "fruit") continue;
      if (a.merging || b.merging || a.tier !== b.tier) continue;
      a.merging = b.merging = true;
      const nx = (a.position.x + b.position.x) / 2;
      const ny = (a.position.y + b.position.y) / 2;
      World.remove(world, a); World.remove(world, b);
      if (a.tier >= MAX_TIER) {
        addEffect(nx, ny, MAX_TIER); addScore(100); sfx("merge", MAX_TIER); buzz(50);
      } else {
        const nt = a.tier + 1;
        World.add(world, makeFruit(nt, nx, ny, false));
        addEffect(nx, ny, nt); addScore((nt + 1) * 2); sfx("merge", nt); buzz(25);
      }
    }
  }

  function addScore(p) {
    score += p;
    if (cbs.onStats) cbs.onStats(stats());
    if (cfg.target && score >= cfg.target) {
      if (cfg.mode === "campaign") {
        // hedefe ulaşıldı ama oyuncu devam edip skoru artırabilsin diye bitirmiyoruz
        cbs.onTargetReached && cbs.onTargetReached();
      } else if (cfg.win === "target") {
        // hedef yarışı: ilk ulaşan biter
        finish(true, "target");
      }
    }
  }

  function addEffect(x, y, tier) { effects.push({ x, y, r: FRUITS[tier].r * S, t: 0 }); }

  function stats() {
    return { score, dropsLeft: cfg.maxDrops ? Math.max(0, cfg.maxDrops - dropCount) : null,
             timeLeft: cfg.timeLimit ? Math.ceil(timeLeft) : null,
             target: cfg.target, passed: cfg.target ? score >= cfg.target : null };
  }

  // ---- Bitiş kontrolü ----
  function checkGameOver(dt) {
    if (!running) return;
    let danger = false;
    for (const body of Composite.allBodies(world)) {
      if ((body.label !== "fruit" && body.label !== "bomb") || body === current) continue;
      if (performance.now() - body.bornAt < 1500) continue;
      if (body.position.y - body.radius < DEATH_Y && Math.abs(body.velocity.y) < 0.4) { danger = true; break; }
    }
    overTimer = danger ? overTimer + dt : 0;
    if (overTimer > 1.6) finish(cfg.target ? score >= cfg.target : false, "dead");
  }

  function finish(won, reason = "") {
    if (!running) return;
    running = false; paused = false;
    cancelAnimationFrame(rafId);
    sfx(won ? "win" : "lose");
    cbs.onEnd && cbs.onEnd({
      score: Math.round(score), won, reason, mode: cfg.mode,
      level: cfg.level, duelMode: cfg.win, survivedMs: performance.now() - startedAt,
    });
  }

  // ---- Çizim ----
  function drawBody(body) {
    if (body.label === "bomb") { drawSprite(SPECIAL.bomb, body.position.x, body.position.y, body.radius); return; }
    drawFruit(body.position.x, body.position.y, body.tier);
  }
  function drawSprite(s, x, y, r) {
    ctx.save();
    if (s.img && s.img.complete && s.img.naturalWidth > 0) {
      const d = r * 2; ctx.drawImage(s.img, x - d / 2, y - d / 2, d, d);
    } else {
      ctx.font = `${r * 1.6}px sans-serif`; ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillText(s.emoji, x, y);
    }
    ctx.restore();
  }
  function drawFruit(x, y, tier, alpha = 1) {
    const f = activeSet[tier]; const r = FRUITS[tier].r * S;
    ctx.save(); ctx.globalAlpha = alpha;
    const grad = ctx.createRadialGradient(x - r * 0.3, y - r * 0.3, r * 0.2, x, y, r);
    grad.addColorStop(0, "#ffffff88"); grad.addColorStop(0.25, f.color); grad.addColorStop(1, shade(f.color, -25));
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fillStyle = grad;
    ctx.shadowColor = "rgba(0,0,0,.25)"; ctx.shadowBlur = 8; ctx.shadowOffsetY = 4; ctx.fill();
    ctx.shadowColor = "transparent";
    if (f.img && f.img.complete && f.img.naturalWidth > 0) {
      const d = r * 1.7; ctx.drawImage(f.img, x - d / 2, y - d / 2, d, d);
    } else {
      ctx.font = `${r * 1.5}px sans-serif`; ctx.textAlign = "center"; ctx.textBaseline = "middle";
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
    const s = nextIsBomb ? SPECIAL.bomb : activeSet[nextTier];
    if (s.img && s.img.complete && s.img.naturalWidth > 0) nextCtx.drawImage(s.img, 16, 16, 48, 48);
    else { nextCtx.font = "34px sans-serif"; nextCtx.textAlign = "center"; nextCtx.textBaseline = "middle"; nextCtx.fillText(s.emoji, 40, 42); }
  }

  function render() {
    ctx.clearRect(0, 0, W, H);
    // dar kavanoz duvarları
    if (wallInset > 1) {
      ctx.fillStyle = "rgba(0,0,0,.06)";
      ctx.fillRect(0, 0, wallInset, H); ctx.fillRect(W - wallInset, 0, wallInset, H);
    }
    // ölüm çizgisi
    ctx.strokeStyle = "rgba(231,76,60,.7)"; ctx.lineWidth = 2; ctx.setLineDash([8, 6]);
    ctx.beginPath(); ctx.moveTo(wallInset, DEATH_Y); ctx.lineTo(W - wallInset, DEATH_Y); ctx.stroke();
    ctx.setLineDash([]);
    for (const body of Composite.allBodies(world)) {
      if (body.label !== "fruit" && body.label !== "bomb") continue;
      ctx.save(); ctx.translate(body.position.x, body.position.y); ctx.rotate(body.angle);
      ctx.translate(-body.position.x, -body.position.y); drawBody(body); ctx.restore();
    }
    if (current) drawBody(current);
    for (let i = effects.length - 1; i >= 0; i--) {
      const ef = effects[i]; ef.t += 0.08; const a = 1 - ef.t;
      if (a <= 0) { effects.splice(i, 1); continue; }
      ctx.save(); ctx.globalAlpha = a; ctx.strokeStyle = "#fff"; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.arc(ef.x, ef.y, ef.r * (1 + ef.t), 0, Math.PI * 2); ctx.stroke(); ctx.restore();
    }
  }

  function loop(now) {
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    if (current && canDrop) {
      const b = curIsBomb;
      Body.setPosition(current, { x: clampX(dropX, b ? 0 : current.tier, b), y: DROP_Y });
    }
    if (cfg.timeLimit) {
      timeLeft -= dt;
      if (timeLeft <= 0) { timeLeft = 0; finish(cfg.target ? score >= cfg.target : false, "time"); return; }
    }
    if (cfg.risingDeath) { DEATH_Y = Math.min(H * 0.5, DEATH_Y + cfg.risingDeath * dt); }
    Engine.update(engine, 1000 / 60);
    checkGameOver(dt);
    render();
    rafId = requestAnimationFrame(loop);
  }

  // ---- Dış API ----
  function start(config, callbacks) {
    cfg = Object.assign({}, BASE_CFG, config);
    cbs = callbacks || {};
    rng = mulberry32(cfg.seed != null ? cfg.seed : (Math.random() * 2 ** 31) | 0);
    activeSet = (typeof Store !== "undefined" && typeof getSkin !== "undefined") ? getSkin(Store.equipped()).set : FRUITS;
    paused = false; startedAt = performance.now();

    if (engine) { World.clear(world, false); Engine.clear(engine); }
    engine = Engine.create(); engine.gravity.y = cfg.gravity; world = engine.world;
    Events.on(engine, "collisionStart", onCollision);

    fitCanvas();
    walls = makeWalls(); World.add(world, walls);

    score = 0; dropCount = 0; overTimer = 0; dropX = W / 2;
    timeLeft = cfg.timeLimit || 0; running = true; canDrop = true;
    nextIsBomb = cfg.bombChance > 0 && rng() < cfg.bombChance;
    nextTier = randTier();
    spawnCurrent();
    if (cbs.onStats) cbs.onStats(stats());
    last = performance.now();
    rafId = requestAnimationFrame(loop);
  }

  function stop() { running = false; cancelAnimationFrame(rafId); }
  function quit() { stop(); paused = false; if (world) for (const b of Composite.allBodies(world)) if (b.label === "fruit" || b.label === "bomb") World.remove(world, b); }

  function pause() { if (!running || paused) return; paused = true; cancelAnimationFrame(rafId); }
  function resume() { if (!running || !paused) return; paused = false; last = performance.now(); rafId = requestAnimationFrame(loop); }
  function isRunning() { return running && !paused; }

  // Canlı düello için anlık durum
  function getLiveState() {
    let topTier = 0;
    if (world) for (const b of Composite.allBodies(world)) if (b.label === "fruit" && b.tier > topTier) topTier = b.tier;
    return { score: Math.round(score), topTier, dead: !running, timeLeft: cfg && cfg.timeLimit ? Math.ceil(timeLeft) : null };
  }

  // kontroller
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
  window.addEventListener("resize", () => { if (running) { fitCanvas(); rebuildWalls(); } });

  return { start, stop, quit, pause, resume, isRunning, getLiveState };
})();
