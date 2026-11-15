// Collectibles — data only (the system lives in collectibles.js).
//
//   RARITY      look + label per tier. Rarity changes only how an item looks and how hard it is to find — never a stronger reward.
//   ITEMS       per campus id (same keys as campuses.js). Add a campus = add a key here; nothing else to change.
//
// Item fields:
//   id      unique and stable forever (it is what gets saved) — prefix with the campus, e.g. 'khu-g-01'
//   name    shown in the collection book once found
//   desc    flavour text shown in the detail view once found
//   hint    shown for items not found yet (where to look, vaguely)
//   rarity  'common' | 'rare' | 'epic' | 'legendary'
//   pos     [x, z] metres from the map origin (same frame as campuses.js landmarks); height comes from the ground
//   icon    emoji used in the book and on the item (an image path 'assets/…png' works too)
//   model   optional 'assets/…glb' to replace the default crystal (+ scale = height in metres)
//   place   name of the nearby place, for the book

export const RARITY = {
  common: { name: '일반', color: 0x9fd7a8, css: '#7cc48a', size: 0.42, beam: 0, spin: 1.2 },
  rare: { name: '희귀', color: 0x6fb7ff, css: '#4f9cf0', size: 0.5, beam: 7, spin: 1.6 },
  epic: { name: '영웅', color: 0xc08cff, css: '#a66cf2', size: 0.58, beam: 13, spin: 2 },
  legendary: { name: '전설', color: 0xffcf4a, css: '#f0b323', size: 0.7, beam: 0, spin: 2.6, sparkle: true }, // no beam: legendaries are meant to be stumbled upon
};
export const RARITY_ORDER = ['common', 'rare', 'epic', 'legendary'];

