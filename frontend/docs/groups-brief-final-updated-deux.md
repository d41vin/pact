# 🧱 PACT — Groups Feature (Final System Brief v2)

## Overview

The **Groups** feature is inspired by Venmo’s “Groups” but reimagined for Pact — far beyond simple bill-splitting.  
Groups act as **collective profiles** where users collaborate financially and socially using modular tools called **Pacts**.

---

---

## ⚙️ 1. Structure: “Groups” Page vs “Group” Page

### **1.1 Groups Page (`/groups`)**

The user’s **home for all groups** they own or belong to.

Includes:

- **Create Group** button → opens modal for name, description, accent color, image/emoji, and invite friends.
- **Global Activity Feed** → combined recent activities from all groups user is a member of (implemented in MVP).
- **List of Group Cards** → each showing:
  - Group name, image or emoji
  - Accent color background
  - Avatar stack (3 members + “+X”)
  - Clicking navigates to `/groups/[id]`

---

### **1.2 Group Page (`/groups/[group-id]`)**

Each group has its own dedicated page — its **collective identity**.

#### **Top Section: Group Profile Card**

- Group name, description, and image or emoji.
- Accent color header background.
- Avatar stack (clickable to view all members).
- Buttons:
  - **Create / Use Pact**
  - **Group Settings**

If the user lacks access:

- Shows **Access Component** instead of full content.
- If logged in → shows access options (for MVP: **Request Access only**).
- If not logged in → message: “Sign up or log in to join this group.”

---

## ⚙️ 2. Privacy, Visibility & Access

### **Privacy**

- Default: **Public**
- Can be toggled **Private** by admin.
- Private groups are **hidden** from non-member views on profiles.

### **Visibility**

- Public groups show on user profiles but aren’t globally searchable.
- Private groups appear only to members.
- Visiting a group without access loads the **Access Component**.

### **Access Methods**

For MVP:

- ✅ **Request Access only**  
  (Invite Code and NFT gating planned for Phase 2.)

Admins will later be able to choose from:

- 🔑 Request Access
- 🧾 Invite Code
- 🧬 NFT Verification

When access is granted, the user immediately joins and the event appears in the activity feed.

---

## ⚙️ 3. Group Settings

Manages customization, roles, permissions, and membership.

### **Editable Info**

Admins can update:

- Name, description, image/emoji, accent color.

### **Roles**

- **Admin**
  - Group creator is always an admin.
  - Can assign/remove admins.
  - Can edit group info.
  - Can remove members.
  - Can delete group (creator only).

- **Member**
  - Can view, use pacts, chat, and leave group.
  - Can invite friends (configurable).
  - Can create new pacts (configurable).

### **Permissions Configurable in Settings**

- Who can send invites: all members / admins / select members.
- Who can create pacts: all members / admins only.

### **Creator Rules**

- Cannot leave, be removed, or be demoted.
- Ensures permanent admin presence.

---

## ⚙️ 4. Invitations

### **Invite Logic**

- Only **friends** can be invited.
- No expiration — can be cancelled manually.
- **Dropdown menu** on a friend’s profile (next to “Message”) contains **“Send Group Invite”**.
- Modal shows groups user belongs to → “Invite” → updates to “Invited ✅”.

### **Notifications**

- Sent → invitee notified.
- Cancelled → invitee notified.
- Accepted → confirmation appears in both users’ activity feeds.

### **Schema**

```ts
groupInvitations: {
  groupId: v.id("groups"),
  inviterId: v.id("users"),
  inviteeId: v.id("users"),
  status: v.union(
    v.literal("pending"),
    v.literal("accepted"),
    v.literal("cancelled")
  ),
  createdAt: v.number(),
  respondedAt?: v.number(),
}

```

This structure supports notifications, status tracking, and prevents duplicates.

---

## ⚙️ 5. Membership

### **Removing Members**

- Admin removes → member notified and removed.
- To rejoin, member must be reinvited.

### **Leaving**

- Confirmation dialog required.
- Admins can leave if others exist.
- Creator cannot leave.

---

## ⚙️ 6. Tabs

Tab

Purpose

**Activity**

Displays recent group actions (joins, changes, pacts, etc.)

**Pacts**

Lists group’s pacts

**Chat**

XMTP-based chat between members

MVP implements **Activity tab** only.

---

## ⚙️ 7. Activity System

### **Tracked Events**

- Member joined/left
- Admin promoted/demoted
- Group info changed
- Pact created/used
- Settings changed

### **Display**

- ✅ **Global Feed** (on `/groups`) — recent activity from all groups user is in.
- ✅ **Per-Group Feed** (on group page) — complete history.

