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
    // ── first find: right in front of the spawn point (outside the main gate), so every new player learns that items exist ──
    { id: 'khu-g-20', rarity: 'common', icon: '🗺️', name: '캠퍼스 투어 안내 책자', place: '정문 앞', pos: [-143.4, -484.4], desc: '"캠퍼스 곳곳에 수집품이 숨어 있어요!" 첫 장에 이렇게 적혀 있다. 도감(I)을 열어 보자.', hint: '시작 지점 바로 앞' },
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
  'korea-anam': [
    { id: 'kor-20', rarity: 'common', icon: '🗺️', name: '안암 캠퍼스 안내 책자', place: '정문 앞', pos: [395.1, 30.6], desc: '"석조 건물 사이 곳곳에 수집품이 숨어 있어요!" 표지에 호랑이가 그려져 있다.', hint: '시작 지점 바로 앞' },
    { id: 'kor-01', rarity: 'common', icon: '🎟️', name: '입실렌티 응원 티켓', place: '녹지운동장', pos: [-433.1, 401.7], desc: '응원가를 목이 쉬도록 불렀던 그날의 티켓.', hint: '응원 소리가 가장 큰 운동장' },
    { id: 'kor-02', rarity: 'common', icon: '📚', name: '중도 열람실 좌석표', place: '중앙도서관', pos: [345.8, 333.7], desc: '아직 퇴실 처리를 안 한 좌석표. 주인은 어디 갔을까?', hint: '시험 기간에 불이 꺼지지 않는 건물' },
    { id: 'kor-03', rarity: 'common', icon: '🍜', name: '학식 식권', place: '타이거플라자', pos: [43.8, -25.4], desc: '오늘 메뉴는 짬뽕. 유효기간은… 지났다.', hint: '배고픈 학생들이 모이는 곳' },
    { id: 'kor-04', rarity: 'common', icon: '⚖️', name: '법전 책갈피', place: '해송법학도서관', pos: [255.9, 293.8], desc: '두꺼운 법전 사이에 끼워 두었던 책갈피.', hint: '법을 공부하는 도서관 근처' },
    { id: 'kor-05', rarity: 'common', icon: '🔬', name: '현미경 슬라이드', place: '생명과학관 동관', pos: [-175.5, -277.3], desc: '세포 하나가 선명하게 보인다.', hint: '생명을 연구하는 건물 앞' },
    { id: 'kor-06', rarity: 'rare', icon: '🏛️', name: '본관 석재 조각', place: '본관', pos: [217.8, 161.2], desc: '1934년 지어진 본관의 화강암 조각. 묵직하다.', hint: '캠퍼스 한가운데 가장 오래된 석조 건물' },
    { id: 'kor-07', rarity: 'rare', icon: '🌳', name: '애기능의 도토리', place: '애기능동산', pos: [-260.4, -455.6], desc: '언덕 위 숲에서 주운 반질반질한 도토리.', hint: '캠퍼스 안 작은 언덕 숲' },
    { id: 'kor-08', rarity: 'epic', icon: '🐯', name: '호랑이 발자국 석고', place: '중앙광장', pos: [299, 86.3], desc: '누군가 광장 잔디에서 뜬 커다란 발자국. 진짜일까?', hint: '본관 앞 넓은 잔디 광장 구석' },
    { id: 'kor-09', rarity: 'legendary', icon: '🔥', name: '전설의 횃불', place: '사색의동산', pos: [318.7, 221.4], desc: '축제 마지막 밤에 꺼지지 않았다는 횃불. 아직 따뜻하다.', hint: '조용히 생각하기 좋은 동산 깊은 곳' },
  ],
  'snu-gwanak': [
    { id: 'snu-20', rarity: 'common', icon: '🗺️', name: '관악 캠퍼스 안내 책자', place: '정문 앞', pos: [-517, 855.1], desc: '"캠퍼스가 넓어요, 버스를 타도 돼요" 라고 적혀 있다.', hint: '시작 지점 바로 앞' },
    { id: 'snu-01', rarity: 'common', icon: '🚌', name: '셔틀버스 승차권', place: '행정관', pos: [-275.6, 211.9], desc: '정문에서 공대까지 가는 셔틀 티켓.', hint: '본부 건물 앞 길' },
    { id: 'snu-02', rarity: 'common', icon: '📚', name: '연체된 대출 도서', place: '중앙도서관', pos: [-222.8, 143.9], desc: '반납일이 한참 지난 전공 서적.', hint: '책이 가장 많은 건물' },
    { id: 'snu-03', rarity: 'common', icon: '🍱', name: '학생식당 식권', place: '학생회관', pos: [-313.9, 120.2], desc: '오늘의 메뉴는 제육볶음.', hint: '배고픈 학생들이 모이는 곳' },
    { id: 'snu-04', rarity: 'common', icon: '🧮', name: '공학용 계산기', place: '공과대학', pos: [-228.9, -374.1], desc: '언덕 위 공대까지 들고 올라온 계산기.', hint: '언덕 위 공대 건물들 사이' },
    { id: 'snu-05', rarity: 'common', icon: '🎨', name: '물감 묻은 붓', place: '서울대학교 미술관', pos: [-392.2, 926.6], desc: '미술관 앞에 놓인 붓. 물감이 아직 마르지 않았다.', hint: '그림이 걸린 건물 근처' },
    { id: 'snu-06', rarity: 'rare', icon: '🦆', name: '자하연 깃털', place: '자하연', pos: [-205.4, 266.5], desc: '연못가에서 주운 하얀 깃털.', hint: '인문대 옆 연못가' },
    { id: 'snu-07', rarity: 'rare', icon: '🍃', name: '버들골 풀피리', place: '버들골', pos: [150.6, 37.3], desc: '잔디 언덕에서 누가 불던 풀피리.', hint: '넓은 잔디 언덕' },
    { id: 'snu-08', rarity: 'epic', icon: '💧', name: '공대폭포 물방울 유리병', place: '공대폭포', pos: [-117.6, -487.9], desc: '폭포 물을 담은 작은 유리병. 빛을 받으면 무지개가 뜬다.', hint: '공대 근처 물이 떨어지는 곳' },
    { id: 'snu-09', rarity: 'legendary', icon: '⛰️', name: '관악산 정상석 조각', place: '청룡산', pos: [-605, 1624.3], desc: '캠퍼스 뒤 산에서 내려왔다는 돌 조각. 시험 합격의 기운이 있다고.', hint: '캠퍼스를 감싼 산 숲 속' },
  ],
  'yonsei-sinchon': [
    { id: 'yon-20', rarity: 'common', icon: '🗺️', name: '신촌 캠퍼스 안내 책자', place: '정문 앞', pos: [-170, -845.1], desc: '"백양로를 따라 올라가 보세요!" 첫 장에 이렇게 적혀 있다.', hint: '시작 지점 바로 앞' },
    { id: 'yon-01', rarity: 'common', icon: '🎟️', name: '아카라카 티켓', place: '노천극장', pos: [101.1, -198.5], desc: '응원 소리가 아직 귀에 맴도는 티켓.', hint: '하늘이 지붕인 공연장' },
    { id: 'yon-02', rarity: 'common', icon: '📚', name: '중도 열람실 좌석표', place: '중앙도서관', pos: [-141.8, -444.3], desc: '퇴실 처리를 잊은 좌석표.', hint: '책이 가장 많은 건물' },
    { id: 'yon-03', rarity: 'common', icon: '🍜', name: '학식 식권', place: '학생회관', pos: [-52.8, -458.4], desc: '오늘의 메뉴는 돈가스.', hint: '배고픈 학생들이 모이는 곳' },
    { id: 'yon-04', rarity: 'common', icon: '🧮', name: '공학용 계산기', place: '제1공학관', pos: [-182.5, -657.6], desc: '시험 직전 배터리가 나간 계산기.', hint: '공대생이 가장 오래 머무는 건물' },
    { id: 'yon-05', rarity: 'common', icon: '⛪', name: '루스채플 주보', place: '루스채플', pos: [-5.1, -475.8], desc: '채플 시간에 받은 주보. 뒷면에 낙서가 있다.', hint: '종소리가 들리는 건물 앞' },
    { id: 'yon-06', rarity: 'rare', icon: '🏛️', name: '언더우드관 담쟁이 잎', place: '언더우드관', pos: [-10.5, -152.8], desc: '붉은 담쟁이로 덮인 석조 건물에서 떨어진 잎.', hint: '캠퍼스 한가운데 가장 오래된 석조 건물' },
    { id: 'yon-07', rarity: 'rare', icon: '✒️', name: '윤동주 시집 책갈피', place: '윤동주문학동산', pos: [-100.6, -263.2], desc: '시비 앞에 놓여 있던 책갈피. 별 그림이 그려져 있다.', hint: '시인을 기리는 작은 동산' },
    { id: 'yon-08', rarity: 'epic', icon: '🌲', name: '청송대 솔방울', place: '청송대', pos: [170.8, -139.5], desc: '숲 깊은 곳 소나무에서 떨어진 솔방울. 은은한 향이 난다.', hint: '캠퍼스 안 소나무 숲' },
    { id: 'yon-09', rarity: 'legendary', icon: '🦅', name: '독수리 깃털', place: '메타세쿼이아 힐링숲', pos: [179.1, 836.5], desc: '캠퍼스를 지키는 독수리가 떨어뜨렸다는 깃털.', hint: '키 큰 나무가 늘어선 숲 깊은 곳' },
  ],
  'sogang': [
    { id: 'sg-20', rarity: 'common', icon: '🗺️', name: '서강 캠퍼스 안내 책자', place: '정문 앞', pos: [-245.1, -76.5], desc: '"작지만 알찬 캠퍼스예요!" 첫 장에 이렇게 적혀 있다.', hint: '시작 지점 바로 앞' },
    { id: 'sg-01', rarity: 'common', icon: '📚', name: '로욜라 도서관 대출증', place: '로욜라 도서관 1관', pos: [64.8, -44.8], desc: '누군가 떨어뜨린 대출증.', hint: '책이 가장 많은 건물' },
    { id: 'sg-02', rarity: 'common', icon: '🍝', name: '곤자가 플라자 쿠폰', place: '곤자가 프라자', pos: [189.5, -129.1], desc: '음료 한 잔 무료 쿠폰. 아직 쓸 수 있을까?', hint: '학생들이 쉬는 광장 건물' },
    { id: 'sg-03', rarity: 'common', icon: '🧪', name: '시약병 라벨', place: '리치과학관', pos: [0.1, -240.7], desc: '실험 결과가 빼곡히 적힌 라벨.', hint: '과학 실험을 하는 건물' },
    { id: 'sg-04', rarity: 'common', icon: '💼', name: '경영학 발표 자료', place: '금호아시아나바오로경영관', pos: [-192.8, 30.1], desc: '발표 직전까지 고친 흔적이 가득하다.', hint: '경영을 공부하는 건물 앞' },
    { id: 'sg-05', rarity: 'common', icon: '🏃', name: '운동장 출석 도장', place: '서강대학교 대운동장', pos: [12.6, -172.7], desc: '체육 수업 출석 카드에 찍힌 도장.', hint: '넓은 운동장' },
    { id: 'sg-06', rarity: 'rare', icon: '🪶', name: '알바트로스 깃털', place: '알바트로스 공원', pos: [-224.3, -70.9], desc: '학교 상징 새의 깃털이라는 소문이 있다.', hint: '정문 옆 작은 공원' },
    { id: 'sg-07', rarity: 'rare', icon: '🔔', name: '본관 종', place: '본관', pos: [-92, -118.9], desc: '본관 꼭대기 종에서 떨어졌다는 작은 종.', hint: '언덕 위 가장 오래된 건물' },
    { id: 'sg-08', rarity: 'epic', icon: '✝️', name: '예수회 묵주', place: '예수회공동체', pos: [-62.5, -46.3], desc: '조용한 건물 앞 벤치에 놓여 있던 묵주.', hint: '캠퍼스 안 조용한 공동체 건물' },
    { id: 'sg-09', rarity: 'legendary', icon: '🌅', name: '노고산의 노을 조각', place: '노고산동체육공원', pos: [117.6, 200.4], desc: '언덕 위에서 노을을 담아 왔다는 유리 조각.', hint: '캠퍼스 뒤 언덕 공원' },
  ],
  'skku-seoul': [
    { id: 'skku-s-20', rarity: 'common', icon: '🗺️', name: '명륜 캠퍼스 안내 책자', place: '정문 앞', pos: [205.2, -218.2], desc: '"600년 역사의 길을 따라 걸어 보세요!" 첫 장에 이렇게 적혀 있다.', hint: '시작 지점 바로 앞' },
    { id: 'skku-s-01', rarity: 'common', icon: '📚', name: '중앙학술정보관 좌석표', place: '중앙학술정보관', pos: [116.4, 142], desc: '퇴실 처리를 잊은 좌석표.', hint: '책이 가장 많은 건물' },
    { id: 'skku-s-02', rarity: 'common', icon: '🍱', name: '학식 식권', place: '학생회관', pos: [25.5, 44.1], desc: '오늘의 메뉴는 비빔밥.', hint: '배고픈 학생들이 모이는 곳' },
    { id: 'skku-s-03', rarity: 'common', icon: '💼', name: '경영학 발표 자료', place: '경영관', pos: [-57.2, 184.4], desc: '발표 직전까지 고친 흔적이 가득하다.', hint: '경영을 공부하는 건물 앞' },
    { id: 'skku-s-04', rarity: 'common', icon: '🎭', name: '노천극장 공연 팸플릿', place: '성균관대학교 노천극장', pos: [-39.3, 77.4], desc: '동아리 공연 순서가 적힌 팸플릿.', hint: '하늘이 지붕인 공연장' },
    { id: 'skku-s-05', rarity: 'common', icon: '⚖️', name: '법전 책갈피', place: '법학관', pos: [-237.6, 27.5], desc: '두꺼운 법전 사이에 끼워 두었던 책갈피.', hint: '법을 공부하는 건물 근처' },
    { id: 'skku-s-06', rarity: 'rare', icon: '🍂', name: '명륜당 은행잎', place: '명륜당', pos: [246.2, -102.8], desc: '수백 년 된 은행나무에서 떨어진 노란 잎.', hint: '옛 성균관의 강당 앞' },
    { id: 'skku-s-07', rarity: 'rare', icon: '🖌️', name: '선비의 붓', place: '비천당', pos: [135.8, -38.1], desc: '옛 유생이 쓰던 붓. 먹 냄새가 난다.', hint: '옛 성균관 건물 사이' },
    { id: 'skku-s-08', rarity: 'epic', icon: '📜', name: '과거 시험 답안지', place: '대성전', pos: [256.6, -183.1], desc: '장원급제라고 적힌 오래된 답안지.', hint: '옛 성균관 가장 안쪽 사당' },
    { id: 'skku-s-09', rarity: 'legendary', icon: '🌸', name: '와룡공원 벚꽃 책갈피', place: '와룡공원', pos: [-266.1, 394.2], desc: '봄에만 핀다는 벚꽃을 눌러 만든 책갈피. 계절과 상관없이 향이 난다.', hint: '캠퍼스 뒤 언덕 공원 깊은 곳' },
  ],
  'skku-natural': [
    { id: 'skku-n-20', rarity: 'common', icon: '🗺️', name: '율전 캠퍼스 안내 책자', place: '정문 앞', pos: [-19.9, -313], desc: '"삼성학술정보관부터 가 보세요!" 첫 장에 이렇게 적혀 있다.', hint: '시작 지점 바로 앞' },
    { id: 'skku-n-01', rarity: 'common', icon: '📚', name: '삼성학술정보관 좌석표', place: '삼성학술정보관', pos: [13.2, 18.2], desc: '퇴실 처리를 잊은 좌석표.', hint: '캠퍼스 한가운데 큰 도서관' },
    { id: 'skku-n-02', rarity: 'common', icon: '🍱', name: '학식 식권', place: '학생회관', pos: [-81.8, 11.4], desc: '오늘의 메뉴는 돈가스.', hint: '배고픈 학생들이 모이는 곳' },
    { id: 'skku-n-03', rarity: 'common', icon: '🧮', name: '공학용 계산기', place: '제1공학관', pos: [160.4, -6.6], desc: '시험 직전 배터리가 나간 계산기.', hint: '공대생이 가장 오래 머무는 건물' },
    { id: 'skku-n-04', rarity: 'common', icon: '💊', name: '약학 실습 캡슐', place: '약학관', pos: [179.3, -215.8], desc: '빈 캡슐 하나. 무엇을 담으려 했을까?', hint: '약을 공부하는 건물 앞' },
    { id: 'skku-n-05', rarity: 'common', icon: '🔑', name: '기숙사 방 열쇠', place: '기숙사 인관', pos: [-75.6, 332], desc: '누군가 지금쯤 문 앞에서 곤란해하고 있을 것이다.', hint: '학생들이 잠드는 곳 근처' },
    { id: 'skku-n-06', rarity: 'rare', icon: '🌐', name: '글로벌 광장 배지', place: '글로벌 광장', pos: [-16.5, -137.8], desc: '교환학생 환영 행사에서 나눠 준 배지.', hint: '캠퍼스 가운데 넓은 광장' },
    { id: 'skku-n-07', rarity: 'rare', icon: '🧬', name: 'DNA 모형 조각', place: '생명공학관', pos: [-66.8, 219.1], desc: '이중나선 모형에서 떨어진 조각.', hint: '생명을 연구하는 건물' },
    { id: 'skku-n-08', rarity: 'epic', icon: '🌿', name: '일월수목원 표본', place: '일월수목원', pos: [73.6, -604.7], desc: '희귀한 식물 잎을 눌러 만든 표본.', hint: '캠퍼스 옆 수목원 깊은 곳' },
    { id: 'skku-n-09', rarity: 'legendary', icon: '🦢', name: '일월저수지의 은빛 비늘', place: '일월저수지', pos: [-95.2, -427.6], desc: '저수지 물고기가 남기고 간 은빛 비늘. 달빛에 반짝인다.', hint: '캠퍼스 옆 큰 저수지 물가' },
  ],
  'hanyang-seoul': [
    { id: 'hy-20', rarity: 'common', icon: '🗺️', name: '서울 캠퍼스 안내 책자', place: '정문 앞', pos: [-188.5, -90.5], desc: '"애지문에서 출발! 언덕이 많으니 운동화 필수" 라고 적혀 있다.', hint: '시작 지점 바로 앞' },
    { id: 'hy-01', rarity: 'common', icon: '📚', name: '백남학술정보관 좌석표', place: '백남학술정보관', pos: [-62.9, 36.6], desc: '퇴실 처리를 잊은 좌석표.', hint: '책이 가장 많은 건물' },
    { id: 'hy-02', rarity: 'common', icon: '🍱', name: '학식 식권', place: '학생회관', pos: [-192.6, 78.6], desc: '오늘의 메뉴는 짜장면.', hint: '배고픈 학생들이 모이는 곳' },
    { id: 'hy-03', rarity: 'common', icon: '🧮', name: '공학용 계산기', place: '제1공학관', pos: [-53.2, -47.1], desc: '시험 직전 배터리가 나간 계산기.', hint: '공대생이 가장 오래 머무는 건물' },
    { id: 'hy-04', rarity: 'common', icon: '🎵', name: '악보 한 장', place: '백남음악관', pos: [67.6, -52.8], desc: '연습실에서 날아온 악보. 마지막 마디가 비어 있다.', hint: '음악이 들리는 건물 앞' },
    { id: 'hy-05', rarity: 'common', icon: '🔑', name: '기숙사 방 열쇠', place: '제1학생생활관', pos: [86.4, 206.9], desc: '누군가 지금쯤 문 앞에서 곤란해하고 있을 것이다.', hint: '학생들이 잠드는 곳 근처' },
    { id: 'hy-06', rarity: 'rare', icon: '🎭', name: '노천극장 공연 티켓', place: '노천극장', pos: [-85.1, -169], desc: '축제 날 무대 맨 앞줄 티켓.', hint: '하늘이 지붕인 공연장' },
    { id: 'hy-07', rarity: 'rare', icon: '🏺', name: '박물관 토기 조각', place: '박물관', pos: [-144.7, -192], desc: '전시실에서 굴러 나왔다는 토기 조각.', hint: '옛 유물이 모인 건물' },
    { id: 'hy-08', rarity: 'epic', icon: '🐦', name: '까치골 까치 둥지', place: '까치골', pos: [32.2, -96.5], desc: '나뭇가지로 정성껏 엮은 작은 둥지. 비어 있다.', hint: '까치가 모인다는 골짜기' },
    { id: 'hy-09', rarity: 'legendary', icon: '🦁', name: '사자상의 갈기 한 올', place: '살곶이체육공원', pos: [257.4, -269.5], desc: '캠퍼스를 지키는 사자가 남겼다는 황금빛 털.', hint: '캠퍼스 남동쪽 강변 공원' },
  ],
  'cau-seoul': [
    { id: 'cau-20', rarity: 'common', icon: '🗺️', name: '흑석 캠퍼스 안내 책자', place: '정문 앞', pos: [155.5, 283], desc: '"영신관부터 둘러보세요!" 첫 장에 이렇게 적혀 있다.', hint: '시작 지점 바로 앞' },
    { id: 'cau-01', rarity: 'common', icon: '🍱', name: '학식 식권', place: '학생회관', pos: [47.3, 215.2], desc: '오늘의 메뉴는 돈가스.', hint: '배고픈 학생들이 모이는 곳' },
    { id: 'cau-02', rarity: 'common', icon: '⚖️', name: '법전 책갈피', place: '법학관', pos: [-79.2, 12.3], desc: '높은 법학관에서 떨어진 책갈피.', hint: '캠퍼스에서 가장 높은 건물' },
    { id: 'cau-03', rarity: 'common', icon: '🎬', name: '영화 촬영 슬레이트', place: '중앙문화예술관', pos: [-193, 111.3], desc: '"씬 1, 테이크 3" 이라고 적혀 있다.', hint: '예술가들이 모이는 건물' },
    { id: 'cau-04', rarity: 'common', icon: '💻', name: '코딩 노트북 스티커', place: '전산정보관', pos: [-18.6, 81.3], desc: '누군가의 노트북에서 떨어진 스티커.', hint: '컴퓨터가 가득한 건물' },
    { id: 'cau-05', rarity: 'common', icon: '🔑', name: '기숙사 방 열쇠', place: '블루미르홀', pos: [2.6, -219.2], desc: '누군가 지금쯤 문 앞에서 곤란해하고 있을 것이다.', hint: '학생들이 잠드는 곳 근처' },
    { id: 'cau-06', rarity: 'rare', icon: '🧱', name: '영신관 붉은 벽돌', place: '영신관', pos: [112, 163.6], desc: '정문 옆 오래된 벽돌 건물에서 떨어진 조각.', hint: '정문 옆 붉은 벽돌 건물' },
    { id: 'cau-07', rarity: 'rare', icon: '🌿', name: '중앙마당 클로버', place: '중앙마당', pos: [101.1, 211.9], desc: '잔디밭에서 찾은 네잎클로버.', hint: '학생들이 쉬는 잔디 마당' },
    { id: 'cau-08', rarity: 'epic', icon: '🐉', name: '청룡의 비늘', place: '청룡연못', pos: [41.2, 124.2], desc: '연못 속 청룡이 떨어뜨렸다는 푸른 비늘.', hint: '청룡이 산다는 연못' },
    { id: 'cau-09', rarity: 'legendary', icon: '💙', name: '전설의 블루 드래곤 여의주', place: '100주년기념관', pos: [-40.2, -97.4], desc: '청룡이 품고 있었다는 구슬. 손에 쥐면 푸른빛이 번진다.', hint: '캠퍼스 남쪽 높은 건물 뒤편' },
  ],
  'khu-seoul': [
    { id: 'khu-s-20', rarity: 'common', icon: '🗺️', name: '서울 캠퍼스 안내 책자', place: '정문 앞', pos: [77.8, -395], desc: '"정문에서 본관까지 쭉 올라가 보세요!" 첫 장에 이렇게 적혀 있다.', hint: '시작 지점 바로 앞' },
    { id: 'khu-s-01', rarity: 'common', icon: '📚', name: '중도 열람실 좌석표', place: '경희대학교 중앙도서관', pos: [100.8, 4.5], desc: '퇴실 처리를 잊은 좌석표.', hint: '책이 가장 많은 건물' },
    { id: 'khu-s-02', rarity: 'common', icon: '🍱', name: '학식 식권', place: '학생회관', pos: [318.1, -196.4], desc: '오늘의 메뉴는 제육볶음.', hint: '배고픈 학생들이 모이는 곳' },
    { id: 'khu-s-03', rarity: 'common', icon: '⚖️', name: '법전 책갈피', place: '법과대학', pos: [191.6, 67], desc: '두꺼운 법전 사이에 끼워 두었던 책갈피.', hint: '법을 공부하는 건물 근처' },
    { id: 'khu-s-04', rarity: 'common', icon: '🌿', name: '한약재 봉투', place: '한의과대학', pos: [231.8, -150.9], desc: '감초 냄새가 솔솔 나는 작은 봉투.', hint: '한의학을 공부하는 건물' },
    { id: 'khu-s-05', rarity: 'common', icon: '🏨', name: '호텔 룸 키카드', place: '청운관', pos: [13.8, -238.5], desc: '실습용 호텔 객실 카드키.', hint: '호텔과 관광을 공부하는 높은 건물' },
    { id: 'khu-s-06', rarity: 'rare', icon: '🏛️', name: '본관 기둥 조각', place: '본관', pos: [-6.3, 21.2], desc: '흰 석조 열주에서 떨어진 작은 조각.', hint: '정문에서 올라오는 길 끝 하얀 건물' },
    { id: 'khu-s-07', rarity: 'rare', icon: '🎭', name: '노천극장 공연 티켓', place: '노천극장 무대', pos: [205.8, -48.5], desc: '축제 날 무대 맨 앞줄 티켓.', hint: '하늘이 지붕인 무대' },
    { id: 'khu-s-08', rarity: 'epic', icon: '🎼', name: '평화의전당 파이프 오르간 건반', place: '평화의전당', pos: [112.7, 165.2], desc: '고딕 대강당 오르간에서 빠진 건반 하나.', hint: '뾰족한 탑이 있는 석조 대강당 뒤편' },
    { id: 'khu-s-09', rarity: 'legendary', icon: '🦁', name: '사자상의 별조각', place: '선동호', pos: [-151.7, -195.3], desc: '서울캠 사자가 떨어뜨렸다는 별 조각. 국제캠 것과 짝이라는 소문이…', hint: '캠퍼스 서쪽 작은 호수 숲 속' },
  ],
  'hufs-seoul': [
    { id: 'hufs-20', rarity: 'common', icon: '🗺️', name: '서울 캠퍼스 안내 책자', place: '정문 앞', pos: [125.3, -49.8], desc: '"45개 언어로 인사해 보세요!" 첫 장에 이렇게 적혀 있다.', hint: '시작 지점 바로 앞' },
    { id: 'hufs-01', rarity: 'common', icon: '📚', name: '도서관 좌석표', place: '도서관', pos: [-16.3, -91.6], desc: '퇴실 처리를 잊은 좌석표.', hint: '책이 가장 많은 건물' },
    { id: 'hufs-02', rarity: 'common', icon: '📒', name: '손때 묻은 단어장', place: '인문과학관', pos: [-170.6, 113.2], desc: '여러 나라 말이 빼곡히 적힌 단어장.', hint: '여러 언어가 들리는 건물' },
    { id: 'hufs-03', rarity: 'common', icon: '⚖️', name: '법전 책갈피', place: '법학관', pos: [-108.5, -30.6], desc: '두꺼운 법전 사이에 끼워 두었던 책갈피.', hint: '법을 공부하는 건물 근처' },
    { id: 'hufs-04', rarity: 'common', icon: '🏀', name: '농구공', place: '농구장', pos: [114.5, -13.1], desc: '바람이 살짝 빠진 농구공.', hint: '공 튀기는 소리가 들리는 곳' },
    { id: 'hufs-05', rarity: 'rare', icon: '🛂', name: '여권 스탬프', place: '국제관', pos: [29.2, 106.8], desc: '교환학생이 남기고 간 여러 나라 입국 도장.', hint: '세계를 공부하는 건물' },
    { id: 'hufs-06', rarity: 'rare', icon: '🌍', name: '미니 지구본', place: '글로벌홀', pos: [168.7, -28.1], desc: '책상 위에 올려 두던 작은 지구본.', hint: '캠퍼스에서 가장 높은 건물' },
    { id: 'hufs-07', rarity: 'epic', icon: '🕰️', name: '역사기념관 회중시계', place: '역사기념관', pos: [-70.4, 63.4], desc: '오래된 회중시계. 아직 째깍거린다.', hint: '학교의 역사를 모아 둔 건물' },
    { id: 'hufs-08', rarity: 'legendary', icon: '🗝️', name: '천장산의 열쇠', place: '교수학습개발원', pos: [-98, 114.6], desc: '산 쪽 숲에서 발견된 오래된 열쇠. 어느 문을 여는 걸까?', hint: '캠퍼스 북쪽 끝, 산과 맞닿은 곳' },
  ],
  'uos': [
    { id: 'uos-20', rarity: 'common', icon: '🗺️', name: '시립대 캠퍼스 안내 책자', place: '정문 앞', pos: [-397.2, 45.7], desc: '"하늘못과 자주터를 꼭 들러 보세요!" 첫 장에 이렇게 적혀 있다.', hint: '시작 지점 바로 앞' },
    { id: 'uos-01', rarity: 'common', icon: '📚', name: '중앙도서관 좌석표', place: '중앙도서관', pos: [254.5, 210.4], desc: '퇴실 처리를 잊은 좌석표.', hint: '책이 가장 많은 건물' },
    { id: 'uos-02', rarity: 'common', icon: '🍱', name: '학식 식권', place: '학생회관', pos: [81.9, 76.7], desc: '싸고 맛있기로 유명한 학식 식권.', hint: '배고픈 학생들이 모이는 곳' },
    { id: 'uos-03', rarity: 'common', icon: '🏗️', name: '건축 모형 조각', place: '건설공학관', pos: [-149.6, 76.2], desc: '설계 수업 모형에서 떨어진 작은 기둥.', hint: '건물을 설계하는 곳' },
    { id: 'uos-04', rarity: 'common', icon: '💻', name: '코딩 노트북 스티커', place: '정보기술관', pos: [115.9, -13.6], desc: '누군가의 노트북에서 떨어진 스티커.', hint: '컴퓨터가 가득한 건물' },
    { id: 'uos-05', rarity: 'common', icon: '🎵', name: '악보 한 장', place: '음악관', pos: [289.8, 35.5], desc: '연습실에서 날아온 악보.', hint: '음악이 들리는 건물' },
    { id: 'uos-06', rarity: 'rare', icon: '🌿', name: '자주터 클로버', place: '자주터', pos: [-54.5, 80], desc: '잔디 광장에서 찾은 네잎클로버.', hint: '캠퍼스 가운데 잔디 광장' },
    { id: 'uos-07', rarity: 'rare', icon: '🏺', name: '박물관 유물 조각', place: '서울시립대학교박물관', pos: [-241.9, 14.7], desc: '전시실에서 굴러 나왔다는 유물 조각.', hint: '옛 유물이 모인 건물' },
    { id: 'uos-08', rarity: 'epic', icon: '💧', name: '하늘못 물방울 유리병', place: '하늘못', pos: [151.4, 76.3], desc: '연못 물을 담은 작은 병. 하늘이 비친다.', hint: '하늘을 비추는 연못' },
    { id: 'uos-09', rarity: 'legendary', icon: '🏯', name: '배봉산 보루의 돌', place: '배봉산보루', pos: [379.3, -214.4], desc: '옛 성벽에서 떨어졌다는 돌. 묵직한 세월이 느껴진다.', hint: '캠퍼스 남동쪽 산 위 옛 보루' },
  ],
};
