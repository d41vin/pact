import { ConvexError, v } from "convex/values";
import { internal } from "./_generated/api";
import {
  action,
  internalMutation,
  mutation,
  query,
  QueryCtx,
  MutationCtx,
} from "./_generated/server";

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

// Helper function to verify and get user by wallet address
async function verifyUser(ctx: QueryCtx | MutationCtx, userAddress: string) {
  const user = await ctx.db
    .query("users")
    .withIndex("by_userAddress", (q) => q.eq("userAddress", userAddress))
    .unique();

  if (!user) {
    throw new ConvexError("User not found or not authenticated");
  }

  return user;
}

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

// Mutation to update user profile - SECURE
export const updateProfile = mutation({
  args: {
    userAddress: v.string(), // Caller's wallet address
    name: v.string(),
    username: v.string(),
    profileImageId: v.optional(v.id("_storage")),
  },
  handler: async (ctx, args) => {
    // Verify the caller's identity
    const user = await verifyUser(ctx, args.userAddress);

    // Check if username is taken by another user
    if (args.username) {
      const existingUser = await ctx.db
        .query("users")
        .withIndex("by_username", (q) => q.eq("username", args.username))
        .unique();

      if (existingUser && existingUser._id !== user._id) {
        throw new ConvexError("Username is already taken.");
      }
    }

    let profileImageUrl: string | undefined = undefined;
    if (args.profileImageId) {
      const url = await ctx.storage.getUrl(args.profileImageId);
      if (!url) {
        throw new ConvexError("Could not get profile image URL.");
      }
      profileImageUrl = url;
    }

    // Update the user (can only update their own profile)
    await ctx.db.patch(user._id, {
      name: args.name,
      username: args.username.toLowerCase(),
      ...(profileImageUrl && { profileImageUrl }),
    });

    return true;
  },
});
