# Phase 5: Settings - Research

**Researched:** 2026-03-21
**Domain:** expo-secure-store, Zustand v5 custom storage, slide-in drawer, masked API key input, toast notifications
**Confidence:** HIGH

## Summary

Phase 5 has two implementation plans: (1) install expo-secure-store, extend settingsStore with API key / model / base URL state persisted to the keychain, and (2) build the SettingsScreen UI with masked key input, glow pill selector, and a hamburger-triggered slide-in drawer on the home screen.

The secure-store integration follows a well-established pattern: a thin adapter wrapping `SecureStore.getItemAsync/setItemAsync/deleteItemAsync` exposes a Zustand-compatible `PersistStorage` interface. Non-sensitive display preferences (glowLevel) can remain in plain in-memory Zustand; only the API key string must go through the keychain. Model name and base URL are not secrets, so they can live in the Zustand store without additional encryption — the user expectation is only that the API key is never plaintext anywhere.

For the drawer, the project already has `react-native-gesture-handler` installed (used for `ReanimatedSwipeable` in the watchlist). `ReanimatedDrawerLayout` from that same package is the right tool — no new dependency, uses the existing Reanimated 4 and gesture handler setup, and gives a native-feel slide with a dimmed backdrop out of the box. Toast "Saved" feedback is best handled with a tiny self-contained Reanimated-based Animated.View fade rather than adding a new library (zero-dep approach).

**Primary recommendation:** Use `expo-secure-store` (keychain write/read) directly from the settingsStore actions; do not use Zustand persist middleware for the key itself. Zustand persist middleware is overkill here — the store only holds three fields and the key must be read async on load. Instead, hydrate on app start in `_layout.tsx`, identical to how `watchlistStore.loadFromDb()` works today.

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Settings entry point**
- Hamburger menu icon in top-left of home screen header
- Slide-in drawer from left edge, cyberpunk-styled (bg-surface background)
- Drawer contains: Settings item only (other items can be added in future phases)
- Close via swipe left gesture or tap outside on dimmed overlay
- Tapping Settings navigates to the settings screen (existing `settings.tsx`)

**Settings screen layout**
- Two sections: "API Configuration" and "Display"
- API Configuration section: MiniMax API key field, model name field (free text, default "MiniMax-M2.5"), base URL field (default "https://api.minimax.io/v1")
- Display section: Glow intensity with 3 pill buttons (Subtle / Medium / Heavy), similar to timeframe selector style
- Back button in header to return to home

**API key input behavior**
- Masked display with reveal toggle: shows "••••••••abcd" (last 4 chars visible), eye icon to temporarily reveal full key
- Auto-save on blur: key saves to expo-secure-store automatically when user taps away, shows brief "Saved" toast
- "Test" button next to API key field: makes lightweight API call to verify key works, shows success/error feedback
- Clear/trash button to delete saved key from secure storage with confirmation prompt
- Model name and base URL fields also auto-save on blur

### Claude's Discretion
- Toast notification styling and duration
- Test connection API call implementation details
- Drawer animation timing and easing
- Keyboard handling for input fields

### Deferred Ideas (OUT OF SCOPE)
- Additional drawer items (About, Help, Feedback) — future phases
- Fugle API key field for intraday chart data — Phase 4 v2
- Theme/color scheme selector — could be added to Display section later
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| SETT-01 | User can access settings via top-right icon on home page | Hamburger menu in top-left header; `ReanimatedDrawerLayout` from existing `react-native-gesture-handler` package provides the drawer |
| SETT-02 | User can input/update MiniMax API key | TextInput with masked display + eye toggle; auto-save on blur via `SecureStore.setItemAsync` |
| SETT-03 | User can configure AI model name (default: MiniMax-M2.5) | Plain text field; auto-save on blur; default value embedded in store initialisation |
| SETT-04 | API keys stored securely (expo-secure-store, not plaintext) | `npx expo install expo-secure-store` v55.0.9; Android Keystore / iOS Keychain; key never serialised to SQLite or file |
| SETT-05 | Settings page includes all required API configuration fields | Three fields confirmed: API key, model name, base URL — all present in the locked design |
</phase_requirements>

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| expo-secure-store | ~55.0.9 (install via `npx expo install`) | Encrypted keychain storage for API key | Official Expo SDK; Android Keystore + iOS Keychain; no extra native setup needed |
| react-native-gesture-handler | ~2.30.0 (already installed) | `ReanimatedDrawerLayout` for slide-in drawer | Already in project; ships `ReanimatedDrawerLayout` component in same package |
| react-native-reanimated | 4.2.1 (already installed) | Drawer and toast animations | Already in project; Reanimated 4 is the animation layer for the whole app |
| zustand | ^5.0.12 (already installed) | Settings state store | Already used project-wide; extend existing settingsStore |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| (no new library) | — | Toast "Saved" feedback | A self-contained Animated.View opacity fade in-component is sufficient; avoids an extra library for a single one-line notification |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| ReanimatedDrawerLayout (in-package) | @react-navigation/drawer | react-navigation drawer requires additional install + navigator wrapping; ReanimatedDrawerLayout is already in `react-native-gesture-handler` at ~2.30.0 |
| Direct SecureStore calls from store actions | Zustand persist middleware with custom storage adapter | persist middleware adds serialisation boilerplate; only 1 field (apiKey) is secret; async hydration on app start is cleaner and matches existing watchlistStore pattern |
| react-native-toast-message | In-component Animated.View toast | react-native-toast-message requires `<Toast />` in `_layout.tsx` root; for a single "Saved" confirmation a local fade is simpler and avoids library coupling |

