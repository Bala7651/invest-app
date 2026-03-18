# Phase 1: Foundation - Research

**Researched:** 2026-03-18
**Domain:** Expo SDK 55, NativeWind v4, drizzle-orm/expo-sqlite, Zustand v5, expo-router v7
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Feature-based directory layout: `src/features/{watchlist,charts,analysis,settings,alerts,summary}/` each owning components, hooks, stores
- Shared UI components in `src/components/ui/`
- Services in `src/services/`, database in `src/db/`, theme in `src/theme/`, types in `src/types/`
- expo-router for file-based routing in `app/` directory
- PagerView (react-native-pager-view) for home <-> AI analysis swipeable navigation — no tab bar visible
- All route files scaffolded as minimal placeholder screens (home, analysis, detail, settings) to validate full navigation graph early
- Background: #050508, Surface: #0D0D14, Border: #1A1A2E, Primary: #4D7CFF, Secondary: #8B5CF6, Up: #00E676, Down: #FF1744, Text: #E0E0E0, Muted: #6B7280
- Glow effects: configurable intensity (subtle/medium/heavy), default subtle
- Stock green/red colors are always traditional — never replaced by theme accent colors
- drizzle-orm with expo-sqlite backend
- Phase 1 tables: watchlist + daily_summaries only (alerts added in Phase 9)
- Watchlist table includes `sort_order` integer column
- Daily summaries `content` column stores a single JSON blob
- Zustand v5 with per-domain stores: watchlistStore, settingsStore, quoteStore, aiStore
- All known stores scaffolded as minimal shells in Phase 1
- SQLite sync: load from SQLite on app init, write to SQLite immediately on each mutation (no persist middleware)

### Claude's Discretion
- Exact NativeWind v4 tailwind.config.js setup for custom theme tokens
- expo-router layout structure details
- Drizzle-orm migration strategy and initialization flow
- Exact placeholder screen content
- TypeScript config details beyond strict mode

### Deferred Ideas (OUT OF SCOPE)
- Glow intensity setting UI — belongs in Phase 5 (Settings), but the store field and theme support are scaffolded here
- Drag-to-reorder watchlist — sort_order column is ready, UI implementation belongs in Phase 3
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| UI-01 | Dark cyberpunk theme — deep dark background, neon accent colors, glow effects | NativeWind v4 custom color tokens in tailwind.config.js; CSS variable approach for glow intensity; theme tokens defined in src/theme/ |
</phase_requirements>

---

## Summary

Phase 1 is a greenfield Expo SDK 55 project scaffold. All libraries are confirmed compatible with the New Architecture (mandatory in SDK 55 / React Native 0.83 + React 19.2 — cannot be disabled). The core tension in this phase is that three separate tools (NativeWind, drizzle-orm, and expo-router) each require specific changes to `metro.config.js` and `babel.config.js`, and these changes must be composed carefully without conflicting.

NativeWind v4 requires `tailwindcss@^3` (NOT v4 — NativeWind v4 uses Tailwind CSS v3 as its compiler; the names are confusingly mismatched). drizzle-orm/expo-sqlite requires `.sql` extension registration in Metro and the `inline-import` Babel plugin. expo-router requires the `expo-router/entry` main field in package.json and a `_layout.tsx` root layout. The composition pattern for all three is documented and verified below.

