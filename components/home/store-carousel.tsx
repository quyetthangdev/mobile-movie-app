import React, { useCallback, useEffect, useRef, useState } from 'react'
import type { ImageSourcePropType } from 'react-native'
import { Dimensions, FlatList, Image, View } from 'react-native'
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated'

import { Images } from '@/assets/images'

interface StoreCarouselProps {
  /**
   * Array of image sources for the carousel
   */
  images?: ImageSourcePropType[]
}

// Default images - using actual store images
const defaultImages: ImageSourcePropType[] = [
  Images.News.Article11,
  Images.News.Article12,
  Images.News.Article13,
  Images.News.Article22,
  Images.News.Article23,
  Images.News.Article31,
  Images.News.Article32,
  Images.News.Article33,
  Images.News.Article34,
] as ImageSourcePropType[]

/**
 * StoreCarousel Component
 * 
 * Displays a horizontal carousel of store images with pagination dots.
 * Auto-scrolls through images automatically.
 * 
 * @example
 * ```tsx
 * <StoreCarousel images={storeImages} />
 * ```
 */
const StoreCarousel = React.memo(function StoreCarousel({ images }: StoreCarouselProps) {
  const flatListRef = useRef<FlatList>(null)
  const [activeIndexState, setActiveIndexState] = useState(0)
  const screenWidth = Dimensions.get('window').width

  const carouselImages = images || defaultImages

  // Handle scroll end - only update state when scroll completes (not every frame)
  const handleScrollEnd = useCallback((event: { nativeEvent: { contentOffset: { x: number } } }) => {
    const slideSize = screenWidth
    const index = Math.round(event.nativeEvent.contentOffset.x / slideSize)
    if (index >= 0 && index < carouselImages.length && index !== activeIndexState) {
      setActiveIndexState(index)
    }
  }, [screenWidth, carouselImages.length, activeIndexState])

  // Auto-scroll functionality
  useEffect(() => {
    if (carouselImages.length <= 1) return

    const interval = setInterval(() => {
      const next = activeIndexState + 1 >= carouselImages.length ? 0 : activeIndexState + 1
      flatListRef.current?.scrollToIndex({ index: next, animated: true })
    }, 3000)

    return () => clearInterval(interval)
  }, [carouselImages.length, activeIndexState])

  const renderItem = useCallback(({ item }: { item: ImageSourcePropType }) => {
    return (
      <View className="w-full" style={{ width: screenWidth }}>
        <View className="w-full overflow-hidden rounded-xl" style={{ aspectRatio: 16 / 9 }}>
          <Image
            source={item}
            className="w-full h-full"
            resizeMode="cover"
          />
        </View>
      </View>
    )
  }, [screenWidth])

  // Pagination dot component with scale animation (transform, not width)
  const PaginationDot = React.memo(function PaginationDot({  
    isActive 
  }: { 
    index: number
    isActive: boolean 
  }) {
    const scale = useSharedValue(isActive ? 3 : 1)
    
    useEffect(() => {
      scale.value = withTiming(isActive ? 3 : 1, {
        duration: 200,
      })
    }, [isActive, scale])

    const animatedStyle = useAnimatedStyle(() => {
      'worklet'
      return {
        transform: [{ scaleX: scale.value }],
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

  const renderPagination = () => {
    return (
      <View className="absolute bottom-4 left-0 right-0 flex-row justify-center items-center space-x-2">
        {carouselImages.map((_, index) => (
          <PaginationDot
            key={index}
            index={index}
            isActive={index === activeIndexState}
          />
        ))}
      </View>
    )
  }

  return (
    <View className="overflow-hidden w-full max-w-6xl rounded-xl mx-auto">
      <FlatList
        ref={flatListRef}
        data={carouselImages}
        renderItem={renderItem}
        keyExtractor={(_, index) => index.toString()}
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
          // Handle scroll to index failure
          const wait = new Promise((resolve) => setTimeout(resolve, 500))
          wait.then(() => {
            flatListRef.current?.scrollToIndex({ index: info.index, animated: true })
          })
        }}
      />
      {renderPagination()}
    </View>
  )
})

export default StoreCarousel
