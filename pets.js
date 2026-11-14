// Coins + pets.
//   • every 10 minutes of play (game started, tab visible) → +10 coins; walking around fills the bar faster (pedometer)
//   • spend coins in the pet shop (K or the 🐾 button); own several pets, pick one to walk with you, give each a name
//   • the pet you walk with follows you and is shown to other players (multiplayer.js sends {t: type, n: name})
// Saved per device in localStorage (no server).
//
// PETS: add a 3D model with `model: 'assets/pets/<file>.glb'` (+ `h` = height in metres). Without a model a placeholder creature is drawn.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { clone as cloneSkinned } from 'three/addons/utils/SkeletonUtils.js';

export const PETS = [
  { id: 'p1', name: '분홍 말랑이', price: 30, color: 0xffb7c9 },
  { id: 'p2', name: '하늘 말랑이', price: 50, color: 0xa9d6ff },
  { id: 'p3', name: '노랑 말랑이', price: 80, color: 0xffe27a },
  { id: 'p4', name: '민트 말랑이', price: 110, color: 0xa8ecc8 },
  { id: 'p5', name: '보라 말랑이', price: 150, color: 0xcdb6ff },
];
const EARN_EVERY = 600, EARN_AMOUNT = 10, NAME_MAX = 10, KEY = 'fm:wallet';
// pedometer: walking also fills the 10-minute bar — every metre on foot is worth WALK_BONUS extra seconds
// (walking ≈ 3× faster than standing still, running ≈ 5×). A step is STEP_LEN metres.
const WALK_BONUS = 0.5, STEP_LEN = 0.75;
const $ = (s) => document.querySelector(s);
const clean = (s, n) => String(s == null ? '' : s).replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, n);
const petDef = (id) => PETS.find((p) => p.id === id);

// ── pet models: GLB if given, else a round placeholder creature ──
const loader = new GLTFLoader(), glbCache = new Map();
function loadGlb(url) {
  if (!glbCache.has(url)) glbCache.set(url, new Promise((res) => loader.load(url, (g) => res(g), undefined, () => res(null))));
  return glbCache.get(url);
}
const bodyG = new THREE.SphereGeometry(0.32, 14, 10), earG = new THREE.ConeGeometry(0.09, 0.26, 6), eyeG = new THREE.SphereGeometry(0.04, 6, 4), eyeM = new THREE.MeshBasicMaterial({ color: 0x1b1b1b });
function placeholder(def) {
  const g = new THREE.Group(), mat = new THREE.MeshLambertMaterial({ color: def.color || 0xffffff, emissive: def.color || 0xffffff, emissiveIntensity: 0.18 });
  const b = new THREE.Mesh(bodyG, mat); b.scale.set(1, 0.88, 1.08); b.position.y = 0.29; b.castShadow = true; g.add(b);
  for (const s of [-1, 1]) {
    const e = new THREE.Mesh(earG, mat); e.position.set(0.14 * s, 0.6, -0.02); e.rotation.z = -0.25 * s; g.add(e);
    const eye = new THREE.Mesh(eyeG, eyeM); eye.position.set(0.11 * s, 0.36, 0.27); g.add(eye);
  }
  return g;
}
// A pet object that walks after a target: { root, update(dt, x, y, z, yaw, moving), setName(n), dispose() }
export function createPet(type, name, terrainH) {
  const def = petDef(type) || PETS[0], root = new THREE.Group(), body = new THREE.Group(); root.add(body);
  let model = placeholder(def), mixer = null, action = null; body.add(model);
  if (def.model) loadGlb(def.model).then((g) => {
    if (!g || !root.parent) return;
    const m = cloneSkinned(g.scene); const box = new THREE.Box3().setFromObject(m), h = box.max.y - box.min.y || 1, s = (def.h || 0.6) / h;
    m.scale.setScalar(s); m.position.y = -box.min.y * s; m.traverse((o) => { if (o.isMesh) { o.castShadow = true; if (o.isSkinnedMesh) o.frustumCulled = false; } });
    body.remove(model); model = m; body.add(m);
    if (g.animations.length) { mixer = new THREE.AnimationMixer(m); action = mixer.clipAction(g.animations[0]); action.play(); }
  });
  let plate = null;
  function setName(n) {
    if (plate) { root.remove(plate); plate.material.map.dispose(); plate.material.dispose(); plate = null; } if (!n) return;
    const c = document.createElement('canvas'), x = c.getContext('2d'), F = '700 24px "Pretendard","Apple SD Gothic Neo","Malgun Gothic",system-ui,sans-serif'; x.font = F;
    const w = Math.ceil(x.measureText('🐾 ' + n).width + 20); c.width = w; c.height = 36; x.font = F;
    x.fillStyle = 'rgba(60,40,70,0.6)'; x.beginPath(); x.roundRect(0, 0, w, 36, 12); x.fill(); x.fillStyle = '#fff4fb'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('🐾 ' + n, w / 2, 19);
    const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
    plate = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false, fog: false })); plate.renderOrder = 19; plate.center.set(0.5, 0);
    plate.scale.set(w * 0.0075, 36 * 0.0075, 1); plate.position.y = (def.h || 0.7) + 0.2; root.add(plate);
  }
  setName(name);
  let placed = false, hopT = 0; const pos = new THREE.Vector3();
  function update(dt, x, y, z, yaw, moving) {
    // aim for a spot behind and to the left of the owner
    const tx = x - Math.sin(yaw) * 1.3 + Math.cos(yaw) * 0.7, tz = z - Math.cos(yaw) * 1.3 - Math.sin(yaw) * 0.7;
    if (!placed || Math.hypot(tx - pos.x, tz - pos.z) > 25) { pos.set(tx, y, tz); placed = true; }
    const dx = tx - pos.x, dz = tz - pos.z, d = Math.hypot(dx, dz), k = 1 - Math.exp(-(d > 0.35 ? 4.5 : 1.5) * dt);
    pos.x += dx * k; pos.z += dz * k; const gy = terrainH(pos.x, pos.z); pos.y += ((Math.abs(y - gy) < 1.5 ? gy : y) - pos.y) * (1 - Math.exp(-10 * dt));
    const walking = d > 0.35 || moving; hopT += dt * (walking ? 9 : 2.2);
    root.position.set(pos.x, pos.y + (walking && !action ? Math.abs(Math.sin(hopT)) * 0.12 : 0), pos.z);
    const want = d > 0.2 ? Math.atan2(dx, dz) : yaw; let a = (want - body.rotation.y) % (Math.PI * 2); if (a > Math.PI) a -= Math.PI * 2; if (a < -Math.PI) a += Math.PI * 2; body.rotation.y += a * (1 - Math.exp(-8 * dt));
    if (!action) model.scale.y = 1 + Math.sin(hopT * 0.5) * (walking ? 0 : 0.03);
    if (mixer) { action.timeScale = walking ? 1 : 0.4; mixer.update(dt); }
  }
  function dispose() { setName(''); if (root.parent) root.parent.remove(root); }
  return { root, update, setName, dispose, type: def.id };
}