**Primary recommendation:** Use `npx create-expo-app --template default@sdk-55` to bootstrap, then layer in NativeWind, drizzle-orm, and Zustand following the verified configuration patterns in this document. Do not use `tailwindcss@4` — use `tailwindcss@^3.4.17`.

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| expo | ^55.0.0 | App framework | Locked decision; SDK 55 = RN 0.83 + React 19.2 + New Architecture mandatory |
| expo-router | ^7.0.0 | File-based routing | Ships with SDK 55 default template; locked decision |
| nativewind | ^4.1.23 | Tailwind CSS for RN | Locked decision; v4 stable (v5 is preview only) |
| tailwindcss | ^3.4.17 | CSS compiler for NativeWind | NativeWind v4 requires Tailwind CSS v3, NOT v4 |
| drizzle-orm | latest | Type-safe SQLite ORM | Locked decision; pairs with expo-sqlite |
| expo-sqlite | latest | SQLite database | Locked decision; official Expo SQLite module |
| drizzle-kit | latest (dev) | Schema migration generator | Required companion to drizzle-orm |
| zustand | ^5.0.0 | State management | Locked decision; v5 uses native useSyncExternalStore |
| react-native-pager-view | ^7.0.0 | Swipeable page navigation | Locked decision; v7+ required for New Architecture |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| react-native-reanimated | latest | NativeWind peer dep + animations | Required by NativeWind v4 |
| react-native-safe-area-context | latest | Safe area insets | Required by expo-router and NativeWind |
| react-native-screens | latest | Native screen optimization | Required by expo-router |
| expo-linking | latest | Deep linking | Required by expo-router |
| expo-constants | latest | App config access | Required by expo-router |
| expo-status-bar | latest | Status bar control | Required by expo-router |
| jest-expo | latest (dev) | Jest preset for Expo | Official Expo test preset; mocks native modules |
| @testing-library/react-native | latest (dev) | Component testing utilities | Standard testing companion |
| @types/jest | latest (dev) | Jest TypeScript types | Required for TypeScript test files |
| babel-preset-expo | latest (dev) | Babel preset | Already included in expo; verify it's present |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| NativeWind v4 | NativeWind v5 (preview) | v5 is unstable; locked decision is v4 stable |
| tailwindcss@3 | tailwindcss@4 | NativeWind v4 explicitly only supports tailwindcss@3; v4 breaks with a clear error |
| drizzle-orm | TypeORM, better-sqlite3 | drizzle-orm has first-class expo-sqlite driver; locked decision |
| Zustand v5 | Redux, Jotai | Zustand: locked decision; v5 drops shim, requires React 18+ (React 19.2 in SDK 55 satisfies this) |
| jest-expo | Vitest | Vitest not fully compatible with React Native as of 2026; jest-expo is the official Expo preset |

**Installation:**
```bash
# Bootstrap
npx create-expo-app@latest --template default@sdk-55 invest-app

# Core navigation and UI
npx expo install expo-router react-native-safe-area-context react-native-screens expo-linking expo-constants expo-status-bar

# NativeWind
npm install nativewind react-native-reanimated
npm install --save-dev tailwindcss@^3.4.17

# PagerView (New Arch compatible)
npx expo install react-native-pager-view

# Database
npm install drizzle-orm expo-sqlite
npm install --save-dev drizzle-kit

# State management
npm install zustand

# Testing
npx expo install jest-expo jest @types/jest @testing-library/react-native --dev
```

---

## Architecture Patterns

### Recommended Project Structure
```
invest-app/
├── app/                        # expo-router file-based routes
│   ├── _layout.tsx             # Root layout: DB init, theme provider, store hydration
│   ├── index.tsx               # Home (watchlist) — entry point for PagerView
│   ├── analysis.tsx            # AI analysis page (swipe target)
│   ├── detail/
│   │   └── [symbol].tsx        # Stock detail / chart
│   └── settings.tsx            # Settings screen
├── src/
│   ├── components/
│   │   └── ui/                 # Shared NativeWind-styled primitives
│   ├── db/
│   │   ├── schema.ts           # Drizzle table definitions
│   │   ├── client.ts           # openDatabaseSync + drizzle() instance
│   │   └── migrations/        # Generated by drizzle-kit (SQL files bundled via inline-import)
│   ├── features/
│   │   ├── watchlist/          # components/, hooks/, store/
│   │   ├── charts/
│   │   ├── analysis/
│   │   ├── settings/
│   │   ├── alerts/
│   │   └── summary/
│   ├── services/               # API service modules (Phase 2+)
│   ├── theme/
│   │   └── tokens.ts           # Color hex values (shared with tailwind.config.js)
│   └── types/                  # Shared TypeScript interfaces
├── drizzle/                    # Generated migration SQL files (committed to repo)
├── global.css                  # @tailwind base/components/utilities
├── tailwind.config.js
├── metro.config.js
├── babel.config.js
├── drizzle.config.ts
├── tsconfig.json
├── nativewind-env.d.ts
└── .gitignore
```

