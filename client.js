// Frill Meadow — third-person explorer on real university campuses (see campuses.js).
// Buildings, roads, parks and water come from OpenStreetMap; hills from SRTM terrain tiles.
// Everything runs locally in the browser; the multiplayer room in the template is unused.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { CAMPUSES, REGIONS, LIGHTING } from './campuses.js';
import { initMultiplayer } from './multiplayer.js';
import { initPets, setPetCamera } from './pets.js';
import { initAuth } from './auth.js';
import { initMusic } from './music.js';
import { initCollection } from './collectibles.js';
import { initQuests } from './quests.js';
import { initStamps } from './stamps.js';
import { initWildPets } from './wild-pets.js';

const MODEL_YAW = 0, PR = 0.38;
const $ = (s) => document.querySelector(s);
const showErr = (m) => { const el = $('#err'); el.textContent = '오류: ' + m; el.classList.remove('hidden'); };
window.addEventListener('error', (e) => showErr(e.message));
window.addEventListener('unhandledrejection', (e) => showErr(String(e.reason && e.reason.message || e.reason)));
const QS = new URLSearchParams(location.search);
// phones and tablets get the on-screen joystick + buttons and the lighter world (?touch forces it on a desktop for testing)
const TOUCH = QS.has('touch') || matchMedia('(hover: none) and (pointer: coarse)').matches;
const LOW = QS.has('low') || TOUCH;
document.body.classList.toggle('touch', TOUCH);

let seed = 20261111;
function rnd() { seed |= 0; seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }
const rr = (a, b) => a + (b - a) * rnd();
function hash(a, b, k) { let n = Math.imul(a + k * 7919, 374761393) ^ Math.imul(b - k * 104729, 668265263); n = Math.imul(n ^ (n >>> 13), 1274126177); return ((n ^ (n >>> 16)) >>> 0) / 4294967296; }
const angDiff = (a, b) => { let d = (b - a) % (Math.PI * 2); if (d > Math.PI) d -= Math.PI * 2; if (d < -Math.PI) d += Math.PI * 2; return d; };
function pip(x, z, p) { let c = false; for (let i = 0, j = p.length - 1; i < p.length; j = i++) { const a = p[i], b = p[j]; if ((a[1] > z) !== (b[1] > z) && x < ((b[0] - a[0]) * (z - a[1])) / (b[1] - a[1]) + a[0]) c = !c; } return c; }

// ── renderer / scene ───────────────────────────────────────────────────────
const canvas = $('#game');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
let pixelRatio = TOUCH ? Math.min(window.devicePixelRatio || 1, 1.5) : LOW ? 1 : Math.min(window.devicePixelRatio || 1, 2);
renderer.setPixelRatio(pixelRatio);
renderer.setSize(window.innerWidth, window.innerHeight, false);
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.1;
const scene = new THREE.Scene();
const HORIZON = new THREE.Color(0x18223d);
scene.fog = new THREE.Fog(HORIZON, 140, 780);
const camera = new THREE.PerspectiveCamera(58, window.innerWidth / window.innerHeight, 0.15, 2600);
window.addEventListener('resize', () => { renderer.setSize(window.innerWidth, window.innerHeight, false); camera.aspect = window.innerWidth / window.innerHeight; camera.updateProjectionMatrix(); });
const sky = new THREE.Mesh(new THREE.SphereGeometry(2200, 24, 12), new THREE.ShaderMaterial({
  side: THREE.BackSide, depthWrite: false, fog: false,
  uniforms: { top: { value: new THREE.Color(0x050814) }, mid: { value: new THREE.Color(0x0e1630) }, bot: { value: HORIZON } },
  vertexShader: 'varying vec3 p; void main(){ p = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
  fragmentShader: 'varying vec3 p; uniform vec3 top; uniform vec3 mid; uniform vec3 bot; void main(){ float h = normalize(p).y; vec3 c = mix(bot, mid, smoothstep(0.0,0.14,h)); c = mix(c, top, smoothstep(0.1,0.65,h)); gl_FragColor = vec4(c,1.0);\n#include <colorspace_fragment>\n}',
}));
scene.add(sky);
const hemi = new THREE.HemisphereLight(0x52679c, 0x161d2a, 0.85); scene.add(hemi);
// stars + moon ride along with the camera
const stars = (() => { const n = LOW ? 500 : 1800, p = new Float32Array(n * 3); for (let i = 0; i < n; i++) { const u = Math.random(), a = Math.random() * 6.283, y = 0.04 + u * 0.96, r = Math.sqrt(1 - y * y); p[i * 3] = Math.cos(a) * r * 2000; p[i * 3 + 1] = y * 2000; p[i * 3 + 2] = Math.sin(a) * r * 2000; } const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(p, 3)); const m = new THREE.Points(g, new THREE.PointsMaterial({ color: 0xdfe8ff, size: 2.2, sizeAttenuation: false, fog: false, transparent: true, opacity: 0.9, depthWrite: false })); m.frustumCulled = false; scene.add(m); return m; })();
const moon = new THREE.Mesh(new THREE.SphereGeometry(70, 24, 16), new THREE.MeshBasicMaterial({ color: 0xf6f2dc, fog: false })); scene.add(moon);
const sun = new THREE.DirectionalLight(0xa9bcf0, 0.8), SUN_DIR = new THREE.Vector3(0.5, 0.74, -0.42).normalize();
sun.castShadow = true; sun.shadow.mapSize.set(LOW ? 1024 : 4096, LOW ? 1024 : 4096);
{ const sc = sun.shadow.camera; sc.left = -95; sc.right = 95; sc.top = 95; sc.bottom = -95; sc.near = 1; sc.far = 520; }
sun.shadow.bias = -0.0008; sun.shadow.normalBias = 0.08;
scene.add(sun, sun.target);
let world = new THREE.Group(); scene.add(world); // everything that belongs to the loaded campus lives under this group
function applyLighting(L) {
  const u = sky.material.uniforms; u.top.value.set(L.sky.top); u.mid.value.set(L.sky.mid); HORIZON.set(L.sky.horizon);
  scene.fog.color.set(L.sky.horizon); scene.fog.near = L.fog[0]; scene.fog.far = L.fog[1];
  hemi.color.set(L.hemi[0]); hemi.groundColor.set(L.hemi[1]); hemi.intensity = L.hemi[2]; sun.color.set(L.sun[0]); sun.intensity = L.sun[1];
  stars.visible = !!L.stars; moon.visible = !!L.moon;
}

// ── shared helpers ─────────────────────────────────────────────────────────
const M4 = new THREE.Matrix4(), Q = new THREE.Quaternion(), V = new THREE.Vector3(), S = new THREE.Vector3(), E = new THREE.Euler(), C = new THREE.Color();
function instanced(geo, mat, n, cast = true) { const m = new THREE.InstancedMesh(geo, mat, n); m.castShadow = cast; m.receiveShadow = true; m.count = 0; m.frustumCulled = false; world.add(m); return m; }
function put(m, x, y, z, sx, sy, sz, ry = 0, color = null, rx = 0, rz = 0) { Q.setFromEuler(E.set(rx, ry, rz)); M4.compose(V.set(x, y, z), Q, S.set(sx, sy, sz)); m.setMatrixAt(m.count, M4); if (color) m.setColorAt(m.count, color); m.count++; }
const flat = (c) => new THREE.MeshLambertMaterial({ color: c, flatShading: true });
function canvasTex(draw, w = 64, h = w) { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; }

// ── world state filled in by buildWorld() ──────────────────────────────────
let campus = null, D = null, GN = 0, GSTEP = 12, GHALF = 900, GH = null, HALF = 700;
let mask = null, MS = 1024, groundCanvas = null, GS = 4096;
const buildings = [], bGrid = new Map(), BCELL = 32;
const CELL = 8, grid = new Map();
const labels = [], gems = [], pals = [], clouds = [], fx = [], places = [], lampGrid = new Map(), lampLights = [];
let groundMat = null, lantern = null;
let tufts = null, tcx = 1e9, tcz = 1e9, amph = null;

// Even out the ground under roads and paths: the elevation data (SRTM, ~30 m cells) includes the tops of trees and
// buildings, so a flat avenue (e.g. 연세대 백양로) came out bumpy. Nodes near a road move toward a wide blur of the
// terrain (keeps the real slope, drops the lumps), fading out over ~18 m beside the road.
function smoothRoads() {
  const N = GN, blur = (src, r) => { const t = new Float32Array(N * N), o = new Float32Array(N * N);
    for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) { let s = 0, c = 0; for (let k = Math.max(0, i - r); k <= Math.min(N - 1, i + r); k++) { s += src[j * N + k]; c++; } t[j * N + i] = s / c; }
    for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) { let s = 0, c = 0; for (let k = Math.max(0, j - r); k <= Math.min(N - 1, j + r); k++) { s += t[k * N + i]; c++; } o[j * N + i] = s / c; } return o; };
  const B = blur(blur(GH, 3), 3), W = new Float32Array(N * N), FADE = 18;
  for (const r of D.roads) {
    if (!r.p || r.p.length < 2) continue; const core = (r.w || 4) / 2 + 4;
    for (let n = 0; n + 1 < r.p.length; n++) {
      const [ax, az] = r.p[n], [bx, bz] = r.p[n + 1], L = Math.hypot(bx - ax, bz - az), steps = Math.max(1, Math.ceil(L / 4));
      for (let k = 0; k <= steps; k++) {
        const x = ax + ((bx - ax) * k) / steps, z = az + ((bz - az) * k) / steps, ci = Math.round((x + GHALF) / GSTEP), cj = Math.round((z + GHALF) / GSTEP), R = Math.ceil((core + FADE) / GSTEP);
        for (let j = cj - R; j <= cj + R; j++) for (let i = ci - R; i <= ci + R; i++) {
          if (i < 0 || j < 0 || i >= N || j >= N) continue; const d = Math.hypot(-GHALF + i * GSTEP - x, -GHALF + j * GSTEP - z), w = d <= core ? 1 : Math.max(0, 1 - (d - core) / FADE);
          if (w > W[j * N + i]) W[j * N + i] = w;
        }
      }
    }
  }
  for (let k = 0; k < N * N; k++) if (W[k] > 0) { const w = W[k] * W[k] * (3 - 2 * W[k]) * 0.9; GH[k] = GH[k] * (1 - w) + B[k] * w; }
}
function terrainH(x, z) {
  let fx = (x + GHALF) / GSTEP, fz = (z + GHALF) / GSTEP; fx = Math.min(GN - 1.001, Math.max(0, fx)); fz = Math.min(GN - 1.001, Math.max(0, fz));
  const i = fx | 0, j = fz | 0, a = fx - i, b = fz - j, k = j * GN + i;
  return (GH[k] * (1 - a) + GH[k + 1] * a) * (1 - b) + (GH[k + GN] * (1 - a) + GH[k + GN + 1] * a) * b;
}
// 0 grass · 1 park · 2 wood · 3 paved · 4 water · 5 building
// Collision from a hand-made model's own shape: sample its triangles, and wherever the model reaches body height
// (0.25–2.2 m above the ground there) on a 0.6 m grid, add a solid post as tall as the model is in that cell.
// Openings (an arch over the road, the gap between gate pillars, under a colonnade's lintel) stay walkable.
function meshCollider(root) {
  root.updateMatrixWorld(true); const C = 0.6, cells = new Map(), a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3(), q = new THREE.Vector3();
  const hit = (x, y, z) => { const k = Math.floor(x / C) + ',' + Math.floor(z / C); let e = cells.get(k); if (!e) cells.set(k, (e = { top: -1e9, body: false, x: (Math.floor(x / C) + 0.5) * C, z: (Math.floor(z / C) + 0.5) * C, g: null })); if (y > e.top) e.top = y; if (!e.body) { if (e.g == null) e.g = terrainH(e.x, e.z); if (y > e.g + 0.25 && y < e.g + 2.2) e.body = true; } };
  root.traverse((o) => {
    if (!o.isMesh || !o.geometry) return; const pos = o.geometry.attributes.position, idx = o.geometry.index, n = idx ? idx.count : pos.count, M = o.matrixWorld;
    for (let t = 0; t + 2 < n; t += 3) {
      a.fromBufferAttribute(pos, idx ? idx.getX(t) : t).applyMatrix4(M); b.fromBufferAttribute(pos, idx ? idx.getX(t + 1) : t + 1).applyMatrix4(M); c.fromBufferAttribute(pos, idx ? idx.getX(t + 2) : t + 2).applyMatrix4(M);
      const m = Math.max(1, Math.min(24, Math.ceil(Math.max(a.distanceTo(b), b.distanceTo(c), c.distanceTo(a)) / (C * 0.7))));
      for (let i = 0; i <= m; i++) for (let j = 0; j <= m - i; j++) { const u = i / m, v = j / m; q.copy(a).multiplyScalar(1 - u - v).addScaledVector(b, u).addScaledVector(c, v); hit(q.x, q.y, q.z); }
    }
  });
  let k = 0; for (const e of cells.values()) if (e.body) { addCircle(e.x, e.z, C * 0.62, e.top); k++; }
  return k;
}
function cls(x, z) {
  const i = ((x + GHALF) / (GHALF * 2) * MS) | 0, j = ((z + GHALF) / (GHALF * 2) * MS) | 0; if (i < 0 || j < 0 || i >= MS || j >= MS) return 3;
  const v = mask[(j * MS + i) * 4]; return v < 30 ? 0 : v < 85 ? 1 : v < 135 ? 2 : v < 185 ? 3 : v < 230 ? 4 : 5;
}
function addCircle(x, z, r, top) { const c = { x, z, r, top }; for (let i = Math.floor((x - r) / CELL); i <= Math.floor((x + r) / CELL); i++) for (let j = Math.floor((z - r) / CELL); j <= Math.floor((z + r) / CELL); j++) { const k = i + ',' + j; let a = grid.get(k); if (!a) grid.set(k, (a = [])); a.push(c); } }
function buildingsNear(x, z, pad, out) { out.length = 0; for (let i = Math.floor((x - pad) / BCELL); i <= Math.floor((x + pad) / BCELL); i++) for (let j = Math.floor((z - pad) / BCELL); j <= Math.floor((z + pad) / BCELL); j++) { const a = bGrid.get(i + ',' + j); if (a) for (const b of a) if (!out.includes(b)) out.push(b); } return out; }
const nb = [], nb2 = [];
function insideBuilding(x, z, y) { for (const b of buildingsNear(x, z, 0.01, nb2)) if (y < b.top && x > b.minx && x < b.maxx && z > b.minz && z < b.maxz && pip(x, z, b.p)) return b; return null; }
function solidAt(x, y, z) {
  if (y < terrainH(x, z) + 0.25) return true;
  const a = grid.get(Math.floor(x / CELL) + ',' + Math.floor(z / CELL));
  if (a) for (const c of a) if (y < c.top + 0.2 && Math.hypot(x - c.x, z - c.z) < c.r + 0.2) return true;
  return !!insideBuilding(x, z, y);
}
const walkable = (x, z) => Math.abs(x) < HALF - 8 && Math.abs(z) < HALF - 8 && cls(x, z) < 4;
function freeSpot(cx, cz, rad, ok = (c) => c < 4) { for (let t = 0; t < 400; t++) { const a = rnd() * 6.283, r = Math.sqrt(rnd()) * rad * (1 + t / 200), x = cx + Math.cos(a) * r, z = cz + Math.sin(a) * r; if (Math.abs(x) < HALF - 10 && Math.abs(z) < HALF - 10 && ok(cls(x, z)) && ok(cls(x + 1.5, z)) && ok(cls(x - 1.5, z)) && ok(cls(x, z + 1.5)) && ok(cls(x, z - 1.5)) && !solidAt(x, terrainH(x, z) + 1, z)) return [x, z]; } return [cx, cz]; }