export const ITEMS = {
  'khu-global': [
    // ── 일반: on the main walks, near the buildings everyone passes ──
    { id: 'khu-g-01', rarity: 'common', icon: '🎫', name: '신입생 웰컴 배지', place: '정문', pos: [-122, -428], desc: '정문을 처음 지나는 신입생에게 나눠 주던 배지. 아직 반짝인다.', hint: '캠퍼스에 들어서자마자 보이는 곳' },
    { id: 'khu-g-02', rarity: 'common', icon: '🍱', name: '학식 식권', place: '학생회관', pos: [-19, 106], desc: '오늘의 메뉴는 돈가스. 유효기간은… 지났다.', hint: '배고픈 학생들이 모이는 건물 앞' },
    { id: 'khu-g-03', rarity: 'common', icon: '📚', name: '연체된 대출 도서', place: '중앙도서관', pos: [8, 262], desc: '반납일이 한참 지난 전공 서적. 누군가 몰래 두고 갔다.', hint: '책이 가장 많은 건물 근처' },
    { id: 'khu-g-04', rarity: 'common', icon: '🍀', name: '네잎클로버', place: '사색의 광장', pos: [103, 267], desc: '잔디밭에서 생각에 잠긴 누군가가 찾아낸 행운.', hint: '조용히 생각하기 좋은 잔디 광장' },
    { id: 'khu-g-05', rarity: 'common', icon: '📣', name: '응원 메가폰', place: '대운동장', pos: [-193, -61], desc: '체육대회 날 목이 쉬도록 외쳤던 그 메가폰.', hint: '넓은 운동장 한가운데' },
    { id: 'khu-g-06', rarity: 'common', icon: '🧮', name: '공학용 계산기', place: '공학관', pos: [51, -318], desc: '시험 직전에 배터리가 나가 버린 비운의 계산기.', hint: '공대생이 가장 오래 머무는 건물 앞' },
    { id: 'khu-g-07', rarity: 'common', icon: '📒', name: '손때 묻은 단어장', place: '외국어대학관', pos: [-210, -178], desc: '여러 나라 말이 빼곡히 적힌 단어장. 마지막 장은 비어 있다.', hint: '여러 언어가 들리는 건물 근처' },
    { id: 'khu-g-08', rarity: 'common', icon: '🔑', name: '기숙사 방 열쇠', place: '우정원', pos: [-241, -275], desc: '누군가 지금쯤 문 앞에서 곤란해하고 있을 것이다.', hint: '학생들이 잠드는 곳 근처' },
    { id: 'khu-g-09', rarity: 'common', icon: '🌱', name: '새싹 화분', place: '원예생물공학온실', pos: [116, -28], desc: '온실 앞에 놓인 작은 화분. 물을 주면 자랄 것 같다.', hint: '식물이 자라는 유리 건물 근처' },
    // ── 희귀: a little off the main road ──
    { id: 'khu-g-10', rarity: 'rare', icon: '🎭', name: '노천극장 공연 티켓', place: '노천극장', pos: [284, 555], desc: '축제 날 무대 맨 앞줄 티켓. 무대 한가운데에 떨어져 있었다.', hint: '하늘이 지붕인 무대 위' },
    { id: 'khu-g-11', rarity: 'rare', icon: '🔌', name: '반짝이는 회로 기판', place: '전자정보대학', pos: [298, 462], desc: '졸업 작품에서 떨어져 나온 기판. LED가 아직 깜빡인다.', hint: '전자 공학 건물의 뒤편' },
    { id: 'khu-g-12', rarity: 'rare', icon: '🏺', name: '깨진 도자기 조각', place: '예술디자인대학 도예관', pos: [112, -68], desc: '가마에서 막 꺼낸 듯 아직 따뜻한 도자기 조각.', hint: '흙을 굽는 작은 건물 근처' },
    { id: 'khu-g-13', rarity: 'rare', icon: '🪨', name: '연못의 조약돌', place: '르네상스 공원', pos: [-180, -410], desc: '연못가에서 주운 매끈한 돌. 소원을 빌면 이루어진다는 소문이…', hint: '정문 옆 공원의 물가' },
    { id: 'khu-g-14', rarity: 'rare', icon: '🛂', name: '여권 스탬프', place: '국제학관', pos: [109, 345], desc: '교환학생이 남기고 간 여러 나라의 입국 도장.', hint: '세계를 공부하는 건물 앞' },
    // ── 영웅: hidden corners you only find by wandering ──
    { id: 'khu-g-15', rarity: 'epic', icon: '🗺️', name: '별자리 지도', place: '천문대', pos: [170, 475], desc: '천문동아리가 손으로 그린 국제캠 밤하늘 지도. 오늘 밤 별과 똑같다.', hint: '둥근 지붕 아래, 별을 보는 곳' },
    { id: 'khu-g-16', rarity: 'epic', icon: '🧪', name: '밤샘 실험 노트', place: '실험연구동', pos: [565, 320], desc: '"절대 버리지 말 것" 이라고 적힌 노트. 결과는 성공이었을까?', hint: '캠퍼스 동쪽 끝, 불이 꺼지지 않는 연구동 너머' },
    { id: 'khu-g-17', rarity: 'epic', icon: '🪶', name: '부엉이 깃털', place: '국제대학 옆 숲', pos: [44, 140], desc: '밤마다 학생회관 근처 숲에서 운다는 부엉이의 깃털.', hint: '건물 사이 작은 숲 속' },
    // ── 전설: far from every road ──
    { id: 'khu-g-18', rarity: 'legendary', icon: '🦁', name: '사자상의 별조각', place: '노천극장 뒤 숲', pos: [230, 690], desc: '캠퍼스를 지키는 사자가 떨어뜨린 별 조각. 손에 쥐면 따뜻하다.', hint: '무대 뒤 언덕 숲, 캠퍼스 북쪽 끝' },
    { id: 'khu-g-19', rarity: 'legendary', icon: '💍', name: '전설의 졸업 반지', place: '애지원', pos: [150, -700], desc: '첫 졸업생이 묻어 두었다는 반지. 찾은 사람은 무사히 졸업한다고 한다.', hint: '본 캠퍼스에서 떨어진 남쪽 건물 근처' },
  ],
};