### Pattern 1: babel.config.js Composition (NativeWind + drizzle)

**What:** Both NativeWind and drizzle-orm need Babel changes. They must be composed in one file without conflict.

**When to use:** Always — this is the single Babel config for the whole project.

```javascript
// Source: https://www.nativewind.dev/docs/getting-started/installation + https://orm.drizzle.team/docs/connect-expo-sqlite
module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      ['babel-preset-expo', { jsxImportSource: 'nativewind' }],
      'nativewind/babel',
    ],
    plugins: [
      ['inline-import', { extensions: ['.sql'] }],
    ],
  };
};
```

### Pattern 2: metro.config.js Composition (NativeWind + drizzle)

**What:** Metro needs NativeWind's CSS processing AND the `.sql` extension for drizzle migrations.

**When to use:** Always — both are required.

```javascript
// Source: https://www.nativewind.dev/docs/getting-started/installation + https://orm.drizzle.team/docs/connect-expo-sqlite
const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');

const config = getDefaultConfig(__dirname);
config.resolver.sourceExts.push('sql');

module.exports = withNativeWind(config, { input: './global.css' });
```

### Pattern 3: NativeWind tailwind.config.js with Cyberpunk Theme

**What:** Register all project source files for Tailwind, extend colors with cyberpunk tokens.

**When to use:** Always for this project.

```javascript
// Source: https://www.nativewind.dev/docs/customization/colors
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,jsx,ts,tsx}',
    './src/**/*.{js,jsx,ts,tsx}',
  ],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        // Cyberpunk theme tokens
        bg: '#050508',
        surface: '#0D0D14',
        border: '#1A1A2E',
        primary: '#4D7CFF',
        secondary: '#8B5CF6',
        'stock-up': '#00E676',
        'stock-down': '#FF1744',
        text: '#E0E0E0',
        muted: '#6B7280',
      },
    },
  },
  plugins: [],
};
```

### Pattern 4: Drizzle Schema Definition

**What:** Type-safe SQLite schema for Phase 1 tables.

**When to use:** Defines the persistence foundation for the entire app.

```typescript
// Source: https://orm.drizzle.team/docs/get-started/expo-new
// src/db/schema.ts
import { integer, sqliteTable, text, real } from 'drizzle-orm/sqlite-core';

export const watchlist = sqliteTable('watchlist', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  symbol: text('symbol').notNull().unique(),
  name: text('name').notNull(),
  sort_order: integer('sort_order').notNull().default(0),
  created_at: integer('created_at', { mode: 'timestamp' })
    .$defaultFn(() => new Date()),
});

export const daily_summaries = sqliteTable('daily_summaries', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  symbol: text('symbol').notNull(),
  date: text('date').notNull(),       // ISO date string: YYYY-MM-DD
  content: text('content').notNull(), // JSON blob
  created_at: integer('created_at', { mode: 'timestamp' })
    .$defaultFn(() => new Date()),
});
```

### Pattern 5: Drizzle Client + Migration Initialization

**What:** Singleton DB client and migration hook in root layout.

**When to use:** Root `_layout.tsx` initializes DB before any screen renders.

```typescript
// Source: https://orm.drizzle.team/docs/connect-expo-sqlite
// src/db/client.ts
import { drizzle } from 'drizzle-orm/expo-sqlite';
import { openDatabaseSync } from 'expo-sqlite';
import * as schema from './schema';

const expoDb = openDatabaseSync('invest.db', { enableChangeListener: true });
export const db = drizzle(expoDb, { schema });

// app/_layout.tsx
import { useMigrations } from 'drizzle-orm/expo-sqlite/migrator';
import migrations from '../drizzle/migrations';
import { db } from '../src/db/client';

export default function RootLayout() {
  const { success, error } = useMigrations(db, migrations);

  if (error) {
    // Show error screen — migration failure is fatal
    return <View><Text>DB Error: {error.message}</Text></View>;
  }

  if (!success) {
    // Splash screen or null while migrations run
    return null;
  }

  return <Stack />;
}
```

