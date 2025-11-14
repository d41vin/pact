// Run once to populate system pacts

import { mutation } from "./_generated/server";
import { v } from "convex/values";

export const seedSystemPacts = mutation({
  args: {},
  handler: async (ctx) => {
    // Check if already seeded
    const existing = await ctx.db
      .query("pacts")
      .filter((q) => q.eq(q.field("category"), "system"))
      .first();

    if (existing) {
      return { message: "System pacts already seeded" };
    }

    // 1. Group Fund
    await ctx.db.insert("pacts", {
      name: "Group Fund",
      description: "Pooled savings for group expenses and shared goals",
      type: "group",
      category: "system",
      icon: "wallet",
      color: "#3B82F6",
      isActive: true,
      version: "1.0.0",
      config: {
        requiredFields: ["instanceName"],
        optionalFields: ["goal", "deadline"],
        minMembers: 1,
      },
    });

    // 2. Expense Split
    await ctx.db.insert("pacts", {
      name: "Expense Split",
      description: "Split bills and expenses equally or by custom ratios",
      type: "group",
      category: "system",
      icon: "split",
      color: "#10B981",
      isActive: true,
      version: "1.0.0",
      config: {
        requiredFields: ["instanceName", "splitMethod"],
        optionalFields: ["autoSettle", "reminderEnabled"],
        minMembers: 2,
      },
    });

    // 3. Loan Pool
    await ctx.db.insert("pacts", {
      name: "Loan Pool",
      description:
        "Internal lending with tracked repayments and approval voting",
      type: "group",
      category: "system",
      icon: "hand-coins",
      color: "#F59E0B",
      isActive: true,
      version: "1.0.0",
      config: {
        requiredFields: ["instanceName", "maxLoanAmount", "votingThreshold"],
        optionalFields: ["interestRate", "repaymentPeriod"],
        minMembers: 3,
      },
    });

    // 4. Investment Club
    await ctx.db.insert("pacts", {
      name: "Investment Club",
      description: "Pool funds for group investments with profit sharing",
      type: "group",
      category: "system",
      icon: "trending-up",
      color: "#8B5CF6",
      isActive: true,
      version: "1.0.0",
      config: {
        requiredFields: [
          "instanceName",
          "minimumInvestment",
          "profitDistribution",
        ],
        optionalFields: ["lockPeriod", "votingRequired"],
        minMembers: 2,
      },
    });

    return { message: "System pacts seeded successfully", count: 4 };
  },
});

// Query to list available pact templates
export const listAvailablePacts = mutation({
  args: {
    type: v.optional(v.union(v.literal("personal"), v.literal("group"))),
    category: v.optional(
      v.union(
        v.literal("system"),
        v.literal("private"),
        v.literal("community"),
      ),
    ),
  },
  handler: async (ctx, args) => {
    const query = ctx.db
      .query("pacts")
      .filter((q) => q.eq(q.field("isActive"), true));

    if (args.type) {
      const results = await query.collect();
      return results.filter((p) => p.type === args.type);
    }

    if (args.category) {
      const results = await query.collect();
      return results.filter((p) => p.category === args.category);
    }

    return await query.collect();
  },
});
