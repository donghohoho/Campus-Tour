// Quests — a daily board of 3 quests (Q / 📜), progress fed by events the game already has, rewards paid in coins.
//   • data (the quest pool) lives in quests-data.js; this file is the system
//   • progress sources: pedometer distance (pets.js), named place under the player (client.js HUD), petting an animal (E),
//     picking up a collectible (collectibles.js), time played — none of those systems change, they only report to us
//   • the board renews at 00:00 Korea time; the clock is the web server's (Date header), not the device's, when it can be read
//   • a claim is recorded in a ledger before/with the coins it pays, so the same quest can never pay twice
//   • saved per device (localStorage) for guests, on the account (Firestore users/{uid}.quests) when logged in
import { PERIODS, TYPES, TEMPLATES } from './quests-data.js';

const KEY = 'fm:quests', LEDGER_MAX = 120, RANKS = { common: 0, rare: 1, epic: 2, legendary: 3 };
const $ = (s) => document.querySelector(s);

// ── time: Korea day keys from a server-corrected clock ──
const KST = 9 * 3600e3;
const dayKey = (ms) => new Date(ms + KST).toISOString().slice(0, 10); // 'YYYY-MM-DD' in Korea time
const PERIOD_KEY = { daily: dayKey }; // future: weekly: (ms) => ISO week in KST, 'season:x': fixed id …
const nextReset = (ms) => { const d = new Date(ms + KST); d.setUTCHours(24, 0, 0, 0); return d.getTime() - KST; }; // next 00:00 KST

// ── how each kind of quest counts (unit only matters for display) ──
const KINDS = {
  distance: { unit: 'm' }, petWalk: { unit: 'm' }, play: { unit: 's' },
  visit: { unit: '' }, visitAny: { unit: '곳' }, collect: { unit: '개' }, pat: { unit: '번' },
};
const fmtVal = (q, v) => {
  const u = (KINDS[q.kind] || {}).unit;
  if (u === 's') { const m = Math.floor(v / 60), s = Math.floor(v % 60); return m >= 1 ? `${m}분${s && v < q.target ? ` ${s}초` : ''}` : `${s}초`; }
  if (u === 'm') return v >= 1000 ? `${(v / 1000).toFixed(v % 1000 ? 1 : 0)}km` : `${Math.floor(v)}m`;
  return `${Math.floor(v)}${u}`;
};

