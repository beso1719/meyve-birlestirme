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
  async function createDuel() {
    const seed = Math.floor(Math.random() * 2 ** 31);
    const code = shortCode();
    const row = {
      code, seed, status: "open",
      creator_nick: getNick() || "Anonim", creator_device: deviceId(),
    };
    if (!online) { localStorage.setItem("duel_" + code, JSON.stringify(row)); return { code, seed }; }
    const { error } = await client.from("duels").insert(row);
    if (error) return { error: error.message };
    return { code, seed };
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

  return { online, deviceId, getNick, setNick, submitScore, leaderboard,
           createDuel, getDuel, submitDuel };
})();
