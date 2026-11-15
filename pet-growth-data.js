// Pet growth — balance only (the system lives in pet-growth.js). Change numbers here; nothing else needs to move.
//
// Only the pets walking with you (the ones set to "데리고 다니기") earn XP, and each of them gets the full amount.

export const GROWTH = {
  maxLevel: 30,
  // XP needed to go from level L to L+1 → see xpToNext() below
  curve: { base: 60, exp: 1.5 },
  // where XP comes from
  xp: {
    playPer10s: 1, // being in the game with the pet — only while you're active (see afkSec)
    per10m: 1, // walking/running on foot (the pedometer; teleports don't count)
    newPlace: 15, // standing in a named place for the first time today (each place once a day)
    collect: { common: 40, rare: 80, epic: 150, legendary: 300 }, // picking up a collectible (each item only ever once)
    questDone: 50, // a daily quest reaching its goal (each quest once)
  },
  afkSec: 60, // no movement and no input for this long → time XP stops
  hourCap: 1500, // most XP from play time + walking per hour (anti-bot); places, collectibles and quests are not capped
  testMult: 1, // ← testing: set e.g. 20 to level up fast. Keep 1 for release.
};

// XP to go from `level` to `level + 1` (60, 170, 312, 480, … ≈ 9 400 at 29 → 30; ≈ 115 000 in total to reach 30)
export function xpToNext(level) {
  if (level >= GROWTH.maxLevel) return Infinity;
  return Math.round(GROWTH.curve.base * Math.pow(level, GROWTH.curve.exp));
}