**Installation (new dependency only):**
```bash
npx expo install expo-secure-store
```

---

## Architecture Patterns

### Recommended Project Structure
```
src/
├── app/
│   ├── index.tsx          # Add HamburgerDrawer wrapper around WatchlistPage
│   └── settings.tsx       # Enhance — replace placeholder with full UI
├── features/
│   └── settings/
│       ├── store/
│       │   └── settingsStore.ts    # Extend with apiKey, modelName, baseUrl + SecureStore actions
│       └── components/
│           ├── HamburgerDrawer.tsx # ReanimatedDrawerLayout wrapper + drawer content
│           ├── ApiKeyInput.tsx     # Masked input with eye toggle, Test button, Clear button
│           └── GlowPillSelector.tsx # Reuse TimeframeSelector pill pattern for Subtle/Medium/Heavy
```

### Pattern 1: SecureStore — Load on App Start
**What:** Read API key from keychain once at startup; populate Zustand store. Identical to the `watchlistStore.loadFromDb()` hydration pattern already in `_layout.tsx`.
**When to use:** Any value that must survive app restart but must not appear in SQLite or files.

```typescript
// In _layout.tsx — inside the existing "if (!success) return" guard
// after watchlistStore.loadFromDb() resolves:
useSettingsStore.getState().loadFromSecureStore();
```

```typescript
// In settingsStore.ts
import * as SecureStore from 'expo-secure-store';

const SECURE_KEY = 'minimax_api_key';

interface SettingsState {
  glowLevel: GlowLevel;
  apiKey: string;        // '' = not set
  modelName: string;
  baseUrl: string;
  setGlowLevel: (level: GlowLevel) => void;
  loadFromSecureStore: () => Promise<void>;
  saveApiKey: (key: string) => Promise<void>;
  deleteApiKey: () => Promise<void>;
  setModelName: (name: string) => void;
  setBaseUrl: (url: string) => void;
}

// loadFromSecureStore reads the key asynchronously; other fields have defaults
// saveApiKey calls SecureStore.setItemAsync and updates in-memory state
// deleteApiKey calls SecureStore.deleteItemAsync and clears in-memory state
// modelName / baseUrl are not secrets — store in Zustand in-memory only (no persist needed across sessions is acceptable; if persistence is desired, AsyncStorage or Zustand persist with AsyncStorage works)
```

**Key insight:** Zustand in-memory state acts as a fast read cache. The keychain is the source of truth for apiKey. All other settings fields (modelName, baseUrl, glowLevel) are non-sensitive; they do not need SecureStore.

### Pattern 2: ReanimatedDrawerLayout — Hamburger Drawer
**What:** Wrap the home screen content in `ReanimatedDrawerLayout`. Hamburger button in header calls `drawerRef.current?.openDrawer()`.
**When to use:** Single-screen drawer that needs swipe-to-close + backdrop dismiss without a full navigation restructure.

```typescript
// Source: react-native-gesture-handler docs (ReanimatedDrawerLayout)
import ReanimatedDrawerLayout, {
  DrawerType,
} from 'react-native-gesture-handler/ReanimatedDrawerLayout';
import { useRef } from 'react';

const drawerRef = useRef<any>(null);

function DrawerContent() {
  const router = useRouter();
  return (
    <View className="flex-1 bg-surface pt-12 px-4">
      <Pressable onPress={() => { drawerRef.current?.closeDrawer(); router.push('/settings'); }}>
        <Text className="text-text text-base">Settings</Text>
      </Pressable>
    </View>
  );
}

// In HomeScreen JSX:
<ReanimatedDrawerLayout
  ref={drawerRef}
  drawerType={DrawerType.FRONT}
  drawerWidth={260}
  renderNavigationView={() => <DrawerContent />}
  overlayColor="rgba(0,0,0,0.6)"
>
  <WatchlistPage onHamburgerPress={() => drawerRef.current?.openDrawer()} />
</ReanimatedDrawerLayout>
```

