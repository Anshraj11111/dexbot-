# Implementation Plan: Bot Social Ownership

## Overview

Implement user-scoped bot ownership, a bot connect / friend-request system, and a real-time notifications panel. All Firebase calls flow through `Firebase_Manager`; all client state lives in the Zustand `useRobotStore`; all new UI follows the existing `GlassCard` / `NeonButton` / Framer Motion design language. The implementation is split into eight logical groups that build incrementally from the data layer up to the UI.

## Tasks

- [x] 1. Extend Zustand store with friend bots and notifications state
  - [x] 1.1 Add `friendBotIds`, `notifications`, and new actions to `Robot_State_Manager.js`
    - Add `friendBotIds: []` and `notifications: []` to the initial store shape
    - Implement `hydrateFriends(friendBots)` — populates `robots` map and `friendBotIds` (no duplicates)
    - Implement `addFriendBot(botId, ip)` — adds to `friendBotIds` only if absent, creates default robot state if missing
    - Implement `removeFriendBot(botId)` — removes from `friendBotIds` only, leaves `robots` map intact
    - Implement `setNotifications(notifications)` — stores list sorted by `createdAt` descending
    - _Requirements: 4.5, 5.3, 5.4, 5.5, 2.3_

  - [ ]* 1.2 Write property tests for new Zustand store actions
    - **Property 6: Idempotent Friend Hydration** — `hydrateFriends(F)` called N times yields `friendBotIds` with exactly the unique IDs from `F`
    - **Property 8: Notification Sort Order** — `setNotifications(notifs)` always produces descending `createdAt` order for any input permutation
    - **Validates: Requirements 5.3, 2.3**
    - Use `fast-check` arbitraries; place tests in `src/services/__tests__/Robot_State_Manager.test.js`

  - [ ]* 1.3 Write unit tests for `addFriendBot` idempotency and `removeFriendBot`
    - Test that calling `addFriendBot` twice with the same `botId` does not duplicate `friendBotIds`
    - Test that `removeFriendBot` does not delete the entry from `robots` map
    - Test that `addFriendBot` creates a default robot state with `isOnline: false` and `emotion: 'NEUTRAL'`
    - _Requirements: 5.4, 5.5_

- [x] 2. Add new Firebase_Manager methods — ownership and migration
  - [x] 2.1 Implement `getOwnedBots(uid)` and update `registerBot(botId, ip)` in `Firebase_Manager.js`
    - `getOwnedBots(uid)` reads from `users/{uid}/bots` only; returns `[]` if path is empty
    - Update `registerBot(botId, ip)` to write both `users/{uid}/bots/{botId}` and `registered_bots/{botId}` (with `ownerUid`) via `Promise.all`; on partial failure, attempt rollback of the successful write and re-throw
    - `ownerUid` is always taken from `_auth.currentUser.uid`, never from user input
    - _Requirements: 1.2, 1.3, 1.4_

  - [ ]* 2.2 Write property test for `getOwnedBots` isolation
    - **Property 7: Owned Bots Scoped to Auth User** — `getOwnedBots(uid)` reads exclusively from `users/{uid}/bots`; mock Firebase `ref` and assert the path argument never equals `registered_bots`
    - **Validates: Requirements 1.2**
    - Place in `src/services/__tests__/Firebase_Manager.test.js`

  - [ ]* 2.3 Write property test for `registerBot` consistency
    - **Property 9: Bot Registry Consistency** — after `registerBot(botId, ip)` both `users/{uid}/bots/{botId}` and `registered_bots/{botId}` contain matching `ip` and `ownerUid`
    - **Validates: Requirements 1.3**

  - [x] 2.4 Implement `migrateBotsToUser(uid, botIds)` in `Firebase_Manager.js`
    - For each `botId` in `botIds`: write `users/{uid}/bots/{botId}` and update `registered_bots/{botId}/ownerUid = uid`
    - Method must be idempotent — calling it twice with the same args produces no error and leaves data unchanged
    - _Requirements: 1.7_