function buildWorld(data) {
  seed = campus.seed || 20261111;
  const L = LIGHTING[campus.lighting] || LIGHTING.night, PLAY = northUp(campus) ? mirrorPlay(campus.play || {}) : campus.play || {}, LMK = northUp(campus) ? mirrorLandmarks(campus.landmarks || []) : campus.landmarks || [];
  const lmSet = (k) => new Set(LMK.filter((l) => l.kind === k).map((l) => l.name)), gateSet = lmSet('gate'), amphSet = lmSet('amphitheatre'), domeSet = lmSet('dome'), stadiumSet = lmSet('stadium');
  const look = new Map(LMK.filter((l) => l.wall || l.roof || l.model).map((l) => [l.name, l]));
  D = data; GN = D.grid.n; GSTEP = D.grid.step; GHALF = D.grid.half; GH = Float32Array.from(D.grid.h); HALF = D.half;
  smoothRoads(); // SRTM is ~30 m and picks up trees/buildings → roads came out lumpy; ease the ground under them
  { const a = D.buildings.find((b) => amphSet.has(b.n)); if (a) {
    let minx = 1e9, maxx = -1e9, minz = 1e9, maxz = -1e9; for (const q of a.p) { minx = Math.min(minx, q[0]); maxx = Math.max(maxx, q[0]); minz = Math.min(minz, q[1]); maxz = Math.max(maxz, q[1]); }
    const W = maxx - minx, sx = minx + 0.61 * W, sz = minz + 0.3 * (maxz - minz); amph = { sx, sz, ri: 0.19 * W, ro: 0.52 * W, a0: (38 * Math.PI) / 180, a1: (201 * Math.PI) / 180, NT: 12, step: 0.38, by: terrainH(sx, sz) };
    const sm = (t) => { t = Math.min(1, Math.max(0, t)); return t * t * (3 - 2 * t); };
    for (let j = 0; j < GN; j++) for (let i = 0; i < GN; i++) { const x = -GHALF + i * GSTEP, z = -GHALF + j * GSTEP, d = Math.hypot(x - sx, z - sz); if (d > amph.ro + 34) continue; let an = Math.atan2(z - sz, x - sx); if (an < 0) an += Math.PI * 2; const inFan = an > amph.a0 - 0.15 && an < amph.a1 + 0.15, tgt = amph.by - 0.3 + (inFan ? Math.min(1, Math.max(0, (d - amph.ri) / (amph.ro - amph.ri))) * amph.NT * amph.step : 0), w = 1 - sm((d - amph.ro) / 34), k = j * GN + i; GH[k] = GH[k] * (1 - w) + tgt * w; }
  } }
  const SPAN = GHALF * 2;
  // ── ground texture + class mask, drawn once from the map data ──
  GS = LOW ? 2048 : 4096;
  const gc = (groundCanvas = document.createElement('canvas')); gc.width = gc.height = GS; const g = gc.getContext('2d');
  const mc = document.createElement('canvas'); mc.width = mc.height = MS; const m = mc.getContext('2d', { willReadFrequently: true });
  const path = (ctx, k, pts, close) => { ctx.beginPath(); for (let i = 0; i < pts.length; i++) { const x = (pts[i][0] + GHALF) * k, y = (pts[i][1] + GHALF) * k; i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); } if (close) ctx.closePath(); };
  const kg = GS / SPAN, km = MS / SPAN, mcol = (v) => `rgb(${v},0,0)`;
  g.fillStyle = '#7ab459'; g.fillRect(0, 0, GS, GS); m.fillStyle = mcol(0); m.fillRect(0, 0, MS, MS);
  for (let i = 0; i < (LOW ? 6000 : 26000); i++) { g.fillStyle = rnd() < 0.5 ? 'rgba(96,150,70,0.35)' : 'rgba(150,200,110,0.3)'; const r = rr(1.5, 5) * kg; g.beginPath(); g.ellipse(rnd() * GS, rnd() * GS, r, r * rr(0.5, 1), rnd() * 3, 0, 6.3); g.fill(); }
  const fillAreas = (kind, color, mv) => { for (const a of D.areas) if (a.k === kind) { path(g, kg, a.p, true); g.fillStyle = color; g.fill(); path(m, km, a.p, true); m.fillStyle = mcol(mv); m.fill(); } };
  fillAreas('park', '#8fcb6c', 60); fillAreas('wood', '#5c9a50', 110);
  for (const a of D.areas) if (a.k === 'pitch') {
    path(m, km, a.p, true); m.fillStyle = mcol(160); m.fill(); path(g, kg, a.p, true);
    if (stadiumSet.has(a.n)) { g.fillStyle = '#c06a4e'; g.fill(); const cx = a.p.reduce((s, p) => s + p[0], 0) / a.p.length, cz = a.p.reduce((s, p) => s + p[1], 0) / a.p.length; path(g, kg, a.p.map((p) => [cx + (p[0] - cx) * 0.78, cz + (p[1] - cz) * 0.78]), true); g.fillStyle = '#69b857'; g.fill(); g.strokeStyle = '#fff'; g.lineWidth = 0.5 * kg; g.stroke(); }
    else { g.fillStyle = '#6dbb5a'; g.fill(); g.strokeStyle = 'rgba(255,255,255,0.85)'; g.lineWidth = 0.4 * kg; g.stroke(); }
  }
  fillAreas('parking', '#a9abae', 160); fillAreas('water', '#58a8d8', 210);
  g.lineCap = g.lineJoin = m.lineCap = m.lineJoin = 'round';
  const stroke = (r, w, color) => { path(g, kg, r.p, false); g.strokeStyle = color; g.lineWidth = w * kg; g.stroke(); };
  for (const r of D.roads) if (r.t === 'foot') { stroke(r, r.w + 0.5, '#bfb08a'); }
  for (const r of D.roads) if (r.t === 'foot') { stroke(r, r.w, '#e0d4b4'); path(m, km, r.p, false); m.strokeStyle = mcol(160); m.lineWidth = Math.max(1.2, r.w * km); m.stroke(); }
  for (const r of D.roads) if (r.t === 'road') stroke(r, r.w + 1.4, '#74787d');
  for (const r of D.roads) if (r.t === 'road') { stroke(r, r.w, '#9da0a4'); path(m, km, r.p, false); m.strokeStyle = mcol(160); m.lineWidth = (r.w + 1.4) * km; m.stroke(); }
  g.setLineDash([3 * kg, 4 * kg]); for (const r of D.roads) if (r.t === 'road' && r.w >= 9) stroke(r, 0.3, 'rgba(255,255,255,0.9)'); g.setLineDash([]);
  for (const b of D.buildings) { path(g, kg, b.p, true); g.fillStyle = '#b3afa6'; g.fill(); path(m, km, b.p, true); m.fillStyle = mcol(250); m.fill(); m.strokeStyle = mcol(250); m.lineWidth = 2; m.stroke(); }
  mask = m.getImageData(0, 0, MS, MS).data;
  const gtex = new THREE.CanvasTexture(gc); gtex.colorSpace = THREE.SRGBColorSpace; gtex.anisotropy = renderer.capabilities.getMaxAnisotropy();
  // terrain mesh on the elevation grid
  {
    const geo = new THREE.PlaneGeometry(SPAN, SPAN, GN - 1, GN - 1); geo.rotateX(-Math.PI / 2); const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) pos.setY(i, GH[i]);
    geo.computeVertexNormals(); groundMat = new THREE.MeshLambertMaterial({ map: gtex }); const ground = new THREE.Mesh(geo, groundMat); ground.receiveShadow = true; world.add(ground);
    const far = new THREE.Mesh(new THREE.CircleGeometry(4000, 32).rotateX(-Math.PI / 2), new THREE.MeshLambertMaterial({ color: 0x86b56a })); far.position.y = -3; world.add(far);
  }
  // ── buildings: extruded real footprints ──
  {
    const wallTex = canvasTex((c, s) => { c.fillStyle = '#fff'; c.fillRect(0, 0, s, s); c.fillStyle = '#e6e6e6'; c.fillRect(0, s * 0.9, s, s * 0.1); c.fillStyle = '#d5d8dc'; c.fillRect(s * 0.27, s * 0.2, s * 0.46, s * 0.5); const gr = c.createLinearGradient(0, s * 0.22, 0, s * 0.68); gr.addColorStop(0, '#7f9bb3'); gr.addColorStop(1, '#52697f'); c.fillStyle = gr; c.fillRect(s * 0.31, s * 0.24, s * 0.38, s * 0.42); c.fillStyle = '#d5d8dc'; c.fillRect(s * 0.49, s * 0.24, s * 0.025, s * 0.42); }, 128);
    wallTex.wrapS = wallTex.wrapT = THREE.RepeatWrapping; wallTex.anisotropy = 8;
    const wp = [], wn = [], wu = [], wc = [], rp = [], rc = [];
    const campusWalls = [0xece6d8, 0xe2dccd, 0xd8d1c1, 0xe9dfc9, 0xdcd7cf], aptWalls = [0xf1efe9, 0xe9e4d8, 0xdfe5ea, 0xece2d2, 0xe3e9e1], otherWalls = [0xe6ddcc, 0xd9c7ae, 0xcfd6dc, 0xe8e3da, 0xc9b39a, 0xd7dccf];
    const campusRoofs = [0x6f8196, 0x758a82, 0x7a7f8c], otherRoofs = [0x8a8d90, 0x9a958c, 0x7d8388, 0xa09a92, 0x86796e];
    let idx = 0;
    for (const src of D.buildings) {
      const p = src.p; if (p.length < 3) continue; idx++;
      let area = 0, minx = 1e9, maxx = -1e9, minz = 1e9, maxz = -1e9, minT = 1e9, avgT = 0, cx = 0, cz = 0;
      for (let i = 0; i < p.length; i++) { const a = p[i], b = p[(i + 1) % p.length]; area += a[0] * b[1] - b[0] * a[1]; minx = Math.min(minx, a[0]); maxx = Math.max(maxx, a[0]); minz = Math.min(minz, a[1]); maxz = Math.max(maxz, a[1]); const t = terrainH(a[0], a[1]); minT = Math.min(minT, t); avgT += t / p.length; cx += a[0] / p.length; cz += a[1] / p.length; }
      const isGate = gateSet.has(src.n);
      const addRec = (poly, rtop, n) => { let ax = 1e9, bx = -1e9, az = 1e9, bz = -1e9; for (const q of poly) { ax = Math.min(ax, q[0]); bx = Math.max(bx, q[0]); az = Math.min(az, q[1]); bz = Math.max(bz, q[1]); } const rec = { p: poly, minx: ax, maxx: bx, minz: az, maxz: bz, top: rtop, n, c: 1, cx: (ax + bx) / 2, cz: (az + bz) / 2 }; buildings.push(rec); for (let i = Math.floor(ax / BCELL); i <= Math.floor(bx / BCELL); i++) for (let j = Math.floor(az / BCELL); j <= Math.floor(bz / BCELL); j++) { const k = i + ',' + j; let a = bGrid.get(k); if (!a) bGrid.set(k, (a = [])); a.push(rec); } };
      if (isGate) { // triumphal arch with two colonnade wings and end pavilions, as seen in street view
        let A = p[0], B = p[1], best = 0; for (const a of p) for (const b of p) { const d = Math.hypot(a[0] - b[0], a[1] - b[1]); if (d > best) { best = d; A = a; B = b; } }
        const ang = Math.atan2(B[1] - A[1], B[0] - A[0]), ca = Math.cos(ang), sa = Math.sin(ang), L = Math.max(72, Math.min(best, 130)), half = L / 2;
        let off = 0, bw = 0; // centre the opening on the road that runs through
        for (const r of D.roads) if (r.t === 'road') for (let i = 0; i + 1 < r.p.length; i++) { const a = r.p[i], b = r.p[i + 1], ax = (a[0] - cx) * ca + (a[1] - cz) * sa, az = -(a[0] - cx) * sa + (a[1] - cz) * ca, bx = (b[0] - cx) * ca + (b[1] - cz) * sa, bz = -(b[0] - cx) * sa + (b[1] - cz) * ca; if (az > 0 === bz > 0) continue; const x = ax + ((bx - ax) * az) / (az - bz); if (Math.abs(x) < half - 16 && (r.w > bw || (r.w === bw && Math.abs(x) < Math.abs(off)))) { bw = r.w; off = x; } }
        const gx = cx + off * ca, gz = cz + off * sa, gy = terrainH(gx, gz), G = new THREE.Group(); G.position.set(gx, gy, gz); G.rotation.y = -ang; world.add(G);
        const glm = LMK.find((l) => l.name === src.n && l.model);
        if (glm) { // hand-made gate model: arch opening (centre 15% of its width) on the road; pillars and colonnade wings are solid
          const s = glm.scale || 80, myWorld = world, solid = (lx, r, t) => addCircle(gx + lx * ca, gz + lx * sa, r, gy + t);
          new GLTFLoader().load(glm.model, (g) => {
            if (world !== myWorld) return; const m = g.scene, box = new THREE.Box3().setFromObject(m), size = box.getSize(new THREE.Vector3());
            const mat = new THREE.MeshLambertMaterial({ color: glm.wall || 0xe9e5d8, emissive: glm.glow || 0x4a4638 });
            floodlight(m, glm, mat);
            m.position.set(-(box.min.x + box.max.x) / 2, -box.min.y - 0.4 / (s / size.x), -(box.min.z + box.max.z) / 2); const sc = new THREE.Group(); sc.add(m); sc.scale.setScalar(s / size.x); if (northUp(campus)) sc.rotation.y = Math.PI; G.add(sc); // flipped footprint → turn the (real) model round so it faces the same way
            meshCollider(sc);
          }, undefined, () => console.warn('gate model failed', glm.model));
          void solid; // collision comes from the model's own shape once it has loaded (meshCollider)
          places.push({ n: src.n, x: gx, z: gz, top: gy + 0.42 * s, r: 55 }); continue;
        }
        const stone = new THREE.MeshLambertMaterial({ color: 0xe9e5d8, emissive: 0x4a4638 }), pale = new THREE.MeshLambertMaterial({ color: 0xf6f3ea, emissive: 0x5c584a }), dark = new THREE.MeshLambertMaterial({ color: 0x55534d });
        const add = (geo, x, y, z, m = stone) => { const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); o.castShadow = o.receiveShadow = true; G.add(o); return o; };
        const solid = (lx, lz, r, t) => addCircle(gx + lx * ca - lz * sa, gz + lx * sa + lz * ca, r, gy + t);
        const sh = new THREE.Shape(); sh.moveTo(-11, -3); sh.lineTo(11, -3); sh.lineTo(11, 23); sh.lineTo(-11, 23); sh.closePath();
        const hole = new THREE.Path(); hole.moveTo(-6, -2.9); hole.lineTo(-6, 11); hole.absarc(0, 11, 6, Math.PI, 0, true); hole.lineTo(6, -2.9); hole.closePath(); sh.holes.push(hole);
        add(new THREE.ExtrudeGeometry(sh, { depth: 9, bevelEnabled: false, curveSegments: 20 }).translate(0, 0, -4.5), 0, 0, 0);
        add(new THREE.BoxGeometry(24, 1.2, 10.6), 0, 23.6, 0, pale); add(new THREE.BoxGeometry(15, 3.2, 7.6), 0, 25.8, 0); add(new THREE.BoxGeometry(16.2, 0.6, 8.6), 0, 27.7, 0, pale);
        add(new THREE.IcosahedronGeometry(1.7, 1), 0, 29.6, 0, pale); for (const s2 of [-1, 1]) { add(new THREE.ConeGeometry(0.9, 3.4, 6), s2 * 2.2, 29.6, 0, pale); add(new THREE.ConeGeometry(0.7, 2.4, 6), s2 * 4.2, 29.1, 0, pale); add(new THREE.ConeGeometry(0.6, 2.2, 6), s2 * 10, 25.3, 0, pale); }
        for (const zs of [-1, 1]) { add(new THREE.CylinderGeometry(1.1, 1.1, 0.4, 16).rotateX(Math.PI / 2), 0, 19.6, zs * 4.6, dark); for (const xs of [-10, -7.5, 7.5, 10]) add(new THREE.CylinderGeometry(0.75, 0.85, 20, 10), xs, 8, zs * 4.9, pale); }
        solid(-8.6, 0, 3.3, 23); solid(8.6, 0, 3.3, 23);
        for (const sd of [-1, 1]) {
          const inner = 11, outer = half - 8, len = outer - inner, mid = sd * (inner + outer) / 2, n = Math.max(3, Math.round(len / 4.6));
          add(new THREE.BoxGeometry(len, 3, 6.8), mid, -1.2, 0); add(new THREE.BoxGeometry(len, 1.8, 6.4), mid, 10.9, 0); add(new THREE.BoxGeometry(len + 0.6, 0.5, 7.2), mid, 12.05, 0, pale); add(new THREE.BoxGeometry(len, 0.9, 5.6), mid, 12.7, 0);
          for (let k = 0; k <= n; k++) { const x = sd * (inner + 1.2 + (k * (len - 2.4)) / n); for (const zs of [-1, 1]) add(new THREE.CylinderGeometry(0.5, 0.6, 12, 10), x, 4, zs * 2.3, pale); solid(x, 0, 1.0, 12.5); }
          const px = sd * (half - 4); add(new THREE.BoxGeometry(8, 15.5, 8.5), px, 5.75, 0); add(new THREE.BoxGeometry(9, 0.7, 9.5), px, 13.85, 0, pale); add(new THREE.IcosahedronGeometry(1.5, 1), px, 15.6, 0, pale); add(new THREE.ConeGeometry(0.8, 2.6, 6), px + 1.6, 15.5, 0, pale);
          for (const zs of [-1, 1]) add(new THREE.BoxGeometry(4.6, 6.5, 0.3), px, 6.5, zs * 4.3, pale); solid(px, 0, 4.7, 14);
        }
        places.push({ n: src.n, x: gx, z: gz, top: gy + 30, r: 55 }); continue;
      }
      if (amphSet.has(src.n) && amph) { // tiered open-air seating fanning out from a round stage
        const { sx, sz, ri, ro, a0, a1, NT, step, by } = amph, seat = new THREE.MeshLambertMaterial({ color: 0xbdb9ad, emissive: 0x2a2924 }), seat2 = new THREE.MeshLambertMaterial({ color: 0xa9a598, emissive: 0x24231f });
        for (let i = 0; i < NT; i++) {
          const r0 = ri + ((ro - ri) * i) / NT, r1 = ri + ((ro - ri) * (i + 1)) / NT, ttop = by + 0.3 + i * step, s2 = new THREE.Shape(); s2.absarc(0, 0, r1, -a1, -a0, false); s2.absarc(0, 0, r0, -a0, -a1, true); s2.closePath();
          const tm = new THREE.Mesh(new THREE.ExtrudeGeometry(s2, { depth: ttop - (by - 3), bevelEnabled: false, curveSegments: 36 }).rotateX(-Math.PI / 2), i % 2 ? seat2 : seat); tm.position.set(sx, by - 3, sz); tm.castShadow = tm.receiveShadow = true; world.add(tm);
          const poly = [], NS = 26; for (let k = 0; k <= NS; k++) { const a = a0 + ((a1 - a0) * k) / NS; poly.push([sx + Math.cos(a) * r1, sz + Math.sin(a) * r1]); } for (let k = NS; k >= 0; k--) { const a = a0 + ((a1 - a0) * k) / NS; poly.push([sx + Math.cos(a) * r0, sz + Math.sin(a) * r0]); }
          addRec(poly, ttop, src.n);
        }
        const st = new THREE.Mesh(new THREE.CylinderGeometry(ri * 0.94, ri * 0.94, 3, 40), new THREE.MeshLambertMaterial({ color: 0xd8d4c6, emissive: 0x3a382f })); st.position.set(sx, by - 1.38, sz); st.receiveShadow = true; world.add(st);
        const alm = LMK.find((l) => l.name === src.n && l.model);
        if (alm) { // hand-made round colonnade on the stage, its open side facing the seats
          const D = ri * 0.94 * 2 * (alm.scale || 1), phi = (a0 + a1) / 2, myWorld = world, H = new THREE.Group();
          H.position.set(sx, by + 0.12, sz); H.rotation.y = Math.PI / 2 - phi + ((alm.rot || 0) * Math.PI) / 180; world.add(H);
          new GLTFLoader().load(alm.model, (g) => {
            if (world !== myWorld) return; const m = g.scene, box = new THREE.Box3().setFromObject(m), size = box.getSize(new THREE.Vector3()), k = D / Math.max(size.x, size.z);
            floodlight(m, alm);
            m.position.set(-(box.min.x + box.max.x) / 2, -box.min.y, -(box.min.z + box.max.z) / 2); const sc = new THREE.Group(); sc.add(m); sc.scale.setScalar(k); H.add(sc);
            meshCollider(sc); // the columns themselves are solid; the gaps between them are not
          }, undefined, () => console.warn('amphitheatre model failed', alm.model));
        }
        places.push({ n: src.n, x: sx, z: sz, top: by + 7, r: 65 }); continue;
      }
      const lh = look.get(src.n), hh = lh && !lh.model && lh.height ? lh.height : src.h; // a recoloured landmark may also set its height (e.g. low hanok halls)
      const top = avgT + hh, bot = minT - 1.5, sgn = area > 0 ? 1 : -1, floorH = hh / Math.max(1, lh && lh.height ? 1 : src.l);
      const pal = src.c ? campusWalls : src.k === 'apartments' ? aptWalls : otherWalls;
      C.set(pal[idx % pal.length]); if (look.get(src.n)?.wall) C.set(look.get(src.n).wall); const cr = C.r, cg = C.g, cb = C.b;
      const custom = look.get(src.n)?.model ? look.get(src.n) : null; // a hand-made 3D model replaces the extruded block (collision still uses the footprint)
      const fit = custom ? placeBuildingModel(custom, p, minT, src.h) : null;
      if (!custom) for (let i = 0; i < p.length; i++) {
        const a = p[i], b = p[(i + 1) % p.length], dx = b[0] - a[0], dz = b[1] - a[1], len = Math.hypot(dx, dz); if (len < 0.05) continue;
        const nx = (sgn * dz) / len, nz = (-sgn * dx) / len, bays = Math.max(1, Math.round(len / 3.4)), v0 = 0, v1 = (top - bot) / floorH;
        wp.push(a[0], top, a[1], b[0], top, b[1], b[0], bot, b[1], a[0], top, a[1], b[0], bot, b[1], a[0], bot, a[1]);
        wu.push(0, v0, bays, v0, bays, v1, 0, v0, bays, v1, 0, v1);
        for (let k = 0; k < 6; k++) { wn.push(nx, 0, nz); wc.push(cr, cg, cb); }
      }
      const tris = THREE.ShapeUtils.triangulateShape(p.map((q) => new THREE.Vector2(q[0], q[1])), []);
      C.set((src.c ? campusRoofs : otherRoofs)[idx % (src.c ? campusRoofs.length : otherRoofs.length)]); if (look.get(src.n)?.roof) C.set(look.get(src.n).roof);
      if (!custom) for (const t of tris) for (const vi of t) { rp.push(p[vi][0], top, p[vi][1]); rc.push(C.r, C.g, C.b); }
      const rec = fit ? { p: fit.poly, minx: Math.min(...fit.poly.map((q) => q[0])), maxx: Math.max(...fit.poly.map((q) => q[0])), minz: Math.min(...fit.poly.map((q) => q[1])), maxz: Math.max(...fit.poly.map((q) => q[1])), top: fit.top, n: src.n, c: src.c, cx, cz } : { p, minx, maxx, minz, maxz, top, n: src.n, c: src.c, cx, cz };
      buildings.push(rec);
      for (let i = Math.floor(rec.minx / BCELL); i <= Math.floor(rec.maxx / BCELL); i++) for (let j = Math.floor(rec.minz / BCELL); j <= Math.floor(rec.maxz / BCELL); j++) { const k = i + ',' + j; let a = bGrid.get(k); if (!a) bGrid.set(k, (a = [])); a.push(rec); }
      if (src.c && src.n) places.push({ n: src.n, x: cx, z: cz, top, r: Math.max(40, Math.hypot(maxx - minx, maxz - minz) * 0.75) });
      if (domeSet.has(src.n)) { const dome = new THREE.Mesh(new THREE.SphereGeometry(5, 20, 12, 0, 6.3, 0, Math.PI / 2), new THREE.MeshLambertMaterial({ color: 0xf4f4f1 })); dome.position.set(cx, top, cz); dome.castShadow = true; world.add(dome); }
    }
    const wg = new THREE.BufferGeometry(); wg.setAttribute('position', new THREE.Float32BufferAttribute(wp, 3)); wg.setAttribute('normal', new THREE.Float32BufferAttribute(wn, 3)); wg.setAttribute('uv', new THREE.Float32BufferAttribute(wu, 2)); wg.setAttribute('color', new THREE.Float32BufferAttribute(wc, 3));
    const litTex = canvasTex((c, s) => { c.fillStyle = '#000'; c.fillRect(0, 0, s, s); const n = 8, q = s / n, warm = ['#ffd98a', '#ffe7b5', '#ffcf7a', '#dfeaff']; for (let i = 0; i < n; i++) for (let k = 0; k < n; k++) if (rnd() < 0.4) { c.fillStyle = warm[(rnd() * warm.length) | 0]; c.globalAlpha = rr(0.55, 1); c.fillRect((i + 0.31) * q, (k + 0.24) * q, q * 0.38, q * 0.42); } c.globalAlpha = 1; }, 512);
    litTex.wrapS = litTex.wrapT = THREE.RepeatWrapping; litTex.repeat.set(1 / 8, 1 / 8); litTex.anisotropy = 8;
    const walls = new THREE.Mesh(wg, new THREE.MeshLambertMaterial({ map: wallTex, vertexColors: true, side: THREE.DoubleSide, emissive: 0xffffff, emissiveMap: litTex, emissiveIntensity: L.windows })); walls.castShadow = walls.receiveShadow = true; walls.frustumCulled = false; world.add(walls);
    const rg = new THREE.BufferGeometry(); rg.setAttribute('position', new THREE.Float32BufferAttribute(rp, 3)); rg.setAttribute('color', new THREE.Float32BufferAttribute(rc, 3)); const rnorm = new Float32Array(rp.length); for (let i = 1; i < rnorm.length; i += 3) rnorm[i] = 1; rg.setAttribute('normal', new THREE.BufferAttribute(rnorm, 3));
    const roofs = new THREE.Mesh(rg, new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide })); roofs.castShadow = roofs.receiveShadow = true; roofs.frustumCulled = false; world.add(roofs);
  }
  // free-standing models the map has no footprint for (kind 'sculpture'): pos, yaw° (model +X direction), scale = model width in metres,
  // shift = slide along its width (fraction) so an opening sits on the road, solids = [[xFraction, radiusFraction], …] collision posts
  for (const l of LMK) if (l.kind === 'sculpture' && l.model && l.pos) {
    const [x, z] = l.pos, gy = terrainH(x, z), s = l.scale || 20, yaw = ((l.yaw || 0) * Math.PI) / 180, ca = Math.cos(yaw), sa = Math.sin(yaw), myWorld = world;
    const H = new THREE.Group(); H.position.set(x, gy - 0.2, z); H.rotation.y = -yaw; world.add(H);
    new GLTFLoader().load(l.model, (g) => {
      if (world !== myWorld) return; const m = g.scene, box = new THREE.Box3().setFromObject(m), size = box.getSize(new THREE.Vector3()), k = s / size.x;
      floodlight(m, l);
      m.position.set(-(box.min.x + box.max.x) / 2 - (l.shift || 0) * size.x, -box.min.y, -(box.min.z + box.max.z) / 2); const sc = new THREE.Group(); sc.add(m); sc.scale.setScalar(k); H.add(sc);
      meshCollider(sc); // collision follows the model's shape
    }, undefined, () => console.warn('sculpture model failed', l.model));
    places.push({ n: l.name, x, z, top: gy + (l.height || s * 0.9), r: 40 });
  }
  // named open spaces that the map data doesn't name (kind 'place', pos = centre, r = radius): sign + teleport target
  for (const l of LMK) if (l.kind === 'place' && l.pos) places.push({ n: l.name, x: l.pos[0], z: l.pos[1], top: terrainH(l.pos[0], l.pos[1]) + 4, r: l.r || 50 });
  for (const a of D.areas) if (a.k === 'pitch' && stadiumSet.has(a.n)) { const cx = a.p.reduce((s, p) => s + p[0], 0) / a.p.length, cz = a.p.reduce((s, p) => s + p[1], 0) / a.p.length; places.push({ n: a.n, x: cx, z: cz, top: terrainH(cx, cz) + 6, r: 70 }); }
  // name labels over campus landmarks
  for (const pl of places) {
    const tex = canvasTex((c, w, h) => { c.font = '700 54px "Apple SD Gothic Neo","Malgun Gothic","Noto Sans KR",sans-serif'; const tw = Math.min(w - 40, c.measureText(pl.n).width + 56), x = (w - tw) / 2; c.fillStyle = 'rgba(28,40,32,0.82)'; c.beginPath(); c.roundRect(x, 18, tw, 92, 46); c.fill(); c.fillStyle = '#fffdf4'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(pl.n, w / 2, 66, w - 70); }, 768, 128);
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, fog: false })); sp.scale.set(42, 7, 1); sp.position.set(pl.x, pl.top + 7, pl.z); world.add(sp); labels.push(sp);
  }
  // ── trees: woods, parks, campus lawns and street trees ──
  {
    const N = LOW ? 700 : 3000, trunk = instanced(new THREE.CylinderGeometry(0.22, 0.34, 1, 6).translate(0, 0.5, 0), flat(0x7a5a3c), N), pine = instanced(new THREE.ConeGeometry(1, 1, 7).translate(0, 0.5, 0), flat(0xffffff), N * 3), round = instanced(new THREE.IcosahedronGeometry(1, 1), flat(0xffffff), N * 3);
    const greens = [0x3f8f4a, 0x4c9c4f, 0x2f7d47, 0x5aa850, 0x6fb24a, 0x7fb85a];
    const okTree = (x, z) => { for (const [ox, oz] of [[0, 0], [2.6, 0], [-2.6, 0], [0, 2.6], [0, -2.6]]) if (cls(x + ox, z + oz) > 2) return false; return true; };
    let placed = 0;
    const tree = (x, z, type) => {
      if (placed >= N) return; const y = terrainH(x, z) - 0.15, s = rr(0.9, 1.7), col = C.set(greens[(rnd() * greens.length) | 0]).clone();
      if (type) { const th = 1.6 * s; put(trunk, x, y, z, s, th, s); for (let k = 0; k < 3; k++) put(pine, x, y + th * 0.75 + k * 1.15 * s, z, (1.9 - k * 0.45) * s, 2.1 * s, (1.9 - k * 0.45) * s, rnd() * 6, col); }
      else { const th = 2.6 * s; put(trunk, x, y, z, s * 1.1, th, s * 1.1); put(round, x, y + th + 0.9 * s, z, 1.9 * s, 1.7 * s, 1.9 * s, rnd() * 6, col); put(round, x + 0.9 * s, y + th + 0.3 * s, z + 0.3 * s, 1.2 * s, 1.1 * s, 1.2 * s, rnd() * 6, col); put(round, x - 0.8 * s, y + th + 0.5 * s, z - 0.5 * s, 1.3 * s, 1.1 * s, 1.3 * s, rnd() * 6, col); }
      addCircle(x, z, 0.42 * s, y + 30); placed++;
    };
    for (const t of D.trees) if (okTree(t[0], t[1])) tree(t[0], t[1], 0);
    for (const r of D.roads) if (r.t === 'road' && r.w >= 6) { let acc = rr(0, 16); for (let i = 0; i + 1 < r.p.length; i++) { const a = r.p[i], b = r.p[i + 1], dx = b[0] - a[0], dz = b[1] - a[1], len = Math.hypot(dx, dz); if (len < 0.1) continue; for (; acc < len; acc += 17) for (const sd of [-1, 1]) { const x = a[0] + (dx * acc) / len + ((-dz / len) * sd) * (r.w / 2 + 3.2), z = a[1] + (dz * acc) / len + ((dx / len) * sd) * (r.w / 2 + 3.2); if (Math.abs(x) < 800 && Math.abs(z) < 800 && okTree(x, z) && !(PLAY.treeClear || []).some(([qx, qz, qr]) => Math.hypot(x - qx, z - qz) <= qr)) tree(x, z, 0); } acc -= len; } }
    const street = placed;
    for (let t = 0; t < 90000 && placed < N; t++) { const x = rr(-820, 820), z = rr(-820, 820); if (!okTree(x, z)) continue; const c = cls(x, z); if (rnd() > (c === 2 ? 0.85 : c === 1 ? 0.3 : 0.035)) continue; tree(x, z, c === 2 ? (rnd() < 0.6 ? 1 : 0) : rnd() < 0.25 ? 1 : 0); }
    void street;
    const R = LOW ? 40 : 160, rocks = instanced(new THREE.DodecahedronGeometry(1, 0), flat(0xffffff), R), greys = [0x9a9c97, 0x85888a, 0xa7a49b, 0x777b7c];
    for (let t = 0; t < 8000 && rocks.count < R; t++) { const x = rr(-760, 760), z = rr(-760, 760), c = cls(x, z); if (c > 2 || cls(x + 3, z) > 2 || cls(x - 3, z) > 2 || cls(x, z + 3) > 2 || cls(x, z - 3) > 2 || (c === 0 && rnd() < 0.7)) continue; const s = rnd() < 0.2 ? rr(1.5, 2.6) : rr(0.4, 1.1), sy = rr(0.55, 0.9), y = terrainH(x, z); put(rocks, x, y + s * sy * 0.35, z, s, s * sy, s * rr(0.8, 1.1), rnd() * 6, C.set(greys[(rnd() * 4) | 0]).clone(), rr(-0.2, 0.2), rr(-0.2, 0.2)); addCircle(x, z, s * 0.78, y + s * sy * 1.05); }
    const F = LOW ? 300 : 2500, fl = instanced(new THREE.SphereGeometry(0.13, 6, 5), new THREE.MeshLambertMaterial({ color: 0xffffff }), F, false), cols = [0xfff3a8, 0xffffff, 0xf7a8c4, 0xb9a4f5, 0xff9c6b];
    for (let t = 0; t < 60000 && fl.count < F; t++) { const x = rr(-720, 720), z = rr(-720, 720); if (cls(x, z) > 1) continue; put(fl, x, terrainH(x, z) + rr(0.22, 0.4), z, 1, 0.7, 1, 0, C.set(cols[(rnd() * cols.length) | 0]).clone()); }
    const TG = LOW ? 30 : 76; tufts = new THREE.InstancedMesh(new THREE.ConeGeometry(0.055, 0.36, 3).translate(0, 0.18, 0), new THREE.MeshLambertMaterial({ color: 0xffffff }), TG * TG); tufts.receiveShadow = true; tufts.frustumCulled = false; tufts.userData.n = TG; world.add(tufts);
  }
  // ── street lamps along roads and campus paths ──
  {
    const pts = [], seen = new Set(), N = LOW ? 500 : 2400;
    const tryLamp = (x, z) => { if (pts.length >= N || Math.abs(x) > 790 || Math.abs(z) > 790 || cls(x, z) > 2) return; const k = Math.round(x / 15) + ',' + Math.round(z / 15); if (seen.has(k)) return; seen.add(k); pts.push([x, z]); };
    for (const pass of ['foot', 'road']) for (const r of D.roads) {
      if (r.t !== pass) continue; if (r.t === 'road' ? r.w < 4.5 : !D.campus.some((c) => pip(r.p[0][0], r.p[0][1], c))) continue;
      const step = r.t === 'road' ? 30 : 27; let acc = step * 0.5, side = 1;
      for (let i = 0; i + 1 < r.p.length; i++) { const a = r.p[i], b = r.p[i + 1], dx = b[0] - a[0], dz = b[1] - a[1], len = Math.hypot(dx, dz); if (len < 0.1) continue; for (; acc < len; acc += step) { const off = r.w / 2 + 1.1; tryLamp(a[0] + (dx * acc) / len + (-dz / len) * side * off, a[1] + (dz * acc) / len + (dx / len) * side * off); side = -side; } acc -= len; }
    }
    const poles = instanced(new THREE.CylinderGeometry(0.07, 0.11, 5.2, 6).translate(0, 2.6, 0), flat(0x2b2f38), pts.length, false), arms = instanced(new THREE.BoxGeometry(0.5, 0.16, 0.5).translate(0, 5.28, 0), flat(0x2b2f38), pts.length, false);
    const bulbs = instanced(new THREE.SphereGeometry(0.22, 10, 8).translate(0, 5.05, 0), new THREE.MeshBasicMaterial({ color: 0xffe9b8 }), pts.length, false); bulbs.receiveShadow = false;
    const gp = new Float32Array(pts.length * 3);
    pts.forEach(([x, z], i) => { const y = terrainH(x, z) - 0.1; put(poles, x, y, z, 1, 1, 1); put(arms, x, y, z, 1, 1, 1); put(bulbs, x, y, z, 1, 1, 1); gp[i * 3] = x; gp[i * 3 + 1] = y + 5.05; gp[i * 3 + 2] = z; addCircle(x, z, 0.16, y + 5.3); const k = Math.floor(x / 40) + ',' + Math.floor(z / 40); let a = lampGrid.get(k); if (!a) lampGrid.set(k, (a = [])); a.push([x, y + 4.9, z]); });
    const gg = new THREE.BufferGeometry(); gg.setAttribute('position', new THREE.BufferAttribute(gp, 3)); const halo = new THREE.Points(gg, new THREE.PointsMaterial({ map: glowTex, color: 0xffc97a, size: 6.5, sizeAttenuation: true, transparent: true, opacity: 0.85, depthWrite: false, blending: THREE.AdditiveBlending })); halo.frustumCulled = false; world.add(halo);
    // light pools baked into an emissive layer of the ground, tinted by the ground itself
    const ES = LOW ? 1024 : 2048, ec = document.createElement('canvas'); ec.width = ec.height = ES; const e = ec.getContext('2d'), ke = ES / SPAN; e.fillStyle = '#000'; e.fillRect(0, 0, ES, ES); e.globalCompositeOperation = 'lighter';
    for (const [x, z] of pts) { const cx = (x + GHALF) * ke, cy = (z + GHALF) * ke, rad = 15 * ke, gr = e.createRadialGradient(cx, cy, 0, cx, cy, rad); gr.addColorStop(0, 'rgba(255,214,150,0.95)'); gr.addColorStop(0.35, 'rgba(255,196,120,0.5)'); gr.addColorStop(1, 'rgba(255,180,100,0)'); e.fillStyle = gr; e.fillRect(cx - rad, cy - rad, rad * 2, rad * 2); }
    e.globalCompositeOperation = 'multiply'; e.drawImage(gc, 0, 0, ES, ES);
    const etex = new THREE.CanvasTexture(ec); etex.colorSpace = THREE.SRGBColorSpace; etex.anisotropy = 4; groundMat.emissiveMap = etex; groundMat.emissive.set(0xffffff); groundMat.emissiveIntensity = L.groundGlow; groundMat.needsUpdate = true;
    for (let i = 0; i < 8; i++) { const l = new THREE.PointLight(0xffd29a, 0, 34, 2); world.add(l); lampLights.push(l); }
    lantern = new THREE.PointLight(0xfff1d8, L.lantern, 11, 2); world.add(lantern);
    places.lampCount = pts.length;
  }
  { const cm = new THREE.MeshLambertMaterial({ color: L.clouds.color, emissive: L.clouds.emissive, fog: false, flatShading: true }); for (let i = 0; i < 22; i++) { const gp = new THREE.Group(); for (let k = 0; k < 5; k++) { const pz = new THREE.Mesh(new THREE.IcosahedronGeometry(rr(12, 24), 1), cm); pz.position.set(rr(-30, 30), rr(-4, 5), rr(-12, 12)); pz.scale.y = 0.55; gp.add(pz); } gp.position.set(rr(-1300, 1300), rr(230, 330), rr(-1300, 1300)); world.add(gp); clouds.push(gp); } }
  // (the lawn creatures are gone — wild pets from wild-pets.js live on the campus instead)
  // spawn by the main gate (inside, or outside if dist < 0), facing into the campus
  const SP = northUp(campus) ? mirrorSpawn(campus.spawn || {}) : campus.spawn || {}, gate = places.find((p) => p.n === SP.from) || places[0] || { x: 0, z: 0 };
  const lib = places.find((p) => p.n === SP.toward) || { x: gate.x, z: gate.z + 100 };
  let sx, sz, syaw;
  if (SP.at) { [sx, sz] = SP.at; const lk = SP.look ? { x: SP.look[0], z: SP.look[1] } : lib; syaw = Math.atan2(lk.x - sx, lk.z - sz); } // fixed spot (e.g. the street outside a gate the map has no building for)
  else { const d = Math.hypot(lib.x - gate.x, lib.z - gate.z) || 1, SD = SP.dist || 16; [sx, sz] = freeSpot(gate.x + ((lib.x - gate.x) / d) * SD, gate.z + ((lib.z - gate.z) / d) * SD, 5); syaw = Math.atan2(lib.x - gate.x, lib.z - gate.z); }
  spawnPoint = { x: sx, z: sz, yaw: syaw }; npcPlan = { from: [sx, sz], to: [lib.x, lib.z] }; clearNpcs();
  player.pos.set(sx, terrainH(sx, sz), sz); player.yaw = syaw; camYaw = player.yaw + Math.PI; camTarget.set(sx, player.pos.y + 1.25, sz); player.vel.set(0, 0, 0); camDistCur = camDist;
  setCount();
}
function updateTufts(px, pz) {
  const TS = 1.8, n = tufts.userData.n, cx = Math.round(px / TS), cz = Math.round(pz / TS); if (cx === tcx && cz === tcz) return; tcx = cx; tcz = cz; let k = 0;
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
    const gx = cx + i - (n >> 1), gz = cz + j - (n >> 1), x = (gx + hash(gx, gz, 1)) * TS, z = (gz + hash(gx, gz, 2)) * TS, h = hash(gx, gz, 3), c = cls(x, z), s = c > 2 || h < 0.18 ? 0 : 0.6 + h * 0.9;
    Q.setFromEuler(E.set((hash(gx, gz, 4) - 0.5) * 0.4, h * 6.28, (hash(gx, gz, 5) - 0.5) * 0.4)); M4.compose(V.set(x, s ? terrainH(x, z) - 0.03 : -500, z), Q, S.set(s, s * (0.8 + hash(gx, gz, 6) * 0.9), s)); tufts.setMatrixAt(k, M4);
    C.setHSL(0.25 + hash(gx, gz, 7) * 0.06, 0.5, 0.25 + hash(gx, gz, 8) * 0.11); tufts.setColorAt(k, C); k++;
  }
  tufts.instanceMatrix.needsUpdate = true; if (tufts.instanceColor) tufts.instanceColor.needsUpdate = true;
}

