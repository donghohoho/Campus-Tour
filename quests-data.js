// Quests — data only (the system lives in quests.js).
//
//   PERIODS     when a quest board renews and how many quests it holds. Only 'daily' is live; a weekly or seasonal
//               board is one more entry here (+ a key function in quests.js) — the rest of the system is period-agnostic.
//   TYPES       quest categories: icon + label. A daily board takes at most one quest per type.
//   TEMPLATES   the quest pool. Each day's board is drawn from it with a seed made from the date, so every player
//               gets the same quests that day (unless one can't be finished, e.g. no collectibles left to find).
//
// Template fields:
//   id       stable forever (saved in the claim ledger)       period   'daily' (later: 'weekly', 'season:<id>' …)
//   type     key of TYPES                                      kind     what counts as progress (see quests.js `KINDS`)
//   name     title                                             desc     one line under the title
//   target   goal in the kind's unit (m, s, count)             reward   coins, paid by the existing coin wallet (pets.js)
//   campus/place   for kind 'visit': the place to stand in (same names as the map labels)
//   minRarity      for kind 'collect': only items of this rarity or rarer count
//   weight   optional draw weight (default 1)                  difficulty  optional, unused for now (future: easy/normal/hard boards)

export const PERIODS = {
  daily: { name: '오늘의 퀘스트', count: 3, renew: '매일 자정 (한국 시간)' },
};

export const TYPES = {
  explore: { icon: '🧭', name: '탐험' },
  collect: { icon: '💎', name: '수집' },
  pet: { icon: '🐾', name: '펫' },
  play: { icon: '⏱️', name: '플레이' },
};

export const TEMPLATES = [
  // ── 탐험: distance on foot (the existing pedometer) or standing in a named place ──
  { id: 'walk-500', period: 'daily', type: 'explore', kind: 'distance', target: 500, reward: 30, name: '캠퍼스 산책', desc: '캠퍼스를 500m 걸어 보세요' },
  { id: 'walk-1500', period: 'daily', type: 'explore', kind: 'distance', target: 1500, reward: 60, name: '캠퍼스 한 바퀴', desc: '캠퍼스를 1.5km 걸어 보세요' },
  { id: 'visit-any-3', period: 'daily', type: 'explore', kind: 'visitAny', target: 3, reward: 40, name: '명소 탐방', desc: '이름이 있는 장소 3곳을 찾아가 보세요 (어느 캠퍼스든)' },
  { id: 'visit-khu-amph', period: 'daily', type: 'explore', kind: 'visit', campus: 'khu-global', place: '노천극장', target: 1, reward: 35, name: '노천극장 가기', desc: '경희대 국제캠 노천극장에 가 보세요' },
  { id: 'visit-khu-dome', period: 'daily', type: 'explore', kind: 'visit', campus: 'khu-global', place: '천문대', target: 1, reward: 35, name: '천문대 가기', desc: '경희대 국제캠 천문대에 가 보세요' },
  { id: 'visit-khu-library', period: 'daily', type: 'explore', kind: 'visit', campus: 'khu-global', place: '중앙도서관', target: 1, reward: 30, name: '도서관 가기', desc: '경희대 국제캠 중앙도서관에 가 보세요' },
  { id: 'visit-khu-plaza', period: 'daily', type: 'explore', kind: 'visit', campus: 'khu-global', place: '사색의 광장', target: 1, reward: 30, name: '사색의 광장 가기', desc: '경희대 국제캠 사색의 광장에 가 보세요' },
  // ── 수집: picking up collectibles (each item exists once per player, so the board skips these when too few are left) ──
  { id: 'collect-1', period: 'daily', type: 'collect', kind: 'collect', target: 1, reward: 40, name: '보물 찾기', desc: '수집품 1개를 찾아 주우세요' },
  { id: 'collect-2', period: 'daily', type: 'collect', kind: 'collect', target: 2, reward: 70, name: '보물 사냥꾼', desc: '수집품 2개를 찾아 주우세요' },
  { id: 'collect-rare', period: 'daily', type: 'collect', kind: 'collect', minRarity: 'rare', target: 1, reward: 80, name: '귀한 발견', desc: '희귀 등급 이상 수집품 1개를 찾아 주우세요' },
  // ── 펫: petting the animals on the lawns (E), or walking with your own pets ──
  { id: 'pat-5', period: 'daily', type: 'pet', kind: 'pat', target: 5, reward: 30, name: '동물 친구', desc: '캠퍼스의 동물을 5번 쓰다듬어 주세요 (E)' },
  { id: 'pat-12', period: 'daily', type: 'pet', kind: 'pat', target: 12, reward: 50, name: '교감의 달인', desc: '캠퍼스의 동물을 12번 쓰다듬어 주세요 (E)' },
  { id: 'petwalk-400', period: 'daily', type: 'pet', kind: 'petWalk', target: 400, reward: 40, name: '펫과 산책', desc: '펫을 데리고 400m 걸어 보세요' },
  // ── 플레이: time in the game (tab visible) ──
  { id: 'play-10', period: 'daily', type: 'play', kind: 'play', target: 600, reward: 30, name: '잠깐 들르기', desc: '10분 동안 플레이하세요' },
  { id: 'play-25', period: 'daily', type: 'play', kind: 'play', target: 1500, reward: 60, name: '캠퍼스 단골', desc: '25분 동안 플레이하세요' },
];
