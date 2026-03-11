/**
 * GlobalLoadingOverlay — Logo + vòng xoay, nền trắng, không che bottom bar.
 * Hiện trong lúc transition + một chút sau để bù khoảng delay skeleton.
 */
import React from 'react'
import {
  ActivityIndicator,
  Image,
  StyleSheet,
  View,
  useColorScheme,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { Images } from '@/assets/images'

interface GlobalLoadingOverlayProps {
  visible: boolean
}

// const BOTTOM_BAR_HEIGHT = 120

export function GlobalLoadingOverlay({ visible }: GlobalLoadingOverlayProps) {
  const isDark = useColorScheme() === 'dark'
  useSafeAreaInsets() // giữ hook để tránh breaking, nhưng overlay giờ full-screen

  if (!visible) return null

  return (
    <View
      style={[
        styles.overlay,
        {
          backgroundColor: '#ffffff',
          bottom: 0, // Full-screen overlay, không còn hở phần xám bên dưới
        },
      ]}
    >
      <View style={styles.content}>
        <Image
          source={Images.Brand.Logo as unknown as number}
          style={styles.logo}
          resizeMode="contain"
        />
        <ActivityIndicator
          size="large"
          color={isDark ? '#F7A737' : '#e50914'}
          style={styles.spinner}
        />
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999,
  },
  content: {
    alignItems: 'center',
  },
  logo: {
    height: 48,
    width: 168,
  },
  spinner: {
    marginTop: 24,
  },
})