- [ ] 3. Add new Firebase_Manager methods — connect request flow
  - [x] 3.1 Implement `lookupBotOwner(botId)` and `findPendingRequest(fromBotId, toBotId)` in `Firebase_Manager.js`
    - `lookupBotOwner(botId)` reads `registered_bots/{botId}`; returns `{ ownerUid, name }` or `null` if not found
    - `findPendingRequest(fromBotId, toBotId)` queries `connect_requests` for a matching pair with `status === 'pending'`; returns the request object or `null`
    - _Requirements: 3.1, 3.6_

  - [x] 3.2 Implement `sendConnectRequest(fromUid, fromBotId, toBotId, toOwnerUid)` in `Firebase_Manager.js`
    - Push to `connect_requests/{requestId}` with `status: 'pending'` and all required fields
    - Push to `users/{toOwnerUid}/notifications/{notifId}` with `type: 'connect_request'`
    - Both writes via `Promise.all`; on failure attempt rollback of the successful write and re-throw
    - Returns the generated `requestId`
    - _Requirements: 3.4, 3.8_

  - [ ]* 3.3 Write property test for self-connect rejection
    - **Property 3: No Self-Connection** — for any `fromUid === toOwnerUid`, `sendConnectRequest` always throws before any Firebase write
    - **Validates: Requirements 3.5**
    - Mock `ref`/`push`/`set` and assert they are never called when UIDs match

  - [ ]* 3.4 Write property test for duplicate request rejection
    - **Property 12: Duplicate Request Rejection** — when `findPendingRequest` returns a non-null result, a second `sendConnectRequest` call with the same `(fromBotId, toBotId)` pair is always rejected without creating a new entry
    - **Validates: Requirements 3.6**

- [ ] 4. Add new Firebase_Manager methods — accept, reject, friends, notifications
  - [ ] 4.1 Implement `acceptConnectRequest(requestId, notifId, ownerUid)` in `Firebase_Manager.js`
    - Fetch request; throw if not found or `status !== 'pending'`
    - Write `users/{ownerUid}/friends/{fromBotId}` and `users/{fromUid}/friends/{toBotId}` in parallel
    - Update `connect_requests/{requestId}/status` to `'accepted'`
    - Remove `users/{ownerUid}/notifications/{notifId}`
    - All four operations via `Promise.all`
    - _Requirements: 4.1, 4.2_

  - [x] 4.2 Implement `rejectConnectRequest(requestId, notifId, ownerUid)` in `Firebase_Manager.js`
    - Fetch request; throw if not found or `status !== 'pending'`
    - Update `connect_requests/{requestId}/status` to `'rejected'`
    - Remove `users/{ownerUid}/notifications/{notifId}`
    - No friend entries created
    - _Requirements: 4.3_

  - [ ]* 4.3 Write property test for request status monotonicity
    - **Property 4: Request Status Monotonicity** — status transitions only `pending → accepted` or `pending → rejected`; mock the Firebase read to return `status: 'accepted'` and assert `acceptConnectRequest` throws without writing
    - **Validates: Requirements 3.7**

  - [ ]* 4.4 Write property test for notification cleanup
    - **Property 5: Notification Cleanup** — after `acceptConnectRequest` or `rejectConnectRequest` completes, the notification path `users/{ownerUid}/notifications/{notifId}` is removed; assert `remove()` is called with the correct ref
    - **Validates: Requirements 4.2, 4.3**

  - [x] 4.5 Implement `getFriendBots(uid)` and `listenToNotifications(uid, callback)` in `Firebase_Manager.js`
    - `getFriendBots(uid)` reads `users/{uid}/friends`; returns array of `FriendBot` objects (empty array if none)
    - `listenToNotifications(uid, callback)` attaches `onValue` listener to `users/{uid}/notifications` with `limitToLast(50)`; fires callback immediately and on every change; returns unsubscribe function
    - _Requirements: 2.1, 2.2, 5.1_

  - [ ]* 4.6 Write unit tests for `getFriendBots` and `listenToNotifications`
    - Test `getFriendBots` returns empty array when path is empty
    - Test `listenToNotifications` returns an unsubscribe function and calls callback with sorted notifications
    - _Requirements: 2.2, 5.1_

