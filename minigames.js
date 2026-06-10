// 🎮 Mini Oyunlar — meyve birleştirmeden bağımsız 4 küçük oyun.
// Hepsi tek dosyada: Meyve Yakala, Meyve Ninja, Hafıza, Meyve Yılanı.
const MiniGames = (() => {
  const $ = (s) => document.querySelector(s);
  const canvas = () => $("#mini-canvas");
  let raf = null, cleanup = null, currentId = null;

  const GAMES = [
    { id: "catch",  name: "Meyve Yakala", emoji: "🧺", desc: "Sepeti kaydır, düşen meyveleri topla. Bombayı yakalarsan can gider!", hint: "Parmağını / fareyi sağa-sola kaydır" },
    { id: "ninja",  name: "Meyve Ninja",  emoji: "🥷", desc: "60 saniyede uçan meyvelere dokun. Bombaya dokunma!", hint: "Meyvelere dokun • Bombadan uzak dur" },
    { id: "memory", name: "Hafıza",       emoji: "🧠", desc: "Meyve kartlarını eşleştir. Ne kadar hızlı, o kadar çok altın!", hint: "Kartlara dokunarak eşini bul" },
    { id: "snake",  name: "Meyve Yılanı", emoji: "🐍", desc: "Klasik yılan! Meyve ye, büyü, duvara ve kendine çarpma.", hint: "Kaydır veya ok tuşları ile yön ver" },
  ];

  const sfx = (n, a) => { try { Sound.play(n, a); } catch {} };
  const FR = ["🍒", "🍓", "🍇", "🍊", "🍎", "🍐", "🍑", "🍍", "🥝", "🍈", "🍉"];

  function show(name) {
    document.querySelectorAll(".screen").forEach((s) => s.classList.add("hidden"));
    $("#screen-" + name).classList.remove("hidden");
  }

  // ---- Menü ----
  function buildMenu() {
    $("#mini-coins").textContent = Store.coins();
    const box = $("#mini-list"); box.innerHTML = "";
    GAMES.forEach((g) => {
      const best = +localStorage.getItem("mini_best_" + g.id) || 0;
      const el = document.createElement("button");
      el.className = "mini-card";
      el.innerHTML = `<span class="mg-emoji">${g.emoji}</span><span class="mg-name">${g.name}</span>
        <span class="mg-desc">${g.desc}</span>${best ? `<span class="mg-best">En iyi: ${best}</span>` : ""}`;
      el.addEventListener("click", () => { sfx("click"); play(g.id); });
      box.appendChild(el);
    });
  }

  // ---- Ortak başlat/bitir ----
  function play(id) {
    stop();
    currentId = id;
    show("minigame");
    const g = GAMES.find((x) => x.id === id);
    $("#mini-hint").textContent = g.hint;
    $("#mini-score").textContent = "0";
    $("#mini-hud").innerHTML = "";
    const dom = $("#mini-dom"), cv = canvas();
    if (id === "memory") { dom.classList.remove("hidden"); cv.classList.add("hidden"); }
    else { dom.classList.add("hidden"); cv.classList.remove("hidden"); }
    cleanup = ({ catch: startCatch, ninja: startNinja, memory: startMemory, snake: startSnake })[id]();
  }

  function stop() {
    if (raf) cancelAnimationFrame(raf); raf = null;
    if (cleanup) { try { cleanup(); } catch {} cleanup = null; }
    $("#mini-dom").innerHTML = "";
  }

  function setScore(s) { $("#mini-score").textContent = s; }
  function setHud(html) { $("#mini-hud").innerHTML = html; }

  function gameOver(score, extra = "") {
    stop();
    const g = GAMES.find((x) => x.id === currentId);
    const key = "mini_best_" + currentId;
    const best = +localStorage.getItem(key) || 0;
    const isBest = score > best;
    if (isBest) localStorage.setItem(key, score);
    const reward = Math.min(40, Math.max(score > 0 ? 2 : 0, Math.floor(score / 50)));
    if (reward > 0) { Store.addCoins(reward); sfx("coin"); }
    const m = $("#result-modal");
    m.innerHTML = `<h2>${g.emoji} ${g.name}</h2>
      <p>Skor: <b>${score}</b>${isBest ? ` <span style="color:#e67e22">🏅 Rekor!</span>` : ""}${extra}
      ${reward ? `<br>🪙 +${reward} altın` : ""}</p>
      <div class="modal-btns">
        <button class="btn" id="mg-again">Tekrar</button>
        <button class="btn ghost" id="mg-list">Oyunlar</button>
      </div>`;
    $("#overlay").classList.remove("hidden");
    $("#mg-again").addEventListener("click", () => { sfx("click"); $("#overlay").classList.add("hidden"); play(currentId); });
    $("#mg-list").addEventListener("click", () => { sfx("click"); $("#overlay").classList.add("hidden"); buildMenu(); show("minigames"); });
  }

  function fitCanvas() {
    const cv = canvas(), jar = cv.parentElement;
    cv.width = jar.clientWidth; cv.height = jar.clientHeight;
    return [cv.width, cv.height, cv.getContext("2d")];
  }
  function drawEmoji(ctx, em, x, y, size) {
    ctx.font = `${size}px sans-serif`; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText(em, x, y);
  }
  function px(e, cv) {
    const r = cv.getBoundingClientRect();
    const t = e.touches ? e.touches[0] : e;
    return [(t.clientX - r.left) * (cv.width / r.width), (t.clientY - r.top) * (cv.height / r.height)];
  }

  // ================= 1) MEYVE YAKALA =================
  function startCatch() {
    const [W, H, ctx] = fitCanvas();
    const cv = canvas();
    let bx = W / 2, score = 0, lives = 3, t = 0, spawnAt = 0, items = [], over = false;

    const move = (e) => { bx = px(e, cv)[0]; if (e.cancelable) e.preventDefault(); };
    cv.addEventListener("mousemove", move);
    cv.addEventListener("touchmove", move, { passive: false });
    cv.addEventListener("touchstart", move, { passive: true });

    let last = performance.now();
    function loop(now) {
      const dt = Math.min(0.05, (now - last) / 1000); last = now; t += dt;
      if (t > spawnAt) {
        const bomb = Math.random() < 0.18;
        items.push({ x: 30 + Math.random() * (W - 60), y: -30, vy: 130 + t * 6 + Math.random() * 80,
                     em: bomb ? "💣" : FR[(Math.random() * 7) | 0], bomb });
        spawnAt = t + Math.max(0.35, 0.9 - t * 0.012);
      }
      const catchY = H - 64;
      for (let i = items.length - 1; i >= 0; i--) {
        const it = items[i]; it.y += it.vy * dt;
        if (it.y > catchY && it.y < catchY + 46 && Math.abs(it.x - bx) < 52) {
          items.splice(i, 1);
          if (it.bomb) { lives--; sfx("bomb"); if (lives <= 0) over = true; }
          else { score += 10; setScore(score); sfx("merge", 2); }
        } else if (it.y > H + 30) items.splice(i, 1);
      }
      setHud(`<span class="hud-item">❤️ ${lives}</span>`);
      ctx.clearRect(0, 0, W, H);
      for (const it of items) drawEmoji(ctx, it.em, it.x, it.y, 38);
      drawEmoji(ctx, "🧺", Math.max(40, Math.min(W - 40, bx)), H - 38, 56);
      if (over) { sfx("lose"); gameOver(score); return; }
      raf = requestAnimationFrame(loop);
    }
    raf = requestAnimationFrame(loop);
    return () => { cv.removeEventListener("mousemove", move); cv.removeEventListener("touchmove", move); cv.removeEventListener("touchstart", move); };
  }

  // ================= 2) MEYVE NİNJA =================
  function startNinja() {
    const [W, H, ctx] = fitCanvas();
    const cv = canvas();
    let score = 0, lives = 3, timeLeft = 60, items = [], pops = [], spawnAt = 0, t = 0, over = false;

    const tap = (e) => {
      const [x, y] = px(e, cv);
      for (let i = items.length - 1; i >= 0; i--) {
        const it = items[i];
        if (Math.hypot(it.x - x, it.y - y) < 44) {
          items.splice(i, 1);
          pops.push({ x: it.x, y: it.y, t: 0, em: it.bomb ? "💥" : "✨" });
          if (it.bomb) { lives--; sfx("bomb"); if (lives <= 0) over = true; }
          else { score += 10; setScore(score); sfx("merge", 3); }
          return;
        }
      }
    };
    cv.addEventListener("mousedown", tap);
    cv.addEventListener("touchstart", (e) => { tap(e); e.preventDefault(); }, { passive: false });

    let last = performance.now();
    function loop(now) {
      const dt = Math.min(0.05, (now - last) / 1000); last = now; t += dt; timeLeft -= dt;
      if (t > spawnAt) {
        const n = 1 + ((Math.random() * 2) | 0);
        for (let i = 0; i < n; i++) {
          const bomb = Math.random() < 0.16;
          items.push({ x: 40 + Math.random() * (W - 80), y: H + 30,
                       vx: (Math.random() - 0.5) * 120, vy: -(H * 1.15 + Math.random() * H * 0.3),
                       em: bomb ? "💣" : FR[(Math.random() * FR.length) | 0], bomb });
        }
        spawnAt = t + 0.8 + Math.random() * 0.5;
      }
      for (let i = items.length - 1; i >= 0; i--) {
        const it = items[i];
        it.vy += H * 0.78 * dt; it.x += it.vx * dt; it.y += it.vy * dt;
        if (it.y > H + 60) items.splice(i, 1);
      }
      setHud(`<span class="hud-item">⏱️ ${Math.ceil(timeLeft)}</span><span class="hud-item">❤️ ${lives}</span>`);
      ctx.clearRect(0, 0, W, H);
      for (const it of items) drawEmoji(ctx, it.em, it.x, it.y, 42);
      for (let i = pops.length - 1; i >= 0; i--) {
        const p = pops[i]; p.t += dt;
        if (p.t > 0.4) { pops.splice(i, 1); continue; }
        ctx.globalAlpha = 1 - p.t / 0.4; drawEmoji(ctx, p.em, p.x, p.y, 40 + p.t * 60); ctx.globalAlpha = 1;
      }
      if (timeLeft <= 0 || over) { sfx(over ? "lose" : "win"); gameOver(score); return; }
      raf = requestAnimationFrame(loop);
    }
    raf = requestAnimationFrame(loop);
    return () => { cv.removeEventListener("mousedown", tap); };
  }

  // ================= 3) HAFIZA =================
  function startMemory() {
    const dom = $("#mini-dom");
    const ems = FR.slice(0, 8);
    const deck = [...ems, ...ems].sort(() => Math.random() - 0.5);
    let openCards = [], matched = 0, moves = 0, t0 = performance.now(), timer;

    dom.innerHTML = `<div class="mem-grid">` + deck.map((em, i) =>
      `<button class="mem-card" data-i="${i}" data-em="${em}"><span class="mem-face">${em}</span></button>`).join("") + `</div>`;

    timer = setInterval(() => {
      const sec = Math.floor((performance.now() - t0) / 1000);
      setHud(`<span class="hud-item">⏱️ ${sec}s</span><span class="hud-item">🃏 ${moves}</span>`);
    }, 500);

    dom.querySelectorAll(".mem-card").forEach((c) => c.addEventListener("click", () => {
      if (c.classList.contains("open") || c.classList.contains("done") || openCards.length === 2) return;
      sfx("click");
      c.classList.add("open"); openCards.push(c);
      if (openCards.length === 2) {
        moves++;
        const [a, b] = openCards;
        if (a.dataset.em === b.dataset.em) {
          a.classList.add("done"); b.classList.add("done");
          openCards = []; matched++; sfx("merge", matched);
          if (matched === ems.length) {
            const sec = Math.floor((performance.now() - t0) / 1000);
            const score = Math.max(50, 500 - sec * 6 - moves * 5);
            setScore(score); sfx("win");
            setTimeout(() => gameOver(score, `<br>⏱️ ${sec}s · 🃏 ${moves} hamle`), 400);
          }
        } else {
          setTimeout(() => { a.classList.remove("open"); b.classList.remove("open"); openCards = []; }, 650);
        }
      }
    }));
    return () => clearInterval(timer);
  }

  // ================= 4) MEYVE YILANI =================
  function startSnake() {
    const [W, H, ctx] = fitCanvas();
    const cv = canvas();
    const N = 15, cell = Math.floor(Math.min(W, H) / N);
    const ox = (W - cell * N) / 2, oy = (H - cell * N) / 2;
    let snake = [{ x: 7, y: 7 }, { x: 6, y: 7 }, { x: 5, y: 7 }];
    let dir = { x: 1, y: 0 }, nextDir = dir, fruit = null, fruitEm = "🍎";
    let score = 0, acc = 0, tick = 0.16, over = false;

    function placeFruit() {
      do { fruit = { x: (Math.random() * N) | 0, y: (Math.random() * N) | 0 }; }
      while (snake.some((s) => s.x === fruit.x && s.y === fruit.y));
      fruitEm = FR[(Math.random() * FR.length) | 0];
    }
    placeFruit();

    const keys = (e) => {
      const m = { ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0] }[e.key];
      if (!m) return;
      e.preventDefault();
      if (m[0] !== -dir.x || m[1] !== -dir.y) nextDir = { x: m[0], y: m[1] };
    };
    window.addEventListener("keydown", keys);
    let sx = 0, sy = 0;
    const ts = (e) => { sx = e.touches[0].clientX; sy = e.touches[0].clientY; };
    const te = (e) => {
      const dx = e.changedTouches[0].clientX - sx, dy = e.changedTouches[0].clientY - sy;
      if (Math.abs(dx) < 18 && Math.abs(dy) < 18) return;
      const m = Math.abs(dx) > Math.abs(dy) ? [Math.sign(dx), 0] : [0, Math.sign(dy)];
      if (m[0] !== -dir.x || m[1] !== -dir.y) nextDir = { x: m[0], y: m[1] };
    };
    cv.addEventListener("touchstart", ts, { passive: true });
    cv.addEventListener("touchend", te, { passive: true });

    let last = performance.now();
    function loop(now) {
      const dt = Math.min(0.05, (now - last) / 1000); last = now; acc += dt;
      while (acc > tick) {
        acc -= tick;
        dir = nextDir;
        const head = { x: snake[0].x + dir.x, y: snake[0].y + dir.y };
        if (head.x < 0 || head.y < 0 || head.x >= N || head.y >= N ||
            snake.some((s) => s.x === head.x && s.y === head.y)) { over = true; break; }
        snake.unshift(head);
        if (head.x === fruit.x && head.y === fruit.y) {
          score += 10; setScore(score); sfx("merge", 2);
          tick = Math.max(0.07, tick - 0.003);
          placeFruit();
        } else snake.pop();
      }
      setHud(`<span class="hud-item">🍎 ${score / 10}</span>`);
      ctx.clearRect(0, 0, W, H);
      ctx.fillStyle = "rgba(0,0,0,.05)";
      ctx.fillRect(ox, oy, cell * N, cell * N);
      ctx.strokeStyle = "rgba(0,0,0,.15)"; ctx.strokeRect(ox, oy, cell * N, cell * N);
      drawEmoji(ctx, fruitEm, ox + fruit.x * cell + cell / 2, oy + fruit.y * cell + cell / 2, cell * 0.9);
      snake.forEach((s, i) => {
        ctx.fillStyle = i === 0 ? "#27ae60" : `rgba(46,204,113,${Math.max(0.45, 1 - i * 0.03)})`;
        ctx.beginPath();
        ctx.roundRect(ox + s.x * cell + 1, oy + s.y * cell + 1, cell - 2, cell - 2, 5);
        ctx.fill();
      });
      drawEmoji(ctx, "👀", ox + snake[0].x * cell + cell / 2, oy + snake[0].y * cell + cell / 2, cell * 0.6);
      if (over) { sfx("lose"); gameOver(score); return; }
      raf = requestAnimationFrame(loop);
    }
    raf = requestAnimationFrame(loop);
    return () => { window.removeEventListener("keydown", keys); cv.removeEventListener("touchstart", ts); cv.removeEventListener("touchend", te); };
  }

  $("#mini-back").addEventListener("click", () => {
    sfx("click"); stop();
    $("#overlay").classList.add("hidden");
    buildMenu(); show("minigames");
  });

  return { buildMenu, stop };
})();
