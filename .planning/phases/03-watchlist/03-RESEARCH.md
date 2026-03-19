# Phase 3: Watchlist - Research

**Researched:** 2026-03-19
**Domain:** React Native watchlist UI — SQLite persistence, gesture-based interactions, local stock search
**Confidence:** HIGH

## Summary

Phase 3 connects three already-scaffolded layers: `watchlistStore.ts` (Zustand shell), `schema.ts` (drizzle-orm SQLite table), and `quoteStore.ts` (live TWSE polling). The core work is wiring them together and building the UI that lets users search, add, remove, and reorder stocks.

The search experience uses a locally bundled JSON list of ~2000 TWSE stocks (code + name only). This list must be built once at project setup using the TWSE OpenAPI (`openapi.twse.com.tw/v1/opendata/t187ap03_L`, fields: `公司代號` + `公司名稱`) and committed as `src/assets/stocks.json`. Substring matching on both code and name runs entirely in memory — no debounce needed.

Gesture interactions use libraries already installed in the project: `react-native-gesture-handler` v2.30 (swipe-to-delete via `ReanimatedSwipeable`) and `react-native-reanimated` v4.2.1. Drag-to-reorder requires a new library. `react-native-draggable-flatlist` v4.0.3 has known Reanimated 4 compatibility risks. `react-native-reorderable-list` v0.18 requires `react-native-reanimated >=3.12.0` (satisfied by 4.2.1) and `react-native-gesture-handler >=2.12.0` (satisfied by 2.30.0) — it is the safer choice.

**Primary recommendation:** Use `react-native-reorderable-list` for drag-to-reorder (Reanimated 4 compatible, explicit peer dep match), `ReanimatedSwipeable` from the already-installed gesture handler for swipe-to-delete, and a plain `FlatList` as the outer list container.

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **Stock card layout**: Compact, one row — code, name, current price, price change (delta + percent, e.g. +5.00 (+1.23%))
- **Tap card**: Navigates to chart detail page — Phase 3 sets up the route + placeholder (detail page already exists at `src/app/detail/[symbol].tsx`)
- **Long-press to drag-reorder**: sort_order column already exists in SQLite schema
- **No stock limit**: FlatList handles scrolling, FIFO queue handles rate limiting
- **Search**: Full-screen modal triggered by tapping search bar on home screen
- **Search data source**: Local bundled JSON list of all TWSE stock codes + Chinese names (~2000 entries)
- **Search matching**: Substring match on both code and name
- **Search result row**: Code + name + '+' button; already-added stocks show checkmark instead of '+'
- **Add interaction**: Tap '+' button, instant add, no confirmation, button changes to checkmark
- **Remove interaction**: Swipe left on watchlist card reveals red 'Delete' button, tap to confirm
- **No undo after removal**: User re-adds from search
- **Empty watchlist**: Centered CTA message with prominent 'Add Stock' button opening search modal
- **No cached data (weekend/non-trading)**: Show code + name, price shows '—', subtitle 'Waiting for market open'
- **Network error**: Silent — show last known prices, staleness shown via 'As of' timestamp from quoteStore
- **Card aesthetic**: Bloomberg terminal rows — dense, data-focused, no decorative elements

### Claude's Discretion
- Exact search modal transition animation
- FlatList vs FlashList choice for watchlist rendering
- Card border/shadow styling within cyberpunk theme
- Search bar placeholder text and styling
- Keyboard dismiss behavior in search modal
- Detail page placeholder content (Phase 4 builds the real detail)

