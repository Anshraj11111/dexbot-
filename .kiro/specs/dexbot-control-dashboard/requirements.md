# Requirements Document

## Introduction

The DEXBOT Control Dashboard is a production-level, futuristic AI robot operating system web application built with React.js + Vite. It connects to ESP32-S3 firmware-based robots (DEXBOT ecosystem) via REST API, WebSocket, and Firebase Realtime Database. The dashboard enables real-time monitoring, control, and communication across multiple robots simultaneously. The UI follows a dark cyberpunk / Iron Man Jarvis aesthetic with glassmorphism cards, neon glow effects, and smooth Framer Motion animations.

---

## Glossary

- **Dashboard**: The main web application interface for monitoring and controlling all robots.
- **Bot / Robot**: An ESP32-S3 firmware device in the DEXBOT ecosystem (e.g., DEX_4, DEX_6).
- **Auth_System**: The Firebase Authentication module handling login, registration, and session persistence.
- **Robot_Card**: A UI component displaying a single robot's live status and action buttons.
- **Emotion_System**: The module responsible for sending and displaying robot emotional states (HAPPY, SAD, ANGRY, SLEEPY, EXCITED, NEUTRAL).
- **RGB_Controller**: The module for controlling FastLED RGB lighting on a robot.
- **WebSocket_Manager**: The client-side manager that maintains persistent WebSocket connections to robot devices at `ws://DEVICE_IP:81`.
- **Firebase_Manager**: The module managing Firebase Realtime Database reads/writes and Firebase Authentication.
- **Bot_Messenger**: The real-time bot-to-bot and bot-to-room messaging system backed by Firebase.
- **Room**: A logical group of robots that can receive broadcast commands and group messages.
- **OTA_Manager**: The module handling over-the-air firmware update uploads and deployment.
- **Analytics_Engine**: The module collecting, storing, and rendering historical metrics charts.
- **REST_API**: The HTTP API exposed by each robot firmware (base URL: `http://DEVICE_IP`).
- **JWT**: JSON Web Token used for Firebase Authentication session persistence.
- **Firmware**: The ESP32-S3 software running on each robot device.
- **Uptime**: The duration a robot has been continuously online since last boot.
- **RSSI**: WiFi signal strength value reported by the robot firmware.
- **OTA**: Over-The-Air firmware update mechanism.
- **HEX_Color**: A six-character hexadecimal color code (e.g., `#FF00FF`).
- **Broadcast**: A message or command sent to all robots in a Room simultaneously.

---

## Requirements

### Requirement 1: Authentication System

**User Story:** As a user, I want to securely log in and register with Firebase Authentication, so that only authorized users can access and control the robots.

#### Acceptance Criteria

1. THE Auth_System SHALL provide a login form accepting an email address and password, with inline validation errors displayed when either field is empty on submit.
2. THE Auth_System SHALL provide a registration form accepting an email address, password (minimum 8 characters), and display name (1–50 characters), with inline validation errors for each field.
3. WHEN a user submits valid login credentials, THE Auth_System SHALL authenticate via Firebase Authentication and redirect to the Dashboard within 3 seconds.
4. WHEN a user submits invalid credentials, THE Auth_System SHALL display a descriptive error message (e.g., "Invalid email or password") below the form without navigating away from the login page.
5. WHEN a user closes and reopens the browser, THE Auth_System SHALL restore the authenticated session using Firebase's persisted auth state without requiring re-login, provided the session has not expired.
6. WHEN an unauthenticated user attempts to access any route except `/login` or `/register`, THE Auth_System SHALL redirect them to `/login` and preserve the originally requested URL as a redirect parameter.
7. WHEN a user clicks logout, THE Auth_System SHALL call Firebase `signOut`, clear all local auth state, and redirect to `/login` within 1 second.
8. WHILE a user is authenticated, THE Auth_System SHALL display the user's display name and a generated avatar (initials-based if no photo URL) in the navigation header.
9. WHEN a registration form is submitted with an email already in use, THE Auth_System SHALL display the error "An account with this email already exists" without navigating away.