### Pattern 3: Masked API Key Display
**What:** Display "••••••••abcd" (last 4 chars) while key is loaded in state. Eye icon toggles to show full key via `secureTextEntry={false}`.
**When to use:** Any sensitive credential input where intentional reveal is required.

```typescript
// API key display logic (no library needed)
function maskKey(key: string): string {
  if (key.length <= 4) return key;
  return '••••••••' + key.slice(-4);
}

// In component:
const [isRevealed, setIsRevealed] = useState(false);
const [inputValue, setInputValue] = useState('');

// On focus: set inputValue to actual apiKey for editing
// On blur: call settingsStore.saveApiKey(inputValue)
// Display: isRevealed ? inputValue : maskKey(apiKey)
// TextInput secureTextEntry={!isRevealed}
```

### Pattern 4: Test Connection Button
**What:** Make a minimal `POST /v1/chat/completions` call with 1 token to verify the key is valid. MiniMax does not expose a `/models` endpoint, so a chat completion call is the only reliable test.

```typescript
async function testConnection(apiKey: string, baseUrl: string, modelName: string) {
  const res = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: modelName,
      messages: [{ role: 'user', content: 'hi' }],
      max_tokens: 1,
    }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
}
```

### Anti-Patterns to Avoid
- **Storing apiKey in Zustand persist middleware backed by AsyncStorage:** AsyncStorage writes plaintext JSON to the filesystem — defeats SETT-04.
- **Storing apiKey in SQLite:** Same problem — SQLite database file is not encrypted at rest.
- **Using `secureTextEntry` and `value` prop together for the "masked last 4" display:** React Native's `secureTextEntry` replaces all chars with dots; it cannot show the last 4. Use a disabled non-editable `Text` component for the masked preview and swap to an editable `TextInput` on focus.
- **Calling `SecureStore.getItemAsync` directly from React render:** Always async; call from an effect or store action, never inline during render.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Slide-in drawer with backdrop + swipe dismiss | Custom Modal + Animated translateX + PanResponder | `ReanimatedDrawerLayout` from `react-native-gesture-handler` (already installed) | Handles edge swipe, backdrop tap, animation easing, and `openDrawer()`/`closeDrawer()` ref API |
| Encrypted local storage | Base64 encode + AsyncStorage | `expo-secure-store` | Platform keychain; Android Keystore / iOS Keychain; automatic encryption |
| Toast notification library | None needed | In-component `Animated.View` opacity fade | Single use case; a library adds config surface for no benefit |

**Key insight:** All heavy lifting (gesture drawer, secure storage) is already available in the installed dependency set. This phase is primarily wiring, not building new infrastructure.

---

## Common Pitfalls

### Pitfall 1: `secureTextEntry` + controlled `value` causes cursor jump on iOS
**What goes wrong:** When `secureTextEntry={true}` and `value={someString}`, iOS resets cursor to end of field on each keystroke, breaking editing.
**Why it happens:** iOS re-renders the field as a password field on each state update.
**How to avoid:** Use `defaultValue` + `onChangeText` (uncontrolled) during editing; only sync to store on blur.
**Warning signs:** Characters appear out of order while typing in the masked field.

### Pitfall 2: ReanimatedDrawerLayout renders children before GestureHandlerRootView
**What goes wrong:** Gestures on drawer content don't register; drawer doesn't respond to swipe.
**Why it happens:** `GestureHandlerRootView` must be an ancestor of all gesture components.
**How to avoid:** The project already wraps the app in `GestureHandlerRootView` via the existing navigation setup (confirmed by use of `ReanimatedSwipeable` in Phase 3). Verify it is still at root in `_layout.tsx`.
**Warning signs:** Drawer doesn't open on swipe from edge.

### Pitfall 3: expo-secure-store key name constraints
**What goes wrong:** `SecureStore.setItemAsync` throws if the key contains characters outside `[A-Za-z0-9._-]`.
**Why it happens:** Underlying keychain APIs impose key name restrictions.
**How to avoid:** Use a short, safe constant like `'minimax_api_key'`. Never use dynamic key names derived from user input.
**Warning signs:** `SecureStore.setItemAsync` rejects with "Invalid key" error.

