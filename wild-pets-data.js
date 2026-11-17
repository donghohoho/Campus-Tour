// Wild pets + bond — data only (the system lives in wild-pets.js).
//
//   SPECIES   tameable animals. `type` is the pet kind in pets.js PETS (marked wild: true there, so the shop never sells it).
//             Taming = petting (E) until the gauge is full; every species can be tuned on its own:
//               gain      gauge points per successful pat (gauge is 0–100)
//               success   chance that a pat lands (a miss: the animal flinches, no gauge)
//               cooldown  seconds before the next pat counts
//   SPAWNS    per campus id: where each wild animal lives (pos = [x, z] like campuses.js) and how far it wanders (roam, m)
//   BOND      friendship of pets you own (0–100) — how a pet grows closer to you (there are no pet levels).

export const SPECIES = {
  'w-cat': { type: 'cat', name: '캠퍼스 고양이', icon: '🐱', home: '기숙사 주변 · 정문 · 학생회관', sig: true, gain: 25, success: 0.9, cooldown: 2, note: '사람 손을 잘 타는 편이에요' },
  'w-duck': { type: 'duck', name: '오리', icon: '🦆', home: '사색의 광장 · 르네상스 공원 연못', sig: true, gain: 25, success: 0.85, cooldown: 2, note: '물가를 좋아해요' },
  'w-squirrel': { type: 'squirrel', name: '다람쥐', icon: '🐿️', home: '공학관 · 도서관 · 대운동장 주변 잔디', gain: 20, success: 0.8, cooldown: 2, note: '도토리를 찾아 바빠요' },
  'w-rabbit': { type: 'rabbit', name: '산토끼', icon: '🐰', home: '공학관 주변 (공대 토끼)', sig: true, gain: 20, success: 0.75, cooldown: 2.5, note: '조금 겁이 많아요' },
  'w-magpie': { type: 'magpie', name: '까치', icon: '🐦', home: '전자정보대 · 노천극장 · 실험연구동', gain: 15, success: 0.65, cooldown: 3, note: '반짝이는 걸 좋아해요' },
  'w-hedgehog': { type: 'hedgehog', name: '고슴도치', icon: '🦔', home: '사색의 광장 가장자리 · 숲 속', gain: 15, success: 0.7, cooldown: 3, note: '가시를 세웠다 내렸다 해요' },
  'w-raccoon': { type: 'raccoon', name: '너구리', icon: '🦝', home: '르네상스 공원 · 숲 속', gain: 12, success: 0.6, cooldown: 3, note: '경계심이 강해요' },
  'w-owl': { type: 'owl', name: '부엉이', icon: '🦉', home: '천문대 · 국제학관 · 노천극장 뒤 숲', gain: 10, success: 0.5, cooldown: 4, note: '밤의 숲에서 쉽게 마음을 열지 않아요' },
  // 경희대 국제캠의 명물 (spawn mostly at their own spots, below)
  'w-goat': { type: 'goat', name: '생대 염소', icon: '🐐', home: '생명과학대학 주변', sig: true, gain: 20, success: 0.75, cooldown: 2.5, note: '풀을 우물우물 씹고 있어요' },
  'w-rooster': { type: 'rooster', name: '생대 수탉', icon: '🐓', home: '생명과학대학 주변', sig: true, gain: 15, success: 0.65, cooldown: 3, note: '꼬끼오! 기세가 등등해요' },
  'w-gorani': { type: 'gorani', name: '예디대 고라니', icon: '🦌', home: '예술디자인대학 주변', sig: true, gain: 12, success: 0.55, cooldown: 3.5, note: '인기척에 쉽게 놀라요' },
};

// a spot hosts one animal at a time, drawn from its pool: 'kind' (weight 1) or ['kind', weight]. A spot emptied by taming
// gets a new animal after RESPAWN_SEC. Kinds you already own still appear — you can pet them, just not tame a second one.
// The campus's signature animals (공대 토끼, 생대 염소·수탉, 사색의 광장 오리, 기숙사 고양이, 예디대 고라니) have ~85% at their spots.
// the pet book also lists the starter pet, which is never wild
export const DEX_EXTRA = { fox: { name: '여우', icon: '🦊', home: '처음부터 함께하는 친구', type: 'fox', starter: true } };

