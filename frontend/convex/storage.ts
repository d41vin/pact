// convex/storage.ts
import { mutation } from "./_generated/server";

// Generates a short-lived URL for a client to upload a file to Convex storage.
export const generateUploadUrl = mutation(async (ctx) => {
  return await ctx.storage.generateUploadUrl();
});