### Deferred Ideas (OUT OF SCOPE)
- Sparkline mini chart on watchlist cards — mapped to Phase 10 (Polish)
- Stock sector/industry labels on cards — not in scope
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| WTCH-01 | User can search Taiwan stocks by code (e.g. 2330) or name (e.g. 台積電) | Bundled JSON from TWSE OpenAPI; substring filter in memory |
| WTCH-02 | User can add a stock to the home page watchlist | drizzle-orm INSERT into watchlist table; watchlistStore.addItem + setItems reload |
| WTCH-03 | User can remove a stock from the watchlist | ReanimatedSwipeable swipe-left → delete button → drizzle DELETE; watchlistStore.removeItem |
| WTCH-04 | Watchlist persists across app restarts (SQLite) | Load from SQLite in _layout.tsx after migration success; setItems call hydrates Zustand |
| WTCH-05 | Each watchlist card shows stock name, code, current price, price change (delta + percent) | quoteStore.quotes[symbol] — already has change + changePct; null price → '—' |
</phase_requirements>

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| drizzle-orm | 0.44.2 (installed) | Typed SQLite queries (SELECT/INSERT/DELETE/UPDATE) | Already set up with expo-sqlite, schema defined |
| expo-sqlite | ~55.0.11 (installed) | SQLite engine | Project standard, migrations already applied |
| react-native-gesture-handler | 2.30.0 (installed) | ReanimatedSwipeable for swipe-to-delete | Already installed; ReanimatedSwipeable built-in, no new dep |
| react-native-reanimated | 4.2.1 (installed) | Animation for swipe reveal, drag-lift feedback | Already installed, powers Swipeable and reorder |
| zustand | ^5.0.12 (installed) | In-memory state for watchlist items + quotes | Already established pattern |
| react-native-reorderable-list | 0.18.0 (new) | Drag-to-reorder FlatList with long-press activation | Only library with explicit Reanimated >=3.12 peer dep (compatible with 4.x) |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| expo-haptics | bundled with Expo SDK 55 | Haptic feedback on long-press drag start | Call `Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)` in drag handler |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| react-native-reorderable-list | react-native-draggable-flatlist v4.0.3 | draggable-flatlist requires Reanimated >=2.8.0 — peer dep is satisfied but known Reanimated 4 compatibility issues reported in GitHub issues (non-worklet call errors); reorderable-list explicitly targets >=3.12 which covers 4.x |
| react-native-reorderable-list | Custom PanGestureHandler | More code, more bugs, no autoscroll — not worth it |
| FlatList | FlashList | FlashList would be faster for very large lists; for a personal watchlist with <100 stocks, FlatList overhead is negligible. FlashList also has New Architecture compatibility caveats worth avoiding here. FlatList is recommended. |

**Installation:**
```bash
npx expo install react-native-reorderable-list expo-haptics
```

---

## Architecture Patterns

### Recommended Project Structure
```
src/
├── app/
│   ├── index.tsx             # Replace hardcoded cards with real WatchlistPage
│   ├── _layout.tsx           # Add loadWatchlist() call after migration success
│   └── detail/[symbol].tsx   # Already exists — update placeholder text only
├── features/
│   └── watchlist/
│       ├── store/
│       │   └── watchlistStore.ts    # Add loadFromDb() action + SQLite sync
│       ├── components/
│       │   ├── StockCard.tsx        # Swipeable card row (code, name, price, change)
│       │   ├── SearchModal.tsx      # Full-screen modal with TextInput + FlatList
│       │   └── EmptyWatchlist.tsx   # CTA when watchlist is empty
│       └── hooks/
│           └── useWatchlistActions.ts  # add/remove/reorder with DB sync
├── assets/
│   └── stocks.json           # Bundled TWSE stock list [{code, name}]
└── services/
    └── watchlistService.ts   # drizzle CRUD operations for watchlist table
```

### Pattern 1: SQLite Hydration on App Start

**What:** After drizzle migration succeeds in `_layout.tsx`, load all watchlist rows ordered by `sort_order` and call `setItems()` on the Zustand store. This hydrates the in-memory store before any component renders.

**When to use:** One-time on app start. Idempotent — safe to call again if needed.

```typescript
// In _layout.tsx, after `if (!success) return ...`
import { db } from '../db/client';
import { watchlist } from '../db/schema';
import { asc } from 'drizzle-orm';
import { useWatchlistStore } from '../features/watchlist/store/watchlistStore';

// Inside RootLayout after migration success check:
useEffect(() => {
  if (success) {
    db.select().from(watchlist).orderBy(asc(watchlist.sort_order))
      .then(rows => {
        useWatchlistStore.getState().setItems(rows.map(r => ({
          id: r.id,
          symbol: r.symbol,
          name: r.name,
          sort_order: r.sort_order,
        })));
        // Restart polling with loaded symbols
        const symbols = rows.map(r => r.symbol);
        if (symbols.length > 0 && isMarketOpen()) {
          useQuoteStore.getState().startPolling(symbols);
        }
      });
  }
}, [success]);
```