### **Schema**

```ts
groupActivities: {
  groupId: v.id("groups"),
  actorId: v.id("users"),
  type: v.union(
    v.literal("member_joined"),
    v.literal("member_left"),
    v.literal("pact_created"),
    v.literal("pact_used"),
    v.literal("settings_changed"),
    v.literal("admin_promoted"),
    v.literal("admin_demoted")
  ),
  metadata: v.any(),
  createdAt: v.number(),
}

```

---

## ⚙️ 8. Create Group Modal

Field

Required

Notes

**Name**

✅

Unique per user

**Description**

🟡

Optional (≤ 300 chars)

**Accent Color**

✅

Rainbow palette, default Blue

**Image / Emoji**

✅

Must choose one

**Invite Friends**

🟡

Optional during creation

### **Emoji**

- Stored as a **Unicode character** (e.g. “🎉”) for simplicity and compatibility.
- Picker: lightweight, modern — **Frimousse**.
- Images: same upload logic as profiles (max 5 MB, JPG/PNG/WebP).

---

## ⚙️ 9. Pacts in Groups

Each Pact = modular financial mechanism or programmable mini-app.

### **Structure**

```ts
pacts: {
  name: v.string(),
  description: v.string(),
  type: v.union(v.literal("personal"), v.literal("group")),
  category: v.union(v.literal("system"), v.literal("private"), v.literal("community")),
  contractAddress?: v.string(),
  creatorId?: v.id("users"),
  isActive: v.boolean(),
}

groupPacts: {
  groupId: v.id("groups"),
  pactId: v.id("pacts"),
  instanceName?: v.string(),
  createdBy: v.id("users"),
  createdAt: v.number(),
  config: v.any(),
}

```

### **MVP**

Two placeholder buttons:

- **Use Existing Pact**
- **Create New Pact**

Both open modals (mock or “Coming soon”).  
Optionally mock **one simple system pact** (“Group Fund”) for visual testing.

---

## ⚙️ 10. Hedera Integration

- No contracts yet — planned next phase.
- Groups don’t have shared wallets by default.
- Multisig or treasury wallets exist as **Pacts**.
- Each Pact links to a contract address + ABI on Hedera.
- Users handle any transaction costs.

---

## ⚙️ 11. UI / UX

### **Groups Page Layout**

```
┌───────────────────────────────┐
│ Create Group [+]              │
├───────────────────────────────┤
│ Recent Activity Feed          │
│ - Activity 1                  │
│ - Activity 2                  │
│ [Show More]                   │
├───────────────────────────────┤
│ Your Groups                   │
│ ┌─────┐ ┌─────┐ ┌─────┐      │
│ │Grp1│ │Grp2│ │Grp3│        │
│ └─────┘ └─────┘ └─────┘      │
└───────────────────────────────┘

```

### **Group Cards**

- Show name, accent color, and member avatar stack.
- Avatar stack opens modal for all members.
- No unread badges or member counts.

---

## ⚙️ 12. Database Schema Summary

### `groups`

Field

Type

Notes

name

string

description

string

imageOrEmoji

string

stored as Unicode if emoji

accentColor

string

predefined palette

creatorId

userId

createdAt

number

privacy

enum(public/private)

joinMethod

enum(request/invite/nft)

MVP: request only

### `groupMembers`

groupId

userId

role

joinedAt

invitedBy?

### `groupInvitations`

(as per schema above)

### `groupActivities`, `pacts`, and `groupPacts`

(as defined earlier)

---

## ⚙️ 13. MVP Scope & Priorities

### **MVP (Phase 1)**

- Groups schema + core mutations
- Create Group flow
- `/groups` page (with global feed)
- `/groups/[id]` (profile + activity tab)
- Group settings (members, info)
- Invitations system
- Basic access control (Request Access)
- Pacts + Chat placeholders

### **Priority Order**

1.  Database + schema
2.  Core mutations (foundation-first build)
3.  Create flow
4.  Pages + tabs
5.  Settings + access
6.  Polish

---

## ⚙️ 14. Technical Constraints

- No group size limit.
- Only profile/group images stored.
- Hedera fees borne by users.
- No immediate resource constraints.

---

## 🧭 15. Long-Term Roadmap

1.  **System Pacts (MVP)**
2.  **Custom Pact Builder**
3.  **Community Pact Publishing**
4.  **Reputation Layer**
5.  **Governance Add-ons**

---

## 🎯 16. Summary

The **Groups** feature evolves Pact into a **programmable coordination layer** — blending finance, collaboration, and social identity.  
Groups begin as social-financial collectives and grow into customizable hubs for shared logic and programmable agreements.

---
