# Requirements Document

## Introduction

The Bot Social Ownership feature extends the DexBot web dashboard with three interconnected capabilities:

1. **User-scoped bot ownership** — each authenticated user sees only the bots they have registered; the global `registered_bots` index is used only for lookups, never as the source of truth for a user's fleet.
2. **Bot connect / friend-request system** — a user can search for any bot by its Bot ID, send a connect request to that bot's owner, and receive a mutual "friend" link once the owner accepts.
3. **Notifications panel** — incoming connect requests surface as real-time notifications with Accept and Reject actions.
4. **Friend bots in messaging** — accepted friend bots appear alongside owned bots in the Messaging page's bot selector.

All new Firebase interactions flow through `Firebase_Manager`; all new client state lives in the Zustand `useRobotStore`; all new UI follows the existing `GlassCard` / `NeonButton` / Framer Motion design language.

---

## Glossary

- **Dashboard**: The DexBot web application.
- **User**: An authenticated Firebase user identified by a unique `uid`.
- **Owned Bot**: A bot registered by the current user, stored at `users/{uid}/bots/{botId}`.
- **Friend Bot**: A bot owned by another user that the current user has connected with, stored at `users/{uid}/friends/{friendBotId}`.
- **Bot ID**: A non-empty string of 1–64 characters matching `/^[a-zA-Z0-9_-]+$/` that uniquely identifies a bot in the global registry.
- **Connect Request**: A pending invitation from one user's bot to another user's bot, stored at `connect_requests/{requestId}`.
- **Notification**: A real-time alert delivered to a user at `users/{uid}/notifications/{notifId}`, currently only of type `connect_request`.
- **Firebase_Manager**: The singleton service that encapsulates all Firebase Realtime Database and Auth SDK calls.
- **Robot_State_Manager**: The Zustand store that holds all client-side robot and notification state.
- **ConnectPage**: The new page at `/connect` where users search for bots and send connect requests.
- **NotificationsPage**: The new page at `/notifications` where users view and act on incoming connect requests.
- **NavBar**: The existing navigation sidebar, extended with Connect and Notifications links.
- **MessagingPage**: The existing messaging page, extended to show both owned and friend bots.

---

## Requirements

### Requirement 1: User-Scoped Bot Ownership

**User Story:** As an authenticated user, I want to see only my own registered bots in the dashboard, so that my fleet is private and not mixed with other users' bots.

#### Acceptance Criteria

1. WHEN a user logs in, THE Dashboard SHALL load only the bots stored at `users/{uid}/bots` for that user's `uid` and display them in the fleet view.
2. THE Firebase_Manager SHALL expose a `getOwnedBots(uid)` method that reads exclusively from `users/{uid}/bots` and never from the global `registered_bots` path.
3. WHEN a user registers a new bot with a valid Bot ID (matching `/^[a-zA-Z0-9_-]+$/`, 1–64 characters) and a non-empty IP address, THE Firebase_Manager SHALL write the bot entry to both `users/{uid}/bots/{botId}` and `registered_bots/{botId}` using `Promise.all`, including `ownerUid` set to `_auth.currentUser.uid`.
4. IF either write in the `Promise.all` registration call rejects, THEN THE Firebase_Manager SHALL catch the error, attempt to remove any partially written entry from the other path, and re-throw the error so the caller can display a failure message.
5. THE Dashboard SHALL enforce that a Bot ID matches `/^[a-zA-Z0-9_-]+$/` and is between 1 and 64 characters; IF a Bot ID fails either rule, THEN THE Dashboard SHALL reject the registration before any Firebase call and display a specific validation error message identifying which rule was violated.
6. IF two distinct users each call `getOwnedBots` with their respective `uid` values, THEN the returned arrays SHALL contain no common `botId` values — no bot SHALL appear in both users' owned lists simultaneously.
7. WHERE an existing bot in `registered_bots` has no `ownerUid` field, THE Firebase_Manager SHALL provide a `migrateBotsToUser(uid, botIds)` method that writes `users/{uid}/bots/{botId}` and sets `registered_bots/{botId}/ownerUid = uid` for each bot in the list; calling the method a second time with the same arguments SHALL produce no error and SHALL leave the data unchanged.
8. WHEN a user logs in and has no bots registered under `users/{uid}/bots`, THE Dashboard fleet view SHALL display an empty-state message prompting the user to register their first bot.

---

### Requirement 2: Real-Time Notifications