---

### Requirement 2: Main Dashboard Overview

**User Story:** As an operator, I want a real-time overview of all connected robots and their key metrics, so that I can monitor the fleet health at a glance.

#### Acceptance Criteria

1. THE Dashboard SHALL display the total count of registered robots; IF no robots are registered, THE Dashboard SHALL display a "No robots registered" empty state with a link to the Settings page.
2. WHEN a robot's online or offline status changes, THE Dashboard SHALL update the online and offline robot counts within 2 seconds without a page refresh.
3. THE Dashboard SHALL display live aggregate metrics: average battery percentage, average CPU usage, average WiFi RSSI, total active room count, and a system health indicator.
4. THE system health indicator SHALL be computed as: "Healthy" when 100% of registered robots are online, "Degraded" when 50–99% are online, "Critical" when 1–49% are online, and "Offline" when 0% are online.
5. WHEN a robot's metric value changes, THE Dashboard SHALL reflect the updated aggregate value within 2 seconds via WebSocket or Firebase sync.
6. THE Dashboard SHALL render a summary Robot_Card for each registered robot showing Bot ID, online status indicator, current emotion, and battery percentage; IF no robots are registered, THE Dashboard SHALL display the empty state from criterion 1 in place of the card grid.
7. WHILE a robot is online, THE Dashboard SHALL display an animated neon pulse indicator on its Robot_Card status badge.
8. IF a robot is offline, THEN THE Dashboard SHALL display its Robot_Card with reduced opacity between 40% and 60% and a red status badge.

---

### Requirement 3: Robots Page

**User Story:** As an operator, I want to view all robots as futuristic cards with full status details and quick-action buttons, so that I can manage any robot from a single page.

#### Acceptance Criteria

1. THE Robots page SHALL render one Robot_Card per registered robot; IF no robots are registered, THE page SHALL display an empty state message with a link to the Settings page to add a robot.
2. EACH Robot_Card SHALL display: Bot ID, online/offline status badge, current emotion label, battery percentage (0–100%), WiFi RSSI (dBm), room name or "No Room" if unassigned, IP address, uptime formatted as `Xd Xh Xm`, CPU temperature in °C, and memory usage as a percentage of total heap.
3. WHEN a robot transitions to offline, THE Robot_Card SHALL update its status badge to red and reduce card opacity to between 40% and 60% within 2 seconds, without a page refresh.
4. EACH Robot_Card SHALL provide the following action buttons: Control, Message, Emotion, RGB, OTA Update, Restart, and Open Full View; buttons for offline robots SHALL be visually disabled except for Open Full View.
5. WHEN the operator clicks the Restart button on an online Robot_Card, THE Dashboard SHALL send a restart command via `POST /api/command` and display a toast notification confirming the restart was sent; IF the request fails, THE Dashboard SHALL display an error toast.
6. WHEN the operator clicks Open Full View on a Robot_Card, THE Dashboard SHALL navigate to `/robots/{BOT_ID}/control`.
7. WHEN the Robots page mounts, THE Dashboard SHALL fetch initial data from `GET /api/device`, `GET /api/status`, and `GET /api/metrics` for each registered robot concurrently and display a loading skeleton per card until data is received.
8. WHILE a robot is online, THE Robot_Card SHALL update its displayed metrics within 5 seconds of a change, sourced from WebSocket events or a polling fallback at 5-second intervals.
9. WHEN a Robot_Card action button is clicked for an offline robot, THE Dashboard SHALL display a toast notification stating the robot is offline and SHALL NOT send any API request.

---

### Requirement 4: Live Robot Control

**User Story:** As an operator, I want a full-screen control interface for each robot, so that I can send commands, adjust settings, and receive real-time feedback.

#### Acceptance Criteria

