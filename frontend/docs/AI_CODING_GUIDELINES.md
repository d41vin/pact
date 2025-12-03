# AI Coding Guidelines for PACT Project

This document contains important guidelines for AI assistants working on this codebase.

## Date/Time Formatting Rules

### ✅ ALWAYS Use `date-fns` via Shared Utilities

**Rule:** For all date/time formatting, use `date-fns` via shared utilities in `lib/date-utils.ts`. Never write custom date formatting logic.

### Available Utility Functions

Import from `@/lib/date-utils`:

```typescript
import { formatTimeAgo, formatFullDate, formatAddress } from "@/lib/date-utils";
```

#### 1. `formatTimeAgo(timestamp: number): string`

- **Purpose:** Format timestamp as relative time
- **Returns:** "5 minutes ago", "2 hours ago", "3 days ago"
- **Use for:** Recent activity, notifications, payment history

```typescript
// ✅ CORRECT
import { formatTimeAgo } from "@/lib/date-utils";
const timeString = formatTimeAgo(payment.timestamp);

// ❌ WRONG - Don't write custom logic
const seconds = Math.floor((Date.now() - timestamp) / 1000);
if (seconds < 60) return "just now";
```

#### 2. `formatFullDate(timestamp: number): string`

- **Purpose:** Format timestamp as full date with time
- **Returns:** "Dec 1, 2023, 2:30 PM"
- **Use for:** Transaction details, detailed timestamps

```typescript
// ✅ CORRECT
import { formatFullDate } from "@/lib/date-utils";
const dateString = formatFullDate(payment.timestamp);

// ❌ WRONG - Don't use native Date methods directly
const dateString = new Date(timestamp).toLocaleDateString("en-US", {...});
```

#### 3. `formatAddress(address: string): string`

- **Purpose:** Truncate wallet addresses for display
- **Returns:** "0x1234...5678"
- **Use for:** Displaying wallet addresses in UI

```typescript
// ✅ CORRECT
import { formatAddress } from "@/lib/date-utils";
const shortAddress = formatAddress(user.walletAddress);

// ❌ WRONG - Don't write inline truncation
const shortAddress = `${address.slice(0, 6)}...${address.slice(-4)}`;
```

### Adding New Date Formats

If you need a new date format:

1. **Add it to `lib/date-utils.ts` first**
2. **Use `date-fns` functions** (import from `date-fns`)
3. **Document with JSDoc comments**
4. **Export the function**

Example:

```typescript
/**
 * Format timestamp as short date (e.g., "Dec 1, 2023")
 */
export function formatShortDate(timestamp: number): string {
  return format(timestamp, "MMM d, yyyy");
}
```

### Why This Rule Exists

1. **Eliminates code duplication** - Single source of truth
2. **Consistency** - Same format across the entire app
3. **Maintainability** - Change format in one place
4. **Internationalization** - Easy to add i18n support later
5. **Reliability** - `date-fns` handles edge cases (timezones, DST, leap years)
6. **Already installed** - `date-fns` is in package.json, use it!

### Migration Strategy

- ✅ **New code:** MUST use `date-fns` utilities
- ⚠️ **Existing code:** Refactor when you touch those files
- 📝 **Found custom logic?** Add a TODO comment for future cleanup

### Files Already Migrated

- ✅ `frontend/components/home/user-recipient-input.tsx`
- ✅ `frontend/components/notifications/notification-base.tsx`
- ✅ `frontend/app/groups/[id]/page.tsx`
- ✅ `frontend/app/groups/page.tsx`
- ✅ `frontend/components/home/send-payment-sheet.tsx`
- ✅ `frontend/components/notifications/payments-received.tsx`
- ✅ `frontend/components/groups/invite-codes-modal.tsx`

**All files have been migrated! 🎉**

---

## Other Coding Standards

### Package Management

- **ALWAYS use package managers** (npm, pnpm, yarn) for dependencies
- **NEVER manually edit** `package.json` to add/remove dependencies
- Use `npm install <package>` or `pnpm add <package>`

### Type Safety

- **Avoid `any` types** - Use proper TypeScript types
- **Use type guards** when narrowing types
- **Define interfaces** for complex objects

### React Best Practices

- **Use hooks correctly** - Follow Rules of Hooks
- **Avoid impure functions in render** - Use `useState`, `useMemo`, `useCallback`
- **Clean up effects** - Always return cleanup functions from `useEffect`

---

**Last Updated:** 2025-12-01
**Maintained By:** Development Team
