import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    clerkId: v.string(),
    name: v.string(),
  }).index("by_clerkId", ["clerkId"]),

  pokemon: defineTable({
    name: v.string(),
    types: v.array(v.string()), // e.g., ["Fire", "Flying"]
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
        stages: v.number(), // -6 to +6
      })),
    })),
    description: v.string(),
    imageUrl: v.optional(v.string()), // URL to generated Pokemon image
  }),

  battles: defineTable({
    player1Team: v.array(v.id("pokemon")),
    player2Team: v.array(v.id("pokemon")),
    player1ActivePokemon: v.id("pokemon"),
    player2ActivePokemon: v.id("pokemon"),
    currentTurn: v.union(v.literal("player1"), v.literal("player2")),
    player1ActiveHp: v.number(),
    player2ActiveHp: v.number(),
    player1FaintedPokemon: v.array(v.id("pokemon")),
    player2FaintedPokemon: v.array(v.id("pokemon")),
    // Stat modifications (stages from -6 to +6)
    player1StatMods: v.optional(v.object({
      attack: v.number(),
      defense: v.number(),
      speed: v.number(),
    })),
    player2StatMods: v.optional(v.object({
      attack: v.number(),
      defense: v.number(),
      speed: v.number(),
    })),
    status: v.union(
      v.literal("active"), 
      v.literal("player1_selecting"), 
      v.literal("player2_selecting"),
      v.literal("player1_wins"), 
      v.literal("player2_wins")
    ),
    battleLog: v.array(v.string()),
  }),
});