// ── sprites / fx ───────────────────────────────────────────────────────────
const glowTex = canvasTex((g, s) => { const gr = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2); gr.addColorStop(0, 'rgba(255,240,170,1)'); gr.addColorStop(0.35, 'rgba(255,210,90,0.55)'); gr.addColorStop(1, 'rgba(255,200,60,0)'); g.fillStyle = gr; g.fillRect(0, 0, s, s); });
const heartTex = canvasTex((g, s) => { g.fillStyle = '#ff5c8a'; g.font = `${s * 0.85}px serif`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('♥', s / 2, s / 2 + 4); });
const dustTex = canvasTex((g, s) => { const gr = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2); gr.addColorStop(0, 'rgba(255,255,255,0.9)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, s, s); });
const KEEP_TEX = new Set([glowTex, heartTex, dustTex]); // shared across campuses — never disposed
function disposeMaterial(mat) { for (const k of ['map', 'emissiveMap']) { const t = mat[k]; if (t && !KEEP_TEX.has(t)) t.dispose(); } mat.dispose(); }
// Free everything the current campus allocated (GPU buffers, textures, collision grids) before another one is built.
// ── strolling NPCs: snowmen (count by campus size)  wander between named places on campus along the roads; they stop and wave 👋 when you come close ──
const npcGroup = new THREE.Group(); scene.add(npcGroup);
let npcs = [], npcPlan = null, roadGraph = null;
function clearNpcs() { for (const n of npcs) npcGroup.remove(n.root); npcs = []; roadGraph = null; }
// the map's roads and footpaths as a graph (their polylines share points at junctions)
function buildRoadGraph() {
  const key = (p) => p[0].toFixed(1) + ',' + p[1].toFixed(1), pts = new Map(), adj = new Map();
  const node = (p) => { const k = key(p); if (!pts.has(k)) { pts.set(k, p); adj.set(k, []); } return k; };
  for (const r of D.roads) for (let i = 0; i + 1 < r.p.length; i++) { const a = node(r.p[i]), b = node(r.p[i + 1]), w = Math.hypot(r.p[i][0] - r.p[i + 1][0], r.p[i][1] - r.p[i + 1][1]); adj.get(a).push([b, w]); adj.get(b).push([a, w]); }
  return { pts, adj, list: [...pts.entries()] };
}
function roadRoute(from, to) {
  const G = roadGraph || (roadGraph = buildRoadGraph()), { pts, adj } = G;
  const nearest = (p) => { let best = null, bd = 1e9; for (const [k, q] of G.list) { const d = (q[0] - p[0]) ** 2 + (q[1] - p[1]) ** 2; if (d < bd) { bd = d; best = k; } } return best; };
  const s0 = nearest(from), t0 = nearest(to); if (!s0 || !t0) return null;
  const dist = new Map([[s0, 0]]), prev = new Map(), done = new Set(), heap = [[0, s0]];
  const push = (e) => { heap.push(e); let i = heap.length - 1; while (i > 0) { const p = (i - 1) >> 1; if (heap[p][0] <= heap[i][0]) break; [heap[p], heap[i]] = [heap[i], heap[p]]; i = p; } };
  const pop = () => { const top = heap[0], last = heap.pop(); if (heap.length) { heap[0] = last; let i = 0; for (;;) { const l = 2 * i + 1, r = l + 1; let m = i; if (l < heap.length && heap[l][0] < heap[m][0]) m = l; if (r < heap.length && heap[r][0] < heap[m][0]) m = r; if (m === i) break; [heap[m], heap[i]] = [heap[i], heap[m]]; i = m; } } return top; };
  while (heap.length) { const [d, k] = pop(); if (done.has(k)) continue; done.add(k); if (k === t0) break;
    for (const [n, w] of adj.get(k)) { const nd = d + w; if (nd < (dist.get(n) ?? 1e12)) { dist.set(n, nd); prev.set(n, k); push([nd, n]); } } }
  if (!prev.has(t0) && s0 !== t0) return null;
  const path = [pts.get(t0)]; let k = t0; while (prev.has(k)) { k = prev.get(k); path.push(pts.get(k)); } path.reverse();
  return [from, ...path, to];
}
function makeLeg(pts) { const len = []; let total = 0; for (let i = 0; i + 1 < pts.length; i++) { const L = Math.hypot(pts[i + 1][0] - pts[i][0], pts[i + 1][1] - pts[i][1]); len.push(L); total += L; } return { pts, len, total }; }
function routeAt(route, d) { // point + heading at distance d along the route
  for (let i = 0; i + 1 < route.pts.length; i++) { const L = route.len[i]; if (d <= L || i + 2 === route.pts.length) { const a = route.pts[i], b = route.pts[i + 1], t = L ? Math.min(1, Math.max(0, d / L)) : 0; return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, Math.atan2(b[0] - a[0], b[1] - a[1])]; } d -= L; }
  const p = route.pts[route.pts.length - 1]; return [p[0], p[1], 0];
}
// campus places NPCs walk between (named buildings / squares on campus, within the playable area)
const npcSpots = () => places.filter((p) => Math.abs(p.x) < HALF - 20 && Math.abs(p.z) < HALF - 20);
function nextLeg(n) {
  const spots = npcSpots(); if (!spots.length) return false;
  const here = [n.x, n.z]; let to;
  for (let tries = 0; tries < 6; tries++) { const q = spots[Math.floor(Math.random() * spots.length)], dd = Math.hypot(q.x - here[0], q.z - here[1]); to = q; if (dd > 60 && dd < 650) break; } // a walk, not a marathon
  const [tx, tz] = freeSpot(to.x, to.z, Math.min(30, to.r || 20));
  n.leg = makeLeg(roadRoute(here, [tx, tz]) || [here, [tx, tz]]); n.d = 0; n.goal = to.n; return true;
}
const waveTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 96; const g = c.getContext('2d'); g.font = '72px system-ui, "Apple Color Emoji", sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('👋', 48, 52); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; })();
// NPCs nearby copy what you do: an emote (1–4) or a jump, a moment later, turning to you while they do it
const MIMIC_R = 18, npcEmoTex = new Map();
const emoTex = (ch) => { if (!npcEmoTex.has(ch)) { const c = document.createElement('canvas'); c.width = c.height = 96; const g = c.getContext('2d'); g.font = '72px system-ui, "Apple Color Emoji", sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(ch, 48, 52); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; npcEmoTex.set(ch, t); } return npcEmoTex.get(ch); };
let npcAir = false;
function npcMimic(kind, ch) {
  if (!started) return;
  for (const n of npcs) if (Math.hypot(player.pos.x - n.x, player.pos.z - n.z) < MIMIC_R) (n.mimicQ || (n.mimicQ = [])).push({ kind, ch, delay: 0.25 + Math.random() * 0.5 });
}
function npcMimicStep(n, dt) {
  for (const q of n.mimicQ || []) q.delay -= dt; // each copied action waits its own moment (an emote and a jump together → both)
  while (n.mimicQ && n.mimicQ.length && n.mimicQ[0].delay <= 0) {
    const q = n.mimicQ.shift(); n.faceT = 2.4;
    if (q.kind === 'jump') { if (!n.hopY) n.hopV = 4.6; }
    else { if (n.emo) { n.root.remove(n.emo); n.emo.material.dispose(); } n.emo = new THREE.Sprite(new THREE.SpriteMaterial({ map: emoTex(q.ch), transparent: true, depthTest: false })); n.emo.scale.set(0.5, 0.5, 1); n.emo.position.y = 2.25; n.emo.renderOrder = 21; n.root.add(n.emo); n.emoT = 2.2; }
  }
  if (n.hopV || n.hopY) { n.hopV -= 13 * dt; n.hopY = Math.max(0, (n.hopY || 0) + n.hopV * dt); if (!n.hopY) n.hopV = 0; }
  if (n.emo) { n.emo.position.y += dt * 0.3; if ((n.emoT -= dt) <= 0) { n.root.remove(n.emo); n.emo.material.dispose(); n.emo = null; } }
  n.faceT = Math.max(0, (n.faceT || 0) - dt);
}
// how many NPCs: by campus area (8.5 ha 외대 → 32 … 70 ha+ 경희대 국제캠·연세대·서울대 → 80); phones / low mode 20–32
function campusHa() {
  const rings = !D || !D.campus || !D.campus.length ? [] : typeof D.campus[0][0] === 'number' ? [D.campus] : D.campus; let a = 0;
  for (const r of rings) { let s = 0; for (let i = 0; i < r.length; i++) { const p = r[i], q = r[(i + 1) % r.length]; s += p[0] * q[1] - q[0] * p[1]; } a += Math.abs(s) / 2; }
  return a / 1e4 || 30;
}
function npcCountFor() {
  const t = Math.min(1, Math.max(0, (campusHa() - 10) / 60));
  return LOW ? Math.round(20 + 12 * t) : Math.round(32 + 48 * t);
}
const NPC_ACTIVE_R = 80; // NPCs further than this from the player are hidden and their animation paused (they still walk their routes)
// NPCs are low-poly snowmen: a handful of flat-shaded shapes with shared geometry/materials (no skeleton, no
// animation mixer), so 40 of them cost little. Each gets its own scarf colour and hat.
const SNOW = (() => {
  const L = (c, e = 0) => new THREE.MeshLambertMaterial({ color: c, emissive: e || 0x000000, flatShading: true });
  return {
    snow: L(0xf4f7fb, 0x3a4250), coal: L(0x26272b), carrot: L(0xf08a24, 0x4a2205), stick: L(0x6b4a2e),
    scarves: [0xd8343a, 0x2f6fd6, 0x2f9e5a, 0xf0b323, 0x8a4fd1, 0xff7aa8, 0x20a8b8].map((c) => L(c, new THREE.Color(c).multiplyScalar(0.18).getHex())),
    hatBlack: L(0x2a2a30), hatBand: L(0xc0303a),
    g: {
      b0: new THREE.IcosahedronGeometry(0.46, 1), b1: new THREE.IcosahedronGeometry(0.34, 1), b2: new THREE.IcosahedronGeometry(0.25, 1),
      dot: new THREE.IcosahedronGeometry(0.035, 0), nose: new THREE.ConeGeometry(0.045, 0.24, 6).rotateX(Math.PI / 2).translate(0, 0, 0.12),
      scarf: new THREE.TorusGeometry(0.22, 0.06, 5, 12).rotateX(Math.PI / 2), tail: new THREE.BoxGeometry(0.1, 0.32, 0.05).translate(0, -0.16, 0),
      arm: new THREE.CylinderGeometry(0.018, 0.024, 0.5, 4).rotateZ(Math.PI / 2).translate(0.25, 0, 0), twig: new THREE.CylinderGeometry(0.012, 0.014, 0.14, 4).rotateZ(-0.9).translate(0.47, 0.05, 0),
      top: new THREE.CylinderGeometry(0.15, 0.15, 0.26, 10), brim: new THREE.CylinderGeometry(0.25, 0.25, 0.025, 12), band: new THREE.CylinderGeometry(0.155, 0.155, 0.05, 10),
      beanie: new THREE.SphereGeometry(0.2, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), pom: new THREE.IcosahedronGeometry(0.065, 0),
    },
  };
})();
function makeSnowman() {
  const S = SNOW, g = S.g, body = new THREE.Group(), mesh = (geo, mat, x, y, z) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = true; body.add(m); return m; };
  const k = 0.92 + Math.random() * 0.16; body.scale.setScalar(k);
  mesh(g.b0, S.snow, 0, 0.42, 0).scale.set(1, 0.92, 1); mesh(g.b1, S.snow, 0, 1.0, 0); mesh(g.b2, S.snow, 0, 1.46, 0);
  for (const sx of [-1, 1]) mesh(g.dot, S.coal, sx * 0.085, 1.52, 0.215);
  mesh(g.nose, S.carrot, 0, 1.47, 0.22);
  for (let i = 0; i < 5; i++) { const a = (i - 2) * 0.32; mesh(g.dot, S.coal, Math.sin(a) * 0.15, 1.38 - Math.cos(a) * 0.04 + 0.02, 0.2).scale.setScalar(0.7); } // smile
  for (let i = 0; i < 3; i++) mesh(g.dot, S.coal, 0, 1.12 - i * 0.17 - (i === 2 ? 0.03 : 0), 0.33 - i * 0.015);
  const sc = S.scarves[(Math.random() * S.scarves.length) | 0]; mesh(g.scarf, sc, 0, 1.27, 0); mesh(g.tail, sc, 0.11, 1.25, 0.18).rotation.z = 0.15;
  const arms = [-1, 1].map((sd) => { const a = new THREE.Group(); a.position.set(sd * 0.27, 1.08, 0); a.scale.x = sd; const st = new THREE.Mesh(g.arm, S.stick), tw = new THREE.Mesh(g.twig, S.stick); a.add(st, tw); a.rotation.z = sd * 0.35; body.add(a); return a; });
  const hat = Math.random();
  if (hat < 0.4) { mesh(g.brim, S.hatBlack, 0, 1.66, 0); mesh(g.top, S.hatBlack, 0, 1.8, 0); mesh(g.band, S.hatBand, 0, 1.71, 0); }
  else if (hat < 0.8) { const c = S.scarves[(Math.random() * S.scarves.length) | 0]; mesh(g.beanie, c, 0, 1.6, 0); mesh(g.pom, S.snow, 0, 1.82, 0); }
  return { body, arms };
}
function setupNpcs() {
  if (!npcPlan || npcs.length || !npcSpots().length) return;
  const count = npcCountFor(), spots = npcSpots();
  for (let k = 0; k < count; k++) {
    const { body, arms } = makeSnowman(), root = new THREE.Group(); root.add(body); npcGroup.add(root);
    const wave = new THREE.Sprite(new THREE.SpriteMaterial({ map: waveTex, transparent: true, depthTest: false })); wave.scale.set(0.55, 0.55, 1); wave.position.y = 2.25; wave.visible = false; wave.renderOrder = 21; root.add(wave);
    const start = k < 5 ? { x: npcPlan.from[0], z: npcPlan.from[1] } : spots[Math.floor(Math.random() * spots.length)], [sx, sz] = k === 0 ? [start.x, start.z] : freeSpot(start.x, start.z, 25); // a few start by the gate so arriving feels lively
    const n = { root, body, arms, ph: Math.random() * 6.28, mixer: null, act: null, wave, x: sx, z: sz, speed: 0.8 + Math.random() * 0.4, side: (Math.random() * 2 - 1) * 1.5, wait: Math.random() * 3, yaw: Math.random() * 6.28, waveT: 0, waveCd: 0, leg: null, d: 0 };
    nextLeg(n); npcs.push(n);
  }
}
function updateNpcs(dt) {
  if (!npcs.length) { setupNpcs(); return; }
  const P = player.pos;
  { const air = !player.grounded; if (air && !npcAir && player.vel.y > 1) npcMimic('jump'); npcAir = air; } // the player just took off
  for (const n of npcs) {
    npcMimicStep(n, dt);
    const near = started && (Math.hypot(P.x - n.x, P.z - n.z) < 4.5 || n.faceT > 0); // stop for the player (or while copying them), face them, wave
    if (near && n.waveCd <= 0) { n.waveT = 2.2; n.waveCd = 25; }
    n.waveCd -= dt; n.waveT -= dt;
    let hd;
    if (near) hd = Math.atan2(P.x - n.x, P.z - n.z);
    else if (n.wait > 0) { n.wait -= dt; hd = n.yaw; if (n.wait <= 0 && n.leg && n.d >= n.leg.total) nextLeg(n); }
    else if (n.leg) {
      n.d += n.speed * dt; if (n.d >= n.leg.total) { n.d = n.leg.total; n.wait = 4 + Math.random() * 8; }
      const [x, z, h] = routeAt(n.leg, n.d); n.x = x + Math.cos(h) * n.side * Math.min(1, n.d / 6, (n.leg.total - n.d) / 6); n.z = z - Math.sin(h) * n.side * Math.min(1, n.d / 6, (n.leg.total - n.d) / 6); hd = h; // keep to one side of the path
    }
    const moving = !near && n.wait <= 0;
    const far = Math.hypot(P.x - n.x, P.z - n.z) > NPC_ACTIVE_R; n.root.visible = !far;
    if (far) { n.yaw = hd ?? n.yaw; n.wave.visible = false; continue; } // resting: no ground lookup, no animation, not drawn
    n.root.position.set(n.x, groundAt(n.x, n.z, 1e4) + (n.hopY || 0), n.z);
    if (hd != null) { let a = (hd - n.yaw) % (Math.PI * 2); if (a > Math.PI) a -= Math.PI * 2; if (a < -Math.PI) a += Math.PI * 2; n.yaw += a * (1 - Math.exp(-5 * dt)); } n.body.rotation.y = n.yaw;
    n.wave.visible = n.waveT > 0; if (n.wave.visible) { n.wave.position.y = 2.15 + Math.sin(n.waveT * 9) * 0.04; n.wave.material.rotation = Math.sin(n.waveT * 10) * 0.35; }
    if (n.arms) { // snowman: waddle side to side while walking, wave a stick arm when greeting
      n.ph += dt * (moving ? 7 : 1.5); const w = moving ? 1 : 0.25;
      n.body.rotation.z = Math.sin(n.ph) * 0.09 * w; n.body.position.y = Math.abs(Math.sin(n.ph)) * 0.05 * w;
      const r = n.arms[1]; r.rotation.z = n.waveT > 0 ? 1.3 + Math.sin(n.waveT * 12) * 0.35 : 0.35 + Math.sin(n.ph) * 0.08 * w; n.arms[0].rotation.z = -0.35 - Math.sin(n.ph) * 0.08 * w;
    }
  }
}
function unloadWorld() {
  worldReady = false;
  world.traverse((o) => { if (o.geometry) o.geometry.dispose(); if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach(disposeMaterial); if (o.isInstancedMesh) o.dispose(); });
  scene.remove(world); world = new THREE.Group(); scene.add(world);
  for (const f of fx) { scene.remove(f.sp); f.sp.material.dispose(); } fx.length = 0;
  D = null; GH = null; mask = null; groundCanvas = null; groundMat = null; lantern = null; tufts = null; tcx = tcz = 1e9; amph = null;
  buildings.length = 0; bGrid.clear(); grid.clear(); labels.length = 0; gems.length = 0; pals.length = 0; clouds.length = 0; places.length = 0; delete places.lampCount; lampGrid.clear(); lampLights.length = 0;
  coll.clear(); wildPets.clear(); // collectibles + wild pets of the old campus
  collected = 0; campusPoly = null; nearPal = null; lampT = 0; hudT = 0;
}
// Fit a building model (GLB) onto a footprint: lm.rot (degrees) first turns the model so its long side lies along X and its front faces the
// direction you want, then it's aligned to the footprint's minimum-area rectangle and stretched to length × width; height = lm.height or the map's.
// Night "facade lighting" for hand-made models: textured meshes glow with their own texture (lm.light = strength, default 0.55);
// untextured ones get the plain material `mat` with a matching glow. Without this they read as dark silhouettes at night.
function floodlight(root, lm, mat) {
  const k = lm.light ?? 0.55;
  root.traverse((o) => {
    if (!o.isMesh) return; o.castShadow = true; o.receiveShadow = true;
    if (o.material && o.material.map) { o.material.emissive = new THREE.Color(0xfff1dc); o.material.emissiveMap = o.material.map; o.material.emissiveIntensity = k; }
    else if (mat) { o.material = mat; mat.emissive = new THREE.Color(mat.color).multiplyScalar(0.62 * k / 0.55); }
  });
}
// Map files use +z = north. three.js puts +z toward the viewer, so drawn as-is a campus comes out mirrored (east on the
// left when facing north) and the minimap has south on top. So every campus is shown flipped north↔south (z → −z):
// the world matches the real campus and north is up on the maps. Applied to the map file and to every coordinate in
// its campuses.js entry (and, via mapToWorld, to collectibles / wild-pet spots). `mirror: false` turns it off for a campus.
const northUp = (c) => !!c && c.mirror !== false;
const mapToWorld = (x, z) => (northUp(campus) ? [x, -z] : [x, z]);
const NORTH_UP_SINCE = 1794974300000; // signs placed before this were stored in the old (unflipped) frame
function mirrorData(d) {
  const f = (p) => [p[0], -p[1]], fl = (a) => a.map(f);
  for (const b of d.buildings) b.p = fl(b.p); for (const r of d.roads) r.p = fl(r.p); for (const a of d.areas) a.p = fl(a.p);
  d.campus = d.campus.map(fl); d.trees = fl(d.trees || []);
  const n = d.grid.n, h = d.grid.h, out = new Array(h.length); for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) out[j * n + i] = h[(n - 1 - j) * n + i]; d.grid.h = out;
  return d;
}
function mirrorPlay(pl) {
  const q = { ...pl }, area = (a) => a && [a[0], a[1], -a[3], -a[2]];
  if (q.gemArea) q.gemArea = area(q.gemArea); if (q.palArea) q.palArea = area(q.palArea); if (q.palHome) q.palHome = [q.palHome[0], -q.palHome[1]];
  if (q.treeClear) q.treeClear = q.treeClear.map((t) => [t[0], -t[1], t[2]]); return q;
}
function mirrorSpawn(sp) { const q = { ...sp }; if (q.at) q.at = [q.at[0], -q.at[1]]; if (q.look) q.look = [q.look[0], -q.look[1]]; return q; }
// a facing angle θ (deg) flips to 180° − θ: the real (unmirrored) model then faces the mirrored direction — sculpture yaw, building-model rot
function mirrorLandmarks(list) { return list.map((l) => ({ ...l, pos: l.pos && [l.pos[0], -l.pos[1]], yaw: l.yaw != null ? 180 - l.yaw : l.yaw, rot: l.model && l.kind === 'building' ? (540 - (l.rot || 0)) % 360 : l.rot })); }
function placeBuildingModel(lm, p, baseY, mapH) {
  let best = null;
  for (let deg = 0; deg < 180; deg += 0.5) {
    const a = (deg * Math.PI) / 180, ca = Math.cos(a), sa = Math.sin(a); let u0 = 1e9, u1 = -1e9, v0 = 1e9, v1 = -1e9;
    for (const q of p) { const u = q[0] * ca + q[1] * sa, v = -q[0] * sa + q[1] * ca; u0 = Math.min(u0, u); u1 = Math.max(u1, u); v0 = Math.min(v0, v); v1 = Math.max(v1, v); }
    const area = (u1 - u0) * (v1 - v0); if (!best || area < best.area) best = { area, a, u0, u1, v0, v1 };
  }
  let { a, u0, u1, v0, v1 } = best; let L = u1 - u0, Wd = v1 - v0; if (Wd > L) { a += Math.PI / 2; [L, Wd] = [Wd, L]; [u0, u1, v0, v1] = [v0, v1, -u1, -u0]; }
  const uc = (u0 + u1) / 2, vc = (v0 + v1) / 2, cx = uc * Math.cos(a) - vc * Math.sin(a), cz = uc * Math.sin(a) + vc * Math.cos(a);
  const rect = [[u0, v0], [u1, v0], [u1, v1], [u0, v1]].map(([u, v]) => [u * Math.cos(a) - v * Math.sin(a), u * Math.sin(a) + v * Math.cos(a)]); // collision box = the stretched model's outline
  if (Math.cos(a) < 0) a += Math.PI; // so rot 0 means: model +X points (roughly) along +x, model +Z (front) along +z
  // stand the model on the highest ground under it (no part buried) and fill the gap below with a plinth down to the lowest ground
  let top = baseY; for (const q of p) top = Math.max(top, terrainH(q[0], q[1]));
  { const xs = p.map((q) => q[0]), zs = p.map((q) => q[1]), x0 = Math.min(...xs), x1 = Math.max(...xs), z0 = Math.min(...zs), z1 = Math.max(...zs);
    for (let i = 0; i <= 10; i++) for (let k = 0; k <= 10; k++) { const px = x0 + ((x1 - x0) * i) / 10, pz = z0 + ((z1 - z0) * k) / 10; if (pip(px, pz, p)) top = Math.max(top, terrainH(px, pz)); } }
  if (top - baseY > 0.4) {
    const sh = new THREE.Shape(p.map((q) => new THREE.Vector2(q[0], -q[1]))), depth = top - baseY + 1.5;
    const pl = new THREE.Mesh(new THREE.ExtrudeGeometry(sh, { depth, bevelEnabled: false }).rotateX(-Math.PI / 2), new THREE.MeshLambertMaterial({ color: lm.plinth || 0xb9b2a4, emissive: 0x1e1c18 }));
    pl.position.y = baseY - 1.5; pl.castShadow = pl.receiveShadow = true; world.add(pl);
  }
  const holder = new THREE.Group(); holder.position.set(cx, top - 0.05, cz); holder.rotation.y = -a; world.add(holder);
  const myWorld = world;
  new GLTFLoader().load(lm.model, (g) => {
    if (world !== myWorld) return; // campus changed while loading
    const m0 = g.scene, m = new THREE.Group(); m0.rotation.y = ((lm.rot || 0) * Math.PI) / 180; m.add(m0); m.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(m), size = box.getSize(new THREE.Vector3());
    const mat = new THREE.MeshLambertMaterial({ color: lm.wall || 0xe7ddca, emissive: lm.glow || 0x2b2822 });
    floodlight(m, lm, mat);
    m.position.set(-(box.min.x + box.max.x) / 2, -box.min.y, -(box.min.z + box.max.z) / 2);
    const s = new THREE.Group(); s.add(m); s.scale.set(L / size.x, (lm.height || mapH) / size.y, Wd / size.z); holder.add(s);
  }, undefined, () => console.warn('building model failed', lm.model));
  return { poly: rect, top: top + (lm.height || mapH) };
}
// ── teleport (T): spawn point, any named place on campus, or another player ──
let spawnPoint = null, tpOpen = false;
function teleport(x, z, label, yaw) {
  let sx = x, sz = z; // step out of buildings: nearest open ground around the target, closest ring first
  if (label !== '__exact') search: for (let r = 0; r <= 160; r += 2) for (let k = 0; k < Math.max(1, Math.round(r * 1.2)); k++) { const a = (k / Math.max(1, Math.round(r * 1.2))) * 6.283 + r, px = x + Math.cos(a) * r, pz = z + Math.sin(a) * r; if (!insideBuilding(px, pz, -1e4) && cls(px, pz) !== 4 && Math.abs(px) < HALF - 5 && Math.abs(pz) < HALF - 5) { sx = px; sz = pz; break search; } }
  for (let i = 0; i < 10; i++) { const a = Math.random() * 6.283; spawnFx(dustTex, player.pos.x, player.pos.y + 0.8, player.pos.z, Math.cos(a) * 2, rr(0.2, 1.4), Math.sin(a) * 2, 0.5, 0.6, 1.5); }
  player.pos.set(sx, groundAt(sx, sz, 1e4), sz); player.vel.set(0, 0, 0); if (yaw != null) { player.yaw = yaw; camYaw = yaw + Math.PI; }
  camTarget.set(sx, player.pos.y + 1.25, sz); camDistCur = camDist; player.squashV = 6;
  for (let i = 0; i < 10; i++) { const a = Math.random() * 6.283; spawnFx(dustTex, sx, player.pos.y + 0.8, sz, Math.cos(a) * 2, rr(0.2, 1.4), Math.sin(a) * 2, 0.5, 0.6, 1.5); }
}
// a place can say which side to arrive on: landmark tpToward = another place's name → land just outside, on that side
function tpToPlace(pl) {
  const lm = (campus.landmarks || []).find((l) => l.name === pl.n && l.tpToward), to = lm && places.find((q) => q.n === lm.tpToward);
  if (!to) return teleport(pl.x, pl.z, pl.n);
  const dx = to.x - pl.x, dz = to.z - pl.z, d = Math.hypot(dx, dz) || 1, ux = dx / d, uz = dz / d;
  for (let r = 0; r < d; r += 1.5) { const x = pl.x + ux * r, z = pl.z + uz * r; if (!insideBuilding(x, z, -1e4)) { const tx = x + ux * 6, tz = z + uz * 6; return teleport(tx, tz, '__exact', Math.atan2(-ux, -uz)); } }
  teleport(pl.x, pl.z, pl.n);
}
function tpRender() {
  const q = $('#tpSearch').value.trim(), list = $('#tpList'); list.replaceChildren();
  const rows = [];
  if (spawnPoint) rows.push({ g: '처음 위치', n: '🏁 시작 지점', go: () => teleport(spawnPoint.x, spawnPoint.z, '__exact', spawnPoint.yaw) });
  for (const pl of mp.players()) rows.push({ g: '플레이어', n: '🧑 ' + pl.name, go: () => teleport(pl.x + 1.5, pl.z + 1.5, pl.name) });
  const featured = new Set((campus.landmarks || []).filter((l) => l.model).map((l) => l.name)), sorted = [...places].sort((a, b) => a.n.localeCompare(b.n, 'ko'));
  for (const pl of sorted) if (featured.has(pl.n)) rows.push({ g: '⭐ 대표 건물', n: '⭐ ' + pl.n, star: true, go: () => tpToPlace(pl) }); // buildings with a hand-made 3D model
  for (const pl of sorted) if (!featured.has(pl.n)) rows.push({ g: '장소', n: '📍 ' + pl.n, go: () => tpToPlace(pl) });
  let lastG = null, shown = 0;
  for (const r of rows) {
    if (q && !r.n.includes(q)) continue; shown++;
    if (r.g !== lastG) { lastG = r.g; const h = document.createElement('li'); h.className = 'tpGroup'; h.textContent = r.g; list.append(h); }
    const li = document.createElement('li'), b = document.createElement('button'); b.type = 'button'; b.textContent = r.n; if (r.star) b.className = 'star';
    b.addEventListener('click', () => { r.go(); tpShow(false); toast(`🌀 ${r.n.replace(/^\S+ /, '')}(으)로 이동했어요`, 1.8); }); li.append(b); list.append(li);
  }
  if (!shown) { const li = document.createElement('li'); li.className = 'tpGroup'; li.textContent = '찾는 곳이 없어요'; list.append(li); }
}
function tpShow(on) {
  if (on && (!started || menuOpen || !worldReady)) return; tpOpen = on; $('#tpPanel').classList.toggle('hidden', !on);
  if (on) { for (const k in keys) keys[k] = false; if (document.pointerLockElement) document.exitPointerLock(); $('#tpSearch').value = ''; tpRender(); if (!TOUCH) $('#tpSearch').focus(); } else if (!TOUCH) lockPointer();
}
$('#tpSearch').addEventListener('input', tpRender);
$('#tpSearch').addEventListener('keydown', (e) => { e.stopPropagation(); if (e.key === 'Escape') tpShow(false); if (e.key === 'Enter') { const b = $('#tpList button'); if (b) b.click(); } });
$('#tpSearch').addEventListener('keyup', (e) => e.stopPropagation());
$('#tpClose').addEventListener('click', () => tpShow(false));
$('#mpTp').addEventListener('click', () => tpShow(!tpOpen));
window.addEventListener('keydown', (e) => { if (e.target instanceof HTMLInputElement) return; if (e.code === 'KeyT' && !e.repeat && started && !(mp && mp.typing())) { e.preventDefault(); tpShow(!tpOpen); } /* preventDefault: keep the 't' out of the search box */ else if (e.code === 'Escape' && tpOpen) tpShow(false); });
function spawnFx(tex, x, y, z, vx, vy, vz, life, size, grow) { const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false })); sp.position.set(x, y, z); sp.scale.setScalar(size); scene.add(sp); fx.push({ sp, vx, vy, vz, life, max: life, size, grow }); }
let collected = 0, toastT = 0;
const setCount = () => {}; // coins HUD lives in pets.js
function toast(msg, sec = 2.4) { const t = $('#toast'); t.textContent = msg; t.classList.add('show'); toastT = sec; }

