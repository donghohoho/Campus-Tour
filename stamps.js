// Campus stamp rally — one stamp per campus, stamped the first time you walk a little way inside its boundary.
//   • a page in the book (I → 🎫 스탬프): every playable campus, stamped or not, + milestone rewards to claim
//   • saved per device for guests (localStorage), on the account (Firestore users/{uid}.stamps) when logged in;
//     a claim writes the coins and the claim together (same as quests), so a reward can't be taken twice
import { CAMPUSES } from './campuses.js';

const KEY = 'fm:stamps', WALK_M = 15; // metres walked inside a campus before it is stamped (switching campuses alone doesn't count)
export const MILESTONES = [ // [stamps, coins, title]
  [3, 100, '캠퍼스 산책러'],
  [6, 200, '캠퍼스 여행자'],
  [9, 300, '캠퍼스 탐험가'],
  [12, 500, '캠퍼스 투어 마스터'],
];
// stamp face: short label + ink colour per campus (unknown campuses get a default)
const FACE = {
  'khu-global': ['경희 국제', '#a3262f'], 'khu-seoul': ['경희 서울', '#a3262f'], 'korea-anam': ['고려', '#8b1d2c'], 'snu-gwanak': ['서울대', '#0f3c8c'],
  'yonsei-sinchon': ['연세', '#0b3a8e'], sogang: ['서강', '#9c1c2a'], 'skku-seoul': ['성균 명륜', '#2c6e3f'], 'skku-natural': ['성균 율전', '#2c6e3f'],
  'hanyang-seoul': ['한양', '#0d4a8c'], 'cau-seoul': ['중앙', '#1b5fae'], 'hufs-seoul': ['외대', '#1c4f87'], uos: ['시립', '#245d9a'],
};
const $ = (s) => document.querySelector(s);
const ready = () => CAMPUSES.filter((c) => c.status === 'ready');

const empty = () => ({ v: 1, got: {}, claimed: [] });
function norm(s) {
  if (!s || typeof s !== 'object' || !s.got || typeof s.got !== 'object') return null;
  const out = empty();
  for (const [id, t] of Object.entries(s.got)) if (typeof id === 'string' && id.length < 64) out.got[id] = Math.max(0, +t || 0);
  out.claimed = Array.isArray(s.claimed) ? s.claimed.filter((n) => MILESTONES.some((m) => m[0] === n)) : [];
  return out;
}
const localStore = {
  load: async () => { try { return norm(JSON.parse(localStorage.getItem(KEY) || 'null')); } catch (_) { return null; } },
  save: async (s) => { try { localStorage.setItem(KEY, JSON.stringify(s)); } catch (_) {} },
};
const cloudStore = (api) => ({ load: async () => norm(await api.loadStamps()), save: (s, wallet) => api.saveStamps(s, wallet) });

