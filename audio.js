// 🔊 Ses motoru — WebAudio ile üretilen efektler + basit döngülü müzik.
// Harici dosya gerekmez. Ses seviyeleri localStorage'da saklanır.
const Sound = (() => {
  let ctx = null;
  let masterSfx, masterMusic;
  let musicTimer = null, musicOn = false;

  // Ayarlar (0..1) — Store üzerinden de okunur ama burada da tutuyoruz
  let sfxVol = clamp(num(localStorage.getItem("meyve_sfx"), 0.7));
  let musicVol = clamp(num(localStorage.getItem("meyve_music"), 0.4));

  function num(v, d) { const n = parseFloat(v); return isNaN(n) ? d : n; }
  function clamp(v) { return Math.max(0, Math.min(1, v)); }

  function ensure() {
    if (ctx) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ctx = new AC();
    masterSfx = ctx.createGain(); masterSfx.gain.value = sfxVol; masterSfx.connect(ctx.destination);
    masterMusic = ctx.createGain(); masterMusic.gain.value = musicVol; masterMusic.connect(ctx.destination);
  }
  // İlk kullanıcı etkileşiminde context'i uyandır (tarayıcı politikası)
  function unlock() { ensure(); if (ctx && ctx.state === "suspended") ctx.resume(); }

  // ---- Tek nota ----
  function beep(freq, dur, type = "sine", gain = 0.5, target = masterSfx, slideTo = null) {
    if (!ctx) return;
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type; o.frequency.value = freq;
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, ctx.currentTime + dur);
    g.gain.setValueAtTime(0, ctx.currentTime);
    g.gain.linearRampToValueAtTime(gain, ctx.currentTime + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + dur);
    o.connect(g); g.connect(target);
    o.start(); o.stop(ctx.currentTime + dur + 0.02);
  }

  // ---- Efektler ----
  const SFX = {
    click:  () => beep(520, 0.07, "triangle", 0.4),
    drop:   () => beep(300, 0.12, "sine", 0.4, masterSfx, 180),
    // birleşme: tier yükseldikçe daha tiz
    merge:  (tier = 0) => { const f = 280 + tier * 55; beep(f, 0.14, "triangle", 0.5); beep(f * 1.5, 0.12, "sine", 0.3); },
    bomb:   () => { beep(120, 0.3, "sawtooth", 0.5, masterSfx, 40); },
    win:    () => { [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => beep(f, 0.22, "triangle", 0.5), i * 110)); },
    lose:   () => { [392, 330, 262].forEach((f, i) => setTimeout(() => beep(f, 0.28, "sawtooth", 0.4, masterSfx, f * 0.7), i * 140)); },
    coin:   () => { beep(880, 0.08, "square", 0.35); setTimeout(() => beep(1320, 0.1, "square", 0.3), 70); },
  };
  function play(name, arg) { if (!ctx) ensure(); if (!ctx) return; if (sfxVol <= 0) return; SFX[name] && SFX[name](arg); }

  // ---- Müzik (basit döngülü arpej) ----
  const SCALE = [261.63, 293.66, 329.63, 392.0, 440.0, 523.25]; // C majör pentatonik-ish
  let step = 0;
  function tick() {
    if (!musicOn || !ctx) return;
    const base = SCALE[step % SCALE.length];
    beep(base, 0.5, "sine", 0.18, masterMusic);
    if (step % 2 === 0) beep(base / 2, 0.6, "triangle", 0.12, masterMusic);
    step++;
    musicTimer = setTimeout(tick, 320);
  }
  function startMusic() {
    ensure(); if (!ctx) return;
    if (musicOn) return; musicOn = true;
    if (ctx.state === "suspended") ctx.resume();
    tick();
  }
  function stopMusic() { musicOn = false; if (musicTimer) clearTimeout(musicTimer); musicTimer = null; }

  // ---- Ses seviyesi ----
  function setSfx(v) { sfxVol = clamp(v); localStorage.setItem("meyve_sfx", sfxVol); if (masterSfx) masterSfx.gain.value = sfxVol; }
  function setMusic(v) {
    musicVol = clamp(v); localStorage.setItem("meyve_music", musicVol);
    if (masterMusic) masterMusic.gain.value = musicVol;
    if (musicVol <= 0) stopMusic(); else if (!musicOn) startMusic();
  }
  function getSfx() { return sfxVol; }
  function getMusic() { return musicVol; }

  // İlk dokunuşta unlock
  ["pointerdown", "keydown", "touchstart"].forEach((ev) =>
    window.addEventListener(ev, unlock, { once: false, passive: true }));

  return { play, startMusic, stopMusic, setSfx, setMusic, getSfx, getMusic, unlock };
})();
