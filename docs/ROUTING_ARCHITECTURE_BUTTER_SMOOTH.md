# Robust Routing Architecture — Butter-Smooth 60fps

Technical stack: **@react-navigation/native-stack**, **react-native-screens**, **react-native-reanimated (v3+)**.

---

## 1. Standard Native Stack Navigator Setup

### 1.1 Bootstrap (run before any navigator)

**File: `lib/navigation-setup.ts`**

- Call `enableScreens(true)` and `enableFreeze(true)` from `react-native-screens` at app startup.
- Import this file once in the root layout (e.g. `app/_layout.tsx`) so it runs before the first render.

```ts
// lib/navigation-setup.ts
import { enableFreeze, enableScreens } from 'react-native-screens'

enableScreens(true)   // Use native stack implementation
enableFreeze(true)    // Freeze inactive screens → fewer re-renders, smoother animations

export { enableFreeze, enableScreens }
```

### 1.2 Root layout

- Use **Native Stack** for the root navigator (with Expo Router this is already `createNativeStackNavigator` under the hood).
- Apply shared `screenOptions` so every push/pop uses native transitions and stays within the frame budget.

**File: `app/_layout.tsx` (conceptual)**

```tsx
import '@/lib/navigation-setup'  // Side-effect first
import { Stack } from 'expo-router'
import { stackScreenOptions } from '@/constants/navigation.config'

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <Stack screenOptions={stackScreenOptions} />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  )
}
```

### 1.3 Central screen options

**File: `constants/navigation.config.ts`**

- Define `stackScreenOptions` with:
  - `animation: 'slide_from_right'`, `animationDuration: 280`
  - `gestureEnabled`, `fullScreenGestureEnabled`, `animationMatchesGesture`
  - `freezeOnBlur: true`
  - `presentation: 'card'` (or `'modal'` where needed)

This gives you a **standard Native Stack setup**: native thread drives the transition, so 60fps (or 120fps on capable devices) is achievable without blocking the JS thread.

---

## 2. useScreenTransition — Loading state during transitions

Use **InteractionManager** to know when the native transition and pending interactions have finished, then run heavy work (e.g. data fetch) and/or flip a “transition complete” flag so the screen can switch from skeleton to content.

**File: `hooks/use-screen-transition.ts`**

- `isTransitionComplete`: becomes `true` after `InteractionManager.runAfterInteractions` runs.
- `onTransitionComplete`: optional callback passed to the hook; called once when the transition completes (use to set `allowFetch` or enable queries).
- `runAfterTransition(fn)`: run a callback after the transition (and other interactions) finish; useful for one-off or dynamic “run after” work.

**Usage pattern:**

- While `!isTransitionComplete`, render a **lightweight shell/skeleton** (no store, no queries).
- When `isTransitionComplete` is true, render the real content. Use `onTransitionComplete` to enable data fetch (e.g. `useScreenTransition({ onTransitionComplete: () => setAllowFetch(true) })`) or use `runAfterTransition` for ad-hoc callbacks.
- This keeps the **first frame cheap** and defers heavy work until after the animation — the core of “butter smooth” navigation.

---

## 3. Shared Element Transition + Reanimated with Native Stack

### 3.1 Constraint

**Native Stack** owns the screen transition (native driver). It does **not** provide built-in shared element transitions between two routes. So “shared element” here means: **recreate the effect** without replacing the native transition.

### 3.2 Recommended strategy: Reanimated after transition (UI thread unblocked)

- Keep the **Native Stack transition as-is** (slide_from_right, etc.).
- On the **destination screen**, use **Reanimated** only for:
  - **Layout/entering animations** (e.g. FadeIn, SlideInRight) that run **after** the screen has mounted.
- Run Reanimated animations **after** `InteractionManager.runAfterInteractions` (or after `useScreenTransition`’s `isTransitionComplete`), so:
  - The native transition runs at 60fps without JS work.
  - Reanimated then animates content in on the **destination** screen (e.g. hero image scale/fade, list item stagger) without blocking the push animation.

This is the **strategy to keep the UI thread unblocked**: native transition first, then Reanimated for “shared-element-like” or entrance effects on the new screen.

### 3.3 Helper: DeferredReanimatedEntering

- **File: `components/navigation/deferred-reanimated-entering.tsx`**
- Wraps content in Reanimated’s layout `entering` animation. **Mount this only after the transition is complete** (e.g. when `useScreenTransition().isTransitionComplete` is true) so the native stack runs first; then Reanimated runs the entrance (e.g. `FadeIn`, `SlideInRight`) on the destination without blocking the push.
- Example: show skeleton until `isTransitionComplete`, then render `<DeferredReanimatedEntering entering={FadeIn.duration(200)}><HeroImage /></DeferredReanimatedEntering>` so the hero animates in on the UI thread after the transition.

### 3.4 What to avoid

- Do **not** drive the **full screen** push/pop with Reanimated (e.g. custom stack transition in JS). That would compete with Native Stack and can cause jank or gesture conflicts.
- Use Reanimated for **in-screen** effects (shared-element-like entrance, list animations, modals) that start **after** the native transition.

---

## 4. Memoizing screen components (prevent re-renders during navigation)

### 4.1 Why memoize

- Parent navigator or context can re-render (e.g. theme, pathname). Without memo, every screen re-renders when the parent re-renders.
- Wrapping screens with **React.memo** avoids unnecessary re-renders when **props are unchanged**, so navigation (e.g. switching tabs, pushing a new screen) doesn’t cause unrelated screens to re-render and keeps the UI thread free for 60fps.

### 4.2 How to memoize

- Export the screen as **React.memo(ScreenComponent)** or use the **`memoScreen`** helper from `lib/memo-screen.tsx` for a consistent pattern and displayName.
- Prefer **named function + displayName** for debugging:

```tsx
import { memoScreen } from '@/lib/memo-screen'

function ProductDetailScreen() {
  // ...
}
ProductDetailScreen.displayName = 'ProductDetailScreen'
export default memoScreen(ProductDetailScreen)
```

Or without the helper:

```tsx
function ProductDetailScreen() { ... }
ProductDetailScreen.displayName = 'ProductDetailScreen'
export default React.memo(ProductDetailScreen)
```

### 4.3 Keep props stable

- **Navigation params**: Avoid passing **new object/array/function** on every render from the parent (e.g. `options={{ headerRight: () => <Button /> }}` is fine if the component is stable; avoid `options={{ params: { x: [] } }}` if `x` is recreated each time). Prefer route params or context for dynamic data.
- **Screen options**: Prefer `screenOptions` that return stable references or use `useCallback`/`useMemo` where options are built in the layout.

### 4.4 Optional custom comparison

- If a screen receives **complex props** (e.g. from a wrapper), you can pass a custom comparison as the second argument to `React.memo(Component, (prev, next) => /* true if equal */)` so that re-renders only happen when the props that matter for that screen have changed.

Using **React.memo** on screens, together with **Native Stack**, **react-native-screens**, and **deferred work via useScreenTransition**, gives you a robust, large-scale routing architecture focused on butter-smooth 60fps animations.
