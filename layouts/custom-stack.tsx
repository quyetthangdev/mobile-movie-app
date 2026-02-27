/**
 * Phase 7 — Velocity-Driven Interactive Stack.
 * Uses @react-navigation/stack with gesture-driven transition.
 */
import type { ParamListBase } from '@react-navigation/native'
import {
  createStackNavigator,
  type StackNavigationEventMap,
  type StackNavigationOptions,
} from '@react-navigation/stack'
import { withLayoutContext } from 'expo-router'

import {
  CLOSE_SPEC,
  GESTURE_RESPONSE_DISTANCE,
  OPEN_SPEC,
} from '@/lib/navigation/interactive-transition'
import { forVelocityDrivenHorizontal } from '@/lib/transitions/velocity-driven-transition'

const { Navigator } = createStackNavigator()

export const CustomStack = withLayoutContext<
  StackNavigationOptions,
  typeof Navigator,
  import('@react-navigation/native').StackNavigationState<ParamListBase>,
  StackNavigationEventMap
>(Navigator)

/** Screen options for velocity-driven transition (Phase 7.5: gestureVelocityImpact) */
export const velocityDrivenScreenOptions: StackNavigationOptions = {
  headerShown: false,
  gestureEnabled: true,
  gestureDirection: 'horizontal',
  gestureResponseDistance: GESTURE_RESPONSE_DISTANCE,
  /** Velocity projection: projected = progress + velocityX * factor → threshold 0.45 */
  gestureVelocityImpact: 0.55,
  cardStyleInterpolator: forVelocityDrivenHorizontal,
  transitionSpec: {
    open: OPEN_SPEC,
    close: CLOSE_SPEC,
  },
  cardStyle: { backgroundColor: '#ffffff' },
}