// ── player ─────────────────────────────────────────────────────────────────
const player = { pos: new THREE.Vector3(), vel: new THREE.Vector3(), yaw: 0, grounded: true, coyote: 0, jumpBuf: 0, phase: 0, squash: 0, squashV: 0, speed: 0, runDust: 0 };
const pRoot = new THREE.Group(), pTilt = new THREE.Group(), pSquash = new THREE.Group(), pModel = new THREE.Group();
pRoot.add(pTilt); pTilt.add(pSquash); pSquash.add(pModel); scene.add(pRoot);
const camTarget = new THREE.Vector3();
let started = false, ready = false, camYaw = Math.PI, camPitch = 0.3, camDist = 3.4, camDistCur = 3.4, dragging = false, ePressed = false;

// pet: a petting motion for that model (assets/anim, made from the 'Pet' clip of each character's petting GLB — same bones, model unchanged)
const CHARS = [{ url: 'assets/character.glb', h: 1.62, rigged: true, name: '여자 1', pet: 'assets/anim/pet1.json' }, { url: 'assets/character2.glb', h: 1.74, rigged: true, yaw: -Math.PI / 2, name: '여자 2', pet: 'assets/anim/pet2.json' },
  { url: 'assets/character3.glb', h: 1.65, rigged: true, name: '여자 3', pet: 'assets/anim/pet3.json' },
  { url: 'assets/character_m1.glb', h: 1.78, rigged: true, name: '남자 1' },
  { url: 'assets/character_m2.glb', h: 1.78, rigged: true, name: '남자 2' },
  { url: 'assets/character_m3.glb', h: 1.75, rigged: true, name: '남자 3' }];