- [x] 5. Checkpoint — Ensure all Firebase_Manager and store tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 6. Update AuthContext and add new React hooks
  - [-] 6.1 Update `AuthContext.jsx` to hydrate owned bots, friend bots, and start notification listener on login
    - Replace `Firebase_Manager.getRegisteredBots()` call with `Firebase_Manager.getOwnedBots(uid)`
    - After owned bots hydration, call `Firebase_Manager.getFriendBots(uid)` and pass result to `useRobotStore.getState().hydrateFriends()`; catch errors and log without blocking
    - Call `Firebase_Manager.listenToNotifications(uid, notifs => useRobotStore.getState().setNotifications(notifs))` and store the returned unsubscribe function in a ref
    - On logout (or when `user` becomes null), call the stored unsubscribe function before clearing auth state
    - _Requirements: 1.1, 2.4, 5.2_

  - [-] 6.2 Add `useFriendBotIds()` export to `src/hooks/useRobotState.js`
    - `useFriendBotIds()` returns `useRobotStore(s => s.friendBotIds)`
    - _Requirements: 5.1_

  - [-] 6.3 Create `src/hooks/useNotifications.js`
    - Export `useNotifications()` that returns `{ notifications, unreadCount }` from Zustand
    - `unreadCount = notifications.filter(n => !n.read).length`
    - _Requirements: 2.5, 6.2_

  - [ ]* 6.4 Write unit tests for `useNotifications` hook
    - Test `unreadCount` is 0 when all notifications have `read: true`
    - Test `unreadCount` equals the number of notifications with `read: false`
    - _Requirements: 2.5_

- [ ] 7. Create `NotificationBadge` component and update `NavBar`
  - [~] 7.1 Create `src/components/ui/NotificationBadge.jsx`
    - Renders `null` when `count === 0`
    - Renders a small red badge with exact count for 1–99 and `"99+"` for counts above 99
    - Positioned absolutely (top-right) for overlay on parent icon
    - Styled with Tailwind; accessible `aria-label` attribute
    - Export from `src/components/ui/index.js`
    - _Requirements: 2.5, 6.2_

  - [~] 7.2 Update `NavBar.jsx` to add Connect and Notifications nav items with badge
    - Import `UserPlus` and `Bell` from `lucide-react`
    - Import `NotificationBadge` from `@/components/ui`
    - Import `useNotifications` from `@/hooks/useNotifications`
    - Add `{ to: '/connect', icon: UserPlus, label: 'Connect' }` and `{ to: '/notifications', icon: Bell, label: 'Notifications' }` to `NAV_ITEMS`
    - Render the Notifications nav item with a `relative` wrapper div containing `<Bell />` and `<NotificationBadge count={unreadCount} />`
    - Apply the same active-state highlight class as existing nav items
    - Update both desktop sidebar and mobile drawer
    - _Requirements: 6.1, 6.2_

  - [ ]* 7.3 Write unit tests for `NotificationBadge`
    - Test renders `null` at count 0
    - Test renders exact count for 1–99
    - Test renders `"99+"` for count 100 and above
    - _Requirements: 2.5_

