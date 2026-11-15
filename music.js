// Background music: "Silent Night" (Franz Gruber, 1818 — public domain) played as a music box with Web Audio. No audio files.
// Toggle with 🎵 (or U); the choice is remembered in this browser.
const NOTE = (n) => 440 * Math.pow(2, (n - 69) / 12);
const M = { C4: 60, D4: 62, E4: 64, F4: 65, G4: 67, A4: 69, B4: 71, C5: 72, D5: 74, E5: 76, F5: 77 };
// melody in eighth notes (6/8 time): [note, length]
const MEL = [
  ['G4', 3], ['A4', 1], ['G4', 2], ['E4', 6], ['G4', 3], ['A4', 1], ['G4', 2], ['E4', 6],
  ['D5', 4], ['D5', 2], ['B4', 6], ['C5', 4], ['C5', 2], ['G4', 6],
  ['A4', 4], ['A4', 2], ['C5', 3], ['B4', 1], ['A4', 2], ['G4', 3], ['A4', 1], ['G4', 2], ['E4', 6],
  ['A4', 4], ['A4', 2], ['C5', 3], ['B4', 1], ['A4', 2], ['G4', 3], ['A4', 1], ['G4', 2], ['E4', 6],
  ['D5', 4], ['D5', 2], ['F5', 3], ['D5', 1], ['B4', 2], ['C5', 6], ['E5', 6],
  ['C5', 3], ['G4', 1], ['E4', 2], ['G4', 3], ['F4', 1], ['D4', 2], ['C4', 12],
];
// one bass root per 6/8 bar (C, G, F)
const BASS = ['C', 'C', 'G', 'C', 'F', 'C', 'F', 'C', 'G', 'C', 'C', 'C', 'G', 'C', 'C'];
const ROOT = { C: 48, G: 43, F: 41 };
const EIGHTH = 0.34, GAP = 4; // seconds per eighth note, pause between loops

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
    for (const [mul, v, dec] of [[1, 1, 1.6], [2, 0.32, 0.7], [3.01, 0.12, 0.35]]) {
      const o = ctx.createOscillator(), g = ctx.createGain(); o.type = 'sine'; o.frequency.value = freq * mul;
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol * v, t + 0.006); g.gain.exponentialRampToValueAtTime(0.0008, t + Math.min(len + 0.6, dec * 2.2));
      o.connect(g); g.connect(out); o.start(t); o.stop(t + Math.min(len + 0.7, dec * 2.4));
    }
  }
  function loop() {
    if (!on || !ctx) { playing = false; return; } playing = true;
    let t = ctx.currentTime + 0.15, u = 0;
    for (const [n, len] of MEL) { bell(NOTE(M[n]), t + u * EIGHTH, len * EIGHTH, 0.22); u += len; }
    BASS.forEach((r, i) => { const t0 = t + i * 6 * EIGHTH; bell(NOTE(ROOT[r]), t0, 3 * EIGHTH, 0.13); bell(NOTE(ROOT[r] + 7), t0 + 3 * EIGHTH, 3 * EIGHTH, 0.08); });
    timer = setTimeout(loop, (u * EIGHTH + GAP) * 1000);
  }
  function start() { if (!on) return; setup(); if (!ctx) return; if (ctx.state === 'suspended') ctx.resume().catch(() => {}); out.gain.cancelScheduledValues(ctx.currentTime); out.gain.setTargetAtTime(0.55, ctx.currentTime, 0.8); if (!playing) loop(); }
  function stop() { if (!ctx) return; out.gain.setTargetAtTime(0, ctx.currentTime, 0.3); clearTimeout(timer); playing = false; }
  function toggle() { on = !on; try { localStorage.setItem('fm:bgm', on ? 'on' : 'off'); } catch (_) {} ui(); on ? start() : stop(); G.toast(on ? '🎵 배경음악 켜짐 — 고요한 밤 (오르골)' : '🔇 배경음악 꺼짐', 1.6); }
  if (btn) btn.addEventListener('click', toggle);
  window.addEventListener('keydown', (e) => { if (e.code === 'KeyU' && !e.repeat && G.started() && !(e.target instanceof HTMLInputElement)) toggle(); });
  document.addEventListener('visibilitychange', () => { if (!ctx) return; if (document.visibilityState === 'hidden') ctx.suspend().catch(() => {}); else if (on) ctx.resume().catch(() => {}); });
  ui();
  return { start, toggle };
}
