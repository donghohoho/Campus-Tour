// Coins + pets.
//   • every minute of play (game started, tab visible) → +10 coins; walking around fills the bar faster (pedometer)
//   • spend coins in the pet shop (K or the 🐾 button); own several pets, take up to MAX_WALK of them along, give each a name
//   • the pets you walk with follow you in a little formation and are shown to other players (multiplayer.js sends [{t: type, n: name}, …])
// Saved per device in localStorage (no server).
//
// ride: seat height in metres (as drawn) — the pet can be ridden (R)
// PETS: add a 3D model with `model: 'assets/pets/<file>.glb'` (+ `h` = height in metres). Without a model a placeholder creature is drawn.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { clone as cloneSkinned } from 'three/addons/utils/SkeletonUtils.js';

export const PETS = [
  { id: 'fox', name: '여우', price: 0, starter: true, model: 'assets/pets/fox.glb', h: 0.7, color: 0xf08a3c }, // everyone gets one
  { id: 'sweetpotato', name: '고구마', price: 300, model: 'assets/pets/sweetpotato.glb', h: 0.45, color: 0xb5643c, fly: true, flyH: 0.7 }, // flyH: how high it floats (default 2 m) // shop pet — floats along after you
  // wild: tamed on campus (wild-pets.js), never sold in the shop
  { id: 'cat', name: '캠퍼스 고양이', wild: true, color: 0xd9a066, model: 'assets/pets/cat.glb', h: 0.42 },
  { id: 'rabbit', name: '산토끼', wild: true, color: 0xeee6dc, model: 'assets/pets/rabbit.glb', h: 0.42, rotY: Math.PI / 2 }, // model faces −x
  { id: 'hedgehog', name: '고슴도치', wild: true, color: 0x8a6f5a, model: 'assets/pets/hedgehog.glb', h: 0.28 },
  { id: 'raccoon', name: '너구리', wild: true, color: 0x7d7a74, model: 'assets/pets/raccoon.glb', h: 0.45 },
  { id: 'owl', name: '부엉이', wild: true, color: 0xb08a5c, model: 'assets/pets/owl.glb', h: 0.42, fly: true },
  { id: 'squirrel', name: '다람쥐', wild: true, color: 0xb5651d, model: 'assets/pets/squirrel.glb', h: 0.32, rotY: -Math.PI / 2 }, // model faces +x
  { id: 'duck', name: '오리', wild: true, color: 0xf6f3e8, model: 'assets/pets/duck.glb', h: 0.4 },
  { id: 'magpie', name: '까치', wild: true, color: 0x33384a, model: 'assets/pets/magpie.glb', h: 0.36, fly: true },
  { id: 'goat', name: '생대 염소', wild: true, color: 0xd8cfbf, model: 'assets/pets/goat.glb', h: 0.8, ride: 0.95, jump: 1.6, perk: '높이뛰기' }, // ridden: jump = jump speed ×, run = running speed ×, leap = forward boost on take-off
  { id: 'rooster', name: '생대 수탉', wild: true, color: 0xc0392b, model: 'assets/pets/rooster.glb', h: 0.5, rotY: -Math.PI / 2 }, // model faces +x
  { id: 'gorani', name: '예디대 고라니', wild: true, color: 0xa6845c, model: 'assets/pets/gorani.glb', h: 1.0, ride: 1.1, jump: 1.2, leap: 1.8, perk: '멀리뛰기' },
  { id: 'tiger', name: '고대 호랑이', wild: true, color: 0xd9822b, model: 'assets/pets/tiger.glb', h: 0.7, ride: 0.85, run: 2.6, perk: '전력질주' },
  { id: 'eagle', name: '연세 독수리', wild: true, color: 0x9aa39b, model: 'assets/pets/eagle.glb', h: 0.9, fly: true, ride: 0.8, run: 2.3, soar: { up: 9.5, fall: 4 }, perk: '빠른 비행' }, // soar: up = climb speed, fall = glide sink speed (m/s)
  { id: 'lion', name: '캠퍼스 사자', wild: true, color: 0x9a7b55, model: 'assets/pets/lion.glb', h: 0.75, ride: 0.85, run: 2.3, jump: 1.25, perk: '올라운더' },
  { id: 'hawk', name: '장산곶매', wild: true, color: 0x8a6a4a, model: 'assets/pets/eagle.glb', tint: 0xb08868, h: 0.9, fly: true, ride: 0.8, run: 2.3, soar: { up: 8.5, fall: 2.6 }, perk: '매의 비행' }, // 시립대 마스코트: the eagle model, tinted brown
  { id: 'hufs-owl', name: '외대 부엉이', wild: true, color: 0x9a7650, model: 'assets/pets/owl.glb', h: 0.9, fly: true, ride: 0.75, run: 2.2, soar: { up: 7, fall: 2 }, perk: '조용한 비행' }, // 외대 마스코트: the owl model, rideable size
  { id: 'crane', name: '서울대 학', wild: true, color: 0xdfe3e6, model: 'assets/pets/crane.glb', h: 1.0, rotY: -Math.PI / 2, fly: true, ride: 1.0, run: 2.2, soar: { up: 6.5, fall: 1.8 }, perk: '우아한 활공' }, // model faces +x
  { id: 'ginkgo', name: '은행잎', wild: true, color: 0xd9a82b, model: 'assets/pets/ginkgo.glb', rotX: Math.PI / 2, len: 1.1, h: 0.2, fly: true, flyH: 0.9, ride: 0.12, run: 2.2, soar: { up: 7, fall: 2.2 }, perk: '은행잎 비행' }, // 성균관대: the leaf laid flat like a magic carpet (rotX), sized by its length
  { id: 'albatross', name: '서강 알바트로스', wild: true, color: 0xa0522d, model: 'assets/pets/albatross.glb', h: 0.9, fly: true, ride: 0.8, run: 2.2, soar: { up: 6, fall: 1.4 }, perk: '긴 활공' },
  { id: 'dragon', name: '중앙 청룡', wild: true, color: 0x2b3550, model: 'assets/pets/dragon.glb', h: 1.0, rotY: -Math.PI / 2, fly: true, ride: 1.05, run: 2.4, soar: { up: 7, fall: 3.5 }, perk: '하늘 날기' }, // soar: hold Space in the air to fly // model faces −x
];
// 말랑이 (p1–p5) were sold in the shop and have been retired: owners get their price back in coins the next time the wallet loads
const RETIRED = { p1: 150, p2: 250, p3: 400, p4: 550, p5: 750 };

