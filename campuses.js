// Campus registry — one entry per playable map, in the order they appear in the menu.
//
//   id         stable key (used in localStorage and for switching)
//   name       label shown in menus, the HUD and the location badge
//   region     'seoul' | 'gyeonggi' (menu grouping)
//   status     'ready' (playable) | 'soon' (shown as "준비 중" and locked)
//   data       per-campus map file: real building footprints, roads, areas, terrain grid (OpenStreetMap + SRTM)
//   terrain    terrain character of the site: 'flat' | 'hills' | 'mountain'
//   lighting   key into LIGHTING below
//   mirror     false = the map file is already +z = south (hand-made khu-global.json) — drawn as is; default flips +z-north files so north is up (client.js northUp)
//   seed       random seed for trees, props and collectibles (keeps a campus identical on every visit)
//   spawn      { at: [x, z], look: [x, z] } = fixed spot and view, or start next to `from`, `dist` metres toward `toward` (both are place names from the map); negative dist = the other side, still facing `toward`
//   landmarks  named places with special treatment: kind 'gate' | 'amphitheatre' | 'dome' | 'stadium' | 'building' | 'place' (open space: sign only)
//              kind 'sculpture' = free-standing model at pos (yaw/scale/shift/solids, see client.js);
//              (a gate or building may carry model: 'assets/models/x.glb' to replace the block, + rot° / height / wall colour;
//               rot turns the model's front (+Z) in 90° steps until it faces the right road),
//              pos = approximate [x, z] in metres from the map origin, optional wall/roof colours, note = source
//   play       collectible / creature counts and the areas they are scattered over
//   outsideLabel  badge text when the player walks off campus
//   extraBuildings  buildings missing from OpenStreetMap: { n: name, p: [[x, z], …] footprint, h: height m } — added on load, so a map rebuild keeps them

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
  {
    id: 'snu-gwanak', name: '서울대학교 관악캠퍼스', region: 'seoul', status: 'ready',
    data: 'assets/campuses/snu-gwanak.json', terrain: 'mountain', lighting: 'night', seed: 20261116,
    outsideLabel: '캠퍼스 밖 · 관악산/낙성대',
    spawn: { at: [-518, 862], look: [-511, 815], toward: '행정관' }, // on the road just outside the gate, looking at it
    landmarks: [
      { name: '서울대학교 정문', kind: 'sculpture', pos: [-511, 815], yaw: 9, scale: 26, shift: -0.09, height: 23, model: 'assets/models/snu-gwanak-front-gate.glb', solids: [[-0.47, 0.035], [0.37, 0.13]], note: '직접 만든 3D 모델 (샤 조형물) — 위치는 사용자가 준 구글 지도 좌표(FW8X+694), 도로가 아치 아래로 지나감' },
      { name: '대운동장', kind: 'stadium', pos: [-359, 720], note: 'OSM leisure=pitch' },
      { name: '자하연', kind: 'place', pos: [-199, 272], r: 40, note: 'OSM water "자하연"' },
      { name: '버들골', kind: 'place', pos: [152, 41], r: 70, note: 'OSM park "버들골"' },
      { name: '서울대 정문 예술 공원', kind: 'place', pos: [-464, 892], r: 50, note: 'OSM park — 정문(샤 조형물) 자체는 OSM 건물이 아니라 넣지 않음' },
    ],
    play: { pals: 18, palArea: [-500, 450, -1100, 1100], palHome: [-150, 330] },
  },
  {
    id: 'yonsei-sinchon', name: '연세대학교 신촌캠퍼스', region: 'seoul', status: 'ready',
    data: 'assets/campuses/yonsei-sinchon.json', terrain: 'mountain', lighting: 'night', seed: 20261115,
    mirror: true, // (now the default for every campus — see client.js northUp); coordinates below stay as in the map file
    outsideLabel: '캠퍼스 밖 · 신촌/창천동',
    spawn: { at: [-171, -852], look: [-150, -700], toward: '언더우드관 (501)' }, // 연세로 in front of the main gate, looking up 백양로 (gate = where 백양로 meets 연세로)
    landmarks: [
      { name: '연세대학교 대운동장', kind: 'stadium', pos: [-468, -600], note: 'OSM leisure=pitch' },
      { name: '언더우드관 (501)', kind: 'building', pos: [-5, -144], wall: 0xb9b3a3, roof: 0x5d6158, note: '석조 건물 — 색은 추정' },
      { name: '스팀슨관 (502)', kind: 'building', pos: [-52, -182], wall: 0xb9b3a3, roof: 0x5d6158, note: '석조 건물 — 색은 추정' },
      { name: '아펜젤러관 (503)', kind: 'building', pos: [19, -202], wall: 0xb9b3a3, roof: 0x5d6158, note: '석조 건물 — 색은 추정' },
    ],
    play: { pals: 18, palArea: [-450, 450, -650, 600], palHome: [-30, -300] },
  },
  {
    id: 'korea-anam', name: '고려대학교 안암캠퍼스', region: 'seoul', status: 'ready',
    data: 'assets/campuses/korea-anam.json', terrain: 'hills', lighting: 'night', seed: 20261114,
    outsideLabel: '캠퍼스 밖 · 안암동',
    spawn: { from: '고려대학교 정문', toward: '본관', dist: -28 }, // outside the gate, looking at it
    landmarks: [
      { name: '고려대학교 정문', kind: 'gate', pos: [367, 26], model: 'assets/models/korea-anam-front-gate.glb', scale: 30, gap: 0.17, solidH: 0.36, note: '직접 만든 3D 모델 (Tripo) — 양쪽 석조 탑 사이로 도로가 지나감' },
      { name: '녹지운동장', kind: 'stadium', pos: [-433, 406], note: 'OSM leisure=pitch' },
      { name: '본관', kind: 'building', pos: [206, 166], model: 'assets/models/korea-anam-main-hall.glb', rot: 180, height: 26, tpToward: '중앙광장', note: '직접 만든 3D 모델 (Tripo) — 정면이 동남쪽 중앙광장을 향함' },
      { name: '중앙광장', kind: 'place', pos: [286, 76], r: 60, note: 'OSM park "중앙광장" (지하 CCL 위 잔디 광장)' },
      { name: '중앙도서관', kind: 'building', pos: [352, 337], wall: 0xc9c3b6, roof: 0x5f625e, note: '화강암 석조 건물 — 색은 추정' },
      { name: '인촌기념관', kind: 'building', pos: [60, 200], wall: 0xc9c3b6, roof: 0x5f625e, note: '석조 — 색은 추정' },
      { name: '문과대학서관', kind: 'building', pos: [143, 79], wall: 0xc9c3b6, roof: 0x5f625e, note: '석조 — 색은 추정' },
      { name: '백주년기념삼성관', kind: 'building', pos: [391, 162], wall: 0xc9c3b6, roof: 0x5f625e, note: '석조 — 색은 추정' },
    ],
    play: { gems: 30, gemArea: [-450, 450, -600, 600], pals: 18, palArea: [-450, 450, -600, 600], palHome: [286, 76], treeClear: [[367, 26, 10]] },
  },
  {
    id: 'sogang', name: '서강대학교', region: 'seoul', status: 'ready',
    data: 'assets/campuses/sogang.json', terrain: 'hills', lighting: 'night', seed: 20261118,
    outsideLabel: '캠퍼스 밖 · 신수동/노고산동',
    spawn: { from: '정문경비초소', toward: '본관', dist: 22 }, // just inside the main gate (백범로 side), looking up at 본관
    landmarks: [
      { name: '서강대학교 대운동장', kind: 'stadium', pos: [12, -169], note: 'OSM leisure=pitch' },
      { name: '청년광장', kind: 'place', pos: [-153, -80], r: 30, note: 'OSM pitch "청년광장"' },
      { name: '알바트로스 공원', kind: 'place', pos: [-225, -67], r: 30, note: 'OSM park "알바트로스 공원" — 정문 옆' },
      { name: '곤자가 플라자', kind: 'place', pos: [197, -127], r: 25, note: 'OSM park "곤자가프라자"' },
    ],
  },
  {
    id: 'skku-seoul', name: '성균관대학교 인문사회과학캠퍼스', region: 'seoul', status: 'ready',
    data: 'assets/campuses/skku-seoul.json', terrain: 'mountain', lighting: 'night', seed: 20261119,
    outsideLabel: '캠퍼스 밖 · 명륜동/와룡공원',
    spawn: { at: [207, -225], look: [131, 54] }, // 성균관로 just inside the main gate, looking up the hill toward 600주년기념관
    landmarks: [
      { name: '대운동장', kind: 'stadium', pos: [-144, 56], note: 'OSM park "대운동장"' },
      { name: '금잔디광장', kind: 'place', pos: [-8, 117], r: 30, note: 'OSM park "금잔디광장"' },
      { name: '성균관대학교 노천극장', kind: 'place', pos: [-30, 74], r: 20, note: 'OSM 건물 — 원형 무대 연출은 경희대 노천극장 전용이라 표지만' },
      { name: '명륜당', kind: 'building', pos: [235, -99], wall: 0x9c3b2e, roof: 0x3f4247, height: 7, note: '조선 성균관 한옥 — 단청 붉은 기둥·회색 기와, 높이는 추정' },
      { name: '대성전', kind: 'building', pos: [253, -170], wall: 0x9c3b2e, roof: 0x3f4247, height: 7, note: '조선 성균관 한옥 — 단청 붉은 기둥·회색 기와, 높이는 추정' },
      { name: '비천당', kind: 'building', pos: [141, -48], wall: 0x9c3b2e, roof: 0x3f4247, height: 7, note: '조선 성균관 한옥 — 단청 붉은 기둥·회색 기와, 높이는 추정' },
      { name: '동재', kind: 'building', pos: [272, -121], wall: 0x9c3b2e, roof: 0x3f4247, height: 7, note: '조선 성균관 한옥 — 단청 붉은 기둥·회색 기와, 높이는 추정' },
      { name: '서재', kind: 'building', pos: [212, -135], wall: 0x9c3b2e, roof: 0x3f4247, height: 7, note: '조선 성균관 한옥 — 단청 붉은 기둥·회색 기와, 높이는 추정' },
      { name: '동무', kind: 'building', pos: [291, -193], wall: 0x9c3b2e, roof: 0x3f4247, height: 7, note: '조선 성균관 한옥 — 단청 붉은 기둥·회색 기와, 높이는 추정' },
      { name: '서무', kind: 'building', pos: [232, -207], wall: 0x9c3b2e, roof: 0x3f4247, height: 7, note: '조선 성균관 한옥 — 단청 붉은 기둥·회색 기와, 높이는 추정' },
      { name: '신삼문', kind: 'building', pos: [266, -229], wall: 0x9c3b2e, roof: 0x3f4247, height: 7, note: '조선 성균관 한옥 — 단청 붉은 기둥·회색 기와, 높이는 추정' },
      { name: '진사식당', kind: 'building', pos: [291, -110], wall: 0x9c3b2e, roof: 0x3f4247, height: 7, note: '조선 성균관 한옥 — 단청 붉은 기둥·회색 기와, 높이는 추정' },
    ],
  },
  {
    id: 'skku-natural', name: '성균관대학교 자연과학캠퍼스', region: 'gyeonggi', status: 'ready',
    data: 'assets/campuses/skku-natural.json', terrain: 'hills', lighting: 'night', seed: 20261120,
    outsideLabel: '캠퍼스 밖 · 율전동/일월저수지',
    spawn: { at: [-20, -320], look: [-17, -134] }, // the road in from 일월로 (south gate side), looking up to 글로벌 광장
    landmarks: [
      { name: '글로벌 광장', kind: 'place', pos: [-17, -134], r: 45, note: 'OSM park "글로벌 광장"' },
      { name: '축구장', kind: 'stadium', pos: [-349, -29], note: 'OSM leisure=pitch "축구장"' },
      { name: '테니스장', kind: 'place', pos: [-358, -109], r: 20, note: 'OSM pitch "테니스장"' },
    ],
    // 삼성학술정보관 (the campus's landmark library) is not in OSM: 5-storey block in the empty block north of 글로벌 광장, between 학생회관 and 제1공학관 (user-confirmed spot) — a Tripo model can replace it later
    extraBuildings: [{ n: '삼성학술정보관', p: [[-25, -32], [60, -32], [60, 15], [-25, 15]], h: 22, l: 5 }],
  },
  {
    id: 'hanyang-seoul', name: '한양대학교 서울캠퍼스', region: 'seoul', status: 'ready',
    data: 'assets/campuses/hanyang-seoul.json', terrain: 'hills', lighting: 'night', seed: 20261121,
    outsideLabel: '캠퍼스 밖 · 행당동/사근동',
    spawn: { at: [-195, -88], look: [-150, -105] }, // on the road in from 애지문 (main gate), looking down into the campus
    landmarks: [
      { name: '노천극장', kind: 'place', pos: [-83, -153], r: 25, note: 'OSM 건물 "노천극장" — 원형 무대 연출은 경희대 전용이라 표지만' },
      { name: '살곶이체육공원', kind: 'place', pos: [251, -259], r: 40, note: 'OSM park — 캠퍼스 남동쪽' },
    ],
  },
  {
    id: 'cau-seoul', name: '중앙대학교 서울캠퍼스', region: 'seoul', status: 'ready',
    data: 'assets/campuses/cau-seoul.json', terrain: 'hills', lighting: 'night', seed: 20261118,
    outsideLabel: '캠퍼스 밖 · 흑석동',
    spawn: { at: [156, 290], look: [150, 205] }, // on 흑석로 at the main gate, looking in along the road past 영신관
    landmarks: [
      { name: '중앙대학교 정문', kind: 'place', pos: [150, 268], r: 18, note: '흑석로 쪽 정문 — OSM에 정문 건물이 없어 표지만' },
      { name: '영신관', kind: 'building', pos: [107, 174], wall: 0xa0523a, roof: 0x5a4a42, note: '정문 옆 붉은 벽돌 건물 (1938) — 중앙대 상징' },
      { name: '청룡연못', kind: 'place', pos: [45, 137], r: 25, note: 'OSM water "청룡연못" — 청룡상이 있는 연못' },
      { name: '중앙마당', kind: 'place', pos: [101, 216], r: 30, note: 'OSM park "중앙마당"' },
    ],
  },
  {
    id: 'khu-seoul', name: '경희대학교 서울캠퍼스', region: 'seoul', status: 'ready',
    data: 'assets/campuses/khu-seoul.json', terrain: 'hills', lighting: 'night', seed: 20261119,
    outsideLabel: '캠퍼스 밖 · 회기동',
    spawn: { at: [78, -402], look: [73, -250] }, // on 경희대로 just outside the main gate, looking up the avenue toward 본관
    landmarks: [
      { name: '경희대학교 서울캠퍼스 정문', kind: 'place', pos: [77, -372], r: 18, note: '경희대로 끝 정문 — OSM에 정문 건물이 없어 표지만' },
      { name: '본관', kind: 'building', pos: [-8, 8], wall: 0xece6d8, roof: 0x8a8578, note: '흰 석조 열주 건물 — 정문에서 올라오는 길 끝' },
      { name: '평화의전당', kind: 'building', pos: [84, 167], wall: 0xb9b2a4, roof: 0x5d5a55, note: '고딕 석조 대강당' },
      { name: '노천극장', kind: 'place', pos: [214, -49], r: 25, note: 'OSM 건물 "노천극장 무대"' },
      { name: '선동호', kind: 'place', pos: [-156, -210], r: 20, note: 'OSM water "선동호"' },
    ],
  },
  {
    id: 'khu-global', name: '경희대학교 국제캠퍼스', region: 'gyeonggi', status: 'ready',
    data: 'assets/campuses/khu-global.json', terrain: 'hills', lighting: 'night', seed: 20261111,
    mirror: false, // this map file was made by hand before tools/build_campus.py and already has +z = south (정문 north)
    outsideLabel: '캠퍼스 밖 · 영통/서천',
    spawn: { from: '경희대학교 국제캠퍼스 정문', toward: '학생회관', dist: -35 }, // negative = outside the gate, looking at it
    landmarks: [
      { name: '경희대학교 국제캠퍼스 정문', kind: 'gate', pos: [-138, -457], model: 'assets/models/khu-global-front-gate.glb', scale: 80, note: '직접 만든 3D 모델 (Tripo) — 아치를 도로 중앙에 맞춤' },
      { name: '노천극장', kind: 'amphitheatre', pos: [284, 555], model: 'assets/models/khu-global-amphitheatre-colonnade.glb', note: '원형 무대 + 부채꼴 계단 객석 (카카오맵 항공사진), 무대 위 열주는 직접 만든 3D 모델 — 열린 쪽이 객석을 향함' },
      { name: '전자정보대학', kind: 'building', pos: [298, 430], wall: 0xead9b2, roof: 0x9a9384, note: '크림색 벽돌 외벽 (카카오 로드뷰)' },
      { name: '예술디자인대학', kind: 'building', pos: [401, 164], model: 'assets/models/khu-global-art-design.glb', rot: 0, height: 30, tpToward: '전자정보대학', note: '직접 만든 3D 모델 (Tripo) — 풋프린트에 맞춰 늘림; 정면 방향은 rot(90° 단위)로 조정' },
      { name: '중앙도서관', kind: 'building', pos: [-34, 262], model: 'assets/models/khu-global-central-library.glb', rot: 0, height: 28, tpToward: '사색의 광장', note: '직접 만든 3D 모델 (Tripo) — 정면이 동쪽 사색의 광장을 향함' },
      { name: '사색의 광장', kind: 'place', pos: [103, 267], r: 70, note: '중앙도서관 앞(동쪽) 잔디 광장 — OSM에 이름이 없어 사용자 설명으로 지정, 위치는 잔디 구획들의 중심' },
      { name: '천문대', kind: 'dome', pos: [170, 495] },
      { name: '대운동장', kind: 'stadium', pos: [-193, -61] },
    ],
    play: { gems: 30, gemArea: [-350, 450, -420, 520], pals: 18, palArea: [-320, 420, -420, 520], palHome: [-138, -400], treeClear: [[-138, -440, 8]] },
  },
  {
    id: 'hufs-seoul', name: '한국외국어대학교 서울캠퍼스', region: 'seoul', status: 'ready',
    data: 'assets/campuses/hufs-seoul.json', terrain: 'hills', lighting: 'night', seed: 20261120,
    outsideLabel: '캠퍼스 밖 · 이문동',
    spawn: { at: [132, -52], look: [40, -22] }, // on 이문로 at the main gate (경비실), looking in toward 대운동장/본관
    landmarks: [
      { name: '한국외대 정문', kind: 'place', pos: [112, -42], r: 15, note: '이문로 쪽 정문 (경비실 옆) — OSM에 정문 건물이 없어 표지만' },
      { name: '대운동장', kind: 'place', pos: [64, 19], r: 35, note: 'OSM pitch "대운동장"' },
    ],
  },
  soon('uos', '서울시립대학교', 'seoul'),
];
