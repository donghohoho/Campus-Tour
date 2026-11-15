// Wild pets + bond — data only (the system lives in wild-pets.js).
//
//   SPECIES   tameable animals. `type` is the pet kind in pets.js PETS (marked wild: true there, so the shop never sells it).
//             Taming = petting (E) until the gauge is full; every species can be tuned on its own:
//               gain      gauge points per successful pat (gauge is 0–100)
//               success   chance that a pat lands (a miss: the animal flinches, no gauge)
//               cooldown  seconds before the next pat counts
//   SPAWNS    per campus id: where each wild animal lives (pos = [x, z] like campuses.js) and how far it wanders (roam, m)
//   BOND      friendship of pets you own (0–100). Kept apart from XP (pet-growth.js) on purpose.

export const SPECIES = {
  'w-cat': { type: 'cat', name: '캠퍼스 고양이', gain: 25, success: 0.9, cooldown: 2, note: '사람 손을 잘 타는 편이에요' },
  'w-rabbit': { type: 'rabbit', name: '산토끼', gain: 20, success: 0.75, cooldown: 2.5, note: '조금 겁이 많아요' },
  'w-hedgehog': { type: 'hedgehog', name: '고슴도치', gain: 15, success: 0.7, cooldown: 3, note: '가시를 세웠다 내렸다 해요' },
  'w-raccoon': { type: 'raccoon', name: '너구리', gain: 12, success: 0.6, cooldown: 3, note: '경계심이 강해요' },
  'w-owl': { type: 'owl', name: '부엉이', gain: 10, success: 0.5, cooldown: 4, note: '밤의 숲에서 쉽게 마음을 열지 않아요' },
};

export const SPAWNS = {
  'khu-global': [
    { species: 'w-cat', pos: [-110, -405], roam: 6 }, // just inside the main gate — the first one most players meet
    { species: 'w-rabbit', pos: [-60, -120], roam: 8 }, // lawn next to the 대운동장
    { species: 'w-hedgehog', pos: [150, 300], roam: 6 }, // edge of 사색의 광장
    { species: 'w-raccoon', pos: [-205, -385], roam: 6 }, // 르네상스 공원
    { species: 'w-owl', pos: [255, 640], roam: 5 }, // woods north of the 노천극장
  ],
};

export const BOND = {
  max: 100,
  stages: [[0, '낯섦'], [20, '익숙함'], [40, '친근함'], [60, '신뢰'], [80, '단짝']], // [from, name] — rewards per stage come later
  tamedStart: 10, // a freshly tamed pet already likes you a little; other pets start at 0
  pat: { bond: 2, cooldownSec: 45, xp: 5 }, // petting your own pet (stand still next to it, E)
  walk: { metres: 250, bond: 1 }, // walking together
  newPlace: 1, // a named place reached together, first time today
  bonus: { collect: 1, questDone: 1, levelUp: 3 }, // milestones reached together (each event once)
  dailyCap: 15, // most bond a pet can gain per day (Korea date), all sources together
  patXpDailyCap: 50, // most XP a pet can get from petting per day — on top of pet-growth.js, which never counts pats itself
};

export const stageOf = (bond) => { let s = BOND.stages[0]; for (const st of BOND.stages) if (bond >= st[0]) s = st; return { from: s[0], name: s[1], index: BOND.stages.indexOf(s) }; };
