# Implementation Plan: DEXBOT Control Dashboard

## Overview

Build a production-grade, real-time robot fleet management web application using React 18 + Vite, Tailwind CSS, Framer Motion, Zustand, Firebase SDK v10, Axios, Recharts, and React Router v6. The app connects to ESP32-S3 devices via REST, WebSocket, and Firebase Realtime Database. The UI follows a dark cyberpunk / Iron Man Jarvis aesthetic with glassmorphism cards and neon glow effects.

Implementation proceeds in layers: scaffolding → utilities → service layer → auth → core UI → pages → property-based tests → final wiring.

---

## Tasks

- [x] 1. Project scaffolding and configuration
  - [x] 1.1 Initialize Vite + React 18 project and install all dependencies
    - Run `npm create vite@latest . -- --template react` then install: `tailwindcss@3 postcss autoprefixer framer-motion react-router-dom@6 zustand axios firebase@10 recharts lucide-react fast-check`
    - Configure `tailwind.config.js` with `content` glob, extend `theme.colors` with the design palette tokens (`bg-base`, `accent-purple`, `accent-cyan`, `accent-blue`, `status-online`, `status-offline`, `glass-bg`, `glass-border`), and add the `2xl` breakpoint at 1920px
    - Add CSS custom properties to `src/index.css` matching the design color palette
    - Configure `vite.config.js` with `@vitejs/plugin-react` and set `base: '/'`
    - _Requirements: 14.1_

  - [x] 1.2 Set up folder structure and path aliases
    - Create all top-level `src/` subdirectories: `components/auth`, `components/dashboard`, `components/robot`, `components/emotion`, `components/rgb`, `components/messaging`, `components/rooms`, `components/ota`, `components/analytics`, `components/control`, `components/settings`, `components/ui`, `pages/`, `services/`, `hooks/`, `context/`, `utils/`, `assets/emotions`, `assets/particles`
    - Add `@` path alias in `vite.config.js` pointing to `src/`
    - Create placeholder `index.js` barrel files in each directory
    - _Requirements: 14.1_


- [x] 2. Utility functions
  - [x] 2.1 Implement `formatUptime(seconds)` utility
    - Create `src/utils/formatUptime.js` — converts a seconds integer to `Xd Xh Xm` string; handle 0s, exactly 1d, and large values
    - _Requirements: 3.2_

  - [ ]* 2.2 Write property test for `formatUptime`
    - Use fast-check `fc.integer({ min: 0, max: 2_592_000 })` to verify output always matches `Xd Xh Xm` pattern and round-trips correctly
    - `// Feature: dexbot-control-dashboard, Property: formatUptime output format`
    - _Requirements: 3.2_

  - [x] 2.3 Implement `formatTimestamp(ts)` utility
    - Create `src/utils/formatTimestamp.js` — returns `HH:MM` for today's timestamps and `MMM D, HH:MM` for older ones
    - _Requirements: 7.4_

  - [ ]* 2.4 Write property test for `formatTimestamp` — Property 15
    - **Property 15: Message Timestamp Formatting Is Correct for Any Timestamp**
    - Use fast-check `fc.integer({ min: 0 })` to verify today's timestamps produce `HH:MM` and past timestamps produce `MMM D, HH:MM`
    - `// Feature: dexbot-control-dashboard, Property 15`
    - **Validates: Requirements 7.4**

  - [x] 2.5 Implement `validateHexColor(input)` utility
    - Create `src/utils/hexColorValidator.js` — accepts 6-char hex with or without `#`; returns `{ valid: true }` or `{ valid: false, error: "Invalid hex color" }`
    - _Requirements: 6.6, 6.8_

  - [ ]* 2.6 Write property test for `validateHexColor` — Property 13
    - **Property 13: Hex Color Validation Accepts Valid and Rejects Invalid Inputs**
    - Use fast-check `fc.hexaString({ minLength: 6, maxLength: 6 })` for valid inputs and `fc.string()` filtered for invalid inputs
    - `// Feature: dexbot-control-dashboard, Property 13`
    - **Validates: Requirements 6.6, 6.8**

  - [x] 2.7 Implement `computeSystemHealth(onlineCount, totalCount)` utility
    - Create `src/utils/systemHealth.js` — returns `"Healthy"` / `"Degraded"` / `"Critical"` / `"Offline"` per the design thresholds
    - _Requirements: 2.4_

  - [ ]* 2.8 Write property test for `computeSystemHealth` — Property 4
    - **Property 4: System Health Computation Is Correct for All Ratios**
    - Use fast-check `fc.integer({ min: 0 })` pairs where `onlineCount ≤ totalCount` and `totalCount > 0`
    - `// Feature: dexbot-control-dashboard, Property 4`
    - **Validates: Requirements 2.4**

  - [x] 2.9 Implement `computeAggregates(robots)` utility
    - Create `src/utils/aggregates.js` — computes `averageBattery`, `averageCpu`, `averageRssi` as arithmetic means rounded to 2 decimal places
    - _Requirements: 2.3_

  - [ ]* 2.10 Write property test for `computeAggregates` — Property 5
    - **Property 5: Aggregate Metrics Computation Is Mathematically Correct**
    - Use fast-check `fc.array(fc.record({ battery: fc.float(), cpuUsage: fc.float(), rssi: fc.float() }), { minLength: 1 })`
    - `// Feature: dexbot-control-dashboard, Property 5`
    - **Validates: Requirements 2.3**

  - [x] 2.11 Implement `validateLoginForm` and `validateRegisterForm` utilities
    - Create `src/utils/formValidators.js` — `validateLoginForm({ email, password })` returns errors for empty fields; `validateRegisterForm({ email, password, displayName })` validates password ≥ 8 chars, displayName 1–50 chars, email format
    - _Requirements: 1.1, 1.2_

  - [ ]* 2.12 Write property test for form validators — Property 1
    - **Property 1: Form Validation Rejects Invalid Inputs**
    - Use fast-check to generate empty/invalid email, short passwords, out-of-range display names
    - `// Feature: dexbot-control-dashboard, Property 1`
    - **Validates: Requirements 1.1, 1.2**

  - [x] 2.13 Implement `validateBotRegistration(botId, ip, existingIds)` utility
    - Create `src/utils/botRegistrationValidator.js` — validates `botId` matches `[A-Za-z0-9_]{1,64}`, `ip` is valid IPv4, and `botId` not in `existingIds`
    - _Requirements: 12.2_

  - [ ]* 2.14 Write property test for `validateBotRegistration` — Property 22
    - **Property 22: Bot Registration Validator Accepts Valid and Rejects Invalid Inputs**
    - Use fast-check to generate valid/invalid botId strings and IPv4 addresses
    - `// Feature: dexbot-control-dashboard, Property 22`
    - **Validates: Requirements 12.2**

  - [x] 2.15 Implement `validateOtaFile(filename)` utility
    - Create `src/utils/otaValidator.js` — returns `{ valid: true }` iff filename ends with `.bin` (case-insensitive)
    - _Requirements: 10.1_

  - [ ]* 2.16 Write property test for `validateOtaFile` — Property 19
    - **Property 19: OTA File Validator Accepts Only .bin Extensions**
    - Use fast-check `fc.string()` and `fc.string().map(s => s + '.bin')` for valid/invalid filenames
    - `// Feature: dexbot-control-dashboard, Property 19`
    - **Validates: Requirements 10.1**

  - [x] 2.17 Implement `filterMetricsForRange(points, from, to)` utility
    - Create `src/utils/metricsFilter.js` — returns only points where `from ≤ point.timestamp ≤ to`
    - _Requirements: 11.1, 11.2, 11.3, 11.5_

  - [ ]* 2.18 Write property test for `filterMetricsForRange` — Property 20
    - **Property 20: Metrics Time-Range Filter Returns Only In-Range Points**
    - Use fast-check arrays of timestamped points and arbitrary `(from, to)` pairs
    - `// Feature: dexbot-control-dashboard, Property 20`
    - **Validates: Requirements 11.1, 11.2, 11.3, 11.5**

  - [x] 2.19 Implement `aggregateByHour(events)` utility
    - Create `src/utils/hourlyAggregator.js` — buckets events by UTC hour, returns map of `{ hourKey: count }`
    - _Requirements: 11.4_

  - [ ]* 2.20 Write property test for `aggregateByHour` — Property 21
    - **Property 21: Hourly Aggregation Bucket Counts Are Correct**
    - Use fast-check arrays of timestamped events; verify no double-counting and no omissions
    - `// Feature: dexbot-control-dashboard, Property 21`
    - **Validates: Requirements 11.4**

  - [x] 2.21 Implement `computeReconnectDelay(attempt)` utility
    - Create `src/utils/reconnectDelay.js` — returns `Math.min(1000 * Math.pow(2, attempt), 30000)`
    - _Requirements: 9.3_

  - [ ]* 2.22 Write property test for `computeReconnectDelay` — Property 17
    - **Property 17: WebSocket Reconnect Delay Formula Is Correct for All Attempt Numbers**
    - Use fast-check `fc.integer({ min: 0, max: 9 })` to verify formula output
    - `// Feature: dexbot-control-dashboard, Property 17`
    - **Validates: Requirements 9.3**

  - [x] 2.23 Implement `emotionColors` map utility
    - Create `src/utils/emotionColors.js` — exports `EMOTION_COLORS` constant mapping each `EmotionType` to its hex color
    - _Requirements: 5.5_

