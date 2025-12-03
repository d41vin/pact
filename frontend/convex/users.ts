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
      .withIndex("by_userAddress", (q) => q.eq("userAddress", args.userAddress.toLowerCase()))
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
    .withIndex("by_userAddress", (q) => q.eq("userAddress", userAddress.toLowerCase()))
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
      .withIndex("by_userAddress", (q) => q.eq("userAddress", args.userAddress.toLowerCase()))
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
      userAddress: args.userAddress.toLowerCase(),
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

// Search users by name, username, or wallet address
export const searchUsers = query({
  args: {
    query: v.string(),
    currentUserAddress: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 7;
    const searchQuery = args.query.toLowerCase().trim();

    if (!searchQuery) return [];

    // Get current user to check friendships
    let currentUser = null;
    if (args.currentUserAddress) {
      const userAddress = args.currentUserAddress.toLowerCase();
      currentUser = await ctx.db
        .query("users")
        .withIndex("by_userAddress", (q) => q.eq("userAddress", userAddress))
        .unique();
    }

    // Search by wallet address (exact match)
    if (searchQuery.startsWith("0x")) {
      const userByAddress = await ctx.db
        .query("users")
        .withIndex("by_userAddress", (q) => q.eq("userAddress", searchQuery.toLowerCase()))
        .unique();

      if (userByAddress) {
        // Check if friend
        let isFriend = false;
        if (currentUser) {
          const friendship = await ctx.db
            .query("friendships")
            .withIndex("by_users", (q) =>
              q
                .eq("requesterId", currentUser._id)
                .eq("addresseeId", userByAddress._id),
            )
            .filter((q) => q.eq(q.field("status"), "accepted"))
            .first();

          const reverseFriendship = await ctx.db
            .query("friendships")
            .withIndex("by_users", (q) =>
              q
                .eq("requesterId", userByAddress._id)
                .eq("addresseeId", currentUser._id),
            )
            .filter((q) => q.eq(q.field("status"), "accepted"))
            .first();

          isFriend = !!(friendship || reverseFriendship);
        }

        return [
          {
            ...userByAddress,
            isFriend,
          },
        ];
      }
      return [];
    }

    // Search by name or username (partial match)
    const allUsers = await ctx.db.query("users").collect();

    const matches = allUsers
      .filter((user) => {
        const matchesName = user.name.toLowerCase().includes(searchQuery);
        const matchesUsername = user.username
          .toLowerCase()
          .includes(searchQuery);
        // Exclude current user from results
        const notSelf = !currentUser || user._id !== currentUser._id;
        return (matchesName || matchesUsername) && notSelf;
      })
      .slice(0, limit);

    // Check friendship status for each match
    const results = await Promise.all(
      matches.map(async (user) => {
        let isFriend = false;
        if (currentUser) {
          const friendship = await ctx.db
            .query("friendships")
            .withIndex("by_users", (q) =>
              q.eq("requesterId", currentUser._id).eq("addresseeId", user._id),
            )
            .filter((q) => q.eq(q.field("status"), "accepted"))
            .first();

          const reverseFriendship = await ctx.db
            .query("friendships")
            .withIndex("by_users", (q) =>
              q.eq("requesterId", user._id).eq("addresseeId", currentUser._id),
            )
            .filter((q) => q.eq(q.field("status"), "accepted"))
            .first();

          isFriend = !!(friendship || reverseFriendship);
        }

        return {
          ...user,
          isFriend,
        };
      }),
    );

    return results;
  },
});

// Get recent payment recipients (for quick access)
export const getRecentRecipients = query({
  args: {
    userAddress: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 5;

    const user = await ctx.db
      .query("users")
      .withIndex("by_userAddress", (q) => q.eq("userAddress", args.userAddress.toLowerCase()))
      .unique();

    if (!user) return [];

    // Get recent payments
    const payments = await ctx.db
      .query("payments")
      .withIndex("by_sender", (q) => q.eq("senderId", user._id))
      .order("desc")
      .take(20); // Get more to deduplicate

    // Get unique recipients
    const uniqueRecipientIds = new Set<string>();
    const recentRecipients = [];

    for (const payment of payments) {
      if (payment.recipientId) {
        const recipientIdStr = payment.recipientId;
        if (!uniqueRecipientIds.has(recipientIdStr)) {
          uniqueRecipientIds.add(recipientIdStr);
          const recipient = await ctx.db.get(payment.recipientId);
          if (recipient) {
            // Check if friend
            const friendship = await ctx.db
              .query("friendships")
              .withIndex("by_users", (q) =>
                q.eq("requesterId", user._id).eq("addresseeId", recipient._id),
              )
              .filter((q) => q.eq(q.field("status"), "accepted"))
              .first();

            const reverseFriendship = await ctx.db
              .query("friendships")
              .withIndex("by_users", (q) =>
                q.eq("requesterId", recipient._id).eq("addresseeId", user._id),
              )
              .filter((q) => q.eq(q.field("status"), "accepted"))
              .first();

            const isFriend = !!(friendship || reverseFriendship);

            recentRecipients.push({
              ...recipient,
              isFriend,
              lastPaymentDate: payment.timestamp,
            });
          }
        }
        if (recentRecipients.length >= limit) break;
      }
    }

    return recentRecipients;
  },
});
