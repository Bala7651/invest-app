# Phase 9: Price Alerts - Research

**Researched:** 2026-03-21
**Domain:** Android push notifications, WorkManager background tasks, Drizzle ORM migrations, Alert state management
**Confidence:** HIGH (core stack), MEDIUM (background notification delivery edge cases)

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Alert Trigger Rules**
- Users can set both upper AND lower target prices per stock (price band)
- One upper + one lower alert max per stock (setting new replaces old)
- Each direction is independently optional (upper only, lower only, or both)
- After triggering: alert stays in list marked as "triggered" (not auto-deleted)
- Triggered alerts can be re-enabled via a "Re-enable" button
- Notification content: stock name + price + direction (e.g. "台積電 crossed above 980 — current: 985.00")

**Background Monitoring**
- Check every 15 minutes via Android WorkManager
- Market hours only (Mon-Fri 09:00-13:30) — skip checks outside trading hours, uses existing marketHours logic
- When app is in foreground: check alert conditions on every regular quote poll (~30s) for near-instant alerts
- Subtle persistent notification while monitoring is active: "Monitoring 3 alerts"

**Alert Management UI**
- Per-stock alerts managed on the detail screen (below the chart section)
- Alert status always visible below chart when alerts exist: "↑980 Active • ↓920 Active" — tapping opens edit modal
- Home screen: bell icon in header with number badge showing total active alerts
- Bell icon tap opens modal listing all alerts across all stocks
- Each alert row: "台積電 ↑980 • Active" or "台積電 ↓920 • Triggered" with swipe-to-delete
- Modal shows both active and triggered alerts, separated: active on top, triggered dimmed below
- Triggered alerts show "Re-enable" button

**Alert Creation UX**
- Bell icon in detail screen header opens bottom sheet modal
- Modal has upper and lower price input fields (each independently optional)
- Pre-fill: upper at current price +5%, lower at -5% (user can adjust)
- If alerts already exist for stock: modal pre-fills with existing values for editing
- Smart validation: upper must be > current price, lower must be < current price
- Battery optimization prompt lives in Settings screen (not in alert creation flow)

### Claude's Discretion
- WorkManager configuration and scheduling details
- Notification channel setup and Android API specifics
- SQLite alerts table schema design
- Alert service architecture (integration with existing stockService queue)
- Exact bottom sheet modal styling and animation
- How to deep-link to Android battery optimization settings from Settings screen

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope.
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| ALRT-01 | User can enable price alert from the chart detail page via top-right icon | Detail screen header icon pattern; bottom sheet modal with upper/lower price inputs |
| ALRT-02 | User can set a target price (above or below current) to trigger notification | Price band schema (upper_price, lower_price, direction tracking per column); validation logic |
| ALRT-03 | When alert is first enabled, app prompts user to disable battery optimization (Android) | expo-intent-launcher ActivityAction.IGNORE_BATTERY_OPTIMIZATION_SETTINGS in Settings screen |
| ALRT-04 | App monitors prices in background and sends push notification when target price is reached | expo-background-task (WorkManager 15min) + expo-notifications local notification from background worker |
| ALRT-05 | Background monitoring is battery-efficient (uses Android WorkManager with smart intervals) | expo-background-task uses WorkManager API; market hours gate skips checks outside trading window |
| ALRT-06 | User can view and manage all active price alerts | AlertsModal (home screen bell) with Zustand alertStore; swipe-to-delete, re-enable button |
| ALRT-07 | Alert persists in SQLite and survives app restart | Drizzle ORM alerts table added via new migration (0001_*); alertService CRUD pattern |
</phase_requirements>

---

## Summary

Phase 9 requires three distinct technical systems working together: (1) a SQLite-backed alert store using the existing Drizzle ORM pattern, (2) foreground alert checking integrated into the existing 30s quote poll cycle, and (3) background price monitoring via Android WorkManager (expo-background-task) with expo-notifications for local notification delivery.

The core technology decision is confirmed: `expo-background-task` (WorkManager on Android) for background scheduling and `expo-notifications` for local push notifications. Neither library is currently installed — both require `npx expo install`. The Drizzle migration workflow is well-understood from the existing schema (0000 migration for watchlist + daily_summaries); adding the alerts table follows the same pattern: modify `src/db/schema.ts`, run `npx drizzle-kit generate`, commit the new SQL file plus the updated `migrations.js`.

