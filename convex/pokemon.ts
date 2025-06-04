import { action, mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { api } from "./_generated/api";

const pokemonTypes = ["Fire", "Water", "Grass", "Electric", "Psychic", "Ice", "Dragon", "Fighting", "Flying", "Poison", "Ground", "Rock", "Bug", "Ghost", "Steel", "Dark", "Fairy", "Normal"];

const movePool: Array<{
  name: string;
  type: string;
  power: number;
  accuracy: number;
  effect?: {
    type: "stat_boost" | "stat_reduction";
    target: "self" | "opponent";
    stat: "attack" | "defense" | "speed";
    stages: number;
  };
}> = [
  // Fire moves (3)
  { name: "Flame Burst", type: "Fire", power: 70, accuracy: 100 },
  { name: "Flamethrower", type: "Fire", power: 90, accuracy: 100 },
  { name: "Fire Blast", type: "Fire", power: 110, accuracy: 85 },
  
  // Water moves (3)
  { name: "Hydro Pump", type: "Water", power: 110, accuracy: 80 },
  { name: "Surf", type: "Water", power: 90, accuracy: 100 },
  { name: "Bubble Beam", type: "Water", power: 65, accuracy: 100 },
  
  // Grass moves (3)
  { name: "Vine Whip", type: "Grass", power: 45, accuracy: 100 },
  { name: "Solar Beam", type: "Grass", power: 120, accuracy: 100 },
  { name: "Leaf Blade", type: "Grass", power: 90, accuracy: 100 },
  
  // Electric moves (3)
  { name: "Thunder", type: "Electric", power: 110, accuracy: 70 },
  { name: "Thunderbolt", type: "Electric", power: 90, accuracy: 100 },
  { name: "Thunder Shock", type: "Electric", power: 40, accuracy: 100 },
  
  // Psychic moves (3)
  { name: "Psychic", type: "Psychic", power: 90, accuracy: 100 },
  { name: "Psybeam", type: "Psychic", power: 65, accuracy: 100 },
  { name: "Future Sight", type: "Psychic", power: 100, accuracy: 100 },
  
  // Ice moves (3)
  { name: "Ice Beam", type: "Ice", power: 90, accuracy: 100 },
  { name: "Blizzard", type: "Ice", power: 110, accuracy: 70 },
  { name: "Ice Shard", type: "Ice", power: 40, accuracy: 100 },
  
  // Dragon moves (3)
  { name: "Dragon Pulse", type: "Dragon", power: 85, accuracy: 100 },
  { name: "Dragon Claw", type: "Dragon", power: 80, accuracy: 100 },
  { name: "Outrage", type: "Dragon", power: 120, accuracy: 100 },
  
  // Fighting moves (3)
  { name: "Close Combat", type: "Fighting", power: 120, accuracy: 100 },
  { name: "Brick Break", type: "Fighting", power: 75, accuracy: 100 },
  { name: "Mach Punch", type: "Fighting", power: 40, accuracy: 100 },
  
  // Flying moves (3)
  { name: "Air Slash", type: "Flying", power: 75, accuracy: 95 },
  { name: "Hurricane", type: "Flying", power: 110, accuracy: 70 },
  { name: "Wing Attack", type: "Flying", power: 60, accuracy: 100 },
  
  // Poison moves (3)
  { name: "Sludge Bomb", type: "Poison", power: 90, accuracy: 100 },
  { name: "Poison Jab", type: "Poison", power: 80, accuracy: 100 },
  { name: "Toxic Spikes", type: "Poison", power: 45, accuracy: 100 },
  
  // Ground moves (3)
  { name: "Earthquake", type: "Ground", power: 100, accuracy: 100 },
  { name: "Earth Power", type: "Ground", power: 90, accuracy: 100 },
  { name: "Mud Shot", type: "Ground", power: 55, accuracy: 95 },
  
  // Rock moves (3)
  { name: "Rock Slide", type: "Rock", power: 75, accuracy: 90 },
  { name: "Stone Edge", type: "Rock", power: 100, accuracy: 80 },
  { name: "Rock Throw", type: "Rock", power: 50, accuracy: 90 },
  
  // Bug moves (3)
  { name: "Bug Bite", type: "Bug", power: 60, accuracy: 100 },
  { name: "X-Scissor", type: "Bug", power: 80, accuracy: 100 },
  { name: "Signal Beam", type: "Bug", power: 75, accuracy: 100 },
  
  // Ghost moves (3)
  { name: "Shadow Ball", type: "Ghost", power: 80, accuracy: 100 },
  { name: "Night Shade", type: "Ghost", power: 60, accuracy: 100 },
  { name: "Shadow Claw", type: "Ghost", power: 70, accuracy: 100 },
  
  // Steel moves (3)
  { name: "Steel Wing", type: "Steel", power: 70, accuracy: 90 },
  { name: "Iron Head", type: "Steel", power: 80, accuracy: 100 },
  { name: "Metal Claw", type: "Steel", power: 50, accuracy: 95 },
  
  // Dark moves (3)
  { name: "Dark Pulse", type: "Dark", power: 80, accuracy: 100 },
  { name: "Crunch", type: "Dark", power: 80, accuracy: 100 },
  { name: "Bite", type: "Dark", power: 60, accuracy: 100 },
  
  // Fairy moves (3)
  { name: "Moonblast", type: "Fairy", power: 95, accuracy: 100 },
  { name: "Dazzling Gleam", type: "Fairy", power: 80, accuracy: 100 },
  { name: "Fairy Wind", type: "Fairy", power: 40, accuracy: 100 },
  
  // Normal moves (3)
  { name: "Quick Attack", type: "Normal", power: 40, accuracy: 100 },
  { name: "Body Slam", type: "Normal", power: 85, accuracy: 100 },
  { name: "Hyper Beam", type: "Normal", power: 150, accuracy: 90 },
  
  // Stat-modifying moves
  { name: "Swords Dance", type: "Normal", power: 0, accuracy: 100, 
    effect: { type: "stat_boost", target: "self", stat: "attack", stages: 2 } },
  { name: "Iron Defense", type: "Steel", power: 0, accuracy: 100,
    effect: { type: "stat_boost", target: "self", stat: "defense", stages: 2 } },
  { name: "Agility", type: "Psychic", power: 0, accuracy: 100,
    effect: { type: "stat_boost", target: "self", stat: "speed", stages: 2 } },
  { name: "Growl", type: "Normal", power: 0, accuracy: 100,
    effect: { type: "stat_reduction", target: "opponent", stat: "attack", stages: -1 } },
  { name: "Leer", type: "Normal", power: 0, accuracy: 100,
    effect: { type: "stat_reduction", target: "opponent", stat: "defense", stages: -1 } },
  { name: "String Shot", type: "Bug", power: 0, accuracy: 95,
    effect: { type: "stat_reduction", target: "opponent", stat: "speed", stages: -1 } },
  { name: "Work Up", type: "Normal", power: 0, accuracy: 100,
    effect: { type: "stat_boost", target: "self", stat: "attack", stages: 1 } },
  { name: "Harden", type: "Normal", power: 0, accuracy: 100,
    effect: { type: "stat_boost", target: "self", stat: "defense", stages: 1 } },
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

  // Generate exactly 4 moves, at least one matching Pokemon's type
  const numMoves = 4;
  const typeMoves = movePool.filter(m => types.includes(m.type));
  const otherMoves = movePool.filter(m => !types.includes(m.type));
  
  const moves = [];
  
  // GUARANTEE at least one move matches the Pokemon's type(s)
  if (typeMoves.length > 0) {
    moves.push(typeMoves[Math.floor(Math.random() * typeMoves.length)]);
  } else {
    // Fallback: if no moves match the type, add a Normal move
    const normalMoves = movePool.filter(m => m.type === "Normal");
    if (normalMoves.length > 0) {
      moves.push(normalMoves[Math.floor(Math.random() * normalMoves.length)]);
    }
  }
  
  // Fill remaining slots with other moves
  while (moves.length < numMoves) {
    const availableMoves = [...typeMoves, ...otherMoves];
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

async function generatePokemonImage(pokemon: { name: string; types: string[]; description: string }): Promise<string> {
  // Generate anime-style Pokemon image using Pollinations AI (free service)
  const prompt = `anime style pokemon creature, ${pokemon.name}, ${pokemon.types.join(" and ")} type pokemon, cute monster, colorful, high quality anime art, pokemon trading card art style, clean white background, digital art, kawaii, vibrant colors`;
  
  // Encode the prompt for URL
  const encodedPrompt = encodeURIComponent(prompt);
  
  // Use Pollinations API for free AI image generation
  const imageUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=400&height=400&seed=${Math.floor(Math.random() * 10000)}`;
  
  // Return the image URL directly - let the frontend handle loading
  return imageUrl;
}

export const generatePokemonWithImage = action({
  args: {},
  handler: async (ctx): Promise<string> => {
    const pokemon = generateRandomPokemon();
    
    try {
      // Generate image for the Pokemon
      const imageUrl = await generatePokemonImage(pokemon);
      
      // Create Pokemon with image
      const pokemonWithImage = {
        ...pokemon,
        imageUrl
      };
      
      return await ctx.runMutation(api.pokemon.createPokemon, pokemonWithImage);
    } catch (error) {
      // If image generation fails, create Pokemon without image
      return await ctx.runMutation(api.pokemon.createPokemon, pokemon);
    }
  },
});

export const createPokemon = mutation({
  args: {
    name: v.string(),
    types: v.array(v.string()),
    hp: v.number(),
    attack: v.number(),
    defense: v.number(),
    speed: v.number(),
    moves: v.array(v.object({
      name: v.string(),
      type: v.string(),
      power: v.number(),
      accuracy: v.number(),
      effect: v.optional(v.object({
        type: v.union(
          v.literal("stat_boost"),
          v.literal("stat_reduction")
        ),
        target: v.union(
          v.literal("self"),
          v.literal("opponent")
        ),
        stat: v.union(
          v.literal("attack"),
          v.literal("defense"), 
          v.literal("speed")
        ),
        stages: v.number(),
      })),
    })),
    description: v.string(),
    imageUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("pokemon", args);
  },
});

export const generateTeam = action({
  args: {},
  handler: async (ctx): Promise<string[]> => {
    const team: string[] = [];
    for (let i = 0; i < 3; i++) {
      const pokemonId: string = await ctx.runAction(api.pokemon.generatePokemonWithImage, {});
      team.push(pokemonId);
    }
    return team;
  },
});