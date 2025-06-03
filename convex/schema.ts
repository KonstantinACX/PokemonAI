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
    })),
    description: v.string(),
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
