# Campus Tour (프릴 메도우)

실제 지도로 만든 대학 캠퍼스를 밤에 돌아다니는 3인칭 3D 탐험 게임입니다. 브라우저에서 바로 실행됩니다.

- 플레이: https://donghohoho.github.io/campus-tour/
- 조작: WASD 이동 · Shift 달리기 · Space 점프 · 마우스 시점 · 휠 줌 · C 캐릭터 변경 · M 캠퍼스 변경 (모바일은 조이스틱과 버튼)

## 구조

- `index.html`, `client.js` — 게임 화면과 로직 (three.js)
- `campuses.js` — 캠퍼스 목록과 캠퍼스별 설정
- `assets/campuses/` — 캠퍼스별 지도 데이터 (건물, 도로, 지형)
- `assets/character*.glb` — 캐릭터 모델
- `vendor/` — three.js 0.170

## 출처

지도 데이터 © OpenStreetMap 기여자 (ODbL) · 지형 SRTM
