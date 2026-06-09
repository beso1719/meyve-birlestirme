// 🎮 Uygulama akışı: menü, ekran yönlendirme, level/leaderboard/düello, sonuç
const App = (() => {
  const $ = (s) => document.querySelector(s);
  const screens = ["menu", "campaign", "duel", "leaderboard", "game"];
  let activeDuel = null; // { code, seed, role }
  let targetPassed = false;

  function show(name) {
    for (const s of screens) $("#screen-" + s).classList.toggle("hidden", s !== name);
  }
  function back() { Game.quit(); show("menu"); }

  // ---- Takma ad ----
  const nickEl = $("#nick");
  nickEl.value = DB.getNick();
  nickEl.addEventListener("input", () => DB.setNick(nickEl.value));

  // bağlantı durumu
  $("#conn-state").textContent = DB.online ? "🟢 Çevrimiçi" : "🟠 Çevrimdışı (skorlar sadece bu cihazda)";

  // ---- Menü butonları ----
  document.querySelectorAll("[data-go]").forEach((b) =>
    b.addEventListener("click", () => route(b.dataset.go)));
  document.querySelectorAll("[data-back]").forEach((b) =>
    b.addEventListener("click", back));

  function route(dest) {
    if (!DB.getNick()) { nickEl.focus(); nickEl.classList.add("shake"); setTimeout(() => nickEl.classList.remove("shake"), 500); return; }
    if (dest === "campaign") { buildLevels(); show("campaign"); }
    else if (dest === "endless") startEndless();
    else if (dest === "duel") { resetDuelUI(); show("duel"); }
    else if (dest === "leaderboard") { show("leaderboard"); loadLeaderboard("daily"); }
  }

  // ---- Kampanya ----
  function progress() { return +localStorage.getItem("meyve_progress") || 1; }
  function setProgress(n) { if (n > progress()) localStorage.setItem("meyve_progress", n); }
  function levelStars(id) { return localStorage.getItem("meyve_lvl_" + id) === "1"; }

  function buildLevels() {
    const grid = $("#level-grid"); grid.innerHTML = "";
    const unlocked = progress();
    LEVELS.forEach((lv) => {
      const locked = lv.id > unlocked;
      const done = levelStars(lv.id);
      const el = document.createElement("button");
      el.className = "level-card" + (locked ? " locked" : "") + (done ? " done" : "");
      el.innerHTML = `<span class="lv-emoji">${locked ? "🔒" : lv.emoji}</span>
        <span class="lv-name">${lv.id}. ${lv.name}</span>
        <span class="lv-target">Hedef: ${lv.target}</span>${done ? '<span class="lv-check">✓</span>' : ""}`;
      if (!locked) el.addEventListener("click", () => startLevel(lv));
      grid.appendChild(el);
    });
  }

  function startLevel(lv) {
    targetPassed = false;
    show("game");
    Game.start(Object.assign({ mode: "campaign", level: lv.id }, lv), {
      onStats: updateHud,
      onTargetReached: () => { targetPassed = true; },
      onEnd: (r) => endGame(r, lv),
    });
  }

  function startEndless() {
    targetPassed = false;
    show("game");
    Game.start({ mode: "endless" }, { onStats: updateHud, onEnd: (r) => endGame(r) });
  }

  // ---- HUD ----
  function updateHud(st) {
    $("#score").textContent = st.score;
    const parts = [];
    if (st.target != null) parts.push(`<span class="hud-item ${st.passed ? "ok" : ""}">🎯 ${st.score}/${st.target}</span>`);
    if (st.timeLeft != null) parts.push(`<span class="hud-item ${st.timeLeft <= 10 ? "warn" : ""}">⏱️ ${st.timeLeft}s</span>`);
    if (st.dropsLeft != null) parts.push(`<span class="hud-item ${st.dropsLeft <= 5 ? "warn" : ""}">🎯 ${st.dropsLeft} hamle</span>`);
    $("#hud").innerHTML = parts.join("");
  }

  // ---- Sonuç ekranı ----
  async function endGame(r, lv) {
    // skoru gönder
    await DB.submitScore(r.score, r.mode, r.level);
    // düello ise rakip skoru işle
    if (r.mode === "duel" && activeDuel) return endDuel(r);

    let title, body = "";
    if (r.mode === "campaign") {
      const won = targetPassed || r.won;
      if (won) {
        localStorage.setItem("meyve_lvl_" + lv.id, "1");
        setProgress(lv.id + 1);
        title = "🎉 Level Geçildi!";
        const next = LEVELS.find((x) => x.id === lv.id + 1);
        body = `Skor: <b>${r.score}</b>${next ? `<br>Sıradaki: ${next.emoji} ${next.name}` : "<br>Tüm levelleri bitirdin! 🏆"}`;
      } else {
        title = "Olmadı 😅";
        body = `Skor: <b>${r.score}</b> / Hedef: ${lv.target}`;
      }
      openResult(title, body, [
        won && LEVELS.find((x) => x.id === lv.id + 1)
          ? { t: "Sıradaki Level", cls: "", fn: () => { closeResult(); startLevel(LEVELS.find((x) => x.id === lv.id + 1)); } }
          : { t: "Tekrar Oyna", cls: "", fn: () => { closeResult(); startLevel(lv); } },
        { t: "Levellere Dön", cls: "ghost", fn: () => { closeResult(); buildLevels(); show("campaign"); } },
      ]);
    } else {
      title = "Oyun Bitti!";
      body = `Skor: <b>${r.score}</b>`;
      openResult(title, body, [
        { t: "Tekrar Oyna", cls: "", fn: () => { closeResult(); startEndless(); } },
        { t: "Menü", cls: "ghost", fn: () => { closeResult(); show("menu"); } },
      ]);
    }
  }

  function openResult(title, bodyHtml, btns) {
    const m = $("#result-modal");
    m.innerHTML = `<h2>${title}</h2><p>${bodyHtml}</p>` +
      `<div class="modal-btns">${btns.map((b, i) => `<button class="btn ${b.cls}" data-i="${i}">${b.t}</button>`).join("")}</div>`;
    m.querySelectorAll("[data-i]").forEach((el) => el.addEventListener("click", () => btns[+el.dataset.i].fn()));
    $("#overlay").classList.remove("hidden");
  }
  function closeResult() { $("#overlay").classList.add("hidden"); }

  // ---- Skor tablosu ----
  $("#lb-tabs").querySelectorAll(".tab").forEach((t) =>
    t.addEventListener("click", () => {
      $("#lb-tabs .tab.active").classList.remove("active"); t.classList.add("active");
      loadLeaderboard(t.dataset.period);
    }));

  async function loadLeaderboard(period) {
    const list = $("#lb-list"), empty = $("#lb-empty");
    list.innerHTML = ""; empty.textContent = "Yükleniyor…";
    if (!DB.online) { empty.textContent = "Skor tablosu için Supabase bağlantısı gerekli (çevrimdışısın)."; return; }
    const rows = await DB.leaderboard(period);
    if (!rows.length) { empty.textContent = "Henüz skor yok. İlk sen ol!"; return; }
    empty.textContent = "";
    const me = DB.getNick();
    list.innerHTML = rows.map((r, i) => {
      const medal = ["🥇", "🥈", "🥉"][i] || `${i + 1}.`;
      return `<li class="${r.nickname === me ? "me" : ""}"><span class="rank">${medal}</span>
        <span class="nm">${esc(r.nickname)}</span><span class="sc">${r.score}</span></li>`;
    }).join("");
  }
  function esc(s) { return String(s).replace(/[<>&]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;" }[c])); }

  // ---- Düello ----
  function resetDuelUI() { activeDuel = null; $("#duel-info").classList.add("hidden"); $("#duel-code").value = ""; }

  $("#duel-create").addEventListener("click", async () => {
    const res = await DB.createDuel();
    if (res.error) { alert("Hata: " + res.error); return; }
    activeDuel = { code: res.code, seed: res.seed, role: "creator" };
    const info = $("#duel-info");
    info.classList.remove("hidden");
    info.innerHTML = `<p>Kodun: <b class="code">${res.code}</b></p>
      <p class="muted">Bu kodu rakibine yolla. İkiniz de aynı meyve sırasıyla oynayacaksınız.</p>
      <button class="btn big" id="duel-play">▶️ Oyna</button>`;
    $("#duel-play").addEventListener("click", () => playDuel());
  });

  $("#duel-join").addEventListener("click", async () => {
    const code = $("#duel-code").value.trim().toUpperCase();
    if (code.length < 4) return;
    const d = await DB.getDuel(code);
    if (!d) { alert("Bu kodda düello bulunamadı."); return; }
    activeDuel = { code, seed: d.seed, role: "challenger", opp: d.creator_nick, oppScore: d.creator_score };
    const info = $("#duel-info");
    info.classList.remove("hidden");
    info.innerHTML = `<p>Rakip: <b>${esc(d.creator_nick || "Anonim")}</b>${d.creator_score != null ? ` — skoru: <b>${d.creator_score}</b>` : " (henüz oynamadı)"}</p>
      <button class="btn big" id="duel-play">▶️ Oyna</button>`;
    $("#duel-play").addEventListener("click", () => playDuel());
  });

  function playDuel() {
    targetPassed = false;
    show("game");
    Game.start({ mode: "duel", seed: activeDuel.seed, timeLimit: 120 }, {
      onStats: updateHud, onEnd: (r) => endGame(r),
    });
  }

  async function endDuel(r) {
    await DB.submitDuel(activeDuel.code, r.score, activeDuel.role);
    let body = `Senin skorun: <b>${r.score}</b><br>`;
    if (activeDuel.role === "challenger") {
      const opp = activeDuel.oppScore;
      if (opp == null) body += `Rakip henüz oynamadı.`;
      else body += verdict(r.score, opp, activeDuel.opp);
    } else {
      // creator: rakibin durumunu tekrar çek
      const d = await DB.getDuel(activeDuel.code);
      if (d && d.challenger_score != null) body += verdict(r.score, d.challenger_score, d.challenger_nick);
      else body += `Rakip henüz katılmadı. Kodu paylaşmaya devam et: <b>${activeDuel.code}</b>`;
    }
    openResult("⚔️ Düello", body, [
      { t: "Menü", cls: "", fn: () => { closeResult(); activeDuel = null; show("menu"); } },
    ]);
  }
  function verdict(me, opp, name) {
    const n = esc(name || "Rakip");
    if (me > opp) return `<b style="color:#2ecc71">Kazandın! 🎉</b><br>${n}: ${opp}`;
    if (me < opp) return `<b style="color:#e74c3c">Kaybettin 😢</b><br>${n}: ${opp}`;
    return `<b>Berabere!</b><br>${n}: ${opp}`;
  }

  show("menu");
})();
