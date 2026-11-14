// Multiplayer — everyone on the same campus shares one room.
// Peer-to-peer over WebRTC (Trystero; public Nostr relays only introduce peers), so no game server is needed.
// Shows other players (character, walk animation, nickname), chat bubbles + chat log, emotes, and signs people leave on the map.
// Signs have no server to live on: every visitor keeps the signs they've seen (localStorage) and hands them to whoever joins later.
//
//   ?mp=local  use a BroadcastChannel between tabs of this browser instead of the network (for testing)
//   ?mp=off    play alone
import * as THREE from 'three';
import { clone as cloneSkinned } from 'three/addons/utils/SkeletonUtils.js';

const APP_ID = 'donghohoho/campus-tour';
const SEND_HZ = 10, SHOW_DIST = 130, MAX_MODELS = 16;
const NAME_MAX = 12, CHAT_MAX = 80, SIGN_MAX = 40, SIGN_LIMIT = 150, SIGN_COOLDOWN = 15;
const EMOTES = ['👋', '❤️', '😂', '🎉'];
// TURN relay for networks where devices can't reach each other directly (strict NAT, mobile data, client isolation).
// e.g. [{ urls: 'turn:…', username: '…', credential: '…' }]; empty = direct connections only (STUN).
const TURN = [];
const QS = new URLSearchParams(location.search), MODE = QS.get('mp') || 'p2p';
const $ = (s) => document.querySelector(s);
const clean = (s, n) => String(s == null ? '' : s).replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, n);
const num = (v, d = 0) => (Number.isFinite(v) ? v : d);
const store = { get(k, d) { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (_) { return d; } }, set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (_) {} } };
const angDiff = (a, b) => { let d = (b - a) % (Math.PI * 2); if (d > Math.PI) d -= Math.PI * 2; if (d < -Math.PI) d += Math.PI * 2; return d; };
const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);

// ── transports: same small interface for the network and for local testing ──
async function joinP2P(roomId) {
  const { joinRoom } = await import('./vendor/trystero.min.js');
  const cfg = { appId: APP_ID }; if (TURN.length) cfg.turnConfig = TURN;
  const room = joinRoom(cfg, roomId), acts = new Map();
  const act = (t) => { if (!acts.has(t)) acts.set(t, room.makeAction(t)); return acts.get(t); };
  return {
    send: (t, d, to) => act(t).send(d, to ? { target: to } : undefined).catch(() => {}),
    on: (t, fn) => act(t).onMessage((d, ctx) => fn(d, ctx.peerId)),
    onJoin: (fn) => room.onPeerJoin((c) => fn(c.peerId)),
    onLeave: (fn) => room.onPeerLeave((c) => fn(c.peerId)),
    onError: (fn) => room.onError(fn),
    addStream: (st, to) => room.addStream(st, to ? { target: to } : undefined).catch(() => {}),
    removeStream: (st) => { try { room.removeStream(st); } catch (_) {} },
    onStream: (fn) => room.onPeerStream((st, c) => fn(st, c.peerId)),
    leave: () => room.leave().catch(() => {}),
  };
}
function joinLocal(roomId) {
  const ch = new BroadcastChannel('campus-tour:' + roomId), me = uid(), hs = new Map(), joins = [], leaves = [], peers = new Set();
  const post = (type, data, to) => ch.postMessage({ from: me, to: to || null, type, data });
  const join = (p) => { if (peers.has(p)) return; peers.add(p); joins.forEach((f) => f(p)); };
  ch.onmessage = ({ data: m }) => {
    if (m.from === me || (m.to && m.to !== me)) return;
    if (m.type === '__hi') { post('__ack', null, m.from); join(m.from); return; }
    if (m.type === '__ack') { join(m.from); return; }
    if (m.type === '__bye') { if (peers.delete(m.from)) leaves.forEach((f) => f(m.from)); return; }
    join(m.from); (hs.get(m.type) || []).forEach((f) => f(m.data, m.from));
  };
  const bye = () => post('__bye'); addEventListener('pagehide', bye);
  setTimeout(() => post('__hi'), 0);
  return {
    send: async (t, d, to) => post(t, d, to),
    on: (t, fn) => { if (!hs.has(t)) hs.set(t, []); hs.get(t).push(fn); },
    onJoin: (fn) => joins.push(fn), onLeave: (fn) => leaves.push(fn), onError: () => {}, addStream: async () => {}, removeStream: () => {}, onStream: () => {}, // no voice between tabs
    leave: async () => { bye(); removeEventListener('pagehide', bye); ch.close(); },
  };
}

