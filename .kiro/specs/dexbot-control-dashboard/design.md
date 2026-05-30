# Design Document: DEXBOT Control Dashboard

## Overview

The DEXBOT Control Dashboard is a production-grade, real-time robot fleet management web application. It connects to ESP32-S3 firmware devices (DEXBOT ecosystem) through three communication channels: REST API (per-device HTTP), WebSocket (per-device ws://DEVICE_IP:81), and Firebase Realtime Database (cloud-hosted shared state). The UI follows a dark cyberpunk / Iron Man Jarvis aesthetic with glassmorphism cards, neon glow effects, and Framer Motion animations.

### Key Design Goals

- **Real-time first**: All robot state changes propagate to the UI within 500ms via WebSocket or Firebase listeners, with REST polling as a fallback.
- **Singleton services**: WebSocket_Manager, Firebase_Manager, Emotion_Manager, and Robot_State_Manager are module-level singletons — imported once, shared everywhere.
- **Strict layering**: Components never call Firebase SDK or Axios directly; all I/O flows through the service layer.
- **Resilience**: WebSocket reconnection with exponential backoff, REST timeout normalization, and Firebase offline persistence.

---

## Architecture

### High-Level System Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                     Browser (React + Vite)                       │
│                                                                   │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌────────────────┐  │
│  │  Pages   │  │Components│  │  Hooks   │  │  Context/Store │  │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └───────┬────────┘  │
│       │              │              │                 │           │
│       └──────────────┴──────────────┴─────────────────┘          │
│                              │                                    │
│                    ┌─────────▼──────────┐                        │
│                    │   Service Layer     │                        │
│                    │  WebSocket_Manager  │                        │
│                    │  Firebase_Manager   │                        │
│                    │  Emotion_Manager    │                        │
│                    │  Robot_State_Manager│                        │
│                    │  apiClient (Axios)  │                        │
│                    └──┬──────┬──────┬───┘                        │
└───────────────────────┼──────┼──────┼────────────────────────────┘
                        │      │      │
          ┌─────────────┘      │      └──────────────────┐
          ▼                    ▼                          ▼
  ┌───────────────┐  ┌──────────────────┐  ┌─────────────────────┐
  │  ESP32-S3     │  │  ESP32-S3        │  │  Firebase Realtime  │
  │  Device REST  │  │  Device WebSocket│  │  Database (Cloud)   │
  │  :80 HTTP     │  │  :81 WS          │  │                     │
  └───────────────┘  └──────────────────┘  └─────────────────────┘
```

### Communication Channels

| Channel | Protocol | Purpose | Latency Target |
|---------|----------|---------|----------------|
| REST API | HTTP/Axios | Commands, initial data fetch, OTA upload | < 2s |
| WebSocket | WS native | Real-time status, metrics, logs, emotions | < 500ms |
| Firebase RTDB | Firebase SDK | Messaging, rooms, OTA history, settings, auth | < 1s |

### Technology Stack

| Concern | Library/Tool |
|---------|-------------|
| Build | React 18 + Vite |
| Styling | Tailwind CSS v3 |
| Animation | Framer Motion |
| Routing | React Router v6 |
| State | Zustand |
| HTTP | Axios |
| Real-time DB | Firebase SDK v10 |
| Charts | Recharts |
| Icons | Lucide React |
| WebSocket | Native browser WebSocket API |

---

## Components and Interfaces

### Folder Structure

```
src/
├── assets/
│   ├── emotions/          # SVG face previews per emotion
│   └── particles/         # Particle config assets
├── components/
│   ├── auth/
│   │   ├── LoginForm.jsx
│   │   ├── RegisterForm.jsx
│   │   └── ProtectedRoute.jsx
│   ├── dashboard/
│   │   ├── AggregateMetrics.jsx
│   │   ├── SystemHealthBadge.jsx
│   │   └── FleetSummary.jsx
│   ├── robot/
│   │   ├── Robot_Card.jsx
│   │   ├── RobotStatusBadge.jsx
│   │   ├── RobotActionButtons.jsx
│   │   └── RobotMetricsRow.jsx
│   ├── emotion/
│   │   ├── EmotionPanel.jsx
│   │   ├── EmotionButton.jsx
│   │   ├── EmotionFacePreview.jsx
│   │   └── EmotionColorSwatch.jsx
│   ├── rgb/
│   │   ├── RGB_Controller.jsx
│   │   ├── ColorWheel.jsx
│   │   ├── BrightnessSlider.jsx
│   │   ├── LightingModeButtons.jsx
│   │   └── HexColorInput.jsx
│   ├── messaging/
│   │   ├── Bot_Messenger.jsx
│   │   ├── ConversationList.jsx
│   │   ├── MessageThread.jsx
│   │   ├── MessageInput.jsx
│   │   └── UnreadBadge.jsx
│   ├── rooms/
│   │   ├── RoomCard.jsx
│   │   ├── RoomActivityFeed.jsx
│   │   └── RoomMemberList.jsx
│   ├── ota/
│   │   ├── OTA_Manager.jsx
│   │   ├── OtaFileInput.jsx
│   │   ├── OtaProgressBar.jsx
│   │   └── OtaVersionHistory.jsx
│   ├── analytics/
│   │   ├── Analytics_Engine.jsx
│   │   ├── BatteryChart.jsx
│   │   ├── CpuChart.jsx
│   │   ├── TemperatureChart.jsx
│   │   └── AggregateCharts.jsx
│   ├── control/
│   │   ├── CommandInput.jsx
│   │   ├── VolumeSlider.jsx
│   │   ├── LiveLogFeed.jsx
│   │   └── WifiPanel.jsx
│   ├── settings/
│   │   ├── DevicePairingSection.jsx
│   │   ├── ApiConfigSection.jsx
│   │   ├── FirebaseConfigSection.jsx
│   │   ├── NotificationSection.jsx
│   │   └── ThemeSection.jsx
│   └── ui/
│       ├── GlassCard.jsx
│       ├── NeonButton.jsx
│       ├── ToastProvider.jsx
│       ├── ParticleBackground.jsx
│       ├── LoadingSkeleton.jsx
│       └── NavBar.jsx
├── pages/
│   ├── LoginPage.jsx
│   ├── RegisterPage.jsx
│   ├── DashboardPage.jsx
│   ├── RobotsPage.jsx
│   ├── RobotControlPage.jsx
│   ├── MessagingPage.jsx
│   ├── RoomsPage.jsx
│   ├── AnalyticsPage.jsx
│   └── SettingsPage.jsx
├── services/
│   ├── WebSocket_Manager.js
│   ├── Firebase_Manager.js
│   ├── Emotion_Manager.js
│   ├── Robot_State_Manager.js
│   └── apiClient.js
├── hooks/
│   ├── useRobotState.js
│   ├── useWebSocket.js
│   ├── useFirebaseListener.js
│   ├── useAuth.js
│   ├── useToast.js
│   └── useAnalytics.js
├── context/
│   └── AuthContext.jsx
├── utils/
│   ├── formatUptime.js
│   ├── formatTimestamp.js
│   ├── hexColorValidator.js
│   ├── systemHealth.js
│   └── emotionColors.js
└── main.jsx
```

### React Router v6 Route Structure

```jsx
// main.jsx / App.jsx
<BrowserRouter>
  <Routes>
    {/* Public routes */}
    <Route path="/login"    element={<LoginPage />} />
    <Route path="/register" element={<RegisterPage />} />

    {/* Protected routes — wrapped in ProtectedRoute */}
    <Route element={<ProtectedRoute />}>
      <Route path="/"                          element={<DashboardPage />} />
      <Route path="/robots"                    element={<RobotsPage />} />
      <Route path="/robots/:botId/control"     element={<RobotControlPage />} />
      <Route path="/messaging"                 element={<MessagingPage />} />
      <Route path="/rooms"                     element={<RoomsPage />} />
      <Route path="/analytics"                 element={<AnalyticsPage />} />
      <Route path="/settings"                  element={<SettingsPage />} />
    </Route>

    {/* Catch-all */}
    <Route path="*" element={<Navigate to="/" replace />} />
  </Routes>
</BrowserRouter>
```

`ProtectedRoute` reads `AuthContext.currentUser`. If null, it redirects to `/login?redirect=<current-path>`. After login, `LoginPage` reads the `redirect` param and navigates there.

### Key Component Interfaces

#### Robot_Card

```typescript
interface RobotCardProps {
  botId: string;
  // All data sourced from Robot_State_Manager (Zustand store)
  // No direct props for status — component subscribes to store
}
```

The card subscribes to `useRobotState(botId)` which returns the full `RobotState` slice. It renders conditionally based on `isOnline`, applying `opacity-50` and disabling action buttons when offline.

#### EmotionPanel

```typescript
interface EmotionPanelProps {
  botId: string;
  onEmotionChange?: (emotion: EmotionType) => void;
}
type EmotionType = 'HAPPY' | 'SAD' | 'ANGRY' | 'SLEEPY' | 'EXCITED' | 'NEUTRAL';
```

Delegates all API calls to `Emotion_Manager.setEmotion(botId, emotion)`. Reads current emotion from the Zustand store.

#### RGB_Controller

```typescript
interface RGBControllerProps {
  botId: string;
}
```

Internal state: `{ color: string, brightness: number, mode: LightingMode, hexInput: string, hexError: string | null }`. On color/brightness commit, calls `apiClient.post('/api/command', { rgb: color, brightness })` via the per-device Axios instance.

#### OTA_Manager

```typescript
interface OTAManagerProps {
  botId: string;
}
```

Uses `FormData` + Axios with `onUploadProgress` callback to stream progress percentage. Writes completion record to Firebase via `Firebase_Manager.recordOtaHistory(botId, record)`.

---

## Data Models

### Zustand Store Shape (Robot_State_Manager)

```typescript
// services/Robot_State_Manager.js
interface RobotState {
  botId: string;
  ip: string;
  isOnline: boolean;
  wsStatus: 'connected' | 'reconnecting' | 'disconnected';
  wsReconnectAttempt: number;
  emotion: EmotionType;
  battery: number;          // 0–100 %
  cpuUsage: number;         // 0–100 %
  cpuTemp: number;          // °C
  memoryUsage: number;      // 0–100 %
  rssi: number;             // dBm (negative)
  uptime: number;           // seconds
  roomId: string | null;
  roomName: string | null;
  firmwareVersion: string;
  lastSeen: number;         // Unix ms timestamp
}

interface RobotStoreState {
  robots: Record<string, RobotState>;   // keyed by botId
  registeredBotIds: string[];
  // Actions
  setRobotState: (botId: string, partial: Partial<RobotState>) => void;
  setOnline: (botId: string, online: boolean) => void;
  setEmotion: (botId: string, emotion: EmotionType) => void;
  setWsStatus: (botId: string, status: RobotState['wsStatus'], attempt?: number) => void;
  registerBot: (botId: string, ip: string) => void;
  removeBot: (botId: string) => void;
}
```

### Firebase Realtime Database Schema

```
/
├── registered_bots/
│   └── {BOT_ID}/
│       ├── ip: string
│       ├── name: string
│       └── registeredAt: number (timestamp ms)
│
├── bots/
│   └── {BOT_ID}/
│       ├── status/
│       │   ├── online: boolean
│       │   ├── emotion: string
│       │   ├── battery: number
│       │   ├── cpuUsage: number
│       │   ├── cpuTemp: number
│       │   ├── memoryUsage: number
│       │   ├── rssi: number
│       │   ├── uptime: number
│       │   └── lastSeen: number
│       ├── messages/
│       │   └── {MESSAGE_ID}/
│       │       ├── from: string (botId)
│       │       ├── to: string (botId)
│       │       ├── text: string
│       │       └── timestamp: number
│       ├── inbox/
│       │   └── {MESSAGE_ID}/
│       │       ├── from: string
│       │       ├── to: string
│       │       ├── text: string
│       │       └── timestamp: number
│       ├── ota_history/
│       │   └── {RECORD_ID}/
│       │       ├── filename: string
│       │       ├── fileSize: number (bytes)
│       │       └── deployedAt: number (timestamp ms)
│       └── metrics_history/
│           └── {TIMESTAMP_MS}/
│               ├── battery: number
│               ├── cpuUsage: number
│               ├── cpuTemp: number
│               ├── memoryUsage: number
│               └── rssi: number
│
├── rooms/
│   └── {ROOM_ID}/
│       ├── name: string
│       ├── createdAt: number
│       ├── lastActivity: number
│       ├── members/
│       │   └── {BOT_ID}: true
│       ├── messages/
│       │   └── {MESSAGE_ID}/
│       │       ├── from: string
│       │       ├── text: string
│       │       └── timestamp: number
│       └── commands/
│           └── {COMMAND_ID}/
│               ├── command: string
│               ├── sentBy: string (userId)
│               └── timestamp: number
│
└── users/
    └── {USER_ID}/
        └── settings/
            ├── theme: string
            ├── notificationsEnabled: boolean
            ├── firebaseConfig: object
            └── robotConfigs/
                └── {BOT_ID}/
                    ├── apiBaseUrl: string
                    └── wsPort: number
```

### REST API Response Types

```typescript
// GET /api/device
interface DeviceInfo {
  botId: string;
  firmwareVersion: string;
  chipModel: string;
  macAddress: string;
}

// GET /api/status
interface StatusResponse {
  online: boolean;
  emotion: EmotionType;
  battery: number;
  cpuUsage: number;
  cpuTemp: number;
  memoryUsage: number;
  uptime: number;
  roomId: string | null;
}

// GET /api/metrics
interface MetricsResponse {
  battery: number;
  cpuUsage: number;
  cpuTemp: number;
  memoryUsage: number;
  rssi: number;
  timestamp: number;
}

// GET /api/emotion
interface EmotionResponse {
  emotion: EmotionType;
  rgbColor: string;  // hex
}

// POST /api/emotion  body: { emotion: EmotionType }
// POST /api/command  body: { command: string, value?: any }
// GET  /api/wifi
interface WifiResponse {
  ssid: string;
  rssi: number;
  connected: boolean;
  ip: string;
}

// GET /health
interface HealthResponse {
  status: 'ok' | 'error';
  uptime: number;
}
```

### WebSocket Event Protocol

All WebSocket messages are JSON-encoded strings. The device sends events; the dashboard only receives (no upstream WS messages — commands go via REST).

```typescript
type WsEventType =
  | 'emotion_update'
  | 'status_sync'
  | 'battery_update'
  | 'log_message'
  | 'room_event'
  | 'notification'
  | 'metrics_update'
  | 'wifi_update';

interface WsEvent {
  type: WsEventType;
  botId: string;
  timestamp: number;
  payload: Record<string, unknown>;
}

// Example payloads:
// type: 'emotion_update'  → payload: { emotion: EmotionType }
// type: 'status_sync'     → payload: StatusResponse
// type: 'battery_update'  → payload: { battery: number }
// type: 'log_message'     → payload: { message: string }
// type: 'metrics_update'  → payload: MetricsResponse
// type: 'wifi_update'     → payload: WifiResponse
```

---

## Service Layer Design

### apiClient.js — Axios Instance

```javascript
// services/apiClient.js
import axios from 'axios';

/**
 * Creates a per-device Axios instance.
 * Each registered robot gets its own instance keyed by botId.
 */
const instances = new Map(); // botId → AxiosInstance

export function getApiClient(botId, baseURL) {
  if (instances.has(botId)) return instances.get(botId);

  const client = axios.create({
    baseURL,          // e.g. http://192.168.1.42
    timeout: 10_000,  // 10 seconds per Req 14.6
  });

  // Response interceptor — normalize errors
  client.interceptors.response.use(
    (res) => res,
    (err) => {
      const normalized = {
        message: err.response?.data?.message ?? err.message ?? 'Unknown error',
        status: err.response?.status ?? 0,
        code: err.code,
      };
      return Promise.reject(normalized);
    }
  );

  instances.set(botId, client);
  return client;
}

export function removeApiClient(botId) {
  instances.delete(botId);
}
```

### WebSocket_Manager.js — Singleton

```javascript
// services/WebSocket_Manager.js
const connections = new Map();   // botId → { ws, reconnectTimer, attempts }
const MAX_ATTEMPTS = 10;
const BASE_DELAY_MS = 1000;
const MAX_DELAY_MS = 30_000;

const WebSocket_Manager = {
  connect(botId, ip, port = 81, onEvent) { ... },
  disconnect(botId) { ... },
  getStatus(botId) { ... },   // 'connected' | 'reconnecting' | 'disconnected'
  _scheduleReconnect(botId, ip, port, onEvent, attempt) { ... },
};

export default WebSocket_Manager;
```

**Reconnect logic**: delay = `Math.min(BASE_DELAY_MS * 2^attempt, MAX_DELAY_MS)`. After 10 failed attempts, status becomes `'disconnected'` and the Robot_State_Manager is notified to show the Retry button.

**Message dispatch**: On `ws.onmessage`, parse JSON. If parse fails, log and discard. On success, call `onEvent(parsedEvent)` which routes to the Zustand store action.

### Firebase_Manager.js — Singleton

```javascript
// services/Firebase_Manager.js
// Wraps all Firebase SDK calls. No component imports firebase/* directly.

const Firebase_Manager = {
  // Auth
  loginWithEmail(email, password),
  registerWithEmail(email, password, displayName),
  logout(),
  onAuthStateChanged(callback),

  // Registered bots
  getRegisteredBots(),
  registerBot(botId, ip),
  removeBot(botId),

  // Bot status (write from dashboard for presence)
  updateBotStatus(botId, statusPartial),

  // Messaging
  sendMessage(fromBotId, toBotId, text),
  sendRoomMessage(roomId, fromBotId, text),
  broadcastMessage(fromBotId, allBotIds, text),
  listenToInbox(botId, callback),
  listenToRoomMessages(roomId, callback),
  loadRecentMessages(botId, targetBotId, limit = 50),

  // Rooms
  createRoom(name),
  addBotToRoom(roomId, botId),
  removeBotFromRoom(roomId, botId),
  sendRoomCommand(roomId, command, userId),
  listenToRoomActivity(roomId, callback),

  // OTA history
  recordOtaHistory(botId, { filename, fileSize, deployedAt }),
  getOtaHistory(botId),

  // Metrics history
  writeMetricsPoint(botId, metrics),
  queryMetricsHistory(botId, fromTimestamp, toTimestamp),

  // User settings
  saveUserSettings(userId, settings),
  loadUserSettings(userId),

  // Reinitialize with new config
  reinitialize(newConfig),
};

export default Firebase_Manager;
```

### Emotion_Manager.js — Singleton

```javascript
// services/Emotion_Manager.js
import { getApiClient } from './apiClient';
import { useRobotStore } from './Robot_State_Manager';

const EMOTION_COLORS = {
  HAPPY:    '#FFD700',
  SAD:      '#4169E1',
  ANGRY:    '#FF2020',
  SLEEPY:   '#4B0082',
  EXCITED:  '#00C853',
  NEUTRAL:  '#FFFFFF',
};

const TIMEOUT_MS = 5000;

const Emotion_Manager = {
  async setEmotion(botId, emotion) {
    const client = getApiClient(botId, ...);
    // Disable buttons → call POST /api/emotion → update store → re-enable
    // On error: revert store to previous emotion, show toast
  },
  getEmotionColor(emotion) {
    return EMOTION_COLORS[emotion] ?? '#FFFFFF';
  },
};

export default Emotion_Manager;
```

### Robot_State_Manager.js — Zustand Store

```javascript
// services/Robot_State_Manager.js
import { create } from 'zustand';

export const useRobotStore = create((set, get) => ({
  robots: {},
  registeredBotIds: [],

  setRobotState: (botId, partial) =>
    set((s) => ({
      robots: { ...s.robots, [botId]: { ...s.robots[botId], ...partial } },
    })),

  setOnline: (botId, online) =>
    set((s) => ({
      robots: { ...s.robots, [botId]: { ...s.robots[botId], isOnline: online } },
    })),

  setEmotion: (botId, emotion) =>
    set((s) => ({
      robots: { ...s.robots, [botId]: { ...s.robots[botId], emotion } },
    })),

  setWsStatus: (botId, wsStatus, wsReconnectAttempt = 0) =>
    set((s) => ({
      robots: { ...s.robots, [botId]: { ...s.robots[botId], wsStatus, wsReconnectAttempt } },
    })),

  registerBot: (botId, ip) =>
    set((s) => ({
      registeredBotIds: [...new Set([...s.registeredBotIds, botId])],
      robots: {
        ...s.robots,
        [botId]: s.robots[botId] ?? createDefaultRobotState(botId, ip),
      },
    })),

  removeBot: (botId) =>
    set((s) => {
      const { [botId]: _, ...rest } = s.robots;
      return {
        robots: rest,
        registeredBotIds: s.registeredBotIds.filter((id) => id !== botId),
      };
    }),
}));
```

---

## Authentication Flow

```
User visits /dashboard
      │
      ▼
ProtectedRoute checks AuthContext.currentUser
      │
  ┌───┴───┐
  │ null? │
  └───┬───┘
      │ yes                    no
      ▼                        ▼
redirect to              Render <Outlet />
/login?redirect=/dashboard   (protected page)
      │
      ▼
LoginPage renders
      │
User submits email + password
      │
      ▼
Firebase_Manager.loginWithEmail()
      │
  ┌───┴──────────────┐
  │ Firebase Auth SDK │
  └───┬──────────────┘
      │ success                error
      ▼                        ▼
AuthContext updates        Display error toast
currentUser                Stay on /login
      │
      ▼
Navigate to redirect param
(or "/" if none)
      │
      ▼
Firebase_Manager.loadUserSettings()
      │
      ▼
Robot_State_Manager hydrated
from registered_bots Firebase path
```

Session persistence uses `browserLocalPersistence` from Firebase Auth SDK, so `onAuthStateChanged` fires on page reload with the cached user.

---

## Real-Time Data Flow

### WebSocket → UI Update Flow

```
ESP32-S3 Device
      │  ws://DEVICE_IP:81
      ▼
WebSocket_Manager.onmessage
      │
      ▼
JSON.parse(event.data)
      │
  ┌───┴──────────────────────────────────────────┐
  │  Route by event.type                          │
  │  'status_sync'    → store.setRobotState()     │
  │  'emotion_update' → store.setEmotion()        │
  │  'battery_update' → store.setRobotState()     │
  │  'metrics_update' → store.setRobotState()     │
  │                   + Firebase_Manager          │
  │                     .writeMetricsPoint()      │
  │  'log_message'    → LiveLogFeed local state   │
  │  'wifi_update'    → WifiPanel local state     │
  └───────────────────────────────────────────────┘
      │
      ▼
Zustand store update triggers React re-render
in subscribed components (Robot_Card, control page, etc.)
```

### Firebase → UI Update Flow (Messaging)

```
Bot_Messenger selects conversation (sourceBot → targetBot)
      │
      ▼
Firebase_Manager.listenToInbox(targetBotId, callback)
  (onValue listener on bots/{TARGET_BOT_ID}/inbox)
      │
      ▼
New message written to Firebase
      │
      ▼
onValue fires → callback(snapshot)
      │
      ▼
MessageThread local state updated
      │
      ▼
React re-render — new message appears < 1s
```

---

## OTA Update Flow

```
Operator selects .bin file
      │
      ▼
OtaFileInput validates extension (.bin only)
      │
      ▼
Operator selects target robot(s) via checkboxes
      │
      ▼
Operator clicks "Upload"
      │
      ▼
For each selected robot (sequential):
  │
  ├─ Disable upload controls for that robot
  │
  ├─ Create FormData with file
  │
  ├─ getApiClient(botId).post('/api/ota', formData, {
  │     onUploadProgress: (e) => setProgress(e.loaded/e.total * 100)
  │  })
  │
  ├─ OtaProgressBar updates 0→100%
  │
  ├─ On success:
  │   └─ Firebase_Manager.recordOtaHistory(botId, {
  │         filename, fileSize, deployedAt: Date.now()
  │      })
  │   └─ OtaVersionHistory refreshes
  │   └─ Re-enable upload controls
  │
  └─ On failure (error or timeout > 120s):
      └─ Display descriptive error toast
      └─ Do NOT write to OTA history
      └─ Re-enable upload controls
```

---

## Analytics Data Pipeline

```
WebSocket 'metrics_update' event received
      │
      ▼
Robot_State_Manager.setRobotState() (live display)
      │
      ▼
Firebase_Manager.writeMetricsPoint(botId, {
  battery, cpuUsage, cpuTemp, memoryUsage, rssi,
  timestamp: Date.now()
})
  → writes to bots/{BOT_ID}/metrics_history/{timestamp}
      │
      ▼
Analytics_Engine page mounts
      │
      ▼
Firebase_Manager.queryMetricsHistory(botId, from, to)
  → reads bots/{BOT_ID}/metrics_history
    ordered by key, between from and to timestamps
      │
      ▼
Data mapped to Recharts <LineChart> / <BarChart> datasets
      │
      ▼
Firebase onValue listener active for live appending:
  new data point within current time range → append to chart data
  new data point outside range → discard
      │
      ▼
Firebase cleanup rule (or Cloud Function):
  deletes metrics_history entries older than 7 days
```

---

## UI/UX Design System

### Color Palette

```css
/* CSS custom properties — applied via Tailwind arbitrary values */
--color-bg-base:        #0a0a0f;   /* near-black, HSL lightness ~4% */
--color-accent-purple:  #a855f7;   /* neon purple */
--color-accent-cyan:    #22d3ee;   /* neon cyan */
--color-accent-blue:    #3b82f6;   /* electric blue */
--color-status-online:  #22c55e;   /* green */
--color-status-offline: #ef4444;   /* red */
--color-glass-bg:       rgba(255,255,255,0.08);  /* 8% opacity */
--color-glass-border:   rgba(168,85,247,0.4);    /* purple 40% */
```

### Glassmorphism Card (GlassCard.jsx)

```jsx
// Tailwind classes applied to every card surface
className="
  bg-white/[0.08]          /* semi-transparent background */
  backdrop-blur-xl          /* backdrop-filter: blur(24px) */
  border border-purple-500/40  /* neon border at 40% opacity */
  rounded-2xl
  shadow-[0_0_20px_rgba(168,85,247,0.15)]
"
```

### Neon Glow Hover (NeonButton.jsx)

```jsx
// Framer Motion whileHover transition < 150ms
<motion.button
  whileHover={{ boxShadow: '0 0 20px rgba(34,211,238,0.6)' }}
  transition={{ duration: 0.15 }}
/>
```

### Animations

| Event | Framer Motion config |
|-------|---------------------|
| Page transition | `initial={{ opacity:0, y:20 }}` → `animate={{ opacity:1, y:0 }}` — 300ms ease |
| Card mount | `initial={{ opacity:0, scale:0.95 }}` → `animate={{ opacity:1, scale:1 }}` — 200ms |
| Card unmount | `exit={{ opacity:0, scale:0.95 }}` — 200ms |
| Emotion button press | `whileTap={{ scale:0.92 }}` |
| Online pulse badge | CSS `@keyframes pulse` — 1.5s loop (continuous, not Framer Motion) |

### Particle Background

Used on `/login` and `/` (dashboard overview). Implemented as a `<canvas>` element with `requestAnimationFrame`. Config: minimum 50 particles, random velocity, neon cyan/purple colors, fade on edges. Wrapped in `ParticleBackground.jsx` using a `useEffect` hook.

### Responsive Grid

```
< 768px   → grid-cols-1   (single column)
768–1279px → grid-cols-2
≥ 1280px  → grid-cols-3 (minimum)
≥ 1920px  → grid-cols-4
```

Applied via Tailwind: `grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4`

---

## Error Handling

| Scenario | Handling |
|----------|---------|
| REST request timeout (>10s) | Axios interceptor normalizes to `{ message, status:0, code:'ECONNABORTED' }` |
| REST 4xx/5xx | Interceptor extracts `response.data.message`, surfaces via toast |
| WebSocket parse failure | Log to console, discard message, no crash |
| WebSocket exhausts reconnects | Set wsStatus='disconnected', show Retry button |
| Firebase write failure | Toast error, retain unsaved form values |
| OTA timeout (>120s) | Cancel request, show descriptive error, no history entry |
| Emotion API error | Revert emotion in store, re-enable buttons, toast |
| RGB command failure | Revert color wheel + slider to last good values, toast |
| Invalid hex color input | Inline validation error, no API call |
| Auth error | Inline form error, no navigation |
| Unauthenticated route access | Redirect to /login?redirect=<path> |

---

## Testing Strategy

### Dual Testing Approach

Unit tests cover specific examples, edge cases, and error conditions. Property-based tests verify universal properties across all inputs. Both are complementary.

**Unit Testing Focus:**
- Auth form validation (specific error messages)
- Uptime formatter edge cases (0s, exactly 1d, overflow)
- Hex color validator (boundary inputs)
- System health computation (exact thresholds)
- WebSocket reconnect timer scheduling
- Emotion color mapping completeness

**Property-Based Testing:**
- Use [fast-check](https://github.com/dubzzz/fast-check) (JavaScript PBT library)
- Minimum 100 iterations per property test
- Each test tagged with: `// Feature: dexbot-control-dashboard, Property N: <text>`

**Integration Tests:**
- Firebase read/write round-trips (with Firebase emulator)
- Axios interceptor normalization with mock server
- WebSocket reconnect sequence with mock WS server


---

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*



---

### Property 1: Form Validation Rejects Invalid Inputs

*For any* login form submission where the email field is empty, the password field is empty, or both are empty, the `validateLoginForm` function SHALL return a non-empty errors object containing an error entry for each empty field; and *for any* registration form submission where the password is fewer than 8 characters or the display name is outside the 1–50 character range or the email is malformed, `validateRegisterForm` SHALL return a non-empty errors object identifying each violated rule.

**Validates: Requirements 1.1, 1.2**

---

### Property 2: Protected Route Redirect Preserves Path

*For any* valid URL path string that corresponds to a protected route, when `ProtectedRoute` renders with `currentUser = null`, the component SHALL redirect to `/login` with a `redirect` query parameter whose value equals the original path string.

**Validates: Requirements 1.6, 14.10**

---

### Property 3: NavBar Renders Authenticated User Identity

*For any* Firebase user object with a non-empty `displayName`, the NavBar component SHALL render the display name as visible text and SHALL render an avatar element whose accessible label contains the user's initials (first letter of each word in the display name, uppercased).

**Validates: Requirements 1.8**

---

### Property 4: System Health Computation Is Correct for All Ratios

*For any* pair of non-negative integers `(onlineCount, totalCount)` where `0 ≤ onlineCount ≤ totalCount` and `totalCount > 0`, the `computeSystemHealth(onlineCount, totalCount)` function SHALL return:
- `"Healthy"` when `onlineCount === totalCount`
- `"Degraded"` when `onlineCount / totalCount ≥ 0.5` and `onlineCount < totalCount`
- `"Critical"` when `onlineCount / totalCount > 0` and `onlineCount / totalCount < 0.5`
- `"Offline"` when `onlineCount === 0`

**Validates: Requirements 2.4**

---

### Property 5: Aggregate Metrics Computation Is Mathematically Correct

*For any* non-empty array of robot state objects, the `computeAggregates` function SHALL return an object where `averageBattery`, `averageCpu`, and `averageRssi` each equal the arithmetic mean of the corresponding field across all robots in the array, rounded to at most two decimal places.

**Validates: Requirements 2.3**

---

### Property 6: Robot_Card Renders All Required Fields for Any Robot State

*For any* `RobotState` object with valid field values, the `Robot_Card` component SHALL render visible text containing: the `botId`, the emotion label, the battery percentage (formatted as `N%`), the RSSI value (formatted as `N dBm`), the IP address, the uptime (formatted as `Xd Xh Xm`), the CPU temperature (formatted as `N°C`), and the memory usage (formatted as `N%`).

**Validates: Requirements 3.2**

---

### Property 7: Online/Offline Visual State Is Correct for Any Robot

*For any* robot state where `isOnline = true`, the `Robot_Card` SHALL render a status badge element with a CSS class that applies a pulse animation; and *for any* robot state where `isOnline = false`, the `Robot_Card` SHALL render with an opacity value in the range `[0.4, 0.6]` and a status badge element styled with the offline (red) color token.

**Validates: Requirements 2.7, 2.8, 3.3**

---

### Property 8: Offline Robot Action Buttons Never Trigger API Calls

*For any* action button type (Control, Message, Emotion, RGB, OTA Update, Restart) and *for any* robot state where `isOnline = false`, clicking that action button SHALL result in zero Axios requests being made and SHALL display a toast notification.

**Validates: Requirements 3.9**

---

### Property 9: Slider Value Dispatch for Any Value in Range

*For any* integer value `v` in `[0, 100]`, releasing the volume slider at value `v` SHALL trigger exactly one `POST /api/command` call with a payload containing `v`; and *for any* integer value `v` in `[0, 255]`, releasing the brightness slider at value `v` SHALL trigger exactly one `POST /api/command` call with a payload containing `v`.

**Validates: Requirements 4.4, 4.5**

---

### Property 10: Emotion API Call and Button Disable for Any Emotion Type

*For any* `EmotionType` value in `{ HAPPY, SAD, ANGRY, SLEEPY, EXCITED, NEUTRAL }`, clicking the corresponding emotion button SHALL: (a) call `POST /api/emotion` with the correct emotion value in the request body, and (b) disable all six emotion buttons for the duration of the pending request.

**Validates: Requirements 5.2**

---

### Property 11: Emotion Color Mapping Is Complete and Correct

*For any* `EmotionType` value, `Emotion_Manager.getEmotionColor(emotion)` SHALL return the exact hex color specified: HAPPY → `#FFD700`, SAD → `#4169E1`, ANGRY → `#FF2020`, SLEEPY → `#4B0082`, EXCITED → `#00C853`, NEUTRAL → `#FFFFFF`.

**Validates: Requirements 5.5**

---

### Property 12: Emotion Error Reverts to Previous State

*For any* pair `(previousEmotion, attemptedEmotion)` of `EmotionType` values where the `POST /api/emotion` request fails or times out, the Zustand store's emotion value for that robot SHALL revert to `previousEmotion` and all six emotion buttons SHALL be re-enabled.

**Validates: Requirements 5.7**

---

### Property 13: Hex Color Validation Accepts Valid and Rejects Invalid Inputs

*For any* string that consists of exactly six characters all in `[0-9A-Fa-f]` (optionally prefixed with `#`), `validateHexColor` SHALL return `{ valid: true }`; and *for any* string that does not match this pattern (wrong length, non-hex characters, or empty), `validateHexColor` SHALL return `{ valid: false, error: "Invalid hex color" }` and no `POST /api/command` call SHALL be made.

**Validates: Requirements 6.6, 6.8**

---

### Property 14: Message Write Targets Correct Firebase Paths for Any Valid Message

*For any* `(fromBotId, toBotId, messageText)` triple where `messageText` has length in `[1, 500]`, calling `Firebase_Manager.sendMessage` SHALL invoke Firebase `set` (or `push`) on both `bots/{fromBotId}/messages/{id}` and `bots/{toBotId}/inbox/{id}` with a document containing `from`, `to`, `text`, and `timestamp` fields.

**Validates: Requirements 7.2**

---

### Property 15: Message Timestamp Formatting Is Correct for Any Timestamp

*For any* Unix millisecond timestamp, the `formatMessageTimestamp(ts)` utility SHALL return a string matching `HH:MM` (24-hour) when the timestamp falls on today's date, and a string matching `MMM D, HH:MM` when the timestamp falls on a prior date.

**Validates: Requirements 7.4**

---

### Property 16: Broadcast Writes to Every Bot's Inbox

*For any* non-empty array of registered bot IDs and *for any* message text of length `[1, 500]`, calling `Firebase_Manager.broadcastMessage` SHALL invoke a Firebase write to `bots/{BOT_ID}/inbox/{id}` for every bot ID in the array, with no bot omitted.

**Validates: Requirements 7.7**

---

### Property 17: WebSocket Reconnect Delay Formula Is Correct for All Attempt Numbers

*For any* attempt number `n` in `[0, 9]`, the `computeReconnectDelay(n)` function SHALL return `Math.min(1000 * Math.pow(2, n), 30000)` milliseconds.

**Validates: Requirements 9.3**

---

### Property 18: WebSocket Message Parser Handles Any String Input Without Crashing

*For any* string `s`, calling `WebSocket_Manager._parseMessage(s)` SHALL either: (a) return a parsed event object when `s` is valid JSON conforming to the `WsEvent` schema, or (b) return `null` and log an error when `s` is not valid JSON or does not conform to the schema — in neither case SHALL the function throw an uncaught exception.

**Validates: Requirements 9.4**

---

### Property 19: OTA File Validator Accepts Only .bin Extensions

*For any* filename string, `validateOtaFile(filename)` SHALL return `{ valid: true }` if and only if the filename ends with the case-insensitive suffix `.bin`; for all other filenames it SHALL return `{ valid: false, error: "Only .bin firmware files are supported" }`.

**Validates: Requirements 10.1**

---

### Property 20: Metrics Time-Range Filter Returns Only In-Range Points

*For any* array of timestamped metrics data points and *for any* `(fromTimestamp, toTimestamp)` pair where `fromTimestamp ≤ toTimestamp`, the `filterMetricsForRange(points, from, to)` function SHALL return exactly the subset of points where `from ≤ point.timestamp ≤ to`, with no points outside the range included and no in-range points omitted.

**Validates: Requirements 11.1, 11.2, 11.3, 11.5**

---

### Property 21: Hourly Aggregation Bucket Counts Are Correct

*For any* array of timestamped events, the `aggregateByHour(events)` function SHALL return a map where each bucket's count equals the number of events whose timestamp falls within that UTC hour, and the union of all bucket event sets equals the original event array with no events double-counted or omitted.

**Validates: Requirements 11.4**

---

### Property 22: Bot Registration Validator Accepts Valid and Rejects Invalid Inputs

*For any* `(botId, ip)` pair, `validateBotRegistration(botId, ip, existingIds)` SHALL return `{ valid: true }` when `botId` matches `[A-Za-z0-9_]{1,64}`, `ip` is a valid IPv4 address, and `botId` is not in `existingIds`; and SHALL return `{ valid: false }` with a descriptive error when any of these conditions is violated.

**Validates: Requirements 12.2**

---

### Property 23: Axios Error Interceptor Normalizes Any HTTP Error to a Consistent Shape

*For any* Axios error object (whether from a network failure, a 4xx response, or a 5xx response, with or without a response body), the response interceptor SHALL produce a rejected promise whose reason is an object containing exactly the fields `{ message: string, status: number, code: string }`, with no field missing or undefined.

**Validates: Requirements 14.6**

---