- [~] 3. Checkpoint — Ensure all utility tests pass
  - Run `npx vitest --run src/utils` and confirm all property tests and unit tests pass. Ask the user if any questions arise.


- [x] 4. Service layer — apiClient and Axios interceptor
  - [x] 4.1 Implement `apiClient.js` with per-device Axios instances
    - Create `src/services/apiClient.js` with `getApiClient(botId, baseURL)` and `removeApiClient(botId)` using a `Map` of instances
    - Configure each instance with `timeout: 10_000` and a response interceptor that normalizes errors to `{ message, status, code }`
    - _Requirements: 14.3, 14.6_

  - [ ]* 4.2 Write property test for Axios error interceptor — Property 23
    - **Property 23: Axios Error Interceptor Normalizes Any HTTP Error to a Consistent Shape**
    - Use fast-check to generate mock Axios error objects (network errors, 4xx, 5xx, with/without response body) and verify the normalized shape always has `{ message: string, status: number, code: string }`
    - `// Feature: dexbot-control-dashboard, Property 23`
    - **Validates: Requirements 14.6**

- [x] 5. Service layer — Robot_State_Manager (Zustand store)
  - [x] 5.1 Implement `Robot_State_Manager.js` Zustand store
    - Create `src/services/Robot_State_Manager.js` with the full store shape: `robots`, `registeredBotIds`, and all actions: `setRobotState`, `setOnline`, `setEmotion`, `setWsStatus`, `registerBot`, `removeBot`
    - Implement `createDefaultRobotState(botId, ip)` helper that initializes all fields with safe defaults
    - Export `useRobotStore` hook and a `useRobotState(botId)` selector hook in `src/hooks/useRobotState.js`
    - _Requirements: 14.5_

- [x] 6. Service layer — WebSocket_Manager
  - [x] 6.1 Implement `WebSocket_Manager.js` singleton
    - Create `src/services/WebSocket_Manager.js` with `connect(botId, ip, port, onEvent)`, `disconnect(botId)`, `getStatus(botId)`, and `_scheduleReconnect` using `computeReconnectDelay`
    - Implement `_parseMessage(s)` that returns parsed event or `null` (never throws) and logs parse errors
    - On `onmessage`, route event types to the Zustand store: `status_sync` → `setRobotState`, `emotion_update` → `setEmotion`, `battery_update` / `metrics_update` → `setRobotState`, `log_message` → call `onEvent` callback, `wifi_update` → call `onEvent` callback
    - After 10 failed reconnect attempts, call `setWsStatus(botId, 'disconnected')`
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.7, 9.8, 14.2_

  - [ ]* 6.2 Write property test for `WebSocket_Manager._parseMessage` — Property 18
    - **Property 18: WebSocket Message Parser Handles Any String Input Without Crashing**
    - Use fast-check `fc.string()` to verify `_parseMessage` never throws; valid JSON conforming to `WsEvent` schema returns object, invalid returns `null`
    - `// Feature: dexbot-control-dashboard, Property 18`
    - **Validates: Requirements 9.4**

  - [x] 6.3 Implement `useWebSocket.js` hook
    - Create `src/hooks/useWebSocket.js` — on mount calls `WebSocket_Manager.connect(botId, ip, port, onEvent)`, on unmount calls `WebSocket_Manager.disconnect(botId)`
    - _Requirements: 9.1, 9.7_

