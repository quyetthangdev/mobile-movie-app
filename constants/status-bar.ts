/**
 * Truly static top inset — computed once at module load from native constants.
 * NO hooks, NO re-renders, NO transitions can change this value.
 *
 * Android: `StatusBar.currentHeight` — native bridge constant.
 * iOS: `initialWindowMetrics.insets.top` — snapshot taken when SafeAreaProvider
 *       initialises (before any React render), accounts for notch / Dynamic Island.
 */
import { Platform, StatusBar } from 'react-native'
import { initialWindowMetrics } from 'react-native-safe-area-context'

/**
 * Top inset that is safe to use as paddingTop in headers.
 * Immune to `useSafeAreaInsets` re-renders and `statusBarTranslucent` toggling.
 */
export const STATIC_TOP_INSET: number =
  Platform.OS === 'android'
    ? (StatusBar.currentHeight ?? 24)
    : (initialWindowMetrics?.insets.top ?? 47)
