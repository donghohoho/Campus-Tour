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
  'w-cat': { type: 'cat', name: '캠퍼스 고양이', icon: '🐱', home: '모든 캠퍼스 · 기숙사 · 정문 · 학생회관 주변', sig: true, gain: 25, success: 0.9, cooldown: 2, note: '사람 손을 잘 타는 편이에요' },
  'w-duck': { type: 'duck', name: '오리', icon: '🦆', home: '연못가 · 사색의 광장, 자하연, 청룡연못, 선동호, 하늘못, 일월저수지', sig: true, gain: 25, success: 0.85, cooldown: 2, note: '물가를 좋아해요' },
  'w-squirrel': { type: 'squirrel', name: '다람쥐', icon: '🐿️', home: '도서관 · 운동장 주변 잔디, 청송대 숲 (여러 캠퍼스)', gain: 20, success: 0.8, cooldown: 2, note: '도토리를 찾아 바빠요' },
  'w-rabbit': { type: 'rabbit', name: '산토끼', icon: '🐰', home: '경희대 국제캠 공학관 (공대 토끼) · 운동장 잔디', sig: true, gain: 20, success: 0.75, cooldown: 2.5, note: '조금 겁이 많아요' },
  'w-magpie': { type: 'magpie', name: '까치', icon: '🐦', home: '건물 사이 나무 위 · 명륜당, 한양대 까치골', gain: 15, success: 0.65, cooldown: 3, note: '반짝이는 걸 좋아해요' },
  'w-hedgehog': { type: 'hedgehog', name: '고슴도치', icon: '🦔', home: '광장 가장자리 · 숲 속 (여러 캠퍼스)', gain: 15, success: 0.7, cooldown: 3, note: '가시를 세웠다 내렸다 해요' },
  'w-raccoon': { type: 'raccoon', name: '너구리', icon: '🦝', home: '공원 · 숲 속 (여러 캠퍼스)', gain: 12, success: 0.6, cooldown: 3, note: '경계심이 강해요' },
  'w-owl': { type: 'owl', name: '부엉이', icon: '🦉', home: '캠퍼스 뒤 산과 숲 (밤)', gain: 10, success: 0.5, cooldown: 4, note: '밤의 숲에서 쉽게 마음을 열지 않아요' },
  // 경희대 국제캠의 명물 (spawn mostly at their own spots, below)
  'w-goat': { type: 'goat', name: '생대 염소', icon: '🐐', home: '생명과학대학 주변', sig: true, gain: 20, success: 0.75, cooldown: 2.5, note: '풀을 우물우물 씹고 있어요' },
  'w-rooster': { type: 'rooster', name: '생대 수탉', icon: '🐓', home: '생명과학대학 주변', sig: true, gain: 15, success: 0.65, cooldown: 3, note: '꼬끼오! 기세가 등등해요' },
  // 다른 캠퍼스의 상징 동물 (where = 도감 배지에 쓰는 학교 이름)
  'w-tiger': { type: 'tiger', name: '고대 호랑이', icon: '🐯', home: '고려대 중앙광장 · 녹지운동장', sig: true, where: '고려대', gain: 10, success: 0.5, cooldown: 3.5, note: '늠름하지만 쓰다듬으면 골골대요' },
  'w-eagle': { type: 'eagle', name: '연세 독수리', icon: '🦅', home: '연세대 언더우드관 · 메타세쿼이아 숲', sig: true, where: '연세대', gain: 10, success: 0.5, cooldown: 3.5, note: '높은 곳에서 캠퍼스를 내려다봐요' },
  'w-lion': { type: 'lion', name: '캠퍼스 사자', icon: '🦁', home: '한양대 노천극장 · 백남학술정보관, 경희대 서울캠 평화의전당', sig: true, where: '한양·경희', gain: 10, success: 0.5, cooldown: 3.5, note: '갈기를 쓰다듬어 주면 좋아해요' },
  'w-albatross': { type: 'albatross', name: '서강 알바트로스', icon: '🪶', home: '서강대 알바트로스 공원 · 대운동장', sig: true, where: '서강대', gain: 12, success: 0.55, cooldown: 3, note: '날개를 활짝 펴는 걸 좋아해요' },
  'w-dragon': { type: 'dragon', name: '중앙 청룡', icon: '🐉', home: '중앙대 청룡연못 · 중앙마당', sig: true, where: '중앙대', gain: 8, success: 0.45, cooldown: 4, note: '연못의 전설 — 쉽게 마음을 열지 않아요' },
  'w-hawk': { type: 'hawk', name: '장산곶매', icon: '🦅', home: '시립대 대학본부 · 배봉산보루', sig: true, where: '시립대', gain: 10, success: 0.5, cooldown: 3.5, note: '시립대의 마스코트 — 전설 속 용맹한 매' },
  'w-hufs-owl': { type: 'hufs-owl', name: '외대 부엉이', icon: '🦉', home: '외대 본관 · 천장산 숲', sig: true, where: '외대', gain: 10, success: 0.5, cooldown: 3.5, note: '외대의 마스코트 — 밤하늘을 소리 없이 날아요' },
  'w-crane': { type: 'crane', name: '서울대 학', icon: '🪽', home: '서울대 자하연 · 버들골', sig: true, where: '서울대', gain: 10, success: 0.5, cooldown: 3.5, note: '관악의 학 — 긴 날개로 우아하게 날아요' },
  'w-ginkgo': { type: 'ginkgo', name: '은행잎', icon: '🍂', home: '성균관대 명륜당 · 비천당, 율전 글로벌 광장 · 학생회관', sig: true, where: '성균관대', gain: 10, success: 0.5, cooldown: 3.5, note: '명륜당 은행나무에서 날아온 잎 — 올라타면 하늘을 날아요' },
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
  'korea-anam': [
    { pool: ['w-cat'], pos: [388, 36], roam: 6 }, // 정문 앞 — 정문 바로 안
    { pool: SIG('w-tiger', 'w-cat'), pos: [288, 80], roam: 7 }, // 중앙광장 — 고대 호랑이
    { pool: SIG('w-cat', 'w-squirrel'), pos: [80, 219], roam: 6 }, // 인촌기념관
    { pool: SIG('w-cat', 'w-squirrel'), pos: [-84, 365], roam: 6 }, // 안암학사 남학생동 1동 — 기숙사 고양이
    { pool: ['w-squirrel', 'w-magpie'], pos: [-259, -447], roam: 6 }, // 애기능동산
    { pool: ['w-hedgehog', 'w-raccoon'], pos: [338, 267], roam: 6 }, // 사색의동산
    { pool: ['w-duck', 'w-magpie'], pos: [-356, -262], roam: 6 }, // 육생비오톱 — 비오톱 물가
    { pool: ['w-magpie', 'w-squirrel'], pos: [-390, -361], roam: 6 }, // 하나스퀘어 쉼터
    { pool: ['w-owl', 'w-hedgehog'], pos: [-452, -404], roam: 6 }, // 진리마루
    { pool: SIG('w-tiger', 'w-rabbit'), pos: [-432, 411], roam: 7 }, // 녹지운동장 — 고대 호랑이
  ],
  'snu-gwanak': [
    { pool: ['w-cat'], pos: [-516, 846], roam: 6 }, // 정문 앞 — 정문 바로 안
    { pool: SIG('w-cat', 'w-squirrel'), pos: [-308, 120], roam: 6 }, // 학생회관
    { pool: SIG('w-cat', 'w-magpie'), pos: [-228, 145], roam: 6 }, // 중앙도서관
    { pool: SIG('w-duck', 'w-magpie'), pos: [-208, 263], roam: 6 }, // 자하연 — 자하연 오리
    { pool: SIG('w-crane', 'w-duck'), pos: [-165, 325], roam: 6 }, // 자하연식당 — 서울대 학
    { pool: SIG('w-crane', 'w-rabbit'), pos: [156, 44], roam: 7 }, // 버들골 — 서울대 학
    { pool: ['w-squirrel', 'w-hedgehog'], pos: [68, 189], roam: 6 }, // 사범대학
    { pool: ['w-magpie', 'w-squirrel'], pos: [-285, -385], roam: 6 }, // 공과대학
    { pool: ['w-owl', 'w-raccoon'], pos: [-600, 1618], roam: 6 }, // 청룡산 — 산 숲
    { pool: ['w-hedgehog', 'w-raccoon'], pos: [-123, -488], roam: 6 }, // 공대폭포
    { pool: ['w-cat', 'w-rabbit'], pos: [-232, 739], roam: 6 }, // 동원생활관 — 기숙사 고양이
  ],
  'yonsei-sinchon': [
    { pool: ['w-cat'], pos: [-169, -836], roam: 6 }, // 정문 앞 — 정문 바로 안
    { pool: SIG('w-cat', 'w-magpie'), pos: [-57, -455], roam: 6 }, // 학생회관
    { pool: SIG('w-cat', 'w-squirrel'), pos: [-138, -443], roam: 6 }, // 중앙도서관
    { pool: SIG('w-cat', 'w-squirrel'), pos: [31, 663], roam: 6 }, // 무악학사 4학사 — 기숙사 고양이
    { pool: SIG('w-squirrel', 'w-owl'), pos: [169, -122], roam: 6 }, // 청송대 — 청송대 다람쥐
    { pool: SIG('w-squirrel', 'w-hedgehog'), pos: [166, -134], roam: 6 }, // 청송대
    { pool: SIG('w-eagle', 'w-owl'), pos: [184, 830], roam: 6 }, // 메타세쿼이아 힐링숲 — 연세 독수리
    { pool: SIG('w-eagle', 'w-magpie'), pos: [-11, -157], roam: 6 }, // 언더우드관 — 연세 독수리
    { pool: ['w-rabbit', 'w-squirrel'], pos: [-466, -596], roam: 6 }, // 연세대학교 대운동장
    { pool: ['w-hedgehog', 'w-magpie'], pos: [-100, -254], roam: 6 }, // 윤동주문학동산
  ],
  'sogang': [
    { pool: ['w-cat'], pos: [-236, -79], roam: 6 }, // 정문 앞 — 정문 바로 안
    { pool: SIG('w-cat', 'w-magpie'), pos: [191, -120], roam: 6 }, // 곤자가 프라자
    { pool: SIG('w-cat', 'w-squirrel'), pos: [59, -41], roam: 6 }, // 로욜라 도서관 1관
    { pool: SIG('w-cat', 'w-squirrel'), pos: [272, -86], roam: 6 }, // 곤자가 국제학사 — 기숙사 고양이
    { pool: SIG('w-albatross', 'w-magpie'), pos: [-223, -62], roam: 6 }, // 알바트로스 공원 — 서강 알바트로스
    { pool: ['w-squirrel', 'w-hedgehog'], pos: [-96, -116], roam: 6 }, // 본관
    { pool: SIG('w-albatross', 'w-rabbit'), pos: [14, -164], roam: 7 }, // 서강대학교 대운동장 — 서강 알바트로스
    { pool: ['w-owl', 'w-raccoon'], pos: [123, 183], roam: 6 }, // 노고산동체육공원
  ],
  'skku-seoul': [
    { pool: ['w-cat'], pos: [203, -210], roam: 6 }, // 정문 앞 — 정문 바로 안
    { pool: SIG('w-cat', 'w-magpie'), pos: [30, 39], roam: 6 }, // 학생회관
    { pool: SIG('w-cat', 'w-squirrel'), pos: [160, 71], roam: 6 }, // 600주년기념관
    { pool: SIG('w-ginkgo', 'w-magpie'), pos: [252, -107], roam: 6 }, // 명륜당 — 은행나무의 은행잎
    { pool: SIG('w-ginkgo', 'w-cat'), pos: [134, -35], roam: 6 }, // 비천당 — 은행잎
    { pool: ['w-squirrel', 'w-hedgehog'], pos: [-6, 122], roam: 6 }, // 금잔디광장
    { pool: ['w-owl', 'w-raccoon'], pos: [-275, 393], roam: 6 }, // 와룡공원
    { pool: ['w-rabbit', 'w-squirrel'], pos: [-142, 60], roam: 6 }, // 대운동장
  ],
  'skku-natural': [
    { pool: ['w-cat'], pos: [-20, -304], roam: 6 }, // 정문 앞 — 정문 바로 안
    { pool: SIG('w-duck', 'w-magpie'), pos: [-95, -436], roam: 6 }, // 일월저수지 — 일월저수지 오리
    { pool: SIG('w-duck', 'w-squirrel'), pos: [-83, -440], roam: 6 }, // 일월저수지
    { pool: SIG('w-ginkgo', 'w-cat'), pos: [-79, 19], roam: 6 }, // 학생회관 — 은행잎
    { pool: SIG('w-cat', 'w-rabbit'), pos: [-77, 336], roam: 6 }, // 기숙사 인관 — 기숙사 고양이
    { pool: SIG('w-cat', 'w-magpie'), pos: [250, 259], roam: 6 }, // 기숙사 지관
    { pool: SIG('w-ginkgo', 'w-magpie'), pos: [-15, -129], roam: 6 }, // 글로벌 광장 — 은행잎
    { pool: ['w-owl', 'w-hedgehog'], pos: [78, -611], roam: 6 }, // 일월수목원
    { pool: ['w-raccoon', 'w-hedgehog'], pos: [-139, -427], roam: 6 }, // 일월 공원
    { pool: ['w-rabbit', 'w-squirrel'], pos: [-348, -24], roam: 6 }, // 축구장
  ],
  'hanyang-seoul': [
    { pool: ['w-cat'], pos: [-180, -94], roam: 6 }, // 정문 앞 — 애지문 바로 안
    { pool: SIG('w-magpie', 'w-squirrel'), pos: [12, -66], roam: 6 }, // 까치골 — 까치골 까치
    { pool: SIG('w-magpie', 'w-cat'), pos: [25, -61], roam: 6 }, // 까치골
    { pool: SIG('w-cat', 'w-squirrel'), pos: [-193, 83], roam: 6 }, // 학생회관
    { pool: SIG('w-lion', 'w-cat'), pos: [-67, 35], roam: 7 }, // 백남학술정보관 — 한양 사자
    { pool: SIG('w-cat', 'w-rabbit'), pos: [87, 202], roam: 6 }, // 제1학생생활관 — 기숙사 고양이
    { pool: SIG('w-lion', 'w-squirrel'), pos: [-98, -164], roam: 7 }, // 노천극장 — 한양 사자
    { pool: ['w-duck', 'w-magpie'], pos: [253, -254], roam: 6 }, // 살곶이체육공원
    { pool: ['w-owl', 'w-raccoon'], pos: [-40, 266], roam: 6 }, // 의대 계단강의동
  ],
  'cau-seoul': [
    { pool: ['w-cat'], pos: [155, 274], roam: 6 }, // 정문 앞 — 정문 바로 안
    { pool: SIG('w-dragon', 'w-duck'), pos: [50, 152], roam: 6 }, // 청룡연못 — 중앙 청룡
    { pool: SIG('w-dragon', 'w-cat'), pos: [102, 221], roam: 6 }, // 중앙마당 — 중앙 청룡
    { pool: SIG('w-cat', 'w-magpie'), pos: [43, 215], roam: 6 }, // 학생회관
    { pool: SIG('w-cat', 'w-rabbit'), pos: [7, -219], roam: 6 }, // 블루미르홀 — 기숙사 고양이
    { pool: ['w-squirrel', 'w-hedgehog'], pos: [-9, 43], roam: 6 }, // 서라벌홀
    { pool: ['w-magpie', 'w-squirrel'], pos: [43, -105], roam: 6 }, // 제2공학관
    { pool: ['w-owl', 'w-raccoon'], pos: [-203, 177], roam: 6 }, // 글로벌하우스
  ],
  'khu-seoul': [
    { pool: ['w-cat'], pos: [77, -386], roam: 6 }, // 정문 앞 — 정문 바로 안
    { pool: SIG('w-cat', 'w-magpie'), pos: [320, -202], roam: 6 }, // 학생회관
    { pool: SIG('w-cat', 'w-squirrel'), pos: [103, 11], roam: 6 }, // 경희대학교 중앙도서관
    { pool: SIG('w-cat', 'w-squirrel'), pos: [-18, 20], roam: 6 }, // 본관 — 본관 고양이
    { pool: SIG('w-duck', 'w-magpie'), pos: [-153, -191], roam: 6 }, // 선동호 — 선동호 오리
    { pool: SIG('w-duck', 'w-hedgehog'), pos: [-141, -195], roam: 6 }, // 선동호
    { pool: SIG('w-lion', 'w-squirrel'), pos: [116, 176], roam: 7 }, // 평화의전당 — 경희 사자
    { pool: ['w-owl', 'w-raccoon'], pos: [-193, 81], roam: 6 }, // 공관
    { pool: ['w-rabbit', 'w-squirrel'], pos: [190, -230], roam: 6 }, // 대운동장
    { pool: ['w-hedgehog', 'w-raccoon'], pos: [205, -43], roam: 6 }, // 노천극장 무대
  ],
  'hufs-seoul': [
    { pool: ['w-cat'], pos: [117, -47], roam: 6 }, // 정문 앞 — 정문 바로 안
    { pool: SIG('w-hufs-owl', 'w-cat'), pos: [-110, 50], roam: 6 }, // 본관 — 외대 부엉이
    { pool: SIG('w-cat', 'w-squirrel'), pos: [-14, -87], roam: 6 }, // 도서관
    { pool: ['w-rabbit', 'w-squirrel'], pos: [66, 24], roam: 6 }, // 대운동장
    { pool: ['w-squirrel', 'w-hedgehog'], pos: [-175, 116], roam: 6 }, // 인문과학관
    { pool: SIG('w-hufs-owl', 'w-owl'), pos: [-84, 139], roam: 6 }, // 교수학습개발원 — 천장산 숲, 외대 부엉이
  ],
  'uos': [
    { pool: ['w-cat'], pos: [-388, 48], roam: 6 }, // 정문 앞 — 정문 바로 안
    { pool: SIG('w-duck', 'w-magpie'), pos: [191, 95], roam: 6 }, // 하늘못 — 하늘못 오리
    { pool: SIG('w-cat', 'w-squirrel'), pos: [-53, 89], roam: 6 }, // 자주터
    { pool: SIG('w-cat', 'w-magpie'), pos: [85, 80], roam: 6 }, // 학생회관
    { pool: SIG('w-cat', 'w-squirrel'), pos: [260, 211], roam: 6 }, // 중앙도서관
    { pool: SIG('w-hawk', 'w-magpie'), pos: [-157, 212], roam: 6 }, // 대학본부 — 시립대 장산곶매
    { pool: ['w-rabbit', 'w-squirrel'], pos: [-269, 257], roam: 6 }, // 운동장
    { pool: SIG('w-hawk', 'w-owl'), pos: [384, -221], roam: 6 }, // 배봉산보루 — 시립대 장산곶매
    { pool: ['w-raccoon', 'w-hedgehog'], pos: [-260, 351], roam: 6 }, // 스마트연구동
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