- [ ] 7. Service layer — Firebase_Manager
  - [x] 7.1 Implement `Firebase_Manager.js` singleton — initialization and auth
    - Create `src/services/Firebase_Manager.js`; initialize Firebase app with config from environment variables (`VITE_FIREBASE_*`)
    - Implement auth methods: `loginWithEmail`, `registerWithEmail`, `logout`, `onAuthStateChanged` using `browserLocalPersistence`
    - Implement `reinitialize(newConfig)` that calls `deleteApp` and re-initializes
    - _Requirements: 1.3, 1.5, 1.7, 12.3, 14.3_

  - [x] 7.2 Implement `Firebase_Manager.js` — bot registration and status methods
    - Add `getRegisteredBots()`, `registerBot(botId, ip)`, `removeBot(botId)`, `updateBotStatus(botId, statusPartial)` reading/writing to `registered_bots/{BOT_ID}` and `bots/{BOT_ID}/status`
    - _Requirements: 12.2, 14.3_

  - [ ] 7.3 Implement `Firebase_Manager.js` — messaging methods
    - Add `sendMessage(fromBotId, toBotId, text)`, `sendRoomMessage(roomId, fromBotId, text)`, `broadcastMessage(fromBotId, allBotIds, text)`, `listenToInbox(botId, callback)`, `listenToRoomMessages(roomId, callback)`, `loadRecentMessages(botId, targetBotId, limit)`
    - `sendMessage` writes to both `bots/{fromBotId}/messages/{id}` and `bots/{toBotId}/inbox/{id}`
    - `broadcastMessage` writes to every bot's inbox; collect failures and return them
    - _Requirements: 7.2, 7.3, 7.6, 7.7, 7.9, 14.3_

  - [ ]* 7.4 Write property test for `Firebase_Manager.sendMessage` paths — Property 14
    - **Property 14: Message Write Targets Correct Firebase Paths for Any Valid Message**
    - Mock Firebase `push`/`set`; use fast-check `fc.string({ minLength: 1, maxLength: 500 })` for message text and verify both paths are written
    - `// Feature: dexbot-control-dashboard, Property 14`
    - **Validates: Requirements 7.2**

  - [ ]* 7.5 Write property test for `Firebase_Manager.broadcastMessage` — Property 16
    - **Property 16: Broadcast Writes to Every Bot's Inbox**
    - Use fast-check `fc.array(fc.string({ minLength: 1 }), { minLength: 1 })` for bot ID arrays; verify every bot's inbox path is written
    - `// Feature: dexbot-control-dashboard, Property 16`
    - **Validates: Requirements 7.7**

  - [~] 7.6 Implement `Firebase_Manager.js` — rooms methods
    - Add `createRoom(name)`, `addBotToRoom(roomId, botId)`, `removeBotFromRoom(roomId, botId)`, `sendRoomCommand(roomId, command, userId)`, `listenToRoomActivity(roomId, callback)`
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.6, 14.3_

  - [~] 7.7 Implement `Firebase_Manager.js` — OTA history, metrics history, and user settings
    - Add `recordOtaHistory(botId, record)`, `getOtaHistory(botId)`, `writeMetricsPoint(botId, metrics)`, `queryMetricsHistory(botId, from, to)`, `saveUserSettings(userId, settings)`, `loadUserSettings(userId)`
    - _Requirements: 10.4, 10.5, 11.6, 12.6, 12.7, 14.3_

  - [~] 7.8 Implement `useFirebaseListener.js` hook
    - Create `src/hooks/useFirebaseListener.js` — attaches an `onValue` listener on mount and detaches on unmount; returns current snapshot value
    - _Requirements: 7.3, 8.6_

- [ ] 8. Service layer — Emotion_Manager
  - [~] 8.1 Implement `Emotion_Manager.js` singleton
    - Create `src/services/Emotion_Manager.js` with `setEmotion(botId, emotion)` and `getEmotionColor(emotion)`
    - `setEmotion`: disable buttons (via store flag) → `POST /api/emotion` with 5s timeout → update store → re-enable; on error: revert store emotion, re-enable, show toast
    - `getEmotionColor`: return exact hex from `EMOTION_COLORS` map; fallback to `#FFFFFF`
    - _Requirements: 5.2, 5.3, 5.7, 14.4_

  - [ ]* 8.2 Write property test for `Emotion_Manager.getEmotionColor` — Property 11
    - **Property 11: Emotion Color Mapping Is Complete and Correct**
    - Use fast-check `fc.constantFrom('HAPPY','SAD','ANGRY','SLEEPY','EXCITED','NEUTRAL')` and verify exact hex values
    - `// Feature: dexbot-control-dashboard, Property 11`
    - **Validates: Requirements 5.5**

- [~] 9. Checkpoint — Ensure all service layer tests pass
  - Run `npx vitest --run src/services` and confirm all property tests pass. Ask the user if any questions arise.