### Pattern 2: drizzle-orm CRUD for Watchlist

**What:** All SQLite operations use the already-configured `db` client from `src/db/client.ts`.

```typescript
// Source: drizzle-orm/expo-sqlite docs
import { db } from '../db/client';
import { watchlist } from '../db/schema';
import { eq, asc } from 'drizzle-orm';

// INSERT new stock
const [inserted] = await db.insert(watchlist).values({
  symbol: '2330',
  name: '台灣積體電路',
  sort_order: currentItems.length,  // append at end
}).returning();

// DELETE stock
await db.delete(watchlist).where(eq(watchlist.id, itemId));

// UPDATE sort_order (batch after reorder)
await db.update(watchlist)
  .set({ sort_order: newIndex })
  .where(eq(watchlist.id, itemId));

// SELECT all ordered
const rows = await db.select().from(watchlist).orderBy(asc(watchlist.sort_order));
```

### Pattern 3: ReanimatedSwipeable for Swipe-to-Delete

**What:** Wrap each `StockCard` in `ReanimatedSwipeable` from gesture handler. Reveal a red Delete button on swipe left.

```typescript
// Source: https://docs.swmansion.com/react-native-gesture-handler/docs/components/reanimated_swipeable/
import Swipeable from 'react-native-gesture-handler/ReanimatedSwipeable';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';

function DeleteAction({ drag }: { drag: any }) {
  const style = useAnimatedStyle(() => ({
    transform: [{ translateX: drag.value + 80 }],
  }));
  return (
    <Animated.View style={style} className="bg-stock-down w-20 justify-center items-center">
      <Text className="text-white font-semibold">Delete</Text>
    </Animated.View>
  );
}

<Swipeable
  renderRightActions={(progress, drag) => (
    <DeleteAction drag={drag} />
  )}
  rightThreshold={40}
  friction={2}
  onSwipeableOpen={() => handleDelete(item.id)}
>
  <StockCard item={item} quote={quotes[item.symbol]} />
</Swipeable>
```

### Pattern 4: react-native-reorderable-list for Drag-to-Reorder

**What:** Replace outer FlatList with `ReorderableList`. Use `useReorderableDrag` hook to activate drag on long-press. On `onReorder`, persist new `sort_order` values to SQLite.

```typescript
// Source: https://github.com/omahili/react-native-reorderable-list
import ReorderableList, {
  ReorderableListItem,
  useReorderableDrag,
  reorderItems,
} from 'react-native-reorderable-list';
import * as Haptics from 'expo-haptics';

function DraggableStockCard({ item, quote }: Props) {
  const drag = useReorderableDrag();
  return (
    <ReorderableListItem>
      <Swipeable renderRightActions={...}>
        <Pressable
          onLongPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            drag();
          }}
        >
          <StockCard item={item} quote={quote} />
        </Pressable>
      </Swipeable>
    </ReorderableListItem>
  );
}

<ReorderableList
  data={items}
  keyExtractor={(item) => item.symbol}
  renderItem={({ item }) => (
    <DraggableStockCard item={item} quote={quotes[item.symbol]} />
  )}
  onReorder={({ fromIndex, toIndex }) => {
    const reordered = reorderItems(items, fromIndex, toIndex);
    setItems(reordered);
    // Persist sort_order to SQLite
    reordered.forEach((it, idx) => {
      db.update(watchlist).set({ sort_order: idx }).where(eq(watchlist.id, it.id));
    });
  }}
/>
```

### Pattern 5: Local Stock Search

**What:** Bundle a JSON array of `{code: string, name: string}` objects at `src/assets/stocks.json`. Filter in the search modal with a simple `includes()` check. No network call needed.