**User Story:** As a bot owner, I want to receive real-time notifications when another user sends a connect request to one of my bots, so that I can promptly accept or reject the request.

#### Acceptance Criteria

1. WHEN a connect request is successfully written to Firebase, THE Dashboard SHALL reflect the new notification in the NotificationsPage within 1 second under normal network conditions.
2. THE Firebase_Manager SHALL expose a `listenToNotifications(uid, callback)` method that fires the callback with the current notification list within 1 second of attachment and fires again within 1 second of every subsequent change to `users/{uid}/notifications`.
3. THE Robot_State_Manager SHALL expose a `setNotifications(notifications)` action that stores the notification list sorted by `createdAt` descending, regardless of the order in which entries are delivered by Firebase.
4. WHEN the user logs out, THE Dashboard SHALL call the unsubscribe function returned by `listenToNotifications` before clearing auth state, preventing memory leaks and stale callbacks.
5. IF the unread notification count is greater than zero, THE NavBar SHALL display a badge showing the exact count for 1–99 unread notifications and "99+" for counts above 99; IF the unread count is zero, THE NavBar SHALL not render the badge element.
6. THE NotificationsPage SHALL display an empty-state message WHEN the user has no unread notifications (i.e., no notifications where `read === false`).
7. WHEN a user views the NotificationsPage, THE Dashboard SHALL mark all visible notifications as `read: true` in the Zustand store, causing the NavBar badge to update to zero.

---

### Requirement 3: Bot Connect / Friend-Request System

**User Story:** As a user, I want to search for another user's bot by Bot ID and send a connect request, so that I can establish a social link between my bot and theirs.

#### Acceptance Criteria

1. THE ConnectPage SHALL provide an input field (max 64 characters) for a target Bot ID and a Search button; WHEN the Search button is clicked, THE ConnectPage SHALL call `Firebase_Manager.lookupBotOwner(botId)` and display a loading indicator while the call is in progress.
2. WHEN `lookupBotOwner` returns a result, THE ConnectPage SHALL display a bot info card showing the bot's name and owner display name.
3. IF `lookupBotOwner` returns `null`, THEN THE ConnectPage SHALL display a "Bot not found" error message and clear any previously shown result card.
4. WHEN the user clicks "Send Connect Request" and both Firebase writes succeed, THE ConnectPage SHALL confirm success; IF either write fails, THEN THE ConnectPage SHALL attempt to roll back the successful write, display an error message, and re-enable the Send button.
5. IF the user attempts to send a connect request to a bot they own (i.e., `fromUid === toOwnerUid`), THEN THE ConnectPage SHALL reject the action before any Firebase write and display a "Cannot connect to your own bot" message.
6. IF a pending connect request already exists for the same `fromBotId` and `toBotId` pair, THEN THE ConnectPage SHALL reject the duplicate before any Firebase write and display a "Request already pending" message; IF the Firebase read to check for duplicates fails, THEN THE ConnectPage SHALL display an error toast and not proceed with the send.
7. A connect request's `status` field SHALL transition only from `"pending"` to `"accepted"` or from `"pending"` to `"rejected"` and SHALL never revert to `"pending"` once resolved.
8. WHEN a connect request is successfully submitted, THE ConnectPage SHALL display a "Request sent" confirmation message and disable the Send button; WHEN the user performs a new search, THE ConnectPage SHALL re-enable the Send button for the new result.

---

### Requirement 4: Accept and Reject Connect Requests

**User Story:** As a bot owner, I want to accept or reject incoming connect requests from the Notifications page, so that I control which users can interact with my bots.

#### Acceptance Criteria

1. WHEN a user accepts a connect request, THE Firebase_Manager SHALL write both `users/{ownerUid}/friends/{fromBotId}` and `users/{fromUid}/friends/{toBotId}`; after the operation completes, both entries SHALL be readable from Firebase, confirming mutual friendship.
2. WHEN a user accepts a connect request, THE Firebase_Manager SHALL update `connect_requests/{requestId}/status` to `"accepted"` and remove `users/{ownerUid}/notifications/{notifId}`.
3. WHEN a user rejects a connect request, THE Firebase_Manager SHALL update `connect_requests/{requestId}/status` to `"rejected"` and remove `users/{ownerUid}/notifications/{notifId}`, without creating any friend entries.
4. IF a user attempts to accept or reject a connect request whose status is no longer `"pending"`, THEN THE NotificationsPage SHALL immediately display a "Request no longer valid" message and remove the stale notification from the UI without any Firebase write.
5. WHEN a connect request is accepted, THE Robot_State_Manager SHALL add the requester's bot to `friendBotIds` and create a robot state entry in the `robots` map with at least `botId`, `ip`, `isOnline: false`, and `emotion: "NEUTRAL"`.
6. IF `Firebase_Manager.acceptConnectRequest` or `Firebase_Manager.rejectConnectRequest` throws an error, THEN THE NotificationsPage SHALL display an error toast, keep the notification visible in the UI, and not modify any Zustand state.

