// Collectibles — hidden items placed around a campus, picked up with E, recorded in a collection book (I / 📖).
//   • data (what, where, how rare) lives in collectibles-data.js; this file is only the system
//   • each item can be picked up once per player; found items are not drawn in the world any more
//   • saved per device in localStorage for guests, on the account (Firestore users/{uid}.collection) when logged in —
//     both go through the small `store` interface below, so the backing store can change without touching the rest
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { ITEMS, RARITY, RARITY_ORDER } from './collectibles-data.js';

const KEY = 'fm:collection', PICK_R = 2.4, SHOW_R = 170;
const $ = (s) => document.querySelector(s);
const byId = new Map(Object.values(ITEMS).flat().map((it) => [it.id, it]));
const campusOf = new Map(Object.entries(ITEMS).flatMap(([c, list]) => list.map((it) => [it.id, c])));

// ── saved state: { v: 1, got: { [itemId]: { t: time found (ms), c: campus id } } } ──
const empty = () => ({ v: 1, got: {} });
function norm(s) {
  const out = empty(); if (!s || typeof s !== 'object' || !s.got || typeof s.got !== 'object') return null;
  for (const [id, g] of Object.entries(s.got)) if (typeof id === 'string' && id.length < 64) out.got[id] = { t: Math.max(0, +(g && g.t) || 0), c: String((g && g.c) || campusOf.get(id) || '') };
  return out;
}
const localStore = {
  load: async () => { try { return norm(JSON.parse(localStorage.getItem(KEY) || 'null')); } catch (_) { return null; } },
  save: async (s) => { try { localStorage.setItem(KEY, JSON.stringify(s)); } catch (_) {} },
};
const cloudStore = (api) => ({ load: async () => norm(await api.loadCollection()), save: (s) => api.saveCollection(s) });

// ── looks: one crystal per rarity (shared geometry + material), glow, optional light beam ──
const glowTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d'), gr = g.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.3, 'rgba(255,255,255,0.45)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 64); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; })();
const LOOK = {};
for (const k of RARITY_ORDER) {
  const R = RARITY[k], col = new THREE.Color(R.color);
  const geo = k === 'common' ? new THREE.OctahedronGeometry(1, 0) : k === 'rare' ? new THREE.OctahedronGeometry(1, 0).scale(0.8, 1.25, 0.8) : k === 'epic' ? new THREE.IcosahedronGeometry(1, 0) : new THREE.OctahedronGeometry(1, 0).scale(0.75, 1.45, 0.75);
  LOOK[k] = {
    geo, mat: new THREE.MeshLambertMaterial({ color: col, emissive: col, emissiveIntensity: k === 'common' ? 0.45 : 0.7, flatShading: true }),
    glow: new THREE.SpriteMaterial({ map: glowTex, color: col, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: k === 'common' ? 0.55 : 0.8 }),
    ring: new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.45, depthWrite: false, side: THREE.DoubleSide }),
    beam: R.beam ? new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.22, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide }) : null,
  };
}
const ringGeo = new THREE.RingGeometry(0.55, 0.75, 28).rotateX(-Math.PI / 2), haloGeo = new THREE.TorusGeometry(1.15, 0.06, 6, 28), beamGeos = new Map();
const beamGeo = (h) => { if (!beamGeos.has(h)) beamGeos.set(h, new THREE.CylinderGeometry(0.06, 0.32, h, 10, 1, true).translate(0, h / 2, 0)); return beamGeos.get(h); };
const loader = new GLTFLoader(), glbCache = new Map();
const loadGlb = (url) => { if (!glbCache.has(url)) glbCache.set(url, new Promise((res) => loader.load(url, (g) => res(g), undefined, () => res(null)))); return glbCache.get(url); };
const isImg = (icon) => /\.(png|jpe?g|webp|gif|svg)$/i.test(icon || '');