```typescript
// stocks.json structure
[
  { "code": "2330", "name": "台灣積體電路製造" },
  { "code": "2317", "name": "鴻海精密工業" },
  ...
]

// Filter in SearchModal
import stocks from '../../assets/stocks.json';

const results = useMemo(() =>
  query.length === 0 ? [] :
  stocks.filter(s =>
    s.code.includes(query) || s.name.includes(query)
  ).slice(0, 50),  // Cap at 50 for render performance
  [query]
);
```

**Data source to build stocks.json:** `GET https://openapi.twse.com.tw/v1/opendata/t187ap03_L` returns array of objects; extract `公司代號` as `code` and `公司名稱` as `name`. Run this once as a build script and commit the output.

### Anti-Patterns to Avoid

- **Calling `db` operations directly in components**: Always wrap in `watchlistService.ts` or `useWatchlistActions.ts` — keeps components pure.
- **Reloading from SQLite on every render**: Only reload on app start and after mutations; use Zustand as the source of truth during the session.
- **Nesting Swipeable inside ReorderableList item without `ReorderableListItem`**: The reorderable-list library requires its own item wrapper to intercept the long-press gesture correctly.
- **Using `startPolling` without updating symbols**: After adding/removing a stock, stop and restart polling with the updated symbol list so the new stock gets quotes immediately.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Swipe-to-delete gesture | Custom PanResponder | `ReanimatedSwipeable` from RNGH | Edge cases: momentum, threshold, iOS swipe-back conflict — library handles all |
| Drag-to-reorder | Custom gesture chain | `react-native-reorderable-list` | Autoscroll at list edges, ghost lift animation, concurrent gesture de-conflicting |
| Haptic feedback | `Vibration.vibrate()` | `expo-haptics` | `Vibrator` API deprecated for haptic purposes; expo-haptics maps to correct Android/iOS APIs |
| Stock search API | TWSE real-time search | Bundled JSON + local filter | Instant results, no rate-limit risk, offline support — 2000 entries is ~80KB JSON |

**Key insight:** The gesture layer (swipe + drag) has significant hidden complexity — concurrent gesture recognition, native-thread animation, autoscroll at edges. The libraries handle what would take weeks to build correctly.

---

## Common Pitfalls

### Pitfall 1: Swipeable inside ReorderableList — gesture conflict
**What goes wrong:** Long-press for drag and horizontal pan for swipe fight each other. Only one gesture wins; the other fails silently.
**Why it happens:** Both `ReorderableList` and `Swipeable` install gesture responders on the same view hierarchy.
**How to avoid:** Wrap each item in `ReorderableListItem` (required by reorderable-list). The library uses a long-press activation threshold that clears before the swipe handler activates, so they de-conflict correctly as long as `ReorderableListItem` is the outermost wrapper per row.
**Warning signs:** Drag never activates, or swipe stops working after first drag.

### Pitfall 2: quoteStore symbols not updated after add/remove
**What goes wrong:** User adds stock 2330; it appears in the watchlist but shows no price. quoteStore is polling the old symbol list.
**Why it happens:** `startPolling` is called once in `_layout.tsx` with the symbols from app start. New additions are not passed to the polling loop.
**How to avoid:** After `watchlistStore.addItem()`, call `useQuoteStore.getState().stopPolling()` then `startPolling(updatedSymbols)`. The `startPolling` idempotency guard requires a stop first.

### Pitfall 3: SQLite sort_order gaps after deletions
**What goes wrong:** After deleting stock at index 2 from a 5-item list, sort_order values are [0,1,3,4]. Visual order is correct but future inserts use stale `items.length` as sort_order and collide.
**Why it happens:** Delete only removes one row; sibling rows keep their original sort_order values.
**How to avoid:** After any delete, re-index all remaining rows: `reordered.forEach((it, idx) => db.update(watchlist).set({ sort_order: idx }).where(eq(watchlist.id, it.id)))`. Or use `MAX(sort_order) + 1` for inserts instead of `items.length`.

### Pitfall 4: stocks.json not typed — runtime crashes on bad entries
**What goes wrong:** TypeScript accepts the JSON import but gives it type `any[]`. Accessing `.code` on a malformed entry crashes.
**Why it happens:** JSON imports are untyped by default in TypeScript.
**How to avoid:** Define an interface and cast: `const stocks = rawStocks as Array<{ code: string; name: string }>`. Add a build-time assertion or simple runtime filter.

