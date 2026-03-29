/**
 * Task 3 — Ghost Mount Strategy (Predictive Navigation).
 *
 * Khi user PressIn: Pre-render Skeleton/Minimal Shell trong View ẩn.
 * Khi router.push: Màn đích đã warm trong bộ nhớ → giảm drop frame.
 */
import React, { createContext, useCallback, useContext, useMemo, useState } from 'react'
import { StyleSheet, useColorScheme, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { CartTransitionShell } from '@/components/cart'
import { MenuItemSkeletonShell } from '@/components/skeletons'

export type GhostRouteKey = 'menu-item' | 'menu-cart' | 'news' | null

type GhostMountContextValue = {
  preload: (route: GhostRouteKey, params?: Record<string, string>) => void
  clearPreload: () => void
}

const GhostMountContext = createContext<GhostMountContextValue | null>(null)

/**
 * Ghost preload thường giúp perceived latency nhưng tạo thêm JS work tại press-in.
 * Mặc định tắt để ưu tiên CPU/JS-thread benchmark; chỉ bật khi cần A/B.
 */
function isGhostPreloadEnabled(): boolean {
  const g = globalThis as { __ENABLE_GHOST_PRELOAD?: boolean } | undefined
  return !!g?.__ENABLE_GHOST_PRELOAD
}

/** Shell cho ghost mount Cart — onBack no-op vì render ẩn */
function CartGhostShell() {
  const isDark = useColorScheme() === 'dark'
  const insets = useSafeAreaInsets()
  return (
    <CartTransitionShell
      onBack={() => {}}
      isDark={isDark}
      insets={{ top: insets.top, bottom: insets.bottom }}
    />
  )
}

const ROUTE_SKELETONS: Record<Exclude<GhostRouteKey, null>, React.ComponentType> = {
  'menu-item': MenuItemSkeletonShell,
  'menu-cart': CartGhostShell,
  news: MenuItemSkeletonShell, // TODO: NewsSkeletonShell khi có
}

export function GhostMountProvider({ children }: { children: React.ReactNode }) {
  const [ghostRoute, setGhostRoute] = useState<GhostRouteKey>(null)

  const preload = useCallback(
    (route: GhostRouteKey, _params?: Record<string, string>) => {
      if (!route) return
      if (!isGhostPreloadEnabled()) return
      setGhostRoute(route)
    },
    [],
  )

  const clearPreload = useCallback(() => {
    setGhostRoute(null)
  }, [])

  const value = useMemo(
    () => ({ preload, clearPreload }),
    [preload, clearPreload],
  )

  const ShellComponent = ghostRoute ? ROUTE_SKELETONS[ghostRoute] : null

  return (
    <GhostMountContext.Provider value={value}>
      {children}
      {ShellComponent && (
        <View
          style={styles.ghost}
          pointerEvents="none"
          collapsable={false}
          removeClippedSubviews
        >
          <ShellComponent />
        </View>
      )}
    </GhostMountContext.Provider>
  )
}

const styles = StyleSheet.create({
  ghost: {
    position: 'absolute',
    width: 1,
    height: 1,
    overflow: 'hidden',
    opacity: 0,
    zIndex: -1,
  },
})

export function useGhostMount(): GhostMountContextValue {
  const ctx = useContext(GhostMountContext)
  if (!ctx) {
    return {
      preload: () => {},
      clearPreload: () => {},
    }
  }
  return ctx
}