1. WHEN the operator navigates to `/robots/{BOT_ID}/control`, THE Dashboard SHALL render a dedicated full-screen control page for that robot.
2. WHEN the control page mounts, THE Dashboard SHALL fetch current status from `GET /api/status` and metrics from `GET /api/metrics` and display the results; IF either request fails, THE Dashboard SHALL display an inline error banner with a retry button.
3. WHEN the operator submits a command via the command input, THE Dashboard SHALL send it via `POST /api/command` and display the API response text in a feedback panel within 2 seconds; IF the request fails, THE Dashboard SHALL display the error message in the feedback panel.
4. THE Dashboard SHALL provide a volume slider with range 0–100 and step 1; WHEN the slider value changes and the operator releases the slider, THE Dashboard SHALL send `POST /api/command` with the volume value within 300ms.
5. THE Dashboard SHALL provide a brightness slider with range 0–255 and step 1; WHEN the slider value changes and the operator releases the slider, THE Dashboard SHALL send `POST /api/command` with the brightness value within 300ms.
6. WHEN the WebSocket_Manager receives a status or metrics update event for the active robot, THE Dashboard SHALL update all corresponding displayed values on the control page within 500ms without a page refresh.
7. THE Dashboard SHALL display a live log feed showing the last 100 WebSocket messages received from the robot, with each entry showing a timestamp and message content; WHEN a new message arrives, THE Dashboard SHALL append it to the feed and auto-scroll to the bottom.
8. WHEN the control page mounts, THE Dashboard SHALL fetch WiFi details from `GET /api/wifi` and display SSID, RSSI, and connection status; WHEN a WiFi update is received via WebSocket, THE Dashboard SHALL update these values within 500ms.
9. WHEN the operator navigates away from the control page, THE Dashboard SHALL close the WebSocket connection for that robot and clear the live log feed.

---

### Requirement 5: Emotion Control System

**User Story:** As an operator, I want to set a robot's emotional state from the dashboard, so that the robot can express the correct emotion through its display and RGB lighting.

#### Acceptance Criteria

1. THE Emotion_System SHALL provide six animated emotion buttons labeled: HAPPY, SAD, ANGRY, SLEEPY, EXCITED, and NEUTRAL, each with a distinct icon and color accent.
2. WHEN the operator clicks an emotion button, THE Emotion_System SHALL send a `POST /api/emotion` request to the target robot with the selected emotion value and disable all emotion buttons until the request resolves.
3. WHEN the `POST /api/emotion` request returns a success response, THE Emotion_System SHALL update the displayed current emotion on the Robot_Card and control page within 1 second and re-enable all emotion buttons.
4. WHILE an emotion is active, THE Emotion_System SHALL display an animated face preview SVG corresponding to that emotion in the emotion panel.
5. WHILE an emotion is active, THE Emotion_System SHALL display a color swatch preview showing the RGB LED color associated with that emotion (HAPPY: yellow, SAD: blue, ANGRY: red, SLEEPY: indigo, EXCITED: green, NEUTRAL: white).
6. WHEN the WebSocket_Manager receives an emotion update event for the active robot, THE Emotion_System SHALL update the displayed emotion label, face preview, and RGB color swatch within 500ms without requiring a manual API call.
7. IF the `POST /api/emotion` request returns an error response or times out after 5 seconds, THEN THE Emotion_System SHALL display a toast error notification, revert the displayed emotion to the previously confirmed state, and re-enable all emotion buttons.

---

### Requirement 6: RGB Lighting Control

**User Story:** As an operator, I want to control the FastLED RGB lighting on each robot, so that I can customize its visual appearance and lighting effects.

#### Acceptance Criteria