const nextChar = () => { for (let k = 1; k <= CHARS.length; k++) { const n = (charIndex + k) % CHARS.length; if (charModels[n]) return n; } return charIndex; };
const charModels = [], charSrc = []; let charIndex = 0; // charSrc: the loaded model + walk clip, cloned for other players
// walk ↔ run: with a run clip the walk fades out between 5 and 7.5 m/s; without one the walk just speeds up
function runBlend(u, hs, dt) {
  if (!u.run) { u.action.setEffectiveWeight(u.w); u.action.timeScale = 0.9 + Math.min(hs, 9) * 0.23; return; }
  const k = Math.min(1, Math.max(0, (hs - 5) / 2.5)), rk = k * k * (3 - 2 * k); u.rw = (u.rw || 0) + (rk - (u.rw || 0)) * (1 - Math.exp(-8 * dt));
  u.action.setEffectiveWeight(u.w * (1 - u.rw)); u.run.setEffectiveWeight(u.w * u.rw); u.action.timeScale = 0.9 + Math.min(hs, 6) * 0.23; u.run.timeScale = 0.75 + Math.min(hs, 10) * 0.04;
}
window.__runBlend = runBlend;
// play the current character's petting motion, turned toward what is being petted
function rideToggle() {
  const r = pets.toggleRide();
  if (r.on) { toast(`🐾 ${r.name} 타기!${r.perk ? ` 특기: ${r.perk}` : ''} · 달리면(Shift) 빨라요 · R로 내리기`, 2.6); player.squashV = 5; }
  else if (r.off) toast('🐾 내렸어요', 1.2);
  else if (r.far) toast('펫 가까이 가서 R을 눌러 올라타세요', 1.8);
  else toast('탈 수 있는 펫이 없어요 — 고라니·호랑이·사자·염소·청룡을 데리고 다닐 때 R', 2.6);
  const b = document.querySelector('#tRide'); if (b) b.setAttribute('aria-pressed', String(!!pets.riding()));
}
function petting() { const u = charModels[charIndex] && charModels[charIndex].userData; return !!(u && u.pet && u.petT > 0); }
function playPet(at) {
  const u = charModels[charIndex] && charModels[charIndex].userData; if (!u || !u.pet || u.petT > 0 || pets.riding()) return;
  if (at) player.yaw = Math.atan2(at.x - player.pos.x, at.z - player.pos.z);
  player.vel.x = player.vel.z = 0; // stand still for it (input is ignored until it ends — updatePlayer)
  u.pet.reset(); u.pet.play(); u.petT = u.pet.getClip().duration;
}
function loadChar(i) {
  if (!CHARS[i]) return Promise.resolve();
  return new Promise((res) => new GLTFLoader().load(CHARS[i].url, (gltf) => {
    const m = gltf.scene; if (CHARS[i].yaw) { m.rotation.y = CHARS[i].yaw; m.updateMatrixWorld(true); }
    const bb = new THREE.Box3().setFromObject(m), size = bb.getSize(new THREE.Vector3()), ctr = bb.getCenter(new THREE.Vector3()), s = CHARS[i].h / size.y, zs = CHARS[i].zs || 1, holder = new THREE.Group();
    m.scale.set(s, s, s * zs); if (CHARS[i].baked) m.position.set(0, -bb.min.y * s, 0); else if (CHARS[i].rigged && m.getObjectByName('hips')) { const hp = m.getObjectByName('hips').getWorldPosition(new THREE.Vector3()); m.position.set(-hp.x * s, -bb.min.y * s, -hp.z * s); } else m.position.set(-ctr.x * s, -bb.min.y * s, -ctr.z * s * zs); // a baked mesh already has its pivot on the body axis
    m.traverse((o) => { if (o.isMesh) { if (!o.geometry.attributes.normal) o.geometry.computeVertexNormals(); o.material.flatShading = false; o.material.needsUpdate = true; o.castShadow = true; o.receiveShadow = false; o.material.roughness = 1; o.material.metalness = 0; o.material.side = THREE.DoubleSide; if (o.material.map) { o.material.map.anisotropy = 8; o.material.emissive.set(0xffffff); o.material.emissiveMap = o.material.map; o.material.emissiveIntensity = 0.42; } } }); // the drawing glows faintly so it stays readable at night
    m.traverse((o) => { if (o.isSkinnedMesh) o.frustumCulled = false; });
    if (gltf.animations.length) { // Blender walk cycle: drop the root bone's forward travel so it plays in place
      const inPlace = (c) => { const k = c.clone(); k.tracks = k.tracks.filter((t) => !t.name.startsWith('root.')); return k; };
      const walkSrc = gltf.animations.find((a) => /walk/i.test(a.name)) || gltf.animations[0], runSrc = gltf.animations.find((a) => /run/i.test(a.name) && a !== walkSrc);
      const clip = inPlace(walkSrc), mixer = new THREE.AnimationMixer(m), action = mixer.clipAction(clip); action.play(); action.setEffectiveWeight(0); holder.userData = { mixer, action, w: 0 };
      if (runSrc) { const run = mixer.clipAction(inPlace(runSrc)); run.play(); run.setEffectiveWeight(0); holder.userData.run = run; } // optional run cycle, blended in with speed
      if (CHARS[i].pet) fetch(CHARS[i].pet).then((r) => r.json()).then((j) => { const c = inPlace(THREE.AnimationClip.parse(j)), a = mixer.clipAction(c); a.setLoop(THREE.LoopOnce, 1); a.clampWhenFinished = true; a.setEffectiveWeight(0); Object.assign(holder.userData, { pet: a, petW: 0, petT: 0 }); }).catch(() => {}); // petting motion (optional)
    }
    charSrc[i] = { model: m, clip: holder.userData.action ? holder.userData.action.getClip() : null, run: holder.userData.run ? holder.userData.run.getClip() : null };
    holder.add(m); holder.visible = false; pModel.add(holder); charModels[i] = holder; res();
  }, undefined, () => { charModels[i] = null; res(); }));
}
function setChar(i, announce) {
  if (!charModels[i]) return false; charIndex = i; charModels.forEach((m, k) => { if (m) m.visible = k === i; });
  try { localStorage.setItem('fm:char', String(i)); } catch (_) {}
  for (const b of document.querySelectorAll('.charBtn')) b.setAttribute('aria-pressed', String(Number(b.dataset.i) === i));
  if (announce) { toast(`캐릭터: ${CHARS[i].name}`, 1.4); player.squashV = 6; for (let k = 0; k < 8; k++) { const a = rnd() * 6.283; spawnFx(dustTex, player.pos.x, player.pos.y + 0.8, player.pos.z, Math.cos(a) * 1.8, rr(0.2, 1.2), Math.sin(a) * 1.8, 0.5, 0.5, 1.5); } }
  return true;
}
const loadModel = Promise.all(CHARS.map((_, i) => loadChar(i))).then(() => {
  if (!charModels[0] && !charModels[1]) { const g = new THREE.Group(), dress = new THREE.Mesh(new THREE.ConeGeometry(0.5, 1.2, 12), flat(0xf2f2f2)); dress.position.y = 0.6; const head = new THREE.Mesh(new THREE.SphereGeometry(0.24, 12, 10), flat(0x3a3a3a)); head.position.y = 1.38; dress.castShadow = head.castShadow = true; g.add(dress, head); pModel.add(g); charModels[0] = g; }
  for (const b of document.querySelectorAll('.charBtn')) { const i = Number(b.dataset.i); b.disabled = !charModels[i]; b.addEventListener('click', () => setChar(i, false)); }
  let saved = 0; try { saved = Number(localStorage.getItem('fm:char')) || 0; } catch (_) {}
  setChar(charModels[saved] ? saved : charModels[0] ? 0 : 1, false);
});