---

### Requirement 5: Friend Bots in Messaging

**User Story:** As a user, I want to see my accepted friend bots alongside my own bots in the Messaging page, so that I can send messages to friend bots without navigating away.

#### Acceptance Criteria

1. THE MessagingPage bot selector SHALL display two labeled sections: "My Bots" (owned bots from `useRegisteredBotIds()`) and "Friend Bots" (from `useFriendBotIds()`); IF `useFriendBotIds()` returns an empty array, THE "Friend Bots" section SHALL display an empty-state label rather than being hidden.
2. WHEN a user logs in, THE Dashboard SHALL call `Firebase_Manager.getFriendBots(uid)` and pass the result to `Robot_State_Manager.hydrateFriends()`; IF `getFriendBots` throws an error, THE Dashboard SHALL log the error and continue loading without blocking the rest of the login flow.
3. THE Robot_State_Manager `hydrateFriends(friendBots)` action SHALL be idempotent — calling it any number of times with the same list SHALL result in `friendBotIds` containing exactly the unique bot IDs from that list, with no duplicates.
4. WHEN `addFriendBot(botId, ip)` is called, THE Robot_State_Manager SHALL add `botId` to `friendBotIds` only if it is not already present, and SHALL create a robot state entry in the `robots` map with at least `botId`, `ip`, and `isOnline: false` if one does not already exist.
5. THE Robot_State_Manager SHALL ensure that for every `botId` in `friendBotIds`, a corresponding entry exists in the `robots` map; any bot in `friendBotIds` without a `robots` entry SHALL be treated as a data inconsistency and SHALL have a default state entry created automatically.

---

### Requirement 6: Navigation and Routing

**User Story:** As a user, I want dedicated navigation links for the Connect and Notifications pages, so that I can access these features from anywhere in the dashboard.

#### Acceptance Criteria

1. THE NavBar SHALL include a "Connect" navigation item linking to `/connect` with the `UserPlus` icon, styled with the same active-state highlight as existing nav items when the route is active.
2. THE NavBar SHALL include a "Notifications" navigation item linking to `/notifications` with the `Bell` icon, styled with the same active-state highlight as existing nav items; the `Bell` icon SHALL be wrapped in a relative container that renders the unread count badge (showing exact count for 1–99, "99+" above 99, hidden at 0).
3. THE Dashboard SHALL register `/connect` as a protected route rendering `ConnectPage` inside the existing `AppLayout`.
4. THE Dashboard SHALL register `/notifications` as a protected route rendering `NotificationsPage` inside the existing `AppLayout`.
5. WHEN an unauthenticated user navigates to `/connect` or `/notifications`, THE Dashboard SHALL redirect them to `/login` and preserve the original path in a `redirect` query parameter so the user is returned to the intended page after login.

---

### Requirement 7: Error Handling and Resilience

**User Story:** As a user, I want clear error feedback when connect operations fail, so that I understand what went wrong and how to recover.

#### Acceptance Criteria

1. IF `Firebase_Manager.lookupBotOwner` fails due to a network or permission error, THEN THE ConnectPage SHALL display an error toast and render a Retry button that re-triggers the same `lookupBotOwner` call with the same Bot ID when clicked.
2. IF `Firebase_Manager.sendConnectRequest` fails, THEN THE ConnectPage SHALL display an error toast, re-enable the Send button, and not leave a partial request entry in Firebase.
3. IF `Firebase_Manager.acceptConnectRequest` or `Firebase_Manager.rejectConnectRequest` fails, THEN THE NotificationsPage SHALL display an error toast and keep the notification visible so the user can retry.
4. IF a Firebase permission-denied error occurs during a write operation not covered by criteria 2 or 3, THEN THE Dashboard SHALL display a "Permission denied" toast and not modify any local Zustand state.
5. WHEN the Dashboard is offline and reconnects, THE notification listener SHALL automatically re-sync the notification list within 3 seconds of reconnection without requiring a page reload.