export const MAX_WALK = 1; // pets that can walk with you at once (one: picking another swaps it in)
// follow spots behind the owner: [metres back, metres to the side]
const SLOTS = [[1.3, 0.7], [1.3, -0.7], [2.4, 1.2], [2.4, -1.2], [3.2, 0]];
const EARN_EVERY = 6, EARN_AMOUNT = 1, NAME_MAX = 10, KEY = 'fm:wallet';
// pedometer: walking also fills the bar — every metre on foot is worth WALK_BONUS extra seconds
// (walking ≈ 3× faster than standing still, running ≈ 5×). A step is STEP_LEN metres.
const WALK_BONUS = 0.5, STEP_LEN = 0.75, JUMP_RATE = 7; // jumping: 7× (running is ~5×)
const $ = (s) => document.querySelector(s);
const clean = (s, n) => String(s == null ? '' : s).replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, n);
const petDef = (id) => PETS.find((p) => p.id === id);
const SIZE = 2; // every pet is drawn this much bigger than its `h` (h = real-life height; the game reads better with chunkier pets)

// ── pet models: GLB if given, else a round placeholder creature ──
const loader = new GLTFLoader(), glbCache = new Map();
function loadGlb(url) {
  if (!glbCache.has(url)) glbCache.set(url, new Promise((res) => loader.load(url, (g) => res(g), undefined, () => res(null))));
  return glbCache.get(url);
}
const blobGeo = new THREE.PlaneGeometry(1, 1), blobTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d'), gr = g.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.55, 'rgba(255,255,255,0.6)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 64); const t = new THREE.CanvasTexture(c); return t; })();
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
// owning 3 of the same pet makes that kind bigger: ×1.5 at 3, ×2 at 6 (the most)
// name tags fade out when the camera is close (your own pets walk between you and the camera)
let camRef = null; export const setPetCamera = (c) => { camRef = c; };
export const sizeFor = (count) => (count >= 6 ? 2 : count >= 3 ? 1.5 : 1);
export function createPet(type, name, terrainH, slot = 0, scale = 1) {
  const def = petDef(type) || PETS[0], root = new THREE.Group(), body = new THREE.Group(); root.add(body);
  let model = placeholder(def), mixer = null, action = null; model.scale.setScalar(SIZE); model.userData.s = SIZE; body.add(model);
  if (def.model) loadGlb(def.model).then((g) => {
    if (!g || !root.parent) return;
    const m = cloneSkinned(g.scene); if (def.rotY || def.rotX) { m.rotation.set(def.rotX || 0, def.rotY || 0, 0); m.updateMatrixWorld(true); } const box = new THREE.Box3().setFromObject(m), h = box.max.y - box.min.y || 1, s = def.len ? (def.len * SIZE) / Math.max(box.max.x - box.min.x, box.max.z - box.min.z, 1e-3) : ((def.h || 0.6) * SIZE) / h; // len: size by length (a flat leaf)
    m.scale.setScalar(s); m.userData.s = s; m.position.y = -box.min.y * s; if (def.len) { m.position.x = -(box.min.x + box.max.x) / 2 * s; m.position.z = -(box.min.z + box.max.z) / 2 * s; } // flat rides: centred under you m.traverse((o) => { if (o.isMesh) { o.castShadow = true; if (o.isSkinnedMesh) o.frustumCulled = false; if (def.tint) { o.material = o.material.clone(); o.material.color.multiply(new THREE.Color(def.tint)); } } }); // tint: same model, another colour (장산곶매)
    body.remove(model); model = m; body.add(m);
    if (g.animations.length) { const clip = g.animations[0].clone(); clip.tracks = clip.tracks.filter((t) => !t.name.startsWith('root.')); mixer = new THREE.AnimationMixer(m); action = mixer.clipAction(clip); action.play(); } // walk in place
  });
  let plate = null;
  function setName(n) {
    if (plate) { root.remove(plate); plate.material.map.dispose(); plate.material.dispose(); plate = null; } if (!n) return;
    const c = document.createElement('canvas'), x = c.getContext('2d'), F = '700 24px "Pretendard","Apple SD Gothic Neo","Malgun Gothic",system-ui,sans-serif'; x.font = F;
    const w = Math.ceil(x.measureText('🐾 ' + n).width + 20); c.width = w; c.height = 36; x.font = F;
    x.fillStyle = 'rgba(60,40,70,0.6)'; x.beginPath(); x.roundRect(0, 0, w, 36, 12); x.fill(); x.fillStyle = '#fff4fb'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('🐾 ' + n, w / 2, 19);
    const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
    plate = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false, fog: false })); plate.renderOrder = 19; plate.center.set(0.5, 0);
    plate.scale.set(w * 0.0046, 36 * 0.0046, 1); plate.position.y = (def.h || 0.7) * SIZE + 0.2; root.add(plate);
  }
  setName(name);
  // soft contact shadow under the pet (night scenes have few real shadows, so without it pets looked like they float)
  const blob = new THREE.Mesh(blobGeo, new THREE.MeshBasicMaterial({ map: blobTex, transparent: true, depthWrite: false, opacity: 0.42, color: 0x000000 })); blob.rotation.x = -Math.PI / 2; blob.position.y = 0.045; blob.renderOrder = 1; root.add(blob);
  { const r = Math.max(0.28, (def.h || 0.6) * SIZE * 0.55); blob.geometry = new THREE.PlaneGeometry(r * 2, r * 2); }
  let placed = false, hopT = 0, holdT = 0, lift = 0; const pos = new THREE.Vector3();
  // hold(s): stay put (facing the owner) for s seconds or until the owner walks off — used while being petted
  function hold(s) { holdT = s; }
  // exact: (x, z) is the spot itself (wild animals), not an owner to follow
  function update(dt, x, y, z, yaw, moving, exact) {
    if (holdT > 0 && moving) holdT = 0; holdT = Math.max(0, holdT - dt);
    // aim for a spot behind and to the left of the owner
    const [bk0, sd0] = SLOTS[slot % SLOTS.length], bk = bk0 * 1.35 * (0.6 + 0.4 * scale), sd = sd0 * 1.35 * (0.6 + 0.4 * scale); // ×1.35: room for the bigger (SIZE) pets
    if (exact === 'ride') { // carrying its owner: exactly under them, facing where they face
      pos.set(x, y, z); placed = true; hopT += dt * (moving ? 10 : 2); body.position.y = moving ? Math.abs(Math.sin(hopT)) * 0.06 : 0; body.rotation.z = 0; lift = 0;
      let a = (yaw - body.rotation.y) % (Math.PI * 2); if (a > Math.PI) a -= Math.PI * 2; if (a < -Math.PI) a += Math.PI * 2; body.rotation.y += a * (1 - Math.exp(-14 * dt));
      root.position.set(x, y - 0.03, z); if (plate) plate.visible = false; if (mixer) { action.timeScale = moving ? 1.6 : 0.4; mixer.update(dt); } return;
    }
    let tx = exact ? x : x - Math.sin(yaw) * bk + Math.cos(yaw) * sd, tz = exact ? z : z - Math.cos(yaw) * bk - Math.sin(yaw) * sd;
    if (holdT > 0 && placed) { tx = pos.x; tz = pos.z; }
    if (!placed || Math.hypot(tx - pos.x, tz - pos.z) > 25) { pos.set(tx, y, tz); placed = true; }
    const dx = tx - pos.x, dz = tz - pos.z, d = Math.hypot(dx, dz), k = 1 - Math.exp(-(d > 0.35 ? 4.5 : 1.5) * dt);
    pos.x += dx * k; pos.z += dz * k; const gy = terrainH(pos.x, pos.z); pos.y += ((Math.abs(y - gy) < 1.5 ? gy : y) - pos.y) * (1 - Math.exp(-10 * dt));
    const walking = d > 0.35 || moving; hopT += dt * (walking ? 9 : 2.2);
    // flying pets (def.fly) glide after their owner ~1.7 m up, bobbing; they come down a little while being petted.
    // Wild ones (exact) stay on the ground so they can be petted.
    const fly = def.fly && !exact; lift += ((fly ? (holdT > 0 ? (def.flyH || 2) * 0.5 : def.flyH || 2) : 0) - lift) * (1 - Math.exp(-3 * dt));
    const up = lift + (fly ? Math.sin(hopT * 0.35) * 0.12 * Math.min(1, lift) : walking && !action ? Math.abs(Math.sin(hopT)) * 0.12 : 0);
    root.position.set(pos.x, pos.y - 0.03, pos.z); body.position.y = up; if (plate) plate.position.y = (def.h || 0.7) * SIZE + 0.2 + up; // root on the ground (a hair into it, so feet never hover), the body rises
    blob.scale.setScalar(1 / (1 + up * 0.5)); blob.material.opacity = 0.42 / (1 + up * 0.8); // contact shadow stays on the ground, smaller and fainter the higher it flies
    body.rotation.z = fly ? Math.sin(hopT * 0.23) * 0.12 : 0; // a gentle bank while gliding
    const want = holdT > 0 ? Math.atan2(x - pos.x, z - pos.z) : d > 0.2 ? Math.atan2(dx, dz) : yaw; let a = (want - body.rotation.y) % (Math.PI * 2); if (a > Math.PI) a -= Math.PI * 2; if (a < -Math.PI) a += Math.PI * 2; body.rotation.y += a * (1 - Math.exp(-8 * dt));
    if (!action && !fly) { const b = model.userData.s || 1; model.scale.y = b * (1 + Math.sin(hopT * 0.5) * (walking ? 0 : 0.03)); } // idle 'breathing' around the model's own scale (it used to reset y to 1 → tall and thin)
    if (mixer) { action.timeScale = walking ? 1 : 0.4; mixer.update(dt); }
    if (plate && camRef) { const cd = camRef.position.distanceTo(root.position), o = Math.max(0, Math.min(1, (cd - 3.5) / 3)); plate.visible = o > 0.02; plate.material.opacity = o; }
  }
  function dispose() { setName(''); blob.geometry.dispose(); blob.material.dispose(); if (root.parent) root.parent.remove(root); }
  root.scale.setScalar(scale);
  return { root, update, hold, setName, dispose, type: def.id, seat: def.ride ? def.ride * (scale || 1) : 0, stats: { run: def.run || 2, jump: def.jump || 1, leap: def.leap || 1, soar: def.soar || null, perk: def.perk || '' } };
}

