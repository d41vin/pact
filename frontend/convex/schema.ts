import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    name: v.string(),
    username: v.string(),
    email: v.optional(v.string()),
    profileImageUrl: v.optional(v.string()),
    userAddress: v.string(),
  })
    // Index to quickly query for a user by their wallet/smart account address.
    .index("by_userAddress", ["userAddress"])
    // Index to quickly query for a user by their username.
    .index("by_username", ["username"])
    // Index to quickly query for a user by their email.
    .index("by_email", ["email"]),
});