### Pattern 6: Zustand Store Shell

**What:** Minimal Zustand v5 store following the per-domain pattern.

**When to use:** All Phase 1 stores are shells — state shape only, no logic yet.

```typescript
// Source: https://zustand.docs.pmnd.rs/getting-started/introduction
// src/features/settings/store/settingsStore.ts
import { create } from 'zustand';

type GlowLevel = 'subtle' | 'medium' | 'heavy';

interface SettingsState {
  glowLevel: GlowLevel;
  setGlowLevel: (level: GlowLevel) => void;
}

export const useSettingsStore = create<SettingsState>((set) => ({
  glowLevel: 'subtle',
  setGlowLevel: (level) => set({ glowLevel: level }),
}));
```

### Pattern 7: expo-router Root Layout with PagerView

**What:** The root layout wraps the PagerView navigation. expo-router manages the screen stack; PagerView manages the horizontal swipe between home and analysis.

**Note:** PagerView lives inside the screen content, not in the router layout itself. The router layout (Stack) provides the navigation stack; a single `index.tsx` screen hosts the PagerView with two child views (watchlist and analysis). This keeps expo-router's navigation graph simple while delivering the swipe UX.

```typescript
// app/index.tsx — PagerView host screen (home + analysis combined)
import PagerView from 'react-native-pager-view';
import { StyleSheet, View } from 'react-native';

export default function HomeScreen() {
  return (
    <PagerView style={styles.pager} initialPage={0}>
      <View key="1">{/* WatchlistPage component */}</View>
      <View key="2">{/* AnalysisPage component */}</View>
    </PagerView>
  );
}

const styles = StyleSheet.create({
  pager: { flex: 1 },
});
```

### Anti-Patterns to Avoid

- **Installing tailwindcss@4 with NativeWind v4:** NativeWind v4 explicitly only supports tailwindcss@3. The error message is "NativeWind only supports Tailwind CSS v3". Always pin `tailwindcss@^3.4.17`.
- **Putting `nativewind/babel` in babel plugins array instead of presets:** Must be in `presets`, not `plugins`. Common mistake causes silent failures.
- **Initializing Drizzle outside the component tree before migrations run:** Always gate renders behind `useMigrations` success — components that query before tables exist will crash.
- **Using the legacy architecture config:** SDK 55 has removed `newArchEnabled` from app.json. Do not add it.
- **Separate metro.config.js for NativeWind vs drizzle:** They must be composed in one file. The pattern is: add `sourceExts.push('sql')` BEFORE passing config to `withNativeWind`.
- **Registering PagerView pages as separate expo-router routes:** The home/analysis swipe does not use separate routes. It's one route with PagerView. Separate routes would break the swipe animation.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| SQLite type safety | Manual SQL strings + raw sqlite calls | drizzle-orm schema + queries | Type inference, migration safety, compile-time errors on schema mismatches |
| SQLite migrations | Version-checked CREATE TABLE IF NOT EXISTS | `drizzle-kit generate` + `useMigrations` | Handles incremental schema changes across app updates; user data survives upgrades |
| Tailwind class transforms for RN | Manual StyleSheet from class names | NativeWind v4 Metro transform | ~200 edge cases in RN style system (shadow, opacity, flex) that NativeWind handles |
| State persistence boilerplate | AsyncStorage read/write on every store | Zustand + SQLite write-through (as decided) | Avoid AsyncStorage for structured relational data; SQLite is the source of truth |
| Babel/Metro config discovery | Researching each lib's config changes | Composed config per patterns above | All three libraries have specific requirements; composition is non-obvious |