1. THE RGB_Controller SHALL provide an interactive color wheel that allows the operator to select any RGB color by clicking or dragging within the wheel.
2. THE RGB_Controller SHALL provide a brightness slider with range 0–255 and step 1, displaying the current numeric value alongside the slider.
3. WHEN the operator finishes selecting a color on the color wheel or releases the brightness slider, THE RGB_Controller SHALL send the updated color and brightness values to the robot via `POST /api/command` within 300ms.
4. THE RGB_Controller SHALL provide four selectable lighting mode buttons: Rainbow, Breathing, Pulse, and Music Reactive; only one mode may be active at a time.
5. WHEN the operator selects a lighting mode button, THE RGB_Controller SHALL send the mode command to the robot via `POST /api/command` and highlight the active mode button.
6. THE RGB_Controller SHALL provide a HEX_Color text input field that accepts exactly six hexadecimal characters (with or without a leading `#`).
7. WHEN a valid six-character HEX_Color is entered and the input loses focus or the operator presses Enter, THE RGB_Controller SHALL update the color wheel to reflect the entered color and send the color to the robot via `POST /api/command`.
8. IF the HEX_Color input contains fewer or more than six hexadecimal characters, or contains non-hexadecimal characters, THEN THE RGB_Controller SHALL display an inline validation error "Invalid hex color" and SHALL NOT send any command to the robot.
9. IF a `POST /api/command` request for an RGB update fails, THEN THE RGB_Controller SHALL display a toast error notification and revert the color wheel and brightness slider to their last successfully applied values.

---

### Requirement 7: Bot-to-Bot Communication System

**User Story:** As an operator, I want to send messages between robots and monitor their conversations in real-time, so that I can coordinate multi-robot operations.

#### Acceptance Criteria

1. THE Bot_Messenger SHALL provide a messaging interface with a conversation list panel and a message thread panel; the operator SHALL be able to select a source bot and a target bot from the list of registered robots to open a conversation.
2. WHEN the operator sends a message (1–500 characters), THE Bot_Messenger SHALL write the message to Firebase under the source bot's outbox and the target bot's inbox with fields: from, to, message text, and a server-generated timestamp; IF the write fails, THE Bot_Messenger SHALL display a toast error and retain the message text in the input field.
3. WHEN a new message document is written to Firebase for the active conversation, THE Bot_Messenger SHALL display the message in the thread panel within 1 second without a page refresh.
4. EACH message in the thread SHALL display: the sender Bot ID, the message text, and the timestamp formatted as `HH:MM` for today's messages or `MMM D, HH:MM` for older messages.
5. WHILE the operator is typing in the message input field, THE Bot_Messenger SHALL display a typing indicator in the thread panel after 500ms of inactivity.
6. THE Bot_Messenger SHALL support room messaging by allowing the operator to select a room as the target; WHEN sent, THE Bot_Messenger SHALL write the message to the room's message path in Firebase and display it in the room's thread.
7. THE Bot_Messenger SHALL support broadcast messaging by providing a "Broadcast to All" option; WHEN sent, THE Bot_Messenger SHALL write the message to every registered bot's inbox in Firebase; IF any individual write fails, THE Bot_Messenger SHALL display a summary notification listing the bots that failed to receive the message.
8. WHEN a new message arrives for a conversation that is not currently open, THE Bot_Messenger SHALL display a numeric unread badge on the messaging navigation item and on the conversation list entry; WHEN the operator opens that conversation, THE Bot_Messenger SHALL clear the badge.
9. WHEN a conversation is opened, THE Bot_Messenger SHALL load the most recent 50 messages from Firebase and display them in chronological order; IF fewer than 50 messages exist, THE Bot_Messenger SHALL display all available messages.

---

### Requirement 8: Rooms System

**User Story:** As an operator, I want to organize robots into rooms and send group commands, so that I can manage clusters of robots efficiently.

#### Acceptance Criteria

