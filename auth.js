// Accounts: nickname + password (Firebase Authentication + Firestore). Guests play without an account (saved in this browser only).
//
// Setup (once): create a Firebase project, enable Authentication → Email/Password and Firestore, then paste the web app
// config below. Until then only guest mode is offered.
//   Firestore rules:  match /users/{uid} { allow read, write: if request.auth != null && request.auth.uid == uid; }
//
// The nickname is the login id: it is turned into a hidden e-mail address (Firebase needs one), so each nickname can only
// be registered once. Passwords never touch this code's storage — Firebase handles them.
export const FIREBASE_CONFIG = {
  apiKey: 'AIzaSyDQsJ85w0tiwD8nbEK7GN6v0zkOGpZ6GCk',
  authDomain: 'campustour-aa079.firebaseapp.com',
  projectId: 'campustour-aa079',
  storageBucket: 'campustour-aa079.firebasestorage.app',
  messagingSenderId: '180845335435',
  appId: '1:180845335435:web:dd3413e8d145ba0495558e',
};

export const SIGN_DAYS = 30;
const NICK_RE = /^[\p{L}\p{N}_ .-]{2,12}$/u;
const nickToEmail = (nick) => 'u' + [...new TextEncoder().encode(nick.normalize('NFC').toLowerCase())].map((b) => b.toString(16).padStart(2, '0')).join('') + '@campus-tour.app';