// ── canvas sprites for nameplates, chat bubbles and emotes ──
function textSprite(lines, { font = 28, pad = 12, bg = 'rgba(16,22,44,0.78)', fg = '#fdf8e8', worldH = 0.3, maxW = 520, tail = false } = {}) {
  const c = document.createElement('canvas'), g = c.getContext('2d'), F = `700 ${font}px "Pretendard","Apple SD Gothic Neo","Malgun Gothic",system-ui,sans-serif`;
  g.font = F; const wrapped = [];
  for (const line of lines) { let cur = ''; for (const ch of line) { if (g.measureText(cur + ch).width > maxW - pad * 2 && cur) { wrapped.push(cur); cur = ''; } cur += ch; } wrapped.push(cur); }
  const shown = wrapped.slice(0, 4), lh = font * 1.25, w = Math.ceil(Math.min(maxW, Math.max(...shown.map((l) => g.measureText(l).width)) + pad * 2)), th = tail ? 12 : 0, h = Math.ceil(shown.length * lh + pad * 1.4) + th;
  c.width = w; c.height = h; g.font = F; g.fillStyle = bg;
  const r = Math.min(16, (h - th) / 2); g.beginPath(); g.roundRect(0, 0, w, h - th, r); if (tail) { g.moveTo(w / 2 - 10, h - th); g.lineTo(w / 2, h); g.lineTo(w / 2 + 10, h - th); } g.fill();
  g.fillStyle = fg; g.textAlign = 'center'; g.textBaseline = 'middle'; shown.forEach((l, i) => g.fillText(l, w / 2, pad * 0.7 + lh * (i + 0.5)));
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false, fog: false }));
  sp.scale.set(w * worldH / font * 0.8, h * worldH / font * 0.8, 1); sp.renderOrder = 20; sp.center.set(0.5, 0);
  return sp;
}
const disposeSprite = (sp) => { if (!sp) return; sp.parent && sp.parent.remove(sp); sp.material.map.dispose(); sp.material.dispose(); };

// ── signs ──
const postGeo = new THREE.BoxGeometry(0.1, 1.3, 0.1), boardGeo = new THREE.BoxGeometry(1.5, 0.78, 0.07), faceGeo = new THREE.PlaneGeometry(1.42, 0.7);
const woodMat = new THREE.MeshLambertMaterial({ color: 0x8a5a34 }), boardMat = new THREE.MeshLambertMaterial({ color: 0xb98454 });
function signFace(text, name) {
  const c = document.createElement('canvas'); c.width = 512; c.height = 252; const g = c.getContext('2d');
  g.fillStyle = '#f3e3c3'; g.fillRect(0, 0, 512, 252); g.strokeStyle = '#8a5a34'; g.lineWidth = 8; g.strokeRect(4, 4, 504, 244);
  g.fillStyle = '#2b2118'; g.textAlign = 'center'; g.textBaseline = 'middle'; const F = (px) => `700 ${px}px "Pretendard","Apple SD Gothic Neo","Malgun Gothic",system-ui,sans-serif`;
  let px = 44, lines; for (; px >= 26; px -= 4) { g.font = F(px); lines = []; let cur = ''; for (const ch of text) { if (g.measureText(cur + ch).width > 470 && cur) { lines.push(cur); cur = ''; } cur += ch; } lines.push(cur); if (lines.length * px * 1.2 <= 170) break; }
  const lh = px * 1.2, top = 108 - (lines.length - 1) * lh / 2; lines.slice(0, 5).forEach((l, i) => g.fillText(l, 256, top + i * lh));
  g.font = F(22); g.fillStyle = '#6b5440'; g.fillText('— ' + name, 256, 222);
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4; return tex;
}