**Key insight:** The Metro + Babel composition is the central integration challenge of Phase 1. All three config-touching libraries (NativeWind, drizzle, expo-router) must coexist in two files. Getting this wrong causes cryptic bundler errors, not compilation errors.

---

## Common Pitfalls

### Pitfall 1: tailwindcss Version Mismatch
**What goes wrong:** Installing `tailwindcss@latest` or `tailwindcss@4` causes the error "NativeWind only supports Tailwind CSS v3" and the app fails to bundle.
**Why it happens:** NativeWind v4 uses Tailwind CSS v3 as its underlying compiler. Despite NativeWind being "v4", it does not support Tailwind CSS v4.
**How to avoid:** Explicitly pin `tailwindcss@^3.4.17` in package.json. The stable pairing is `nativewind@4.1.23` + `tailwindcss@3.4.17`.
**Warning signs:** Error mentioning "NativeWind only supports Tailwind CSS v3" during `expo start`.

### Pitfall 2: Metro Cache Stale After Config Changes
**What goes wrong:** Config changes to metro.config.js or babel.config.js don't take effect — old behavior persists.
**Why it happens:** Metro aggressively caches transforms. Installing new packages or changing Babel config doesn't automatically invalidate the cache.
**How to avoid:** Always run `npx expo start --clear` after any metro.config.js or babel.config.js change.
**Warning signs:** Changes appear to have no effect; previous error disappears then reappears.

### Pitfall 3: nativewind-env.d.ts Missing
**What goes wrong:** TypeScript errors on `className` prop — "Property 'className' does not exist on type...".
**Why it happens:** NativeWind extends React Native types via declaration merging, but only if the ambient type reference is included.
**How to avoid:** Create `nativewind-env.d.ts` at project root with `/// <reference types="nativewind/types" />`. TypeScript picks it up automatically.
**Warning signs:** Red squiggles under `className` in .tsx files despite NativeWind being installed.

### Pitfall 4: drizzle Migration SQL Files Not Bundled
**What goes wrong:** App crashes at runtime — "No such table: watchlist" or similar, even though migrations ran during development.
**Why it happens:** Metro doesn't know how to import `.sql` files. Without `config.resolver.sourceExts.push('sql')` and the `inline-import` Babel plugin, migration files are silently ignored in production bundles.
**How to avoid:** Both Metro source extension AND the inline-import Babel plugin are required. One without the other is insufficient.
**Warning signs:** Works in dev with `expo start` but fails after `expo build`.

### Pitfall 5: Rendering Screens Before DB Migrations Complete
**What goes wrong:** Component queries run before the `watchlist` table exists, causing SQLite "no such table" runtime crash.
**Why it happens:** `useMigrations` is async. If the root layout renders child screens before `success === true`, queries execute against a schema-less database.
**How to avoid:** Root `_layout.tsx` must guard: `if (!success) return null` (or splash screen). Only render `<Stack />` after migrations succeed.
**Warning signs:** Crash on first app launch with a fresh install; works fine on subsequent launches (after migrations ran once).

### Pitfall 6: NativeWind content paths miss new directories
**What goes wrong:** Custom class names added in new feature folders are not processed — they appear as unstyled elements.
**Why it happens:** The `content` array in tailwind.config.js must include all directories containing className usage. If you add `src/features/**` but forget to include the path glob, new classes are purged.
**How to avoid:** Use broad globs: `'./app/**/*.{js,jsx,ts,tsx}'` and `'./src/**/*.{js,jsx,ts,tsx}'`. This covers all current and future directories.
**Warning signs:** className works in some components but not others added later.

---

## Code Examples

### drizzle.config.ts
```typescript
// Source: https://orm.drizzle.team/docs/connect-expo-sqlite
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './src/db/schema.ts',
  out: './drizzle',
  dialect: 'sqlite',
  driver: 'expo',
});
```

### tsconfig.json
```json
{
  "extends": "expo/tsconfig.base",
  "compilerOptions": {
    "strict": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}
```

