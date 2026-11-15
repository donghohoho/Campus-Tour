// Background music: "Jingle Bells" (James Lord Pierpont, 1857 — public domain), upbeat for running around: music-box melody,
// oom-pah bass and sleigh bells, all made with Web Audio. No audio files. Toggle with 🎵 (or U); remembered in this browser.
const NOTE = (n) => 440 * Math.pow(2, (n - 69) / 12);
const M = { C5: 72, D5: 74, E5: 76, F5: 77, G5: 79 };
// melody in eighth notes (4/4): [note, length]
const L1 = [['E5', 2], ['E5', 2], ['E5', 4], ['E5', 2], ['E5', 2], ['E5', 4], ['E5', 2], ['G5', 2], ['C5', 3], ['D5', 1], ['E5', 8]];
const L2 = [['F5', 2], ['F5', 2], ['F5', 3], ['F5', 1], ['F5', 2], ['E5', 2], ['E5', 2], ['E5', 1], ['E5', 1], ['E5', 2], ['D5', 2], ['D5', 2], ['E5', 2], ['D5', 4], ['G5', 4]];
const L4 = [['F5', 2], ['F5', 2], ['F5', 3], ['F5', 1], ['F5', 2], ['E5', 2], ['E5', 2], ['E5', 1], ['E5', 1], ['G5', 2], ['G5', 2], ['F5', 2], ['D5', 2], ['C5', 8]];
const MEL = [...L1, ...L2, ...L1, ...L4];
// one chord per bar: root + fifth for the oom-pah
const BASS = ['C', 'C', 'C', 'C', 'F', 'C', 'D', 'G', 'C', 'C', 'C', 'C', 'F', 'C', 'G', 'C'];
const ROOT = { C: 48, D: 50, F: 41, G: 43 };
const EIGHTH = 0.19, GAP = 0.8; // seconds per eighth note (~158 bpm), pause between loops

export function initMusic(G) {
  let ctx = null, out = null, on = (() => { try { return localStorage.getItem('fm:bgm') !== 'off'; } catch (_) { return true; } })(), timer = null, playing = false;
  const btn = document.querySelector('#bgmBtn');
  const ui = () => { if (!btn) return; btn.textContent = on ? '🎵' : '🔇'; btn.title = on ? '배경음악 끄기 (U)' : '배경음악 켜기 (U)'; btn.setAttribute('aria-pressed', String(on)); };
  function setup() {
    if (ctx) return; const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return; ctx = new AC();
    out = ctx.createGain(); out.gain.value = 0; out.connect(ctx.destination);
    // a little room: two feedback echoes
    const wet = ctx.createGain(); wet.gain.value = 0.28; for (const [t, f] of [[0.23, 0.32], [0.37, 0.25]]) { const d = ctx.createDelay(1); d.delayTime.value = t; const fb = ctx.createGain(); fb.gain.value = f; out.connect(d); d.connect(fb); fb.connect(d); d.connect(wet); } wet.connect(ctx.destination);
  }
  function bell(freq, t, len, vol) { // music-box tine: bright attack, quick decay, faint octave
    for (const [mul, v, dec] of [[1, 1, 0.9], [2, 0.32, 0.45], [3.01, 0.12, 0.25]]) {
      const o = ctx.createOscillator(), g = ctx.createGain(); o.type = 'sine'; o.frequency.value = freq * mul;
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol * v, t + 0.006); g.gain.exponentialRampToValueAtTime(0.0008, t + Math.min(len + 0.6, dec * 2.2));
      o.connect(g); g.connect(out); o.start(t); o.stop(t + Math.min(len + 0.7, dec * 2.4));
    }
  }
  let noiseBuf = null;
  function jingle(t, vol) { // sleigh bells: a short burst of bright, high-passed noise
    if (!noiseBuf) { noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 0.2, ctx.sampleRate); const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length); }
    const src = ctx.createBufferSource(), hp = ctx.createBiquadFilter(), g = ctx.createGain(); src.buffer = noiseBuf; hp.type = 'highpass'; hp.frequency.value = 6500;
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0005, t + 0.12); src.connect(hp); hp.connect(g); g.connect(out); src.start(t); src.stop(t + 0.15);
  }
  function loop() {
    if (!on || !ctx) { playing = false; return; } playing = true;
    let t = ctx.currentTime + 0.15, u = 0;
    for (const [n, len] of MEL) { bell(NOTE(M[n]), t + u * EIGHTH, len * EIGHTH, 0.2); u += len; }
    BASS.forEach((r, i) => { const t0 = t + i * 8 * EIGHTH; for (let q = 0; q < 4; q++) bell(NOTE(ROOT[r] + (q % 2 ? 7 : 0) + (q === 2 ? 0 : 0)), t0 + q * 2 * EIGHTH, EIGHTH * 1.5, q % 2 ? 0.07 : 0.12); });
    for (let k = 0; k < u; k++) jingle(t + k * EIGHTH, k % 2 ? 0.05 : 0.09); // sleigh bells on every eighth, accented on the beat
    timer = setTimeout(loop, (u * EIGHTH + GAP) * 1000);
  }
  function start() { if (!on) return; setup(); if (!ctx) return; if (ctx.state === 'suspended') ctx.resume().catch(() => {}); out.gain.cancelScheduledValues(ctx.currentTime); out.gain.setTargetAtTime(0.55, ctx.currentTime, 0.8); if (!playing) loop(); }
  function stop() { if (!ctx) return; out.gain.setTargetAtTime(0, ctx.currentTime, 0.3); clearTimeout(timer); playing = false; }
  function toggle() { on = !on; try { localStorage.setItem('fm:bgm', on ? 'on' : 'off'); } catch (_) {} ui(); on ? start() : stop(); G.toast(on ? '🎵 배경음악 켜짐 — 징글벨' : '🔇 배경음악 꺼짐', 1.6); }
  if (btn) btn.addEventListener('click', toggle);
  window.addEventListener('keydown', (e) => { if (e.code === 'KeyU' && !e.repeat && G.started() && !(e.target instanceof HTMLInputElement)) toggle(); });
  document.addEventListener('visibilitychange', () => { if (!ctx) return; if (document.visibilityState === 'hidden') ctx.suspend().catch(() => {}); else if (on) ctx.resume().catch(() => {}); });
  ui();
  return { start, toggle };
}
