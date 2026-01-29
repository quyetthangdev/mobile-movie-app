import { Images } from '@/assets/images'
import { ROUTE, publicFileURL } from '@/constants'
import { IBanner } from '@/types'
import { useRouter } from 'expo-router'
import React, { useEffect, useRef, useState } from 'react'
import type { ImageSourcePropType } from 'react-native'
import { Dimensions, FlatList, Image, Linking, NativeScrollEvent, NativeSyntheticEvent, Pressable, View } from 'react-native'

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
export default function SwiperBanner({ bannerData }: SwiperBannerProps): React.ReactElement | null {
  const router = useRouter()
  const flatListRef = useRef<FlatList>(null)
  const [activeIndex, setActiveIndex] = useState(0)
  const screenWidth = Dimensions.get('window').width
  const screenHeight = Dimensions.get('window').height

  // Helper function to extract pathname from URL
  const extractPathname = (url: string): string => {
    try {
      const urlObj = new URL(url)
      return urlObj.pathname
    } catch {
      // If not a valid URL, treat as pathname
      return url
    }
  }

  // Helper function to check if pathname matches ROUTE constants
  const matchesInternalRoute = (pathname: string): boolean => {
    const routeValues = Object.values(ROUTE)
    return routeValues.some((route) => {
      return pathname === route || pathname.startsWith(route + '/')
    })
  }

  // Helper function to check if it's an internal route
  const isInternalRoute = (url: string): boolean => {
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
  }

  // Helper function to determine destination URL
  const getBannerLink = (banner: IBanner): string => {
    if (banner.url && banner.url.trim() !== '') {
      if (isInternalRoute(banner.url)) {
        return extractPathname(banner.url)
      }
      return banner.url
    }
    return ROUTE.CLIENT_MENU || '/'
  }

  // Auto-scroll functionality
  useEffect(() => {
    if (bannerData.length <= 1) return

    const interval = setInterval(() => {
      setActiveIndex((prev) => {
        const next = prev + 1 >= bannerData.length ? 0 : prev + 1
        flatListRef.current?.scrollToIndex({ index: next, animated: true })
        return next
      })
    }, 3000)

    return () => clearInterval(interval)
  }, [bannerData.length])

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const slideSize = screenWidth
    const index = Math.round(event.nativeEvent.contentOffset.x / slideSize)
    setActiveIndex(index)
  }

  const handleBannerPress = (banner: IBanner) => {
    const linkUrl = getBannerLink(banner)
    const isInternal = isInternalRoute(banner.url || '')

    if (isInternal) {
      // Navigate internally using expo-router
      router.push(linkUrl as Parameters<typeof router.push>[0])
    } else {
      // Open external link in browser
      Linking.openURL(linkUrl).catch((err) => {
        // eslint-disable-next-line no-console
        console.error('Failed to open URL:', err)
      })
    }
  }

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

  const renderItem = ({ item: banner }: { item: IBanner; index: number }) => {
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
              resizeMode="cover"
              style={{ opacity: 0.3 }}
              blurRadius={20}
            />
          </View>

          {/* Main image - clear and prominent on top */}
          <View className="absolute inset-0 justify-center items-center px-4" style={{ zIndex: 10 }}>
            <Image
              source={imageSource}
              className="w-full h-full"
              resizeMode="contain"
            />
          </View>
        </View>
      </Pressable>
    )
  }

  const renderPagination = (): React.ReactElement | null => {
    if (bannerData.length <= 1) return null

    return (
      <View className="absolute bottom-4 left-0 right-0 flex-row justify-center items-center space-x-2">
        {bannerData.map((_, index) => (
          <View
            key={index}
            className={`h-2 rounded-full ${
              index === activeIndex
                ? 'w-6 bg-white'
                : 'w-2 bg-white/50'
            }`}
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
        onScroll={handleScroll}
        scrollEventThrottle={16}
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
      />
      {renderPagination()}
    </View>
  )
}
