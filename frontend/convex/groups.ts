import { ConvexError, v } from "convex/values";
import { mutation, query, QueryCtx } from "./_generated/server";
import { Id } from "./_generated/dataModel";

// Helper function to verify and get user by wallet address
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

// Helper function to check if user is a member of a group
async function isGroupMember(
  ctx: QueryCtx,
  groupId: Id<"groups">,
  userId: Id<"users">,
) {
  const member = await ctx.db
    .query("groupMembers")
    .withIndex("by_group_user", (q: any) =>
      q.eq("groupId", groupId).eq("userId", userId),
    )
    .first();

  return member !== null;
}

// Helper function to check if user is an admin of a group
async function isGroupAdmin(
  ctx: QueryCtx,
  groupId: Id<"groups">,
  userId: Id<"users">,
) {
  const member = await ctx.db
    .query("groupMembers")
    .withIndex("by_group_user", (q: any) =>
      q.eq("groupId", groupId).eq("userId", userId),
    )
    .first();

  return member?.role === "admin";
}

// Helper function to log group activity
async function logActivity(
  ctx: any,
  groupId: Id<"groups">,
  actorId: Id<"users">,
  type: any,
  metadata?: any,
) {
  await ctx.db.insert("groupActivities", {
    groupId,
    actorId,
    type,
    metadata: metadata || {},
  });
}

// ==================== QUERIES ====================

// Get all groups user is a member of
export const listUserGroups = query({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const memberships = await ctx.db
      .query("groupMembers")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();

    const groups = await Promise.all(
      memberships.map(async (membership) => {
        const group = await ctx.db.get(membership.groupId);
        if (!group) return null;

        // Get member count
        const memberCount = await ctx.db
          .query("groupMembers")
          .withIndex("by_group", (q) => q.eq("groupId", group._id))
          .collect();

        // Get first 4 members for avatar stack
        const members = await Promise.all(
          memberCount.slice(0, 4).map(async (m) => {
            const user = await ctx.db.get(m.userId);
            return user;
          }),
        );

        return {
          ...group,
          memberCount: memberCount.length,
          members: members.filter((m) => m !== null),
          userRole: membership.role,
        };
      }),
    );

    return groups.filter((g) => g !== null);
  },
});

// Get group by ID with member check
export const getGroup = query({
  args: {
    groupId: v.id("groups"),
    userId: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    const group = await ctx.db.get(args.groupId);
    if (!group) return null;

    // Check if user is a member
    let isMember = false;
    let userRole = null;
    if (args.userId) {
      const userId = args.userId;
      const membership = await ctx.db
        .query("groupMembers")
        .withIndex("by_group_user", (q) =>
          q.eq("groupId", args.groupId).eq("userId", userId),
        )
        .first();

      isMember = membership !== null;
      userRole = membership?.role || null;
    }

    // If private and user is not a member, return limited info
    if (group.privacy === "private" && !isMember) {
      return {
        ...group,
        hasAccess: false,
        isMember: false,
        userRole: null,
      };
    }

    // Get member count and list
    const membersList = await ctx.db
      .query("groupMembers")
      .withIndex("by_group", (q) => q.eq("groupId", args.groupId))
      .collect();

    const members = await Promise.all(
      membersList.map(async (m) => {
        const user = await ctx.db.get(m.userId);
        return {
          ...user,
          role: m.role,
          joinedAt: m.joinedAt,
        };
      }),
    );

    return {
      ...group,
      hasAccess: true,
      isMember,
      userRole,
      memberCount: members.length,
      members: members.filter((m) => m !== null),
    };
  },
});

