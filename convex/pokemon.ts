import { action, mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { api } from "./_generated/api";

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
  { name: "Bug Bite", type: "Bug", power: 60, accuracy: 100 },
  { name: "Steel Wing", type: "Steel", power: 70, accuracy: 90 },
  { name: "Dark Pulse", type: "Dark", power: 80, accuracy: 100 },
  { name: "Moonblast", type: "Fairy", power: 95, accuracy: 100 },
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

  // Generate moves (2-4 moves, at least one matching Pokemon's type)
  const numMoves = Math.floor(Math.random() * 3) + 2;
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
  // Generate anime-style Pokemon image using a placeholder service
  // In a real implementation, you would use DALL-E, Midjourney, or similar
  const prompt = `anime style pokemon character, ${pokemon.name}, ${pokemon.types.join(" and ")} type, ${pokemon.description}, cute, colorful, high quality anime art, pokemon style, clean background`;
  
  // For now, return a placeholder image that represents the Pokemon
  // This could be replaced with actual AI image generation
  const typeColors = {
    Fire: "ff6666", Water: "6666ff", Grass: "66ff66", Electric: "ffff66",
    Psychic: "ff66ff", Ice: "66ffff", Dragon: "9966ff", Fighting: "ff9966",
    Flying: "ccccff", Poison: "9966cc", Ground: "cc9966", Rock: "996633",
    Bug: "99cc66", Ghost: "9999cc", Steel: "cccccc", Dark: "666666",
    Fairy: "ffccff", Normal: "cccccc"
  };
  
  const primaryColor = typeColors[pokemon.types[0] as keyof typeof typeColors] || "cccccc";
  // Using a placeholder service that can generate colored images with text
  return `https://via.placeholder.com/200x200/${primaryColor}/000000?text=${encodeURIComponent(pokemon.name)}`;
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