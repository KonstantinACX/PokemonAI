// Convert numeric Pokemon stats to descriptive adjectives
export function getStatAdjective(statValue: number, statType: 'hp' | 'attack' | 'defense' | 'speed'): string {
  // Define ranges based on the Pokemon generation ranges (40-130)
  const ranges = {
    hp: {
      veryLow: [0, 89],
      low: [90, 99],
      average: [100, 109],
      high: [110, 119],
      veryHigh: [120, 150]
    },
    attack: {
      veryLow: [0, 69],
      low: [70, 79],
      average: [80, 89],
      high: [90, 99],
      veryHigh: [100, 150]
    },
    defense: {
      veryLow: [0, 59],
      low: [60, 69],
      average: [70, 79],
      high: [80, 89],
      veryHigh: [90, 150]
    },
    speed: {
      veryLow: [0, 59],
      low: [60, 69],
      average: [70, 79],
      high: [80, 89],
      veryHigh: [90, 150]
    }
  };

  const adjectives = {
    hp: {
      veryLow: "Frail",
      low: "Weak",
      average: "Sturdy",
      high: "Hardy",
      veryHigh: "Mighty"
    },
    attack: {
      veryLow: "Gentle",
      low: "Modest",
      average: "Strong",
      high: "Fierce",
      veryHigh: "Devastating"
    },
    defense: {
      veryLow: "Fragile",
      low: "Soft",
      average: "Solid",
      high: "Tough",
      veryHigh: "Impenetrable"
    },
    speed: {
      veryLow: "Sluggish",
      low: "Slow",
      average: "Quick",
      high: "Swift",
      veryHigh: "Lightning"
    }
  };

  const statRanges = ranges[statType];
  const statAdjectives = adjectives[statType];

  for (const [level, range] of Object.entries(statRanges)) {
    if (statValue >= range[0] && statValue <= range[1]) {
      return statAdjectives[level as keyof typeof statAdjectives];
    }
  }

  return statAdjectives.average; // fallback
}

// Get a color class for the stat level
export function getStatColor(statValue: number, statType: 'hp' | 'attack' | 'defense' | 'speed'): string {
  const ranges = {
    hp: [89, 99, 109, 119],
    attack: [69, 79, 89, 99],
    defense: [59, 69, 79, 89],
    speed: [59, 69, 79, 89]
  };

  const colors = ['text-red-400', 'text-orange-400', 'text-yellow-400', 'text-green-400', 'text-blue-400'];
  const thresholds = ranges[statType];
  
  for (let i = 0; i < thresholds.length; i++) {
    if (statValue <= thresholds[i]) {
      return colors[i];
    }
  }
  
  return colors[4]; // highest tier
}