- [ ] 8. Create `ConnectPage`
  - [~] 8.1 Create `src/pages/ConnectPage.jsx` with search and send-request UI
    - Input field (max 64 chars) for target Bot ID with Search button
    - On Search: show loading indicator, call `Firebase_Manager.lookupBotOwner(botId)`
    - On success: display bot info `GlassCard` (bot name, owner display name) with "Send Connect Request" `NeonButton`
    - On `null` result: show "Bot not found" error and clear result card
    - On network/permission error: show error toast and render Retry button that re-triggers the same call
    - _Requirements: 3.1, 3.2, 3.3, 7.1_

  - [~] 8.2 Implement connect request submission logic in `ConnectPage.jsx`
    - On "Send Connect Request": validate not self-connect (`fromUid === toOwnerUid` → show "Cannot connect to your own bot" toast, no Firebase call)
    - Call `Firebase_Manager.findPendingRequest(fromBotId, toBotId)`; if pending exists show "Request already pending" toast, no Firebase call; if read fails show error toast and abort
    - Call `Firebase_Manager.sendConnectRequest(fromUid, fromBotId, toBotId, toOwnerUid)`
    - On success: show "Request sent" confirmation, disable Send button
    - On failure: show error toast, re-enable Send button (rollback handled in Firebase_Manager)
    - On new search: re-enable Send button for new result
    - _Requirements: 3.4, 3.5, 3.6, 3.8, 7.2_

  - [ ]* 8.3 Write unit tests for `ConnectPage` validation logic
    - Test self-connect check fires before any Firebase call
    - Test duplicate request check fires before `sendConnectRequest`
    - Test "Bot not found" message shown when `lookupBotOwner` returns `null`
    - _Requirements: 3.3, 3.5, 3.6_

- [ ] 9. Create `NotificationsPage`
  - [~] 9.1 Create `src/pages/NotificationsPage.jsx` with notification list UI
    - Read `notifications` from `useNotifications()` hook
    - Render each notification as a `GlassCard` with sender info (`senderName`, `fromBotId`, `toBotId`) and two `NeonButton`s: Accept and Reject
    - Show empty-state message when no notifications
    - On mount / when page is viewed: mark all visible notifications as `read: true` in Zustand store (update `notifications` array in store), causing NavBar badge to update to zero
    - _Requirements: 2.6, 2.7, 4.4_

  - [~] 9.2 Implement Accept and Reject handlers in `NotificationsPage.jsx`
    - Accept: check `notif.status === 'pending'` client-side; if not, show "Request no longer valid" toast and remove from UI without Firebase call
    - Accept: call `Firebase_Manager.acceptConnectRequest(requestId, notifId, currentUser.uid)`; on success call `useRobotStore.getState().addFriendBot(fromBotId, resolvedIp)` and show "Bot connected!" toast
    - Reject: call `Firebase_Manager.rejectConnectRequest(requestId, notifId, currentUser.uid)`; on success show confirmation toast
    - On any Firebase error: show error toast, keep notification visible, do not modify Zustand state
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 7.3_

  - [ ]* 9.3 Write unit tests for `NotificationsPage` handlers
    - Test stale notification (non-pending status) shows "Request no longer valid" without calling Firebase
    - Test Firebase error keeps notification visible and does not call `addFriendBot`
    - _Requirements: 4.4, 4.6_

- [ ] 10. Update `MessagingPage` with My Bots / Friend Bots sections
  - [~] 10.1 Update `src/pages/MessagingPage.jsx` bot selector to show two labeled sections
    - Import `useFriendBotIds` from `@/hooks/useRobotState`
    - Render "My Bots" section using `useRegisteredBotIds()` (existing)
    - Render "Friend Bots" section using `useFriendBotIds()`; show empty-state label "No friend bots yet" when array is empty (do not hide the section)
    - Both sections use the same bot card/button style as the existing selector
    - Friend bots are selectable as message targets (no changes to send/receive logic)
    - _Requirements: 5.1, 5.5_

  - [ ]* 10.2 Write unit tests for `MessagingPage` bot selector sections
    - Test "Friend Bots" section renders empty-state label when `useFriendBotIds()` returns `[]`
    - Test friend bot IDs appear in the selector when `useFriendBotIds()` returns values
    - _Requirements: 5.1_