export function initPets(G) {
  // G: { scene, player, terrainH(x,z), toast(msg,s), started(), menuOpen(), worldReady(), touch, releaseKeys(), lockPointer() }
  let W = { coins: 0, prog: 0, owned: [], active: null, steps: 0 };
  try { const s = JSON.parse(localStorage.getItem(KEY) || 'null'); if (s && typeof s === 'object') W = { coins: Math.max(0, s.coins | 0), prog: Math.max(0, +s.prog || 0), owned: Array.isArray(s.owned) ? s.owned.filter((o) => o && petDef(o.type)).map((o) => ({ id: String(o.id), type: o.type, name: clean(o.name, NAME_MAX) || petDef(o.type).name })) : [], active: s.active || null, steps: Math.max(0, +s.steps || 0) }; } catch (_) {}
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(W)); } catch (_) {} };
  let saveT = 0, pet = null, open = false, last = null;

  // ── HUD ──
  const coinEl = $('#count'), nextEl = $('#coinNext'), stepEl = $('#steps'), panel = $('#petShop');
  const fmt = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
  function hud() { coinEl.textContent = `${W.coins}`; nextEl.textContent = `+${EARN_AMOUNT}까지 ${fmt(Math.max(0, EARN_EVERY - W.prog))}`; stepEl.textContent = `👣 ${Math.floor(W.steps).toLocaleString('ko-KR')}보`; }
  hud();

  // ── the pet walking with me ──
  function spawnActive() {
    if (pet) { pet.dispose(); pet = null; }
    const o = W.owned.find((x) => x.id === W.active); if (!o) { W.active = null; return; }
    pet = createPet(o.type, o.name, G.terrainH); G.scene.add(pet.root);
  }
  spawnActive();

  // ── shop / my pets panel ──
  function render() {
    $('#petCoins').textContent = `🪙 ${W.coins}`;
    const shop = $('#petList'); shop.replaceChildren();
    for (const d of PETS) {
      const li = document.createElement('li'), sw = document.createElement('span'), nm = document.createElement('b'), pr = document.createElement('span'), btn = document.createElement('button');
      sw.className = 'petSwatch'; sw.style.background = '#' + (d.color || 0xffffff).toString(16).padStart(6, '0'); nm.textContent = d.name; pr.className = 'petPrice'; pr.textContent = `🪙 ${d.price}`;
      const have = W.owned.filter((o) => o.type === d.id).length; btn.type = 'button'; btn.textContent = W.coins >= d.price ? '사기' : `${d.price - W.coins} 부족`; btn.disabled = W.coins < d.price;
      btn.addEventListener('click', () => buy(d)); li.append(sw, nm, pr, btn); if (have) { const h = document.createElement('small'); h.textContent = `보유 ${have}`; li.append(h); } shop.append(li);
    }
    const mine = $('#petMine'); mine.replaceChildren();
    if (!W.owned.length) { const li = document.createElement('li'); li.className = 'empty'; li.textContent = '아직 펫이 없어요. 10분마다 코인 10개가 쌓여요!'; mine.append(li); }
    for (const o of W.owned) {
      const d = petDef(o.type), li = document.createElement('li'), sw = document.createElement('span'), nm = document.createElement('input'), go = document.createElement('button');
      sw.className = 'petSwatch'; sw.style.background = '#' + (d.color || 0xffffff).toString(16).padStart(6, '0');
      nm.type = 'text'; nm.maxLength = NAME_MAX; nm.value = o.name; nm.setAttribute('aria-label', '펫 이름'); nm.spellcheck = false;
      nm.addEventListener('keydown', (e) => { e.stopPropagation(); if (e.key === 'Enter') nm.blur(); }); nm.addEventListener('keyup', (e) => e.stopPropagation());
      nm.addEventListener('change', () => { o.name = clean(nm.value, NAME_MAX) || d.name; nm.value = o.name; save(); if (W.active === o.id && pet) pet.setName(o.name); });
      const on = W.active === o.id; go.type = 'button'; go.className = on ? 'on' : ''; go.textContent = on ? '같이 다니는 중' : '데리고 다니기';
      go.addEventListener('click', () => { W.active = on ? null : o.id; save(); spawnActive(); render(); G.toast(on ? `${o.name}을(를) 쉬게 했어요` : `${o.name}와(과) 함께 걸어요 🐾`, 1.8); });
      li.append(sw, nm, go); mine.append(li);
    }
  }
  function buy(d) {
    if (W.coins < d.price) return;
    W.coins -= d.price; const o = { id: Math.random().toString(36).slice(2, 10), type: d.id, name: d.name };
    W.owned.push(o); W.active = o.id; save(); spawnActive(); hud(); render(); G.toast(`${d.name}을(를) 데려왔어요! 이름을 지어 주세요 🐾`, 2.6);
    const inputs = $('#petMine').querySelectorAll('input'); const last = inputs[inputs.length - 1]; if (last) { last.focus(); last.select(); }
  }
  function show(on) {
    if (on && (!G.started() || G.menuOpen())) return;
    open = on; panel.classList.toggle('hidden', !on);
    if (on) { G.releaseKeys(); if (document.pointerLockElement) document.exitPointerLock(); render(); } else if (!G.touch) G.lockPointer();
  }
  $('#petBtn').addEventListener('click', () => show(!open));
  $('#petClose').addEventListener('click', () => show(false));
  window.addEventListener('keydown', (e) => {
    if (e.target instanceof HTMLInputElement || !G.started() || G.menuOpen()) return;
    if (e.code === 'KeyK' && !e.repeat) show(!open); else if (e.code === 'Escape' && open) show(false);
  });

  // ── per frame ──
  function update(dt) {
    if (G.started() && G.worldReady() && document.visibilityState === 'visible') {
      W.prog += Math.min(dt, 0.5);
      // pedometer: ground distance since last frame (ignore jumps across the map — respawn, campus change)
      const p = G.player, d = last ? Math.hypot(p.pos.x - last.x, p.pos.z - last.z) : 0;
      if (d > 0.01 && d < 3 && p.grounded !== false) {
        const before = Math.floor(W.steps / 1000); W.steps += d / STEP_LEN; W.prog += d * WALK_BONUS;
        if (Math.floor(W.steps / 1000) > before) G.toast(`👣 ${(Math.floor(W.steps / 1000) * 1000).toLocaleString('ko-KR')}보 달성! 걸을수록 코인이 빨리 모여요`, 2.4);
      }
      last = { x: p.pos.x, z: p.pos.z };
      while (W.prog >= EARN_EVERY) { W.prog -= EARN_EVERY; W.coins += EARN_AMOUNT; save(); G.toast(`🪙 10분 접속 보상! 코인 +${EARN_AMOUNT} (보유 ${W.coins})`, 3); if (open) render(); }
      if ((saveT -= dt) <= 0) { saveT = 5; save(); }
    } else last = null;
    if ((update.h = (update.h || 0) - dt) <= 0) { update.h = 0.5; hud(); }
    if (pet) { const p = G.player; pet.update(dt, p.pos.x, p.pos.y, p.pos.z, p.yaw, p.speed > 0.5); }
  }
  addEventListener('pagehide', save);
  function current() { const o = W.owned.find((x) => x.id === W.active); return o ? { t: o.type, n: o.name } : null; }
  return { update, current, open: () => open, worldChanged: () => { if (pet) pet.update(0, G.player.pos.x, G.player.pos.y, G.player.pos.z, G.player.yaw, false); } };
}
