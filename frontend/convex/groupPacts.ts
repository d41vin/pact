import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { ConvexError } from "convex/values";
import { verifyUser } from "./users";
import { logActivity } from "./groups";

// Get all pacts for a group
export const getGroupPacts = query({
    args: {
        groupId: v.id("groups"),
        userAddress: v.string(),
    },
    handler: async (ctx, args) => {
        const user = await verifyUser(ctx, args.userAddress);

        // Check if user is member of group
        const member = await ctx.db
            .query("groupMembers")
            .withIndex("by_group_user", (q) =>
                q.eq("groupId", args.groupId).eq("userId", user._id)
            )
            .first();

        if (!member) {
            throw new ConvexError("Must be a member to view pacts");
        }

        const pacts = await ctx.db
            .query("groupPacts")
            .withIndex("by_group", (q) => q.eq("groupId", args.groupId))
            .collect();

        // Enrich with creator info
        const pactsWithCreator = await Promise.all(
            pacts.map(async (pact) => {
                const creator = await ctx.db.get(pact.creatorId);
                return {
                    ...pact,
                    creatorName: creator?.name,
                    creatorImage: creator?.profileImageUrl,
                };
            })
        );

        return pactsWithCreator;
    },
});

// Get a single pact by ID
export const getGroupPact = query({
    args: {
        pactId: v.id("groupPacts"),
    },
    handler: async (ctx, args) => {
        const pact = await ctx.db.get(args.pactId);
        if (!pact) return null;

        const creator = await ctx.db.get(pact.creatorId);
        return {
            ...pact,
            creatorName: creator?.name,
            creatorImage: creator?.profileImageUrl,
        };
    },
});

// Register a new pact created on-chain
export const createGroupPact = mutation({
    args: {
        userAddress: v.string(),
        groupId: v.id("groups"),
        contractAddress: v.string(),
        name: v.string(),
        description: v.optional(v.string()),
        chainId: v.number(),
    },
    handler: async (ctx, args) => {
        const user = await verifyUser(ctx, args.userAddress);

        // Check permissions
        const group = await ctx.db.get(args.groupId);
        if (!group) throw new ConvexError("Group not found");

        const member = await ctx.db
            .query("groupMembers")
            .withIndex("by_group_user", (q) =>
                q.eq("groupId", args.groupId).eq("userId", user._id)
            )
            .first();

        if (!member) throw new ConvexError("Not a member of this group");

        // Check if user has permission to create pacts
        if (
            group.permissions?.whoCanCreatePacts === "admins" &&
            member.role !== "admin"
        ) {
            throw new ConvexError("Only admins can create pacts");
        }

        const pactId = await ctx.db.insert("groupPacts", {
            groupId: args.groupId,
            creatorId: user._id,
            contractAddress: args.contractAddress,
            pactType: "group_fund",
            name: args.name,
            description: args.description,
            chainId: args.chainId,
            createdAt: Date.now(),
        });

        await logActivity(ctx, args.groupId, user._id, "pact_created", {
            pactId,
            pactName: args.name,
            contractAddress: args.contractAddress,
        });

        return pactId;
    },
});