export function initAuth() {
  let fb = null, auth = null, db = null, user = null, ready = null;
  const listeners = [];
  const emit = () => listeners.forEach((f) => f(user));
  if (FIREBASE_CONFIG) ready = import('./vendor/firebase.min.js').then((m) => {
    fb = m; const app = m.initializeApp(FIREBASE_CONFIG); auth = m.getAuth(app); db = m.getFirestore(app);
    return new Promise((res) => m.onAuthStateChanged(auth, (u) => { user = u ? { uid: u.uid, nick: u.displayName || '', anon: u.isAnonymous } : null; emit(); res(); }));
  }).catch((e) => { console.warn('firebase unavailable', e); fb = null; });
  const why = (e) => {
    const c = (e && e.code) || '';
    if (c.includes('wrong-password') || c.includes('invalid-credential') || c.includes('invalid-login')) return '비밀번호가 맞지 않아요';
    if (c.includes('too-many-requests')) return '시도가 너무 많아요. 잠시 뒤에 다시 해 주세요';
    if (c.includes('network')) return '인터넷 연결을 확인해 주세요';
    if (c.includes('weak-password')) return '비밀번호는 6자 이상이어야 해요';
    return '로그인하지 못했어요 (' + (c || e) + ')';
  };
  return {
    available: () => !!FIREBASE_CONFIG,
    ready: () => ready || Promise.resolve(),
    user: () => (user && !user.anon ? user : null), // a real account (guests may hold an anonymous sign-in, see ensureUser)
    uid: () => (user ? user.uid : null),
    onChange: (f) => listeners.push(f),
    // log in; if the nickname isn't registered yet, create the account (first come, first served)
    async login(nick, pw) {
      nick = String(nick || '').trim(); if (!NICK_RE.test(nick)) throw new Error('닉네임은 2~12자 (한글·영문·숫자)로 해 주세요');
      if (String(pw || '').length < 6) throw new Error('비밀번호는 6자 이상이어야 해요');
      await ready; if (!fb) throw new Error('로그인 서버에 연결하지 못했어요');
      const email = nickToEmail(nick);
      try { await fb.signInWithEmailAndPassword(auth, email, pw); return { created: false }; }
      catch (e) {
        const c = (e && e.code) || '';
        if (c.includes('user-not-found') || c.includes('invalid-credential') || c.includes('invalid-login')) {
          try { const cr = await fb.createUserWithEmailAndPassword(auth, email, pw); await fb.updateProfile(cr.user, { displayName: nick }); user = { uid: cr.user.uid, nick }; emit(); return { created: true }; }
          catch (e2) { if (String(e2 && e2.code).includes('email-already-in-use')) throw new Error('비밀번호가 맞지 않아요 (이미 있는 닉네임)'); throw new Error(why(e2)); }
        }
        throw new Error(why(e));
      }
    },
    // guests get a silent anonymous sign-in the first time they need to write (signs)
    async ensureUser() { await ready; if (!fb) return null; if (!user) { await fb.signInAnonymously(auth); await new Promise((r) => setTimeout(r, 50)); } return user; },
    // ── signs, shared by everyone (collection "signs"; Firestore TTL deletes them after 30 days, the game also hides expired ones) ──
    async loadSigns(campus) {
      await ready; if (!fb) return null;
      const snap = await fb.getDocs(fb.query(fb.collection(db, 'signs'), fb.where('campus', '==', campus), fb.limit(400))), now = Date.now(), out = [];
      snap.forEach((d) => { const v = d.data(); if (v.expires && v.expires.toMillis() > now) out.push({ id: d.id, by: v.by, name: v.name, text: v.text, x: v.x, y: v.y, z: v.z, yaw: v.yaw, t: v.t }); });
      return out;
    },
    async saveSign(campus, sg) {
      const u = await this.ensureUser(); if (!u) throw new Error('offline');
      await fb.setDoc(fb.doc(db, 'signs', sg.id), { campus, by: u.uid, name: sg.name, text: sg.text, x: sg.x, y: sg.y, z: sg.z, yaw: sg.yaw, t: sg.t, expires: fb.Timestamp.fromMillis(Date.now() + SIGN_DAYS * 864e5) });
    },
    async deleteSign(id) { await this.ensureUser(); if (fb) await fb.deleteDoc(fb.doc(db, 'signs', id)); },
    async logout() { if (fb && auth) await fb.signOut(auth); },
    async loadWallet() { if (!user || !db) return null; const s = await fb.getDoc(fb.doc(db, 'users', user.uid)); return s.exists() ? s.data().wallet || null : null; },
    async saveWallet(w) {
      if (!user || !db || user.anon) return; await fb.setDoc(fb.doc(db, 'users', user.uid), { nick: user.nick, wallet: JSON.parse(JSON.stringify(w)), updated: Date.now() }, { merge: true });
      await fb.setDoc(fb.doc(db, 'ranking', user.uid), { nick: user.nick, steps: Math.floor(w.steps || 0), updated: Date.now() }).catch(() => {}); // pedometer leaderboard (accounts only)
    },
    // collection book (collectibles.js): same users/{uid} document as the wallet, field "collection" — covered by the users rule above
    async loadCollection() { if (!user || !db || user.anon) return null; const s = await fb.getDoc(fb.doc(db, 'users', user.uid)); return s.exists() ? s.data().collection || null : null; },
    async saveCollection(c) { if (!user || !db || user.anon) return; await fb.setDoc(fb.doc(db, 'users', user.uid), { collection: JSON.parse(JSON.stringify(c)), updated: Date.now() }, { merge: true }); },
    // daily quests (quests.js): field "quests"; a reward claim passes the wallet too, so coins and the claim land in ONE write
    async loadQuests() { if (!user || !db || user.anon) return null; const s = await fb.getDoc(fb.doc(db, 'users', user.uid)); return s.exists() ? s.data().quests || null : null; },
    async saveQuests(q, wallet) { if (!user || !db || user.anon) return; const d = { quests: JSON.parse(JSON.stringify(q)), updated: Date.now() }; if (wallet) d.wallet = wallet; await fb.setDoc(fb.doc(db, 'users', user.uid), d, { merge: true }); },
    // pet levels (pet-growth.js): field "petGrowth" = { pets: { [petId]: { lv, xp, total, last } }, … }; the caller merges before saving
    async loadPetGrowth() { if (!user || !db || user.anon) return null; const s = await fb.getDoc(fb.doc(db, 'users', user.uid)); return s.exists() ? s.data().petGrowth || null : null; },
    async savePetGrowth(g) { if (!user || !db || user.anon) return; await fb.setDoc(fb.doc(db, 'users', user.uid), { petGrowth: JSON.parse(JSON.stringify(g)), updated: Date.now() }, { merge: true }); },
    async loadRanking(n = 50) {
      await ready; if (!fb) return null; const snap = await fb.getDocs(fb.query(fb.collection(db, 'ranking'), fb.orderBy('steps', 'desc'), fb.limit(n))), out = [];
      snap.forEach((d) => { const v = d.data(); out.push({ uid: d.id, nick: v.nick, steps: v.steps | 0 }); }); return out;
    },
    async rankOf(steps) { await ready; if (!fb) return null; const c = await fb.getCount(fb.query(fb.collection(db, 'ranking'), fb.where('steps', '>', Math.floor(steps)))); return c.data().count + 1; },
    // the admin key travels with the admin's account (only that account can read its own document)
    async loadAdmin() { if (!user || !db) return null; const s = await fb.getDoc(fb.doc(db, 'users', user.uid)); return s.exists() ? s.data().admin || null : null; },
    async saveAdmin(d) { if (!user || !db) return; await fb.setDoc(fb.doc(db, 'users', user.uid), { admin: d }, { merge: true }); },
  };
}
