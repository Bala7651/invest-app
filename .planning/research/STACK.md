# Stack Research

**Domain:** Taiwan Stock Investment Android App (Cyberpunk UI, AI Analysis, Real-time Data)
**Researched:** 2026-03-18
**Confidence:** MEDIUM-HIGH (verified through official docs and multiple sources; a few library version specifics are MEDIUM due to rapid ecosystem movement)

---

## Recommended Stack

### Core Technologies

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| Expo (SDK 55) | ^55.0.0 | Project scaffold, build tooling, native module access | SDK 55 (released 2026-02-25) includes React Native 0.83 and mandates New Architecture — the mature, currently stable path for new projects in 2026. Expo managed workflow eliminates Android Studio Gradle wrestling for a personal-use app. |
| React Native | 0.83 (via Expo) | Cross-platform mobile runtime | Bundled with Expo SDK 55; New Architecture (Fabric + JSI) is now default and required. Do not install separately — use what Expo provides. |
| TypeScript | ^5.8 | Type safety throughout | Expo SDK 55 projects scaffold with TypeScript by default. Strict mode enabled via `expo/tsconfig.base`. Matches user's existing TS fluency. |
| Expo Router | ^4.x | File-based navigation, swipeable pages | Comes with Expo SDK 55. File-system routing maps directly to swipe pages (home, AI analysis, settings). Replaces React Navigation for new projects — less boilerplate, URL-first design. |
| React | 19.2.0 (via Expo) | Component model | Bundled with Expo 55. React 19 concurrent features improve responsiveness. Do not install separately. |

### Charting

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| react-native-wagmi-charts | ^2.8.3 | Candlestick + line charts for stock prices | Only actively maintained RN library with native candlestick chart support. Built for financial data — interactive cursors, price labels, haptic feedback. Reanimated-powered (smooth 60fps). Required for the 1D/5D/1M/6M/1Y chart views. |
| react-native-gifted-charts | ^1.4.57 | Supplementary bar/area charts | More actively maintained than wagmi-charts (heavy GitHub activity in 2025). Use for the volume bars overlaid on stock charts. Does NOT have candlestick support, so use alongside wagmi-charts. |

### State Management

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| Zustand | ^5.0.12 | App-wide state (watchlist, stock data, AI results) | 2KB, no provider boilerplate, TypeScript-first. v5 (released Oct 2024, actively updated through 2025) drops React <18 and uses native `useSyncExternalStore`. Perfect for the scope of this app — small-medium, single-user. Avoid Redux overhead for a personal tool. |

### Local Storage

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| expo-sqlite | ^55.0.x | Local SQLite database for daily market summaries | First-party Expo module, versioned with SDK 55. Modern API with tagged template literals, automatic SQL injection prevention, WAL mode by default. Handles the auto-purge requirement (DELETE WHERE timestamp < 2 weeks ago) trivially. No separate native setup needed. |

### Styling

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| NativeWind | v5 (preview) or v4.1 | Tailwind-class utility styling | Enables the cyberpunk dark theme via CSS custom properties and dark mode utilities. NativeWind v5 (built on Tailwind v4.1+) is in preview; v4.1 stable is the safer choice for a new project today. Matches web Tailwind workflow. |
| expo-linear-gradient | ^55.0.x | Neon glow gradient effects | First-party Expo, versioned with SDK 55. Required for the cyberpunk gradient accents and neon border glow effects on stock cards. |

### Networking

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| Built-in `fetch` | native | TWSE OpenAPI polling + MiniMax API calls | React Native 0.76+ ships a fully-spec-compliant `fetch`. No axios needed for REST-only polling at 20s intervals. Lighter weight, no extra dependency. |

### Animation

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| react-native-reanimated | ^3.x (via Expo 55) | Smooth chart animations, page transitions, glow pulses | Required peer dependency of wagmi-charts. Also enables cyberpunk card pulse/glow animations without JS-thread bottlenecks. Runs on UI thread via JSI. |
| react-native-gesture-handler | ^2.x (via Expo 55) | Swipe gesture navigation | Required peer dependency of wagmi-charts. Handles the home <-> AI analysis swipe gesture natively. |

### Build Output

| Technology | Purpose | Notes |
|------------|---------|-------|
| EAS Build (`eas-cli`) | APK generation | `eas build -p android --profile preview` with `"android.buildType": "apk"` in eas.json produces installable APK. Free tier allows 30 builds/month — sufficient for personal use. |
| `npx expo run:android` | Local debug APK | Compiles locally using Android SDK. Use for development iteration. Requires Android Studio SDK tools installed on Mac. |

---

