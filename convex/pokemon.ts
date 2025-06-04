import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

const pokemonTypes = ["Fire", "Water", "Grass", "Electric", "Psychic", "Ice", "Dragon", "Fighting", "Flying", "Poison", "Ground", "Rock", "Bug", "Ghost", "Steel", "Dark", "Fairy", "Normal"];

const movePool = [
  { name: "Flame Burst", type: "Fire", power: 70, accuracy: 100 },
  { name: "Hydro Pump", type: "Water", power: 110, accuracy: 80 },
  { name: "Vine Whip", type: "Grass", power: 45, accuracy: 100 },
  { name: "Thunder", type: "Electric", power: 110, accuracy: 70 },
  { name: "Psychic", type: "Psychic", power: 90, accuracy: 100 },
  { name: "Ice Beam", type: "Ice", power: 90, accuracy: 100 },
  { name: "Dragon Pulse", type: "Dragon", power: 85, accuracy: 100 },
  { name: "Close Combat", type: "Fighting", power: 120, accuracy: 100 },
  { name: "Air Slash", type: "Flying", power: 75, accuracy: 95 },
  { name: "Sludge Bomb", type: "Poison", power: 90, accuracy: 100 },
  { name: "Earthquake", type: "Ground", power: 100, accuracy: 100 },
  { name: "Rock Slide", type: "Rock", power: 75, accuracy: 90 },
  { name: "Quick Attack", type: "Normal", power: 40, accuracy: 100 },
  { name: "Shadow Ball", type: "Ghost", power: 80, accuracy: 100 },
];

const nameRoots = [
  "Blaze", "Aqua", "Flora", "Volt", "Psy", "Frost", "Draco", "Punch", "Wind", 
  "Venom", "Earth", "Stone", "Speed", "Phantom", "Steel", "Shadow", "Sparkle", "Thunder",
  "Crystal", "Inferno", "Tidal", "Jungle", "Storm", "Mystic", "Glacier", "Cosmos",
  "Crimson", "Azure", "Emerald", "Golden", "Silver", "Obsidian", "Prismatic", "Nebula"
];

const nameSuffixes = [
  "rix", "saur", "axis", "wave", "bite", "nus", "claw", "storm", "fang", "guard",
  "bug", "mis", "crest", "maw", "wings", "ton", "fury", "blade", "heart", "soul",
  "fire", "flow", "wing", "tail", "horn", "eye", "claw", "fist", "strike", "roar",
  "whisper", "echo", "spark", "flame", "frost", "glow", "shine", "burst", "dash"
];

function generateRandomPokemon() {
  // Generate unique name by combining root + suffix
  const root = nameRoots[Math.floor(Math.random() * nameRoots.length)];
  const suffix = nameSuffixes[Math.floor(Math.random() * nameSuffixes.length)];
  const name = root + suffix;
  
  const primaryType = pokemonTypes[Math.floor(Math.random() * pokemonTypes.length)];
  const hasSecondaryType = Math.random() > 0.7;
  const types = hasSecondaryType 
    ? [primaryType, pokemonTypes.filter(t => t !== primaryType)[Math.floor(Math.random() * (pokemonTypes.length - 1))]]
    : [primaryType];

  // Generate moves (2-4 moves, at least one of primary type)
  const numMoves = Math.floor(Math.random() * 3) + 2;
  const typeMoves = movePool.filter(m => types.includes(m.type));
  const otherMoves = movePool.filter(m => !types.includes(m.type));
  
  const moves = [];
  if (typeMoves.length > 0) {
    moves.push(typeMoves[Math.floor(Math.random() * typeMoves.length)]);
  }
  
  while (moves.length < numMoves) {
    const availableMoves: typeof movePool = moves.length === 1 ? [...typeMoves, ...otherMoves] : otherMoves;
    const move = availableMoves[Math.floor(Math.random() * availableMoves.length)];
    if (!moves.find(m => m.name === move.name)) {
      moves.push(move);
    }
  }

  return {
    name,
    types,
    hp: Math.floor(Math.random() * 50) + 80, // 80-130 HP
    attack: Math.floor(Math.random() * 40) + 60, // 60-100 Attack
    defense: Math.floor(Math.random() * 40) + 50, // 50-90 Defense  
    speed: Math.floor(Math.random() * 60) + 40, // 40-100 Speed
    moves,
    description: `A mysterious ${types.join("/")} type Pokemon with incredible power.`,
  };
}

export const generatePokemon = mutation({
  args: {},
  handler: async (ctx) => {
    const pokemon = generateRandomPokemon();
    return await ctx.db.insert("pokemon", pokemon);
  },
});

export const getPokemon = query({
  args: { id: v.id("pokemon") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

export const generateTeam = mutation({
  args: {},
  handler: async (ctx) => {
    const team = [];
    for (let i = 0; i < 3; i++) {
      const pokemon = generateRandomPokemon();
      const id = await ctx.db.insert("pokemon", pokemon);
      team.push(id);
    }
    return team;
  },
});