- [ ] 10. Authentication system
  - [~] 10.1 Implement `AuthContext.jsx` and `useAuth.js` hook
    - Create `src/context/AuthContext.jsx` — wraps app with `AuthContext.Provider`; calls `Firebase_Manager.onAuthStateChanged` to set `currentUser`; exposes `currentUser`, `login`, `register`, `logout`
    - Create `src/hooks/useAuth.js` — returns `useContext(AuthContext)`
    - _Requirements: 1.3, 1.5, 1.7, 1.8_

  - [~] 10.2 Implement `ProtectedRoute.jsx` component
    - Create `src/components/auth/ProtectedRoute.jsx` — reads `AuthContext.currentUser`; if null, redirects to `/login?redirect=<current-path>`; otherwise renders `<Outlet />`
    - _Requirements: 1.6, 14.10_

  - [ ]* 10.3 Write property test for `ProtectedRoute` redirect — Property 2
    - **Property 2: Protected Route Redirect Preserves Path**
    - Use fast-check `fc.webPath()` to generate valid URL paths; render `ProtectedRoute` with `currentUser = null` and verify redirect URL contains the original path as `redirect` param
    - `// Feature: dexbot-control-dashboard, Property 2`
    - **Validates: Requirements 1.6, 14.10**

  - [~] 10.4 Implement `LoginForm.jsx` and `LoginPage.jsx`
    - Create `src/components/auth/LoginForm.jsx` — email + password fields, inline validation using `validateLoginForm`, calls `Firebase_Manager.loginWithEmail`, shows error toast on failure, navigates to `redirect` param or `/` on success
    - Create `src/pages/LoginPage.jsx` — renders `LoginForm` with `ParticleBackground`, glassmorphism card, Framer Motion page transition
    - _Requirements: 1.1, 1.3, 1.4_

  - [~] 10.5 Implement `RegisterForm.jsx` and `RegisterPage.jsx`
    - Create `src/components/auth/RegisterForm.jsx` — email, password (≥8 chars), displayName (1–50 chars) fields, inline validation using `validateRegisterForm`, calls `Firebase_Manager.registerWithEmail`, shows "An account with this email already exists" on duplicate email error
    - Create `src/pages/RegisterPage.jsx` — renders `RegisterForm` with glassmorphism card and Framer Motion transition
    - _Requirements: 1.2, 1.9_

- [ ] 11. Core UI components
  - [~] 11.1 Implement `GlassCard.jsx` component
    - Create `src/components/ui/GlassCard.jsx` — applies `bg-white/[0.08] backdrop-blur-xl border border-purple-500/40 rounded-2xl shadow-[0_0_20px_rgba(168,85,247,0.15)]`; accepts `className` and `children` props; wraps with Framer Motion `motion.div` for card mount/unmount animation (`initial={{ opacity:0, scale:0.95 }}` → `animate={{ opacity:1, scale:1 }}` 200ms)
    - _Requirements: 13.4, 13.5_

  - [~] 11.2 Implement `NeonButton.jsx` component
    - Create `src/components/ui/NeonButton.jsx` — `motion.button` with `whileHover={{ boxShadow: '0 0 20px rgba(34,211,238,0.6)' }}` transition 150ms, `whileTap={{ scale: 0.95 }}`; accepts `variant` (`primary` | `danger` | `ghost`), `disabled`, `onClick`, `children`
    - _Requirements: 13.7_

  - [~] 11.3 Implement `NavBar.jsx` component
    - Create `src/components/ui/NavBar.jsx` — renders navigation links for all protected routes, displays `currentUser.displayName` and initials-based avatar; includes logout button that calls `Firebase_Manager.logout`; highlights active route with neon accent
    - _Requirements: 1.7, 1.8_

  - [ ]* 11.4 Write property test for NavBar user identity rendering — Property 3
    - **Property 3: NavBar Renders Authenticated User Identity**
    - Use fast-check `fc.string({ minLength: 1 })` for display names; verify rendered text contains the name and avatar label contains correct initials
    - `// Feature: dexbot-control-dashboard, Property 3`
    - **Validates: Requirements 1.8**

  - [~] 11.5 Implement `ToastProvider.jsx` and `useToast.js` hook
    - Create `src/components/ui/ToastProvider.jsx` — renders a toast container (top-right); exposes `showToast(message, type)` via context
    - Create `src/hooks/useToast.js` — returns `useContext(ToastContext)`
    - _Requirements: 3.5, 5.7, 6.9, 7.2, 8.4, 10.7, 12.3_

  - [~] 11.6 Implement `ParticleBackground.jsx` component
    - Create `src/components/ui/ParticleBackground.jsx` — `<canvas>` element with `useEffect` running `requestAnimationFrame` loop; minimum 50 particles with random velocity, neon cyan/purple colors, fade on edges
    - _Requirements: 13.6_

  - [~] 11.7 Implement `LoadingSkeleton.jsx` component
    - Create `src/components/ui/LoadingSkeleton.jsx` — animated shimmer placeholder matching `GlassCard` dimensions; accepts `rows` and `height` props
    - _Requirements: 3.7_

- [ ] 12. Routing setup
  - [~] 12.1 Implement `App.jsx` with React Router v6 route tree
    - Create `src/App.jsx` with `<BrowserRouter>` wrapping all routes: public `/login` and `/register`; protected routes under `<ProtectedRoute>` for `/`, `/robots`, `/robots/:botId/control`, `/messaging`, `/rooms`, `/analytics`, `/settings`; catch-all `<Navigate to="/" replace />`
    - Wrap the entire app in `<AuthContext.Provider>`, `<ToastProvider>`, and `<AnimatePresence>`
    - _Requirements: 14.10_

  - [~] 12.2 Implement `main.jsx` entry point
    - Create `src/main.jsx` — renders `<App />` into `#root`; import `index.css`
    - _Requirements: 14.1_


- [ ] 13. Dashboard page
  - [~] 13.1 Implement `AggregateMetrics.jsx` and `SystemHealthBadge.jsx`
    - Create `src/components/dashboard/AggregateMetrics.jsx` — reads all robot states from `useRobotStore`, calls `computeAggregates`, displays average battery %, average CPU %, average RSSI, total active room count
    - Create `src/components/dashboard/SystemHealthBadge.jsx` — calls `computeSystemHealth(onlineCount, totalCount)`, renders colored badge with label
    - _Requirements: 2.3, 2.4_

  - [~] 13.2 Implement `FleetSummary.jsx` and `DashboardPage.jsx`
    - Create `src/components/dashboard/FleetSummary.jsx` — renders summary `Robot_Card` grid (Bot ID, online status, emotion, battery); shows "No robots registered" empty state with link to Settings when `registeredBotIds` is empty
    - Create `src/pages/DashboardPage.jsx` — composes `ParticleBackground`, `AggregateMetrics`, `SystemHealthBadge`, `FleetSummary`; Framer Motion page transition; responsive grid `grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4`
    - _Requirements: 2.1, 2.2, 2.5, 2.6, 2.7, 2.8_

