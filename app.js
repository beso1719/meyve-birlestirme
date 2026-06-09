// 🎮 Uygulama akışı: menü, ekranlar, macera/market/profil/arkadaş/düello, sonuç
const App = (() => {
  const $ = (s) => document.querySelector(s);
  const screens = ["menu", "campaign", "duel", "market", "profile", "friends", "settings", "leaderboard", "game"];
  let activeDuel = null;   // { code, seed, role, mode, opp, oppScore, channel }
  let selectedMode = "classic";
  let targetPassed = false;
  let liveTimer = null, oppLive = null;

  function show(name) {
    for (const s of screens) $("#screen-" + s).classList.toggle("hidden", s !== name);
    if (name === "menu") refreshCoins();
  }
  function back() { stopLive(); closeDuelChannel(); Game.quit(); show("menu"); }

  // ---- Takma ad + altın ----
  const nickEl = $("#nick");
  nickEl.value = DB.getNick();
  nickEl.addEventListener("input", () => { DB.setNick(nickEl.value); Store.syncProfile(); });
  function refreshCoins() { const c = Store.coins(); $("#coin-count").textContent = c; const m = $("#market-coins"); if (m) m.textContent = c; }

  // başlık & menü etiketleri
  $("#btn-campaign").textContent = `${CAMPAIGN_EMOJI} ${CAMPAIGN_NAME}`;
  $("#campaign-title").textContent = CAMPAIGN_NAME;
  $("#conn-state").textContent = DB.online ? "🟢 Çevrimiçi" : "🟠 Çevrimdışı (skorlar sadece bu cihazda)";

  Store.init();
  refreshCoins();

  // ---- Menü butonları ----
  document.querySelectorAll("[data-go]").forEach((b) =>
    b.addEventListener("click", () => { sfxClick(); route(b.dataset.go); }));
  document.querySelectorAll("[data-back]").forEach((b) =>
    b.addEventListener("click", () => { sfxClick(); back(); }));
  function sfxClick() { try { Sound.play("click"); Sound.unlock(); } catch {} }

  function route(dest) {
    if (!DB.getNick()) { nickEl.focus(); nickEl.classList.add("shake"); setTimeout(() => nickEl.classList.remove("shake"), 500); return; }
    Sound.startMusic();
    if (dest === "campaign") { buildLevels(); show("campaign"); }
    else if (dest === "endless") startEndless();
    else if (dest === "duel") { openDuelScreen(); show("duel"); }
    else if (dest === "leaderboard") { show("leaderboard"); loadLeaderboard("daily"); }
    else if (dest === "market") { buildMarket(); show("market"); }
    else if (dest === "profile") { showProfile(null); show("profile"); }
    else if (dest === "friends") { buildFriends(); show("friends"); }
    else if (dest === "settings") { openSettings(); show("settings"); }
  }

  // ================= MACERA =================
  function progress() { return +localStorage.getItem("meyve_progress") || 1; }
  function setProgress(n) { if (n > progress()) localStorage.setItem("meyve_progress", n); }
  function levelDone(id) { return localStorage.getItem("meyve_lvl_" + id) === "1"; }

  function buildLevels() {
    const grid = $("#level-grid"); grid.innerHTML = "";
    const unlocked = progress();
    LEVELS.forEach((lv) => {
      const locked = lv.id > unlocked, done = levelDone(lv.id);
      const el = document.createElement("button");
      el.className = "level-card" + (locked ? " locked" : "") + (done ? " done" : "");
      el.innerHTML = `<span class="lv-emoji">${locked ? "🔒" : lv.emoji}</span>
        <span class="lv-name">${lv.id}. ${lv.name}</span>
        <span class="lv-target">Hedef: ${lv.target}</span>
        <span class="lv-reward">🪙 ${lv.reward}</span>${done ? '<span class="lv-check">✓</span>' : ""}`;
      if (!locked) el.addEventListener("click", () => startLevel(lv));
      grid.appendChild(el);
    });
  }

  function startLevel(lv) {
    targetPassed = false; show("game"); setDuelLive(false);
    Game.start(Object.assign({ mode: "campaign", level: lv.id }, lv), {
      onStats: updateHud,
      onTargetReached: () => { targetPassed = true; },
      onEnd: (r) => endGame(r, lv),
    });
  }
  function startEndless() {
    targetPassed = false; show("game"); setDuelLive(false);
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

  // ---- Sonuç ----
  async function endGame(r, lv) {
    Store.recordBest(r.score);
    await DB.submitScore(r.score, r.mode, r.level);
    if (r.mode === "duel" && activeDuel) return endDuel(r);

    if (r.mode === "campaign") {
      const won = targetPassed || r.won;
      let coinMsg = "";
      if (won) {
        const first = !levelDone(lv.id);
        localStorage.setItem("meyve_lvl_" + lv.id, "1");
        setProgress(lv.id + 1);
        if (first) { Store.addCoins(lv.reward); Sound.play("coin"); coinMsg = `<br>🪙 +${lv.reward} altın`; }
        const next = LEVELS.find((x) => x.id === lv.id + 1);
        openResult("🎉 Level Geçildi!",
          `Skor: <b>${r.score}</b>${coinMsg}${next ? `<br>Sıradaki: ${next.emoji} ${next.name}` : "<br>Tüm levelleri bitirdin! 🏆"}`, [
          won && next ? { t: "Sıradaki", fn: () => { closeResult(); startLevel(next); } }
                      : { t: "Tekrar Oyna", fn: () => { closeResult(); startLevel(lv); } },
          { t: "Levellere Dön", cls: "ghost", fn: () => { closeResult(); buildLevels(); show("campaign"); } },
        ]);
      } else {
        openResult("Olmadı 😅", `Skor: <b>${r.score}</b> / Hedef: ${lv.target}`, [
          { t: "Tekrar Oyna", fn: () => { closeResult(); startLevel(lv); } },
          { t: "Levellere Dön", cls: "ghost", fn: () => { closeResult(); buildLevels(); show("campaign"); } },
        ]);
      }
    } else {
      const earned = Math.floor(r.score / 150);
      if (earned > 0) { Store.addCoins(earned); Sound.play("coin"); }
      openResult("Oyun Bitti!", `Skor: <b>${r.score}</b>${earned ? `<br>🪙 +${earned} altın` : ""}`, [
        { t: "Tekrar Oyna", fn: () => { closeResult(); startEndless(); } },
        { t: "Menü", cls: "ghost", fn: () => { closeResult(); show("menu"); } },
      ]);
    }
  }

  function openResult(title, bodyHtml, btns) {
    const m = $("#result-modal");
    m.innerHTML = `<h2>${title}</h2><p>${bodyHtml}</p>` +
      `<div class="modal-btns">${btns.map((b, i) => `<button class="btn ${b.cls || ""}" data-i="${i}">${b.t}</button>`).join("")}</div>`;
    m.querySelectorAll("[data-i]").forEach((el) => el.addEventListener("click", () => { sfxClick(); btns[+el.dataset.i].fn(); }));
    $("#overlay").classList.remove("hidden");
  }
  function closeResult() { $("#overlay").classList.add("hidden"); }

  // ================= SKOR TABLOSU =================
  $("#lb-tabs").querySelectorAll(".tab").forEach((t) =>
    t.addEventListener("click", () => {
      $("#lb-tabs .tab.active").classList.remove("active"); t.classList.add("active");
      loadLeaderboard(t.dataset.period);
    }));
  async function loadLeaderboard(period) {
    const list = $("#lb-list"), empty = $("#lb-empty");
    list.innerHTML = ""; empty.textContent = "Yükleniyor…";
    if (!DB.online) { empty.textContent = "Skor tablosu için bağlantı gerekli (çevrimdışısın)."; return; }
    const rows = await DB.leaderboard(period);
    if (!rows.length) { empty.textContent = "Henüz skor yok. İlk sen ol!"; return; }
    empty.textContent = "";
    const me = DB.getNick();
    list.innerHTML = rows.map((r, i) => {
      const medal = ["🥇", "🥈", "🥉"][i] || `${i + 1}.`;
      return `<li class="${r.nickname === me ? "me" : ""}"><span class="rank">${medal}</span>
        <span class="nm" data-prof="${esc(r.nickname)}">${esc(r.nickname)}</span><span class="sc">${r.score}</span></li>`;
    }).join("");
    list.querySelectorAll("[data-prof]").forEach((el) =>
      el.addEventListener("click", () => openProfileByNick(el.dataset.prof)));
  }
  function esc(s) { return String(s).replace(/[<>&"]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c])); }

  // ================= MARKET =================
  function buildMarket() {
    refreshCoins();
    const grid = $("#skin-grid"); grid.innerHTML = "";
    const equipped = Store.equipped();
    SKINS.forEach((sk) => {
      const owned = Store.hasSkin(sk.id), active = equipped === sk.id;
      const el = document.createElement("div");
      el.className = "skin-card" + (active ? " active" : "");
      const preview = sk.set.slice(0, 5).map((it) => it.emoji).join("");
      let action;
      if (active) action = `<span class="skin-tag">✓ Seçili</span>`;
      else if (owned) action = `<button class="mini-btn" data-equip="${sk.id}">Kullan</button>`;
      else action = `<button class="mini-btn buy" data-buy="${sk.id}">🪙 ${sk.price}</button>`;
      el.innerHTML = `<div class="skin-emojis">${preview}</div><div class="skin-name">${sk.name}</div>${action}`;
      grid.appendChild(el);
    });
    grid.querySelectorAll("[data-buy]").forEach((b) => b.addEventListener("click", () => {
      const res = Store.buySkin(b.dataset.buy);
      if (res.ok) { Sound.play("coin"); Store.equip(b.dataset.buy); buildMarket(); }
      else if (res.reason === "coins") flash(b, "Altın yetersiz");
    }));
    grid.querySelectorAll("[data-equip]").forEach((b) => b.addEventListener("click", () => {
      sfxClick(); Store.equip(b.dataset.equip); buildMarket();
    }));
  }
  function flash(el, msg) { const o = el.textContent; el.textContent = msg; setTimeout(() => el.textContent = o, 1200); }

  // ================= PROFİL =================
  function showProfile(p) {
    const body = $("#profile-body"), title = $("#profile-title");
    if (!p) {
      const d = Store.profileData();
      title.textContent = "🙂 " + (DB.getNick() || "Profilim");
      body.innerHTML = profileHtml({ nickname: DB.getNick() || "Anonim", code: DB.friendCode(),
        coins: d.coins, best: d.best, wins: d.wins, skin: d.skin, mine: true });
    } else {
      title.textContent = "🙂 " + (p.nickname || "Profil");
      body.innerHTML = profileHtml({ ...p, mine: false });
      const add = body.querySelector("[data-addfriend]");
      if (add) add.addEventListener("click", () => {
        Store.addFriend({ code: p.code, nick: p.nickname, device: p.device });
        add.textContent = "✓ Eklendi"; add.disabled = true;
      });
    }
  }
  function profileHtml(p) {
    const sk = getSkin(p.skin || "fruit");
    const already = p.code && Store.friends().some((f) => f.code === p.code);
    return `<div class="prof-avatar">${sk.emoji}</div>
      <h3 class="prof-nick">${esc(p.nickname)}</h3>
      <div class="prof-code">Kod: <b>${esc(p.code || "—")}</b></div>
      <div class="prof-stats">
        <div class="stat"><span class="label">EN İYİ</span><b>${p.best || 0}</b></div>
        <div class="stat"><span class="label">GALİBİYET</span><b>${p.wins || 0}</b></div>
        ${p.mine ? `<div class="stat"><span class="label">ALTIN</span><b>🪙 ${p.coins || 0}</b></div>` : ""}
      </div>
      ${!p.mine && p.code && !already ? `<button class="btn" data-addfriend>➕ Arkadaş Ekle</button>` : ""}
      ${!p.mine && already ? `<p class="muted">✓ Zaten arkadaşın</p>` : ""}`;
  }
  async function openProfileByNick(nick) {
    if (!DB.online) return;
    const res = await DB.searchProfiles(nick);
    if (res && res[0]) { showProfile(res[0]); show("profile"); }
  }

  // ================= ARKADAŞLAR =================
  function buildFriends() {
    $("#my-code").textContent = DB.friendCode();
    renderFriendList();
    $("#friend-results").innerHTML = "";
    $("#friend-input").value = "";
  }
  function renderFriendList() {
    const list = $("#friend-list"), empty = $("#friend-empty");
    const fr = Store.friends();
    if (!fr.length) { list.innerHTML = ""; empty.textContent = "Henüz arkadaşın yok. Kodla ekle!"; return; }
    empty.textContent = "";
    list.innerHTML = fr.map((f) => `<li>
      <span class="fr-nick" data-fprof="${esc(f.code)}">${esc(f.nick || f.code)}</span>
      <span class="fr-code">${esc(f.code)}</span>
      <button class="mini-btn" data-fduel="${esc(f.code)}">⚔️</button>
      <button class="mini-btn ghost" data-frem="${esc(f.code)}">✕</button></li>`).join("");
    list.querySelectorAll("[data-frem]").forEach((b) => b.addEventListener("click", () => { Store.removeFriend(b.dataset.frem); renderFriendList(); }));
    list.querySelectorAll("[data-fduel]").forEach((b) => b.addEventListener("click", () => inviteFriendToDuel(b.dataset.fduel)));
    list.querySelectorAll("[data-fprof]").forEach((b) => b.addEventListener("click", async () => {
      const f = Store.friends().find((x) => x.code === b.dataset.fprof);
      if (f && DB.online) { const p = await DB.getProfile({ code: f.code }); if (p) { showProfile(p); show("profile"); } }
    }));
  }
  $("#friend-search").addEventListener("click", searchFriend);
  $("#friend-input").addEventListener("keydown", (e) => { if (e.key === "Enter") searchFriend(); });
  async function searchFriend() {
    const q = $("#friend-input").value.trim();
    const box = $("#friend-results");
    if (!q) return;
    if (!DB.online) { box.innerHTML = `<p class="muted">Arkadaş için bağlantı gerekli.</p>`; return; }
    box.innerHTML = `<p class="muted">Aranıyor…</p>`;
    let results = [];
    const code = q.toUpperCase();
    if (code.length === 6) { const p = await DB.getProfile({ code }); if (p) results = [p]; }
    if (!results.length) results = await DB.searchProfiles(q);
    if (!results.length) { box.innerHTML = `<p class="muted">Kimse bulunamadı.</p>`; return; }
    box.innerHTML = results.map((p) => `<div class="fr-res">
      <span data-rprof="${esc(p.code)}">${esc(p.nickname)} <small>(${esc(p.code)})</small></span>
      <button class="mini-btn" data-radd='${esc(JSON.stringify({ code: p.code, nick: p.nickname, device: p.device }))}'>➕</button>
      </div>`).join("");
    box.querySelectorAll("[data-radd]").forEach((b) => b.addEventListener("click", () => {
      Store.addFriend(JSON.parse(b.dataset.radd)); b.textContent = "✓"; b.disabled = true; renderFriendList();
    }));
    box.querySelectorAll("[data-rprof]").forEach((b) => b.addEventListener("click", async () => {
      const p = await DB.getProfile({ code: b.dataset.rprof }); if (p) { showProfile(p); show("profile"); }
    }));
  }
  $("#copy-code").addEventListener("click", () => {
    const c = DB.friendCode();
    if (navigator.clipboard) navigator.clipboard.writeText(c);
    $("#copy-code").textContent = "Kopyalandı";
    setTimeout(() => $("#copy-code").textContent = "Kopyala", 1200);
  });

  // ================= AYARLAR =================
  function openSettings() {
    $("#set-music").value = Math.round(Sound.getMusic() * 100);
    $("#set-sfx").value = Math.round(Sound.getSfx() * 100);
    $("#set-vibrate").checked = Store.vibrate();
  }
  $("#set-music").addEventListener("input", (e) => Sound.setMusic(e.target.value / 100));
  $("#set-sfx").addEventListener("input", (e) => { Sound.setSfx(e.target.value / 100); Sound.play("click"); });
  $("#set-vibrate").addEventListener("change", (e) => Store.setVibrate(e.target.checked));
  $("#reset-progress").addEventListener("click", () => {
    if (!confirm("Macera ilerlemen sıfırlansın mı? (altın ve skinler kalır)")) return;
    for (const lv of LEVELS) localStorage.removeItem("meyve_lvl_" + lv.id);
    localStorage.setItem("meyve_progress", 1);
    flash($("#reset-progress"), "Sıfırlandı ✓");
  });

  // ================= DÜELLO =================
  function openDuelScreen() {
    resetDuelUI();
    buildModeList();
    renderInvites();
    renderFriendInvite();
  }
  function resetDuelUI() { stopLive(); closeDuelChannel(); activeDuel = null; $("#duel-info").classList.add("hidden"); $("#duel-code").value = ""; }

  function buildModeList() {
    const box = $("#mode-list"); box.innerHTML = "";
    DUEL_MODES.forEach((m) => {
      const el = document.createElement("button");
      el.className = "mode-chip" + (m.id === selectedMode ? " active" : "");
      el.innerHTML = `${m.emoji}<br>${m.name}`;
      el.addEventListener("click", () => { selectedMode = m.id; buildModeList(); $("#mode-desc").textContent = m.desc; });
      box.appendChild(el);
    });
    $("#mode-desc").textContent = getDuelMode(selectedMode).desc;
  }

  async function renderInvites() {
    const box = $("#duel-invites");
    if (!DB.online) { box.classList.add("hidden"); return; }
    const inv = await DB.getInvites();
    if (!inv.length) { box.classList.add("hidden"); return; }
    box.classList.remove("hidden");
    box.innerHTML = `<span class="label">SENİ DÜELLOYA ÇAĞIRANLAR</span>` + inv.map((d) => {
      const m = getDuelMode(d.mode);
      return `<div class="invite-row"><span><b>${esc(d.creator_nick || "Biri")}</b> · ${m.emoji} ${m.name}</span>
        <button class="mini-btn" data-acc="${d.code}">Katıl</button></div>`;
    }).join("");
    box.querySelectorAll("[data-acc]").forEach((b) => b.addEventListener("click", () => joinByCode(b.dataset.acc)));
  }

  function renderFriendInvite() {
    const box = $("#friend-invite"); const fr = Store.friends();
    if (!fr.length) { box.innerHTML = ""; return; }
    box.innerHTML = `<span class="label">ARKADAŞINI DAVET ET</span><div class="fi-chips">` +
      fr.map((f) => `<button class="mini-btn" data-inv="${esc(f.code)}" data-dev="${esc(f.device || "")}">${esc(f.nick || f.code)}</button>`).join("") + `</div>`;
    box.querySelectorAll("[data-inv]").forEach((b) => b.addEventListener("click", () => inviteFriendToDuel(b.dataset.inv, b.dataset.dev)));
  }

  async function inviteFriendToDuel(code, device) {
    const f = Store.friends().find((x) => x.code === code);
    const targetDevice = device || (f && f.device);
    const res = await DB.createDuel({ mode: selectedMode, targetDevice });
    if (res.error) { alert("Hata: " + res.error); return; }
    activeDuel = { code: res.code, seed: res.seed, role: "creator", mode: selectedMode };
    show("duel");
    const m = getDuelMode(selectedMode);
    enterDuelLobby(`<p><b>${esc(f ? f.nick : "Arkadaşın")}</b> davet edildi · ${m.emoji} ${m.name}</p>
      <p class="muted">Kabul edince başla — sen başlatınca rakipte de otomatik başlar. Kod: <b class="code">${res.code}</b></p>`);
  }

  $("#duel-create").addEventListener("click", async () => {
    const res = await DB.createDuel({ mode: selectedMode });
    if (res.error) { alert("Hata: " + res.error); return; }
    activeDuel = { code: res.code, seed: res.seed, role: "creator", mode: selectedMode };
    const m = getDuelMode(selectedMode);
    enterDuelLobby(`<p>Kodun: <b class="code">${res.code}</b></p>
      <p class="muted">${m.emoji} ${m.name} — kodu rakibine yolla. Sen başlatınca rakipte de otomatik başlar.</p>`);
  });

  $("#duel-join").addEventListener("click", () => joinByCode($("#duel-code").value));
  async function joinByCode(code) {
    code = (code || "").trim().toUpperCase();
    if (code.length < 4) return;
    const d = await DB.getDuel(code);
    if (!d) { alert("Bu kodda düello bulunamadı."); return; }
    selectedMode = d.mode || "classic";
    activeDuel = { code, seed: d.seed, role: "challenger", mode: selectedMode, opp: d.creator_nick, oppScore: d.creator_score };
    show("duel");
    const m = getDuelMode(selectedMode);
    enterDuelLobby(`<p>Rakip: <b>${esc(d.creator_nick || "Anonim")}</b> · ${m.emoji} ${m.name}</p>
      <p class="muted">${m.desc}</p>`);
  }

  // Bekleme odası: kanalı aç, rakip varlığını göster, "Oyna" düğmesini bağla.
  function enterDuelLobby(headerHtml) {
    const info = $("#duel-info"); info.classList.remove("hidden");
    info.innerHTML = `${headerHtml}
      <p class="muted" id="duel-presence">⌛ Rakip bekleniyor…</p>
      <button class="btn big" id="duel-play">▶️ Oyna</button>`;
    $("#duel-play").addEventListener("click", () => {
      if (activeDuel && activeDuel.channel) activeDuel.channel.start();
      playDuel();
    });
    openDuelChannel();
    updateLobbyPresence();
  }
  function updateLobbyPresence() {
    const el = document.getElementById("duel-presence");
    if (!el || !activeDuel) return;
    el.innerHTML = activeDuel.oppPresent
      ? `🟢 <b>Rakip girdi!</b> Başlat — ikinizde de aynı anda başlasın.`
      : `⌛ Rakip bekleniyor…`;
  }

  function playDuel() {
    if (Game.isRunning()) return;
    targetPassed = false; oppLive = null;
    const mode = getDuelMode(activeDuel.mode);
    const cfg = Object.assign({ mode: "duel", seed: activeDuel.seed, win: mode.win }, modeCfg(mode));
    show("game"); setDuelLive(true); updateDuelLive();
    Game.start(cfg, { onStats: updateHud, onEnd: (r) => endGame(r) });
    startLive();
  }
  function modeCfg(m) {
    const c = {};
    if (m.timeLimit) c.timeLimit = m.timeLimit;
    if (m.target) c.target = m.target;
    if (m.risingDeath) c.risingDeath = m.risingDeath;
    return c;
  }

  // ---- Canlı düello kanalı ----
  function openDuelChannel() {
    closeDuelChannel();
    if (!activeDuel) return;
    activeDuel.channel = DB.openDuelChannel(activeDuel.code, {
      onState: (payload) => { oppLive = payload; updateDuelLive(); },
      onStart: () => { if (!Game.isRunning()) playDuel(); },
      onPresence: (devices) => {
        const mine = DB.deviceId();
        activeDuel.oppPresent = devices.some((d) => d && d !== mine);
        updateLobbyPresence();
      },
    });
  }
  function closeDuelChannel() { if (activeDuel && activeDuel.channel) { try { activeDuel.channel.close(); } catch {} activeDuel.channel = null; } }
  function startLive() {
    stopLive();
    liveTimer = setInterval(() => {
      if (!activeDuel || !activeDuel.channel) return;
      const st = Game.getLiveState();
      activeDuel.channel.send({ nick: DB.getNick() || "Rakip", score: st.score, topTier: st.topTier, dead: st.dead });
    }, 450);
  }
  function stopLive() { if (liveTimer) clearInterval(liveTimer); liveTimer = null; }

  function setDuelLive(on) { $("#duel-live").classList.toggle("hidden", !on); }
  function updateDuelLive() {
    const box = $("#duel-live"); if (box.classList.contains("hidden")) return;
    const mode = activeDuel ? getDuelMode(activeDuel.mode) : null;
    const myScore = Game.getLiveState ? Game.getLiveState().score : 0;
    if (mode && mode.win === "coop") {
      const total = myScore + (oppLive ? oppLive.score : 0);
      box.innerHTML = `🤝 Ortak: <b>${total}</b> / ${mode.target}
        <div class="bar"><i style="width:${Math.min(100, total / mode.target * 100)}%"></i></div>`;
    } else if (oppLive) {
      const tag = oppLive.dead ? "💀" : (getSkin(Store.equipped()).set[oppLive.topTier] || {}).emoji || "";
      box.innerHTML = `Rakip <b>${esc(oppLive.nick || "")}</b>: <b>${oppLive.score}</b> ${tag}`;
    } else {
      box.innerHTML = `<span class="muted">Rakip bekleniyor… (canlı bağlantı)</span>`;
    }
  }

  // ---- Düello sonucu ----
  function metric(r) { return r.duelMode === "survive" ? Math.round(r.survivedMs / 1000) : r.score; }
  async function endDuel(r) {
    stopLive();
    const mode = getDuelMode(activeDuel.mode);
    const myMetric = metric(r);
    await DB.submitDuel(activeDuel.code, myMetric, activeDuel.role);

    // rakip skorunu bul: önce canlı, sonra DB
    let oppMetric = oppLive && oppLive.dead ? oppLive.score : null;
    let oppName = (oppLive && oppLive.nick) || activeDuel.opp;
    if (oppMetric == null) {
      const d = await DB.getDuel(activeDuel.code);
      if (d) {
        oppMetric = activeDuel.role === "creator" ? d.challenger_score : d.creator_score;
        oppName = activeDuel.role === "creator" ? d.challenger_nick : d.creator_nick;
      }
    }
    closeDuelChannel();

    let body, reward = 0;
    if (mode.win === "coop") {
      const total = myMetric + (oppMetric || (oppLive ? oppLive.score : 0));
      const ok = total >= mode.target;
      body = ok ? `<b style="color:#2ecc71">Hedefe ulaştınız! 🎉</b><br>Toplam: ${total}/${mode.target}`
                : `Toplam: ${total}/${mode.target}<br>Birlikte tekrar deneyin!`;
      reward = ok ? 40 : 10;
      if (ok) Store.addWin();
    } else if (oppMetric == null) {
      body = `Senin sonucun: <b>${myMetric}</b>${mode.win === "survive" ? "s" : ""}<br>Rakip henüz oynamadı. Kod: <b>${activeDuel.code}</b>`;
      reward = 5;
    } else {
      const unit = mode.win === "survive" ? "s" : "";
      const n = esc(oppName || "Rakip");
      if (myMetric > oppMetric) { body = `<b style="color:#2ecc71">Kazandın! 🎉</b><br>Sen: ${myMetric}${unit} · ${n}: ${oppMetric}${unit}`; reward = 50; Store.addWin(); }
      else if (myMetric < oppMetric) { body = `<b style="color:#e74c3c">Kaybettin 😢</b><br>Sen: ${myMetric}${unit} · ${n}: ${oppMetric}${unit}`; reward = 10; }
      else { body = `<b>Berabere!</b><br>İkiniz: ${myMetric}${unit}`; reward = 20; }
    }
    if (reward > 0) { Store.addCoins(reward); Sound.play("coin"); body += `<br>🪙 +${reward} altın`; }

    openResult(`${mode.emoji} ${mode.name}`, body, [
      { t: "Tekrar", fn: () => { closeResult(); playDuel(); } },
      { t: "Menü", cls: "ghost", fn: () => { closeResult(); activeDuel = null; show("menu"); } },
    ]);
  }

  // ================= OYUN-İÇİ KONTROLLER =================
  document.querySelectorAll("[data-pause]").forEach((b) => b.addEventListener("click", openPause));
  function openPause() {
    if (!Game.isRunning()) return;
    Game.pause();
    $("#pause-music").value = Math.round(Sound.getMusic() * 100);
    $("#pause-sfx").value = Math.round(Sound.getSfx() * 100);
    $("#pause-overlay").classList.remove("hidden");
  }
  $("#pause-music").addEventListener("input", (e) => Sound.setMusic(e.target.value / 100));
  $("#pause-sfx").addEventListener("input", (e) => Sound.setSfx(e.target.value / 100));
  $("#pause-resume").addEventListener("click", () => { $("#pause-overlay").classList.add("hidden"); Game.resume(); });
  $("#pause-menu").addEventListener("click", () => { $("#pause-overlay").classList.add("hidden"); back(); });
  $("#sound-toggle").addEventListener("click", () => {
    const on = Sound.getSfx() > 0 || Sound.getMusic() > 0;
    if (on) { Sound._save = { s: Sound.getSfx() || 0.7, m: Sound.getMusic() || 0.4 }; Sound.setSfx(0); Sound.setMusic(0); $("#sound-toggle").textContent = "🔇"; }
    else { const s = Sound._save || { s: 0.7, m: 0.4 }; Sound.setSfx(s.s); Sound.setMusic(s.m); $("#sound-toggle").textContent = "🔊"; }
  });

  show("menu");
})();