### global.css
```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

### app/_layout.tsx (full root layout)
```typescript
import { Stack } from 'expo-router';
import { View, Text } from 'react-native';
import { useMigrations } from 'drizzle-orm/expo-sqlite/migrator';
import migrations from '../drizzle/migrations';
import { db } from '../src/db/client';
import '../global.css';

export default function RootLayout() {
  const { success, error } = useMigrations(db, migrations);

  if (error) {
    return (
      <View className="flex-1 bg-bg items-center justify-center">
        <Text className="text-stock-down">DB migration failed: {error.message}</Text>
      </View>
    );
  }

  if (!success) {
    return (
      <View className="flex-1 bg-bg" />
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#050508' } }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="settings" />
      <Stack.Screen name="detail/[symbol]" />
    </Stack>
  );
}
```

### Watchlist Zustand store shell
```typescript
// src/features/watchlist/store/watchlistStore.ts
import { create } from 'zustand';

interface WatchlistItem {
  id: number;
  symbol: string;
  name: string;
  sort_order: number;
}

interface WatchlistState {
  items: WatchlistItem[];
  setItems: (items: WatchlistItem[]) => void;
  addItem: (item: WatchlistItem) => void;
  removeItem: (symbol: string) => void;
}

export const useWatchlistStore = create<WatchlistState>((set) => ({
  items: [],
  setItems: (items) => set({ items }),
  addItem: (item) => set((state) => ({ items: [...state.items, item] })),
  removeItem: (symbol) =>
    set((state) => ({ items: state.items.filter((i) => i.symbol !== symbol) })),
}));
```

### .gitignore (relevant additions)
```gitignore
# Secrets — never commit these
.env
.env.*
*.keystore
google-services.json
GoogleService-Info.plist
credentials.json
eas-service-account.json

# Build artifacts
/android/
/ios/
/dist/
/.expo/

# Node
/node_modules/
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Old Architecture (Bridge) | New Architecture (JSI) mandatory | SDK 55 / RN 0.83 | Cannot disable; all native modules must be New Arch compatible |
| `newArchEnabled: true` in app.json | Removed — always on | SDK 55 | Remove from any app.json if copied from older projects |
| `expo-av` | `expo-audio` + `expo-video` | SDK 55 | expo-av removed from Expo Go |
| useSyncExternalStore shim | Native React 18+ implementation | Zustand v5 | Requires React 18+ minimum (SDK 55 has React 19.2 — satisfied) |
| Vitest for React Native tests | jest-expo + Jest | Ongoing | Vitest still not fully compatible with RN Testing Library as of 2026 |
| Tabs-based swipe navigation | PagerView as view controller | This project | No tab bar visible; PagerView hosted inside a single Stack screen |

**Deprecated/outdated:**
- `@react-navigation/bottom-tabs` for the home/analysis swipe: the decision is PagerView, not tabs. Do not install react-navigation/bottom-tabs for this navigation.
- NativeWind v5 preview: intentionally excluded (unstable). Use v4 stable.
- tailwindcss@4: incompatible with NativeWind v4. Do not install.

---

## Open Questions

1. **expo-router version in SDK 55**
   - What we know: SDK 55 ships with "Expo Router v7" per the official changelog tweet. `npx expo install expo-router` installs the compatible version automatically.
   - What's unclear: Exact semver version of expo-router v7 was not confirmed from official docs (the install command resolves it).
   - Recommendation: Use `npx expo install expo-router` (not `npm install`) so Expo's version resolver picks the correct version for SDK 55.

2. **inline-import package name**
   - What we know: drizzle's official docs reference `["inline-import", { "extensions": [".sql"] }]` as a Babel plugin.
   - What's unclear: The npm package name — it may be `babel-plugin-inline-import`. May require `npm install --save-dev babel-plugin-inline-import`.
   - Recommendation: Run `npm install --save-dev babel-plugin-inline-import` and reference it as `"inline-import"` in babel config (Babel automatically strips the `babel-plugin-` prefix).

3. **drizzle migrations folder structure after `drizzle-kit generate`**
   - What we know: Generates a `./drizzle/` folder with `.sql` files and a meta folder.
   - What's unclear: The exact import path for the migrations index (`'../drizzle/migrations'`) depends on what drizzle-kit generates — it may be `migrations.js` or an index with journal.
   - Recommendation: Run `npx drizzle-kit generate` once after schema definition and inspect the output before wiring the import path.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | jest-expo (Jest preset) + @testing-library/react-native |
| Config file | `jest` key in `package.json` (no separate jest.config.js needed) |
| Quick run command | `npx jest --testPathPattern="src/__tests__" --passWithNoTests` |
| Full suite command | `npx jest --passWithNoTests` |

### Phase Requirements -> Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| UI-01 | NativeWind renders bg-bg class with correct hex color | unit | `npx jest --testPathPattern="theme" --passWithNoTests` | Wave 0 |
| UI-01 | tailwind.config.js contains all 9 cyberpunk color tokens | unit | `npx jest --testPathPattern="tailwind.config"` | Wave 0 |
| Foundation | `npx expo start` completes without error (manual smoke test) | smoke | Manual — `npx expo start --no-dev` | N/A |
| Foundation | `tsc --noEmit` passes with zero errors | static | `npx tsc --noEmit` | N/A — no Wave 0 gap |
| Foundation | DB initializes with watchlist + daily_summaries tables | unit | `npx jest --testPathPattern="db"` | Wave 0 |

### Sampling Rate
- **Per task commit:** `npx tsc --noEmit` (static check, < 10s)
- **Per wave merge:** `npx jest --passWithNoTests`
- **Phase gate:** Full Jest suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `src/__tests__/theme.test.ts` — verifies tailwind config contains all 9 color tokens (UI-01)
- [ ] `src/__tests__/db.test.ts` — verifies schema exports watchlist and daily_summaries table definitions
- [ ] `jest` config in `package.json` — preset: "jest-expo"

---

## Sources

### Primary (HIGH confidence)
- https://expo.dev/changelog/sdk-55 — SDK 55 package versions, breaking changes, New Architecture mandated
- https://expo.dev/blog/upgrading-to-sdk-55 — migration path and gotchas
- https://www.nativewind.dev/docs/getting-started/installation — exact babel.config.js, metro.config.js, tailwind.config.js configs
- https://www.nativewind.dev/docs/customization/colors — custom color token definition
- https://www.nativewind.dev/docs/guides/themes — CSS variables approach
- https://orm.drizzle.team/docs/connect-expo-sqlite — drizzle/expo-sqlite setup
- https://orm.drizzle.team/docs/get-started/expo-new — full drizzle new project guide
- https://docs.expo.dev/router/installation/ — expo-router manual install
- https://docs.expo.dev/guides/typescript/ — tsconfig strict mode, expo/tsconfig.base
- https://docs.expo.dev/develop/unit-testing/ — jest-expo setup

### Secondary (MEDIUM confidence)
- Multiple community sources confirming `nativewind@4.1.23` + `tailwindcss@3.4.17` as the stable pairing
- drizzle-orm GitHub discussion #2447 confirming expo-sqlite driver behavior
- react-native-pager-view docs confirming v7+ required for New Architecture

### Tertiary (LOW confidence)
- Community reports on `.plugins is not a valid Plugin property` error (github issue #36133, #36761) — confirmed as Babel config ordering issue; fix is in Pattern 1 above

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all versions verified from official changelogs and docs
- Architecture: HIGH — patterns verified from official documentation with working code examples
- Pitfalls: HIGH — Pitfalls 1-4 confirmed from official GitHub issues and multiple community sources; Pitfalls 5-6 from official docs + reasoning

**Research date:** 2026-03-18
**Valid until:** 2026-04-18 (NativeWind v5 could stabilize and change the picture; SDK 56 could ship with updated defaults)
