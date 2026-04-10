import { Image } from 'expo-image'
import { Linking, Pressable, StyleSheet, View } from 'react-native'
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Dimensions, FlatList } from 'react-native'
import Animated, {
  useAnimatedStyle,
  useDerivedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated'

import { Images } from '@/assets/images'
import { ROUTE, publicFileURL } from '@/constants'
import { navigateNative } from '@/lib/navigation'
import type { IBanner } from '@/types'
import type { ImageSourcePropType } from 'react-native'

// ─── Constants ────────────────────────────────────────────────────────────────

const AUTO_SCROLL_INTERVAL = 3500
// ROUTE is a compile-time constant — no need to recompute per render
const ROUTE_VALUES = Object.values(ROUTE)
const DOT_SIZE = 7
const DOT_ACTIVE_WIDTH = 20
const DOT_GAP = 5
// Module-scope spring config — no per-worklet allocation
const DOT_WIDTH_SPRING = { damping: 15, stiffness: 220 } as const
const DOT_OPACITY_TIMING = { duration: 180 } as const

// ─── Dot indicator ───────────────────────────────────────────────────────────

const BannerDot = React.memo(function BannerDot({ isActive }: { isActive: boolean }) {
  // Drive width + opacity directly on UI thread — no useEffect / JS-thread hop.
  // useDerivedValue re-runs on UI thread whenever isActive changes (via prop update).
  const width = useDerivedValue(() =>
    withSpring(isActive ? DOT_ACTIVE_WIDTH : DOT_SIZE, DOT_WIDTH_SPRING),
  )
  const opacity = useDerivedValue(() =>
    withTiming(isActive ? 1 : 0.45, DOT_OPACITY_TIMING),
  )

  const style = useAnimatedStyle(() => ({
    width: width.value,
    height: DOT_SIZE,
    borderRadius: DOT_SIZE / 2,
    backgroundColor: '#fff',
    opacity: opacity.value,
  }))

  return <Animated.View style={style} />
})

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getBannerImage(banner: IBanner): ImageSourcePropType {
  if (banner.image) {
    if (banner.image.startsWith('http')) return { uri: banner.image }
    const url = publicFileURL ? `${publicFileURL}/${banner.image}` : banner.image
    return { uri: url }
  }
  return Images.Landing.Desktop
}

function extractPathname(url: string): string {
  try { return new URL(url).pathname } catch { return url }
}

function isInternalRoute(url: string, routeValues: string[]): boolean {
  if (!url?.trim()) return true
  if (!url.startsWith('http://') && !url.startsWith('https://')) return true
  try {
    const pathname = new URL(url).pathname
    return routeValues.some((r) => pathname === r || pathname.startsWith(r + '/'))
  } catch { return true }
}

// ─── Component ───────────────────────────────────────────────────────────────

interface SwiperBannerProps {
  bannerData: IBanner[]
  height?: number
}

const SwiperBanner = React.memo(function SwiperBanner({
  bannerData,
  height: heightProp,
}: SwiperBannerProps): React.ReactElement | null {
  const flatListRef = useRef<FlatList>(null)
  const screenWidth = Dimensions.get('window').width
  const screenHeight = Dimensions.get('window').height
  const bannerHeight = heightProp ?? screenHeight * 0.4

  const count = bannerData.length

  /**
   * Infinite scroll — clone last item at front, first item at back:
   *   [last, item0, item1, ..., itemN, first]
   * Real items occupy indices 1..count in this array.
   * Start at index 1 (first real item).
   */
  const infiniteData = useMemo(() => {
    if (count <= 1) return bannerData
    return [bannerData[count - 1], ...bannerData, bannerData[0]]
  }, [bannerData, count])

  // Real active index (0..count-1) — used for dots
  const [activeIndex, setActiveIndex] = useState(0)
  const activeIndexRef = useRef(0)
  // Current position in infiniteData (1..count) — used for auto-scroll
  const infiniteIndexRef = useRef(1)

  // Scroll to index 1 on mount (skip the cloned-last at position 0)
  useEffect(() => {
    if (count <= 1) return
    requestAnimationFrame(() => {
      flatListRef.current?.scrollToIndex({ index: 1, animated: false })
    })
  }, [count])

  // Auto-scroll forward, teleport handled by handleScrollEnd
  useEffect(() => {
    if (count <= 1) return
    const interval = setInterval(() => {
      const next = infiniteIndexRef.current + 1
      flatListRef.current?.scrollToIndex({ index: next, animated: true })
    }, AUTO_SCROLL_INTERVAL)
    return () => clearInterval(interval)
  }, [count])

  const handleScrollEnd = useCallback(
    (e: { nativeEvent: { contentOffset: { x: number } } }) => {
      if (count <= 1) return
      const rawIndex = Math.round(e.nativeEvent.contentOffset.x / screenWidth)

      // Teleport: cloned-last (index 0) → real last (index count)
      if (rawIndex === 0) {
        flatListRef.current?.scrollToIndex({ index: count, animated: false })
        infiniteIndexRef.current = count
        activeIndexRef.current = count - 1
        setActiveIndex(count - 1)
        return
      }
      // Teleport: cloned-first (index count+1) → real first (index 1)
      if (rawIndex === count + 1) {
        flatListRef.current?.scrollToIndex({ index: 1, animated: false })
        infiniteIndexRef.current = 1
        activeIndexRef.current = 0
        setActiveIndex(0)
        return
      }

      const realIndex = rawIndex - 1
      infiniteIndexRef.current = rawIndex
      activeIndexRef.current = realIndex
      setActiveIndex(realIndex)
    },
    [screenWidth, count],
  )

  const handleBannerPress = useCallback(
    (banner: IBanner) => {
      const url = banner.url?.trim()
      if (!url) return
      const internal = isInternalRoute(url, ROUTE_VALUES)
      const dest = internal ? extractPathname(url) : url
      if (internal) {
        navigateNative.push(dest as Parameters<typeof navigateNative.push>[0])
      } else {
        Linking.openURL(dest).catch(() => {})
      }
    },
    [],
  )

  const renderItem = useCallback(
    ({ item: banner }: { item: IBanner }) => {
      const source = getBannerImage(banner)
      return (
        <Pressable
          onPress={() => handleBannerPress(banner)}
          style={{ width: screenWidth, height: bannerHeight, overflow: 'hidden' }}
        >
          {/* Blurred background — fills the entire frame for any aspect ratio */}
          <Image
            source={source}
            style={StyleSheet.absoluteFill}
            contentFit="cover"
            blurRadius={22}
            cachePolicy="memory-disk"
          />
          {/* Dim overlay để chữ/dot dễ đọc và bg không quá sáng */}
          <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.28)' }]} />
          {/* Main image — contain để không bị crop dù ngang/vuông/đứng */}
          <Image
            source={source}
            style={{ width: screenWidth, height: bannerHeight }}
            contentFit="contain"
            cachePolicy="memory-disk"
            transition={300}
          />
        </Pressable>
      )
    },
    [screenWidth, bannerHeight, handleBannerPress],
  )

  const keyExtractor = useCallback(
    (_: IBanner, index: number) => index.toString(),
    [],
  )

  const getItemLayout = useCallback(
    (_: unknown, index: number) => ({
      length: screenWidth,
      offset: screenWidth * index,
      index,
    }),
    [screenWidth],
  )

  if (!count) return null

  return (
    <View style={{ width: '100%' }}>
      <FlatList
        ref={flatListRef}
        data={infiniteData}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleScrollEnd}
        getItemLayout={getItemLayout}
        onScrollToIndexFailed={() => {}}
        removeClippedSubviews
        initialNumToRender={3}
        maxToRenderPerBatch={2}
        windowSize={3}
      />

      {/* Dot indicators — only when >1 banner */}
      {count > 1 && (
        <View
          style={{
            position: 'absolute',
            bottom: 14,
            left: 0,
            right: 0,
            flexDirection: 'row',
            justifyContent: 'center',
            alignItems: 'center',
            gap: DOT_GAP,
          }}
        >
          {bannerData.map((_, i) => (
            <BannerDot key={i} isActive={i === activeIndex} />
          ))}
        </View>
      )}
    </View>
  )
})

export default SwiperBanner
