import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const ensureUser = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    // Check if user already exists
    const existingUser = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
      .unique();

    if (existingUser) {
      // Update name if it has changed in Clerk
      const clerkName = identity.name ?? "Anonymous";
      if (existingUser.name !== clerkName) {
        await ctx.db.patch(existingUser._id, { name: clerkName });
        return await ctx.db.get(existingUser._id);
      }
      return existingUser;
    }

    // Create new user
    const userId = await ctx.db.insert("users", {
      clerkId: identity.subject,
      name: identity.name ?? "Anonymous",
    });

    return await ctx.db.get(userId);
  },
});

export const listUsers = query({
  args: {},
  handler: async (ctx) => {
    const users = await ctx.db.query("users").collect();
    return users;
  },
});

export const getUserCollection = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return null;
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
      .unique();

    if (!user) {
      return null;
    }

    const collection = await ctx.db
      .query("collections")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .unique();

    return collection?.caughtPokemon || [];
  },
});

export const addToCollection = mutation({
  args: { pokemonId: v.id("pokemon") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
      .unique();

    if (!user) {
      throw new Error("User not found");
    }

    const existingCollection = await ctx.db
      .query("collections")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .unique();

    if (existingCollection) {
      // Add to existing collection
      const updatedPokemon = [...existingCollection.caughtPokemon, args.pokemonId];
      await ctx.db.patch(existingCollection._id, { caughtPokemon: updatedPokemon });
    } else {
      // Create new collection
      await ctx.db.insert("collections", {
        userId: user._id,
        caughtPokemon: [args.pokemonId],
      });
    }

    return args.pokemonId;
  },
});

export const removeFromCollection = mutation({
  args: { pokemonId: v.id("pokemon") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
      .unique();

    if (!user) {
      throw new Error("User not found");
    }

    const collection = await ctx.db
      .query("collections")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .unique();

    if (collection) {
      const updatedPokemon = collection.caughtPokemon.filter(id => id !== args.pokemonId);
      await ctx.db.patch(collection._id, { caughtPokemon: updatedPokemon });
    }

    return args.pokemonId;
  },
});