## Supporting Libraries

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| react-native-haptic-feedback | ^2.x | Haptic feedback on price taps | Peer dep of wagmi-charts. Gives physical feedback when interacting with chart cursors — enhances the premium feel. |
| react-native-svg | ^15.x (via Expo) | SVG rendering for charts | Peer dep of both charting libraries. Install via `npx expo install react-native-svg`. |
| expo-linear-gradient | ^55.0.x | Gradient fills on chart areas, neon glows | Already listed in core styling — needed for gifted-charts area fill too. |
| @react-native-async-storage/async-storage | ^2.x | Simple key-value storage (API key, user settings) | Use for the Settings page API key persistence. Much simpler than SQLite for flat config values. |
| date-fns | ^4.x | Date formatting for chart axes and summary timestamps | Tree-shakeable, no locale issues, handles Taiwan date formats cleanly. Use instead of dayjs for better TypeScript inference. |

---

## Development Tools

| Tool | Purpose | Notes |
|------|---------|-------|
| `create-expo-app` | Project scaffold | `npx create-expo-app@latest --template default` to create SDK 55 project with TypeScript and Expo Router pre-configured. |
| `npx expo-doctor` | Dependency health check | Run after installing libraries. Validates all native module versions against React Native Directory. Catches incompatibilities before build. |
| `eas-cli` | Build and submit APK | Install globally: `npm install -g eas-cli`. Use `eas build --local` for on-machine builds (avoids cloud queue waits). |
| Android Studio | Local APK compilation | Required for `npx expo run:android`. Install Android SDK Platform-Tools and Build-Tools matching RN 0.83 requirements. |
| Expo Go | Development preview | Use during JS-only development. Note: SDK 55 Expo Go only runs New Architecture. Useful for UI iteration without full rebuilds. |

---

## Installation

```bash
# Scaffold project
npx create-expo-app@latest invest-app --template default

cd invest-app

# Charting (financial)
npx expo install react-native-wagmi-charts react-native-reanimated react-native-gesture-handler react-native-haptic-feedback
npx expo install react-native-gifted-charts expo-linear-gradient react-native-svg

# State management
npm install zustand

# Local storage
npx expo install expo-sqlite

# Simple config persistence
npx expo install @react-native-async-storage/async-storage

# Utilities
npm install date-fns

# Styling (NativeWind v4 stable)
npm install nativewind tailwindcss
npx tailwindcss init

# Dev tools
npm install -g eas-cli
```

---

## Alternatives Considered

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|-------------------------|
| Expo (managed) | Bare React Native | Only if you need a native module Expo doesn't support. Not the case here — all required modules have Expo packages. Bare adds Gradle/CocoaPods maintenance overhead with no benefit. |
| Expo Router | React Navigation | If building a non-Expo project or need a navigator pattern not supported by Expo Router (rare for simple tab/stack layouts). Expo Router is now the recommended default for new Expo projects. |
| React Native (via Expo) | Flutter | Flutter has better raw performance and pixel-perfect UI control. **However:** user's existing TypeScript/React skills mean React Native = weeks to first APK vs months. Flutter requires learning Dart. For a personal tool, skill leverage matters more than marginal perf gains. |
| Zustand | Redux Toolkit | Use Redux only for large team codebases needing strict action-based audit trails. For a personal single-user tool, Redux is 10x the boilerplate with no benefit. |
| react-native-wagmi-charts | Victory Native XL | Victory Native XL uses Skia and has excellent performance, but has no candlestick chart type. Wagmi-charts is purpose-built for financial visualization. |
| expo-sqlite | WatermelonDB | WatermelonDB excels at complex relational queries at scale. For storing 14 days of daily summaries, it's severe over-engineering. expo-sqlite is simpler and has zero extra setup. |
| NativeWind | react-native-paper | RN Paper is a Material Design component library — wrong aesthetic for cyberpunk. NativeWind gives arbitrary Tailwind utility control for custom neon/dark styling. |
| `fetch` (native) | axios | Axios adds 40KB and HTTP interceptors you don't need for polling two REST endpoints at low frequency. Native fetch is sufficient. |

---

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| Expo SDK < 53 | Old Architecture (legacy bridge) is removed in SDK 55. Starting on an old SDK creates migration debt immediately. | Expo SDK 55 (current stable as of 2026-02-25) |
| `react-native-sqlite-storage` | Unmaintained (last real commit 2022). The community fork `boltcode-js/react-native-sqlite-storage` is also stale. Causes Native Module errors with New Architecture. | `expo-sqlite` (first-party, actively maintained) |
| `react-financial-charts` | Web-only React library (uses SVG/canvas directly). Cannot run in React Native. | `react-native-wagmi-charts` for candlestick, `react-native-gifted-charts` for line/bar |
| MobX | Higher complexity than Zustand for no benefit at this app's scale. Requires decorators and observable boilerplate. | Zustand |
| Expo ejecting to bare workflow | Eject is one-way and forces you to manage Gradle/CocoaPods. EAS Build cloud or `--local` handles APK generation without ejecting. | EAS Build with `eas build --local` flag |
| React Navigation v6 (standalone) | Still works but Expo Router v4 (built on React Navigation v7 internally) provides the same primitives with automatic deep linking and TypeScript-safe routes. | Expo Router (already in Expo SDK 55) |
| `moment.js` | Deprecated by its own authors, huge bundle. | `date-fns` v4 |