// ── campus selection ───────────────────────────────────────────────────────
let worldReady = false, modelsReady = false, menuOpen = false, loadToken = 0;
function refreshStart() { ready = modelsReady && worldReady; const b = $('#startBtn'); b.disabled = !ready; b.textContent = ready ? '게임 시작' : '불러오는 중…'; }
loadModel.then(() => { modelsReady = true; refreshStart(); requestAnimationFrame(frame); });
function campusButtons(el, onPick, currentId) {
  el.textContent = '';
  { // one list in campuses.js order (no Seoul / Gyeonggi split)
    const list = CAMPUSES;
    const gridEl = document.createElement('div'); gridEl.className = 'campusGrid'; el.append(gridEl);
    for (const c of list) {
      const b = document.createElement('button'); b.type = 'button'; b.className = 'campusBtn'; b.dataset.id = c.id;
      const nm = document.createElement('span'); nm.textContent = c.name; b.append(nm);
      const tag = c.status !== 'ready' ? '준비 중' : c.id === currentId ? '현재' : '';
      if (tag) { const t = document.createElement('small'); t.textContent = tag; b.append(t); }
      if (c.status !== 'ready') { b.disabled = true; b.setAttribute('aria-disabled', 'true'); }
      if (c.id === currentId) b.setAttribute('aria-current', 'true');
      b.addEventListener('click', () => onPick(c)); gridEl.append(b);
    }
  }
}
async function loadCampus(c) {
  const tok = ++loadToken; unloadWorld(); refreshStart(); campus = c;
  applyLighting(LIGHTING[c.lighting] || LIGHTING.night);
  const r = await fetch(c.data); if (!r.ok) throw new Error('캠퍼스 지도를 불러오지 못했습니다 (' + r.status + ')');
  const data = northUp(c) ? mirrorData(await r.json()) : await r.json(); if (tok !== loadToken) return false;
  for (const b of c.extraBuildings || []) data.buildings.push({ c: 1, k: 'university', ...b, p: northUp(c) ? b.p.map(([x, z]) => [x, -z]) : b.p, l: b.l || Math.max(1, Math.round(b.h / 4.4)) }); // buildings OpenStreetMap doesn't have (same frame as the map file)
  await new Promise((res) => requestAnimationFrame(() => setTimeout(res, 0))); if (tok !== loadToken) return false; // let the loading screen paint
  buildWorld(data); worldReady = true; coll.setCampus(c.id); wildPets.setCampus(c.id);
  $('#campusName').textContent = c.name; $('#loc').textContent = '📍 ' + c.name;
  try { localStorage.setItem('fm:campus', c.id); } catch (_) {}
  refreshStart(); return true;
}
function switchCampus(id, force) {
  const c = CAMPUSES.find((x) => x.id === id); if (!c || c.status !== 'ready') return Promise.resolve(false);
  if (campus && campus.id === id && !force) return Promise.resolve(true);
  $('#loadingName').textContent = c.name; $('#loading').classList.remove('hidden');
  return loadCampus(c).then((ok) => { $('#loading').classList.add('hidden'); if (ok && started) mp.enter(c.id); if (ok && started) toast(`${c.name}에 들어왔어요`, 2.4); return ok; }, (e) => { $('#loading').classList.add('hidden'); showErr(e.message); return false; });
}
function showStep(which) { $('#campusStep').classList.toggle('hidden', which !== 'campus'); $('#charStep').classList.toggle('hidden', which !== 'char'); }
campusButtons($('#startCampusList'), (c) => {
  $('#chosenCampus').textContent = c.name; showStep('char');
  if (!campus || campus.id !== c.id) loadCampus(c).catch((e) => showErr(e.message)); else refreshStart();
}, null);
$('#backBtn').addEventListener('click', () => showStep('campus'));
function openMenu() {
  menuOpen = true; for (const k in keys) keys[k] = false; dragging = false;
  if (document.pointerLockElement) document.exitPointerLock();
  campusButtons($('#menuCampusList'), (c) => { closeMenu(); switchCampus(c.id); }, campus && campus.id);
  $('#touchUI').classList.add('hidden'); stick.x = stick.y = 0; $('#campusMenu').classList.remove('hidden'); const cur = $('#menuCampusList [aria-current]'); if (cur) cur.focus();
}
function closeMenu() { menuOpen = false; $('#campusMenu').classList.add('hidden'); if (TOUCH && started) $('#touchUI').classList.remove('hidden'); }
$('#campusBtn').addEventListener('click', () => { if (started && !menuOpen) openMenu(); });
$('#menuClose').addEventListener('click', closeMenu);

// ── input ──────────────────────────────────────────────────────────────────
const keys = Object.create(null), locked = () => document.pointerLockElement === canvas;
window.addEventListener('keydown', (e) => { if (!started || e.target instanceof HTMLInputElement || (mp && mp.typing()) || (pets && pets.open()) || (coll && coll.open()) || (quests && quests.open()) || tpOpen || bigOpen || rankOpen) return; if (menuOpen) { if (e.code === 'KeyM' || e.code === 'Escape') closeMenu(); return; } if (e.code === 'KeyM') { if (worldReady) openMenu(); return; } if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault(); if (e.code === 'Space' && !keys.Space) player.jumpBuf = 0.14; if (e.code === 'KeyE' && !keys.KeyE) ePressed = !petting(); if (e.code === 'KeyR' && !e.repeat && !petting()) rideToggle(); if (e.code === 'KeyC' && !keys.KeyC && !petting()) { const n = nextChar(); if (!setChar(n, true)) toast('다른 캐릭터를 불러오지 못했어요', 1.6); } keys[e.code] = true; });
window.addEventListener('keyup', (e) => { keys[e.code] = false; });
window.addEventListener('blur', () => { for (const k in keys) keys[k] = false; });
const lockPointer = () => { try { const p = canvas.requestPointerLock(); if (p && p.catch) p.catch(() => {}); } catch (_) {} };
canvas.addEventListener('mousedown', () => { if (TOUCH || !started || menuOpen) return; dragging = true; if (!locked()) lockPointer(); });
window.addEventListener('mouseup', () => { dragging = false; });
window.addEventListener('mousemove', (e) => { if (TOUCH || !started || menuOpen || !(locked() || dragging)) return; camYaw -= e.movementX * 0.0026; camPitch = Math.min(1.25, Math.max(-0.3, camPitch + e.movementY * 0.0022)); });
window.addEventListener('wheel', (e) => { if (started && !(e.target instanceof Element && e.target.closest('.panel, #bigMap'))) e.preventDefault(); }, { passive: false }); /* popups (shop, teleport list, player list, controls) still scroll */ // scroll no longer zooms; just keep the page from scrolling
document.addEventListener('pointerlockchange', () => { $('#hint').classList.toggle('hidden', TOUCH || !started || locked()); });
canvas.addEventListener('contextmenu', (e) => e.preventDefault());
// ── touch controls: left stick moves, drag anywhere else to look ──
const stick = { x: 0, y: 0, id: null }; let touchRun = false;
{
  const base = $('#stick'), knob = $('#stickKnob'), DEAD = 0.12;
  const setStick = (e) => { const r = base.getBoundingClientRect(), R = r.width / 2; let x = (e.clientX - r.left - R) / R, y = (e.clientY - r.top - R) / R; const l = Math.hypot(x, y); if (l > 1) { x /= l; y /= l; } knob.style.transform = `translate(${x * R * 0.62}px, ${y * R * 0.62}px)`; const m = Math.hypot(x, y); if (m < DEAD) { stick.x = stick.y = 0; } else { const k = (m - DEAD) / (1 - DEAD) / m; stick.x = x * k; stick.y = y * k; } };
  const endStick = () => { stick.id = null; stick.x = stick.y = 0; knob.style.transform = ''; base.classList.remove('on'); };
  base.addEventListener('pointerdown', (e) => { if (!started || menuOpen) return; e.preventDefault(); stick.id = e.pointerId; base.setPointerCapture(e.pointerId); base.classList.add('on'); setStick(e); });
  base.addEventListener('pointermove', (e) => { if (e.pointerId === stick.id) setStick(e); });
  for (const ev of ['pointerup', 'pointercancel', 'lostpointercapture']) base.addEventListener(ev, (e) => { if (e.pointerId === stick.id) endStick(); });
  const looks = new Map();
  canvas.addEventListener('pointerdown', (e) => { if (e.pointerType === 'mouse' || !started || menuOpen) return; looks.set(e.pointerId, { x: e.clientX, y: e.clientY }); canvas.setPointerCapture(e.pointerId); });
  canvas.addEventListener('pointermove', (e) => {
    const prev = looks.get(e.pointerId); if (!prev) return;
    if (looks.size >= 2) { prev.x = e.clientX; prev.y = e.clientY; return; } // two fingers: no zoom, just don't spin the camera
    camYaw -= (e.clientX - prev.x) * 0.0055; camPitch = Math.min(1.25, Math.max(-0.3, camPitch + (e.clientY - prev.y) * 0.0045)); prev.x = e.clientX; prev.y = e.clientY;
  });
  for (const ev of ['pointerup', 'pointercancel']) canvas.addEventListener(ev, (e) => looks.delete(e.pointerId));
  const hold = (el, down, up) => { el.addEventListener('pointerdown', (e) => { e.preventDefault(); if (started && !menuOpen) down(); }); if (up) for (const ev of ['pointerup', 'pointercancel', 'pointerleave']) el.addEventListener(ev, up); };
  hold($('#tJump'), () => { player.jumpBuf = 0.14; keys.Space = true; }, () => { keys.Space = false; });
  hold($('#tRun'), () => { touchRun = !touchRun; $('#tRun').setAttribute('aria-pressed', String(touchRun)); });
  hold($('#tAct'), () => { ePressed = !petting(); });
  hold($('#tRide'), () => { if (!petting()) rideToggle(); });
  hold($('#tChar'), () => { const n = nextChar(); if (!setChar(n, true)) toast('다른 캐릭터를 불러오지 못했어요', 1.6); });
  for (const b of document.querySelectorAll('#touchUI button')) b.addEventListener('contextmenu', (e) => e.preventDefault());
}
const music = initMusic({ toast, started: () => started });
$('#startBtn').addEventListener('click', () => { if (!ready) return; started = true; music.start(); mp.enter(campus.id); $('#start').classList.add('hidden'); $('#hint').classList.toggle('hidden', TOUCH); if (TOUCH) $('#touchUI').classList.remove('hidden'); else lockPointer(); toast(`${campus.name}에 들어왔어요 — 걸어 다니며 코인과 숨은 수집품을 모아 보세요`, 3.6); });

