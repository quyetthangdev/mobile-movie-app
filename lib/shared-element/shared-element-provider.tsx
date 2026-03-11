/**
 * SharedElementProvider — Portal overlay cho shared element transition.
 *
 * Render 1 Animated.View clone (expo-image) tại vị trí source, animate sang dest.
 * Toàn bộ interpolation chạy trong worklet (UI thread).
 *
 * Flow: measure source → show overlay → navigate → measure dest → animate → crossfade
 */
import React, { createContext, useContext, useState } from 'react'
import { StyleSheet } from 'react-native'
import { Image } from 'expo-image'
import Animated, {
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  type SharedValue,
} from 'react-native-reanimated'

export type ElementRect = {
  x: number
  y: number
  w: number
  h: number
}

const ZERO_RECT: ElementRect = { x: 0, y: 0, w: 0, h: 0 }

/**
 * Spring physics cho shared element fly animation.
 * stiffness 150 + damping 20 + mass 1 → bounce nhẹ khi "đáp cánh".
 */
const SHARED_SPRING = {
  stiffness: 150,
  damping: 20,
  mass: 1,
  overshootClamping: false,
  restDisplacementThreshold: 0.01,
  restSpeedThreshold: 0.01,
} as const

export type SharedElementContextValue = {
  triggerTransition: (source: ElementRect, imageUri: string) => void
  setDestRect: (dest: ElementRect) => void
  completeTransition: () => void
  reverseTransition: () => void
  isActive: SharedValue<boolean>
  animationProgress: SharedValue<number>
  sourceImageUri: SharedValue<string>
  /** JS-safe mirror of isActive — đọc được trong render mà không trigger Reanimated warning */
  jsIsActive: boolean
  /** JS-safe mirror of sourceImageUri — đọc được trong render */
  jsSourceImageUri: string
}

const SharedElementContext = createContext<SharedElementContextValue | null>(null)

/**
 * Hook tạo SharedValues + API mutations trong cùng scope.
 * Tất cả .value mutations xảy ra bên trong hook nơi values được tạo
 * → thoả mãn react-hooks/rules-of-hooks v7 (React Compiler).
 */
function useSharedElementApi(setDisplayUri: (uri: string) => void) {
  const isActive = useSharedValue(false)
  const animationProgress = useSharedValue(0)
  const sourceRect = useSharedValue<ElementRect>(ZERO_RECT)
  const destRect = useSharedValue<ElementRect>(ZERO_RECT)
  const sourceImageUri = useSharedValue('')
  const overlayVisible = useSharedValue(false)

  const [jsIsActive, setJsIsActive] = useState(false)
  const [jsSourceImageUri, setJsSourceImageUri] = useState('')

  const hideOverlay = () => {
    overlayVisible.value = false
    setJsIsActive(false)
  }

  const triggerTransition = (source: ElementRect, imageUri: string) => {
    sourceRect.value = source
    sourceImageUri.value = imageUri
    setJsSourceImageUri(imageUri)
    setDisplayUri(imageUri)
    animationProgress.value = 0
    isActive.value = true
    setJsIsActive(true)
    overlayVisible.value = true
  }

  const setDest = (dest: ElementRect) => {
    destRect.value = dest
    animationProgress.value = withSpring(1, SHARED_SPRING)
  }

  const completeTransition = () => {
    animationProgress.value = withSpring(1, SHARED_SPRING, (finished) => {
      'worklet'
      if (finished) {
        isActive.value = false
        runOnJS(hideOverlay)()
      }
    })
  }

  const reverseTransition = () => {
    overlayVisible.value = true
    isActive.value = true
    animationProgress.value = withSpring(0, SHARED_SPRING, (finished) => {
      'worklet'
      if (finished) {
        isActive.value = false
        runOnJS(hideOverlay)()
      }
    })
  }

  const overlayStyle = useAnimatedStyle(() => {
    'worklet'
    if (!overlayVisible.value) {
      return { opacity: 0, width: 0, height: 0 }
    }

    const p = animationProgress.value
    const src = sourceRect.value
    const dst = destRect.value
    const hasDest = dst.w > 0 && dst.h > 0

    const x = hasDest ? interpolate(p, [0, 1], [src.x, dst.x]) : src.x
    const y = hasDest ? interpolate(p, [0, 1], [src.y, dst.y]) : src.y
    const w = hasDest ? interpolate(p, [0, 1], [src.w, dst.w]) : src.w
    const h = hasDest ? interpolate(p, [0, 1], [src.h, dst.h]) : src.h
    const borderRadius = hasDest ? interpolate(p, [0, 1], [12, 8]) : 12

    return {
      position: 'absolute' as const,
      left: x,
      top: y,
      width: w,
      height: h,
      borderRadius,
      opacity: 1,
      overflow: 'hidden' as const,
    }
  })

  return {
    api: {
      triggerTransition,
      setDestRect: setDest,
      completeTransition,
      reverseTransition,
      isActive,
      animationProgress,
      sourceImageUri,
      jsIsActive,
      jsSourceImageUri,
    } satisfies SharedElementContextValue,
    overlayStyle,
  }
}

export function SharedElementProvider({ children }: { children: React.ReactNode }) {
  const [displayUri, setDisplayUri] = React.useState('')
  const { api, overlayStyle } = useSharedElementApi(setDisplayUri)

  return (
    <SharedElementContext.Provider value={api}>
      {children}
      <Animated.View
        style={[styles.overlayContainer, overlayStyle]}
        pointerEvents="none"
      >
        {displayUri ? (
          <Image
            source={{ uri: displayUri }}
            style={styles.imageFill}
            contentFit="cover"
            cachePolicy="memory-disk"
          />
        ) : null}
      </Animated.View>
    </SharedElementContext.Provider>
  )
}

export function useSharedElement(): SharedElementContextValue {
  const ctx = useContext(SharedElementContext)
  if (!ctx) {
    throw new Error('useSharedElement must be used within SharedElementProvider')
  }
  return ctx
}

export function useSharedElementOptional(): SharedElementContextValue | null {
  return useContext(SharedElementContext)
}

const styles = StyleSheet.create({
  overlayContainer: {
    position: 'absolute',
    zIndex: 9998,
    elevation: 9998,
  },
  imageFill: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
})
