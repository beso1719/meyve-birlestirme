// 💰 Oyuncu deposu: altın, sahip olunan skinler, arkadaşlar, ayarlar.
// Yerel (localStorage) ana kaynaktır; Supabase profile sadece başkaları görebilsin diye senkronlanır.
const Store = (() => {
  const K = {
    coins: "meyve_coins", owned: "meyve_owned", skin: "meyve_skin",
    friends: "meyve_friends", vibrate: "meyve_vibrate",
  };

  function jget(k, d) { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } }
  function jset(k, v) { localStorage.setItem(k, JSON.stringify(v)); }

  // ---- Altın ----
  function coins() { return +localStorage.getItem(K.coins) || 0; }
  function addCoins(n) {
    if (n <= 0) return coins();
    const v = coins() + Math.round(n);
    localStorage.setItem(K.coins, v);
    syncProfile();
    return v;
  }
  function spend(n) {
    if (coins() < n) return false;
    localStorage.setItem(K.coins, coins() - n);
    syncProfile();
    return true;
  }

  // ---- Skinler ----
  function owned() { const o = jget(K.owned, ["fruit"]); return o.includes("fruit") ? o : ["fruit", ...o]; }
  function hasSkin(id) { return owned().includes(id); }
  function buySkin(id) {
    const sk = getSkin(id);
    if (!sk || hasSkin(id)) return { ok: false, reason: "owned" };
    if (!spend(sk.price)) return { ok: false, reason: "coins" };
    const o = owned(); o.push(id); jset(K.owned, o);
    syncProfile();
    return { ok: true };
  }
  function equipped() { const id = localStorage.getItem(K.skin) || "fruit"; return hasSkin(id) ? id : "fruit"; }
  function equip(id) { if (hasSkin(id)) { localStorage.setItem(K.skin, id); syncProfile(); } }

  // ---- Ayarlar ----
  function vibrate() { return localStorage.getItem(K.vibrate) !== "0"; }
  function setVibrate(on) { localStorage.setItem(K.vibrate, on ? "1" : "0"); }
  function buzz(ms = 30) { if (vibrate() && navigator.vibrate) navigator.vibrate(ms); }

  // ---- Arkadaşlar (yerel liste; her biri {code, nick, device}) ----
  function friends() { return jget(K.friends, []); }
  function addFriend(f) {
    const list = friends();
    if (list.some((x) => x.device === f.device || x.code === f.code)) return false;
    list.push({ code: f.code, nick: f.nick, device: f.device });
    jset(K.friends, list); return true;
  }
  function removeFriend(code) { jset(K.friends, friends().filter((f) => f.code !== code)); }

  // ---- Supabase profil senkronu ----
  let synced = false;
  function profileData() {
    return {
      coins: coins(), skin: equipped(), owned: owned(),
      best: +localStorage.getItem("meyve_best") || 0,
      wins: +localStorage.getItem("meyve_wins") || 0,
    };
  }
  function syncProfile() {
    if (typeof DB === "undefined" || !DB.online || !DB.upsertProfile) return;
    DB.upsertProfile(profileData());
  }
  function init() {
    if (synced) return; synced = true;
    syncProfile();
  }

  // düello galibiyeti say
  function addWin() { localStorage.setItem("meyve_wins", (+localStorage.getItem("meyve_wins") || 0) + 1); syncProfile(); }
  function recordBest(score) {
    const b = +localStorage.getItem("meyve_best") || 0;
    if (score > b) { localStorage.setItem("meyve_best", score); syncProfile(); }
  }

  return {
    coins, addCoins, spend,
    owned, hasSkin, buySkin, equipped, equip,
    vibrate, setVibrate, buzz,
    friends, addFriend, removeFriend,
    init, syncProfile, addWin, recordBest, profileData,
  };
})();