export function initCollection(G) {
  // G: { scene, player, toast, groundY(x,z), worldReady(), campusName(id), started(), menuOpen(), typing(), touch, releaseKeys(), lockPointer() }
  let S = empty(), store = localStore, pending = false, campusId = null, open = false;
  const root = new THREE.Group(); G.scene.add(root);
  let live = []; // items of the current campus still lying in the world: { it, g, gem, y, ph, take }
  const fx = [];
  localStore.load().then((s) => { if (s && store === localStore) { S = s; refresh(); } });

  const has = (id) => !!S.got[id];
  const list = (c) => ITEMS[c] || [];
  const countIn = (items) => items.filter((it) => has(it.id)).length;
  function persist() { pending = true; return store.save(S).then(() => { pending = false; }, () => { G.toast('⚠️ 도감을 저장하지 못했어요 — 다음에 다시 시도할게요', 2.4); }); }
  addEventListener('pagehide', () => { if (pending) store.save(S).catch(() => {}); });

  // ── world objects ──
  function build(it) {
    const [wx, wz] = G.toWorld ? G.toWorld(it.pos[0], it.pos[1]) : it.pos; // data is in the map file's frame
    const R = RARITY[it.rarity] || RARITY.common, L = LOOK[it.rarity] || LOOK.common, g = new THREE.Group(), y = G.groundY(wx, wz);
    g.position.set(wx, y, wz);
    const gem = new THREE.Group(); gem.position.y = 1.05; g.add(gem);
    const crystal = new THREE.Mesh(L.geo, L.mat); crystal.scale.setScalar(R.size); crystal.castShadow = true; gem.add(crystal);
    if (it.rarity === 'epic' || it.rarity === 'legendary') { const h = new THREE.Mesh(haloGeo, L.ring); h.scale.setScalar(R.size); h.rotation.x = Math.PI / 2.4; gem.add(h); }
    if (it.model) loadGlb(it.model).then((m) => { if (!m || !g.parent) return; const o = m.scene.clone(true), box = new THREE.Box3().setFromObject(o), hh = box.max.y - box.min.y || 1, s = (it.scale || 0.8) / hh; o.scale.setScalar(s); o.position.y = -((box.min.y + box.max.y) / 2) * s; gem.remove(crystal); gem.add(o); });
    const glow = new THREE.Sprite(L.glow); glow.scale.setScalar(R.size * 4.2); gem.add(glow);
    const ring = new THREE.Mesh(ringGeo, L.ring); ring.position.y = 0.04; g.add(ring);
    if (L.beam) { const b = new THREE.Mesh(beamGeo(R.beam), L.beam); b.position.y = 0.1; g.add(b); }
    const sp = [];
    if (R.sparkle) for (let i = 0; i < 5; i++) { const s = new THREE.Sprite(L.glow); s.scale.setScalar(0.22); gem.add(s); sp.push(s); }
    root.add(g);
    return { it, g, gem, sp, y, ph: Math.random() * 6.283, take: 0 };
  }
  function removeAll() { for (const l of live) root.remove(l.g); live = []; for (const f of fx) { root.remove(f.sp); f.sp.material.dispose(); } fx.length = 0; }
  function clear() { removeAll(); campusId = null; } // campus unloaded (client.js unloadWorld)
  function refresh() { removeAll(); if (campusId && G.worldReady()) for (const it of list(campusId)) if (!has(it.id)) live.push(build(it)); hud(); if (open) render(); }
  function setCampus(id) { campusId = id; refresh(); }

  // ── nearest pick-up for the E prompt (client.js decides between this and petting an animal) ──
  function nearest(p) {
    let best = null, bd = PICK_R;
    for (const l of live) { if (l.take) continue; const d = Math.hypot(p.x - l.g.position.x, p.z - l.g.position.z); if (d < bd && Math.abs(p.y - l.y) < 2.5) { bd = d; best = l; } }
    return best;
  }
  function burst(l) {
    const col = new THREE.Color((RARITY[l.it.rarity] || RARITY.common).color), n = l.it.rarity === 'legendary' ? 26 : l.it.rarity === 'epic' ? 18 : 12, o = l.g.position;
    for (let i = 0; i < n; i++) {
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: col, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })), a = Math.random() * 6.283, up = 1.5 + Math.random() * 3;
      s.position.set(o.x, o.y + 1.05, o.z); s.scale.setScalar(0.35); root.add(s); fx.push({ sp: s, vx: Math.cos(a) * 2.2, vy: up, vz: Math.sin(a) * 2.2, life: 0.9, max: 0.9 });
    }
  }
  function collect(l) {
    if (!l || l.take || has(l.it.id)) return false; // already found — never twice
    S.got[l.it.id] = { t: Date.now(), c: campusId }; persist();
    l.take = 0.001; for (const o of l.g.children) if (o !== l.gem) o.visible = false; // ground ring + beam go at once, the gem flies up
    burst(l); pop(l.it); hud(); if (open) render();
    if (G.onCollect) G.onCollect(l.it); // quests.js listens
    return true;
  }

  // ── "you found …" card ──
  let popT = null;
  function iconEl(icon, cls) { const e = document.createElement('span'); e.className = cls; if (isImg(icon)) { const im = document.createElement('img'); im.src = icon; im.alt = ''; e.append(im); } else e.textContent = icon || '✨'; return e; }
  function pop(it) {
    const el = $('#collectPop'), R = RARITY[it.rarity], items = list(campusId);
    el.replaceChildren(); el.style.setProperty('--rc', R.css); el.dataset.r = it.rarity;
    const tag = document.createElement('small'); tag.textContent = `${R.name} 수집품 발견!`;
    const nm = document.createElement('b'); nm.textContent = it.name;
    const pr = document.createElement('span'); pr.className = 'cpProg'; pr.textContent = `📖 도감에 등록했어요 · ${countIn(items)}/${items.length}`;
    el.append(iconEl(it.icon, 'cpIcon'), tag, nm, pr);
    el.classList.remove('hidden', 'show'); void el.offsetWidth; el.classList.add('show');
    clearTimeout(popT); popT = setTimeout(() => el.classList.remove('show'), it.rarity === 'legendary' ? 4200 : 3000);
    if (countIn(items) === items.length) setTimeout(() => G.toast('🎉 이 캠퍼스의 수집품을 모두 모았어요!', 3.6), 1800);
  }

  // ── per frame: spin, bob, hide far ones, pick-up animation, sparks ──
  function update(dt, t) {
    const p = G.player.pos;
    for (let i = live.length - 1; i >= 0; i--) {
      const l = live[i], R = RARITY[l.it.rarity] || RARITY.common, d = Math.hypot(p.x - l.g.position.x, p.z - l.g.position.z);
      l.g.visible = d < SHOW_R; if (!l.g.visible) continue;
      if (l.take) { // fly up, swell, vanish
        l.take += dt; const k = l.take / 0.6; l.gem.position.y = 1.05 + k * 1.6; l.gem.rotation.y += dt * 14; l.gem.scale.setScalar(k < 0.4 ? 1 + k : Math.max(0.01, 1.4 * (1 - (k - 0.4) / 0.6)));
        if (k >= 1) { root.remove(l.g); live.splice(i, 1); } continue;
      }
      l.gem.rotation.y += dt * R.spin; l.gem.position.y = 1.05 + Math.sin(t * 2 + l.ph) * 0.12;
      l.sp.forEach((s, k) => { const a = t * 1.4 + (k / l.sp.length) * 6.283; s.position.set(Math.cos(a) * 0.9, Math.sin(t * 3 + k) * 0.35, Math.sin(a) * 0.9); });
    }
    for (let i = fx.length - 1; i >= 0; i--) { const f = fx[i]; f.life -= dt; if (f.life <= 0) { root.remove(f.sp); f.sp.material.dispose(); fx.splice(i, 1); continue; } f.vy -= 5 * dt; f.sp.position.x += f.vx * dt; f.sp.position.y += f.vy * dt; f.sp.position.z += f.vz * dt; f.sp.material.opacity = f.life / f.max; }
  }

  // ── HUD counter + collection book ──
  function hud() { const items = list(campusId).length ? list(campusId) : Object.values(ITEMS).flat(); $('#collCount').textContent = `${countIn(items)}/${items.length}`; }
  let fR = 'all', fS = 'all', sel = null, bookCampus = null;
  let tab = 'items';
  for (const b of document.querySelectorAll('#bookTabs button')) b.addEventListener('click', () => { tab = b.dataset.t; render(); });
  function render() {
    for (const b of document.querySelectorAll('#bookTabs button')) { const on = b.dataset.t === tab; b.classList.toggle('on', on); b.setAttribute('aria-selected', String(on)); }
    $('#collView').classList.toggle('hidden', tab !== 'items'); $('#petDex').classList.toggle('hidden', tab !== 'pets');
    if (tab === 'pets') { if (G.petDex) G.petDex($('#petDex')); return; } // wild-pets.js draws the pet book
    const camps = Object.keys(ITEMS); if (!bookCampus || !ITEMS[bookCampus]) bookCampus = ITEMS[campusId] ? campusId : camps[0];
    const items = list(bookCampus), got = countIn(items), all = Object.values(ITEMS).flat();
    const sub = $('#collSub'); sub.textContent = (G.campusName ? G.campusName(bookCampus) : bookCampus) + (bookCampus !== campusId ? ' · 지금 있는 캠퍼스에는 아직 수집품이 없어요' : '');
    $('#collProg').textContent = `${got} / ${items.length}` + (camps.length > 1 ? ` · 전체 ${countIn(all)} / ${all.length}` : '');
    $('#collBar').style.width = items.length ? `${(got / items.length) * 100}%` : '0';
    // filters: rarity (with found/total per tier) + found / not found
    const fr = $('#collRarity'); fr.replaceChildren();
    for (const k of ['all', ...RARITY_ORDER]) {
      const tier = k === 'all' ? items : items.filter((it) => it.rarity === k), b = document.createElement('button');
      b.type = 'button'; b.className = 'chip' + (fR === k ? ' on' : ''); b.setAttribute('aria-pressed', String(fR === k));
      if (k !== 'all') b.style.setProperty('--rc', RARITY[k].css);
      b.textContent = (k === 'all' ? '전체' : RARITY[k].name) + ` ${countIn(tier)}/${tier.length}`;
      b.addEventListener('click', () => { fR = k; render(); }); fr.append(b);
    }
    const fs = $('#collState'); fs.replaceChildren();
    for (const [k, n] of [['all', '모두'], ['got', '획득'], ['miss', '미획득']]) { const b = document.createElement('button'); b.type = 'button'; b.className = 'chip' + (fS === k ? ' on' : ''); b.setAttribute('aria-pressed', String(fS === k)); b.textContent = n; b.addEventListener('click', () => { fS = k; render(); }); fs.append(b); }
    // the grid
    const gridEl = $('#collGrid'); gridEl.replaceChildren();
    const shown = items.filter((it) => (fR === 'all' || it.rarity === fR) && (fS === 'all' || (fS === 'got') === has(it.id)));
    for (const it of shown) {
      const own = has(it.id), b = document.createElement('button'); b.type = 'button'; b.className = 'collCard' + (own ? '' : ' locked') + (sel === it.id ? ' sel' : '');
      b.style.setProperty('--rc', RARITY[it.rarity].css); b.title = own ? it.name : `${RARITY[it.rarity].name} · ???`;
      b.append(iconEl(it.icon, 'ccIcon')); if (!own) { const q = document.createElement('i'); q.textContent = '?'; b.append(q); }
      const nm = document.createElement('span'); nm.className = 'ccName'; nm.textContent = own ? it.name : '???'; b.append(nm);
      b.addEventListener('click', () => { sel = it.id; render(); }); gridEl.append(b);
    }
    if (!shown.length) { const e = document.createElement('p'); e.className = 'collEmpty'; e.textContent = fS === 'got' ? '아직 이 조건의 수집품을 찾지 못했어요' : '모두 찾았어요! 🎉'; gridEl.append(e); }
    // detail
    const det = $('#collDetail'), it = byId.get(sel); det.replaceChildren();
    if (!it || !items.includes(it)) { det.className = 'collDetail empty'; det.textContent = '수집품을 누르면 자세히 볼 수 있어요'; return; }
    const own = has(it.id), R = RARITY[it.rarity]; det.className = 'collDetail' + (own ? '' : ' locked'); det.style.setProperty('--rc', R.css);
    const head = document.createElement('div'); head.className = 'cdHead';
    const tx = document.createElement('div'), badge = document.createElement('small'), nm = document.createElement('b');
    badge.className = 'rBadge'; badge.textContent = R.name; nm.textContent = own ? it.name : '???'; tx.append(badge, nm); head.append(iconEl(it.icon, 'cdIcon'), tx);
    const p1 = document.createElement('p'); p1.textContent = own ? it.desc : `힌트: ${it.hint || '캠퍼스 어딘가'}`;
    const p2 = document.createElement('p'); p2.className = 'cdMeta';
    p2.textContent = own ? `📍 ${it.place || ''} · ${new Date(S.got[it.id].t).toLocaleDateString('ko-KR')} 획득` : '아직 찾지 못했어요 — 캠퍼스를 돌아다녀 보세요';
    det.append(head, p1, p2);
  }
  function show(on) {
    if (on && (!G.started() || G.menuOpen())) return;
    open = on; $('#collPanel').classList.toggle('hidden', !on);
    if (on) { G.releaseKeys(); if (document.pointerLockElement) document.exitPointerLock(); bookCampus = null; render(); } else if (!G.touch) G.lockPointer();
  }
  $('#collBtn').addEventListener('click', () => show(!open));
  $('#collClose').addEventListener('click', () => show(false));
  addEventListener('keydown', (e) => {
    if (e.target instanceof HTMLInputElement || !G.started() || G.menuOpen() || G.typing()) return;
    if (e.code === 'KeyI' && !e.repeat) show(!open); else if (e.code === 'Escape' && open) show(false);
  });
  hud();

  // switch to the logged-in account's book (a new account starts with this browser's guest finds), or back to this browser's
  async function useAccount(api) {
    if (!api) { store = localStore; S = (await localStore.load()) || empty(); refresh(); return; }
    let remote = null; try { remote = await cloudStore(api).load(); } catch (_) { G.toast('⚠️ 계정의 도감을 불러오지 못했어요 — 이번에는 이 기기에 저장할게요', 3); return; } // never overwrite the account with guest data on a failed read
    store = cloudStore(api);
    if (remote) S = remote; else persist(); // nothing on the account yet: carry the guest finds over
    refresh();
  }

  // items still to find anywhere (optionally only of minRarity or rarer) — quests.js won't hand out a collect quest that can't be done
  const remaining = (minRarity) => { const k = RARITY_ORDER.indexOf(minRarity || 'common'); return Object.values(ITEMS).flat().filter((it) => !has(it.id) && RARITY_ORDER.indexOf(it.rarity) >= k).length; };
  return { refresh: () => { if (open) render(); }, remaining, setCampus, clear, nearest, collect, update, useAccount, has, open: () => open, show, live: () => live, state: () => S, rarityOf: (l) => RARITY[l.it.rarity] };
}