1. THE Rooms page SHALL allow the operator to create a new room by entering a room name (1–64 characters, alphanumeric and underscores only); WHEN submitted, THE Dashboard SHALL write the room to Firebase and display it in the room list within 2 seconds; IF a room with the same name already exists, THE Dashboard SHALL display an inline error "Room name already exists".
2. THE Dashboard SHALL allow the operator to add a registered robot to a room by selecting the robot from a dropdown on the room detail page; WHEN added, THE Dashboard SHALL update the room membership in Firebase within 2 seconds.
3. THE Dashboard SHALL allow the operator to remove a robot from a room; WHEN removed, THE Dashboard SHALL update the room membership in Firebase and remove the robot from the room's member list in the UI within 2 seconds.
4. WHEN the operator sends a broadcast command to a room, THE Dashboard SHALL write the command to Firebase under the room's commands path and deliver it to all robots currently assigned to that room; IF any delivery fails, THE Dashboard SHALL display a summary notification listing the affected robots.
5. THE Dashboard SHALL support sending a group emotion to all robots in a room simultaneously by selecting an emotion from the Emotion_System panel on the room detail page; WHEN sent, THE Dashboard SHALL issue `POST /api/emotion` to each robot in the room concurrently.
6. THE Rooms page SHALL display a room activity feed showing the last 20 events (commands sent, messages received, robot status changes) for each room, updated in real-time via Firebase listeners.
7. THE Rooms page SHALL display a list of all rooms, each showing the room name, member robot count, and the timestamp of the last activity; IF no rooms exist, THE page SHALL display an empty state with a "Create Room" button.

---

### Requirement 9: Live WebSocket System

**User Story:** As an operator, I want persistent WebSocket connections to each online robot, so that I receive real-time updates without polling.

#### Acceptance Criteria

1. WHEN a robot's control page mounts or its Robot_Card becomes visible in the viewport, THE WebSocket_Manager SHALL establish a WebSocket connection to `ws://{DEVICE_IP}:81` for that robot.
2. WHEN a WebSocket connection is established, THE WebSocket_Manager SHALL begin receiving and processing event types: emotion updates, status sync, battery updates, log messages, room events, and notifications.
3. WHEN the WebSocket connection drops, THE WebSocket_Manager SHALL attempt to reconnect using exponential backoff starting at 1 second, doubling each attempt up to a maximum interval of 30 seconds, for a maximum of 10 reconnect attempts.
4. WHEN a WebSocket message is received, THE WebSocket_Manager SHALL parse the JSON payload and dispatch the update to the relevant UI component within 500ms; IF the payload is not valid JSON, THE WebSocket_Manager SHALL log the error and discard the message without crashing.
5. WHILE a WebSocket connection is active for a robot, THE Dashboard SHALL display a "Connected" status indicator on that robot's Robot_Card and control page.
6. WHILE a WebSocket connection is reconnecting for a robot, THE Dashboard SHALL display a "Reconnecting" status indicator with the current attempt number on that robot's Robot_Card and control page.
7. WHEN the robot's control page unmounts, THE WebSocket_Manager SHALL close the WebSocket connection for that robot and cancel any pending reconnect timers.
8. IF the WebSocket_Manager exhausts all 10 reconnect attempts without success, THEN THE Dashboard SHALL display a "Disconnected" status indicator and a "Retry" button that resets the reconnect counter and begins a new reconnect sequence.

---

### Requirement 10: OTA Firmware Update

**User Story:** As a developer, I want to upload and deploy firmware updates to one or multiple robots from the dashboard, so that I can keep the fleet up to date without physical access.

#### Acceptance Criteria

1. THE OTA_Manager SHALL provide a file upload input that accepts only files with a `.bin` extension; IF a file with a different extension is selected, THE OTA_Manager SHALL display an inline error "Only .bin firmware files are supported" and SHALL NOT proceed with the upload.
2. WHEN the operator selects a valid `.bin` file and clicks "Upload", THE OTA_Manager SHALL display a progress bar showing upload completion as a percentage from 0% to 100%.
3. THE OTA_Manager SHALL allow the operator to select one or more target robots via checkboxes before initiating an upload; WHEN multiple robots are selected, THE OTA_Manager SHALL deploy the firmware to each robot sequentially, displaying individual progress bars per robot.
4. WHEN an OTA update completes successfully on a robot, THE OTA_Manager SHALL record the firmware filename, file size, and completion timestamp in Firebase under the robot's OTA history path.
5. THE OTA_Manager SHALL display a version history list per robot showing each recorded firmware entry with its filename, file size, and deployment timestamp, sorted by most recent first.
6. THE OTA_Manager SHALL provide a "Rollback" button for each version history entry; WHEN clicked, THE OTA_Manager SHALL re-deploy that firmware version to the robot and display a progress bar for the rollback operation.
7. IF an OTA update fails at any point (upload error, device rejection, or timeout after 120 seconds), THEN THE OTA_Manager SHALL display a descriptive error message identifying the failure reason and SHALL NOT add an entry to the version history for that failed attempt.
8. WHEN an OTA update is in progress for a robot, THE OTA_Manager SHALL disable the upload controls for that robot to prevent concurrent update attempts.

