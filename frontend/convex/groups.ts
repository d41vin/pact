import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Helper to verify and get user by wallet address
async function verifyUser(ctx: any, userAddress: string) {
  const user = await ctx.db
    .query("users")
    .withIndex("by_userAddress", (q: any) => q.eq("userAddress", userAddress))
    .unique();

  if (!user) {
    throw new ConvexError("User not found or not authenticated");
  }

  return user;
}

// Create a new group - SECURE
export const createGroup = mutation({
  args: {
    userAddress: v.string(),
    name: v.string(),
    description: v.optional(v.string()),
    accentColor: v.string(),
    imageId: v.optional(v.id("_storage")),
    emoji: v.optional(v.string()),
    privacy: v.optional(v.union(v.literal("public"), v.literal("private"))),
    joinMethod: v.optional(
      v.union(v.literal("request"), v.literal("invite"), v.literal("nft")),
    ),
  },
  handler: async (ctx: any, args) => {
    const user = await verifyUser(ctx, args.userAddress);

    // Check required: either image or emoji can be provided (not strictly enforced here)

    // Enforce unique group name per creator
    const existing = await ctx.db
      .query("groups")
      .withIndex("by_creator_name", (q: any) =>
        q.eq("creatorId", user._id).eq("name", args.name),
      )
      .unique();

    if (existing) {
      throw new ConvexError("You already have a group with this name");
    }

    let imageUrl: string | undefined = undefined;
    if (args.imageId) {
      const url = await ctx.storage.getUrl(args.imageId);
      if (!url) throw new ConvexError("Could not get image URL");
      imageUrl = url;
    }

    const now = Date.now();

    const groupId = await ctx.db.insert("groups", {
      name: args.name,
      description: args.description,
      imageUrl,
      emoji: args.emoji,
      accentColor: args.accentColor,
      creatorId: user._id,
      createdAt: now,
      privacy: args.privacy ?? "public",
      joinMethod: args.joinMethod ?? "invite",
    });

    // Add creator as admin member
    await ctx.db.insert("groupMembers", {
      groupId,
      userId: user._id,
      role: "admin",
      joinedAt: now,
      invitedBy: undefined,
    });

    // Log activity: member_joined (creator)
    await ctx.db.insert("groupActivities", {
      groupId,
      actorId: user._id,
      type: "member_joined",
      metadata: { userId: user._id },
      createdAt: now,
    });

    return groupId;
  },
});

// Update group settings - SECURE (admins only)
export const updateGroup = mutation({
  args: {
    userAddress: v.string(),
    groupId: v.id("groups"),
    name: v.string(),
    description: v.optional(v.string()),
    accentColor: v.string(),
    imageId: v.optional(v.id("_storage")),
    emoji: v.optional(v.string()),
    privacy: v.union(v.literal("public"), v.literal("private")),
    joinMethod: v.union(v.literal("request"), v.literal("invite"), v.literal("nft")),
  },
  handler: async (ctx: any, args) => {
    const user = await verifyUser(ctx, args.userAddress);

    // Verify admin membership
    const membership = await ctx.db
      .query("groupMembers")
      .withIndex("by_group_user", (q: any) =>
        q.eq("groupId", args.groupId).eq("userId", user._id),
      )
      .unique();

    if (!membership || membership.role !== "admin") {
      throw new ConvexError("Only admins can update group settings");
    }

    let imageUrl: string | undefined = undefined;
    if (args.imageId) {
      const url = await ctx.storage.getUrl(args.imageId);
      if (!url) throw new ConvexError("Could not get image URL");
      imageUrl = url;
    }

    await ctx.db.patch(args.groupId, {
      name: args.name,
      description: args.description,
      accentColor: args.accentColor,
      emoji: args.emoji,
      privacy: args.privacy,
      joinMethod: args.joinMethod,
      ...(imageUrl ? { imageUrl } : {}),
    });

    await ctx.db.insert("groupActivities", {
      groupId: args.groupId,
      actorId: user._id,
      type: "settings_changed",
      metadata: {
        fields: [
          "name",
          "description",
          "accentColor",
          ...(args.imageId ? ["imageUrl"] : []),
          "emoji",
          "privacy",
          "joinMethod",
        ],
      },
      createdAt: Date.now(),
    });

    return true;
  },
});