export function initMultiplayer(G) {
  // G: { scene, player, pRoot, charSrc, charIndex(), terrainH(x,z), toast(msg,s), started(), menuOpen(), touch, lockPointer(), camera }
  const avatars = new Map(); // peerId → avatar
  const signGroup = new THREE.Group(); G.scene.add(signGroup);
  let net = null, roomId = null, joinTok = 0, sendAcc = 0, signs = new Map(), dead = new Set(), lastSign = -1e9, typing = null, myBubble = null, myBubbleT = 0, myEmote = null, myEmoteT = 0, now = 0;
  const me = store.get('fm:uid', null) || (() => { const u = uid(); store.set('fm:uid', u); return u; })();
  let myName = clean(store.get('fm:name', ''), NAME_MAX) || '방문자' + Math.floor(1000 + Math.random() * 9000);

  // ── start-screen nickname ──
  const nick = $('#nick'); nick.value = myName;
  nick.addEventListener('input', () => { const v = clean(nick.value, NAME_MAX); if (v) { myName = v; store.set('fm:name', v); } });
  nick.addEventListener('change', () => { nick.value = myName; if (net) net.send('hi', hello()); });

  // ── HUD ──
  const bar = $('#mpBar'), countEl = $('#mpCount'), log = $('#chatLog'), form = $('#chatForm'), input = $('#chatInput'), emotePop = $('#emotePop'), delBtn = $('#mpDel');
  const setStatus = (t) => { countEl.textContent = t; };
  const failed = new Set();
  const refreshCount = () => setStatus(net ? `👥 ${avatars.size + 1}명` + (failed.size ? ` · ⚠️ 연결 실패 ${failed.size}` : '') : '👤 혼자 모드');
  function addLog(who, text, sys) {
    const li = document.createElement('li'); if (sys) li.className = 'sys';
    if (who) { const b = document.createElement('b'); b.textContent = who; li.append(b, ' '); }
    li.append(text); log.append(li); while (log.children.length > 40) log.firstChild.remove();
    log.classList.add('fresh'); clearTimeout(addLog.t); addLog.t = setTimeout(() => log.classList.remove('fresh'), 12000);
    log.scrollTop = log.scrollHeight;
  }
  function openInput(mode) {
    if (!G.started() || G.menuOpen()) return;
    typing = mode; form.classList.remove('hidden'); log.classList.add('open'); emotePop.classList.add('hidden');
    input.maxLength = mode === 'sign' ? SIGN_MAX : CHAT_MAX; input.placeholder = mode === 'sign' ? `표지판에 남길 글 (${SIGN_MAX}자)` : '채팅 입력 후 Enter';
    $('#chatSend').textContent = mode === 'sign' ? '세우기' : '보내기';
    G.releaseKeys(); if (document.pointerLockElement) document.exitPointerLock(); input.value = ''; input.focus();
  }
  function closeInput(relock) { typing = null; form.classList.add('hidden'); log.classList.remove('open'); input.blur(); if (relock && !G.touch) G.lockPointer(); }
  form.addEventListener('submit', (e) => {
    e.preventDefault(); const mode = typing, text = clean(input.value, mode === 'sign' ? SIGN_MAX : CHAT_MAX); closeInput(true);
    if (!text) return; if (mode === 'sign') placeSign(text); else sendChat(text);
  });
  input.addEventListener('keydown', (e) => { if (e.key === 'Escape') { e.preventDefault(); closeInput(false); } e.stopPropagation(); });
  input.addEventListener('keyup', (e) => e.stopPropagation());
  $('#mpChat').addEventListener('click', () => (typing ? closeInput(false) : openInput('chat')));
  $('#mpSign').addEventListener('click', () => (typing ? closeInput(false) : openInput('sign')));
  $('#mpEmote').addEventListener('click', () => emotePop.classList.toggle('hidden'));
  emotePop.addEventListener('click', (e) => { const b = e.target.closest('button[data-e]'); if (b) { emote(Number(b.dataset.e)); emotePop.classList.add('hidden'); } });
  delBtn.addEventListener('click', () => removeNearSign());
  // ── proximity voice chat: mic off by default; others are heard through a 3D panner (loud nearby, silent beyond VOICE_FAR) ──
  const VOICE_NEAR = 3, VOICE_FAR = 35, micBtn = $('#mpMic');
  let actx = null, mic = null, micBusy = false, myVoice = null, myTalk = null; // myVoice: analyser on my own mic for the 🔊 over my head
  // iPhone's silent switch mutes Web Audio unless the page declares itself a playback app (Safari 17+)
  const audioCtx = () => { try { if (navigator.audioSession && navigator.audioSession.type !== 'play-and-record') navigator.audioSession.type = mic ? 'play-and-record' : 'playback'; } catch (_) {} if (!actx) { const AC = window.AudioContext || window.webkitAudioContext; if (AC) actx = new AC(); } if (actx && actx.state === 'suspended') actx.resume().catch(() => {}); return actx; };
  function setMicUi() { micBtn.classList.toggle('on', !!mic); micBtn.setAttribute('aria-pressed', String(!!mic)); micBtn.querySelector('.mpLabel').textContent = mic ? '마이크 켜짐' : '마이크'; }
  async function toggleMic() {
    if (micBusy) return; audioCtx();
    if (mic) { if (net) net.removeStream(mic); mic.getTracks().forEach((t) => t.stop()); mic = null; setMicUi(); G.toast('마이크를 껐어요', 1.4); return; }
    if (!net) { G.toast('다른 사람과 연결된 뒤에 쓸 수 있어요', 2); return; }
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) { G.toast('이 브라우저는 마이크를 쓸 수 없어요', 2); return; }
    micBusy = true;
    // the browser's permission prompt can't be clicked while the mouse is locked to the game, so free the mouse first
    const wasLocked = !!document.pointerLockElement; if (wasLocked) { G.releaseKeys(); document.exitPointerLock(); }
    micBtn.querySelector('.mpLabel').textContent = '권한 확인 중…'; if (wasLocked) G.toast('브라우저 창에서 마이크 허용을 눌러 주세요', 3);
    try { mic = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } }); if (net) net.addStream(mic); if (G.touch) { G.toast('🔕 무음 모드를 꺼 주세요! 켜져 있으면 상대 목소리가 안 들릴 수 있어요', 4); addLog(null, '📱 모바일은 무음 모드를 꺼야 상대 목소리가 잘 들려요', true); } else G.toast('마이크 켜짐 — 가까이 있는 사람에게 들려요' + (wasLocked ? ' (화면을 클릭하면 다시 조작)' : ''), 2.6); }
    catch (e) {
      mic = null; const n = e && e.name;
      addLog(null, n === 'NotAllowedError' ? '마이크가 차단돼 있어요 — 주소창 왼쪽 사이트 설정에서 마이크를 "허용"으로 바꾸고, 맥이라면 시스템 설정 › 개인정보 보호 및 보안 › 마이크에서 이 브라우저를 켜 주세요'
        : n === 'NotFoundError' ? '연결된 마이크를 찾지 못했어요' : n === 'NotReadableError' ? '다른 앱(줌·디스코드 등)이 마이크를 쓰고 있어서 켜지 못했어요' : '마이크를 켜지 못했어요 (' + (n || e) + ')', true);
      G.toast('마이크를 켜지 못했어요 — 채팅창 안내를 확인해 주세요', 2.6);
    }
    micBusy = false; setMicUi();
  }
  function attachVoice(av, stream) {
    dropVoice(av); const ctx = audioCtx(); if (!ctx) return;
    const el = new Audio(); el.muted = true; el.srcObject = stream; el.play().catch(() => {}); // Chrome only pulls WebRTC audio into WebAudio while an element plays it
    const src = ctx.createMediaStreamSource(stream), pan = ctx.createPanner(), an = ctx.createAnalyser();
    pan.panningModel = 'HRTF'; pan.distanceModel = 'linear'; pan.refDistance = VOICE_NEAR; pan.maxDistance = VOICE_FAR; pan.rolloffFactor = 1;
    an.fftSize = 256; src.connect(an); src.connect(pan); pan.connect(ctx.destination);
    av.voice = { el, src, pan, an, buf: new Uint8Array(an.fftSize), lvl: 0 };
  }
  function dropVoice(av) { const v = av.voice; if (!v) return; try { v.src.disconnect(); v.pan.disconnect(); } catch (_) {} v.el.srcObject = null; av.voice = null; if (av.talk) { disposeSprite(av.talk); av.talk = null; } }
  function setPos(param, val, t) { if (param && param.setTargetAtTime) param.setTargetAtTime(val, t, 0.05); }
  function updateVoice(dt) {
    if (!actx) return; const t = actx.currentTime, L = actx.listener, p = G.player.pos, cam = G.camera, fwd = new THREE.Vector3(); cam.getWorldDirection(fwd);
    if (L.positionX) { setPos(L.positionX, p.x, t); setPos(L.positionY, p.y + 1.6, t); setPos(L.positionZ, p.z, t); setPos(L.forwardX, fwd.x, t); setPos(L.forwardY, fwd.y, t); setPos(L.forwardZ, fwd.z, t); L.upX.value = 0; L.upY.value = 1; L.upZ.value = 0; }
    else { L.setPosition(p.x, p.y + 1.6, p.z); L.setOrientation(fwd.x, fwd.y, fwd.z, 0, 1, 0); }
    // my own 🔊 while I'm talking
    if (mic && (!myVoice || myVoice.stream !== mic)) { if (myVoice) try { myVoice.src.disconnect(); } catch (_) {} const src = actx.createMediaStreamSource(mic), an = actx.createAnalyser(); an.fftSize = 256; src.connect(an); myVoice = { stream: mic, src, an, buf: new Uint8Array(256), lvl: 0 }; }
    if (!mic && myVoice) { try { myVoice.src.disconnect(); } catch (_) {} myVoice = null; }
    let meTalking = false;
    if (myVoice) { myVoice.an.getByteTimeDomainData(myVoice.buf); let sum = 0; for (const b of myVoice.buf) sum += (b - 128) * (b - 128); myVoice.lvl = Math.max(Math.sqrt(sum / myVoice.buf.length), myVoice.lvl - dt * 40); meTalking = myVoice.lvl > 4; }
    if (meTalking && !myTalk) { myTalk = textSprite(['🔊'], { font: 40, worldH: 0.32, bg: 'rgba(0,0,0,0)', pad: 2 }); myTalk.position.set(0, 1.95, 0); G.pRoot.add(myTalk); }
    else if (!meTalking && myTalk) { disposeSprite(myTalk); myTalk = null; }
    for (const av of avatars.values()) {
      const v = av.voice; if (!v) continue; const c = av.cur;
      if (v.pan.positionX) { setPos(v.pan.positionX, c.x, t); setPos(v.pan.positionY, c.y + 1.6, t); setPos(v.pan.positionZ, c.z, t); } else v.pan.setPosition(c.x, c.y + 1.6, c.z);
      v.an.getByteTimeDomainData(v.buf); let sum = 0; for (const b of v.buf) sum += (b - 128) * (b - 128); const rms = Math.sqrt(sum / v.buf.length);
      v.lvl = Math.max(rms, v.lvl - dt * 40); const talking = v.lvl > 4 && Math.hypot(c.x - p.x, c.z - p.z) < VOICE_FAR;
      if (talking && !av.talk) { av.talk = textSprite(['🔊'], { font: 40, worldH: 0.32, bg: 'rgba(0,0,0,0)', pad: 2 }); av.talk.position.set(0.0, 2.25, 0); av.root.add(av.talk); }
      else if (!talking && av.talk) { disposeSprite(av.talk); av.talk = null; }
    }
  }
  micBtn.addEventListener('click', toggleMic);
  window.addEventListener('pointerdown', () => audioCtx(), { once: true });
  window.addEventListener('keydown', () => audioCtx(), { once: true });

  // ── player list: P toggles it (or tap the player count) ──
  const plist = $('#playerList'), plBody = $('#plBody');
  const charName = (i) => { const el = document.querySelector(`.charBtn[data-i="${i}"] span`); return el ? el.textContent : '캐릭터 ' + (i + 1); };
  function renderList() {
    const p = G.player.pos, rows = [{ name: myName, char: G.charIndex(), d: -1, me: true }];
    for (const av of avatars.values()) if (av.has || av.name !== '…') rows.push({ name: av.name, char: av.char, d: av.has ? Math.hypot(av.cur.x - p.x, av.cur.z - p.z) : null });
    rows.sort((a, b) => (a.me ? -1 : b.me ? 1 : (a.d ?? 1e9) - (b.d ?? 1e9)));
    $('#plTitle').textContent = `접속 중 ${rows.length}명` + (net ? '' : ' · 혼자 모드');
    plBody.replaceChildren(...rows.map((r) => { const tr = document.createElement('tr'); if (r.me) tr.className = 'me'; for (const t of [r.name + (r.me ? ' (나)' : ''), charName(r.char), r.me ? '—' : r.d == null ? '…' : `${Math.round(r.d)}m`]) { const td = document.createElement('td'); td.textContent = t; tr.append(td); } return tr; }));
  }
  let listOpen = false, listT = 0;
  const showList = (on) => { listOpen = on; plist.classList.toggle('hidden', !on); if (on) renderList(); };
  countEl.addEventListener('click', () => showList(!listOpen));
  window.addEventListener('keydown', (e) => {
    if (e.code === 'KeyP' && G.started() && !G.menuOpen() && !typing && !(e.target instanceof HTMLInputElement)) { if (!e.repeat) showList(!listOpen); return; }
    if (!G.started() || G.menuOpen() || typing || e.target instanceof HTMLInputElement) return;
    if (e.code === 'Enter' || e.code === 'NumpadEnter') { e.preventDefault(); openInput('chat'); }
    else if (e.code === 'KeyB') { e.preventDefault(); openInput('sign'); }
    else if (e.code === 'KeyX') removeNearSign();
    else if (e.code === 'KeyV' && !e.repeat) toggleMic();
    else { const n = ['Digit1', 'Digit2', 'Digit3', 'Digit4'].indexOf(e.code); if (n >= 0 && !e.repeat) emote(n); }
  });

  // ── avatars ──
  function hello() { return { name: myName, char: G.charIndex() }; }
  function pickChar(i) { return G.charSrc[i] ? i : G.charSrc.findIndex(Boolean); }
  function makeModel(av) {
    if (av.model) { av.body.remove(av.model); av.model = null; av.mixer = null; }
    const ci = pickChar(av.char); av.shownChar = av.char; const src = G.charSrc[ci]; if (!src) return;
    const m = cloneSkinned(src.model); m.traverse((o) => { if (o.isSkinnedMesh) o.frustumCulled = false; });
    av.model = m; av.body.add(m);
    if (src.clip) { av.mixer = new THREE.AnimationMixer(m); av.action = av.mixer.clipAction(src.clip); av.action.play(); av.action.setEffectiveWeight(0); av.w = 0; }
  }
  function setPlate(av) { disposeSprite(av.plate); av.plate = textSprite([av.name], { font: 26, worldH: 0.24, bg: 'rgba(16,22,44,0.62)' }); av.plate.position.y = 1.95; av.root.add(av.plate); }
  function getAvatar(peer) {
    let av = avatars.get(peer); if (av) return av;
    const root = new THREE.Group(), body = new THREE.Group(); root.add(body); root.visible = false; G.scene.add(root);
    av = { peer, root, body, name: '…', char: 0, shownChar: -1, has: false, t: { x: 0, y: 0, z: 0, yaw: 0, sp: 0 }, cur: { x: 0, y: 0, z: 0, yaw: 0, sp: 0 }, plate: null, bubble: null, bubbleT: 0, emote: null, emoteT: 0 };
    avatars.set(peer, av); setPlate(av); refreshCount(); return av;
  }
  function dropAvatar(peer) {
    const av = avatars.get(peer); if (!av) return; avatars.delete(peer);
    dropVoice(av); disposeSprite(av.plate); disposeSprite(av.bubble); disposeSprite(av.emote); G.scene.remove(av.root);
    if (av.has && av.name !== '…') addLog(null, `${av.name}님이 나갔어요`, true); refreshCount();
  }
  function bubble(target, text, isMe) {
    const sp = textSprite([text], { font: 26, worldH: 0.26, bg: 'rgba(255,253,246,0.94)', fg: '#1d2a22', maxW: 440, tail: true });
    if (isMe) { disposeSprite(myBubble); myBubble = sp; myBubbleT = 7; sp.position.y = 1.95; G.pRoot.add(sp); }
    else { disposeSprite(target.bubble); target.bubble = sp; target.bubbleT = 7; sp.position.y = 2.25; target.root.add(sp); }
  }
  function emoteSprite(holder, n, y) { const sp = textSprite([EMOTES[n]], { font: 64, worldH: 0.5, bg: 'rgba(0,0,0,0)', pad: 4 }); sp.position.y = y; holder.add(sp); return sp; }

  // ── actions ──
  function sendChat(text) { addLog(myName, text); bubble(null, text, true); if (net) net.send('ch', { text }); }
  function emote(n) {
    disposeSprite(myEmote); myEmote = emoteSprite(G.pRoot, n, 2.1); myEmoteT = 2.2; G.player.squashV = 6;
    if (G.player.grounded) G.player.jumpBuf = 0.14; if (net) net.send('em', { e: n });
  }
  function signKey() { return 'fm:signs:' + roomId; }
  function saveSigns() { store.set(signKey(), { s: [...signs.values()], d: [...dead].slice(-300) }); }
  function addSign(s, save = true) {
    if (!s || typeof s.id !== 'string' || dead.has(s.id) || signs.has(s.id)) return false;
    const sg = { id: clean(s.id, 24), by: clean(s.by, 24), name: clean(s.name, NAME_MAX) || '익명', text: clean(s.text, SIGN_MAX), x: num(s.x), y: num(s.y), z: num(s.z), yaw: num(s.yaw), t: num(s.t) };
    if (!sg.text || Math.abs(sg.x) > 2000 || Math.abs(sg.z) > 2000) return false;
    signs.set(sg.id, sg); drawSign(sg);
    while (signs.size > SIGN_LIMIT) { const oldest = [...signs.values()].sort((a, b) => a.t - b.t)[0]; killSign(oldest.id, false); }
    if (save) saveSigns(); return true;
  }
  function drawSign(s) {
    const g = new THREE.Group(); g.position.set(s.x, s.y, s.z); g.rotation.y = s.yaw; g.userData.sign = s.id;
    const post = new THREE.Mesh(postGeo, woodMat); post.position.y = 0.65; post.castShadow = true;
    const board = new THREE.Mesh(boardGeo, boardMat); board.position.y = 1.5; board.castShadow = true;
    const mat = new THREE.MeshLambertMaterial({ map: signFace(s.text, s.name), emissive: 0xffffff, emissiveIntensity: 0.32 }); mat.emissiveMap = mat.map;
    const f1 = new THREE.Mesh(faceGeo, mat); f1.position.set(0, 1.5, 0.04); const f2 = new THREE.Mesh(faceGeo, mat); f2.position.set(0, 1.5, -0.04); f2.rotation.y = Math.PI;
    g.add(post, board, f1, f2); signGroup.add(g);
  }
  function killSign(id, save = true) {
    signs.delete(id); dead.add(id);
    for (const g of [...signGroup.children]) if (g.userData.sign === id) { const m = g.children[2].material; m.map.dispose(); m.dispose(); signGroup.remove(g); }
    if (save) saveSigns();
  }
  function placeSign(text) {
    if (now - lastSign < SIGN_COOLDOWN) { G.toast(`표지판은 ${Math.ceil(SIGN_COOLDOWN - (now - lastSign))}초 뒤에 다시 세울 수 있어요`, 2); return; }
    const p = G.player, fx = Math.sin(p.yaw), fz = Math.cos(p.yaw), x = p.pos.x + fx * 1.6, z = p.pos.z + fz * 1.6;
    const s = { id: uid(), by: me, name: myName, text, x: +x.toFixed(2), y: +p.pos.y.toFixed(2), z: +z.toFixed(2), yaw: +(p.yaw + Math.PI).toFixed(3), t: Date.now() };
    lastSign = now; addSign(s); if (net) net.send('sg', { list: [s] }); G.toast('표지판을 세웠어요 — 다른 사람들도 볼 수 있어요', 2.2);
  }
  function mySignNear() { const p = G.player.pos; let best = null, bd = 3.2; for (const s of signs.values()) if (s.by === me) { const d = Math.hypot(s.x - p.x, s.z - p.z); if (d < bd) { bd = d; best = s; } } return best; }
  function removeNearSign() { const s = mySignNear(); if (!s) return; killSign(s.id); if (net) net.send('sd', { id: s.id, by: me }); G.toast('내 표지판을 지웠어요', 1.6); }

  // ── room ──
  function wire(n) {
    n.onJoin((peer) => { if (failed.delete(peer)) refreshCount(); getAvatar(peer); if (mic) n.addStream(mic, peer); n.send('hi', hello(), peer); if (signs.size) n.send('sg', { list: [...signs.values()] }, peer); });
    n.onLeave((peer) => dropAvatar(peer));
    n.on('hi', (d, peer) => { const av = getAvatar(peer), nm = clean(d && d.name, NAME_MAX) || '익명', first = av.name === '…'; const ch = Math.max(0, Math.min(15, num(d && d.char) | 0)); if (nm !== av.name) { av.name = nm; setPlate(av); } av.char = ch; if (first) addLog(null, `${nm}님이 들어왔어요`, true); });
    n.on('st', (d, peer) => {
      if (!Array.isArray(d) || d.length < 6) return; const av = getAvatar(peer);
      const t = av.t; t.x = num(d[0]); t.y = num(d[1]); t.z = num(d[2]); t.yaw = num(d[3]); t.sp = Math.min(12, Math.abs(num(d[4]))); const ch = num(d[5]) | 0; if (ch >= 0 && ch < 16) av.char = ch;
      if (!av.has) { av.has = true; Object.assign(av.cur, t); av.root.visible = true; }
      av.seen = now;
    });
    n.on('ch', (d, peer) => { const text = clean(d && d.text, CHAT_MAX); if (!text) return; const av = getAvatar(peer); addLog(av.name, text); bubble(av, text, false); });
    n.on('em', (d, peer) => { const e = num(d && d.e, -1) | 0; if (e < 0 || e >= EMOTES.length) return; const av = getAvatar(peer); disposeSprite(av.emote); av.emote = emoteSprite(av.root, e, 2.4); av.emoteT = 2.2; }); // the emote's jump arrives with the position updates
    n.on('sg', (d) => { if (!d || !Array.isArray(d.list)) return; let any = false; for (const s of d.list.slice(0, SIGN_LIMIT)) any = addSign(s, false) || any; if (any) saveSigns(); });
    n.on('sd', (d) => { const s = d && signs.get(d.id); if (s && s.by === d.by) killSign(s.id); });
    n.onError((e) => { // a peer was found through the relay but the direct (WebRTC) connection failed
      const msg = String((e && (e.message || e.error || e.type)) || e), id = (msg.match(/peer (\S+)/) || [])[1] || msg;
      if (failed.has(id)) return; failed.add(id); refreshCount(); console.warn('[mp]', msg);
      if (failed.size === 1) addLog(null, '다른 플레이어를 찾았지만 직접 연결에 실패했어요 (네트워크가 기기 간 연결을 막는 경우)', true);
    });
    n.onStream((stream, peer) => { if (stream.getAudioTracks().length) attachVoice(getAvatar(peer), stream); });
  }
  async function enter(id) {
    if (id === roomId) return; const tok = ++joinTok;
    if (net) { const old = net; net = null; if (mic) { old.removeStream(mic); mic.getTracks().forEach((t) => t.stop()); mic = null; setMicUi(); } old.leave(); }
    for (const p of [...avatars.keys()]) dropAvatar(p); failed.clear();
    for (const id2 of [...signs.keys()]) killSign(id2, false); dead.clear(); roomId = id;
    const saved = store.get(signKey(), null); if (saved) { (saved.d || []).forEach((x) => dead.add(x)); (saved.s || []).forEach((s) => addSign(s, false)); }
    bar.classList.remove('hidden'); log.classList.remove('hidden');
    if (MODE === 'off') { refreshCount(); return; }
    setStatus('🔌 연결 중…');
    try { const n = MODE === 'local' ? joinLocal('local:' + id) : await joinP2P(id); if (tok !== joinTok) { n.leave(); return; } net = n; wire(n); refreshCount(); }
    catch (e) { if (tok === joinTok) { net = null; setStatus('👤 혼자 모드'); addLog(null, '다른 사람과 연결하지 못했어요 — 혼자 플레이합니다', true); } }
  }

  // ── per frame ──
  const tmp = new THREE.Vector3();
  function update(dt) {
    now += dt;
    if (net) { sendAcc += dt; if (sendAcc >= 1 / SEND_HZ) { sendAcc = 0; const p = G.player; net.send('st', [+p.pos.x.toFixed(2), +p.pos.y.toFixed(2), +p.pos.z.toFixed(2), +p.yaw.toFixed(3), +p.speed.toFixed(2), G.charIndex()]); } }
    if (G.charIndex() !== update.lastChar) { update.lastChar = G.charIndex(); if (net) net.send('hi', hello()); }
    if (myBubble && (myBubbleT -= dt) <= 0) { disposeSprite(myBubble); myBubble = null; }
    if (myEmote) { myEmote.position.y += dt * 0.4; if ((myEmoteT -= dt) <= 0) { disposeSprite(myEmote); myEmote = null; } }
    // nearest players get full models; the rest just a nameplate
    updateVoice(dt);
    const cam = G.camera.position, list = [];
    for (const av of avatars.values()) {
      if (!av.has) continue;
      if (av.seen != null && now - av.seen > 20) { av.root.visible = false; continue; } // silent peer (tab in background)
      const k = 1 - Math.exp(-12 * dt), c = av.cur, t = av.t;
      if (Math.hypot(t.x - c.x, t.z - c.z) > 30) Object.assign(c, t); // teleport / respawn
      c.x += (t.x - c.x) * k; c.y += (t.y - c.y) * k; c.z += (t.z - c.z) * k; c.yaw += angDiff(c.yaw, t.yaw) * k; c.sp += (t.sp - c.sp) * k;
      av.root.position.set(c.x, c.y, c.z); av.body.rotation.y = c.yaw;
      const d = tmp.set(c.x, c.y, c.z).distanceTo(cam); av.dist = d; av.root.visible = d < SHOW_DIST * 2.5; list.push(av);
      if (av.bubble && (av.bubbleT -= dt) <= 0) { disposeSprite(av.bubble); av.bubble = null; }
      if (av.emote) { av.emote.position.y += dt * 0.4; if ((av.emoteT -= dt) <= 0) { disposeSprite(av.emote); av.emote = null; } }
    }
    list.sort((a, b) => a.dist - b.dist);
    list.forEach((av, i) => {
      const full = i < MAX_MODELS && av.dist < SHOW_DIST;
      if (full && (!av.model || av.shownChar !== av.char)) makeModel(av);
      if (av.model) av.model.visible = full;
      if (av.plate) av.plate.visible = av.dist < 60;
      if (full && av.mixer) { const tw = Math.min(1, av.cur.sp / 1.0); av.w += (tw - av.w) * (1 - Math.exp(-8 * dt)); av.action.setEffectiveWeight(av.w); av.action.timeScale = 0.9 + Math.min(av.cur.sp, 9) * 0.23; av.mixer.update(dt); }
    });
    if (listOpen && (listT -= dt) <= 0) { listT = 0.5; renderList(); }
    // own-sign delete button
    const near = !!mySignNear(); if (near !== update.near) { update.near = near; delBtn.classList.toggle('hidden', !near); }
  }
  return { enter, update, typing: () => !!typing };
}