### Pitfall 4: SecureStore async on initial render — flash of empty state
**What goes wrong:** Settings screen mounts before `loadFromSecureStore()` resolves; fields show defaults briefly.
**Why it happens:** Keychain reads are async.
**How to avoid:** Hydrate in `_layout.tsx` after migration succeeds (same timing as `loadFromDb`). By the time the user navigates to Settings the key is already in Zustand state.

### Pitfall 5: MiniMax `/models` endpoint does not exist
**What goes wrong:** Test connection implementation tries `GET /v1/models` to verify key — receives 404 or permission error even for valid keys.
**Why it happens:** MiniMax OpenAI-compatible API does not implement the models listing endpoint.
**How to avoid:** Use `POST /v1/chat/completions` with `max_tokens: 1` as the test call. A 200 response = key is valid.

### Pitfall 6: Drawer blocks PagerView horizontal swipe on home screen
**What goes wrong:** Horizontal swipe that should navigate to the AI Analysis page opens the drawer instead.
**Why it happens:** Both `ReanimatedDrawerLayout` and `PagerView` compete for horizontal swipe gestures.
**How to avoid:** Set `edgeWidth` on the drawer (e.g., `edgeWidth={30}`) so only swipes starting from the very left edge open the drawer. PagerView's swipe starts from the middle of the screen.

---

## Code Examples

Verified patterns from official sources:

### expo-secure-store: save and load
```typescript
// Source: https://docs.expo.dev/versions/v55.0.0/sdk/securestore/
import * as SecureStore from 'expo-secure-store';

const KEY = 'minimax_api_key';

// Save
await SecureStore.setItemAsync(KEY, apiKeyString);

// Load — returns null if not set
const value = await SecureStore.getItemAsync(KEY);

// Delete
await SecureStore.deleteItemAsync(KEY);
```

### settingsStore skeleton (Zustand v5)
```typescript
// Source: project pattern — matches watchlistStore.ts structure
import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';

export type GlowLevel = 'subtle' | 'medium' | 'heavy';

const API_KEY_STORE_KEY = 'minimax_api_key';

interface SettingsState {
  glowLevel: GlowLevel;
  apiKey: string;
  modelName: string;
  baseUrl: string;
  setGlowLevel: (level: GlowLevel) => void;
  loadFromSecureStore: () => Promise<void>;
  saveApiKey: (key: string) => Promise<void>;
  deleteApiKey: () => Promise<void>;
  setModelName: (name: string) => void;
  setBaseUrl: (url: string) => void;
}

export const useSettingsStore = create<SettingsState>((set) => ({
  glowLevel: 'subtle',
  apiKey: '',
  modelName: 'MiniMax-M2.5',
  baseUrl: 'https://api.minimax.io/v1',

  setGlowLevel: (level) => set({ glowLevel: level }),
  setModelName: (modelName) => set({ modelName }),
  setBaseUrl: (baseUrl) => set({ baseUrl }),

  loadFromSecureStore: async () => {
    const key = await SecureStore.getItemAsync(API_KEY_STORE_KEY);
    set({ apiKey: key ?? '' });
  },

  saveApiKey: async (key) => {
    await SecureStore.setItemAsync(API_KEY_STORE_KEY, key);
    set({ apiKey: key });
  },

  deleteApiKey: async () => {
    await SecureStore.deleteItemAsync(API_KEY_STORE_KEY);
    set({ apiKey: '' });
  },
}));
```

### GlowPillSelector (reuse TimeframeSelector pattern)
```typescript
// Source: src/features/charts/components/TimeframeSelector.tsx (existing)
// Replace TIMEFRAMES with GLOW_LEVELS = ['subtle', 'medium', 'heavy'] as const
// Replace Timeframe with GlowLevel
// Replace onSelect with onSelect: (level: GlowLevel) => void
// Labels: 'Subtle' | 'Medium' | 'Heavy' (capitalised display)
// active prop: GlowLevel
```

