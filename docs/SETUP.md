# Setup (Developer)
## Adaptive Decision Engine (Health) — V2

This guide explains how to set up and run the project locally.

---

## 1) Prerequisites
Install the following:

### Required
- Node.js (recommended: latest LTS)
- npm (ships with Node)
- Expo CLI (via `npx`)

### Recommended
- Expo Go app (on iOS/Android) for device testing
- Xcode (for iOS simulator)
- Android Studio (for Android emulator)

---

## 2) Install Dependencies
From the repo root:

```bash
npm install
```

---

## 3) Running the App

### Start the development server
```bash
npx expo start
```

### Run on Device/Simulator
- **iOS Simulator**: Press `i` in the terminal.
- **Android Emulator**: Press `a` in the terminal.
- **Physical Device**: Scan the QR code with the Expo Go app.

---

## 4) Dev Tools & Seed Data
(Only available in Development builds)

### Seeding Demo Logs
1. Open the app.
2. If the timeline is empty, you will see a "Seed Demo Logs" button.
3. Tap it to generate 20-30 meal events and 10-20 mood events over the last 7 days.
4. The timeline will automatically refresh.

### Clearing Logs
1. To reset the state, go to the Meal Detail screen (tap any meal) or use the dev menu (if implemented).
2. Or use the "Clear All Logs" button if available in the UI (e.g. implementation specific).

---

## 5) Troubleshooting

### Camera Permissions
- If the camera permission is denied, the app will fallback to allowing **Text Description** only or **Photo Library** pick (depending on implementation).
- To reset permissions on Simulator:
  - **iOS**: `Device` -> `Erase All Content and Settings` (Extreme) OR uninstall the Expo Go app / Custom Dev Client.
  - **Android**: Long press app icon -> App Info -> Permissions.

### Resetting Cache
If you encounter weird bundler issues:
```bash
npx expo start -c
```