export function initPets(G) {
  // G: { scene, player, terrainH(x,z), toast(msg,s), started(), menuOpen(), worldReady(), touch, releaseKeys(), lockPointer() }
  let W = { coins: 0, prog: 0, owned: [], actives: [], steps: 0 };
  // retired 말랑이 in a loaded wallet → their price back as coins (the pets drop out of the list in norm0, so this pays once)
  let refunded = 0;
  const norm = (s) => { const w = norm0(s); const r = w && Array.isArray(s.owned) ? s.owned.reduce((a, o) => a + ((o && RETIRED[o.type]) || 0), 0) : 0; if (r) { w.coins += r; refunded += r; setTimeout(settleRefund, 0); } return w; };
  function settleRefund() {
    if (!refunded) return; save(); flush(); hud();
    const tell = () => { if (!G.started()) return setTimeout(tell, 1000); G.toast(`🐾 말랑이 펫이 사라졌어요 — 산 값 🪙 ${refunded}을(를) 돌려드렸어요`, 4.5); refunded = 0; }; tell();
  }
  const norm0 = (s) => (s && typeof s === 'object' ? { coins: Math.max(0, s.coins | 0), prog: Math.max(0, +s.prog || 0), owned: Array.isArray(s.owned) ? s.owned.filter((o) => o && petDef(o.type)).map((o) => ({ id: String(o.id), type: o.type, name: clean(o.name, NAME_MAX) || petDef(o.type).name })) : [], actives: Array.isArray(s.actives) ? s.actives.map(String).slice(0, MAX_WALK) : s.active ? [String(s.active)] : [], steps: Math.max(0, +s.steps || 0), given: Array.isArray(s.given) ? s.given : [] } : null);
  try { W = norm(JSON.parse(localStorage.getItem(KEY) || 'null')) || W; } catch (_) {}
  // storage: this browser (guest) or the logged-in account (cloud, written at most every 20 s and when leaving)
  let cloud = null, dirty = false, flushT = 0;
  const save = () => { if (cloud) { dirty = true; return; } try { localStorage.setItem(KEY, JSON.stringify(W)); } catch (_) {} };
  const flush = () => { if (cloud && dirty) { dirty = false; cloud.saveWallet(W).catch(() => { dirty = true; }); } };
  const giveStarter = () => { for (const d of PETS.filter((p) => p.starter)) if (!W.owned.some((o) => o.type === d.id) && !(W.given || []).includes(d.id)) {
    const o = { id: Math.random().toString(36).slice(2, 10), type: d.id, name: d.name }; W.owned.unshift(o); if (!W.actives.length) W.actives = [o.id]; W.given = [...(W.given || []), d.id]; save(); } };
  giveStarter();
  let saveT = 0, pets = [], open = false, last = null, rideId = null;

  // ── HUD ──
  const coinEl = $('#count'), nextEl = $('#coinNext'), stepEl = $('#steps'), panel = $('#petShop');
  const fmt = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
  function popCoin() { coinEl.textContent = `${W.coins}`; coinEl.classList.remove('pop'); void coinEl.offsetWidth; coinEl.classList.add('pop'); }
  function hud() { coinEl.textContent = `${W.coins}`; nextEl.textContent = `+${EARN_AMOUNT}까지 ${Math.max(0, EARN_EVERY - W.prog).toFixed(1)}초`; stepEl.textContent = `👣 ${Math.floor(W.steps).toLocaleString('ko-KR')}보`; }
  hud();

  // ── the pet walking with me ──
  function spawnActive() {
    for (const pt of pets) pt.dispose(); pets = [];
    W.actives = W.actives.filter((id) => W.owned.some((x) => x.id === id)).slice(0, MAX_WALK);
    W.actives.forEach((id, k) => { const o = W.owned.find((x) => x.id === id), pt = createPet(o.type, o.name, G.terrainH, k, sizeFor(countOf(o.type))); pt.id = id; G.scene.add(pt.root); pets.push(pt); });
  }
  spawnActive();

  // ── shop / my pets panel ──
  function render() {
    $('#petCoins').textContent = `🪙 ${W.coins}`;
    const shop = $('#petList'); shop.replaceChildren();
    const forSale = PETS.filter((p) => !p.starter && !p.wild);
    if (!forSale.length) { const li = document.createElement('li'); li.className = 'empty'; li.textContent = '지금은 파는 펫이 없어요 — 캠퍼스의 야생 펫을 쓰다듬어 길들여 보세요 🐾'; shop.append(li); }
    for (const d of forSale) {
      const li = document.createElement('li'), sw = document.createElement('span'), nm = document.createElement('b'), pr = document.createElement('span'), btn = document.createElement('button');
      sw.className = 'petSwatch'; sw.style.background = '#' + (d.color || 0xffffff).toString(16).padStart(6, '0'); nm.textContent = d.name; pr.className = 'petPrice'; pr.textContent = `🪙 ${d.price}`;
      const have = W.owned.filter((o) => o.type === d.id).length; btn.type = 'button'; btn.textContent = W.coins >= d.price ? '사기' : `${d.price - W.coins} 부족`; btn.disabled = W.coins < d.price;
      btn.addEventListener('click', () => buy(d)); li.append(sw, nm, pr, btn); if (have) { const h = document.createElement('small'); h.textContent = `보유 ${have}` + (have < 3 ? ` · ${3 - have}마리 더 모으면 1.5배로 커져요` : have < 6 ? ` · 1.5배 크기 (6마리면 2배)` : ' · 2배 크기'); li.append(h); } shop.append(li);
    }
    const mine = $('#petMine'); mine.replaceChildren();
    if (!W.owned.length) { const li = document.createElement('li'); li.className = 'empty'; li.textContent = '아직 펫이 없어요. 캠퍼스의 야생 펫을 길들여 보세요!'; mine.append(li); }
    for (const o of W.owned) {
      const d = petDef(o.type), li = document.createElement('li'), sw = document.createElement('span'), nm = document.createElement('input'), go = document.createElement('button');
      sw.className = 'petSwatch'; sw.style.background = '#' + (d.color || 0xffffff).toString(16).padStart(6, '0');
      nm.type = 'text'; nm.maxLength = NAME_MAX; nm.value = o.name; nm.setAttribute('aria-label', '펫 이름'); nm.spellcheck = false;
      nm.addEventListener('keydown', (e) => { e.stopPropagation(); if (e.key === 'Enter') nm.blur(); }); nm.addEventListener('keyup', (e) => e.stopPropagation());
      nm.addEventListener('change', () => { o.name = clean(nm.value, NAME_MAX) || d.name; nm.value = o.name; save(); const pt = pets.find((x) => x.id === o.id); if (pt) pt.setName(o.name); });
      const on = W.actives.includes(o.id), full = !on && W.actives.length >= MAX_WALK; go.type = 'button'; go.className = on ? 'on' : ''; go.textContent = on ? '같이 다니는 중' : full ? '이 펫으로 바꾸기' : '데리고 다니기';
      go.addEventListener('click', () => { W.actives = on ? W.actives.filter((x) => x !== o.id) : [...W.actives, o.id].slice(-MAX_WALK); /* over the limit: the newest one replaces the oldest */ save(); spawnActive(); render(); G.toast(on ? `${o.name}을(를) 쉬게 했어요` : `${o.name}와(과) 함께 걸어요 🐾`, 1.8); });
      li.append(sw, nm, go); if (G.petRow) G.petRow(li, o); mine.append(li); // wild-pets.js adds the bond chip
    }
  }
  function buy(d) {
    if (W.coins < d.price) return;
    W.coins -= d.price; const o = { id: Math.random().toString(36).slice(2, 10), type: d.id, name: d.name };
    const before = sizeFor(countOf(d.id)); W.owned.push(o); W.actives = [...W.actives, o.id].slice(-MAX_WALK); /* a new pet comes along right away (swapping out the current one) */ save(); flush(); if (sizeFor(countOf(d.id)) > before) setTimeout(() => G.toast(`✨ ${d.name} ${countOf(d.id)}마리! ${d.name}들이 ${sizeFor(countOf(d.id))}배로 커졌어요`, 3), 2700); spawnActive(); hud(); render(); G.toast(`${d.name}을(를) 데려왔어요! 이름을 지어 주세요 🐾`, 2.6);
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
      if (p.grounded === false) W.prog += Math.min(dt, 0.5) * (JUMP_RATE - 1); // in the air: bar fills at JUMP_RATE× (no steps counted)
      else if (d > 0.01 && d < 3) {
        const before = Math.floor(W.steps / 1000); W.steps += d / STEP_LEN; W.prog += d * WALK_BONUS;
        if (Math.floor(W.steps / 1000) > before) G.toast(`👣 ${(Math.floor(W.steps / 1000) * 1000).toLocaleString('ko-KR')}보 달성! 걸을수록 코인이 빨리 모여요`, 2.4);
      }
      last = { x: p.pos.x, z: p.pos.z };
      while (W.prog >= EARN_EVERY) { W.prog -= EARN_EVERY; W.coins += EARN_AMOUNT; save(); popCoin(); if (open) render(); } // too frequent for a toast: the coin counter pops instead
      if ((saveT -= dt) <= 0) { saveT = 5; save(); }
      if (cloud && (flushT -= dt) <= 0) { flushT = 20; flush(); }
    } else last = null;
    if ((update.h = (update.h || 0) - dt) <= 0) { update.h = 0.5; hud(); }
    if (rideId && !pets.some((pt) => pt.id === rideId)) rideId = null; // the ridden pet was put away
    { const p = G.player; for (const pt of pets) pt.update(dt, p.pos.x, p.pos.y, p.pos.z, p.yaw, p.speed > 0.5, pt.id === rideId ? 'ride' : undefined); }
  }
  addEventListener('pagehide', () => { save(); flush(); }); document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') flush(); });
  function countOf(type) { return W.owned.filter((x) => x.type === type).length; }
  function current() { return W.actives.map((id) => W.owned.find((x) => x.id === id)).filter(Boolean).map((o) => ({ t: o.type, n: o.name, s: sizeFor(countOf(o.type)) })); }
  // switch to an account's wallet (first login carries this browser's guest progress over), or back to the guest wallet
  async function useAccount(api, created) {
    if (!api) { flush(); cloud = null; try { W = norm(JSON.parse(localStorage.getItem(KEY) || 'null')) || { coins: 0, prog: 0, owned: [], actives: [], steps: 0 }; } catch (_) {} giveStarter(); spawnActive(); hud(); if (open) render(); return; }
    const remote = norm(await api.loadWallet().catch(() => null));
    cloud = api;
    if (remote) W = remote; else { dirty = true; flush(); } // new account: starts with the guest progress of this browser
    giveStarter(); spawnActive(); hud(); if (open) render();
  }
  // quest rewards (quests.js): add coins through this wallet and hand back what to store with the claim
  function addCoins(n) { W.coins += Math.max(0, n | 0); save(); hud(); if (open) render(); return JSON.parse(JSON.stringify(W)); }
  // read-only views for wild-pets.js
  const owned = () => W.owned.map(({ id, type, name }) => ({ id, type, name }));
  const activeIds = () => W.actives.filter((id) => W.owned.some((o) => o.id === id));
  const rootOf = (id) => { const pt = pets.find((x) => x.id === id); return pt && pt.root; };
  const hold = (id, s) => { const pt = pets.find((x) => x.id === id); if (pt && pt.hold) pt.hold(s); }; // being petted: stay where it is
  // a tamed wild pet joins the owned list (wild-pets.js). One per kind: returns null if this kind is already owned
  function adopt(type, name) {
    if (!petDef(type) || W.owned.some((o) => o.type === type)) return null;
    const o = { id: Math.random().toString(36).slice(2, 10), type, name: clean(name, NAME_MAX) || petDef(type).name };
    W.owned.push(o); W.actives = [...W.actives, o.id].slice(-MAX_WALK); /* a new pet comes along right away (swapping out the current one) */ save(); flush(); spawnActive(); hud(); if (open) render();
    return o.id;
  }
  const ownsType = (type) => W.owned.some((o) => o.type === type);
  // riding (R): get on a rideable pet next to you (고라니·호랑이·사자·염소·청룡), or get off
  const nameOf = (pt) => { const o = W.owned.find((x) => x.id === pt.id); return (o && o.name) || (petDef(pt.type) || {}).name; };
  // the closest rideable pet walking with you within r metres (for the "R 올라타기" prompt)
  function nearRideable(pos, r = 4) { let best = null, bd = r; for (const pt of pets) if (pt.seat > 0) { const d = Math.hypot(pt.root.position.x - pos.x, pt.root.position.z - pos.z); if (d < bd) { bd = d; best = pt; } } return best && { id: best.id, name: nameOf(best) }; }
  function toggleRide(pos) {
    if (rideId) { rideId = null; return { off: true }; }
    if (!pets.some((x) => x.seat > 0)) return { none: true };
    const n = nearRideable(pos || G.player.pos); if (!n) return { far: true };
    rideId = n.id; const pt = pets.find((x) => x.id === n.id); return { on: true, name: n.name, perk: pt && pt.stats.perk };
  }
  const riding = () => { const pt = rideId && pets.find((x) => x.id === rideId); return pt ? pt.seat : 0; };
  const rideStats = () => { const pt = rideId && pets.find((x) => x.id === rideId); return pt ? pt.stats : null; }; // run/jump/leap of the pet you're on
  return { toggleRide, nearRideable, riding, rideStats, hold, adopt, ownsType, owned, activeIds, rootOf, addCoins, popCoin, metres: () => W.steps * STEP_LEN, walking: () => pets.length, steps: () => Math.floor(W.steps), useAccount, flush, update, current, open: () => open, worldChanged: () => { for (const pt of pets) pt.update(0, G.player.pos.x, G.player.pos.y, G.player.pos.z, G.player.yaw, false); } };
}