// ── simulation ─────────────────────────────────────────────────────────────
function groundAt(x, z, feet) {
  let g = terrainH(x, z);
  for (let i = Math.floor((x - PR) / CELL); i <= Math.floor((x + PR) / CELL); i++) for (let j = Math.floor((z - PR) / CELL); j <= Math.floor((z + PR) / CELL); j++) { const a = grid.get(i + ',' + j); if (a) for (const c of a) if (feet >= c.top - 0.4 && c.top > g && Math.hypot(x - c.x, z - c.z) < c.r + PR * 0.6) g = c.top; }
  for (const b of buildingsNear(x, z, PR, nb)) if (feet >= b.top - 0.4 && b.top > g && x > b.minx - PR && x < b.maxx + PR && z > b.minz - PR && z < b.maxz + PR && (pip(x, z, b.p) || pip(x + PR * 0.7, z, b.p) || pip(x - PR * 0.7, z, b.p) || pip(x, z + PR * 0.7, b.p) || pip(x, z - PR * 0.7, b.p))) g = b.top;
  return g;
}
function pushOut(p, prevX, prevZ) {
  for (let it = 0; it < 2; it++) {
    for (let i = Math.floor((p.x - PR - 0.1) / CELL); i <= Math.floor((p.x + PR + 0.1) / CELL); i++) for (let j = Math.floor((p.z - PR - 0.1) / CELL); j <= Math.floor((p.z + PR + 0.1) / CELL); j++) { const a = grid.get(i + ',' + j); if (!a) continue; for (const c of a) { if (p.y >= c.top - 0.4) continue; let dx = p.x - c.x, dz = p.z - c.z; const d = Math.hypot(dx, dz), min = c.r + PR; if (d >= min) continue; if (d < 1e-5) { dx = 1; dz = 0; } const k = min / Math.max(d, 1e-5); p.x = c.x + dx * k; p.z = c.z + dz * k; } }
    for (const b of buildingsNear(p.x, p.z, PR + 0.1, nb)) {
      if (p.y >= b.top - 0.4 || p.x < b.minx - PR || p.x > b.maxx + PR || p.z < b.minz - PR || p.z > b.maxz + PR) continue;
      const q = b.p; for (let i = 0; i < q.length; i++) { const a = q[i], c = q[(i + 1) % q.length], ex = c[0] - a[0], ez = c[1] - a[1], l2 = ex * ex + ez * ez; if (l2 < 1e-6) continue; const t = Math.max(0, Math.min(1, ((p.x - a[0]) * ex + (p.z - a[1]) * ez) / l2)), qx = a[0] + ex * t, qz = a[1] + ez * t, dx = p.x - qx, dz = p.z - qz, d = Math.hypot(dx, dz); if (d < PR && d > 1e-6) { p.x = qx + (dx / d) * PR; p.z = qz + (dz / d) * PR; } }
      if (pip(p.x, p.z, q)) { p.x = prevX; p.z = prevZ; } // never end a step inside a wall
    }
  }
}
function updatePlayer(dt, t) {
  const p = player, cl = (v) => Math.max(-1, Math.min(1, v)), busy = petting(); // while petting: no walking, jumping or other motions until it finishes
  if (busy) p.jumpBuf = 0;
  const f = busy ? 0 : cl((keys.KeyW || keys.ArrowUp ? 1 : 0) - (keys.KeyS || keys.ArrowDown ? 1 : 0) - stick.y), s = busy ? 0 : cl((keys.KeyD || keys.ArrowRight ? 1 : 0) - (keys.KeyA || keys.ArrowLeft ? 1 : 0) + stick.x);
  const fxx = -Math.sin(camYaw), fzz = -Math.cos(camYaw); let dx = fxx * f - fzz * s, dz = fzz * f + fxx * s; const len = Math.hypot(dx, dz);
  const inWater = cls(p.pos.x, p.pos.z) === 4 && p.grounded, running = (keys.ShiftLeft || keys.ShiftRight || touchRun) && len > 0;
  const rs = pets.rideStats(); // on a rideable pet: running ×2 (호랑이 2.6, 사자 2.3)
  let max = (running ? 8.6 * (rs ? rs.run : 1) : 4.1) * Math.min(1, len); if (inWater) max *= 0.5; if (len > 0) { dx /= len; dz /= len; }
  if (p.grounded) p.leaping = false; const acc = p.grounded ? 11 : p.leaping ? 0.7 : 3.5, k = 1 - Math.exp(-acc * dt); // 고라니: keeps its leap's speed until it lands
  p.vel.x += (dx * max - p.vel.x) * k; p.vel.z += (dz * max - p.vel.z) * k;
  if (len > 0) p.yaw += angDiff(p.yaw, Math.atan2(dx, dz)) * (1 - Math.exp(-13 * dt));
  p.jumpBuf -= dt; p.coyote = p.grounded ? 0.12 : p.coyote - dt;
  if (p.jumpBuf > 0 && p.coyote > 0) { p.vel.y = 9.4 * (rs ? rs.jump : 1); if (rs && rs.leap > 1) { p.vel.x *= rs.leap; p.vel.z *= rs.leap; p.leaping = true; } /* ridden pets: 염소 jumps high, 고라니 leaps far */ p.grounded = false; p.coyote = 0; p.jumpBuf = 0; p.squashV = 5; }
  if (rs && rs.soar && !p.grounded) { // on the 청룡: hold Space to climb, let go to glide down gently (not above 60 m over the ground)
    const top = terrainH(p.pos.x, p.pos.z) + 60;
    if (keys.Space && p.pos.y < top) p.vel.y += (7 - p.vel.y) * (1 - Math.exp(-4 * dt)); else p.vel.y = Math.max(p.vel.y - 9 * dt, -3.5);
  } else {
    if (!p.grounded && p.vel.y > 0 && !keys.Space) p.vel.y -= 22 * dt;
    p.vel.y -= 26 * dt;
  }
  const ox = p.pos.x, oz = p.pos.z; p.pos.x += p.vel.x * dt; p.pos.z += p.vel.z * dt; pushOut(p.pos, ox, oz);
  p.pos.x = Math.max(-HALF, Math.min(HALF, p.pos.x)); p.pos.z = Math.max(-HALF, Math.min(HALF, p.pos.z));
  const was = p.grounded; p.pos.y += p.vel.y * dt; const g = groundAt(p.pos.x, p.pos.z, p.pos.y);
  if (p.pos.y <= g || (was && p.vel.y <= 0 && p.pos.y - g < 0.5)) { if (!was && p.vel.y < -6) { p.squashV = Math.max(-9, p.vel.y * 0.45); for (let i = 0; i < 7; i++) { const a = rnd() * 6.283; spawnFx(dustTex, p.pos.x, g + 0.15, p.pos.z, Math.cos(a) * 1.6, 0.6, Math.sin(a) * 1.6, 0.55, 0.5, 1.6); } } p.pos.y = g; p.vel.y = 0; p.grounded = true; } else p.grounded = false;
  const hs = Math.hypot(p.vel.x, p.vel.z); p.speed = hs; const sf = Math.min(1, hs / 8.6);
  if (p.grounded) p.phase += hs * dt * (hs > 5.5 ? 1.25 : 1.9);
  const bob = p.grounded ? Math.abs(Math.sin(p.phase)) * (0.05 + 0.07 * sf) * Math.min(1, hs / 1.5) : 0;
  p.squashV += (-p.squash * 140 - p.squashV * 14) * dt; p.squash += p.squashV * dt;
  const air = p.grounded ? 0 : THREE.MathUtils.clamp(p.vel.y * 0.012, -0.1, 0.12), breathe = Math.sin(t * 1.9) * 0.007 * (1 - sf), sy = 1 + p.squash * 0.06 + air + breathe;
  pSquash.scale.set(1 / Math.sqrt(sy), sy, 1 / Math.sqrt(sy));
  const lean = (p.grounded ? 0.05 + 0.2 * sf * sf : THREE.MathUtils.clamp(-p.vel.y * 0.02, -0.18, 0.22)) * Math.min(1, hs / 1.2);
  pTilt.rotation.x += (lean - pTilt.rotation.x) * (1 - Math.exp(-10 * dt));
  const cmod = charModels[charIndex], anim = cmod && cmod.userData.mixer, pk = anim ? 0.35 : 1;
  if (anim) { const u = cmod.userData;
    if (u.pet) { if (!p.grounded) u.petT = 0; u.petT = Math.max(0, u.petT - dt); u.petW += ((u.petT > 0 ? 1 : 0) - u.petW) * (1 - Math.exp(-10 * dt)); u.pet.setEffectiveWeight(u.petW); } // petting: moving cancels it
    const tw = pets.riding() ? 0 : (p.grounded ? Math.min(1, hs / 1.0) : 0.55) * (1 - (u.petW || 0)); /* riding: the pet does the walking */ u.w += (tw - u.w) * (1 - Math.exp(-8 * dt)); runBlend(u, hs, dt); u.mixer.update(dt); }
  const sway = pk * (p.grounded ? Math.sin(p.phase) * (0.035 + 0.035 * sf) * Math.min(1, hs / 1.5) : 0);
  pTilt.rotation.z += (sway + Math.sin(t * 0.9) * 0.008 - pTilt.rotation.z) * (1 - Math.exp(-14 * dt));
  pModel.rotation.y = MODEL_YAW + (p.grounded ? pk * Math.sin(p.phase) * 0.07 * Math.min(1, hs / 1.5) : 0);
  { const seat = pets.riding(); pRoot.position.set(p.pos.x, p.pos.y + (seat ? seat : bob), p.pos.z); if (seat) { pTilt.rotation.x = 0; pTilt.rotation.z = 0; } } pRoot.rotation.y = p.yaw; // riding: sit on the pet's back
  if (p.grounded && hs > 6) { p.runDust -= dt; if (p.runDust <= 0) { p.runDust = 0.11; spawnFx(dustTex, p.pos.x - dx * 0.3, p.pos.y + 0.12, p.pos.z - dz * 0.3, rr(-0.4, 0.4), 0.5, rr(-0.4, 0.4), 0.5, 0.35, 1.4); } }
}
const camPos = new THREE.Vector3(), dir = new THREE.Vector3();
function updateCamera(dt) {
  const p = player; V.set(p.pos.x, p.pos.y + 1.25, p.pos.z); camTarget.lerp(V, 1 - Math.exp(-16 * dt));
  dir.set(Math.sin(camYaw) * Math.cos(camPitch), Math.sin(camPitch), Math.cos(camYaw) * Math.cos(camPitch));
  let allowed = camDist; for (let d = 0.5; d <= camDist + 0.3; d += 0.25) if (solidAt(camTarget.x + dir.x * d, camTarget.y + dir.y * d, camTarget.z + dir.z * d)) { allowed = Math.max(0.7, d - 0.5); break; }
  camDistCur = allowed < camDistCur ? allowed : camDistCur + (allowed - camDistCur) * (1 - Math.exp(-5 * dt));
  camPos.copy(camTarget).addScaledVector(dir, camDistCur); const floor = terrainH(camPos.x, camPos.z) + 0.35; if (camPos.y < floor) camPos.y = floor;
  camera.position.copy(camPos); camera.lookAt(camTarget); pRoot.visible = camDistCur > 0.9;
}
let nearPal = null, hudT = 0, campusPoly = null, lampT = 0;
const mini = $('#mini'), mctx = mini.getContext('2d');
// ── big map (click the minimap or press N): whole campus, places, players; click anywhere to teleport there ──
let bigOpen = false, bigView = null, bigT = 0;
function drawBigMap() {
  const cv = $('#bigMapCanvas'), size = Math.round(Math.min(innerWidth * 0.92, innerHeight * 0.86, 900) * Math.min(2, devicePixelRatio || 1));
  if (cv.width !== size) { cv.width = cv.height = size; }
  // frame the campus boundary (plus a margin) inside the playable square
  let x0 = 1e9, x1 = -1e9, z0 = 1e9, z1 = -1e9; for (const r of D.campus) for (const q of r) { x0 = Math.min(x0, q[0]); x1 = Math.max(x1, q[0]); z0 = Math.min(z0, q[1]); z1 = Math.max(z1, q[1]); }
  const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2, half = Math.min(HALF, Math.max(x1 - x0, z1 - z0) / 2 + 80); bigView = { cx, cz, half };
  const c = cv.getContext('2d'), k = GS / (GHALF * 2), S = size / (half * 2), toPx = (x, z) => [(x - cx + half) * S, (z - cz + half) * S];
  c.fillStyle = '#86b56a'; c.fillRect(0, 0, size, size); c.drawImage(groundCanvas, (cx - half + GHALF) * k, (cz - half + GHALF) * k, half * 2 * k, half * 2 * k, 0, 0, size, size);
  c.strokeStyle = 'rgba(255,240,180,0.9)'; c.lineWidth = Math.max(2, size / 400); c.setLineDash([size / 90, size / 140]); for (const r of D.campus) { c.beginPath(); r.forEach((q, i) => { const [x, y] = toPx(q[0], q[1]); i ? c.lineTo(x, y) : c.moveTo(x, y); }); c.closePath(); c.stroke(); } c.setLineDash([]);
  const fs = Math.max(11, size / 70); c.font = `700 ${fs}px "Pretendard","Apple SD Gothic Neo","Malgun Gothic",system-ui,sans-serif`; c.textAlign = 'center'; c.textBaseline = 'bottom';
  const featured = new Set((campus.landmarks || []).filter((l) => l.model).map((l) => l.name));
  for (const pl of places) { const [x, y] = toPx(pl.x, pl.z), star = featured.has(pl.n); c.fillStyle = star ? '#ffc83a' : '#1f2d25'; c.beginPath(); c.arc(x, y, star ? fs * 0.38 : fs * 0.25, 0, 6.3); c.fill(); const t = (star ? '⭐ ' : '') + pl.n.replace(/ \(\d+\)$/, ''); c.lineWidth = fs * 0.28; c.strokeStyle = 'rgba(255,253,246,0.92)'; c.strokeText(t, x, y - fs * 0.4); c.fillStyle = '#1f2d25'; c.fillText(t, x, y - fs * 0.4); }
  for (const o of mp.players()) { const [x, y] = toPx(o.x, o.z); c.fillStyle = '#3a8dff'; c.strokeStyle = '#fff'; c.lineWidth = fs * 0.15; c.beginPath(); c.arc(x, y, fs * 0.45, 0, 6.3); c.fill(); c.stroke(); c.fillStyle = '#123'; c.fillText(o.name, x, y - fs * 0.5); }
  const [px, py] = toPx(player.pos.x, player.pos.z); c.save(); c.translate(px, py); c.rotate(Math.atan2(Math.sin(player.yaw), -Math.cos(player.yaw))); c.fillStyle = '#e8432f'; c.strokeStyle = '#fff'; c.lineWidth = fs * 0.18; c.beginPath(); c.moveTo(0, -fs * 0.9); c.lineTo(fs * 0.62, fs * 0.65); c.lineTo(0, fs * 0.32); c.lineTo(-fs * 0.62, fs * 0.65); c.closePath(); c.stroke(); c.fill(); c.restore();
}
function bigMapShow(on) {
  if (on && (!started || menuOpen || !worldReady)) return; bigOpen = on; $('#bigMap').classList.toggle('hidden', !on);
  if (on) { for (const k in keys) keys[k] = false; if (document.pointerLockElement) document.exitPointerLock(); drawBigMap(); } else if (!TOUCH) lockPointer();
}
$('#mini').addEventListener('click', (e) => { e.stopPropagation(); bigMapShow(true); });
$('#bigMapClose').addEventListener('click', () => bigMapShow(false));
$('#bigMapCanvas').addEventListener('click', (e) => {
  if (!bigView) return; const r = e.currentTarget.getBoundingClientRect(), u = (e.clientX - r.left) / r.width, v = (e.clientY - r.top) / r.height;
  const x = bigView.cx - bigView.half + u * bigView.half * 2, z = bigView.cz - bigView.half + v * bigView.half * 2;
  const near = places.find((pl) => Math.hypot(pl.x - x, pl.z - z) < bigView.half * 0.035); // clicked on a label dot → go to that place properly
  if (near) tpToPlace(near); else teleport(Math.max(-HALF + 6, Math.min(HALF - 6, x)), Math.max(-HALF + 6, Math.min(HALF - 6, z)), '지도');
  bigMapShow(false); toast(`🌀 ${near ? near.n : '지도에서 고른 곳'}(으)로 이동했어요`, 1.8);
});
window.addEventListener('keydown', (e) => { if (e.target instanceof HTMLInputElement || !started) return; if (e.code === 'KeyN' && !e.repeat && !(mp && mp.typing())) bigMapShow(!bigOpen); else if (e.code === 'Escape' && bigOpen) bigMapShow(false); });
function updateHud() {
  const p = player.pos; let best = null, bd = 1e9; for (const pl of places) { const d = Math.hypot(pl.x - p.x, pl.z - p.z); if (d < pl.r && d < bd) { bd = d; best = pl; } }
  if (!campusPoly) campusPoly = D.campus;
  quests.onPlace(campus.id, best && best.n); wildPets.onPlace(campus.id, best && best.n); // explore quests: which named place we're standing in
  const inCampus = campusPoly.some((r) => pip(p.x, p.z, r)); stamps.tick(campus.id, inCampus, p.x, p.z); // stamp rally: a few steps inside the boundary
  $('#loc').textContent = best ? `📍 ${best.n}` : inCampus ? '📍 ' + campus.name : '📍 ' + (campus.outsideLabel || '캠퍼스 밖');
  if (bigOpen && (bigT = (bigT || 0) + 1) % 3 === 0) drawBigMap();
  const W = mini.width, R = 170, k = GS / (GHALF * 2), sx = (p.x - R + GHALF) * k, sz = (p.z - R + GHALF) * k;
  mctx.fillStyle = '#86b56a'; mctx.fillRect(0, 0, W, W); mctx.drawImage(groundCanvas, sx, sz, R * 2 * k, R * 2 * k, 0, 0, W, W);
  mctx.save(); mctx.translate(W / 2, W / 2); mctx.rotate(Math.atan2(Math.sin(player.yaw), -Math.cos(player.yaw))); mctx.fillStyle = '#1f2d25'; mctx.strokeStyle = '#fff'; mctx.lineWidth = 2; mctx.beginPath(); mctx.moveTo(0, -9); mctx.lineTo(6.5, 7); mctx.lineTo(0, 3.5); mctx.lineTo(-6.5, 7); mctx.closePath(); mctx.stroke(); mctx.fill(); mctx.restore();
}
function updateWorld(dt, t) {
  const p = player;
  nearPal = null; let best = 2.6;
  for (const a of pals) {
    const dx = p.pos.x - a.x, dz = p.pos.z - a.z, d = Math.hypot(dx, dz); if (d < best) { best = d; nearPal = a; }
    a.timer -= dt; a.happy -= dt;
    if (a.happy > 0) { a.moving = false; a.yaw += dt * 9; }
    else if (d < 5) { a.moving = false; a.yaw += angDiff(a.yaw, Math.atan2(dx, dz)) * (1 - Math.exp(-6 * dt)); }
    else if (d < 120) {
      if (a.timer <= 0) { a.moving = !a.moving; a.timer = a.moving ? rr(2, 5) : rr(1, 3); a.target = rnd() * 6.283; }
      if (a.moving) { a.yaw += angDiff(a.yaw, a.target) * (1 - Math.exp(-3 * dt)); const nx = a.x + Math.sin(a.yaw) * 1.4 * dt, nz = a.z + Math.cos(a.yaw) * 1.4 * dt; if (walkable(nx, nz) && !solidAt(nx + Math.sin(a.yaw) * 0.8, terrainH(nx, nz) + 0.5, nz + Math.cos(a.yaw) * 0.8)) { a.x = nx; a.z = nz; } else a.target += Math.PI * 0.7; }
    }
    if (d < 0.95 && d > 1e-4) { const nx = a.x - (dx / d) * (0.95 - d), nz = a.z - (dz / d) * (0.95 - d); if (!solidAt(nx, terrainH(nx, nz) + 0.5, nz)) { a.x = nx; a.z = nz; } }
    a.ph += dt * (a.happy > 0 ? 14 : a.moving ? 9 : 0);
    const hop = a.happy > 0 ? Math.abs(Math.sin(a.ph)) * 0.6 : a.moving ? Math.abs(Math.sin(a.ph)) * 0.22 : Math.sin(t * 2 + a.x) * 0.02;
    a.g.position.set(a.x, terrainH(a.x, a.z) + hop, a.z); a.g.rotation.y = a.yaw;
  }
  // E goes to, in order: a collectible, a wild pet, a lawn animal, then your own pet (only when standing still next to it)
  const pr = $('#prompt'), item = started ? coll.nearest(p.pos) : null, wild = started && !item ? wildPets.nearestWild(p.pos) : null, own = started && !item && !wild && !nearPal ? wildPets.nearOwn() : null;
  $('#tAct').classList.toggle('hidden', !((item || wild || nearPal || own) && started)); $('#tAct').textContent = item ? '줍기' : '쓰다듬기';
  if (item) { const R = coll.rarityOf(item); pr.innerHTML = `<kbd>E</kbd> 줍기 · <b style="color:${R.css}">${R.name}</b> 수집품`; pr.classList.add('show'); if (ePressed) coll.collect(item); }
  else if (wild) { pr.innerHTML = wildPets.promptWild(wild); pr.classList.add('show'); if (ePressed) wildPets.patWild(wild); }
  else if (nearPal && started) { pr.innerHTML = '<kbd>E</kbd> 쓰다듬기'; pr.classList.add('show'); if (ePressed && nearPal.happy <= 0) { nearPal.happy = 1.6; quests.event('pat'); for (let i = 0; i < 5; i++) spawnFx(heartTex, nearPal.x + rr(-0.4, 0.4), nearPal.g.position.y + 1.2, nearPal.z + rr(-0.4, 0.4), rr(-0.3, 0.3), rr(1.2, 2.2), rr(-0.3, 0.3), 1.1, 0.45, 0.3); } } else if (own) { pr.innerHTML = wildPets.promptOwn(own); pr.classList.add('show'); if (ePressed) wildPets.patOwn(own); } else pr.classList.remove('show');
  { // R prompt above the E one: get on a rideable pet next to you, or get off
    const rp = $('#ridePrompt'), seat = started && pets.riding(), nr = started && !seat && !petting() ? pets.nearRideable(p.pos, 3.5) : null;
    if (seat) rp.innerHTML = '<kbd>R</kbd> 내리기'; else if (nr) { rp.textContent = ''; const k = document.createElement('kbd'); k.textContent = 'R'; rp.append(k, ` 올라타기 · ${nr.name}`); }
    rp.classList.toggle('show', !!(seat || nr)); rp.classList.toggle('stack', pr.classList.contains('show'));
  }
  ePressed = false;
  for (let i = fx.length - 1; i >= 0; i--) { const f = fx[i]; f.life -= dt; if (f.life <= 0) { scene.remove(f.sp); f.sp.material.dispose(); fx.splice(i, 1); continue; } f.sp.position.x += f.vx * dt; f.sp.position.y += f.vy * dt; f.sp.position.z += f.vz * dt; const k = f.life / f.max; f.sp.material.opacity = k; f.sp.scale.setScalar(Math.max(0.01, f.size + (1 - k) * f.grow)); }
  coll.update(dt, t); wildPets.update(dt); stamps.update(dt);
  for (const c of clouds) { c.position.x += dt * 4; if (c.position.x > 1400) c.position.x = -1400; }
  for (const l of labels) { const d = Math.hypot(l.position.x - camera.position.x, l.position.z - camera.position.z); l.visible = d < 170; l.material.opacity = Math.min(1, (170 - d) / 50); const sc = Math.max(1, d / 150); l.scale.set(42 * sc * 0.6, 7 * sc * 0.6, 1); }
  if (toastT > 0) { toastT -= dt; if (toastT <= 0) $('#toast').classList.remove('show'); }
  updateTufts(p.pos.x, p.pos.z);
  hudT -= dt; if (hudT <= 0) { hudT = 0.12; updateHud(); }
  sun.target.position.set(Math.round(p.pos.x / 4) * 4, p.pos.y, Math.round(p.pos.z / 4) * 4); sun.position.copy(sun.target.position).addScaledVector(SUN_DIR, 260);
  sky.position.copy(camera.position); stars.position.copy(camera.position); moon.position.copy(camera.position).addScaledVector(SUN_DIR, 1900);
  if (lantern) lantern.position.set(p.pos.x, p.pos.y + 2.3, p.pos.z);
  lampT -= dt; if (lampT <= 0 && lampLights.length) {
    lampT = 0.2; const cx = Math.floor(p.pos.x / 40), cz = Math.floor(p.pos.z / 40), cand = [];
    for (let i = cx - 2; i <= cx + 2; i++) for (let j = cz - 2; j <= cz + 2; j++) { const a = lampGrid.get(i + ',' + j); if (a) for (const l of a) { const d = Math.hypot(l[0] - p.pos.x, l[2] - p.pos.z); if (d < 70) cand.push([d, l]); } }
    cand.sort((a, b) => a[0] - b[0]);
    lampLights.forEach((L, i) => { const c = cand[i]; if (!c) { L.intensity = 0; return; } L.position.set(c[1][0], c[1][1], c[1][2]); const f = Math.max(0, 1 - c[0] / 70); L.intensity = 70 * f * f * (3 - 2 * f); });
  }
}
setPetCamera(camera);
const pets = initPets({ petRow: (li, o) => wildPets.decorate(li, o), scene, player, terrainH, toast, touch: TOUCH, started: () => started, menuOpen: () => menuOpen, worldReady: () => worldReady, lockPointer, releaseKeys: () => { for (const k in keys) keys[k] = false; dragging = false; } });
const mp = initMultiplayer({ busy: () => petting(), signFix: (s) => { // a sign saved in the old unflipped frame (campus newly shown north-up): move it to the matching spot
    if (!northUp(campus) && +s.t === NORTH_UP_SINCE) { // converted while this campus was briefly (wrongly) flipped — e.g. khu-global, kept in this device's sign cache: undo
      const z = -(+s.z); return { ...s, z, y: groundAt(+s.x, z, 1e4), yaw: Math.PI - (+s.yaw || 0), t: NORTH_UP_SINCE - 1 };
    }
    if (!northUp(campus) || campus.mirror || !(+s.t < NORTH_UP_SINCE)) return s;
    const z = -(+s.z); return { ...s, z, y: groundAt(+s.x, z, 1e4), yaw: Math.PI - (+s.yaw || 0), t: NORTH_UP_SINCE }; // t moved up = marked as converted
  }, onEmote: (n, ch) => npcMimic('emote', ch), teleport: (x, z, name) => teleport(x, z, name), myPet: () => pets.current(), scene, player, pRoot, charSrc, camera, touch: TOUCH, charIndex: () => charIndex, terrainH, toast, started: () => started, menuOpen: () => menuOpen, lockPointer, releaseKeys: () => { for (const k in keys) keys[k] = false; dragging = false; } });
