/**
 * Task 2 — Unified Physics-Based Transition Clock (Master Progress).
 *
 * Progress KHÔNG chạy bằng withTiming (tuyến tính).
 * Physics: withSpring — Cân bằng tới hạn (Critically Damped).
 * Velocity Injection: Sẽ được bổ sung khi có thể lấy velocity từ gesture.
 *
 * SharedValues chạy trên UI thread — Steel Curtain (Task 4) sẽ dùng isTransitioning.
 */
import React, { createContext, useCallback, useContext, useMemo, useRef } from 'react'
import { InteractionManager } from 'react-native'
import { runOnJS, runOnUI } from 'react-native-reanimated'
import type { SharedValue } from 'react-native-reanimated'
import { useSharedValue, withSpring } from 'react-native-reanimated'

import {
  REANIMATED_PARALLAX_SPRING,
} from './interactive-transition'
import { useGhostMount } from './ghost-mount-provider'
import { setTransitionQueueing } from './transition-task-queue'
import { ParallaxDriverProvider } from '@/lib/transitions/reanimated-parallax-driver'

export type MasterTransitionContextValue = {
  /** Progress 0→1 (push) hoặc 1→0 (pop). Physics-based, không timing. */
  transitionProgress: SharedValue<number>
  /** true trong suốt animation. Task 4: Queue side effects khi true. */
  isTransitioning: SharedValue<boolean>
  /** Listeners để merge vào screenOptions của Stack. */
  screenListeners: {
    transitionStart: (e: { data: { closing: boolean } }) => void
    transitionEnd: (e: { data: { closing: boolean } }) => void
  }
}

const MasterTransitionContext = createContext<MasterTransitionContextValue | null>(
  null,
)

const SPRING_CONFIG = REANIMATED_PARALLAX_SPRING

export function MasterTransitionProvider({ children }: { children: React.ReactNode }) {
  const transitionProgress = useSharedValue(0)
  const isTransitioning = useSharedValue(false)
  const { clearPreload } = useGhostMount()
  const interactionHandleRef = useRef<ReturnType<typeof InteractionManager.createInteractionHandle> | null>(null)

  const onPhysicsSettled = useCallback(() => {}, [])

  const onTransitionStart = useCallback(
    (e: { data: { closing: boolean } }) => {
      // Clear stale handle from previous transition (edge case: rapid nav)
      if (interactionHandleRef.current != null) {
        InteractionManager.clearInteractionHandle(interactionHandleRef.current)
        interactionHandleRef.current = null
      }
      interactionHandleRef.current = InteractionManager.createInteractionHandle()
      setTransitionQueueing(true)
      const closing = e.data.closing
      runOnUI(() => {
        'worklet'
        isTransitioning.value = true
        const start = closing ? 1 : 0
        const target = closing ? 0 : 1
        transitionProgress.value = start
        transitionProgress.value = withSpring(
          target,
          SPRING_CONFIG,
          (finished) => {
            'worklet'
            if (finished) {
              runOnJS(onPhysicsSettled)()
            }
          },
        )
      })()
    },
    [isTransitioning, transitionProgress, onPhysicsSettled],
  )

  const onTransitionEnd = useCallback(
    (e: { data: { closing: boolean } }) => {
      if (interactionHandleRef.current != null) {
        InteractionManager.clearInteractionHandle(interactionHandleRef.current)
        interactionHandleRef.current = null
      }
      const closing = e.data.closing
      runOnUI(() => {
        'worklet'
        isTransitioning.value = false
        transitionProgress.value = closing ? 0 : 1
      })()
      setTransitionQueueing(false)
      clearPreload()
    },
    [clearPreload, isTransitioning, transitionProgress],
  )

  const screenListeners = useMemo(
    () => ({
      transitionStart: onTransitionStart,
      transitionEnd: onTransitionEnd,
    }),
    [onTransitionStart, onTransitionEnd],
  )

  const value = useMemo<MasterTransitionContextValue>(
    () => ({
      transitionProgress,
      isTransitioning,
      screenListeners,
    }),
    [transitionProgress, isTransitioning, screenListeners],
  )

  return (
    <MasterTransitionContext.Provider value={value}>
      <ParallaxDriverProvider progress={transitionProgress}>
        {children}
      </ParallaxDriverProvider>
    </MasterTransitionContext.Provider>
  )
}

export function useMasterTransition(): MasterTransitionContextValue {
  const ctx = useContext(MasterTransitionContext)
  if (!ctx) {
    throw new Error(
      'useMasterTransition must be used within MasterTransitionProvider',
    )
  }
  return ctx
}

export function useMasterTransitionOptional(): MasterTransitionContextValue | null {
  return useContext(MasterTransitionContext)
}