// ── seeded draw: same date → same board for everyone (unless a quest can't be finished by this player) ──
function seeded(str) { let h = 2166136261; for (const c of str) h = Math.imul(h ^ c.charCodeAt(0), 16777619); return () => { h |= 0; h = (h + 0x6d2b79f5) | 0; let t = Math.imul(h ^ (h >>> 15), 1 | h); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
function draw(period, key, feasible) {
  const rnd = seeded(period + ':' + key), types = Object.keys(TYPES).map((t) => [rnd(), t]).sort((a, b) => a[0] - b[0]).map((x) => x[1]);
  const out = [];
  for (const type of types) {
    if (out.length >= PERIODS[period].count) break;
    const pool = TEMPLATES.filter((t) => t.period === period && t.type === type && feasible(t)); if (!pool.length) continue;
    let r = rnd() * pool.reduce((s, t) => s + (t.weight || 1), 0), pick = pool[0]; for (const t of pool) { r -= t.weight || 1; if (r <= 0) { pick = t; break; } }
    const { id, kind, name, desc, target, reward, campus, place, minRarity } = pick;
    out.push({ id: `${period}:${key}:${id}`, tpl: id, period, day: key, type, kind, name, desc, target, reward, campus, place, minRarity, progress: 0, done: false, claimed: false, seen: [] });
  }
  return out;
}

// ── saved state: { v:1, boards: { daily: { key, quests:[…] } }, maxKey: { daily }, ledger: ['daily:2026-11-15:walk-500', …] } ──
const empty = () => ({ v: 1, boards: {}, maxKey: {}, ledger: [] });
function norm(s) {
  if (!s || typeof s !== 'object' || s.v !== 1) return null; const out = empty();
  for (const [p, b] of Object.entries(s.boards || {})) if (PERIODS[p] && b && typeof b.key === 'string' && Array.isArray(b.quests))
    out.boards[p] = { key: b.key, quests: b.quests.filter((q) => q && typeof q.id === 'string').map((q) => ({ ...q, progress: Math.max(0, +q.progress || 0), target: Math.max(1, +q.target || 1), reward: Math.max(0, q.reward | 0), done: !!q.done, claimed: !!q.claimed, seen: Array.isArray(q.seen) ? q.seen.map(String).slice(0, 50) : [] })) };
  for (const [p, k] of Object.entries(s.maxKey || {})) if (typeof k === 'string') out.maxKey[p] = k;
  out.ledger = Array.isArray(s.ledger) ? s.ledger.map(String).slice(-LEDGER_MAX) : [];
  return out;
}
const localStore = {
  local: true,
  load: () => { try { return norm(JSON.parse(localStorage.getItem(KEY) || 'null')); } catch (_) { return null; } },
  save: async (s) => { try { localStorage.setItem(KEY, JSON.stringify(s)); } catch (_) {} },
  saveClaim: async (s) => { try { localStorage.setItem(KEY, JSON.stringify(s)); } catch (_) {} }, // the coins go through pets.js's own save right after
};
const cloudStore = (api) => ({ local: false, load: async () => norm(await api.loadQuests()), save: (s) => api.saveQuests(s), saveClaim: (s, wallet) => api.saveQuests(s, wallet) }); // claim: quests + wallet in ONE write

export function initQuests(G) {
  // G: { toast, started(), worldReady(), menuOpen(), typing(), touch, releaseKeys(), lockPointer(),
  //      metres() (pedometer total), petsWalking() (pets out with you), remaining(minRarity) (collectibles left to find),
  //      payCoins(n) → wallet snapshot, coinPop() }
  let S = localStore.load() || empty(), store = localStore, dirty = false, saveT = 0, open = false, uiT = 0, uiDirty = true;
  let anchor = null, clockOk = false, clockReady = false, shift = 0, lastMetres = null, lastPlace = null;

  // server clock: the page's own web server answers with a Date header. After that, time runs on performance.now(), which is
  // monotonic and ignores the device clock — changing the system clock mid-game moves nothing. No server (offline): device clock.
  async function syncClock() {
    try { const p0 = performance.now(), r = await fetch(location.href.split('#')[0], { method: 'HEAD', cache: 'no-store' }), p1 = performance.now(), d = Date.parse(r.headers.get('Date'));
      if (d) { anchor = { server: d + 500, perf: (p0 + p1) / 2 }; clockOk = true; } } catch (_) {} // Date has 1 s resolution → +500 ms = middle of that second
    clockReady = true; ensure();
  }
  syncClock(); setInterval(syncClock, 10 * 60e3); setTimeout(() => { if (!clockReady) { clockReady = true; ensure(); } }, 5000);
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') syncClock(); }); // after sleep
  const now = () => (anchor ? anchor.server + (performance.now() - anchor.perf) : Date.now()) + shift; // shift: tests only

  // make sure every period has a board for its current key; a key may only move forward (rolling the clock back changes nothing)
  function ensure(quiet) {
    if (!clockReady) return; // no new board on an unverified clock
    let changed = false;
    for (const p of Object.keys(PERIODS)) {
      const k = PERIOD_KEY[p](now()), b = S.boards[p], max = S.maxKey[p] || '';
      if (b && k <= b.key) continue; if (k < max) continue;
      const fresh = draw(p, k, feasible); const had = !!b; S.boards[p] = { key: k, quests: fresh }; S.maxKey[p] = k; changed = true;
      if (had && !quiet && G.started()) G.toast(`📜 새로운 ${PERIODS[p].name}가 도착했어요!`, 3);
    }
    if (changed) { dirty = true; saveT = 0; hud(); uiDirty = true; }
  }
  const feasible = (t) => t.kind !== 'collect' || G.remaining(t.minRarity) >= t.target;
  const boards = () => Object.values(S.boards);
  const active = () => boards().flatMap((b) => b.quests);

  // ── progress ──
  function bump(kind, amount, match) {
    ensure();
    for (const q of active()) {
      if (q.kind !== kind || q.done || (match && !match(q))) continue;
      q.progress = Math.min(q.target, q.progress + amount); dirty = true; uiDirty = true;
      if (q.progress >= q.target) { q.done = true; saveT = 0; G.toast(`✅ 퀘스트 완료: ${q.name} — 📜 퀘스트(Q)에서 보상을 받으세요`, 3.2); hud(); }
    }
  }
  // events reported by the other systems
  function onPlace(campus, place) {
    if (!G.started() || !place) { lastPlace = null; return; }
    const id = campus + '|' + place; if (id === lastPlace) return; lastPlace = id;
    bump('visit', 1, (q) => q.campus === campus && q.place === place);
    for (const q of active()) if (q.kind === 'visitAny' && !q.done && !q.seen.includes(id)) { q.seen.push(id); bump('visitAny', 1, (x) => x === q); }
  }
  function event(name, data) {
    if (name === 'pat') bump('pat', 1);
    else if (name === 'collect') bump('collect', 1, (q) => !q.minRarity || (RANKS[data && data.rarity] || 0) >= (RANKS[q.minRarity] || 0));
  }
  function update(dt) {
    if (!G.started() || !G.worldReady() || document.visibilityState !== 'visible') { lastMetres = null; return; }
    ensure();
    const m = G.metres(); if (lastMetres != null) { const d = m - lastMetres; if (d > 0 && d < 20) { bump('distance', d); if (G.petsWalking() > 0) bump('petWalk', d); } } lastMetres = m; // < 20: skip jumps (account switch)
    bump('play', Math.min(dt, 0.5));
    if (dirty && (saveT -= dt) <= 0) { saveT = store.local ? 3 : 20; dirty = false; store.save(S).catch(() => { dirty = true; }); }
    if ((uiT -= dt) <= 0) { uiT = 0.25; if (open) { if (uiDirty) render(); else tick(); } uiDirty = false; }
  }
  addEventListener('pagehide', () => { if (dirty) store.save(S).catch(() => {}); });
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden' && dirty) { dirty = false; store.save(S).catch(() => { dirty = true; }); } });

  // ── rewards: the player claims; ledger + flag first, coins after (guest) or together in one write (account) ──
  let claiming = false;
  async function claim(qid) {
    ensure(true);
    const q = active().find((x) => x.id === qid);
    if (!q || !q.done || q.claimed || S.ledger.includes(q.id) || claiming) return false; // never twice
    claiming = true; q.claimed = true; S.ledger = [...S.ledger, q.id].slice(-LEDGER_MAX); dirty = false;
    try {
      if (store.local) { await store.saveClaim(S); G.payCoins(q.reward); }
      else { const w = G.payCoins(q.reward); await store.saveClaim(S, w).catch(() => { dirty = true; G.toast('⚠️ 서버에 저장하지 못했어요 — 잠시 뒤 다시 저장할게요', 2.4); }); }
    } finally { claiming = false; }
    G.coinPop(); G.toast(`🪙 +${q.reward} 코인! "${q.name}" 보상을 받았어요`, 2.6);
    const b = S.boards[q.period]; if (b && b.quests.every((x) => x.claimed)) setTimeout(() => G.toast(`🎉 ${PERIODS[q.period].name}를 모두 완료했어요! 내일 또 만나요`, 3.4), 1600);
    hud(); render(); return true;
  }

  // ── HUD + panel ──
  function hud() {
    const b = S.boards.daily, el = $('#questCount'), btn = $('#questBtn'); if (!el) return;
    if (!b) { el.textContent = '–'; return; }
    el.textContent = `${b.quests.filter((q) => q.claimed).length}/${b.quests.length}`;
    btn.classList.toggle('ready', b.quests.some((q) => q.done && !q.claimed));
  }
  function tick() { // countdown only
    const el = $('#questReset'); if (!el) return; const ms = Math.max(0, nextReset(now()) - now()), h = Math.floor(ms / 3600e3), m = Math.floor((ms % 3600e3) / 60e3), s = Math.floor((ms % 60e3) / 1000);
    el.textContent = `새 퀘스트까지 ${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}` + (clockOk ? '' : ' (기기 시계 기준)');
  }
  function render() {
    ensure(true); const b = S.boards.daily, list = $('#questList'); list.replaceChildren(); if (!b) return;
    const [y, mo, d] = b.key.split('-').map(Number); $('#questDate').textContent = `${mo}월 ${d}일 · ${PERIODS.daily.renew} 갱신`; tick();
    const all = b.quests.length && b.quests.every((q) => q.claimed); $('#questAll').classList.toggle('hidden', !all);
    for (const q of b.quests) {
      const li = document.createElement('li'), T = TYPES[q.type] || { icon: '❔', name: q.type }; li.className = 'quest' + (q.claimed ? ' claimed' : q.done ? ' done' : '');
      const head = document.createElement('div'); head.className = 'qHead';
      const ic = document.createElement('span'); ic.className = 'qIcon'; ic.textContent = T.icon; ic.title = T.name;
      const nm = document.createElement('b'); nm.textContent = q.name;
      const rw = document.createElement('span'); rw.className = 'qReward'; rw.textContent = `🪙 ${q.reward}`;
      head.append(ic, nm, rw);
      const ds = document.createElement('p'); ds.textContent = q.desc;
      const bar = document.createElement('div'); bar.className = 'qTrack'; const fill = document.createElement('div'); fill.className = 'qFill'; fill.style.width = `${Math.min(100, (q.progress / q.target) * 100)}%`; bar.append(fill);
      const row = document.createElement('div'); row.className = 'qRow';
      const pr = document.createElement('small'); pr.textContent = q.kind === 'visit' ? (q.done ? '도착 완료' : `📍 ${q.place}`) : `${fmtVal(q, q.progress)} / ${fmtVal(q, q.target)}`;
      const btn = document.createElement('button'); btn.type = 'button';
      if (q.claimed) { btn.textContent = '✅ 수령 완료'; btn.disabled = true; btn.className = 'got'; }
      else if (q.done) { btn.textContent = `보상 받기 🪙 ${q.reward}`; btn.className = 'claim'; btn.addEventListener('click', () => { btn.disabled = true; claim(q.id); }); }
      else { btn.textContent = '진행 중'; btn.disabled = true; }
      row.append(pr, btn); li.append(head, ds, bar, row); list.append(li);
    }
  }
  function show(on) {
    if (on && (!G.started() || G.menuOpen())) return;
    open = on; $('#questPanel').classList.toggle('hidden', !on);
    if (on) { G.releaseKeys(); if (document.pointerLockElement) document.exitPointerLock(); render(); } else if (!G.touch) G.lockPointer();
  }
  $('#questBtn').addEventListener('click', () => show(!open));
  $('#questClose').addEventListener('click', () => show(false));
  addEventListener('keydown', (e) => {
    if (e.target instanceof HTMLInputElement || !G.started() || G.menuOpen() || G.typing()) return;
    if (e.code === 'KeyQ' && !e.repeat) show(!open); else if (e.code === 'Escape' && open) show(false);
  });
  hud();

  // switch to the account's board (a new account starts with this browser's guest board), or back to this browser's
  async function useAccount(api) {
    if (dirty) { dirty = false; await store.save(S).catch(() => {}); }
    if (!api) { store = localStore; S = localStore.load() || empty(); ensure(true); hud(); if (open) render(); return; }
    let remote = null; try { remote = await cloudStore(api).load(); } catch (_) { G.toast('⚠️ 계정의 퀘스트를 불러오지 못했어요 — 이번에는 이 기기에 저장할게요', 3); return; } // never overwrite the account on a failed read
    store = cloudStore(api);
    if (remote) S = remote; else { dirty = true; saveT = 0; } // nothing on the account yet: carry the guest board over
    ensure(true); hud(); if (open) render();
  }

  return {
    flush: () => { if (dirty) { dirty = false; store.save(S).catch(() => { dirty = true; }); } },
    update, onPlace, event, claim, useAccount, show, open: () => open, state: () => S,
    debug: { setShift: (ms) => { shift = ms; ensure(); }, shift: () => shift, clockOk: () => clockOk, now, dayKey, syncClock },
  };
}