- [ ] 14. Robots page and Robot_Card
  - [~] 14.1 Implement `RobotStatusBadge.jsx` and `RobotMetricsRow.jsx`
    - Create `src/components/robot/RobotStatusBadge.jsx` — renders green pulse badge (CSS `@keyframes pulse` 1.5s) when online, red static badge when offline
    - Create `src/components/robot/RobotMetricsRow.jsx` — renders battery %, RSSI dBm, CPU temp °C, memory % in a row
    - _Requirements: 2.7, 3.2, 3.3_

  - [~] 14.2 Implement `RobotActionButtons.jsx`
    - Create `src/components/robot/RobotActionButtons.jsx` — renders Control, Message, Emotion, RGB, OTA Update, Restart, Open Full View buttons; when `isOnline = false`, all buttons except Open Full View are visually disabled; clicking a disabled button shows a toast "Robot is offline" and makes no API call
    - Restart button calls `apiClient.post('/api/command', { command: 'restart' })` and shows success/error toast
    - _Requirements: 3.4, 3.5, 3.9_

  - [~] 14.3 Implement `Robot_Card.jsx`
    - Create `src/components/robot/Robot_Card.jsx` — subscribes to `useRobotState(botId)`; renders all required fields: botId, status badge, emotion label, battery %, RSSI dBm, room name or "No Room", IP address, uptime via `formatUptime`, CPU temp °C, memory %; applies `opacity-50` when offline; wraps in `GlassCard` with Framer Motion mount/unmount animation
    - _Requirements: 3.1, 3.2, 3.3, 3.4_

  - [ ]* 14.4 Write property test for `Robot_Card` field rendering — Property 6
    - **Property 6: Robot_Card Renders All Required Fields for Any Robot State**
    - Use fast-check `fc.record({ botId: fc.string(), emotion: fc.constantFrom(...), battery: fc.integer({min:0,max:100}), ... })` and verify all fields appear in rendered output
    - `// Feature: dexbot-control-dashboard, Property 6`
    - **Validates: Requirements 3.2**

  - [ ]* 14.5 Write property test for `Robot_Card` online/offline visual state — Property 7
    - **Property 7: Online/Offline Visual State Is Correct for Any Robot**
    - Use fast-check `fc.boolean()` for `isOnline`; verify pulse class present when online, opacity in `[0.4, 0.6]` and red badge when offline
    - `// Feature: dexbot-control-dashboard, Property 7`
    - **Validates: Requirements 2.7, 2.8, 3.3**

  - [ ]* 14.6 Write property test for offline action buttons — Property 8
    - **Property 8: Offline Robot Action Buttons Never Trigger API Calls**
    - Use fast-check `fc.constantFrom('Control','Message','Emotion','RGB','OTA Update','Restart')` with `isOnline = false`; mock Axios and verify zero requests made
    - `// Feature: dexbot-control-dashboard, Property 8`
    - **Validates: Requirements 3.9**

  - [~] 14.7 Implement `RobotsPage.jsx`
    - Create `src/pages/RobotsPage.jsx` — on mount, concurrently fetches `GET /api/device`, `GET /api/status`, `GET /api/metrics` for each registered bot; shows `LoadingSkeleton` per card until data arrives; renders `Robot_Card` grid with responsive layout; empty state with Settings link when no bots registered
    - _Requirements: 3.1, 3.7, 3.8_

- [ ] 15. Robot Control page
  - [~] 15.1 Implement `CommandInput.jsx` and `VolumeSlider.jsx`
    - Create `src/components/control/CommandInput.jsx` — text input + submit button; on submit calls `apiClient.post('/api/command', { command })` and displays response in feedback panel; shows error in panel on failure
    - Create `src/components/control/VolumeSlider.jsx` — range 0–100 step 1; on `mouseUp`/`touchEnd` calls `apiClient.post('/api/command', { volume: value })` within 300ms
    - _Requirements: 4.3, 4.4_

  - [~] 15.2 Implement `LiveLogFeed.jsx`
    - Create `src/components/control/LiveLogFeed.jsx` — maintains local state array of last 100 log entries; each entry shows timestamp and message; auto-scrolls to bottom on new entry using `useRef` + `scrollIntoView`; cleared on unmount
    - _Requirements: 4.7_

  - [~] 15.3 Implement `WifiPanel.jsx`
    - Create `src/components/control/WifiPanel.jsx` — on mount fetches `GET /api/wifi`; displays SSID, RSSI, connection status; updates within 500ms when `wifi_update` WebSocket event arrives via prop callback
    - _Requirements: 4.8_

  - [~] 15.4 Implement `RobotControlPage.jsx`
    - Create `src/pages/RobotControlPage.jsx` — reads `botId` from `useParams`; on mount fetches `GET /api/status` and `GET /api/metrics` (shows inline error banner with retry on failure); mounts `useWebSocket` hook routing `log_message` to `LiveLogFeed` and `wifi_update` to `WifiPanel`; composes `CommandInput`, `VolumeSlider`, brightness slider (range 0–255), `LiveLogFeed`, `WifiPanel`, `EmotionPanel`, `RGB_Controller`; on unmount disconnects WebSocket and clears log feed
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 4.8, 4.9_

  - [ ]* 15.5 Write property test for slider value dispatch — Property 9
    - **Property 9: Slider Value Dispatch for Any Value in Range**
    - Use fast-check `fc.integer({ min: 0, max: 100 })` for volume and `fc.integer({ min: 0, max: 255 })` for brightness; mock Axios and verify exactly one POST per release
    - `// Feature: dexbot-control-dashboard, Property 9`
    - **Validates: Requirements 4.4, 4.5**