export const RESPAWN_SEC = 300;
const SIG = (main, other) => [[main, 85], [other, 15]];
export const SPAWNS = {
  'khu-global': [
    { pool: ['w-cat'], pos: [-110, -405], roam: 6 }, // just inside the main gate — the first one most players meet
    // ── signature animals ──
    { pool: SIG('w-rabbit', 'w-squirrel'), pos: [33, -332], roam: 6 }, // 공대 토끼 — 공학관
    { pool: SIG('w-rabbit', 'w-squirrel'), pos: [10, -355], roam: 6 },
    { pool: SIG('w-rabbit', 'w-magpie'), pos: [97, -362], roam: 6 },
    { pool: SIG('w-goat', 'w-rooster'), pos: [125, 61], roam: 6 }, // 생대 염소 — 생명과학대학
    { pool: SIG('w-rooster', 'w-goat'), pos: [100, 8], roam: 6 }, // 생대 수탉
    { pool: [['w-goat', 50], ['w-rooster', 50]], pos: [143, 6], roam: 6 },
    { pool: SIG('w-duck', 'w-magpie'), pos: [121, 267], roam: 6 }, // 사색의 광장 오리
    { pool: SIG('w-duck', 'w-cat'), pos: [106, 237], roam: 6 },
    { pool: SIG('w-duck', 'w-squirrel'), pos: [62, 260], roam: 6 },
    { pool: SIG('w-cat', 'w-rabbit'), pos: [-259, -260], roam: 6 }, // 기숙사 고양이 — 우정원
    { pool: SIG('w-cat', 'w-squirrel'), pos: [-230, 98], roam: 6 }, // 제2기숙사 남자동
    { pool: SIG('w-cat', 'w-rabbit'), pos: [-283, -21], roam: 6 }, // 제2기숙사(여자동)
    { pool: SIG('w-cat', 'w-magpie'), pos: [-346, -57], roam: 6 },
    { pool: SIG('w-gorani', 'w-raccoon'), pos: [393, 104], roam: 7 }, // 예디대 고라니 — 예술디자인대학
    { pool: SIG('w-gorani', 'w-hedgehog'), pos: [325, 167], roam: 7 },
    { pool: SIG('w-gorani', 'w-raccoon'), pos: [461, 105], roam: 7 },
    // ── elsewhere ──
    { pool: ['w-duck', 'w-raccoon'], pos: [-205, -385], roam: 6 }, // 르네상스 공원
    { pool: ['w-duck'], pos: [-160, -399], roam: 5 }, // 르네상스 공원 연못가
    { pool: ['w-hedgehog', 'w-raccoon'], pos: [119, -383], roam: 5 }, // 공학실험동 옆 숲
    { pool: ['w-rabbit', 'w-squirrel'], pos: [-60, -120], roam: 8 }, // 대운동장 옆 잔디
    { pool: ['w-squirrel', 'w-magpie'], pos: [-257, -118], roam: 7 }, // 멀티미디어교육관
    { pool: ['w-cat', 'w-squirrel'], pos: [-33, 155], roam: 6 }, // 학생회관
    { pool: ['w-squirrel', 'w-magpie'], pos: [0, 275], roam: 6 }, // 중앙도서관
    { pool: ['w-hedgehog', 'w-squirrel'], pos: [150, 300], roam: 6 }, // 사색의 광장 가장자리
    { pool: ['w-owl', 'w-hedgehog'], pos: [84, 409], roam: 5 }, // 국제학관 옆 숲
    { pool: ['w-owl', 'w-raccoon'], pos: [128, 487], roam: 5 }, // 천문대 숲
    { pool: ['w-magpie', 'w-squirrel'], pos: [256, 423], roam: 6 }, // 전자정보대학
    { pool: ['w-magpie', 'w-cat'], pos: [326, 563], roam: 6 }, // 노천극장
    { pool: ['w-owl', 'w-raccoon'], pos: [255, 640], roam: 5 }, // 노천극장 뒤 북쪽 숲
    { pool: ['w-magpie', 'w-rabbit'], pos: [507, 272], roam: 6 }, // 실험연구동
  ],
};

export const BOND = {
  max: 100,
  stages: [[0, '낯섦'], [20, '익숙함'], [40, '친근함'], [60, '신뢰'], [80, '단짝']], // [from, name] — rewards per stage come later
  tamedStart: 10, // a freshly tamed pet already likes you a little; other pets start at 0
  pat: { bond: 2, cooldownSec: 45 }, // petting your own pet (stand still next to it, E)
  walk: { metres: 250, bond: 1 }, // walking together
  newPlace: 1, // a named place reached together, first time today
  bonus: { collect: 1, questDone: 1 }, // milestones reached together (each event once)
  dailyCap: 15, // most bond a pet can gain per day (Korea date), all sources together
};

export const stageOf = (bond) => { let s = BOND.stages[0]; for (const st of BOND.stages) if (bond >= st[0]) s = st; return { from: s[0], name: s[1], index: BOND.stages.indexOf(s) }; };