// List groups for a user (with small members preview)
export const listUserGroups = query({
  args: { userId: v.id("users") },
  handler: async (ctx: any, args) => {
    const memberships = await ctx.db
      .query("groupMembers")
      .withIndex("by_user", (q: any) => q.eq("userId", args.userId))
      .collect();

    const groups = await Promise.all(
      memberships.map(async (m: any) => {
        const group = await ctx.db.get(m.groupId);
        if (!group) return null;

        // Get up to 5 members for preview
        const members = await ctx.db
          .query("groupMembers")
          .withIndex("by_group", (q: any) => q.eq("groupId", m.groupId))
          .collect();

        const memberUsers = await Promise.all(
          members.slice(0, 5).map(async (mm: any) => {
            const u = await ctx.db.get(mm.userId);
            return u;
          }),
        );

        return {
          _id: group._id,
          name: group.name,
          description: group.description,
          groupImageUrl: group.imageUrl,
          emoji: group.emoji,
          groupColor: group.accentColor,
          members: memberUsers
            .filter(Boolean)
            .map((u: any) => ({
              userId: u._id,
              profileImageUrl: u.profileImageUrl,
              name: u.name,
            })),
        };
      }),
    );

    return groups.filter(Boolean);
  },
});

// List public groups for a username (for profile pages)
export const listPublicByUsername = query({
  args: { username: v.string() },
  handler: async (ctx: any, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_username", (q: any) => q.eq("username", args.username))
      .unique();
    if (!user) return [];

    const memberships = await ctx.db
      .query("groupMembers")
      .withIndex("by_user", (q: any) => q.eq("userId", user._id))
      .collect();

    const groups = await Promise.all(
      memberships.map(async (m: any) => {
        const group = await ctx.db.get(m.groupId);
        if (!group || group.privacy !== "public") return null;

        const members = await ctx.db
          .query("groupMembers")
          .withIndex("by_group", (q: any) => q.eq("groupId", m.groupId))
          .collect();

        const memberUsers = await Promise.all(
          members.slice(0, 5).map(async (mm: any) => {
            const u = await ctx.db.get(mm.userId);
            return u;
          }),
        );

        return {
          _id: group._id,
          name: group.name,
          groupImageUrl: group.imageUrl,
          groupColor: group.accentColor,
          members: memberUsers
            .filter(Boolean)
            .map((u: any) => ({
              userId: u._id,
              profileImageUrl: u.profileImageUrl,
              name: u.name,
            })),
        };
      }),
    );

    return groups.filter(Boolean);
  },
});

// Get a group by id
export const getGroup = query({
  args: { groupId: v.id("groups") },
  handler: async (ctx: any, args) => {
    const group = await ctx.db.get(args.groupId);
    return group;
  },
});

// Get members with user data
export const getGroupMembers = query({
  args: { groupId: v.id("groups") },
  handler: async (ctx: any, args) => {
    const members = await ctx.db
      .query("groupMembers")
      .withIndex("by_group", (q: any) => q.eq("groupId", args.groupId))
      .order("asc")
      .collect();

    const withUsers = await Promise.all(
      members.map(async (m: any) => {
        const user = await ctx.db.get(m.userId);
        return { ...m, user };
      }),
    );

    return withUsers;
  },
});

// Check membership role for a user in a group
export const getUserMembership = query({
  args: { groupId: v.id("groups"), userId: v.id("users") },
  handler: async (ctx: any, args) => {
    const membership = await ctx.db
      .query("groupMembers")
      .withIndex("by_group_user", (q: any) =>
        q.eq("groupId", args.groupId).eq("userId", args.userId),
      )
      .unique();
    return membership;
  },
});

// Group activity (per group)
export const getGroupActivities = query({
  args: { groupId: v.id("groups"), limit: v.optional(v.number()) },
  handler: async (ctx: any, args) => {
    const limit = args.limit ?? 20;
    const activities = await ctx.db
      .query("groupActivities")
      .withIndex("by_group", (q: any) => q.eq("groupId", args.groupId))
      .order("desc")
      .collect();

    return activities.slice(0, limit);
  },
});

// Global feed for a user (combine across groups)
export const listGlobalActivityForUser = query({
  args: { userId: v.id("users"), limit: v.optional(v.number()) },
  handler: async (ctx: any, args) => {
    const limit = args.limit ?? 10;
    const memberships = await ctx.db
      .query("groupMembers")
      .withIndex("by_user", (q: any) => q.eq("userId", args.userId))
      .collect();

    const activitiesArrays = await Promise.all(
      memberships.map(async (m: any) => {
        const group = await ctx.db.get(m.groupId);
        if (!group) return [] as any[];
        const acts = await ctx.db
          .query("groupActivities")
          .withIndex("by_group", (q: any) => q.eq("groupId", m.groupId))
          .order("desc")
          .collect();
        // Attach group info for rendering
        return acts.map((a: any) => ({ ...a, group }));
      }),
    );

    const merged = activitiesArrays.flat();
    merged.sort((a: any, b: any) => b.createdAt - a.createdAt);
    return merged.slice(0, limit);
  },
});