- [ ] 16. Emotion Control System
  - [~] 16.1 Implement `EmotionFacePreview.jsx` and `EmotionColorSwatch.jsx`
    - Create `src/components/emotion/EmotionFacePreview.jsx` — renders SVG face asset from `src/assets/emotions/{emotion}.svg` corresponding to current emotion; add placeholder SVG files for all 6 emotions
    - Create `src/components/emotion/EmotionColorSwatch.jsx` — renders a colored circle using `Emotion_Manager.getEmotionColor(emotion)`
    - _Requirements: 5.4, 5.5_

  - [~] 16.2 Implement `EmotionButton.jsx`
    - Create `src/components/emotion/EmotionButton.jsx` — renders a `NeonButton` with emotion-specific icon (Lucide), label, and color accent; `whileTap={{ scale: 0.92 }}`; accepts `emotion`, `isActive`, `isDisabled`, `onClick` props
    - _Requirements: 5.1_

  - [~] 16.3 Implement `EmotionPanel.jsx`
    - Create `src/components/emotion/EmotionPanel.jsx` — renders all 6 `EmotionButton` components; reads current emotion from `useRobotState(botId)`; on click calls `Emotion_Manager.setEmotion(botId, emotion)` which handles disabling/re-enabling; renders `EmotionFacePreview` and `EmotionColorSwatch` for active emotion; updates within 500ms on WebSocket `emotion_update`
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7_

  - [ ]* 16.4 Write property test for emotion API call and button disable — Property 10
    - **Property 10: Emotion API Call and Button Disable for Any Emotion Type**
    - Use fast-check `fc.constantFrom('HAPPY','SAD','ANGRY','SLEEPY','EXCITED','NEUTRAL')`; mock Axios; verify POST called with correct emotion and all 6 buttons disabled during pending request
    - `// Feature: dexbot-control-dashboard, Property 10`
    - **Validates: Requirements 5.2**

  - [ ]* 16.5 Write property test for emotion error revert — Property 12
    - **Property 12: Emotion Error Reverts to Previous State**
    - Use fast-check pairs of `EmotionType` values; mock Axios to reject; verify store reverts to `previousEmotion` and buttons re-enabled
    - `// Feature: dexbot-control-dashboard, Property 12`
    - **Validates: Requirements 5.7**


- [ ] 17. RGB Controller
  - [~] 17.1 Implement `ColorWheel.jsx`
    - Create `src/components/rgb/ColorWheel.jsx` — renders an HSL color wheel on a `<canvas>`; handles click and drag to select color; calls `onChange(hexColor)` on pointer up; reverts to last good value on API failure
    - _Requirements: 6.1, 6.3, 6.9_

  - [~] 17.2 Implement `BrightnessSlider.jsx` (RGB variant)
    - Create `src/components/rgb/BrightnessSlider.jsx` — range 0–255 step 1; displays current numeric value; calls `onChange(value)` on `mouseUp`/`touchEnd`
    - _Requirements: 6.2, 6.3_

  - [~] 17.3 Implement `LightingModeButtons.jsx`
    - Create `src/components/rgb/LightingModeButtons.jsx` — four buttons: Rainbow, Breathing, Pulse, Music Reactive; only one active at a time; on click calls `apiClient.post('/api/command', { mode })` and highlights active button
    - _Requirements: 6.4, 6.5_

  - [~] 17.4 Implement `HexColorInput.jsx`
    - Create `src/components/rgb/HexColorInput.jsx` — text input accepting 6-char hex (with/without `#`); validates using `validateHexColor` on blur and Enter; on valid input updates `ColorWheel` and calls `apiClient.post('/api/command', { rgb: color })`; shows inline "Invalid hex color" error on invalid input without making API call
    - _Requirements: 6.6, 6.7, 6.8_

  - [~] 17.5 Implement `RGB_Controller.jsx`
    - Create `src/components/rgb/RGB_Controller.jsx` — composes `ColorWheel`, `BrightnessSlider`, `LightingModeButtons`, `HexColorInput`; manages internal state `{ color, brightness, mode, hexInput, hexError }`; on color/brightness commit calls `apiClient.post('/api/command', { rgb, brightness })` within 300ms; on failure reverts to last good values and shows toast
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7, 6.8, 6.9_

- [ ] 18. Bot-to-Bot Messaging
  - [~] 18.1 Implement `UnreadBadge.jsx` and `ConversationList.jsx`
    - Create `src/components/messaging/UnreadBadge.jsx` — renders numeric badge; clears when conversation opened
    - Create `src/components/messaging/ConversationList.jsx` — lists all registered bots as conversation targets; shows `UnreadBadge` per conversation; allows selecting source bot and target bot
    - _Requirements: 7.1, 7.8_

  - [~] 18.2 Implement `MessageThread.jsx`
    - Create `src/components/messaging/MessageThread.jsx` — renders messages in chronological order; each message shows sender botId, text, and `formatTimestamp(ts)` formatted timestamp; shows typing indicator after 500ms of input inactivity; auto-scrolls to latest message
    - _Requirements: 7.3, 7.4, 7.5_

  - [~] 18.3 Implement `MessageInput.jsx`
    - Create `src/components/messaging/MessageInput.jsx` — textarea with 1–500 char limit; on submit calls `Firebase_Manager.sendMessage`; on failure shows toast and retains text; includes "Broadcast to All" button that calls `Firebase_Manager.broadcastMessage` and shows summary notification for any failures
    - _Requirements: 7.2, 7.7_

  - [~] 18.4 Implement `Bot_Messenger.jsx` and `MessagingPage.jsx`
    - Create `src/components/messaging/Bot_Messenger.jsx` — composes `ConversationList` and `MessageThread`; on conversation select calls `Firebase_Manager.loadRecentMessages(botId, targetBotId, 50)` and attaches `Firebase_Manager.listenToInbox` listener; clears unread badge on open
    - Create `src/pages/MessagingPage.jsx` — renders `Bot_Messenger` with page transition; supports room messaging by allowing room selection as target
    - _Requirements: 7.1, 7.2, 7.3, 7.6, 7.8, 7.9_

