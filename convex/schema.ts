import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    clerkId: v.string(),
    name: v.string(),
    displayName: v.optional(v.string()), // Custom display name for multiplayer battles
  }).index("by_clerkId", ["clerkId"]),

  collections: defineTable({
    userId: v.id("users"),
    caughtPokemon: v.array(v.id("pokemon")),
  }).index("by_userId", ["userId"]),

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
          v.literal("stat_reduction"),
          v.literal("status_effect")
        ),
        target: v.union(
          v.literal("self"),
          v.literal("opponent")
        ),
        stat: v.optional(v.union(
          v.literal("attack"),
          v.literal("defense"), 
          v.literal("speed")
        )),
        stages: v.optional(v.number()), // -6 to +6
        statusEffect: v.optional(v.union(
          v.literal("poison"),
          v.literal("burn"),
          v.literal("paralyze"),
          v.literal("freeze"),
          v.literal("sleep")
        )),
        chance: v.optional(v.number()), // Chance to inflict status (0-100)
      })),
    })),
    description: v.string(),
    imageUrl: v.optional(v.string()), // URL to generated Pokemon image
    level: v.optional(v.number()), // Pokemon level (1-100)
    xp: v.optional(v.number()), // Current experience points
  }),

  battles: defineTable({
    // Player information
    player1Id: v.optional(v.id("users")), // null for AI battles
    player2Id: v.optional(v.id("users")), // null for AI battles
    battleType: v.optional(v.union(v.literal("ai"), v.literal("multiplayer"))), // Optional for backward compatibility with existing battles
    
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
    // Status effects for active Pokemon
    player1StatusEffect: v.optional(v.union(
      v.literal("poison"),
      v.literal("burn"),
      v.literal("paralyze"),
      v.literal("freeze"),
      v.literal("sleep")
    )),
    player2StatusEffect: v.optional(v.union(
      v.literal("poison"),
      v.literal("burn"),
      v.literal("paralyze"),
      v.literal("freeze"),
      v.literal("sleep")
    )),
    player1StatusTurns: v.optional(v.number()), // Turns remaining for status
    player2StatusTurns: v.optional(v.number()),
    status: v.union(
      v.literal("active"), 
      v.literal("player1_selecting"), 
      v.literal("player2_selecting"),
      v.literal("player1_wins"), 
      v.literal("player2_wins")
    ),
    battleLog: v.array(v.string()),
    // Level-up results from this battle
    levelUpResults: v.optional(v.array(v.object({
      pokemonId: v.id("pokemon"),
      pokemonName: v.string(),
      oldLevel: v.number(),
      newLevel: v.number(),
      xpGained: v.number(),
    }))),
    // Multiplayer-specific fields
    lastActivity: v.optional(v.number()), // Timestamp for handling timeouts
  }),

  // Battle matchmaking queue
  battleQueue: defineTable({
    userId: v.id("users"),
    team: v.array(v.id("pokemon")), // Player's selected team
    status: v.union(
      v.literal("waiting"), 
      v.literal("matched"), 
      v.literal("cancelled")
    ),
    queuedAt: v.number(), // Timestamp when queued
    preferences: v.optional(v.object({
      levelRange: v.optional(v.object({
        min: v.number(),
        max: v.number(),
      })),
    })),
  }).index("by_user", ["userId"]),

  // Battle records for tracking player performance against AI
  battleRecords: defineTable({
    userId: v.id("users"),
    battleType: v.literal("ai"), // Only track AI battles for now
    result: v.union(v.literal("win"), v.literal("loss")),
    battleId: v.id("battles"), // Reference to the actual battle
    completedAt: v.number(), // Timestamp when battle completed
  })
    .index("by_user", ["userId"])
    .index("by_user_and_date", ["userId", "completedAt"]),
});
