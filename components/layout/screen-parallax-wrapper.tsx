/**
 * Screen Parallax Wrapper — Telegram-style depth effect.
 *
 * - Incoming screen (đang trượt vào): shadow opacity 0→0.15
 * - Background screen (màn phía sau): scale 0.97→1 + translateX parallax (factor 0.3)
 *
 * Dùng transitionProgress từ MasterTransitionProvider (sync với transitionStart/End).
 * Chỉ áp dụng khi có ParallaxDriverProvider (trong stack có transition).
 */
import React from 'react'
import { useIsFocused } from '@react-navigation/native'
import { StyleSheet, View } from 'react-native'
import Animated from 'react-native-reanimated'

import { TransitionProgressSyncer } from '@/lib/navigation/transition-progress-sync'
import {
  useParallaxDriverOptional,
  useBackgroundParallaxStyle,
  useShadowOpacityStyle,
} from '@/lib/transitions'

export type ScreenParallaxWrapperProps = {
  children: React.ReactNode
}

function ScreenParallaxWrapperInner({ children }: ScreenParallaxWrapperProps) {
  const isFocused = useIsFocused()
  // Sync progress từ react-native-screens → ParallaxDriver (phải trong stack screen)
  return (
    <>
      <TransitionProgressSyncer />
      <ScreenParallaxWrapperContent isFocused={isFocused}>{children}</ScreenParallaxWrapperContent>
    </>
  )
}

function ScreenParallaxWrapperContent({
  children,
  isFocused,
}: ScreenParallaxWrapperProps & { isFocused: boolean }) {
  const backgroundStyle = useBackgroundParallaxStyle(true)
  const shadowStyle = useShadowOpacityStyle(false)
  const isTopScreen = isFocused
  return (
    <View style={styles.container}>
      {isTopScreen ? (
        <Animated.View style={[styles.fill, shadowStyle, styles.shadow]}>
          {children}
        </Animated.View>
      ) : (
        <Animated.View style={[styles.fill, backgroundStyle]}>{children}</Animated.View>
      )}
    </View>
  )
}

export function ScreenParallaxWrapper({ children }: ScreenParallaxWrapperProps) {
  const driver = useParallaxDriverOptional()

  if (!driver) {
    return <>{children}</>
  }

  return <ScreenParallaxWrapperInner>{children}</ScreenParallaxWrapperInner>
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  fill: {
    flex: 1,
  },
  shadow: {
    shadowColor: '#000',
    shadowOffset: { width: -2, height: 0 },
    shadowRadius: 8,
    elevation: 8,
  },
})