const coll = initCollection({ toWorld: (x, z) => mapToWorld(x, z), petDex: (el) => wildPets.renderDex(el), stampBook: (el) => stamps.render(el), onCollect: (it) => { quests.event('collect', it); wildPets.onCollect(it); }, scene, player, toast, touch: TOUCH, groundY: (x, z) => groundAt(x, z, terrainH(x, z) + 1.5), worldReady: () => worldReady, campusName: (id) => (CAMPUSES.find((c) => c.id === id) || { name: id }).name, started: () => started, menuOpen: () => menuOpen, typing: () => mp.typing(), lockPointer, releaseKeys: () => { for (const k in keys) keys[k] = false; dragging = false; } });
const stamps = initStamps({ toast, started: () => started, payCoins: (n) => pets.addCoins(n), coinPop: () => pets.popCoin(), campusName: (id) => (CAMPUSES.find((c) => c.id === id) || { name: id }).name, refreshBook: () => coll.refresh() });
const quests = initQuests({ onComplete: (q) => wildPets.onQuestDone(q), toast, touch: TOUCH, started: () => started, worldReady: () => worldReady, menuOpen: () => menuOpen, typing: () => mp.typing(), lockPointer, releaseKeys: () => { for (const k in keys) keys[k] = false; dragging = false; },
  metres: () => pets.metres(), petsWalking: () => pets.walking(), remaining: (r) => coll.remaining(r), payCoins: (n) => pets.addCoins(n), coinPop: () => pets.popCoin() });
const wildPets = initWildPets({ toWorld: (x, z) => mapToWorld(x, z), dexChanged: () => coll.refresh(), onPat: (at) => { quests.event('pat'); playPet(at); }, scene, toast, player, terrainH, walkable, solidAt, touch: TOUCH, started: () => started, worldReady: () => worldReady, pets });
// ── accounts (nickname + password) or guest ──
const auth = initAuth();
{
  const msg = $('#loginMsg'), pw = $('#pw'), nickEl = $('#nick'), lb = $('#loginBtn'), gb = $('#guestBtn'), ob = $('#logoutBtn');
  const show = (u) => {
    const inn = !!u; nickEl.readOnly = inn; pw.value = ''; $('#pwRow').classList.toggle('hidden', inn); lb.classList.toggle('hidden', inn); gb.classList.toggle('hidden', inn); ob.classList.toggle('hidden', !inn);
    msg.textContent = inn ? `✅ ${u.nick} 님으로 로그인됨 — 코인·펫·도감이 계정에 저장돼요 (어느 기기에서나)` : auth.available() ? '게스트 모드 — 코인·펫·도감은 이 기기에만 저장돼요. 로그인하면 어느 기기에서나 이어서 할 수 있어요' : '게스트 모드 — 코인·펫·도감은 이 기기에만 저장돼요 (계정 기능은 준비 중)';
  };
  if (!auth.available()) { lb.disabled = true; pw.disabled = true; lb.title = '로그인 서버 설정 전이에요'; }
  show(null);
  mp.useDB(auth); auth.ready().then(() => auth.ensureUser()).catch(() => {}); // guests: silent anonymous sign-in so their signs can be saved
  let lastAcct;
  auth.onChange(async (raw) => {
    const u = raw && !raw.anon ? raw : null; mp.setIdentity(u, raw && raw.uid); if (u === lastAcct || (u && lastAcct && u.uid === lastAcct.uid)) return; lastAcct = u;
    show(u); await pets.useAccount(u ? auth : null); await coll.useAccount(u ? auth : null); await quests.useAccount(u ? auth : null); await wildPets.useAccount(u ? auth : null); await stamps.useAccount(u ? auth : null);
    if (u) { // admin follows the account: use the key saved on it, or save this browser's key onto it
      const saved = await auth.loadAdmin().catch(() => null), local = await mp.adminKey();
      if (saved) { if (await mp.useAdminKey(saved)) toast('🛡️ 관리자 계정으로 로그인했어요', 2.2); } else if (local) auth.saveAdmin(local).then(() => toast('🛡️ 이 계정을 관리자로 등록했어요 — 다른 기기에서도 로그인만 하면 관리자예요', 3)).catch(() => {});
    }
  });
  const go = async () => {
    lb.disabled = true; msg.textContent = '로그인 중…';
    try { const r = await auth.login(nickEl.value, pw.value); if (r.created) toast(`🎉 ${nickEl.value.trim()} 계정을 만들었어요! 이 기기의 코인·펫을 계정으로 옮겼어요`, 3.2); }
    catch (e) { msg.textContent = '⚠️ ' + (e.message || e); }
    lb.disabled = false;
  };
  lb.addEventListener('click', go);
  pw.addEventListener('keydown', (e) => { e.stopPropagation(); if (e.key === 'Enter') go(); });
  gb.addEventListener('click', () => { const sb = $('#startBtn'); if (sb.disabled) { msg.textContent = '캐릭터를 불러오는 중이에요… 잠시 뒤에 다시 눌러 주세요'; return; } sb.click(); }); // play right away as a guest
  ob.addEventListener('click', async () => { pets.flush(); quests.flush(); wildPets.flush(); await auth.logout(); auth.ensureUser().catch(() => {}); });
}
// ── pedometer leaderboard (L / 🏆): accounts only; total steps ──
let rankOpen = false;
async function renderRanking() {
  const list = $('#rankList'), meEl = $('#rankMe'), acct = auth.user(); list.replaceChildren(); meEl.textContent = '불러오는 중…';
  let rows; try { rows = await auth.loadRanking(50); } catch (e) { rows = null; }
  if (!rows) { meEl.textContent = '랭킹을 불러오지 못했어요'; return; }
  const medal = ['🥇', '🥈', '🥉'];
  rows.forEach((r, i) => { const li = document.createElement('li'); if (acct && r.uid === acct.uid) li.className = 'me'; const a = document.createElement('span'), b = document.createElement('span'), c = document.createElement('span'); a.className = 'rk'; a.textContent = medal[i] || String(i + 1); b.textContent = r.nick; c.className = 'st'; c.textContent = `👣 ${r.steps.toLocaleString('ko-KR')}보`; li.append(a, b, c); list.append(li); });
  if (!rows.length) { const li = document.createElement('li'); li.textContent = '아직 기록이 없어요 — 로그인하고 걸어 보세요!'; list.append(li); }
  if (!acct) meEl.textContent = `게스트는 랭킹에 오르지 않아요 · 로그인하면 내 걸음(지금 ${pets.steps().toLocaleString('ko-KR')}보)이 올라가요`;
  else { pets.flush(); const rk = await auth.rankOf(pets.steps()).catch(() => null); meEl.textContent = `내 기록: 👣 ${pets.steps().toLocaleString('ko-KR')}보` + (rk ? ` · ${rk}위` : '') + ' (20초마다 반영)'; }
}
function rankShow(on) {
  if (on && (!started || menuOpen)) return; rankOpen = on; $('#rankPanel').classList.toggle('hidden', !on);
  if (on) { for (const k in keys) keys[k] = false; if (document.pointerLockElement) document.exitPointerLock(); renderRanking(); } else if (!TOUCH) lockPointer();
}
$('#rankBtn').addEventListener('click', () => rankShow(!rankOpen));
$('#rankClose').addEventListener('click', () => rankShow(false));
window.addEventListener('keydown', (e) => { if (e.target instanceof HTMLInputElement || !started) return; if (e.code === 'KeyL' && !e.repeat && !(mp && mp.typing())) rankShow(!rankOpen); else if (e.code === 'Escape' && rankOpen) rankShow(false); });
let last = performance.now(), time = 0, slowAcc = 0, slowN = 0;
function frame(now) {
  if (!worldReady) { last = now; renderer.render(scene, camera); requestAnimationFrame(frame); return; } // between campuses
  const rawDt = (now - last) / 1000, dt = Math.min(0.05, rawDt); last = now; time += dt;
  if (started && rawDt < 0.5) { slowAcc += rawDt; if (++slowN >= 90) { if (slowAcc / slowN > 0.036 && pixelRatio > 0.75) { pixelRatio = Math.max(0.75, pixelRatio - 0.5); renderer.setPixelRatio(pixelRatio); renderer.setSize(window.innerWidth, window.innerHeight, false); } slowAcc = 0; slowN = 0; } }
  if (worldReady) updateNpcs(dt);
  if (started) { updatePlayer(dt, time); mp.update(dt); pets.update(dt); quests.update(dt); } else { camYaw += dt * 0.1; pRoot.position.copy(player.pos); pRoot.rotation.y = player.yaw; }
  updateCamera(dt); updateWorld(dt, time); renderer.render(scene, camera); requestAnimationFrame(frame);
}
window.__game = { stamps, playPet, chars: () => charModels, npcs: () => npcs, coll, quests, wildPets, npcCount: () => npcs.length, npcDbg: () => npcs.map((n) => ({ x: +n.x.toFixed(1), z: +n.z.toFixed(1), goal: n.goal, wait: +n.wait.toFixed(1), wave: n.wave.visible })), mp, pets, stick, touch: TOUCH, setTouchRun: (v) => { touchRun = v; }, switchCampus, campus: () => campus && campus.id, worldReady: () => worldReady, renderer, openMenu, menuOpen: () => menuOpen, setChar, charIndex: () => charIndex, charModels, step: (n) => { for (let i = 0; i < n; i++) { time += 1 / 60; updatePlayer(1 / 60, time); updateCamera(1 / 60); updateWorld(1 / 60, time); } }, press: () => { player.jumpBuf = 0.14; }, player, keys, gems, pals, places, buildings, terrainH, cls, insideBuilding, solidAt, cam: () => ({ camYaw, camPitch, camDist, camDistCur }), setCam: (y, p, d) => { camYaw = y; camPitch = p; if (d) camDist = d; }, started: () => started, ready: () => ready };
