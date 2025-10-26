import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
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
  ctx: any,
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
  ctx: any,
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

// Generate a random 8-character code
function generateCode(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let code = "";
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// ==================== QUERIES ====================

// Get all invite codes for a group
export const listGroupCodes = query({
  args: {
    groupId: v.id("groups"),
  },
  handler: async (ctx, args) => {
    const codes = await ctx.db
      .query("groupInviteCodes")
      .withIndex("by_group", (q) => q.eq("groupId", args.groupId))
      .order("desc")
      .collect();

    // Populate creator info
    const populated = await Promise.all(
      codes.map(async (code) => {
        const creator = await ctx.db.get(code.createdBy);
        return {
          ...code,
          creator,
        };
      }),
    );

    return populated;
  },
});

// Get active codes for a group
export const listActiveCodes = query({
  args: {
    groupId: v.id("groups"),
  },
  handler: async (ctx, args) => {
    const codes = await ctx.db
      .query("groupInviteCodes")
      .withIndex("by_group", (q) => q.eq("groupId", args.groupId))
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect();

    return codes;
  },
});

// Validate a code (check if it exists and is usable)
export const validateCode = query({
  args: {
    code: v.string(),
  },
  handler: async (ctx, args) => {
    const inviteCode = await ctx.db
      .query("groupInviteCodes")
      .withIndex("by_code", (q) => q.eq("code", args.code.toUpperCase()))
      .first();

    if (!inviteCode) {
      return { valid: false, reason: "Code not found" };
    }

    if (!inviteCode.isActive) {
      return { valid: false, reason: "Code is inactive" };
    }

    // Check expiration
    if (inviteCode.expiresAt && inviteCode.expiresAt < Date.now()) {
      return { valid: false, reason: "Code has expired" };
    }

    // Check max uses
    if (inviteCode.maxUses && inviteCode.uses >= inviteCode.maxUses) {
      return { valid: false, reason: "Code has reached maximum uses" };
    }

    // Get group info
    const group = await ctx.db.get(inviteCode.groupId);

    return {
      valid: true,
      groupId: inviteCode.groupId,
      group,
    };
  },
});

// ==================== MUTATIONS ====================

// Create a new invite code
export const createInviteCode = mutation({
  args: {
    userAddress: v.string(),
    groupId: v.id("groups"),
    expiresAt: v.optional(v.number()),
    maxUses: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await verifyUser(ctx, args.userAddress);

    // Check if user is admin
    if (!(await isGroupAdmin(ctx, args.groupId, user._id))) {
      throw new ConvexError("Only admins can create invite codes");
    }

    // Generate unique code
    let code = generateCode();
    let attempts = 0;
    while (attempts < 10) {
      const existing = await ctx.db
        .query("groupInviteCodes")
        .withIndex("by_code", (q) => q.eq("code", code))
        .first();

      if (!existing) break;
      code = generateCode();
      attempts++;
    }

    if (attempts >= 10) {
      throw new ConvexError("Failed to generate unique code");
    }

    // Create code
    const codeId = await ctx.db.insert("groupInviteCodes", {
      groupId: args.groupId,
      code,
      createdBy: user._id,
      expiresAt: args.expiresAt,
      maxUses: args.maxUses,
      uses: 0,
      isActive: true,
    });

    // Log activity
    await logActivity(ctx, args.groupId, user._id, "code_created", {
      codeId,
      code,
    });

    return { codeId, code };
  },
});

// Deactivate an invite code
export const deactivateCode = mutation({
  args: {
    userAddress: v.string(),
    codeId: v.id("groupInviteCodes"),
  },
  handler: async (ctx, args) => {
    const user = await verifyUser(ctx, args.userAddress);
    const inviteCode = await ctx.db.get(args.codeId);

    if (!inviteCode) {
      throw new ConvexError("Invite code not found");
    }

    // Check if user is admin
    if (!(await isGroupAdmin(ctx, inviteCode.groupId, user._id))) {
      throw new ConvexError("Only admins can deactivate invite codes");
    }

    await ctx.db.patch(args.codeId, {
      isActive: false,
    });

    return true;
  },
});

// Reactivate an invite code
export const reactivateCode = mutation({
  args: {
    userAddress: v.string(),
    codeId: v.id("groupInviteCodes"),
  },
  handler: async (ctx, args) => {
    const user = await verifyUser(ctx, args.userAddress);
    const inviteCode = await ctx.db.get(args.codeId);

    if (!inviteCode) {
      throw new ConvexError("Invite code not found");
    }

    // Check if user is admin
    if (!(await isGroupAdmin(ctx, inviteCode.groupId, user._id))) {
      throw new ConvexError("Only admins can reactivate invite codes");
    }

    // Check if expired
    if (inviteCode.expiresAt && inviteCode.expiresAt < Date.now()) {
      throw new ConvexError("Cannot reactivate expired code");
    }

    await ctx.db.patch(args.codeId, {
      isActive: true,
    });

    return true;
  },
});

// Delete an invite code
export const deleteCode = mutation({
  args: {
    userAddress: v.string(),
    codeId: v.id("groupInviteCodes"),
  },
  handler: async (ctx, args) => {
    const user = await verifyUser(ctx, args.userAddress);
    const inviteCode = await ctx.db.get(args.codeId);

    if (!inviteCode) {
      throw new ConvexError("Invite code not found");
    }

    // Check if user is admin
    if (!(await isGroupAdmin(ctx, inviteCode.groupId, user._id))) {
      throw new ConvexError("Only admins can delete invite codes");
    }

    await ctx.db.delete(args.codeId);

    return true;
  },
});

// Join group using invite code
export const joinWithCode = mutation({
  args: {
    userAddress: v.string(),
    code: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await verifyUser(ctx, args.userAddress);
    const codeUpper = args.code.toUpperCase();

    // Find code
    const inviteCode = await ctx.db
      .query("groupInviteCodes")
      .withIndex("by_code", (q) => q.eq("code", codeUpper))
      .first();

    if (!inviteCode) {
      throw new ConvexError("Invalid invite code");
    }

    if (!inviteCode.isActive) {
      throw new ConvexError("This invite code is no longer active");
    }

    // Check expiration
    if (inviteCode.expiresAt && inviteCode.expiresAt < Date.now()) {
      throw new ConvexError("This invite code has expired");
    }

    // Check max uses
    if (inviteCode.maxUses && inviteCode.uses >= inviteCode.maxUses) {
      throw new ConvexError("This invite code has reached its maximum uses");
    }

    // Check if already a member
    if (await isGroupMember(ctx, inviteCode.groupId, user._id)) {
      throw new ConvexError("You are already a member of this group");
    }

    // Add user to group
    await ctx.db.insert("groupMembers", {
      groupId: inviteCode.groupId,
      userId: user._id,
      role: "member",
      joinedAt: Date.now(),
      invitedBy: inviteCode.createdBy,
    });

    // Increment uses
    await ctx.db.patch(inviteCode._id, {
      uses: inviteCode.uses + 1,
    });

    // Log activities
    await logActivity(ctx, inviteCode.groupId, user._id, "member_joined");
    await logActivity(ctx, inviteCode.groupId, user._id, "code_used", {
      code: codeUpper,
    });

    return inviteCode.groupId;
  },
});