---

## Stack Patterns by Variant

**For the cyberpunk dark theme:**
- Define a `theme.ts` with CSS custom properties via NativeWind
- Use `expo-linear-gradient` for neon border glow simulation (no native box-shadow in RN)
- Use `react-native-reanimated` for pulsing glow animations on price change indicators
- Background: `bg-black`, accents: neon cyan `#00FFFF` / neon magenta `#FF00FF`

**For the TWSE API polling:**
- Use `setInterval` + `fetch` inside a Zustand action (not `useEffect` in component)
- Poll only during market hours (Mon-Fri 09:00-13:30 Taiwan time) — no-op outside hours
- TWSE OpenAPI base: `https://openapi.twse.com.tw/v1/` — no API key required
- Rate-limit: implement minimum 3s between calls per endpoint to avoid IP blocks

**For the MiniMax M2.5 API:**
- Use OpenAI-compatible format: POST `https://api.minimax.io/v1/chat/completions`
- Model name: `MiniMax-M2.5`
- Store Bearer token in `AsyncStorage` (set via Settings page)
- 204,800 token context window — send full daily summary + news for comprehensive analysis

**For local APK build on macOS without EAS cloud:**
```bash
npx expo run:android --variant release
```
- Requires Android Studio + Android SDK installed
- Produces unsigned APK in `android/app/build/outputs/apk/release/`
- Must manually sign with `jarsigner` or `apksigner` for installation on non-debug devices

---

## Version Compatibility

| Package | Compatible With | Notes |
|---------|-----------------|-------|
| `expo@55` | `react-native@0.83` | Always use `npx expo install` (not `npm install`) for Expo-ecosystem packages to get SDK-matched versions |
| `expo@55` | New Architecture only | Old Architecture (legacy bridge) is removed. All native modules must support Fabric/TurboModules. Run `npx expo-doctor` to verify. |
| `react-native-wagmi-charts@2.8.3` | `react-native-reanimated@3.x`, `react-native-gesture-handler@2.x` | These are auto-installed with correct versions via `npx expo install react-native-wagmi-charts` |
| `nativewind@4.x` | `tailwindcss@3.x` only | NativeWind v4 stable does NOT support Tailwind v4. NativeWind v5 (preview) supports Tailwind v4.1+. Use `tailwindcss@3` with NativeWind v4 stable to avoid breakage. |
| `expo-sqlite@55` | Expo SDK 55 only | Version must match SDK major. `npx expo install expo-sqlite` picks correct version automatically. |
| `zustand@5` | React 18+ | Requires React 18 minimum (React 19.2 in Expo 55 satisfies this). |

---

## Sources

- Expo SDK 55 changelog — https://expo.dev/changelog/sdk-55 — React Native 0.83, release date 2026-02-25, New Architecture mandatory (HIGH confidence)
- Expo SDK reference — https://docs.expo.dev/versions/latest/ — Current SDK 55, RN 0.83, React 19.2 (HIGH confidence)
- Expo APK build docs — https://docs.expo.dev/build-reference/apk/ — EAS JSON config for APK output (HIGH confidence)
- Expo local build docs — https://docs.expo.dev/guides/local-app-development/ — `npx expo run:android` local compilation (HIGH confidence)
- Expo SQLite docs — https://docs.expo.dev/versions/latest/sdk/sqlite/ — Tagged template literal API, SDK 55 versioning (HIGH confidence)
- react-native-wagmi-charts GitHub — https://github.com/coinjar/react-native-wagmi-charts — v2.8.3 latest, 58 open issues, active candlestick support (MEDIUM confidence — maintenance pace is slow but functional)
- react-native-gifted-charts npm — v1.4.57 as of April 2025, active development (MEDIUM confidence)
- zustand announcement — https://pmnd.rs/blog/announcing-zustand-v5 — v5 release Oct 2024, v5.0.12 latest (HIGH confidence)
- NativeWind docs — https://www.nativewind.dev/ — v4 stable (Tailwind v3), v5 in preview (Tailwind v4.1+) (MEDIUM confidence — v5 preview maturity unclear)
- TWSE OpenAPI — https://openapi.twse.com.tw/ — Free, no auth, 143 endpoints, ~20s delay (HIGH confidence)
- React Native vs Flutter 2026 comparison — Multiple sources (MEDIUM confidence — Flutter performance lead confirmed, React Native recommended here on skill-leverage grounds)

---
*Stack research for: Taiwan Stock Investment Android App*
*Researched: 2026-03-18*