// Get public groups by username for profile display
export const listPublicGroupsByUsername = query({
  args: {
    username: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_username", (q) => q.eq("username", args.username))
      .unique();

    if (!user) return [];

    const memberships = await ctx.db
      .query("groupMembers")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();

    const groups = await Promise.all(
      memberships.map(async (membership) => {
        const group = await ctx.db.get(membership.groupId);
        if (!group || group.privacy === "private") return null;

        // Get first 4 members for avatar stack
        const membersList = await ctx.db
          .query("groupMembers")
          .withIndex("by_group", (q) => q.eq("groupId", group._id))
          .collect();

        const members = await Promise.all(
          membersList.slice(0, 4).map(async (m) => {
            const u = await ctx.db.get(m.userId);
            return {
              userId: m.userId,
              name: u?.name || "Unknown",
              profileImageUrl: u?.profileImageUrl,
            };
          }),
        );

        return {
          ...group,
          members: members.filter((m) => m !== null),
        };
      }),
    );

    return groups.filter((g) => g !== null);
  },
});

// Get group activities with pagination
export const getGroupActivities = query({
  args: {
    groupId: v.id("groups"),
    limit: v.optional(v.number()),
    cursor: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 20;

    let query = ctx.db
      .query("groupActivities")
      .withIndex("by_group", (q) => q.eq("groupId", args.groupId))
      .order("desc");

    const activities = await query.take(limit + 1);
    const hasMore = activities.length > limit;
    const results = hasMore ? activities.slice(0, limit) : activities;

    // Populate actor data
    const populated = await Promise.all(
      results.map(async (activity) => {
        const actor = await ctx.db.get(activity.actorId);
        return {
          ...activity,
          actor,
        };
      }),
    );

    return {
      activities: populated,
      hasMore,
    };
  },
});

