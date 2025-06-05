// XP and leveling system utilities

// XP required to reach each level (0-indexed, so level 6 requires xpTable[5] total XP)
export const XP_TABLE = [
  0,     // Level 1 (starting level, 0 XP)
  100,   // Level 2
  250,   // Level 3
  450,   // Level 4
  700,   // Level 5
  1000,  // Level 6
  1350,  // Level 7
  1750,  // Level 8
  2200,  // Level 9
  2700,  // Level 10
  3250,  // Level 11
  3850,  // Level 12
  4500,  // Level 13
  5200,  // Level 14
  5950,  // Level 15
  6750,  // Level 16
  7600,  // Level 17
  8500,  // Level 18
  9450,  // Level 19
  10450, // Level 20
];

export const MAX_LEVEL = 20;

// Calculate what level a Pokemon should be based on current XP
export function calculateLevel(currentXp: number): number {
  for (let level = XP_TABLE.length; level >= 1; level--) {
    if (currentXp >= XP_TABLE[level - 1]) {
      return Math.min(level, MAX_LEVEL);
    }
  }
  return 1; // Minimum level
}

// Calculate XP needed for next level
export function xpToNextLevel(currentXp: number, currentLevel: number): number {
  if (currentLevel >= MAX_LEVEL) return 0;
  const nextLevelXp = XP_TABLE[currentLevel]; // currentLevel is 1-indexed, XP_TABLE is 0-indexed
  return Math.max(0, nextLevelXp - currentXp);
}

// Calculate stat increase when leveling up
export function calculateStatIncrease(baseStat: number, oldLevel: number, newLevel: number): number {
  // Each level increases stats by 5-10% of base stat (minimum 1 point per level)
  const levelsGained = newLevel - oldLevel;
  const increasePerLevel = Math.max(1, Math.floor(baseStat * 0.07)); // 7% per level, minimum 1
  return increasePerLevel * levelsGained;
}

// Battle XP rewards
export const BATTLE_XP = {
  PARTICIPATION: 50,    // XP for participating in battle
  VICTORY: 100,        // Additional XP for winning team
  KNOCKOUT: 75,        // Additional XP for knocking out opponent Pokemon
  SURVIVAL: 25,        // Additional XP for surviving the battle
} as const;