A critical pitfall exists: `scheduleNotificationAsync` with `trigger: null` (immediate delivery) has known unreliability when called from inside a background task worker on Android (GitHub issue #21267, open since 2022, closed stale). The reliable workaround is to use `trigger: { type: SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: 1 }` with an explicit `channelId` rather than null. This is a non-obvious gotcha that must be captured in the plan.

**Primary recommendation:** Install `expo-background-task` + `expo-notifications` + `expo-intent-launcher`. Use the existing Drizzle migration pipeline for the alerts table. Check alert conditions in both foreground (inside the existing quote poll tick) and background (WorkManager task). Fire notifications using the `seconds: 1` workaround, not `trigger: null`.

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| expo-background-task | ~55.0.x | WorkManager-backed periodic background task | Replaces deprecated expo-background-fetch; uses WorkManager on Android |
| expo-task-manager | ~55.0.x | Task definition / registration companion to expo-background-task | Required peer; defineTask must run at module top-level |
| expo-notifications | ~55.0.x | Local push notifications (no FCM/remote push needed) | Official Expo notification abstraction; supports local-only |
| expo-intent-launcher | ~55.0.x | Deep-link to Android system settings (battery optimization) | Provides ActivityAction.IGNORE_BATTERY_OPTIMIZATION_SETTINGS |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| drizzle-orm (already installed) | 0.44.2 | ORM for alerts SQLite table | Already used; just add new table to schema.ts |
| drizzle-kit (already installed) | ^0.31.10 | Generate new migration for alerts table | Run once to produce 0001_*.sql |
| expo-sqlite (already installed) | ~55.0.11 | SQLite storage for alert persistence | Already used via Drizzle |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| expo-background-task | expo-background-fetch | expo-background-fetch is deprecated (uses legacy Android JobScheduler/AlarmManager); expo-background-task is the current replacement |
| expo-notifications | @notifee/react-native | Notifee has more powerful Android foreground service features but adds native complexity; expo-notifications is sufficient for this use case |
| expo-intent-launcher | Linking.openURL('package:...') | Linking with package URI for REQUEST_IGNORE_BATTERY_OPTIMIZATIONS is restricted by Google Play policy; IGNORE_BATTERY_OPTIMIZATION_SETTINGS via intent-launcher is the safe approach |

**Installation:**
```bash
npx expo install expo-background-task expo-task-manager expo-notifications expo-intent-launcher
```

---

## Architecture Patterns

### Recommended Project Structure
```
src/
├── db/
│   └── schema.ts                  # Add price_alerts table here
├── features/
│   └── alerts/
│       ├── store/
│       │   └── alertStore.ts      # Zustand store (CRUD, toggle, re-enable)
│       ├── services/
│       │   ├── alertService.ts    # SQLite CRUD via Drizzle
│       │   └── alertMonitor.ts   # Condition check logic (called from both foreground + bg task)
│       └── components/
│           ├── AlertModal.tsx     # Bottom sheet for creating/editing alert on detail screen
│           └── AlertsListModal.tsx # All-alerts overview triggered from home bell icon
drizzle/
├── 0000_organic_frightful_four.sql  (existing)
├── 0001_price_alerts.sql            (new — generated by drizzle-kit)
└── migrations.js                    (updated — regenerated by drizzle-kit)
```

### Pattern 1: Drizzle Schema + Migration

Adding a new table follows the established pattern exactly. Modify `src/db/schema.ts`, run `npx drizzle-kit generate`, commit the generated SQL and updated `migrations.js`. The existing `useMigrations(db, migrations)` in `_layout.tsx` runs on app start and will apply the new migration automatically on first launch after upgrade.

**Alerts table schema:**
```typescript
// Source: existing schema.ts pattern + phase decisions
import { integer, sqliteTable, text, real, uniqueIndex } from 'drizzle-orm/sqlite-core';

export const price_alerts = sqliteTable(
  'price_alerts',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    symbol: text('symbol').notNull(),
    name: text('name').notNull(),
    upper_price: real('upper_price'),           // null = not set
    lower_price: real('lower_price'),           // null = not set
    upper_status: text('upper_status').notNull().default('active'),  // 'active' | 'triggered'
    lower_status: text('lower_status').notNull().default('active'),  // 'active' | 'triggered'
    created_at: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
  },
  (t) => [uniqueIndex('price_alerts_symbol_unique').on(t.symbol)]
);
```

Key decisions:
- `uniqueIndex` on symbol — one row per stock, enforces the "one upper + one lower per stock" rule via upsert
- `real` type for prices (float in SQLite) — avoids integer truncation
- Separate `_status` columns for each direction — allows independent state tracking
- No separate "direction" row — the single-row-per-stock design is simpler to query

### Pattern 2: Alert Monitoring — Foreground Path

When the app is active, the quote poll tick (every 30s in `quoteStore.ts`) already fetches prices for all watchlist stocks. After each successful fetch, call `alertMonitor.checkAlerts(quotes)` to evaluate all active alert conditions. This is the near-instant path.

```typescript
// Inside quoteStore.ts tick(), after quotes are updated:
// Source: established quoteStore pattern + alertMonitor integration
import { checkAlerts } from '../../features/alerts/services/alertMonitor';

// After set({ quotes: {...get().quotes, ...quotes} })
await checkAlerts(quotes);
```

### Pattern 3: Alert Monitoring — Background Path (WorkManager)

```typescript
// Source: expo-background-task official docs
// Must be at module top level (not inside a component)
import * as TaskManager from 'expo-task-manager';
import * as BackgroundTask from 'expo-background-task';

const ALERT_CHECK_TASK = 'PRICE_ALERT_CHECK';

TaskManager.defineTask(ALERT_CHECK_TASK, async () => {
  try {
    if (!isMarketOpen()) {
      return BackgroundTask.BackgroundTaskResult.Success;
    }
    const symbols = await alertService.getActiveSymbols();
    if (symbols.length === 0) {
      return BackgroundTask.BackgroundTaskResult.Success;
    }
    const quotes = await getQuotes(symbols);
    await checkAlerts(Object.fromEntries(quotes.map(q => [q.symbol, q])));
    return BackgroundTask.BackgroundTaskResult.Success;
  } catch {
    return BackgroundTask.BackgroundTaskResult.Failed;
  }
});
```

Register when alerts are created (unregister when all alerts are deleted):
```typescript
// Source: expo-background-task docs
await BackgroundTask.registerTaskAsync(ALERT_CHECK_TASK, {
  minimumInterval: 15, // minutes — WorkManager minimum on Android
});
```

### Pattern 4: Firing a Notification from Background Task (Critical Workaround)

**Do NOT use `trigger: null`** — this is unreliable from background task context on Android (GitHub issue #21267, confirmed stale with no fix). Use `seconds: 1` instead:

```typescript
// Source: expo-notifications docs + workaround for GitHub issue #21267
import * as Notifications from 'expo-notifications';

await Notifications.scheduleNotificationAsync({
  content: {
    title: '台積電 價格警報',
    body: '台積電 crossed above 980 — current: 985.00',
    data: { symbol: '2330', direction: 'upper' },
  },
  trigger: {
    type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
    seconds: 1,
    channelId: 'price-alerts',
  },
});
```

### Pattern 5: Notification Channel Setup

Must be created before any notification is scheduled. Create during app initialization (in `_layout.tsx`):

```typescript
// Source: expo-notifications official docs
import * as Notifications from 'expo-notifications';

// Set foreground handler
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

// Create Android channel
await Notifications.setNotificationChannelAsync('price-alerts', {
  name: 'Price Alerts',
  importance: Notifications.AndroidImportance.HIGH,
  vibrationPattern: [0, 250, 250, 250],
  sound: 'default',
});

// Create persistent monitoring channel (lower importance — no sound)
await Notifications.setNotificationChannelAsync('monitoring-status', {
  name: 'Monitoring Status',
  importance: Notifications.AndroidImportance.LOW,
  vibrationPattern: [],
  sound: null,
});
```

### Pattern 6: Persistent Monitoring Notification

Show while alerts are active, dismiss when all alerts are deleted:

```typescript
// Source: expo-notifications docs — sticky property
const MONITORING_NOTIFICATION_ID = 'monitoring-status-persistent';

// Show
await Notifications.scheduleNotificationAsync({
  identifier: MONITORING_NOTIFICATION_ID,
  content: {
    title: 'Invest App',
    body: `Monitoring ${count} alerts`,
    sticky: true,
    data: { type: 'monitoring' },
  },
  trigger: null,  // null IS safe for initial foreground show — workaround only needed from bg task
});

// Dismiss
await Notifications.dismissNotificationAsync(MONITORING_NOTIFICATION_ID);
```

Note: The persistent monitoring notification is shown/updated from foreground (app launch, when alert count changes), so `trigger: null` is safe here. The `seconds: 1` workaround applies only when firing alert notifications from the background task.

### Pattern 7: Battery Optimization Deep-Link (Settings Screen)

```typescript
// Source: expo-intent-launcher docs + ActivityAction constants
import { startActivityAsync, ActivityAction } from 'expo-intent-launcher';

// Opens settings screen where user manages per-app battery optimization
// This is the Google Play-safe option (vs REQUEST_IGNORE_BATTERY_OPTIMIZATIONS which is restricted)
await startActivityAsync(ActivityAction.IGNORE_BATTERY_OPTIMIZATION_SETTINGS);
```

Show as a pressable row in Settings screen with explanatory text: "For reliable background price alerts, disable battery optimization for this app."

### Pattern 8: Notification Permission Request

Request permissions before first notification is scheduled. Per Android 13+ requirement, POST_NOTIFICATIONS is a runtime permission:

```typescript
// Source: expo-notifications docs
const { status } = await Notifications.requestPermissionsAsync();
if (status !== 'granted') {
  // Show inline message — cannot send alerts without permission
  return;
}
```

Android 13+ requires `POST_NOTIFICATIONS` in AndroidManifest.xml. expo-notifications adds this automatically via its own manifest merge, so no manual AndroidManifest edit is required for this permission.

`SCHEDULE_EXACT_ALARM` is needed for exact-time scheduling on Android 12+ — add to AndroidManifest if scheduling exact-time alerts. For the WorkManager approach (15-min interval), this is NOT required. For the `seconds: 1` workaround trigger, this MAY be required on Android 12+.

### Anti-Patterns to Avoid

- **`trigger: null` from background task:** Silent failure on Android. Always use `{ type: TIME_INTERVAL, seconds: 1, channelId: 'price-alerts' }` from within TaskManager task context.
- **Sharing the stockService request queue with the background task:** The background task runs in a separate JS context; cannot access the singleton `_queue` from `stockService.ts`. The background task must call `getQuotes()` directly (which creates its own internal request queue per call) or use a standalone fetch.
- **Registering TaskManager.defineTask inside a component or after app start:** Must be at module top level, loaded before any task runs. Register in a dedicated `alertTask.ts` file imported at `_layout.tsx` level.
- **Forgetting to unregister the background task when all alerts are deleted:** WorkManager will keep firing the task indefinitely. Call `BackgroundTask.unregisterTaskAsync(ALERT_CHECK_TASK)` when the last alert is removed.
- **Using `real` Drizzle column type without importing it:** `real` must be imported from `drizzle-orm/sqlite-core` alongside `integer`, `text`.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Background scheduling | Custom Android Service / HeadlessJS timer | expo-background-task + WorkManager | WorkManager handles doze mode, battery saver, boot completed; custom services are killed |
| Local notifications | Direct Android API via native module | expo-notifications | Channel management, permission flow, and Android API compatibility already handled |
| Battery opt deep-link | `Linking.openURL('package:...')` | expo-intent-launcher ActivityAction.IGNORE_BATTERY_OPTIMIZATION_SETTINGS | Direct package exemption intent is restricted by Google Play policy |
| Market hours gate in bg task | Duplicate timezone logic | Import existing `isMarketOpen()` from `marketHours.ts` | Already correct, tested, handles holidays |

**Key insight:** WorkManager on Android has mandatory 15-minute minimum interval enforced by the OS regardless of what you request. This matches the business requirement exactly, so no workaround is needed.

---

## Common Pitfalls

### Pitfall 1: `trigger: null` Silent Failure from Background Task
**What goes wrong:** `scheduleNotificationAsync({ trigger: null })` resolves without error but no notification appears in the system tray when called from within a TaskManager background worker on Android.
**Why it happens:** Null trigger uses a different scheduling path that appears to require the app to be in foreground or have a special system permission not automatically granted.
**How to avoid:** Always use `trigger: { type: SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: 1, channelId: 'price-alerts' }` when firing notifications from background task context.
**Warning signs:** Notification promise resolves but no notification visible on device; works when app is foregrounded but not from background.

### Pitfall 2: Notification Channel Must Exist Before Scheduling
**What goes wrong:** Android silently drops notifications scheduled to a channel that doesn't exist yet.
**Why it happens:** Android 8.0+ requires all notifications to be assigned to a channel. If the channel hasn't been created with `setNotificationChannelAsync`, the notification is discarded.
**How to avoid:** Create channels in `_layout.tsx` at app startup, before any notification is ever scheduled. The background task can assume the channel exists (created at last app foreground session).
**Warning signs:** No notification error, but nothing appears in notification tray.

### Pitfall 3: Background Task Uses Separate JS Context
**What goes wrong:** Trying to call Zustand store methods or access singleton state from the background task fails silently or throws.
**Why it happens:** On Android, WorkManager runs JS in a separate Hermes instance (headless mode). Store state from the React app is not available.
**How to avoid:** The background task must read directly from SQLite via alertService (not alertStore) and fetch quotes directly from TWSE API (not from quoteStore). After firing a notification, write the triggered status back to SQLite — the foreground app reads from SQLite on next launch.
**Warning signs:** `useAlertStore.getState()` returns initial/empty state from background task.

### Pitfall 4: TaskManager.defineTask Must Be at Module Top Level
**What goes wrong:** Defining the task inside a component or inside `registerTaskAsync` callback causes the task to never execute, or throws `TaskManager: Task 'X' is not defined` error.
**Why it happens:** expo-task-manager maps task names to callbacks at module evaluation time. If the module with `defineTask` hasn't been loaded when the background process starts, the task handler is not registered.
**How to avoid:** Create a dedicated `src/features/alerts/services/alertTask.ts` file that calls `TaskManager.defineTask` at the top level. Import this file unconditionally in `_layout.tsx` (just the import, no named export needed).
**Warning signs:** Task registered successfully, but callback never fires; `triggerTaskWorkerForTestingAsync()` shows no output.

### Pitfall 5: `drizzle-kit generate` Must Run After Schema Change
**What goes wrong:** Adding `price_alerts` to `schema.ts` without running `drizzle-kit generate` means `migrations.js` is not updated. The app will launch but the table won't exist, causing runtime SQLite errors.
**How to avoid:** After editing `schema.ts`, always run `npx drizzle-kit generate` and commit both the new `.sql` file in `drizzle/` AND the updated `migrations.js`.
**Warning signs:** App launches without error, but `db.insert(price_alerts)` throws "no such table: price_alerts".

### Pitfall 6: One Row Per Stock vs. Multiple Rows
**What goes wrong:** If alerts table has multiple rows per stock (one per direction), deletion of one direction accidentally deletes monitoring for the other direction, or the uniqueness constraint isn't enforced.
**How to avoid:** Use the single-row-per-stock design with `upper_price` and `lower_price` as nullable columns on one row. Deletion of the entire row removes both directions.
**Warning signs:** Query returning multiple rows for same symbol; upsert creating duplicates.

---

## Code Examples

### Alert Service CRUD (following watchlistService pattern)

```typescript
// Source: established watchlistService.ts pattern adapted for price_alerts
import { db } from '../../../db/client';
import { price_alerts } from '../../../db/schema';
import { eq } from 'drizzle-orm';

export interface AlertRow {
  id: number;
  symbol: string;
  name: string;
  upper_price: number | null;
  lower_price: number | null;
  upper_status: 'active' | 'triggered';
  lower_status: 'active' | 'triggered';
}

export async function upsertAlert(
  symbol: string,
  name: string,
  upper_price: number | null,
  lower_price: number | null
): Promise<AlertRow> {
  // Delete-then-insert (same pattern as daily_summaries upsert)
  await db.delete(price_alerts).where(eq(price_alerts.symbol, symbol));
  const inserted = await db
    .insert(price_alerts)
    .values({ symbol, name, upper_price, lower_price, upper_status: 'active', lower_status: 'active' })
    .returning();
  return inserted[0] as AlertRow;
}

export async function getAll(): Promise<AlertRow[]> {
  return db.select().from(price_alerts) as Promise<AlertRow[]>;
}

export async function deleteAlert(id: number): Promise<void> {
  await db.delete(price_alerts).where(eq(price_alerts.id, id));
}

export async function markTriggered(
  symbol: string,
  direction: 'upper' | 'lower'
): Promise<void> {
  const update = direction === 'upper'
    ? { upper_status: 'triggered' as const }
    : { lower_status: 'triggered' as const };
  await db.update(price_alerts).set(update).where(eq(price_alerts.symbol, symbol));
}

export async function reEnableDirection(
  symbol: string,
  direction: 'upper' | 'lower'
): Promise<void> {
  const update = direction === 'upper'
    ? { upper_status: 'active' as const }
    : { lower_status: 'active' as const };
  await db.update(price_alerts).set(update).where(eq(price_alerts.symbol, symbol));
}
```

### Alert Monitor Logic (called from both foreground and background)

```typescript
// Source: project conventions — pure function, no store access
import { getAll, markTriggered } from './alertService';
import * as Notifications from 'expo-notifications';

interface QuoteLike {
  symbol: string;
  name: string;
  price: number | null;
}

export async function checkAlerts(
  quotes: Record<string, QuoteLike>
): Promise<void> {
  const alerts = await getAll();
  for (const alert of alerts) {
    const quote = quotes[alert.symbol];
    if (!quote || quote.price === null) continue;
    const price = quote.price;

    if (
      alert.upper_price !== null &&
      alert.upper_status === 'active' &&
      price >= alert.upper_price
    ) {
      await markTriggered(alert.symbol, 'upper');
      await fireAlertNotification(
        alert.symbol,
        alert.name,
        'above',
        alert.upper_price,
        price
      );
    }

    if (
      alert.lower_price !== null &&
      alert.lower_status === 'active' &&
      price <= alert.lower_price
    ) {
      await markTriggered(alert.symbol, 'lower');
      await fireAlertNotification(
        alert.symbol,
        alert.name,
        'below',
        alert.lower_price,
        price
      );
    }
  }
}

async function fireAlertNotification(
  symbol: string,
  name: string,
  direction: 'above' | 'below',
  targetPrice: number,
  currentPrice: number
): Promise<void> {
  // CRITICAL: use seconds:1 not trigger:null — null is unreliable from bg task
  await Notifications.scheduleNotificationAsync({
    content: {
      title: `${name} 價格警報`,
      body: `${name} crossed ${direction} ${targetPrice} — current: ${currentPrice.toFixed(2)}`,
      data: { symbol, direction },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: 1,
      channelId: 'price-alerts',
    },
  });
}
```

### Registering the Background Task (alertTask.ts)

```typescript
// Must import this file at _layout.tsx top-level so task is defined before any execution
import * as TaskManager from 'expo-task-manager';
import * as BackgroundTask from 'expo-background-task';
import { isMarketOpen } from '../../market/marketHours';
import { getAll } from './alertService';
import { getQuotes } from '../../../services/stockService';
import { checkAlerts } from './alertMonitor';

export const ALERT_CHECK_TASK = 'PRICE_ALERT_CHECK';

TaskManager.defineTask(ALERT_CHECK_TASK, async () => {
  try {
    if (!isMarketOpen()) return BackgroundTask.BackgroundTaskResult.Success;

    const alerts = await getAll();
    const activeAlerts = alerts.filter(
      a => a.upper_status === 'active' || a.lower_status === 'active'
    );
    if (activeAlerts.length === 0) return BackgroundTask.BackgroundTaskResult.Success;

    const symbols = [...new Set(activeAlerts.map(a => a.symbol))];
    const rawQuotes = await getQuotes(symbols);
    const quotesMap = Object.fromEntries(rawQuotes.map(q => [q.symbol, q]));
    await checkAlerts(quotesMap);

    return BackgroundTask.BackgroundTaskResult.Success;
  } catch {
    return BackgroundTask.BackgroundTaskResult.Failed;
  }
});

export async function registerAlertTask(): Promise<void> {
  const status = await BackgroundTask.getStatusAsync();
  if (status === BackgroundTask.BackgroundTaskStatus.Available) {
    await BackgroundTask.registerTaskAsync(ALERT_CHECK_TASK, {
      minimumInterval: 15,
    });
  }
}

export async function unregisterAlertTask(): Promise<void> {
  await BackgroundTask.unregisterTaskAsync(ALERT_CHECK_TASK);
}
```

### AlertStore (Zustand, following established patterns)

```typescript
// Source: watchlistStore.ts pattern — Zustand with async DB operations
import { create } from 'zustand';
import * as alertService from '../services/alertService';
import type { AlertRow } from '../services/alertService';

interface AlertState {
  alerts: AlertRow[];
  loadFromDb: () => Promise<void>;
  upsertAlert: (symbol: string, name: string, upper: number | null, lower: number | null) => Promise<void>;
  deleteAlert: (id: number) => Promise<void>;
  reEnable: (symbol: string, direction: 'upper' | 'lower') => Promise<void>;
  getBySymbol: (symbol: string) => AlertRow | undefined;
  activeCount: () => number;
}

export const useAlertStore = create<AlertState>((set, get) => ({
  alerts: [],
  async loadFromDb() {
    const rows = await alertService.getAll();
    set({ alerts: rows });
  },
  async upsertAlert(symbol, name, upper, lower) {
    const row = await alertService.upsertAlert(symbol, name, upper, lower);
    set(s => {
      const filtered = s.alerts.filter(a => a.symbol !== symbol);
      return { alerts: [...filtered, row] };
    });
  },
  async deleteAlert(id) {
    await alertService.deleteAlert(id);
    set(s => ({ alerts: s.alerts.filter(a => a.id !== id) }));
  },
  async reEnable(symbol, direction) {
    await alertService.reEnableDirection(symbol, direction);
    await get().loadFromDb();
  },
  getBySymbol(symbol) {
    return get().alerts.find(a => a.symbol === symbol);
  },
  activeCount() {
    return get().alerts.filter(
      a => a.upper_status === 'active' || a.lower_status === 'active'
    ).length;
  },
}));
```

### Battery Optimization Row in Settings Screen

```typescript
// Source: expo-intent-launcher docs
import { startActivityAsync, ActivityAction } from 'expo-intent-launcher';
import { Platform, Pressable, Text, View } from 'react-native';

function BatteryOptimizationRow() {
  if (Platform.OS !== 'android') return null;
  return (
    <Pressable
      onPress={() => startActivityAsync(ActivityAction.IGNORE_BATTERY_OPTIMIZATION_SETTINGS)}
      className="flex-row items-center justify-between py-3 border-t border-border"
    >
      <View>
        <Text className="text-text text-base">Battery Optimization</Text>
        <Text className="text-muted text-xs">Disable for reliable background alerts</Text>
      </View>
      <Text className="text-primary text-sm">Open Settings</Text>
    </Pressable>
  );
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| expo-background-fetch | expo-background-task | SDK 53 (2024) | Background fetch deprecated; WorkManager + BGTaskScheduler are the current standard |
| Background fetch with JobScheduler/AlarmManager | WorkManager | expo-background-task | More reliable under doze mode and battery saver; OS manages execution window |
| expo-notifications push (FCM required) | expo-notifications local-only | N/A | For in-app local alerts, no push server or FCM project needed |

**Deprecated/outdated:**
- `expo-background-fetch`: Still works in SDK 55 but deprecated; plan uses `expo-background-task` instead
- `Notifications.presentNotificationAsync()`: Deprecated in expo-notifications; `scheduleNotificationAsync` is current API (despite the background issue, `trigger: {seconds:1}` is the fix)

---

## Open Questions

1. **`seconds: 1` trigger from background task — confirmed working?**
   - What we know: GitHub issue #21267 confirms `trigger: null` fails; workaround uses `seconds > 0`
   - What's unclear: Whether `seconds: 1` requires `SCHEDULE_EXACT_ALARM` permission on Android 12+
   - Recommendation: Test on device in development using `triggerTaskWorkerForTestingAsync()`. If notification does not appear, add `<uses-permission android:name="android.permission.SCHEDULE_EXACT_ALARM"/>` to AndroidManifest.xml. This is a LOW-risk addition (needed for exact alarm; harmless if not strictly required).

2. **Background task JS context — can it import marketHours.ts and alertService.ts?**
   - What we know: Background task runs in a headless JS context on Android; standard module imports work; Zustand stores do NOT have their state synced
   - What's unclear: Whether drizzle `openDatabaseSync` in `db/client.ts` works in headless context
   - Recommendation: The background task should call `openDatabaseSync` independently if needed, or test that the singleton `db` client from `src/db/client.ts` initializes correctly in headless context. Likely works fine since it's just a SQLite open call.

3. **expo-background-task version compatibility with Expo SDK 55**
   - What we know: expo-background-task 55.0.x is the aligned version; `npx expo install` will resolve the correct version
   - What's unclear: Whether any Android manifest additions are required beyond what the config plugin handles automatically
   - Recommendation: Use `npx expo install expo-background-task` to get SDK-aligned version. Check if the package ships a config plugin (likely yes) or if bare workflow requires manual AndroidManifest entries. From docs: Android requires no additional manual setup; iOS requires Info.plist BGTaskSchedulerPermittedIdentifiers.

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Jest 29.7 + jest-expo preset |
| Config file | package.json `"jest"` key |
| Quick run command | `cd invest-app && npx jest --testPathPattern="alertService\|alertMonitor\|alertStore" --no-coverage` |
| Full suite command | `cd invest-app && npx jest --no-coverage` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| ALRT-01 | Bell icon renders on detail screen, taps open modal | unit (component smoke) | `npx jest --testPathPattern="detail" --no-coverage` | ✅ (detail.test.ts exists — extend it) |
| ALRT-02 | Alert validation: upper must be > current, lower must be < current | unit | `npx jest --testPathPattern="alertService" --no-coverage` | ❌ Wave 0 |
| ALRT-03 | Battery optimization row renders in Settings screen | unit | `npx jest --testPathPattern="settings" --no-coverage` | ❌ Wave 0 |
| ALRT-04 | fireAlertNotification called when price crosses target | unit | `npx jest --testPathPattern="alertMonitor" --no-coverage` | ❌ Wave 0 |
| ALRT-05 | Background task skips execution outside market hours | unit | `npx jest --testPathPattern="alertTask\|alertMonitor" --no-coverage` | ❌ Wave 0 |
| ALRT-06 | alertStore upsert/delete/reEnable mutations | unit | `npx jest --testPathPattern="alertStore" --no-coverage` | ❌ Wave 0 |
| ALRT-07 | price_alerts table exported from schema.ts with correct columns | unit | `npx jest --testPathPattern="db" --no-coverage` | ✅ (db.test.ts — extend) |

### Sampling Rate
- **Per task commit:** `cd invest-app && npx jest --testPathPattern="alertService\|alertMonitor\|alertStore\|db" --no-coverage`
- **Per wave merge:** `cd invest-app && npx jest --no-coverage`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `src/__tests__/alertService.test.ts` — covers ALRT-02, ALRT-07 (CRUD + validation)
- [ ] `src/__tests__/alertMonitor.test.ts` — covers ALRT-04, ALRT-05 (condition checks, market hours gate)
- [ ] `src/__tests__/alertStore.test.ts` — covers ALRT-06 (Zustand store mutations)
- [ ] Extend `src/__tests__/db.test.ts` — add price_alerts schema coverage for ALRT-07
- [ ] Extend `src/__tests__/detail.test.ts` — add bell icon presence check for ALRT-01

---

## Sources

### Primary (HIGH confidence)
- [expo-background-task official docs](https://docs.expo.dev/versions/latest/sdk/background-task/) — task registration, WorkManager, minimumInterval
- [expo-notifications official docs](https://docs.expo.dev/versions/latest/sdk/notifications/) — scheduleNotificationAsync, channel setup, sticky, permissions, bare workflow
- [expo-intent-launcher official docs](https://docs.expo.dev/versions/latest/sdk/intent-launcher/) — ActivityAction.IGNORE_BATTERY_OPTIMIZATION_SETTINGS
- [expo blog: Goodbye background-fetch, hello expo-background-task](https://expo.dev/blog/goodbye-background-fetch-hello-expo-background-task) — deprecation rationale, API migration notes
- Project codebase: `schema.ts`, `watchlistService.ts`, `summaryService.ts`, `quoteStore.ts`, `marketHours.ts`, `_layout.tsx`, `detail/[symbol].tsx` — established patterns

### Secondary (MEDIUM confidence)
- [GitHub issue #21267: scheduleNotificationAsync doesn't work in background task](https://github.com/expo/expo/issues/21267) — confirmed `trigger: null` failure; `seconds > 0` workaround
- [Android notification permission for Android 13](https://www.creolestudios.com/android-13-notification-permissions-react-native/) — POST_NOTIFICATIONS runtime permission requirement

### Tertiary (LOW confidence)
- Various DEV Community articles on background tasks — used only to confirm WorkManager 15-minute minimum constraint (corroborated by official docs)

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — official Expo SDK 55 packages, confirmed by docs
- Architecture patterns: HIGH — derived from existing codebase conventions + official docs
- Background notification pitfall: MEDIUM — based on GitHub issues (stale, not officially resolved); workaround is empirically recommended but should be verified on device
- Drizzle migration: HIGH — same workflow already executed for Phase 8

**Research date:** 2026-03-21
**Valid until:** 2026-04-21 (Expo SDK changes quickly; re-verify expo-background-task if > 30 days stale)
