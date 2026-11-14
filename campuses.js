// Campus registry — one entry per playable map, in the order they appear in the menu.
//
//   id         stable key (used in localStorage and for switching)
//   name       label shown in menus, the HUD and the location badge
//   region     'seoul' | 'gyeonggi' (menu grouping)
//   status     'ready' (playable) | 'soon' (shown as "준비 중" and locked)
//   data       per-campus map file: real building footprints, roads, areas, terrain grid (OpenStreetMap + SRTM)
//   terrain    terrain character of the site: 'flat' | 'hills' | 'mountain'
//   lighting   key into LIGHTING below
//   seed       random seed for trees, props and collectibles (keeps a campus identical on every visit)
//   spawn      start next to `from`, `dist` metres toward `toward` (both are place names from the map)
//   landmarks  named places with special treatment: kind 'gate' | 'amphitheatre' | 'dome' | 'stadium' | 'building',
//              pos = approximate [x, z] in metres from the map origin, optional wall/roof colours, note = source
//   play       collectible / creature counts and the areas they are scattered over
//   outsideLabel  badge text when the player walks off campus

export const REGIONS = [
  { id: 'seoul', name: '서울' },
  { id: 'gyeonggi', name: '수원·경기' },
];

export const LIGHTING = {
  night: {
    sky: { top: 0x050814, mid: 0x0e1630, horizon: 0x18223d },
    fog: [140, 780],
    hemi: [0x52679c, 0x161d2a, 0.85],
    sun: [0xa9bcf0, 0.8],
    stars: true, moon: true,
    windows: 1.15, lamps: true, groundGlow: 0.7, lantern: 7,
    clouds: { color: 0x56607c, emissive: 0x0e1322 },
  },
};

const soon = (id, name, region) => ({ id, name, region, status: 'soon' });

export const CAMPUSES = [
  soon('khu-seoul', '경희대학교 서울캠퍼스', 'seoul'),
  soon('snu-gwanak', '서울대학교 관악캠퍼스', 'seoul'),
  soon('yonsei-sinchon', '연세대학교 신촌캠퍼스', 'seoul'),
  {
    id: 'korea-anam', name: '고려대학교 안암캠퍼스', region: 'seoul', status: 'soon', // 'ready' once assets/campuses/korea-anam.json is in
    data: 'assets/campuses/korea-anam.json', terrain: 'hills', lighting: 'night', seed: 20261114,
    outsideLabel: '캠퍼스 밖 · 안암동',
    spawn: { from: '고려대학교 정문', toward: '본관', dist: 16 },
    landmarks: [
      { name: '녹지운동장', kind: 'stadium', pos: [-433, 406], note: 'OSM leisure=pitch' },
      { name: '본관', kind: 'building', pos: [206, 166], wall: 0xc9c3b6, roof: 0x5f625e, note: '화강암 석조 건물 — 색은 추정' },
      { name: '중앙도서관', kind: 'building', pos: [352, 337], wall: 0xc9c3b6, roof: 0x5f625e, note: '화강암 석조 건물 — 색은 추정' },
      { name: '인촌기념관', kind: 'building', pos: [60, 200], wall: 0xc9c3b6, roof: 0x5f625e, note: '석조 — 색은 추정' },
      { name: '문과대학서관', kind: 'building', pos: [143, 79], wall: 0xc9c3b6, roof: 0x5f625e, note: '석조 — 색은 추정' },
      { name: '백주년기념삼성관', kind: 'building', pos: [391, 162], wall: 0xc9c3b6, roof: 0x5f625e, note: '석조 — 색은 추정' },
    ],
    play: { gems: 30, gemArea: [-450, 450, -600, 600], pals: 18, palArea: [-450, 450, -600, 600], palHome: [286, 76], treeClear: [[367, 26, 10]] },
  },
  soon('sogang', '서강대학교', 'seoul'),
  soon('skku-seoul', '성균관대학교 인문사회과학캠퍼스', 'seoul'),
  soon('hanyang-seoul', '한양대학교 서울캠퍼스', 'seoul'),
  soon('cau-seoul', '중앙대학교 서울캠퍼스', 'seoul'),
  soon('hufs-seoul', '한국외국어대학교 서울캠퍼스', 'seoul'),
  soon('uos', '서울시립대학교', 'seoul'),
  {
    id: 'khu-global', name: '경희대학교 국제캠퍼스', region: 'gyeonggi', status: 'ready',
    data: 'assets/campuses/khu-global.json', terrain: 'hills', lighting: 'night', seed: 20261111,
    outsideLabel: '캠퍼스 밖 · 영통/서천',
    spawn: { from: '경희대학교 국제캠퍼스 정문', toward: '학생회관', dist: 16 },
    landmarks: [
      { name: '경희대학교 국제캠퍼스 정문', kind: 'gate', pos: [-138, -457], note: '아치 + 양쪽 열주 회랑 (카카오 로드뷰)' },
      { name: '노천극장', kind: 'amphitheatre', pos: [284, 555], note: '원형 무대 + 부채꼴 계단 객석 (카카오맵 항공사진)' },
      { name: '전자정보대학', kind: 'building', pos: [298, 430], wall: 0xead9b2, roof: 0x9a9384, note: '크림색 벽돌 외벽 (카카오 로드뷰)' },
      { name: '천문대', kind: 'dome', pos: [170, 495] },
      { name: '대운동장', kind: 'stadium', pos: [-193, -61] },
    ],
    play: { gems: 30, gemArea: [-350, 450, -420, 520], pals: 18, palArea: [-320, 420, -420, 520], palHome: [-138, -400], treeClear: [[-138, -440, 8]] },
  },
  soon('skku-natural', '성균관대학교 자연과학캠퍼스', 'gyeonggi'),
];
