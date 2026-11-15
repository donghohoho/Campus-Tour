// Wild pets + bond (data in wild-pets-data.js).
//   • wild animals live at fixed spots on a campus and wander a little; pet them (E) to fill a taming gauge (per-species
//     gain / success chance / cooldown). Full gauge → the animal joins your pets through pets.js adopt() — one per kind,
//     after which that spawn stays empty for you. Ownership in the wallet is the source of truth, so nothing is ever doubled.
//   • bond (0–100, stages 낯섦 → 단짝) for pets you own, separate from XP: petting your own pet (stand still next to it, E),
//     walking together, new places, and one-off milestones; cooldown + daily cap per pet. Petting also gives a little XP via
//     pet-growth.js grant(), with its own daily cap (pet-growth never counts pats, so nothing is paid twice).
//   • saved apart from wallet and XP: localStorage 'fm:petBond' (guests) or users/{uid}.petBond (accounts, read-merge-write)
import * as THREE from 'three';
import { createPet } from './pets.js';
import { SPECIES, SPAWNS, RESPAWN_SEC, BOND, stageOf } from './wild-pets-data.js';

const KEY = 'fm:petBond', SEEN_MAX = 300, NEAR = 2.6, BAR_R = 7;
const $ = (s) => document.querySelector(s);
const dayKey = (ms) => new Date(ms + 9 * 3600e3).toISOString().slice(0, 10);

// ── saved state ──
const empty = () => ({ v: 1, pets: {}, tame: {}, seen: [], day: { key: '', places: [] } });
const normPet = (p) => ({ ...(p || {}), bond: Math.min(BOND.max, Math.max(0, +(p && p.bond) || 0)), lastPat: +(p && p.lastPat) || 0, day: p && p.day && typeof p.day.key === 'string' ? { key: p.day.key, got: +p.day.got || 0, xp: +p.day.xp || 0 } : { key: '', got: 0, xp: 0 } });
function norm(s) {
  if (!s || typeof s !== 'object') return null; const out = empty();
  for (const [id, p] of Object.entries(s.pets || {})) if (typeof id === 'string' && id.length < 40) out.pets[id] = normPet(p);
  for (const [sp, t] of Object.entries(s.tame || {})) if (SPECIES[sp] && t) out.tame[sp] = { gauge: Math.min(100, Math.max(0, +t.gauge || 0)), state: t.state === 'tamed' ? 'tamed' : 'wild', petId: t.petId || null, t: +t.t || 0 };
  out.seen = Array.isArray(s.seen) ? s.seen.map(String).slice(-SEEN_MAX) : [];
  if (s.day && typeof s.day.key === 'string') out.day = { key: s.day.key, places: Array.isArray(s.day.places) ? s.day.places.map(String).slice(0, 200) : [] };
  return out;
}
// this device's copy + the account document: per pet keep the higher bond, a tamed record beats a wild one, union the ledgers
export function mergeBond(a, b) {
  a = norm(a) || empty(); b = norm(b) || empty(); const out = empty();
  for (const id of new Set([...Object.keys(a.pets), ...Object.keys(b.pets)])) { const x = a.pets[id], y = b.pets[id]; out.pets[id] = !x ? y : !y ? x : y.bond > x.bond || (y.bond === x.bond && y.lastPat > x.lastPat) ? y : x; }
  for (const sp of new Set([...Object.keys(a.tame), ...Object.keys(b.tame)])) { const x = a.tame[sp], y = b.tame[sp]; out.tame[sp] = !x ? y : !y ? x : x.state !== y.state ? (x.state === 'tamed' ? x : y) : y.gauge > x.gauge ? y : x; }
  out.seen = [...new Set([...a.seen, ...b.seen])].slice(-SEEN_MAX);
  out.day = a.day.key === b.day.key ? { key: a.day.key, places: [...new Set([...a.day.places, ...b.day.places])] } : a.day.key > b.day.key ? a.day : b.day;
  return out;
}
const localStore = { local: true, load: () => { try { return norm(JSON.parse(localStorage.getItem(KEY) || 'null')); } catch (_) { return null; } }, save: async (s) => { try { localStorage.setItem(KEY, JSON.stringify(s)); } catch (_) {} return null; } };
const cloudStore = (api) => {
  const uid = api.uid(); // bound to the account it was opened for: a save that finishes after a switch never lands in another account
  return { local: false, load: async () => norm(await api.loadPetBond()),
    save: async (s) => { if (api.uid() !== uid) return null; const merged = mergeBond(await api.loadPetBond(), s); if (api.uid() !== uid) return null; await api.savePetBond(merged); return merged; } };
};

