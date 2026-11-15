// Pet growth — levels and XP for the pets you own (balance lives in pet-growth-data.js).
//   • XP goes only to the pets walking with you: time together (not while AFK), walking, new places, collectibles, finished daily quests
//   • every source is de-duplicated (collectible / quest ids in a ledger, places once a day) and time + walking are capped per hour
//   • stored next to the wallet, not inside it: localStorage 'fm:petGrowth' for guests, users/{uid}.petGrowth for accounts.
//     Account saves read the document first and keep the further-grown copy of each pet, so two devices don't undo each other.
//   • one record per pet id: { lv, xp, total, last } — room for later fields (bond, skills, stage, look, genes …) without a migration
import * as THREE from 'three';
import { GROWTH, xpToNext } from './pet-growth-data.js';

const KEY = 'fm:petGrowth', SEEN_MAX = 300;
const $ = (s) => document.querySelector(s);
const dayKey = (ms) => new Date(ms + 9 * 3600e3).toISOString().slice(0, 10); // Korea date
const fmt = (n) => Math.floor(n).toLocaleString('ko-KR');

// ── saved state ──
const empty = () => ({ v: 1, pets: {}, seen: [], day: { key: '', places: [] }, hour: { key: 0, got: 0 } });
const normPet = (p) => { const lv = Math.min(GROWTH.maxLevel, Math.max(1, (p && p.lv) | 0 || 1)); return { ...(p || {}), lv, xp: lv >= GROWTH.maxLevel ? 0 : Math.max(0, +(p && p.xp) || 0), total: Math.max(0, +(p && p.total) || 0) }; };
function norm(s) {
  if (!s || typeof s !== 'object') return null; const out = empty();
  for (const [id, p] of Object.entries(s.pets || {})) if (typeof id === 'string' && id.length < 40) out.pets[id] = normPet(p);
  out.seen = Array.isArray(s.seen) ? s.seen.map(String).slice(-SEEN_MAX) : [];
  if (s.day && typeof s.day.key === 'string') out.day = { key: s.day.key, places: Array.isArray(s.day.places) ? s.day.places.map(String).slice(0, 200) : [] };
  if (s.hour) out.hour = { key: +s.hour.key || 0, got: Math.max(0, +s.hour.got || 0) };
  return out;
}
// two copies of the same save (this device + the account document): keep the further-grown copy of each pet, union the ledgers
export function mergeGrowth(a, b) {
  a = norm(a) || empty(); b = norm(b) || empty(); const out = empty();
  for (const id of new Set([...Object.keys(a.pets), ...Object.keys(b.pets)])) { const x = a.pets[id], y = b.pets[id]; out.pets[id] = !x ? y : !y ? x : y.total >= x.total ? y : x; }
  out.seen = [...new Set([...a.seen, ...b.seen])].slice(-SEEN_MAX);
  out.day = a.day.key === b.day.key ? { key: a.day.key, places: [...new Set([...a.day.places, ...b.day.places])] } : a.day.key > b.day.key ? a.day : b.day;
  out.hour = a.hour.key === b.hour.key ? { key: a.hour.key, got: Math.max(a.hour.got, b.hour.got) } : a.hour.key > b.hour.key ? a.hour : b.hour;
  return out;
}
const localStore = {
  local: true,
  load: () => { try { return norm(JSON.parse(localStorage.getItem(KEY) || 'null')); } catch (_) { return null; } },
  save: async (s) => { try { localStorage.setItem(KEY, JSON.stringify(s)); } catch (_) {} return s; },
};
const cloudStore = (api) => {
  const uid = api.uid && api.uid(); // a save that finishes after an account switch must not land in the other account
  return { local: false, load: async () => norm(await api.loadPetGrowth()),
    save: async (s) => { if (api.uid && api.uid() !== uid) return null; const merged = mergeGrowth(await api.loadPetGrowth(), s); if (api.uid && api.uid() !== uid) return null; await api.savePetGrowth(merged); return merged; } }; // read → merge → write
};