- [ ] 19. Rooms System
  - [~] 19.1 Implement `RoomCard.jsx` and `RoomMemberList.jsx`
    - Create `src/components/rooms/RoomCard.jsx` — displays room name, member count, last activity timestamp; links to room detail view
    - Create `src/components/rooms/RoomMemberList.jsx` — lists member bots with remove button; dropdown to add registered bot; calls `Firebase_Manager.addBotToRoom` / `removeBotFromRoom`
    - _Requirements: 8.2, 8.3, 8.7_

  - [~] 19.2 Implement `RoomActivityFeed.jsx`
    - Create `src/components/rooms/RoomActivityFeed.jsx` — attaches `Firebase_Manager.listenToRoomActivity` listener; displays last 20 events (commands, messages, status changes) in real-time
    - _Requirements: 8.6_

  - [~] 19.3 Implement `RoomsPage.jsx`
    - Create `src/pages/RoomsPage.jsx` — lists all rooms via `useFirebaseListener` on `/rooms`; "Create Room" form with name validation (1–64 chars, alphanumeric + underscores, unique); on submit calls `Firebase_Manager.createRoom`; shows inline "Room name already exists" error on duplicate; broadcast command input calls `Firebase_Manager.sendRoomCommand`; group emotion panel calls `Emotion_Manager.setEmotion` for each room member concurrently; empty state with "Create Room" button
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.7_

- [ ] 20. OTA Update page
  - [~] 20.1 Implement `OtaFileInput.jsx` and `OtaProgressBar.jsx`
    - Create `src/components/ota/OtaFileInput.jsx` — file input accepting `.bin` only; validates using `validateOtaFile`; shows inline "Only .bin firmware files are supported" on invalid extension; robot selection checkboxes
    - Create `src/components/ota/OtaProgressBar.jsx` — renders progress bar 0–100%; accepts `progress` and `robotId` props
    - _Requirements: 10.1, 10.2, 10.3, 10.8_

  - [~] 20.2 Implement `OtaVersionHistory.jsx`
    - Create `src/components/ota/OtaVersionHistory.jsx` — fetches `Firebase_Manager.getOtaHistory(botId)`; displays entries sorted by most recent first (filename, file size, deployment timestamp); "Rollback" button re-deploys that firmware version with progress bar
    - _Requirements: 10.5, 10.6_

  - [~] 20.3 Implement `OTA_Manager.jsx` and OTA page
    - Create `src/components/ota/OTA_Manager.jsx` — orchestrates sequential multi-robot upload using `FormData` + `getApiClient(botId).post('/api/ota', formData, { onUploadProgress })` with 120s timeout; on success calls `Firebase_Manager.recordOtaHistory`; on failure shows descriptive error toast without writing history; disables upload controls during active upload
    - Create `src/pages/OtaPage.jsx` (add route `/ota` to App.jsx) — composes `OtaFileInput`, `OTA_Manager`, `OtaVersionHistory` per robot
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6, 10.7, 10.8_

- [ ] 21. Analytics page
  - [~] 21.1 Implement per-robot chart components
    - Create `src/components/analytics/BatteryChart.jsx` — Recharts `<LineChart>` with Y-axis 0–100%
    - Create `src/components/analytics/CpuChart.jsx` — Recharts `<LineChart>` with Y-axis 0–100%
    - Create `src/components/analytics/TemperatureChart.jsx` — Recharts `<LineChart>` with Y-axis labeled °C
    - Each chart accepts `data` array and `emptyState` message; shows "No data available for this period" when data is empty
    - _Requirements: 11.1, 11.2, 11.3, 11.8_

  - [~] 21.2 Implement `AggregateCharts.jsx`
    - Create `src/components/analytics/AggregateCharts.jsx` — four Recharts charts: commands per hour (BarChart), messages per hour (BarChart), active room count over time (LineChart), online bot count over time (LineChart); uses `aggregateByHour` utility
    - _Requirements: 11.4_

  - [~] 21.3 Implement `Analytics_Engine.jsx` and `AnalyticsPage.jsx`
    - Create `src/components/analytics/Analytics_Engine.jsx` — time range selector (1h, 6h, 24h, 7d; default 24h); on range change calls `Firebase_Manager.queryMetricsHistory(botId, from, to)` and reloads charts within 2s; attaches Firebase `onValue` listener to append in-range live data points; uses `filterMetricsForRange` to discard out-of-range points; also uses `useAnalytics.js` hook
    - Create `src/hooks/useAnalytics.js` — encapsulates metrics query and live listener logic
    - Create `src/pages/AnalyticsPage.jsx` — renders `Analytics_Engine` with per-robot charts and aggregate charts
    - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5, 11.6, 11.7, 11.8_

- [ ] 22. Settings page
  - [~] 22.1 Implement settings section components
    - Create `src/components/settings/DevicePairingSection.jsx` — bot registration form using `validateBotRegistration`; calls `Firebase_Manager.registerBot`; shows "A robot with this ID is already registered" on duplicate
    - Create `src/components/settings/ApiConfigSection.jsx` — per-bot REST base URL (max 2048 chars, valid HTTP/HTTPS) and WebSocket port (1–65535) inputs
    - Create `src/components/settings/FirebaseConfigSection.jsx` — API key, project ID, database URL inputs; on save calls `Firebase_Manager.reinitialize`; shows "Firebase reconnected" toast on success, error toast + revert on failure
    - Create `src/components/settings/NotificationSection.jsx` — toggle; on enable calls `Notification.requestPermission()`; on denial reverts toggle and shows inline message
    - Create `src/components/settings/ThemeSection.jsx` — theme preference selector (persisted to Firebase)
    - _Requirements: 12.1, 12.2, 12.3, 12.4, 12.5_

  - [~] 22.2 Implement `SettingsPage.jsx`
    - Create `src/pages/SettingsPage.jsx` — composes all settings sections in labeled panels; "Save Settings" button calls `Firebase_Manager.saveUserSettings(userId, settings)` and shows success/error toast; on login, calls `Firebase_Manager.loadUserSettings(userId)` to restore settings before rendering dependent pages
    - _Requirements: 12.1, 12.6, 12.7_

