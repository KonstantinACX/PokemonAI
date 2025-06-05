import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { api } from "./_generated/api";

// Join the battle queue
export const joinBattleQueue = mutation({
  args: {
    team: v.array(v.id("pokemon")),
    preferences: v.optional(v.object({
      levelRange: v.optional(v.object({
        min: v.number(),
        max: v.number(),
      })),
    })),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Must be authenticated to join battle queue");
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_tokenIdentifier", (q) => 
        q.eq("tokenIdentifier", identity.tokenIdentifier)
      )
      .unique();

    if (!user) {
      throw new Error("User not found");
    }

    // Check if user is already in queue
    const existingQueue = await ctx.db
      .query("battleQueue")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .filter((q) => q.eq(q.field("status"), "waiting"))
      .first();

    if (existingQueue) {
      throw new Error("Already in battle queue");
    }

    // Validate team size
    if (args.team.length !== 3) {
      throw new Error("Team must have exactly 3 Pokemon");
    }

    // Add to queue
    const queueEntry = await ctx.db.insert("battleQueue", {
      userId: user._id,
      team: args.team,
      status: "waiting",
      queuedAt: Date.now(),
      preferences: args.preferences,
    });

    // Try to find a match immediately
    await ctx.scheduler.runAfter(0, api.multiplayer.findMatches);

    return queueEntry;
  },
});

// Leave the battle queue
export const leaveBattleQueue = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Must be authenticated");
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_tokenIdentifier", (q) => 
        q.eq("tokenIdentifier", identity.tokenIdentifier)
      )
      .unique();

    if (!user) {
      throw new Error("User not found");
    }

    // Find and cancel queue entry
    const queueEntry = await ctx.db
      .query("battleQueue")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .filter((q) => q.eq(q.field("status"), "waiting"))
      .first();

    if (queueEntry) {
      await ctx.db.patch(queueEntry._id, { status: "cancelled" });
    }

    return { success: true };
  },
});

// Find matches for waiting players
export const findMatches = mutation({
  args: {},
  handler: async (ctx) => {
    console.log("Looking for battle matches...");
    
    // Get all waiting players
    const waitingPlayers = await ctx.db
      .query("battleQueue")
      .filter((q) => q.eq(q.field("status"), "waiting"))
      .collect();

    console.log(`Found ${waitingPlayers.length} players waiting for battles`);

    // Simple matchmaking: pair first two waiting players
    for (let i = 0; i < waitingPlayers.length - 1; i++) {
      const player1 = waitingPlayers[i];
      const player2 = waitingPlayers[i + 1];

      // TODO: Add more sophisticated matching logic (level ranges, etc.)
      
      console.log(`Matching players ${player1.userId} vs ${player2.userId}`);

      // Create the battle
      const battleId = await ctx.runMutation(api.battles.createMultiplayerBattle, {
        player1Id: player1.userId,
        player2Id: player2.userId,
        player1Team: player1.team,
        player2Team: player2.team,
        player1ActivePokemon: player1.team[0],
        player2ActivePokemon: player2.team[0],
      });

      // Mark players as matched
      await ctx.db.patch(player1._id, { status: "matched" });
      await ctx.db.patch(player2._id, { status: "matched" });

      console.log(`Created battle ${battleId} for players`);
    }
  },
});

// Get current queue status for a user
export const getQueueStatus = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return null;
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_tokenIdentifier", (q) => 
        q.eq("tokenIdentifier", identity.tokenIdentifier)
      )
      .unique();

    if (!user) {
      return null;
    }

    const queueEntry = await ctx.db
      .query("battleQueue")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .filter((q) => q.eq(q.field("status"), "waiting"))
      .first();

    if (!queueEntry) {
      return null;
    }

    // Get queue position
    const queuePosition = await ctx.db
      .query("battleQueue")
      .filter((q) => 
        q.and(
          q.eq(q.field("status"), "waiting"),
          q.lt(q.field("queuedAt"), queueEntry.queuedAt)
        )
      )
      .collect();

    return {
      ...queueEntry,
      position: queuePosition.length + 1,
      waitTime: Date.now() - queueEntry.queuedAt,
    };
  },
});

// Get current battle for a user
export const getCurrentBattle = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return null;
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_tokenIdentifier", (q) => 
        q.eq("tokenIdentifier", identity.tokenIdentifier)
      )
      .unique();

    if (!user) {
      return null;
    }

    // Find active battle for this user
    const battle = await ctx.db
      .query("battles")
      .filter((q) => 
        q.and(
          q.eq(q.field("battleType"), "multiplayer"),
          q.or(
            q.eq(q.field("player1Id"), user._id),
            q.eq(q.field("player2Id"), user._id)
          ),
          q.or(
            q.eq(q.field("status"), "active"),
            q.eq(q.field("status"), "player1_selecting"),
            q.eq(q.field("status"), "player2_selecting")
          )
        )
      )
      .first();

    return battle;
  },
});