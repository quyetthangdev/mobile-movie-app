/**
 * Task 3 — Ghost Mount Strategy (Predictive Navigation).
 *
 * Khi user PressIn: Pre-render Skeleton/Minimal Shell trong View ẩn.
 * Khi router.push: Màn đích đã warm trong bộ nhớ → giảm drop frame.
 */
import React, { createContext, useCallback, useContext, useMemo, useState } from 'react'
import { StyleSheet, View } from 'react-native'

import { MenuItemSkeletonShell } from '@/components/skeletons'

export type GhostRouteKey = 'menu-item' | 'news' | null

type GhostMountContextValue = {
  preload: (route: GhostRouteKey, params?: Record<string, string>) => void
  clearPreload: () => void
}

const GhostMountContext = createContext<GhostMountContextValue | null>(null)

const ROUTE_SKELETONS: Record<Exclude<GhostRouteKey, null>, React.ComponentType> = {
  'menu-item': MenuItemSkeletonShell,
  news: MenuItemSkeletonShell, // TODO: NewsSkeletonShell khi có
}

export function GhostMountProvider({ children }: { children: React.ReactNode }) {
  const [ghostRoute, setGhostRoute] = useState<GhostRouteKey>(null)

  const preload = useCallback((route: GhostRouteKey, _params?: Record<string, string>) => {
    if (!route) return
    setGhostRoute(route)
  }, [])

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
    left: -9999,
    top: 0,
    right: 9999,
    bottom: 0,
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
