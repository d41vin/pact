import { ConvexError, v } from "convex/values";
import { internal } from "./_generated/api";
import { action, internalMutation, mutation, query } from "./_generated/server";

// Query to get a user by their unique address
export const getUser = query({
  args: { userAddress: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_userAddress", (q) => q.eq("userAddress", args.userAddress))
      .unique();
    return user;
  },
});

// Query to check if a username is already taken
export const checkUsername = query({
  args: { username: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_username", (q) => q.eq("username", args.username))
      .unique();
    // Return true if username exists, false otherwise
    return user !== null;
  },
});

// Query to get a user by their username
export const getUserByUsername = query({
  args: { username: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_username", (q) => q.eq("username", args.username))
      .unique();
    return user;
  },
});

// Mutation to create a new user in the database
export const createUser = mutation({
  args: {
    name: v.string(),
    username: v.string(),
    userAddress: v.string(),
    email: v.optional(v.string()),
    // The storage ID of the uploaded profile image is passed from the client
    profileImageId: v.optional(v.id("_storage")),
  },
  handler: async (ctx, args) => {
    // Check if the address is already associated with a user
    const existingUserByAddress = await ctx.db
      .query("users")
      .withIndex("by_userAddress", (q) => q.eq("userAddress", args.userAddress))
      .unique();

    if (existingUserByAddress) {
      throw new ConvexError("User with this address already exists.");
    }

    // Check if the username is already taken
    const existingUserByUsername = await ctx.db
      .query("users")
      .withIndex("by_username", (q) => q.eq("username", args.username))
      .unique();

    if (existingUserByUsername) {
      throw new ConvexError("Username is already taken.");
    }

    let profileImageUrl: string | undefined = undefined;
    if (args.profileImageId) {
      // If a profile image was uploaded, get its public URL
      const url = await ctx.storage.getUrl(args.profileImageId);
      if (!url) {
        throw new ConvexError("Could not get profile image URL.");
      }
      profileImageUrl = url;
    }

    // Insert the new user into the database
    await ctx.db.insert("users", {
      name: args.name,
      username: args.username,
      userAddress: args.userAddress,
      email: args.email,
      profileImageUrl: profileImageUrl,
    });
  },
});
