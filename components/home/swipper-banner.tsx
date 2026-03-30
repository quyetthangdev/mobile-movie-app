import { Images } from '@/assets/images'
import { ROUTE, publicFileURL } from '@/constants'
import { navigateNative } from '@/lib/navigation'
import { IBanner } from '@/types'
import React, { useCallback, useEffect, useRef, useState } from 'react'
import type { ImageSourcePropType } from 'react-native'
import { Dimensions, FlatList, Linking, Pressable, View } from 'react-native'
import { Image } from 'expo-image'
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated'

import { DOT_SCALE_ACTIVE, SPRING_CONFIGS } from '@/constants'

interface SwiperBannerProps {
  /**
   * Array of banner data to display
   */
  bannerData: IBanner[]
}

/**
 * SwiperBanner Component
 * 
 * Displays a horizontal carousel of banners with autoplay.
 * Supports internal navigation and external links.
 * 
 * @example
 * ```tsx
 * <SwiperBanner bannerData={banners} />
 * ```
 */
const SwiperBanner = React.memo(function SwiperBanner({ bannerData }: SwiperBannerProps): React.ReactElement | null {
  const flatListRef = useRef<FlatList>(null)
  const screenWidth = Dimensions.get('window').width
  const screenHeight = Dimensions.get('window').height

  // State for active index (only updated on scroll end, not every frame)
  const [activeIndexState, setActiveIndexState] = useState(0)
  const activeIndexRef = useRef(0)
  activeIndexRef.current = activeIndexState

  // Helper function to extract pathname from URL
  const extractPathname = useCallback((url: string): string => {
    try {
      const urlObj = new URL(url)
      return urlObj.pathname
    } catch {
      // If not a valid URL, treat as pathname
      return url
    }
  }, [])

  // Helper function to check if pathname matches ROUTE constants
  const matchesInternalRoute = useCallback((pathname: string): boolean => {
    const routeValues = Object.values(ROUTE)
    return routeValues.some((route) => {
      return pathname === route || pathname.startsWith(route + '/')
    })
  }, [])

  // Helper function to check if it's an internal route
  const isInternalRoute = useCallback((url: string): boolean => {
    if (!url || url.trim() === '') return true

    // If not http/https, treat as internal
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      return true
    }

    try {
      const urlObj = new URL(url)
      const pathname = urlObj.pathname

      // Check if pathname matches ROUTE
      if (matchesInternalRoute(pathname)) {
        return true
      }

      // For mobile apps, external links should open in browser
      return false
    } catch {
      return true
    }
  }, [matchesInternalRoute])

  // Helper function to determine destination URL
  const getBannerLink = useCallback((banner: IBanner): string => {
    if (banner.url && banner.url.trim() !== '') {
      if (isInternalRoute(banner.url)) {
        return extractPathname(banner.url)
      }
      return banner.url
    }
    return ROUTE.CLIENT_MENU || '/'
  }, [isInternalRoute, extractPathname])


  // Auto-scroll functionality — dùng ref để tránh recreate interval mỗi khi activeIndexState đổi
  useEffect(() => {
    if (bannerData.length <= 1) return

    const interval = setInterval(() => {
      const current = activeIndexRef.current
      const next = current + 1 >= bannerData.length ? 0 : current + 1
      flatListRef.current?.scrollToIndex({ index: next, animated: true })
    }, 3000)

    return () => clearInterval(interval)
  }, [bannerData.length])

  // Handle scroll end - only update state when scroll completes (not every frame)
  const handleScrollEnd = useCallback((event: { nativeEvent: { contentOffset: { x: number } } }) => {
    const slideSize = screenWidth
    const index = Math.round(event.nativeEvent.contentOffset.x / slideSize)
    if (index >= 0 && index < bannerData.length && index !== activeIndexState) {
      setActiveIndexState(index)
    }
  }, [screenWidth, bannerData.length, activeIndexState])

  const handleBannerPress = useCallback((banner: IBanner) => {
    const linkUrl = getBannerLink(banner)
    const isInternal = isInternalRoute(banner.url || '')

    if (isInternal) {
      // Navigate internally using expo-router
      navigateNative.push(linkUrl as Parameters<typeof navigateNative.push>[0])
    } else {
      // Open external link in browser
      Linking.openURL(linkUrl).catch((err) => {
        // eslint-disable-next-line no-console
        console.error('Failed to open URL:', err)
      })
    }
  }, [getBannerLink, isInternalRoute])

  const getBannerImage = (banner: IBanner): ImageSourcePropType => {
    if (banner.image) {
      // If image is already a full URL, use it directly
      if (banner.image.startsWith('http')) {
        return { uri: banner.image }
      }
      // Otherwise, construct URL with publicFileURL
      const imageUrl = publicFileURL ? `${publicFileURL}/${banner.image}` : banner.image
      return { uri: imageUrl }
    }
    // Fallback to default image
    return Images.Landing.Desktop as ImageSourcePropType
  }

  const renderItem = useCallback(({ item: banner }: { item: IBanner; index: number }) => {
    const imageSource = getBannerImage(banner)

    return (
      <Pressable
        onPress={() => handleBannerPress(banner)}
        className="w-full"
        style={{ width: screenWidth }}
      >
        <View className="relative justify-center items-center w-full bg-black" style={{ height: screenHeight * 0.4 }}>
          {/* Background image with blur effect - subtle background only */}
          <View className="absolute top-0 left-0 w-full h-full" style={{ zIndex: 0 }}>
            <Image
              source={imageSource}
              className="w-full h-full"
              contentFit="cover"
              style={{ opacity: 0.3 }}
              blurRadius={20}
              cachePolicy="memory-disk"
              transition={0}
            />
          </View>

          {/* Main image - clear and prominent on top (expo-image: cache + memory) */}
          <View className="absolute inset-0 justify-center items-center px-4" style={{ zIndex: 10 }}>
            <Image
              source={imageSource}
              className="w-full h-full"
              contentFit="contain"
              cachePolicy="memory-disk"
              transition={0}
            />
          </View>
        </View>
      </Pressable>
    )
  }, [screenWidth, screenHeight, handleBannerPress])

  // Pagination dot component with scale animation (transform, not width)
  const PaginationDot = React.memo(function PaginationDot({
    isActive,
  }: {
    isActive: boolean
  }) {
    const scale = useSharedValue(isActive ? DOT_SCALE_ACTIVE : 1)

    useEffect(() => {
      scale.value = withSpring(isActive ? DOT_SCALE_ACTIVE : 1, SPRING_CONFIGS.dot)
    }, [isActive, scale])

    const animatedStyle = useAnimatedStyle(() => {
      'worklet'
      return {
        transform: [{ scale: scale.value }],
      }
    })

    return (
      <Animated.View
        style={animatedStyle}
        className={`h-2 w-2 rounded-full ${
          isActive ? 'bg-white' : 'bg-white/50'
        }`}
      />
    )
  })

  const renderPagination = (): React.ReactElement | null => {
    if (bannerData.length <= 1) return null

    return (
      <View className="absolute bottom-4 left-0 right-0 flex-row justify-center items-center space-x-2">
        {bannerData.map((_, index) => (
          <PaginationDot
            key={index}
            isActive={index === activeIndexState}
          />
        ))}
      </View>
    )
  }

  if (!bannerData || bannerData.length === 0) {
    return null
  }

  return (
    <View className="relative w-full">
      <FlatList
        ref={flatListRef}
        data={bannerData}
        renderItem={renderItem}
        keyExtractor={(item, index) => item.slug || index.toString()}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleScrollEnd}
        getItemLayout={(data, index) => ({
          length: screenWidth,
          offset: screenWidth * index,
          index,
        })}
        onScrollToIndexFailed={(info) => {
          const wait = new Promise((resolve) => setTimeout(resolve, 500))
          wait.then(() => {
            flatListRef.current?.scrollToIndex({ index: info.index, animated: true })
          })
        }}
        // Performance optimizations for POS/Kiosk
        removeClippedSubviews={true}
        initialNumToRender={3}
        maxToRenderPerBatch={2}
        windowSize={3}
        updateCellsBatchingPeriod={50}
      />
      {renderPagination()}
    </View>
  )
})

export default SwiperBanner