// Get global activity feed from all user's groups
export const getGlobalActivityFeed = query({
  args: {
    userId: v.id("users"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 20;

    // Get all groups user is in
    const memberships = await ctx.db
      .query("groupMembers")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();

    const groupIds = memberships.map((m) => m.groupId);

    // Get recent activities from all groups
    const allActivities = await Promise.all(
      groupIds.map(async (groupId) => {
        return await ctx.db
          .query("groupActivities")
          .withIndex("by_group", (q) => q.eq("groupId", groupId))
          .order("desc")
          .take(10); // Get 10 from each group
      }),
    );

    // Flatten and sort by creation time
    const flatActivities = allActivities
      .flat()
      .sort((a, b) => b._creationTime - a._creationTime)
      .slice(0, limit);

    // Populate data
    const populated = await Promise.all(
      flatActivities.map(async (activity) => {
        const actor = await ctx.db.get(activity.actorId);
        const group = await ctx.db.get(activity.groupId);
        return {
          ...activity,
          actor,
          group,
        };
      }),
    );

    return populated;
  },
});

// ==================== MUTATIONS ====================

// Helper function to check if user can invite based on permissions
async function canInvite(ctx: any, groupId: Id<"groups">, userId: Id<"users">) {
  const group = await ctx.db.get(groupId);
  if (!group) return false;

  const member = await ctx.db
    .query("groupMembers")
    .withIndex("by_group_user", (q: any) =>
      q.eq("groupId", groupId).eq("userId", userId),
    )
    .first();

  if (!member) return false;

  // Get permissions (default to "admins" if not set)
  const whoCanInvite = group.permissions?.whoCanInvite || "admins";

  switch (whoCanInvite) {
    case "creator":
      return group.creatorId === userId;
    case "admins":
      return member.role === "admin";
    case "all":
      return true;
    default:
      return false;
  }
}

// Create a new group
export const createGroup = mutation({
  args: {
    userAddress: v.string(),
    name: v.string(),
    description: v.string(),
    imageOrEmoji: v.string(),
    imageType: v.union(v.literal("emoji"), v.literal("image")),
    accentColor: v.string(),
    privacy: v.optional(v.union(v.literal("public"), v.literal("private"))),
    inviteFriendIds: v.optional(v.array(v.id("users"))),
  },
  handler: async (ctx, args) => {
    const user = await verifyUser(ctx, args.userAddress);

    if (args.name.length < 2 || args.name.length > 50) {
      throw new ConvexError("Group name must be between 2 and 50 characters");
    }

    if (args.description.length > 300) {
      throw new ConvexError("Description must be 300 characters or less");
    }

    const groupId = await ctx.db.insert("groups", {
      name: args.name,
      description: args.description,
      imageOrEmoji: args.imageOrEmoji,
      imageType: args.imageType,
      accentColor: args.accentColor,
      creatorId: user._id,
      privacy: args.privacy || "public",
      joinMethod: "request",
      // Default permissions
      permissions: {
        whoCanInvite: "admins",
        whoCanCreatePacts: "admins",
      },
    });

    await ctx.db.insert("groupMembers", {
      groupId,
      userId: user._id,
      role: "admin",
      joinedAt: Date.now(),
    });

    await logActivity(ctx, groupId, user._id, "group_created");

    if (args.inviteFriendIds && args.inviteFriendIds.length > 0) {
      for (const friendId of args.inviteFriendIds) {
        const invitationId = await ctx.db.insert("groupInvitations", {
          groupId,
          inviterId: user._id,
          inviteeId: friendId,
          status: "pending",
        });

        await ctx.db.insert("notifications", {
          userId: friendId,
          type: "group_invite",
          isRead: false,
          fromUserId: user._id,
          groupId: groupId,
          invitationId: invitationId,
        });
      }
    }

    return groupId;
  },
});

// Update group info
export const updateGroup = mutation({
  args: {
    userAddress: v.string(),
    groupId: v.id("groups"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    imageOrEmoji: v.optional(v.string()),
    imageType: v.optional(v.union(v.literal("emoji"), v.literal("image"))),
    accentColor: v.optional(v.string()),
    privacy: v.optional(v.union(v.literal("public"), v.literal("private"))),
  },
  handler: async (ctx, args) => {
    const user = await verifyUser(ctx, args.userAddress);

    // Check if user is admin
    if (!(await isGroupAdmin(ctx, args.groupId, user._id))) {
      throw new ConvexError("Only admins can update group settings");
    }

    const updates: any = {};
    if (args.name) updates.name = args.name;
    if (args.description !== undefined) updates.description = args.description;
    if (args.imageOrEmoji) updates.imageOrEmoji = args.imageOrEmoji;
    if (args.imageType) updates.imageType = args.imageType;
    if (args.accentColor) updates.accentColor = args.accentColor;
    if (args.privacy) updates.privacy = args.privacy;

    await ctx.db.patch(args.groupId, updates);

    // Log activity
    await logActivity(ctx, args.groupId, user._id, "settings_changed", {
      changes: Object.keys(updates),
    });

    return true;
  },
});

// Delete group (creator only)
export const deleteGroup = mutation({
  args: {
    userAddress: v.string(),
    groupId: v.id("groups"),
  },
  handler: async (ctx, args) => {
    const user = await verifyUser(ctx, args.userAddress);
    const group = await ctx.db.get(args.groupId);

    if (!group) {
      throw new ConvexError("Group not found");
    }

    // Only creator can delete
    if (group.creatorId !== user._id) {
      throw new ConvexError("Only the group creator can delete the group");
    }

    // Delete all members
    const members = await ctx.db
      .query("groupMembers")
      .withIndex("by_group", (q) => q.eq("groupId", args.groupId))
      .collect();

    for (const member of members) {
      await ctx.db.delete(member._id);
    }

    // Delete all invitations
    const invitations = await ctx.db
      .query("groupInvitations")
      .withIndex("by_group", (q) => q.eq("groupId", args.groupId))
      .collect();

    for (const invitation of invitations) {
      await ctx.db.delete(invitation._id);
    }

    // Delete all activities
    const activities = await ctx.db
      .query("groupActivities")
      .withIndex("by_group", (q) => q.eq("groupId", args.groupId))
      .collect();

    for (const activity of activities) {
      await ctx.db.delete(activity._id);
    }

    // Delete the group
    await ctx.db.delete(args.groupId);

    return true;
  },
});

// Update group permissions
export const updatePermissions = mutation({
  args: {
    userAddress: v.string(),
    groupId: v.id("groups"),
    whoCanInvite: v.union(
      v.literal("all"),
      v.literal("admins"),
      v.literal("creator"),
    ),
    whoCanCreatePacts: v.union(v.literal("all"), v.literal("admins")),
  },
  handler: async (ctx, args) => {
    const user = await verifyUser(ctx, args.userAddress);

    // Check if user is admin
    if (!(await isGroupAdmin(ctx, args.groupId, user._id))) {
      throw new ConvexError("Only admins can update permissions");
    }

    await ctx.db.patch(args.groupId, {
      permissions: {
        whoCanInvite: args.whoCanInvite,
        whoCanCreatePacts: args.whoCanCreatePacts,
      },
    });

    // Log activity
    await logActivity(ctx, args.groupId, user._id, "settings_changed", {
      changes: ["permissions"],
    });

    return true;
  },
});

// Query to check user's permissions in a group
export const getUserPermissions = query({
  args: {
    groupId: v.id("groups"),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const group = await ctx.db.get(args.groupId);
    if (!group) return null;

    const member = await ctx.db
      .query("groupMembers")
      .withIndex("by_group_user", (q) =>
        q.eq("groupId", args.groupId).eq("userId", args.userId),
      )
      .first();

    if (!member) {
      return {
        canInvite: false,
        canCreatePacts: false,
        canManageMembers: false,
        canEditSettings: false,
      };
    }

    const isAdmin = member.role === "admin";
    const isCreator = group.creatorId === args.userId;
    const permissions = group.permissions || {
      whoCanInvite: "admins",
      whoCanCreatePacts: "admins",
    };

    return {
      canInvite: await canInvite(ctx, args.groupId, args.userId),
      canCreatePacts:
        permissions.whoCanCreatePacts === "all" ||
        (permissions.whoCanCreatePacts === "admins" && isAdmin),
      canManageMembers: isAdmin,
      canEditSettings: isAdmin,
      canDelete: isCreator,
      role: member.role,
    };
  },
});

// ==================== MEMBER MANAGEMENT ====================

// Promote member to admin
export const promoteMember = mutation({
  args: {
    userAddress: v.string(),
    groupId: v.id("groups"),
    memberId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const user = await verifyUser(ctx, args.userAddress);

    // Check if user is admin
    if (!(await isGroupAdmin(ctx, args.groupId, user._id))) {
      throw new ConvexError("Only admins can promote members");
    }

    const membership = await ctx.db
      .query("groupMembers")
      .withIndex("by_group_user", (q) =>
        q.eq("groupId", args.groupId).eq("userId", args.memberId),
      )
      .first();

    if (!membership) {
      throw new ConvexError("Member not found");
    }

    if (membership.role === "admin") {
      throw new ConvexError("User is already an admin");
    }

    await ctx.db.patch(membership._id, { role: "admin" });

    // Log activity
    await logActivity(ctx, args.groupId, user._id, "admin_promoted", {
      promotedUserId: args.memberId,
    });

    return true;
  },
});

// Demote admin to member
export const demoteMember = mutation({
  args: {
    userAddress: v.string(),
    groupId: v.id("groups"),
    memberId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const user = await verifyUser(ctx, args.userAddress);
    const group = await ctx.db.get(args.groupId);

    if (!group) {
      throw new ConvexError("Group not found");
    }

    // Check if user is admin
    if (!(await isGroupAdmin(ctx, args.groupId, user._id))) {
      throw new ConvexError("Only admins can demote members");
    }

    // Cannot demote the creator
    if (group.creatorId === args.memberId) {
      throw new ConvexError("Cannot demote the group creator");
    }

    const membership = await ctx.db
      .query("groupMembers")
      .withIndex("by_group_user", (q) =>
        q.eq("groupId", args.groupId).eq("userId", args.memberId),
      )
      .first();

    if (!membership) {
      throw new ConvexError("Member not found");
    }

    if (membership.role === "member") {
      throw new ConvexError("User is already a regular member");
    }

    await ctx.db.patch(membership._id, { role: "member" });

    // Log activity
    await logActivity(ctx, args.groupId, user._id, "admin_demoted", {
      demotedUserId: args.memberId,
    });

    return true;
  },
});

// Remove member from group
export const removeMember = mutation({
  args: {
    userAddress: v.string(),
    groupId: v.id("groups"),
    memberId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const user = await verifyUser(ctx, args.userAddress);
    const group = await ctx.db.get(args.groupId);

    if (!group) {
      throw new ConvexError("Group not found");
    }

    // Check if user is admin
    if (!(await isGroupAdmin(ctx, args.groupId, user._id))) {
      throw new ConvexError("Only admins can remove members");
    }

    // Cannot remove the creator
    if (group.creatorId === args.memberId) {
      throw new ConvexError("Cannot remove the group creator");
    }

    const membership = await ctx.db
      .query("groupMembers")
      .withIndex("by_group_user", (q) =>
        q.eq("groupId", args.groupId).eq("userId", args.memberId),
      )
      .first();

    if (!membership) {
      throw new ConvexError("Member not found");
    }

    await ctx.db.delete(membership._id);

    // Log activity
    await logActivity(ctx, args.groupId, user._id, "member_removed", {
      removedUserId: args.memberId,
    });

    // Notify removed user
    await ctx.db.insert("notifications", {
      userId: args.memberId,
      type: "group_invite", // Reusing type for now
      isRead: false,
      fromUserId: user._id,
      groupId: args.groupId,
      message: "You were removed from the group",
    });

    return true;
  },
});

// Leave group
export const leaveGroup = mutation({
  args: {
    userAddress: v.string(),
    groupId: v.id("groups"),
  },
  handler: async (ctx, args) => {
    const user = await verifyUser(ctx, args.userAddress);
    const group = await ctx.db.get(args.groupId);

    if (!group) {
      throw new ConvexError("Group not found");
    }

    // Creator cannot leave
    if (group.creatorId === user._id) {
      throw new ConvexError("Group creator cannot leave the group");
    }

    const membership = await ctx.db
      .query("groupMembers")
      .withIndex("by_group_user", (q) =>
        q.eq("groupId", args.groupId).eq("userId", user._id),
      )
      .first();

    if (!membership) {
      throw new ConvexError("You are not a member of this group");
    }

    await ctx.db.delete(membership._id);

    // Log activity
    await logActivity(ctx, args.groupId, user._id, "member_left");

    return true;
  },
});

// ==================== INVITATIONS ====================

// Send group invitation
export const sendInvitation = mutation({
  args: {
    userAddress: v.string(),
    groupId: v.id("groups"),
    inviteeId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const user = await verifyUser(ctx, args.userAddress);

    // Check if user can invite based on permissions
    if (!(await canInvite(ctx, args.groupId, user._id))) {
      throw new ConvexError("You don't have permission to invite members");
    }

    if (await isGroupMember(ctx, args.groupId, args.inviteeId)) {
      throw new ConvexError("User is already a member of this group");
    }

    const existingInvite = await ctx.db
      .query("groupInvitations")
      .withIndex("by_group_invitee", (q) =>
        q.eq("groupId", args.groupId).eq("inviteeId", args.inviteeId),
      )
      .filter((q) => q.eq(q.field("status"), "pending"))
      .first();

    if (existingInvite) {
      throw new ConvexError("Invitation already sent to this user");
    }

    const invitationId = await ctx.db.insert("groupInvitations", {
      groupId: args.groupId,
      inviterId: user._id,
      inviteeId: args.inviteeId,
      status: "pending",
    });

    await ctx.db.insert("notifications", {
      userId: args.inviteeId,
      type: "group_invite",
      isRead: false,
      fromUserId: user._id,
      groupId: args.groupId,
      invitationId: invitationId,
    });

    return invitationId;
  },
});

// Cancel invitation
export const cancelInvitation = mutation({
  args: {
    userAddress: v.string(),
    invitationId: v.id("groupInvitations"),
  },
  handler: async (ctx, args) => {
    const user = await verifyUser(ctx, args.userAddress);
    const invitation = await ctx.db.get(args.invitationId);

    if (!invitation) {
      throw new ConvexError("Invitation not found");
    }

    // Only inviter can cancel
    if (invitation.inviterId !== user._id) {
      throw new ConvexError("Only the inviter can cancel this invitation");
    }

    if (invitation.status !== "pending") {
      throw new ConvexError("Can only cancel pending invitations");
    }

    await ctx.db.patch(args.invitationId, {
      status: "cancelled",
      respondedAt: Date.now(),
    });

    // Notify invitee
    await ctx.db.insert("notifications", {
      userId: invitation.inviteeId,
      type: "group_invite",
      isRead: false,
      fromUserId: user._id,
      groupId: invitation.groupId,
      message: "Group invitation was cancelled",
    });

    return true;
  },
});

// Accept invitation
export const acceptInvitation = mutation({
  args: {
    userAddress: v.string(),
    invitationId: v.id("groupInvitations"),
  },
  handler: async (ctx, args) => {
    const user = await verifyUser(ctx, args.userAddress);
    const invitation = await ctx.db.get(args.invitationId);

    if (!invitation) {
      throw new ConvexError("Invitation not found");
    }

    // Verify user is the invitee
    if (invitation.inviteeId !== user._id) {
      throw new ConvexError("Not authorized to accept this invitation");
    }

    if (invitation.status !== "pending") {
      throw new ConvexError("Invitation is not pending");
    }

    // Check if already a member
    if (await isGroupMember(ctx, invitation.groupId, user._id)) {
      throw new ConvexError("You are already a member of this group");
    }

    // Add as member
    await ctx.db.insert("groupMembers", {
      groupId: invitation.groupId,
      userId: user._id,
      role: "member",
      joinedAt: Date.now(),
      invitedBy: invitation.inviterId,
    });

    // Update invitation
    await ctx.db.patch(args.invitationId, {
      status: "accepted",
      respondedAt: Date.now(),
    });

    // Log activity
    await logActivity(ctx, invitation.groupId, user._id, "member_joined");

    // Notify inviter
    await ctx.db.insert("notifications", {
      userId: invitation.inviterId,
      type: "group_joined",
      isRead: false,
      fromUserId: user._id,
      groupId: invitation.groupId,
    });

    return true;
  },
});

// Decline invitation
export const declineInvitation = mutation({
  args: {
    userAddress: v.string(),
    invitationId: v.id("groupInvitations"),
  },
  handler: async (ctx, args) => {
    const user = await verifyUser(ctx, args.userAddress);
    const invitation = await ctx.db.get(args.invitationId);

    if (!invitation) {
      throw new ConvexError("Invitation not found");
    }

    // Verify user is the invitee
    if (invitation.inviteeId !== user._id) {
      throw new ConvexError("Not authorized to decline this invitation");
    }

    if (invitation.status !== "pending") {
      throw new ConvexError("Invitation is not pending");
    }

    // Just delete the invitation (no notification needed)
    await ctx.db.delete(args.invitationId);

    return true;
  },
});

// Get pending invitations for a user
export const listPendingInvitations = query({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const invitations = await ctx.db
      .query("groupInvitations")
      .withIndex("by_invitee_status", (q) =>
        q.eq("inviteeId", args.userId).eq("status", "pending"),
      )
      .collect();

    const populated = await Promise.all(
      invitations.map(async (invitation) => {
        const group = await ctx.db.get(invitation.groupId);
        const inviter = await ctx.db.get(invitation.inviterId);
        return {
          ...invitation,
          group,
          inviter,
        };
      }),
    );

    return populated;
  },
});

export const requestAccess = mutation({
  args: {
    userAddress: v.string(),
    groupId: v.id("groups"),
  },
  handler: async (ctx, args) => {
    const user = await verifyUser(ctx, args.userAddress);
    const group = await ctx.db.get(args.groupId);

    if (!group) {
      throw new ConvexError("Group not found");
    }

    if (await isGroupMember(ctx, args.groupId, user._id)) {
      throw new ConvexError("You are already a member of this group");
    }

    const existingRequest = await ctx.db
      .query("groupInvitations")
      .withIndex("by_group_invitee", (q) =>
        q.eq("groupId", args.groupId).eq("inviteeId", user._id),
      )
      .filter((q) => q.eq(q.field("status"), "pending"))
      .first();

    if (existingRequest) {
      throw new ConvexError("Access request already pending");
    }

    const requestId = await ctx.db.insert("groupInvitations", {
      groupId: args.groupId,
      inviterId: user._id,
      inviteeId: user._id,
      status: "pending",
    });

    const admins = await ctx.db
      .query("groupMembers")
      .withIndex("by_group_role", (q) =>
        q.eq("groupId", args.groupId).eq("role", "admin"),
      )
      .collect();

    for (const admin of admins) {
      // FIXED: Use invitationId field
      await ctx.db.insert("notifications", {
        userId: admin.userId,
        type: "group_invite",
        isRead: false,
        fromUserId: user._id,
        groupId: args.groupId,
        invitationId: requestId, // FIXED
        message: "requested to join the group",
      });
    }

    return requestId;
  },
});

// Grant access request
export const grantAccessRequest = mutation({
  args: {
    userAddress: v.string(),
    invitationId: v.id("groupInvitations"),
  },
  handler: async (ctx, args) => {
    const user = await verifyUser(ctx, args.userAddress);
    const invitation = await ctx.db.get(args.invitationId);

    if (!invitation) {
      throw new ConvexError("Access request not found");
    }

    // Check if user is admin
    if (!(await isGroupAdmin(ctx, invitation.groupId, user._id))) {
      throw new ConvexError("Only admins can grant access requests");
    }

    if (invitation.status !== "pending") {
      throw new ConvexError("Access request is not pending");
    }

    // Add as member
    await ctx.db.insert("groupMembers", {
      groupId: invitation.groupId,
      userId: invitation.inviteeId,
      role: "member",
      joinedAt: Date.now(),
      invitedBy: user._id,
    });

    // Update invitation
    await ctx.db.patch(args.invitationId, {
      status: "accepted",
      respondedAt: Date.now(),
    });

    // Log activity
    await logActivity(
      ctx,
      invitation.groupId,
      invitation.inviteeId,
      "member_joined",
    );

    // Notify requester
    await ctx.db.insert("notifications", {
      userId: invitation.inviteeId,
      type: "group_joined",
      isRead: false,
      fromUserId: user._id,
      groupId: invitation.groupId,
      message: "Your access request was approved",
    });

    return true;
  },
});

// Deny access request
export const denyAccessRequest = mutation({
  args: {
    userAddress: v.string(),
    invitationId: v.id("groupInvitations"),
  },
  handler: async (ctx, args) => {
    const user = await verifyUser(ctx, args.userAddress);
    const invitation = await ctx.db.get(args.invitationId);

    if (!invitation) {
      throw new ConvexError("Access request not found");
    }

    // Check if user is admin
    if (!(await isGroupAdmin(ctx, invitation.groupId, user._id))) {
      throw new ConvexError("Only admins can deny access requests");
    }

    if (invitation.status !== "pending") {
      throw new ConvexError("Access request is not pending");
    }

    // Just delete the request
    await ctx.db.delete(args.invitationId);

    return true;
  },
});
