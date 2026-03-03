/**
 * NativeNavigationTouchable — Phase 3: Native-first navigation trigger.
 *
 * Touch được xử lý trên native thread → onPress event → executeNavFromGesture.
 * Không qua runOnJS gate → giảm start latency khi JS bận.
 *
 * Dùng thay NativeGesturePressable khi cần Telegram-level responsiveness.
 * @see docs/NAVIGATION_UI_THREAD_ARCHITECTURE.md
 */
import React from 'react'
import type { StyleProp, ViewStyle } from 'react-native'
import { View } from 'react-native'

import type { HrefLike } from '@/lib/navigation'
import { executeNavFromGesture } from '@/lib/navigation'
import { isLockedShared } from '@/lib/navigation/navigation-lock-shared'

import { NavigationTriggerView } from '../../modules/navigation-trigger'

export type NativeNavigationTouchableProps = {
  children: React.ReactNode
  style?: StyleProp<ViewStyle>
  navigation?:
    | { type: 'push'; href: HrefLike }
    | { type: 'replace'; href: HrefLike }
    | { type: 'back' }
  /** Chạy deferred sau nav (prefetch, preload) — không block phản hồi tap */
  onPressDeferred?: () => void
  disabled?: boolean
  className?: string
}

function serializeHref(href: HrefLike): string {
  if (typeof href === 'string') return href
  const { pathname, params } = href as { pathname?: string; params?: Record<string, string> }
  if (!pathname) return ''
  if (!params || Object.keys(params).length === 0) return pathname
  // Interpolate [param] in pathname: /menu/[slug] + { slug: 'x' } → /menu/x
  let result = pathname
  for (const [key, value] of Object.entries(params)) {
    result = result.replace(`[${key}]`, encodeURIComponent(value))
  }
  const rest = Object.fromEntries(
    Object.entries(params).filter(([k]) => !pathname.includes(`[${k}]`)),
  )
  const search = new URLSearchParams(rest).toString()
  return search ? `${result}?${search}` : result
}

export function NativeNavigationTouchable({
  children,
  style,
  navigation,
  onPressDeferred,
  disabled,
  className,
}: NativeNavigationTouchableProps) {
  const handlePress = React.useCallback(
    (event: { nativeEvent: { href: string; type: string } }) => {
      if (disabled || !navigation) return
      if (isLockedShared.value === 1) return

      const { href, type } = event.nativeEvent
      executeNavFromGesture(
        type as 'push' | 'replace' | 'back',
        type === 'back' ? undefined : href,
      )
      if (onPressDeferred) setImmediate(onPressDeferred)
    },
    [disabled, navigation, onPressDeferred],
  )

  if (!navigation || disabled) {
    return (
      <View style={style} className={className}>
        {children}
      </View>
    )
  }

  const href = navigation.type === 'back' ? '' : serializeHref(navigation.href)
  const type = navigation.type

  return (
    <NavigationTriggerView
      href={href}
      type={type}
      onPress={handlePress}
      style={style}
      className={className}
    >
      {children}
    </NavigationTriggerView>
  )
}