// level-up sparkle
const sparkTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d'), gr = g.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(255,250,210,1)'); gr.addColorStop(0.35, 'rgba(255,214,90,0.6)'); gr.addColorStop(1, 'rgba(255,200,60,0)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 64); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; })();

export function initPetGrowth(G) {
  // G: { scene, toast, started(), worldReady(), metres(), activeIds(), owned() → [{id,type,name}], rootOf(id), now() }
  let S = localStore.load() || empty(), store = localStore, dirty = false, saveT = 0, saving = false;
  let lastMetres = null, mAcc = 0, tAcc = 0, lastActive = performance.now(), uiT = 0, sel = null;
  const fx = [], rows = new Map();

  const rec = (id) => (S.pets[id] || (S.pets[id] = { lv: 1, xp: 0, total: 0 })); // no record yet = level 1, 0 XP
  const nameOf = (id) => (G.owned().find((o) => o.id === id) || { name: '펫' }).name;
  const seen = (key) => { if (S.seen.includes(key)) return true; S.seen = [...S.seen, key].slice(-SEEN_MAX); dirty = true; return false; };

  // ── XP ──
  function addXp(id, amount, src) {
    const r = rec(id); if (r.lv >= GROWTH.maxLevel || amount <= 0) return 0;
    const add = amount * GROWTH.testMult; r.xp += add; r.total += add; r.last = { src, amt: add, t: Date.now() }; dirty = true;
    let up = 0; while (r.lv < GROWTH.maxLevel && r.xp >= xpToNext(r.lv)) { r.xp -= xpToNext(r.lv); r.lv++; up++; }
    if (r.lv >= GROWTH.maxLevel) r.xp = 0;
    if (up) { levelUp(id, r); if (G.onLevelUp) G.onLevelUp(id, r.lv); } // wild-pets.js bond bonus
    return add;
  }
  // give XP to every pet walking with you; capped sources share an hourly budget
  function give(amount, src, capped) {
    const ids = G.activeIds(); if (!ids.length || amount <= 0) return;
    if (capped) { const h = Math.floor(G.now() / 3600e3); if (S.hour.key !== h) S.hour = { key: h, got: 0 }; amount = Math.min(amount, GROWTH.hourCap - S.hour.got); if (amount <= 0) return; S.hour.got += amount; }
    for (const id of ids) addXp(id, amount, src);
    paint();
  }
  function levelUp(id, r) {
    const max = r.lv >= GROWTH.maxLevel;
    G.toast(max ? `👑 ${nameOf(id)} 최대 레벨 ${r.lv} 달성!` : `🎉 ${nameOf(id)} 레벨 업! Lv.${r.lv}`, 3); saveT = 0;
    const root = G.rootOf(id); if (root) { const p = root.position; for (let i = 0; i < (max ? 28 : 16); i++) { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: sparkTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })), a = (i / 16) * 6.283; s.position.set(p.x + Math.cos(a) * 0.5, p.y + 0.3, p.z + Math.sin(a) * 0.5); s.scale.setScalar(0.3); G.scene.add(s); fx.push({ s, vx: Math.cos(a) * 0.9, vy: 2.2 + (i % 3) * 0.5, vz: Math.sin(a) * 0.9, life: 1.1, max: 1.1 }); } }
    const row = rows.get(id); if (row) { row.li.classList.remove('pgFlash'); void row.li.offsetWidth; row.li.classList.add('pgFlash'); }
  }

  // ── events from the game ──
  function onPlace(campus, place) {
    if (!G.started() || !place) return; const k = dayKey(G.now()); if (S.day.key !== k) S.day = { key: k, places: [] };
    const id = campus + '|' + place; if (S.day.places.includes(id)) return; S.day.places.push(id); dirty = true; give(GROWTH.xp.newPlace, '새 장소 발견');
  }
  function onCollect(it) { if (it && !seen('c:' + it.id)) give(GROWTH.xp.collect[it.rarity] || GROWTH.xp.collect.common, '수집품 획득'); }
  function onQuestDone(q) { if (q && !seen('q:' + q.id)) give(GROWTH.xp.questDone, '퀘스트 완료'); }
  const poke = () => { lastActive = performance.now(); };
  for (const ev of ['keydown', 'pointerdown', 'wheel', 'touchstart']) addEventListener(ev, poke, { passive: true });

  function update(dt) {
    for (let i = fx.length - 1; i >= 0; i--) { const f = fx[i]; f.life -= dt; if (f.life <= 0) { G.scene.remove(f.s); f.s.material.dispose(); fx.splice(i, 1); continue; } f.s.position.x += f.vx * dt; f.s.position.y += f.vy * dt; f.s.position.z += f.vz * dt; f.s.material.opacity = f.life / f.max; }
    if (!G.started() || !G.worldReady() || document.visibilityState !== 'visible') { lastMetres = null; return; }
    const m = G.metres(); if (lastMetres != null) { const d = m - lastMetres; if (d > 0 && d < 20) { mAcc += d; poke(); } } lastMetres = m; // < 20: account switch / teleport
    while (mAcc >= 10) { mAcc -= 10; give(GROWTH.xp.per10m, '함께 걷기', true); }
    if (performance.now() - lastActive < GROWTH.afkSec * 1000) { tAcc += Math.min(dt, 0.5); while (tAcc >= 10) { tAcc -= 10; give(GROWTH.xp.playPer10s, '함께 놀기', true); } } // AFK: nothing
    if (dirty && !saving && (saveT -= dt) <= 0) persist();
    if ((uiT -= dt) <= 0) { uiT = 0.5; paint(); }
  }
  async function persist() {
    saveT = store.local ? 3 : 20; dirty = false; saving = true;
    try { const merged = await store.save(S); if (!store.local && merged) for (const [id, p] of Object.entries(merged.pets)) if (!S.pets[id] || p.total > S.pets[id].total) S.pets[id] = p; } // another device got further → take it
    catch (_) { dirty = true; } finally { saving = false; }
  }
  addEventListener('pagehide', () => { if (dirty) store.save(S).catch(() => {}); });
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden' && dirty && !saving) persist(); });

  // ── UI: level badge + mini bar on each "내 펫" row (pets.js calls decorate), detail card for the selected pet ──
  function decorate(li, o) {
    const r = rec(o.id), badge = document.createElement('span'), track = document.createElement('div'), fill = document.createElement('div');
    badge.className = 'pgLv'; track.className = 'pgMini'; fill.className = 'pgFill'; track.append(fill); li.prepend(badge); li.append(track);
    li.classList.add('pgRow'); li.classList.toggle('pgSel', sel === o.id);
    li.addEventListener('click', (e) => { if (e.target.closest('input, button')) return; sel = o.id; for (const [k, v] of rows) v.li.classList.toggle('pgSel', k === sel); paint(); });
    rows.set(o.id, { li, badge, fill }); if (!sel || !G.owned().some((x) => x.id === sel)) sel = (G.activeIds()[0] || o.id);
    paintRow(o.id, r); queueMicrotask(paint);
  }
  function paintRow(id, r) {
    const row = rows.get(id); if (!row) return; const max = r.lv >= GROWTH.maxLevel;
    row.badge.textContent = max ? 'MAX' : `Lv.${r.lv}`; row.badge.classList.toggle('max', max); row.fill.style.width = max ? '100%' : `${Math.min(100, (r.xp / xpToNext(r.lv)) * 100)}%`;
  }
  function paint() {
    for (const [id, row] of rows) { if (!row.li.isConnected) { rows.delete(id); continue; } paintRow(id, rec(id)); }
    const el = $('#petGrowth'); if (!el || !el.isConnected || $('#petShop').classList.contains('hidden')) return;
    const o = G.owned().find((x) => x.id === sel); if (!o) { el.className = 'pgCard empty'; el.textContent = '펫을 누르면 성장 정보를 볼 수 있어요'; return; }
    const r = rec(o.id), max = r.lv >= GROWTH.maxLevel, need = xpToNext(r.lv), on = G.activeIds().includes(o.id);
    el.className = 'pgCard' + (max ? ' max' : ''); el.replaceChildren();
    const head = document.createElement('div'); head.className = 'pgHead';
    const nm = document.createElement('b'); nm.textContent = o.name; const lv = document.createElement('span'); lv.className = 'pgBig'; lv.textContent = max ? `Lv.${r.lv} 👑 최대 레벨` : `Lv.${r.lv}`; head.append(nm, lv);
    const track = document.createElement('div'); track.className = 'pgTrack'; const fill = document.createElement('div'); fill.className = 'pgFill'; fill.style.width = max ? '100%' : `${Math.min(100, (r.xp / need) * 100)}%`; track.append(fill);
    const meta = document.createElement('p'); meta.textContent = max ? `누적 경험치 ${fmt(r.total)} · 더 이상 경험치를 받지 않아요` : `경험치 ${fmt(r.xp)} / ${fmt(need)} · 다음 레벨까지 ${fmt(need - r.xp)}`;
    const st = document.createElement('p'); st.className = 'pgNote'; st.textContent = (on ? '🐾 함께 다니는 중 — 경험치를 받고 있어요' : '💤 쉬는 중 — 데리고 다녀야 경험치를 받아요') + (r.last ? ` · 최근 +${fmt(r.last.amt)} (${r.last.src})` : '');
    el.append(head, track, meta, st);
  }

  // switch to the account's record (a new account starts with this browser's), or back to this browser's — same policy as the wallet
  async function useAccount(api) {
    if (dirty) await store.save(S).catch(() => {}); dirty = false;
    if (!api) { store = localStore; S = localStore.load() || empty(); paint(); return; }
    let remote = null; try { remote = await cloudStore(api).load(); } catch (_) { G.toast('⚠️ 계정의 펫 성장 기록을 불러오지 못했어요 — 이번에는 이 기기에 저장할게요', 3); return; }
    store = cloudStore(api);
    if (remote) S = remote; else { dirty = true; saveT = 0; }
    paint();
  }

  return {
    // XP from another system with its own limits (wild-pets.js: petting) — not capped here, not de-duplicated here
    grant: (id, n, src) => { const a = addXp(id, n, src); paint(); return a; }, selected: () => sel,
    update, onPlace, onCollect, onQuestDone, decorate, useAccount, state: () => S, level: (id) => ({ ...rec(id) }),
    flush: () => { if (dirty && !saving) persist(); },
    debug: { addXp: (id, n) => { const a = addXp(id, n / GROWTH.testMult, 'test'); paint(); return a; }, setActive: (t) => { lastActive = performance.now() - t; } },
  };
}
