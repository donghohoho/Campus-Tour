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

const NICK_RE = /^[\p{L}\p{N}_ .-]{2,12}$/u;
const nickToEmail = (nick) => 'u' + [...new TextEncoder().encode(nick.normalize('NFC').toLowerCase())].map((b) => b.toString(16).padStart(2, '0')).join('') + '@campus-tour.app';

export function initAuth() {
  let fb = null, auth = null, db = null, user = null, ready = null;
  const listeners = [];
  const emit = () => listeners.forEach((f) => f(user));
  if (FIREBASE_CONFIG) ready = import('./vendor/firebase.min.js').then((m) => {
    fb = m; const app = m.initializeApp(FIREBASE_CONFIG); auth = m.getAuth(app); db = m.getFirestore(app);
    return new Promise((res) => m.onAuthStateChanged(auth, (u) => { user = u ? { uid: u.uid, nick: u.displayName || '' } : null; emit(); res(); }));
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
    user: () => user,
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
    async logout() { if (fb && auth) await fb.signOut(auth); },
    async loadWallet() { if (!user || !db) return null; const s = await fb.getDoc(fb.doc(db, 'users', user.uid)); return s.exists() ? s.data().wallet || null : null; },
    async saveWallet(w) { if (!user || !db) return; await fb.setDoc(fb.doc(db, 'users', user.uid), { nick: user.nick, wallet: JSON.parse(JSON.stringify(w)), updated: Date.now() }, { merge: true }); },
    // the admin key travels with the admin's account (only that account can read its own document)
    async loadAdmin() { if (!user || !db) return null; const s = await fb.getDoc(fb.doc(db, 'users', user.uid)); return s.exists() ? s.data().admin || null : null; },
    async saveAdmin(d) { if (!user || !db) return; await fb.setDoc(fb.doc(db, 'users', user.uid), { admin: d }, { merge: true }); },
  };
}