- [ ] 11. Add routes to `App.jsx` and update Firebase Security Rules
  - [~] 11.1 Add `/connect` and `/notifications` protected routes to `App.jsx`
    - Add lazy imports: `ConnectPage` and `NotificationsPage`
    - Add two `<Route>` entries inside the existing `<Route element={<ProtectedRoute />}>` block
    - Both routes render inside `<AppLayout>`
    - `ProtectedRoute` already handles unauthenticated redirect to `/login` with path preservation
    - _Requirements: 6.3, 6.4, 6.5_

  - [~] 11.2 Update Firebase Security Rules to enforce ownership and access control
    - `users/{uid}/bots` — read/write only by matching `uid`
    - `users/{uid}/friends` — read/write only by matching `uid`
    - `users/{uid}/notifications` — read/write only by matching `uid`
    - `connect_requests/{requestId}` — write by `fromUid`; status update by `toOwnerUid`; read by either party
    - `registered_bots/{botId}` — write only by authenticated user where `ownerUid === auth.uid`
    - Create or update `firebase-rules.json` (or equivalent rules file) in the project root
    - _Requirements: 1.3, 3.4, 4.1, 4.3_

- [~] 12. Checkpoint — Ensure all tests pass and routes are wired
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 13. Property-based tests for ownership isolation and friend symmetry
  - [ ]* 13.1 Write property test for ownership isolation
    - **Property 1: Ownership Isolation** — for any two distinct UIDs `u1 ≠ u2`, the sets returned by `getOwnedBots(u1)` and `getOwnedBots(u2)` share no common `botId`; use `fast-check` to generate pairs of distinct UIDs and mock Firebase to return disjoint data
    - **Validates: Requirements 1.6**

  - [ ]* 13.2 Write property test for friend symmetry
    - **Property 2: Friend Symmetry** — after `acceptConnectRequest` completes, assert that both `users/{ownerUid}/friends/{fromBotId}` and `users/{fromUid}/friends/{toBotId}` are written; use `fast-check` to generate arbitrary request objects and mock Firebase writes
    - **Validates: Requirements 4.1**

  - [ ]* 13.3 Write property test for bot ID validation
    - **Property 11: Bot ID Validation Rejects Invalid Inputs** — for any string not matching `/^[a-zA-Z0-9_-]+$/` or longer than 64 characters, `registerBot` is rejected before any Firebase write; use `fast-check` string arbitraries filtered to invalid patterns
    - **Validates: Requirements 1.5**

  - [ ]* 13.4 Write property test for friend bots visible in Messaging
    - **Property 10: Friend Bots Visible in Messaging** — for every `botId` in `friendBotIds` after `hydrateFriends` or `addFriendBot`, a corresponding entry exists in `robots` map with at least `botId`, `ip`, and `isOnline: false`
    - **Validates: Requirements 5.5**

- [~] 14. Final checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation at the service, hook, and UI layers
- Property tests validate universal correctness properties using `fast-check` (already in `package.json`)
- Unit tests validate specific examples and edge cases
- The design uses TypeScript-style interfaces for documentation; all implementation files are `.js` / `.jsx` (JavaScript)
- Firebase Security Rules (task 11.2) should be applied via the Firebase Console or CLI — the task creates the rules file for review
- `ProtectedRoute` already handles unauthenticated redirects; no changes needed to that component

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["1.2", "1.3", "2.1", "2.4"] },
    { "id": 2, "tasks": ["2.2", "2.3", "3.1", "3.2"] },
    { "id": 3, "tasks": ["3.3", "3.4", "4.1", "4.2"] },
    { "id": 4, "tasks": ["4.3", "4.4", "4.5"] },
    { "id": 5, "tasks": ["4.6", "6.1", "6.2", "6.3"] },
    { "id": 6, "tasks": ["6.4", "7.1"] },
    { "id": 7, "tasks": ["7.2", "8.1"] },
    { "id": 8, "tasks": ["7.3", "8.2", "9.1"] },
    { "id": 9, "tasks": ["8.3", "9.2", "10.1"] },
    { "id": 10, "tasks": ["9.3", "10.2", "11.1", "11.2"] },
    { "id": 11, "tasks": ["13.1", "13.2", "13.3", "13.4"] }
  ]
}
```