### Pitfall 5: Duplicate symbol INSERT — unique constraint violation
**What goes wrong:** User taps '+' twice quickly. Second INSERT throws SQLite unique constraint error on `symbol` column.
**Why it happens:** The UI disables the button after one tap (changes to checkmark) but the async INSERT may not have completed before a second tap registers.
**How to avoid:** Disable the '+' button optimistically by checking `watchlistStore.getState().items.some(i => i.symbol === code)` before the INSERT, not after. Or use `INSERT OR IGNORE`.

---

## Code Examples

### StockCard row (price display logic)
```typescript
// Source: quoteStore.ts interface — Quote.price is number | null
function formatChange(change: number, changePct: number): string {
  const sign = change >= 0 ? '+' : '';
  return `${sign}${change.toFixed(2)} (${sign}${changePct.toFixed(2)}%)`;
}

// In StockCard:
const quote = quotes[item.symbol];
const priceDisplay = quote?.price != null ? quote.price.toFixed(2) : '—';
const changeDisplay = quote?.price != null
  ? formatChange(quote.change, quote.changePct)
  : 'Waiting for market open';
const changeColor = (quote?.change ?? 0) >= 0 ? 'text-stock-up' : 'text-stock-down';
```

### Watchlist hydration in _layout.tsx
```typescript
// Add after the `if (!success) return ...` guard
useEffect(() => {
  if (!success) return;
  db.select()
    .from(watchlist)
    .orderBy(asc(watchlist.sort_order))
    .then(rows => {
      const items = rows.map(r => ({
        id: r.id, symbol: r.symbol,
        name: r.name, sort_order: r.sort_order,
      }));
      useWatchlistStore.getState().setItems(items);
      const symbols = items.map(i => i.symbol);
      if (symbols.length > 0 && isMarketOpen()) {
        useQuoteStore.getState().startPolling(symbols);
      }
    });
}, [success]);
```