- [~] 23. Checkpoint — Ensure all component and page tests pass
  - Run `npx vitest --run` and confirm all property tests and unit tests pass. Ask the user if any questions arise.


- [ ] 24. Live WebSocket status page
  - [~] 24.1 Implement `LiveWebSocketPage.jsx`
    - Create `src/pages/LiveWebSocketPage.jsx` (add route `/live` to App.jsx) — displays per-robot WebSocket connection status (Connected / Reconnecting with attempt number / Disconnected + Retry button) sourced from `useRobotStore`; renders a live event feed showing the last 50 WebSocket events received across all robots with type, botId, and timestamp; "Retry" button calls `WebSocket_Manager.connect` resetting the reconnect counter
    - _Requirements: 9.5, 9.6, 9.8_

- [ ] 25. Responsive design and visual polish
  - [~] 25.1 Apply responsive grid and breakpoint classes across all pages
    - Audit all card grids in `DashboardPage`, `RobotsPage`, `AnalyticsPage`, `RoomsPage` and ensure `grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4` is applied
    - Verify NavBar collapses to hamburger menu below 768px
    - Verify all text remains readable at 320px viewport width
    - _Requirements: 13.8_

  - [~] 25.2 Apply Framer Motion page transitions and AnimatePresence
    - Wrap each page component's root element with `motion.div` using `initial={{ opacity:0, y:20 }}` → `animate={{ opacity:1, y:0 }}` 300ms ease
    - Wrap card grids with `<AnimatePresence>` so card mount/unmount animations play correctly
    - Verify all interactive buttons have `whileHover` neon glow completing within 150ms
    - _Requirements: 13.5, 13.7_

  - [~] 25.3 Apply global theme and color tokens
    - Verify `--color-bg-base: #0a0a0f` is applied as `body` background
    - Verify all status indicators use `--color-status-online` (green) and `--color-status-offline` (red)
    - Verify all accent elements use neon purple, cyan, or electric blue
    - Verify all cards use `bg-white/[0.08] backdrop-blur-xl` with neon border at 30–50% opacity
    - _Requirements: 13.1, 13.2, 13.3, 13.4_

- [ ] 26. Production build configuration
  - [~] 26.1 Configure environment variables and production build
    - Create `.env.example` listing all required `VITE_FIREBASE_*` variables
    - Configure `vite.config.js` build options: `outDir: 'dist'`, `sourcemap: false` for production, chunk splitting for vendor libs (firebase, recharts, framer-motion)
    - Add `build` and `preview` scripts to `package.json`
    - Verify `npm run build` completes without errors
    - _Requirements: 14.1_

  - [~] 26.2 Configure Vitest for property-based tests
    - Add `vitest` and `@vitest/ui` to dev dependencies; configure `vitest.config.js` with `environment: 'jsdom'`, `globals: true`, and `setupFiles` pointing to a test setup file that imports `@testing-library/jest-dom`
    - Verify `npx vitest --run` executes all property tests with minimum 100 iterations each
    - _Requirements: 14.1_

- [~] 27. Final checkpoint — Full test suite and build verification
  - Run `npx vitest --run` to confirm all 23 property tests pass with ≥100 iterations each. Run `npm run build` to confirm production build succeeds. Ask the user if any questions arise.

---

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP; they contain property-based tests using fast-check
- Each task references specific requirements for full traceability
- All 23 correctness properties from the design document are covered by property test sub-tasks (Properties 1–23)
- Service singletons (`WebSocket_Manager`, `Firebase_Manager`, `Emotion_Manager`, `Robot_State_Manager`) must be implemented before any page or component that depends on them
- Components never import Firebase SDK or Axios directly — all I/O flows through the service layer
- The OTA page route `/ota` and Live WebSocket page route `/live` should be added to the protected route tree in `App.jsx` during tasks 20.3 and 24.1 respectively
- Checkpoints at tasks 3, 9, 23, and 27 ensure incremental validation throughout the build


## Task Dependency Graph

```json
{
  "waves": [
    {
      "id": 0,
      "tasks": ["1.1", "1.2"]
    },
    {
      "id": 1,
      "tasks": ["2.1", "2.3", "2.5", "2.7", "2.9", "2.11", "2.13", "2.15", "2.17", "2.19", "2.21", "2.23"]
    },
    {
      "id": 2,
      "tasks": ["2.2", "2.4", "2.6", "2.8", "2.10", "2.12", "2.14", "2.16", "2.18", "2.20", "2.22", "4.1"]
    },
    {
      "id": 3,
      "tasks": ["4.2", "5.1", "7.1"]
    },
    {
      "id": 4,
      "tasks": ["6.1", "7.2", "8.1"]
    },
    {
      "id": 5,
      "tasks": ["6.2", "6.3", "7.3", "7.6", "7.7", "8.2"]
    },
    {
      "id": 6,
      "tasks": ["7.4", "7.5", "7.8", "10.1", "11.1", "11.2", "11.3", "11.4", "11.5", "11.6", "11.7"]
    },
    {
      "id": 7,
      "tasks": ["10.2", "10.3", "10.4", "10.5", "12.1", "12.2"]
    },
    {
      "id": 8,
      "tasks": ["13.1", "14.1", "15.1", "15.2", "15.3", "16.1", "16.2", "17.1", "17.2", "17.3", "17.4", "18.1", "18.2", "18.3", "19.1", "19.2", "20.1", "20.2", "21.1", "21.2", "22.1"]
    },
    {
      "id": 9,
      "tasks": ["13.2", "14.2", "14.3", "15.4", "16.3", "17.5", "18.4", "19.3", "20.3", "21.3", "22.2", "24.1"]
    },
    {
      "id": 10,
      "tasks": ["14.4", "14.5", "14.6", "15.5", "16.4", "16.5"]
    },
    {
      "id": 11,
      "tasks": ["25.1", "25.2", "25.3"]
    },
    {
      "id": 12,
      "tasks": ["26.1", "26.2"]
    }
  ]
}
```