export function initStamps(G) {
  // G: { toast, started(), payCoins(n) → wallet, coinPop(), campusName(id), refreshBook() }
  let S = empty(), store = localStore, cur = null, walked = 0, last = null, popT = 0;
  localStore.load().then((s) => { if (s) S = s; });
  const save = (wallet) => store.save(S, wallet).catch(() => G.toast('⚠️ 스탬프를 저장하지 못했어요', 2));
  const count = () => ready().filter((c) => S.got[c.id]).length;

  // called with the HUD update: where the player is and whether they're inside the campus boundary
  function tick(campusId, inside, x, z) {
    if (campusId !== cur) { cur = campusId; walked = 0; last = null; }
    if (!G.started() || !campusId || S.got[campusId] || !inside) { last = null; return; }
    if (last) { const d = Math.hypot(x - last[0], z - last[1]); if (d < 20) walked += d; } // a teleport doesn't count as walking
    last = [x, z];
    if (walked >= WALK_M) stamp(campusId);
  }
  function stamp(id) {
    S.got[id] = Date.now(); save(); pop(id); G.refreshBook && G.refreshBook();
    const n = count(), m = MILESTONES.find((x) => x[0] === n);
    if (m) setTimeout(() => G.toast(`🎉 스탬프 ${n}개! 도감(I) → 🎫 스탬프에서 보상 🪙 ${m[1]}을 받으세요`, 3.4), 2600);
  }
  function pop(id) {
    const el = $('#stampPop'), [label, ink] = FACE[id] || [G.campusName(id), '#7a2a2a'];
    el.style.setProperty('--ink', ink); el.replaceChildren();
    const st = document.createElement('div'); st.className = 'stampFace'; st.textContent = label;
    const t = document.createElement('b'); t.textContent = `${G.campusName(id)} 스탬프 쾅!`;
    const s = document.createElement('small'); s.textContent = `캠퍼스 스탬프 ${count()} / ${ready().length}`;
    el.append(st, t, s); el.classList.remove('hidden', 'show'); void el.offsetWidth; el.classList.add('show'); popT = 3;
  }
  function update(dt) { if (popT > 0 && (popT -= dt) <= 0) { const el = $('#stampPop'); el.classList.remove('show'); setTimeout(() => { if (popT <= 0) el.classList.add('hidden'); }, 400); } }

  async function claim(n) {
    const m = MILESTONES.find((x) => x[0] === n); if (!m || S.claimed.includes(n) || count() < n) return;
    S.claimed.push(n); const wallet = G.payCoins(m[1]); G.coinPop && G.coinPop();
    try { await store.save(S, wallet); } catch (_) { G.toast('⚠️ 보상을 저장하지 못했어요', 2); }
    G.toast(`🪙 ${m[1]} 받았어요 — 칭호 「${m[2]}」`, 2.6); G.refreshBook && G.refreshBook();
  }

  // the stamp page in the book
  function render(el) {
    el.replaceChildren(); const list = ready(), n = count();
    const head = document.createElement('p'); head.className = 'stampSub';
    const title = [...MILESTONES].reverse().find((m) => S.claimed.includes(m[0]));
    head.textContent = `캠퍼스 ${n} / ${list.length} 방문` + (title ? ` · 칭호 「${title[2]}」` : '') + ' · 캠퍼스 안을 조금 걸으면 찍혀요';
    const grid = document.createElement('div'); grid.className = 'stampGrid';
    for (const c of list) {
      const t = S.got[c.id], [label, ink] = FACE[c.id] || [c.name, '#7a2a2a'];
      const card = document.createElement('div'); card.className = 'stampCard' + (t ? ' got' : '') + (c.id === cur ? ' here' : ''); card.style.setProperty('--ink', ink);
      const face = document.createElement('div'); face.className = 'stampFace'; face.textContent = t ? label : '?';
      const nm = document.createElement('b'); nm.textContent = c.name.replace('대학교', '대');
      const dt = document.createElement('small'); dt.textContent = t ? new Date(t).toLocaleDateString('ko-KR') : c.id === cur ? '조금만 걸어 보세요' : '캠퍼스 변경(M)';
      card.append(face, nm, dt); grid.append(card);
    }
    const ms = document.createElement('ul'); ms.className = 'stampMs';
    for (const [k, coins, name] of MILESTONES) {
      const li = document.createElement('li'), got = S.claimed.includes(k), can = !got && n >= k;
      const tx = document.createElement('span'); tx.textContent = `🎫 ${k}개 · 「${name}」 · 🪙 ${coins}`;
      const b = document.createElement('button'); b.type = 'button';
      if (got) { b.textContent = '✅ 받음'; b.disabled = true; b.className = 'got'; } else if (can) { b.textContent = '보상 받기'; b.className = 'claim'; b.addEventListener('click', () => { b.disabled = true; claim(k); }); } else { b.textContent = `${n}/${k}`; b.disabled = true; }
      li.append(tx, b); ms.append(li);
    }
    el.append(head, grid, ms);
  }

  // account switch: the account's stamps + any this browser collected as a guest (stamps only ever add up)
  async function useAccount(api) {
    const local = (await localStore.load()) || empty();
    if (!api) { store = localStore; S = local; return; }
    let remote = null; try { remote = await cloudStore(api).load(); } catch (_) { G.toast('⚠️ 계정의 스탬프를 불러오지 못했어요 — 이번에는 이 기기에 저장할게요', 3); return; }
    store = cloudStore(api); S = remote || empty();
    let add = !remote; for (const [id, t] of Object.entries(local.got)) if (!S.got[id]) { S.got[id] = t; add = true; }
    if (add) save();
    G.refreshBook && G.refreshBook();
  }
  return { tick, update, render, claim, useAccount, count, state: () => S };
}
