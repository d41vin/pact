/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as blocks from "../blocks.js";
import type * as claimLinks from "../claimLinks.js";
import type * as friendships from "../friendships.js";
import type * as groups from "../groups.js";
import type * as inviteCodes from "../inviteCodes.js";
import type * as notifications from "../notifications.js";
import type * as pacts from "../pacts.js";
import type * as paymentLinks from "../paymentLinks.js";
import type * as paymentRequests from "../paymentRequests.js";
import type * as payments from "../payments.js";
import type * as seedPacts from "../seedPacts.js";
import type * as storage from "../storage.js";
import type * as users from "../users.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  blocks: typeof blocks;
  claimLinks: typeof claimLinks;
  friendships: typeof friendships;
  groups: typeof groups;
  inviteCodes: typeof inviteCodes;
  notifications: typeof notifications;
  pacts: typeof pacts;
  paymentLinks: typeof paymentLinks;
  paymentRequests: typeof paymentRequests;
  payments: typeof payments;
  seedPacts: typeof seedPacts;
  storage: typeof storage;
  users: typeof users;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