### Search modal filter
```typescript
// Instant, synchronous — no debounce needed for <2000 items
const results = useMemo(() => {
  if (!query.trim()) return [];
  const q = query.trim();
  return (stocks as StockEntry[])
    .filter(s => s.code.includes(q) || s.name.includes(q))
    .slice(0, 50);
}, [query]);
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `Swipeable` (non-Reanimated) from RNGH | `ReanimatedSwipeable` from RNGH | RNGH v2.x | Runs animation on UI thread; no JS jank during swipe |
| Custom `PanGestureHandler` for drag | `react-native-reorderable-list` | 2023-2025 | Handles autoscroll, ghost lift, gesture de-conflicting |
| `Animated.Value` | Reanimated `SharedValue` | Reanimated v2+ | Worklet execution on UI thread, 60fps guaranteed |
| `useAnimatedStyle` requires `'worklet'` | Implicit in Reanimated 4 | Reanimated 4.0 | `'worklet'` directive is now optional in Reanimated 4 |

**Deprecated/outdated:**
- `Swipeable` (non-Reanimated): Still in RNGH package but not recommended — use `ReanimatedSwipeable` instead
- `react-native-draggable-flatlist` with Reanimated 4: Peer dep says >=2.8.0 but known runtime issues with Reanimated 4.x (non-worklet call errors on UI thread)

---

## Open Questions

1. **react-native-reorderable-list + ReanimatedSwipeable combined gesture**
   - What we know: Both libraries use RNGH 2.x Pan/LongPress detectors. The reorderable-list uses `ReorderableListItem` to scope its gesture.
   - What's unclear: Whether simultaneous gesture activation (swipe during a cancelled drag, or drag after a swipe) causes visual artifacts.
   - Recommendation: Test on device early in implementation; if issues arise, disable swipe while drag is active via `enabled` prop on `Swipeable`.

2. **expo-haptics availability on Android emulators**
   - What we know: `Haptics.impactAsync` is documented as working on Android via Vibrator service.
   - What's unclear: Whether the test device/emulator supports it — emulators often don't.
   - Recommendation: Wrap in try/catch and fail silently. Haptics are enhancement, not required.

3. **stocks.json freshness**
   - What we know: TWSE listed companies change slowly (new listings, delistings).
   - What's unclear: How often to regenerate the file.
   - Recommendation: Regenerate manually when the app needs updating. TWSE typically lists ~1700 companies; the file is stable enough to bundle for v1.

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | jest-expo ~29.7 (jest ~29.7) |
| Config file | `package.json` `jest` key with `jest-expo` preset |
| Quick run command | `npx jest --testPathPattern="watchlist" --no-coverage` (run from `/Users/linmini/invest/invest-app/`) |
| Full suite command | `npx jest` (run from `/Users/linmini/invest/invest-app/`) |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| WTCH-01 | Substring search on code and name returns correct results | unit | `npx jest --testPathPattern="watchlistSearch" --no-coverage` | Wave 0 |
| WTCH-02 | addItem action inserts row into watchlist, Zustand state updates | unit | `npx jest --testPathPattern="watchlistStore" --no-coverage` | Wave 0 |
| WTCH-03 | removeItem action deletes row, symbol disappears from store state | unit | `npx jest --testPathPattern="watchlistStore" --no-coverage` | Wave 0 |
| WTCH-04 | Loading from SQLite on init hydrates Zustand store correctly | unit | `npx jest --testPathPattern="watchlistStore" --no-coverage` | Wave 0 |
| WTCH-05 | StockCard displays price + change with correct formatting (null → '—') | unit | `npx jest --testPathPattern="StockCard" --no-coverage` | Wave 0 |

### Sampling Rate
- **Per task commit:** `npx jest --testPathPattern="watchlist|StockCard" --no-coverage`
- **Per wave merge:** `npx jest --no-coverage`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `src/__tests__/watchlistStore.test.ts` — covers WTCH-02, WTCH-03, WTCH-04
- [ ] `src/__tests__/watchlistSearch.test.ts` — covers WTCH-01
- [ ] `src/__tests__/StockCard.test.tsx` — covers WTCH-05 (display logic unit test, no render needed)

*(Existing infrastructure: jest-expo preset, transformIgnorePatterns, jest.mock pattern — all established in Phase 2 tests. No framework install needed.)*

---

## Sources

### Primary (HIGH confidence)
- Existing codebase: `src/features/watchlist/store/watchlistStore.ts`, `src/db/schema.ts`, `src/features/market/quoteStore.ts`, `src/app/_layout.tsx` — read directly
- `package.json` — all installed library versions confirmed
- `drizzle/0000_organic_frightful_four.sql` — SQLite schema confirmed
- `https://docs.swmansion.com/react-native-gesture-handler/docs/components/reanimated_swipeable/` — ReanimatedSwipeable API verified
- `https://openapi.twse.com.tw/v1/opendata/t187ap03_L` — TWSE listed companies endpoint verified (response structure confirmed by fetch)
- `npm info react-native-draggable-flatlist` — version 4.0.3, peerDependencies confirmed
- `npm info react-native-reorderable-list` — version 0.18.0, peerDependencies confirmed
- `https://github.com/omahili/react-native-reorderable-list` — API and installation verified

### Secondary (MEDIUM confidence)
- `https://docs.expo.dev/versions/latest/sdk/haptics/` — expo-haptics API and Android support
- `https://github.com/computerjazz/react-native-draggable-flatlist` — Reanimated 4 compatibility risk (GitHub issues report non-worklet errors)

### Tertiary (LOW confidence)
- Community reports of `react-native-draggable-flatlist` + Reanimated 4 runtime errors — from GitHub issues, not official docs; used to inform library selection only

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries verified via npm registry or node_modules
- Architecture: HIGH — drizzle-orm, Zustand, and RNGH APIs confirmed from official docs
- Pitfalls: MEDIUM — gesture conflict pitfall is inferred from library architecture; sort_order gap and quote update pitfalls are logic-derived
- Library compatibility (reorderable-list): MEDIUM — peer dep satisfied but not tested in this exact config yet

**Research date:** 2026-03-19
**Valid until:** 2026-04-19 (stable ecosystem; Reanimated 4 is new but stabilizing)
