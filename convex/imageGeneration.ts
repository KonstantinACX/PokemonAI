"use node";

import { action } from "./_generated/server";
import { v } from "convex/values";
import { api } from "./_generated/api";

export async function generatePokemonImage(pokemon: { name: string; types: string[]; description: string }): Promise<string | null> {
  const prompt = `anime style pokemon creature, ${pokemon.name}, ${pokemon.types.join(" and ")} type pokemon, cute monster, colorful, high quality anime art, pokemon trading card art style, clean white background, digital art, kawaii, vibrant colors`;
  const encodedPrompt = encodeURIComponent(prompt);
  
  // Try multiple image generation services with retry logic
  const imageServices = [
    {
      name: "Pollinations",
      url: `https://image.pollinations.ai/prompt/${encodedPrompt}?width=400&height=400&seed=${Math.floor(Math.random() * 10000)}`,
    },
    {
      name: "Pollinations Alt",
      url: `https://image.pollinations.ai/prompt/${encodedPrompt}?width=512&height=512&model=flux&seed=${Math.floor(Math.random() * 10000)}`,
    },
  ];
  
  for (const service of imageServices) {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        console.log(`Attempting image generation with ${service.name}, attempt ${attempt + 1}`);
        
        // Test if the URL responds within a reasonable time
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
        
        const response = await fetch(service.url, {
          method: 'HEAD',
          signal: controller.signal,
        });
        
        clearTimeout(timeoutId);
        
        if (response.ok) {
          console.log(`Image generation successful with ${service.name}`);
          return service.url;
        } else {
          console.log(`Image generation failed with ${service.name}: ${response.status}`);
        }
      } catch (error) {
        console.log(`Image generation error with ${service.name}, attempt ${attempt + 1}:`, error);
        
        // Wait before retry
        if (attempt < 1) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
    }
  }
  
  console.log("All image generation attempts failed");
  return null;
}

export const generatePokemonWithImageAction = action({
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
  },
  handler: async (ctx, pokemon): Promise<string> => {
    try {
      // Generate image for the Pokemon
      const imageUrl = await generatePokemonImage(pokemon);
      
      // Create Pokemon with or without image based on generation success
      const pokemonData = imageUrl 
        ? { ...pokemon, imageUrl }
        : pokemon;
      
      console.log(`Creating Pokemon ${pokemon.name} with ${imageUrl ? 'image' : 'no image'}`);
      return await ctx.runMutation(api.pokemon.createPokemon, pokemonData);
    } catch (error) {
      console.error("Error in generatePokemonWithImageAction:", error);
      // Fallback: create Pokemon without image
      return await ctx.runMutation(api.pokemon.createPokemon, pokemon);
    }
  },
});

export const retryImageGeneration = action({
  args: { pokemonId: v.id("pokemon") },
  handler: async (ctx, args): Promise<boolean> => {
    const pokemon = await ctx.runQuery(api.pokemon.getPokemon, { id: args.pokemonId });
    if (!pokemon) {
      console.error("Pokemon not found for image retry");
      return false;
    }
    
    try {
      const imageUrl = await generatePokemonImage(pokemon);
      
      if (imageUrl) {
        await ctx.runMutation(api.pokemon.updatePokemonImage, {
          pokemonId: args.pokemonId,
          imageUrl
        });
        console.log(`Successfully generated image for ${pokemon.name}`);
        return true;
      } else {
        console.log(`Failed to generate image for ${pokemon.name}`);
        return false;
      }
    } catch (error) {
      console.error(`Error retrying image generation for ${pokemon.name}:`, error);
      return false;
    }
  },
});