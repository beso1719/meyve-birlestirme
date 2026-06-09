// 🔌 Supabase katmanı — offline fallback'li.
// Bağlantı yoksa her fonksiyon localStorage/boş veriyle çalışır, oyun bozulmaz.
const DB = (() => {
  let client = null;
  const online = !!(SUPABASE_URL && SUPABASE_ANON_KEY && window.supabase);
  if (online) {
    client = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  }

  // ---- Oyuncu kimliği (takma ad + cihaz id) ----
  function deviceId() {
    let id = localStorage.getItem("meyve_device");
    if (!id) {
      id = (crypto.randomUUID && crypto.randomUUID()) ||
           (Date.now().toString(36) + Math.random().toString(36).slice(2));
      localStorage.setItem("meyve_device", id);
    }
    return id;
  }
  function getNick() { return localStorage.getItem("meyve_nick") || ""; }
  function setNick(n) { localStorage.setItem("meyve_nick", n.trim().slice(0, 20)); }

  // Kalıcı arkadaş kodu (başkaları seni bununla ekler)
  function friendCode() {
    let c = localStorage.getItem("meyve_code");
    if (!c) {
      const ch = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
      c = ""; for (let i = 0; i < 6; i++) c += ch[Math.floor(Math.random() * ch.length)];
      localStorage.setItem("meyve_code", c);
    }
    return c;
  }

  // ---- Skor gönder ----
  async function submitScore(score, mode, level) {
    const row = {
      device: deviceId(),
      nickname: getNick() || "Anonim",
      score: Math.round(score),
      mode,
      level: level ?? null,
    };
    if (!online) return { ok: true, offline: true };
    try {
      const { error } = await client.from("scores").insert(row);
      if (error) throw error;
      return { ok: true };
    } catch (e) {
      console.warn("submitScore hata:", e.message);
      return { ok: false, error: e.message };
    }
  }

  // ---- Skor tablosu (günlük/haftalık/tüm zamanlar) ----
  async function leaderboard(period = "all", mode = null, limit = 50) {
    if (!online) return [];
    let q = client.from("scores").select("nickname,score,mode,level,created_at")
                  .order("score", { ascending: false }).limit(limit);
    if (mode) q = q.eq("mode", mode);
    if (period === "daily")  q = q.gte("created_at", since(1));
    if (period === "weekly") q = q.gte("created_at", since(7));
    const { data, error } = await q;
    if (error) { console.warn("leaderboard hata:", error.message); return []; }
    return dedupeByNick(data || []);
  }
  function since(days) {
    return new Date(Date.now() - days * 864e5).toISOString();
  }
  // Aynı oyuncunun en iyi skorunu bırak
  function dedupeByNick(rows) {
    const best = new Map();
    for (const r of rows) {
      const k = r.nickname;
      if (!best.has(k) || r.score > best.get(k).score) best.set(k, r);
    }
    return [...best.values()].sort((a, b) => b.score - a.score);
  }

  // ---- Düello (async, seed tabanlı) ----
  function shortCode() {
    const c = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
    let s = ""; for (let i = 0; i < 5; i++) s += c[Math.floor(Math.random() * c.length)];
    return s;
  }
  async function createDuel(opts = {}) {
    const seed = Math.floor(Math.random() * 2 ** 31);
    const code = shortCode();
    const row = {
      code, seed, status: "open", mode: opts.mode || "classic",
      creator_nick: getNick() || "Anonim", creator_device: deviceId(),
      target_device: opts.targetDevice || null,
    };
    if (!online) { localStorage.setItem("duel_" + code, JSON.stringify(row)); return { code, seed, mode: row.mode }; }
    const { error } = await client.from("duels").insert(row);
    if (error) return { error: error.message };
    return { code, seed, mode: row.mode };
  }

  // Bana gelen (target_device = ben) açık düello davetleri
  async function getInvites() {
    if (!online) return [];
    const { data, error } = await client.from("duels").select("*")
      .eq("target_device", deviceId()).eq("status", "open")
      .gte("created_at", since(2)).order("created_at", { ascending: false });
    if (error) { console.warn(error.message); return []; }
    return data || [];
  }
  async function getDuel(code) {
    code = code.trim().toUpperCase();
    if (!online) { const r = localStorage.getItem("duel_" + code); return r ? JSON.parse(r) : null; }
    const { data, error } = await client.from("duels").select("*").eq("code", code).maybeSingle();
    if (error) { console.warn(error.message); return null; }
    return data;
  }
  async function submitDuel(code, score, role) {
    code = code.trim().toUpperCase();
    const score_i = Math.round(score);
    if (!online) return { ok: true, offline: true };
    const patch = role === "creator"
      ? { creator_score: score_i }
      : { challenger_score: score_i, challenger_nick: getNick() || "Anonim", challenger_device: deviceId(), status: "done" };
    const { error } = await client.from("duels").update(patch).eq("code", code);
    return { ok: !error, error: error?.message };
  }

  // ---- Profiller ----
  async function upsertProfile(p) {
    if (!online) return { ok: true, offline: true };
    const row = {
      device: deviceId(), code: friendCode(), nickname: getNick() || "Anonim",
      coins: p.coins | 0, skin: p.skin || "fruit", owned: p.owned || ["fruit"],
      best: p.best | 0, wins: p.wins | 0, updated_at: new Date().toISOString(),
    };
    const { error } = await client.from("profiles").upsert(row, { onConflict: "device" });
    if (error) console.warn("upsertProfile:", error.message);
    return { ok: !error };
  }
  async function getProfile({ code, device }) {
    if (!online) return null;
    let q = client.from("profiles").select("*").limit(1);
    q = code ? q.eq("code", code.trim().toUpperCase()) : q.eq("device", device);
    const { data, error } = await q.maybeSingle();
    if (error) { console.warn(error.message); return null; }
    return data;
  }
  async function searchProfiles(nick) {
    if (!online || !nick) return [];
    const { data, error } = await client.from("profiles").select("device,code,nickname,best,wins")
      .ilike("nickname", `%${nick}%`).limit(20);
    if (error) { console.warn(error.message); return []; }
    return (data || []).filter((p) => p.device !== deviceId());
  }

  // ---- Canlı düello kanalı (Realtime broadcast) ----
  // onState(payload): rakibin {score, topTier, dead, finalScore} verisini alır.
  function openDuelChannel(code, onState, onPresence) {
    if (!online) return { send() {}, close() {} };
    const ch = client.channel("duel-" + code, { config: { broadcast: { self: false } } });
    ch.on("broadcast", { event: "state" }, (m) => onState && onState(m.payload));
    if (onPresence) {
      ch.on("presence", { event: "sync" }, () => onPresence(Object.keys(ch.presenceState()).length));
      ch.on("presence", { event: "join" }, () => onPresence(Object.keys(ch.presenceState()).length));
      ch.on("presence", { event: "leave" }, () => onPresence(Object.keys(ch.presenceState()).length));
    }
    ch.subscribe((status) => { if (status === "SUBSCRIBED" && onPresence) ch.track({ device: deviceId(), at: Date.now() }); });
    return {
      send(payload) { ch.send({ type: "broadcast", event: "state", payload }); },
      close() { try { client.removeChannel(ch); } catch {} },
    };
  }

  return { online, deviceId, getNick, setNick, friendCode, submitScore, leaderboard,
           createDuel, getDuel, submitDuel, getInvites,
           upsertProfile, getProfile, searchProfiles, openDuelChannel };
})();
