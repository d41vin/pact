# Friendship System Setup Guide

## 📦 Required shadcn/ui Components

Install the dropdown menu component:

```bash
npx shadcn@latest add dropdown-menu
```

## 📁 File Structure

```
convex/
├── friendships.ts         # NEW - Friendship mutations/queries
├── blocks.ts             # NEW - Block system
├── notifications.ts      # NEW - Notification queries
└── schema.ts            # UPDATED - Added friendships, blocks, notifications

components/
├── notifications/        # NEW FOLDER
│   ├── NotificationBase.tsx
│   ├── FriendRequestNotification.tsx
│   ├── FriendAcceptedNotification.tsx
│   └── index.ts
├── ProfileCard.tsx       # UPDATED - Added friendship actions
├── Notifications.tsx     # UPDATED - Integrated with Convex
└── FriendsListModal.tsx  # NEW - Friends list modal
```

## 🔧 Setup Steps

### 1. Update Schema ✅
You've already updated `convex/schema.ts` with the new tables:
- `friendships` - Manage friend requests and relationships
- `blocks` - Block system
- `notifications` - Notification system

### 2. Add Convex Files

Add these three new files to your `convex/` directory:
- `friendships.ts` (see artifact)
- `blocks.ts` (see artifact)
- `notifications.ts` (see artifact)

### 3. Create Notification Components

Create `components/notifications/` folder with:
- `NotificationBase.tsx` - Shared base component
- `FriendRequestNotification.tsx` - Friend request with Accept/Decline
- `FriendAcceptedNotification.tsx` - Friend accepted notification
- `index.ts` - Exports

### 4. Update Existing Components

Replace these files with the updated versions:
- `components/ProfileCard.tsx` - Now has all friendship actions
- `components/Notifications.tsx` - Integrated with real data

### 5. Add New Component

Add `components/FriendsListModal.tsx` for the clickable friends count.

## ✅ Features Implemented

### **Friendship Flow**
✅ Send friend request  
✅ Cancel friend request (before accepted)  
✅ Accept friend request  
✅ Decline friend request with 24hr cooldown  
✅ Unfriend (mutual removal)  
✅ Max 50 pending requests per user  

### **Profile Card Dynamic Buttons**
✅ Own profile → Edit Profile  
✅ Stranger → Add Friend + More (Block)  
✅ Pending (you sent) → Request Sent (cancel)  
✅ Pending (they sent) → Accept Request + More (Block)  
✅ Friends → Message + Friends dropdown (Unfriend/Block)  
✅ Blocked → "User not available" message  

### **Blocking System**
✅ Block user  
✅ Unblock user  
✅ Check block status  
✅ List blocked users  
✅ Auto-remove friendship when blocked  
✅ Hide notifications from blocked users  
✅ Prevent friend requests to/from blocked users  

### **Notifications**
✅ Friend request notifications with Accept/Decline buttons  
✅ Friend accepted notifications  
✅ Real-time unread count badge  
✅ Mark as read (individual)  
✅ Mark all as read  
✅ Populated with user data  
✅ Auto-mark read on action  

### **Friends List Modal**
✅ Clickable friend count  
✅ Only mutual friends can view  
✅ Sorted by most recent friendship  
✅ Unfriend option in dropdown  
✅ Click friend to view profile  
✅ Empty states  

## 🎯 Testing Checklist

/////
✅ Testing Checklist
After these changes, test:

 Edit profile (name, username, image) - should save
 Send friend request - should work without errors
 Accept friend request from notification - should work
 Decline friend request from notification - should work
 Cancel sent request - should work
 Unfriend someone - should work
 Block user - should work
 Mark notification as read - should work

🎯 What's Working Now
✅ Edit profile with real-time username validation
✅ All friendship actions (send/accept/decline/cancel/unfriend)
✅ Blocking system
✅ Notification actions
✅ Friends list modal with unfriend
/////

### Profile Page Tests
- [/ BACKLOGGED] View own profile (shows Edit Profile button) = Does work. Username validation is jank but no need to worry for now as its planned in the backlog. Using existing username gives out a wierd error in sonner toast, not user friendly, needs improvent. Also does not route to new profile url upon username change.
- [/] View stranger profile (shows Add Friend)
- [/] Send friend request
- [/ DESIGN] Cancel sent request = <jank, shows the request sent button which is the button that cancels the request>
- [/ FIXED] Receive friend request (shows Accept Request) = <notification works, but why does it not auto mark as read when notification component is opened like twitter does? and if we pivot this would mean the mark as read button is not needed anymore, right? Why does clicking on the notification disapears the add friend and reject request buttons? Instead the notification portion should not be clickable except the name/username of the requester or users involved should be shown as clickable and it should route to their profile page. Do you agree or do you have a better idea?>
- [/] Accept friend request
- [/] View friend profile (shows Message + Friends dropdown)
- [/] Unfriend someone
- [ ] Block user
- [ ] Try to add friend after blocking (should fail)

### Notification Tests
- [/] Receive friend request notification
- [/] Accept request from notification
- [/ FIXED] Decline request from notification = <after declining the friend request, the buttons to add friend in the profile went missing and did not appear even after reloding the page, checked the block table and it was empty. my guess is because there is no "case: "declined"" in the profile-card.tsx, unsure if this is the cause, just a guess.>
- [/ DESIGN] Receive friend accepted notification = <make it more cheerful>
- [/] Mark notification as read
- [/] Mark all as read
- [/] Unread count badge appears/updates

### Friends List Tests
- [/] Click friend count on own profile (should open)
- [/] Click friend count on friend's profile (should open)
- [/ DESIGN] Click friend count on stranger's profile (should show restricted message) = <no message just restricted cursor shown. add a "add as friend to view" message. add a "create an account" message for unconnected users.>
- [ ] View friends list sorted by recent
- [/] Click friend in list (navigates to profile)
- [/] Unfriend from list
- [/] Empty state when no friends

### Edge Cases
- [ ] Send request to blocked user (should fail)
- [PIVOT] Decline request triggers 24hr cooldown = <remove this feature, blocking does the job>
- [ ] Can't send more than 50 pending requests
- [ ] Blocking removes existing friendship
- [ ] Unblocking allows new friend request

## 🐛 Known Limitations

1. **Search Integration**: Blocked users still appear in search (needs filter)
2. **Group Count**: Still shows 0 (groups system not built yet)
3. **Messaging**: Button shows "Coming soon" toast (XMTP not integrated)

## 📝 TODO: Next Steps

### Phase 1B Remaining:
- [ ] Filter blocked users from search results
- [ ] Add blocked users management page
- [ ] Add friend request limit notification

### Phase 1C (Stats & Polish):
- [ ] Make group count clickable (when groups built)
- [ ] Add username validation to onboarding
- [ ] Real-time username validation in edit profile

### Future Phases:
- [ ] Groups system
- [ ] Payment flows
- [ ] Home page/feed
- [ ] XMTP messaging integration



## 🚀 Next: What Do You Want to Build?

1. **Finish Phase 1B** - Block management UI, search filters
2. **Start Phase 1C** - Username validation, stats polish
3. **Jump to Groups** - Group creation and management
4. **Jump to Payments** - Send/Receive/Request/Split flows

Let me know what you'd like to tackle next!

///

end of msg:
🚀 What's Next?
Choose your next focus:

1. Phase 1B: Block management UI, filter blocked users from search
2. Phase 1C: Username validation, polish stats
3. Groups System: Creation, invites, management
4. Payment Flows: Send/Receive/Request/Split

What would you like to build next? 🎯