---

### Requirement 11: Analytics Page

**User Story:** As an operator, I want to view historical performance charts for each robot, so that I can identify trends and diagnose issues over time.

#### Acceptance Criteria

1. THE Analytics_Engine SHALL display a battery level history line chart per robot for the operator-selected time range, with the Y-axis ranging from 0% to 100%.
2. THE Analytics_Engine SHALL display a CPU usage history line chart per robot for the operator-selected time range, with the Y-axis ranging from 0% to 100%.
3. THE Analytics_Engine SHALL display a temperature history line chart per robot for the operator-selected time range, with the Y-axis labeled in °C.
4. THE Analytics_Engine SHALL display four aggregate charts for the operator-selected time range: total commands sent per hour (bar chart), total messages exchanged per hour (bar chart), active room count over time (line chart), and online bot count over time (line chart).
5. WHEN new metric data is received via WebSocket or Firebase and falls within the current view's time range, THE Analytics_Engine SHALL append the data point to the relevant chart without a page refresh; IF the data point falls outside the current time range, THE Analytics_Engine SHALL discard it from the view.
6. THE Analytics_Engine SHALL store metric data points in Firebase under each robot's metrics history path with a timestamp key; data points older than 7 days SHALL be automatically deleted by a Firebase cleanup rule or scheduled function.
7. WHEN the operator selects a time range, THE Analytics_Engine SHALL default to 24 hours on page load; WHEN the operator selects a different range (1 hour, 6 hours, 24 hours, or 7 days), THE Analytics_Engine SHALL reload all charts to display data for the selected range within 2 seconds.
8. IF no metric history exists for a robot within the selected time range, THE Analytics_Engine SHALL display an empty state message "No data available for this period" in place of the chart.

---

### Requirement 12: Settings Page

**User Story:** As an administrator, I want to configure application-level settings including Firebase, API, and notification preferences, so that the dashboard connects correctly to the infrastructure.

#### Acceptance Criteria

1. THE Settings page SHALL be organized into the following labeled sections: Device Pairing, API Configuration, Firebase Configuration, Notification Settings, and Theme Preferences.
2. THE Dashboard SHALL allow the operator to register a new robot by providing a Bot ID (1–64 alphanumeric characters or underscores) and a valid IPv4 address; WHEN submitted, THE Dashboard SHALL store the pairing in Firebase and display a success confirmation; IF the Bot ID already exists, THE Dashboard SHALL display an inline error "A robot with this ID is already registered".
3. WHEN the operator saves Firebase configuration changes (API key, project ID, database URL), THE Dashboard SHALL reinitialize the Firebase_Manager with the new values and display a "Firebase reconnected" confirmation toast; IF reinitialization fails, THE Dashboard SHALL display an error toast and revert to the previous configuration.
4. THE Dashboard SHALL provide a notification toggle; WHEN enabled, THE Dashboard SHALL request browser notification permission; IF the browser denies permission, THE Dashboard SHALL revert the toggle to disabled and display an inline message "Browser notifications were denied. Please update your browser settings."
5. THE Dashboard SHALL allow the operator to configure a custom REST API base URL (maximum 2048 characters, must be a valid HTTP or HTTPS URL) and WebSocket port (integer between 1 and 65535) per registered robot.
6. WHEN the operator clicks "Save Settings", THE Dashboard SHALL persist all settings to Firebase under the authenticated user's settings path and display a success toast; IF the Firebase write fails, THE Dashboard SHALL display an error toast and retain the unsaved values in the form.
7. WHEN the authenticated user logs in, THE Dashboard SHALL restore all previously saved settings from Firebase before rendering any page that depends on those settings.