const glow = (rgb) => { const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d'), gr = g.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, `rgba(${rgb},1)`); gr.addColorStop(0.35, `rgba(${rgb},0.55)`); gr.addColorStop(1, `rgba(${rgb},0)`); g.fillStyle = gr; g.fillRect(0, 0, 64, 64); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; };
const heartTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d'); g.fillStyle = '#ff5c8a'; g.font = '54px serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('♥', 32, 36); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; })();
const goldTex = glow('255,214,90'), greyTex = glow('210,220,235');

export function initWildPets(G) {
  // G: { scene, toast, player, terrainH, walkable(x,z), solidAt(x,y,z), started(), worldReady(), touch,
  //      pets: { adopt, ownsType, owned, activeIds, rootOf, metres }, growth: { grant(id, n, src), selected() } }
  let S = localStore.load() || empty(), store = localStore, dirty = false, saveT = 0, saving = false;
  let campusId = null, wild = [], stillT = 0, lastMetres = null, uiT = 0, respawnT = 0;
  const gone = new Map(); // spot key → time it gets a new animal (this session)
  const fx = [], walkAcc = new Map(), chips = new Map();
  const now = () => Date.now();

  // ── wild animals in the world ──
  function spawnAll() { clearWild(); if (!campusId || !G.worldReady()) return; (SPAWNS[campusId] || []).forEach((_, i) => spawnOne(i)); }
  function spawnOne(i) {
    const sp = (SPAWNS[campusId] || [])[i], key = `${campusId}:${i}`; if (!sp || (gone.get(key) || 0) > now() || wild.some((w) => w.key === key)) return;
    const pool = (sp.pool || [sp.species]).map((e) => (Array.isArray(e) ? e : [e, 1])).filter(([k, wt]) => SPECIES[k] && wt > 0); if (!pool.length) return;
    let r = Math.random() * pool.reduce((a, [, wt]) => a + wt, 0), id = pool[0][0]; for (const [k, wt] of pool) { r -= wt; if (r <= 0) { id = k; break; } } // weighted: signature animals win at their spots
    const def = SPECIES[id];
    const pet = createPet(def.type, `야생 ${def.name}`, G.terrainH, 0, 1); G.scene.add(pet.root);
    const w = { key, sp: id, def, home: sp.pos, roam: sp.roam || 6, x: sp.pos[0], z: sp.pos[1], tx: sp.pos[0], tz: sp.pos[1], timer: Math.random() * 3, yaw: 0, cd: 0, msg: '', msgT: 0, pet };
    wild.push(w); drive(w, 0, Math.random() * 6.283, false); // placed at its spot right away (far ones aren't animated)
  }
  const tameable = (w) => !G.pets.ownsType(w.def.type); // one per kind: once you have one, the rest are just friends to pet
  function clearWild() { for (const w of wild) w.pet.dispose(); wild = []; }
  function setCampus(id) { campusId = id; spawnAll(); }
  function clear() { clearWild(); campusId = null; showBar(null); }
  const tameRec = (sp) => (S.tame[sp] || (S.tame[sp] = { gauge: 0, state: 'wild', petId: null, t: 0 }));
  // pets.js pets trail a leader point by a fixed slot offset; aim the leader so the animal itself lands on (x, z)
  function drive(w, dt, yaw, moving) {
    const bk = 1.3, sd = 0.7, lx = w.x + Math.sin(yaw) * bk - Math.cos(yaw) * sd, lz = w.z + Math.cos(yaw) * bk + Math.sin(yaw) * sd;
    w.pet.update(dt, lx, G.terrainH(w.x, w.z), lz, yaw, moving);
  }
  function nearestWild(p) {
    let best = null, bd = NEAR; for (const w of wild) { const r = w.pet.root.position, d = Math.hypot(p.x - r.x, p.z - r.z); if (d < bd && Math.abs(p.y - r.y) < 2.5) { bd = d; best = w; } } return best;
  }
  function burst(tex, pos, n, up = 2.2, size = 0.3) { for (let i = 0; i < n; i++) { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, blending: tex === heartTex ? THREE.NormalBlending : THREE.AdditiveBlending })), a = (i / n) * 6.283; s.position.set(pos.x + Math.cos(a) * 0.3, pos.y + 0.6, pos.z + Math.sin(a) * 0.3); s.scale.setScalar(size); G.scene.add(s); fx.push({ s, vx: Math.cos(a) * 0.8, vy: up + (i % 3) * 0.4, vz: Math.sin(a) * 0.8, life: 1, max: 1 }); } }
  // a number rising over the animal: "+25" on a pat that lands, "실패" on a miss
  function floatText(text, color, pos) {
    const c = document.createElement('canvas'); c.width = 192; c.height = 80; const g = c.getContext('2d');
    g.font = '800 54px "Pretendard","Apple SD Gothic Neo","Malgun Gothic",system-ui,sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.lineWidth = 9; g.strokeStyle = 'rgba(255,255,255,0.95)'; g.strokeText(text, 96, 42); g.fillStyle = color; g.fillText(text, 96, 42);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, transparent: true, depthTest: false })); s.renderOrder = 22; s.scale.set(0.96, 0.4, 1); s.position.set(pos.x, pos.y + 1.1, pos.z); G.scene.add(s);
    fx.push({ s, vx: 0, vy: 1.4, vz: 0, life: 1.2, max: 1.2, float: true });
  }
  function patWild(w) {
    if (!w || w.cd > 0) return false;
    w.cd = w.def.cooldown; if (G.onPat) G.onPat(); // daily quest "쓰다듬기"
    if (!tameable(w)) { burst(heartTex, w.pet.root.position, 4, 1.6, 0.35); floatText('♥', '#ff5c8a', w.pet.root.position); w.msg = '좋아해요 ♥'; w.msgT = 1.6; return true; }
    const r = tameRec(w.sp);
    if (Math.random() < w.def.success) { r.gauge = Math.min(100, r.gauge + w.def.gain); dirty = true; burst(heartTex, w.pet.root.position, 4, 1.6, 0.35); floatText(`+${w.def.gain}`, '#ff5c8a', w.pet.root.position); w.msg = '기분 좋아해요 ♥'; }
    else { floatText('실패', '#8a96a8', w.pet.root.position); w.msg = '깜짝 놀라 물러났어요'; const p = G.player.pos, d = Math.hypot(w.x - p.x, w.z - p.z) || 1, nx = w.x + ((w.x - p.x) / d) * 1.5, nz = w.z + ((w.z - p.z) / d) * 1.5; if (G.walkable(nx, nz)) { w.x = nx; w.z = nz; } }
    w.msgT = 1.6;
    if (r.gauge >= 100) tame(w);
    return true;
  }
  function tame(w) {
    const r = tameRec(w.sp), id = G.pets.adopt(w.def.type, w.def.name);
    if (!id) { r.state = 'tamed'; dirty = true; G.toast(`${w.def.name}은(는) 이미 함께하는 친구예요`, 2.4); }
    else { r.state = 'tamed'; r.petId = id; r.t = now(); rec(id).bond = Math.max(rec(id).bond, BOND.tamedStart); dirty = true; saveT = 0; popTamed(w.def); }
    const pos = w.pet.root.position.clone(); burst(goldTex, pos, 22, 2.6, 0.32); burst(heartTex, pos, 8, 1.8, 0.4);
    w.pet.dispose(); wild = wild.filter((x) => x !== w); gone.set(w.key, now() + RESPAWN_SEC * 1000); showBar(null); persist(); // this spot gets a new animal later
  }
  function popTamed(def) {
    const el = $('#tamePop'); el.replaceChildren();
    const ic = document.createElement('span'); ic.className = 'tpIcon'; ic.textContent = '🐾'; const t = document.createElement('small'); t.textContent = '길들이기 성공!';
    const b = document.createElement('b'); b.textContent = def.name; const p = document.createElement('span'); p.className = 'tpNote'; p.textContent = '이제 함께 다녀요 · 펫(K)에서 이름을 지어 줄 수 있어요';
    el.append(ic, t, b, p); el.classList.remove('hidden', 'show'); void el.offsetWidth; el.classList.add('show'); clearTimeout(popTamed.t); popTamed.t = setTimeout(() => el.classList.remove('show'), 3600);
    G.toast(`🎉 ${def.name}을(를) 길들였어요!`, 3);
  }
  const promptWild = (w) => (!tameable(w) ? `<kbd>E</kbd> 쓰다듬기 · ${w.def.name} 💕` : w.cd > 0 ? `<kbd>E</kbd> 쓰다듬기 · ${w.def.name} <small>(${w.cd.toFixed(1)}초)</small>` : `<kbd>E</kbd> 쓰다듬기 · 야생 ${w.def.name} 길들이기`);
  function showBar(w) {
    const el = $('#tameBar'); if (!w) { el.classList.add('hidden'); return; }
    const r = tameRec(w.sp); el.classList.remove('hidden'); el.classList.toggle('friend', !tameable(w));
    if (!tameable(w)) { $('#tameName').textContent = `🐾 ${w.def.name}`; $('#tamePct').textContent = ''; $('#tameStats').textContent = '이미 함께하는 종류예요 — 쓰다듬기만 할 수 있어요'; $('#tameMsg').textContent = w.msgT > 0 ? w.msg : ''; return; }
    const need = Math.ceil(100 / w.def.gain), done = Math.min(need, Math.round(r.gauge / w.def.gain));
    $('#tameName').textContent = `🐾 야생 ${w.def.name}`; $('#tamePct').textContent = `${Math.floor(r.gauge)} / 100`; $('#tameFill').style.width = `${r.gauge}%`;
    $('#tameStats').textContent = `쓰다듬기 성공 ${done} / ${need}번 · 1회 +${w.def.gain} · 성공률 ${Math.round(w.def.success * 100)}% · 쿨다운 ${w.def.cooldown}초`;
    $('#tameMsg').textContent = w.msgT > 0 ? w.msg : w.cd > 0 ? `잠시 기다려요… ${w.cd.toFixed(1)}초` : w.def.note;
  }

  // ── bond ──
  const rec = (id) => (S.pets[id] || (S.pets[id] = normPet(null))); // no record = 0, 낯섦
  function addBond(id, n, src) {
    const r = rec(id), k = dayKey(now()); if (r.day.key !== k) r.day = { key: k, got: 0, xp: 0 };
    const add = Math.min(n, BOND.dailyCap - r.day.got, BOND.max - r.bond); if (add <= 0) return 0;
    const before = stageOf(r.bond); r.bond += add; r.day.got += add; dirty = true;
    const after = stageOf(r.bond); if (after.index > before.index) { const o = G.pets.owned().find((x) => x.id === id); G.toast(`💗 ${o ? o.name : '펫'}와(과) 더 가까워졌어요 — ${after.name}`, 2.8); saveT = 0; }
    return add;
  }
  const once = (key) => { if (S.seen.includes(key)) return false; S.seen = [...S.seen, key].slice(-SEEN_MAX); dirty = true; return true; };
  function nearOwn() {
    if (stillT < 0.5) return null; const p = G.player.pos; let best = null, bd = NEAR;
    for (const id of G.pets.activeIds()) { const r = G.pets.rootOf(id); if (!r) continue; const d = Math.hypot(p.x - r.position.x, p.z - r.position.z); if (d < bd) { bd = d; best = id; } }
    return best;
  }
  const patWait = (id) => Math.max(0, BOND.pat.cooldownSec - (now() - rec(id).lastPat) / 1000);
  function promptOwn(id) {
    const o = G.pets.owned().find((x) => x.id === id), name = o ? o.name : '펫', w = patWait(id), st = stageOf(rec(id).bond).name;
    return w > 0 ? `💗 ${name} · ${st} <small>(다시 쓰다듬기 ${Math.ceil(w)}초)</small>` : `<kbd>E</kbd> 쓰다듬기 · ${name} 💗 ${st}`;
  }
  function patOwn(id) {
    if (!id || patWait(id) > 0) return false;
    const r = rec(id), k = dayKey(now()); if (r.day.key !== k) r.day = { key: k, got: 0, xp: 0 };
    r.lastPat = now(); dirty = true; if (G.onPat) G.onPat();
    const got = addBond(id, BOND.pat.bond, '쓰다듬기'), xp = Math.min(BOND.pat.xp, BOND.patXpDailyCap - r.day.xp);
    if (xp > 0) { r.day.xp += xp; G.growth.grant(id, xp, '쓰다듬기'); }
    const root = G.pets.rootOf(id); if (root) burst(heartTex, root.position, 5, 1.6, 0.35);
    if (!got) G.toast('오늘은 충분히 친해졌어요 — 내일 또 쓰다듬어 주세요', 2.2);
    paint(); return true;
  }
  // events (each counted once)
  function onPlace(campus, place) {
    if (!G.started() || !place) return; const k = dayKey(now()); if (S.day.key !== k) S.day = { key: k, places: [] };
    const id = campus + '|' + place; if (S.day.places.includes(id)) return; S.day.places.push(id); dirty = true;
    for (const pid of G.pets.activeIds()) addBond(pid, BOND.newPlace, '새 장소');
  }
  const bonusAll = (key, n, src) => { if (!once(key)) return; for (const pid of G.pets.activeIds()) addBond(pid, n, src); };
  const onCollect = (it) => it && bonusAll('c:' + it.id, BOND.bonus.collect, '함께 수집');
  const onQuestDone = (q) => q && bonusAll('q:' + q.id, BOND.bonus.questDone, '함께 퀘스트');
  const onLevelUp = (id, lv) => { if (once(`l:${id}:${lv}`)) addBond(id, BOND.bonus.levelUp, '레벨 업'); };

  // ── per frame ──
  function update(dt) {
    for (let i = fx.length - 1; i >= 0; i--) { const f = fx[i]; f.life -= dt; if (f.life <= 0) { G.scene.remove(f.s); if (f.float) f.s.material.map.dispose(); f.s.material.dispose(); fx.splice(i, 1); continue; } if (!f.float) f.vy -= 2.5 * dt; f.s.position.x += f.vx * dt; f.s.position.y += f.vy * dt; f.s.position.z += f.vz * dt; f.s.material.opacity = f.life / f.max; }
    if ((respawnT -= dt) <= 0) { respawnT = 1; for (const [k, t] of gone) if (t <= now()) { gone.delete(k); const [c, i] = k.split(':'); if (c === campusId) spawnOne(+i); } }
    const p = G.player.pos; let barW = null, barD = BAR_R;
    for (const w of wild) {
      w.cd = Math.max(0, w.cd - dt); w.msgT -= dt;
      const d = Math.hypot(p.x - w.x, p.z - w.z);
      if (d < 4) { w.yaw = Math.atan2(p.x - w.x, p.z - w.z); drive(w, dt, w.yaw, false); } // someone close: stop and look at them
      else if (d < 150) {
        if ((w.timer -= dt) <= 0) { const a = Math.random() * 6.283, r = Math.random() * w.roam; w.tx = w.home[0] + Math.cos(a) * r; w.tz = w.home[1] + Math.sin(a) * r; w.timer = 3 + Math.random() * 4; }
        const dx = w.tx - w.x, dz = w.tz - w.z, dd = Math.hypot(dx, dz), moving = dd > 0.3;
        if (moving) { const nx = w.x + (dx / dd) * 0.9 * dt, nz = w.z + (dz / dd) * 0.9 * dt; if (G.walkable(nx, nz) && !G.solidAt(nx, G.terrainH(nx, nz) + 0.5, nz)) { w.x = nx; w.z = nz; } else w.timer = 0; }
        if (moving) w.yaw = Math.atan2(dx, dz); drive(w, dt, w.yaw, moving);
      }
      if (d < barD) { barD = d; barW = w; }
    }
    showBar(G.started() ? barW : null);
    if (!G.started() || !G.worldReady() || document.visibilityState !== 'visible') { lastMetres = null; stillT = 0; return; }
    stillT = G.player.speed < 0.3 && G.player.grounded ? stillT + dt : 0;
    const m = G.pets.metres(); if (lastMetres != null) { const d = m - lastMetres; if (d > 0 && d < 20) for (const id of G.pets.activeIds()) { const a = (walkAcc.get(id) || 0) + d; walkAcc.set(id, a % BOND.walk.metres); for (let k = Math.floor(a / BOND.walk.metres); k > 0; k--) addBond(id, BOND.walk.bond, '함께 걷기'); } } lastMetres = m;
    if (dirty && !saving && (saveT -= dt) <= 0) persist();
    if ((uiT -= dt) <= 0) { uiT = 0.5; paint(); }
  }
  async function persist() {
    saveT = store.local ? 3 : 20; dirty = false; saving = true;
    try { const merged = await store.save(S); if (merged) for (const [id, r] of Object.entries(merged.pets)) if (!S.pets[id] || r.bond > S.pets[id].bond) S.pets[id] = r; }
    catch (_) { dirty = true; } finally { saving = false; }
  }
  addEventListener('pagehide', () => { if (dirty) store.save(S).catch(() => {}); });
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden' && dirty && !saving) persist(); });

  // ── pet panel: bond chip on each row + bond card for the pet selected in the growth card ──
  function decorate(li, o) { const c = document.createElement('span'); c.className = 'bdChip'; li.insertBefore(c, li.querySelector('.pgMini')); chips.set(o.id, c); paintChip(o.id); }
  function paintChip(id) { const c = chips.get(id); if (!c) return; if (!c.isConnected) { chips.delete(id); return; } const st = stageOf(rec(id).bond); c.textContent = `💗 ${st.name}`; c.dataset.s = st.index; }
  function paint() {
    for (const id of [...chips.keys()]) paintChip(id);
    const el = $('#petBond'); if (!el || $('#petShop').classList.contains('hidden')) return;
    const id = G.growth.selected(), o = G.pets.owned().find((x) => x.id === id);
    if (!o) { el.className = 'pgCard empty'; el.textContent = '펫을 누르면 친밀도를 볼 수 있어요'; return; }
    const r = rec(id), st = stageOf(r.bond), next = BOND.stages[st.index + 1], k = dayKey(now()), today = r.day.key === k ? r.day.got : 0, w = patWait(id);
    el.className = 'pgCard bond'; el.dataset.s = st.index; el.replaceChildren();
    const head = document.createElement('div'); head.className = 'pgHead'; const nm = document.createElement('b'); nm.textContent = `💗 ${st.name}`; const v = document.createElement('span'); v.className = 'pgBig'; v.textContent = `${Math.floor(r.bond)} / ${BOND.max}`; head.append(nm, v);
    const track = document.createElement('div'); track.className = 'pgTrack bdTrack'; const fill = document.createElement('div'); fill.className = 'pgFill bdFill'; fill.style.width = `${(r.bond / BOND.max) * 100}%`; track.append(fill);
    const p1 = document.createElement('p'); p1.textContent = next ? `'${next[1]}'까지 ${Math.ceil(next[0] - r.bond)} · 오늘 +${today} / ${BOND.dailyCap}` : `최고 단계예요 · 오늘 +${today} / ${BOND.dailyCap}`;
    const p2 = document.createElement('p'); p2.className = 'pgNote'; p2.textContent = (w > 0 ? `쓰다듬기는 ${Math.ceil(w)}초 뒤에 다시` : '함께 다니다 멈춰 서서 E로 쓰다듬을 수 있어요') + ' · 함께 걷고 탐험해도 친해져요';
    el.append(head, track, p1, p2);
  }

  // account switch: same policy as wallet / XP (new account starts with this browser's copy; never write over a failed read)
  async function useAccount(api) {
    if (dirty) await store.save(S).catch(() => {}); dirty = false;
    if (!api) { store = localStore; S = localStore.load() || empty(); spawnAll(); paint(); return; }
    let remote = null; try { remote = await cloudStore(api).load(); } catch (_) { G.toast('⚠️ 계정의 친밀도 기록을 불러오지 못했어요 — 이번에는 이 기기에 저장할게요', 3); return; }
    store = cloudStore(api);
    if (remote) S = remote; else { dirty = true; saveT = 0; }
    spawnAll(); paint(); // the wallet may have changed → which wild animals are still wild for this player
  }

  return {
    setCampus, clear, nearestWild, patWild, promptWild, nearOwn, patOwn, promptOwn, update, onPlace, onCollect, onQuestDone, onLevelUp, decorate, useAccount,
    flush: () => { if (dirty && !saving) persist(); }, state: () => S, respawnNow: () => { for (const k of gone.keys()) gone.set(k, 0); respawnT = 0; }, bondOf: (id) => ({ ...rec(id), stage: stageOf(rec(id).bond).name }), wild: () => wild,
  };
}