### ReanimatedDrawerLayout integration (home screen)
```typescript
// Source: https://docs.swmansion.com/react-native-gesture-handler/docs/components/reanimated-drawer-layout/
import ReanimatedDrawerLayout, {
  DrawerType,
} from 'react-native-gesture-handler/ReanimatedDrawerLayout';

const drawerRef = useRef<any>(null);
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| react-native-drawer (deprecated) | ReanimatedDrawerLayout in react-native-gesture-handler | ~2022 | Single package, Reanimated-native, no extra install |
| SecureStore synchronous only | Both async (preferred) and sync methods | ~2023 | Async methods do not block JS thread |
| Zustand v4 persist with AsyncStorage | Zustand v5 + direct SecureStore calls | 2024 | v5 API is stable; no middleware overhead for small state |

**Deprecated/outdated:**
- `AsyncStorage` for API keys: Never appropriate for secrets; use SecureStore.
- `DrawerLayoutAndroid`: Android-only; `ReanimatedDrawerLayout` is cross-platform.

---

## Open Questions

1. **glowLevel persistence across app restart**
   - What we know: Currently in-memory only (resets to 'subtle' on restart)
   - What's unclear: Whether the user expects this to persist (CONTEXT.md does not specify)
   - Recommendation: Persist glowLevel to AsyncStorage (or Zustand persist + AsyncStorage) in Wave 2 of 05-02 if there is time; it is not a SETT requirement, so Wave 1 can leave it in-memory.

2. **modelName and baseUrl persistence across restart**
   - What we know: Not secrets, should persist so users don't re-enter after restart
   - What's unclear: CONTEXT.md says "auto-save on blur" but does not explicitly specify persistence storage
   - Recommendation: Use `AsyncStorage` or Zustand `persist` middleware with `AsyncStorage` for modelName and baseUrl only (not apiKey). This is low-risk to add in 05-01.

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Jest 29.7 + jest-expo ~55.0.10 |
| Config file | `package.json` (`jest` key, preset: `jest-expo`) |
| Quick run command | `jest --testPathPattern=settingsStore` |
| Full suite command | `jest` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| SETT-02 | saveApiKey calls SecureStore.setItemAsync and updates state | unit | `jest --testPathPattern=settingsStore` | ❌ Wave 0 |
| SETT-02 | loadFromSecureStore hydrates apiKey from SecureStore | unit | `jest --testPathPattern=settingsStore` | ❌ Wave 0 |
| SETT-03 | setModelName updates state; default is 'MiniMax-M2.5' | unit | `jest --testPathPattern=settingsStore` | ❌ Wave 0 |
| SETT-04 | apiKey never written to SQLite — only to SecureStore | unit (integration: verify no db write path exists) | `jest --testPathPattern=settingsStore` | ❌ Wave 0 |
| SETT-02 | deleteApiKey clears state and calls SecureStore.deleteItemAsync | unit | `jest --testPathPattern=settingsStore` | ❌ Wave 0 |
| SETT-01 | HamburgerDrawer renders and responds to open/close (smoke) | manual only | — | manual — gesture library |

### Sampling Rate
- **Per task commit:** `jest --testPathPattern=settingsStore`
- **Per wave merge:** `jest`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `src/__tests__/settingsStore.test.ts` — covers SETT-02, SETT-03, SETT-04 (mock `expo-secure-store`)
- [ ] Add `expo-secure-store` to `jest transformIgnorePatterns` if module resolution errors appear (follow existing pattern for expo modules in package.json `jest` config)

---

## Sources

### Primary (HIGH confidence)
- Expo official docs (https://docs.expo.dev/versions/v55.0.0/sdk/securestore/) — full API reference, install command, platform behaviour
- react-native-gesture-handler official docs (https://docs.swmansion.com/react-native-gesture-handler/docs/components/reanimated-drawer-layout/) — ReanimatedDrawerLayout props, ref methods, usage
- Zustand GitHub discussion #2196 (https://github.com/pmndrs/zustand/discussions/2196) — custom storage adapter pattern (used to confirm direct SecureStore approach is idiomatic)
- Project codebase: existing settingsStore.ts, TimeframeSelector.tsx, watchlistStore.ts, _layout.tsx

### Secondary (MEDIUM confidence)
- MiniMax platform docs (https://platform.minimax.io/docs/api-reference/text-openai-api) — confirmed no `/models` endpoint; chat completions endpoint format
- npm expo-secure-store v55.0.9 release — version compatibility with Expo SDK 55 confirmed

### Tertiary (LOW confidence)
- Multiple WebSearch results re: toast libraries — informed the "no new library" recommendation; not authoritative on its own

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — expo-secure-store is the project-mandated choice (STATE.md line: "MiniMax API key stored only in expo-secure-store, never in source or SQLite"); ReanimatedDrawerLayout is in an already-installed package
- Architecture: HIGH — patterns directly derived from existing project code (watchlistStore, TimeframeSelector, _layout.tsx hydration)
- Pitfalls: MEDIUM — secureTextEntry cursor issue and drawer/PagerView gesture conflict are known RN issues; MiniMax /models absence confirmed via docs

**Research date:** 2026-03-21
**Valid until:** 2026-06-21 (stable APIs; re-check if Expo SDK version bumps)