---

### Requirement 13: UI/UX and Visual Design

**User Story:** As a user, I want the dashboard to feel like a professional AI robot operating system, so that the experience is immersive, intuitive, and visually impressive.

#### Acceptance Criteria

1. THE Dashboard SHALL use a near-black background (lightness value ≤ 5% in HSL) as the base theme on all pages.
2. THE Dashboard SHALL apply neon glow effects using neon purple, cyan, and electric blue as the three primary accent colors for borders, icons, and interactive elements.
3. THE Dashboard SHALL use green for online and healthy status indicators and red for offline and alert indicators throughout all pages.
4. THE Dashboard SHALL render all cards with a semi-transparent background (opacity between 5% and 20%), a backdrop blur of at least 8px, and a neon-colored border at 30–50% opacity.
5. THE Dashboard SHALL animate all page transitions and card mount/unmount events using Framer Motion with a duration between 200ms and 500ms.
6. WHEN the login page or dashboard overview page is active, THE Dashboard SHALL display a particle background animation with a minimum of 50 particles moving continuously.
7. WHILE the user hovers over an interactive button or card, THE Dashboard SHALL apply a neon glow box-shadow transition completing within 150ms.
8. THE Dashboard SHALL be fully responsive across screen widths from 320px to 2560px; at widths below 768px, multi-column card grids SHALL collapse to a single column; at widths above 1280px, card grids SHALL display a minimum of 3 columns.
9. WHILE a robot is online, THE Dashboard SHALL display a continuously looping pulse animation on its status badge with a cycle duration between 1 second and 2 seconds.
10. THE Dashboard SHALL use Lucide React icons for all iconography; custom SVG icons are permitted only for emotion face previews.

---

### Requirement 14: Technical Architecture

**User Story:** As a developer, I want the codebase to follow a clean, modular architecture, so that the application is maintainable, scalable, and easy to extend.

#### Acceptance Criteria

1. THE Dashboard source code SHALL be organized into the following top-level directories under `src/`: `components/`, `pages/`, `services/`, `hooks/`, `context/`, `utils/`, and `assets/`.
2. THE Dashboard SHALL implement a WebSocket_Manager service as a singleton module that manages all WebSocket connections; a second import of the module SHALL return the same instance without creating a new connection.
3. THE Dashboard SHALL implement a Firebase_Manager service module that encapsulates all Firebase SDK calls; no component or page SHALL import Firebase SDK methods directly.
4. THE Dashboard SHALL implement an Emotion_Manager service module that encapsulates all emotion state transitions and `POST /api/emotion` calls; no component SHALL call the emotion API endpoint directly.
5. THE Dashboard SHALL implement a Robot_State_Manager using React Context API or Zustand that provides the global robot list, per-robot status, and per-robot metrics to all components; components SHALL read robot state only through this manager.
6. THE Dashboard SHALL use Axios for all REST API calls with a configured instance that includes a base URL, a 10-second request timeout, and response interceptors that normalize error objects before they reach calling code.
7. THE Dashboard SHALL use Recharts components exclusively for all data visualization charts; no other charting library SHALL be introduced.
8. WHEN a component requires a dynamic color value (e.g., computed from robot state), THE Dashboard SHALL apply it via a Tailwind arbitrary value or a CSS custom property; inline `style` objects SHALL be used only when a value cannot be expressed as a static Tailwind class.
9. THE Dashboard SHALL use Framer Motion's `motion` components and `AnimatePresence` for all animated transitions; CSS keyframe animations are permitted only for continuous looping effects (e.g., pulse, particle movement).
10. WHEN an unauthenticated user navigates to a protected route, THE Dashboard SHALL redirect them to `/login` using a React Router v6 protected route wrapper component that checks the Auth_System's current user state before rendering the route's component.
