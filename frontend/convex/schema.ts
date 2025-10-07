import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // Other tables can go here in the future
  users: defineTable({
    name: v.string(),
    username: v.string(),
    profileImageUrl: v.optional(v.string()),
    userAddress: v.string(),
  })
    // Index to quickly query for a user by their wallet/smart account address.
    .index("by_userAddress", ["userAddress"])
    // Index to quickly query for a user by their username.
    // The .unique() constraint ensures no two users can have the same username.
    .index("by_username", ["username"]),
});
