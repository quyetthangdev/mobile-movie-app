import React, { useCallback, useEffect, useRef, useState } from 'react'
import type { ImageSourcePropType } from 'react-native'
import { Dimensions, FlatList, Image, InteractionManager, View } from 'react-native'
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated'

import { DOT_SCALE_ACTIVE, SPRING_CONFIGS } from '@/constants'

interface StoreCarouselProps {
  images?: ImageSourcePropType[]
}

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

  const carouselImages = images ?? []

  // Handle scroll end - only update state when scroll completes (not every frame)
  const handleScrollEnd = useCallback((event: { nativeEvent: { contentOffset: { x: number } } }) => {
    const slideSize = screenWidth
    const index = Math.round(event.nativeEvent.contentOffset.x / slideSize)
    if (index >= 0 && index < carouselImages.length && index !== activeIndexState) {
      setActiveIndexState(index)
    }
  }, [screenWidth, carouselImages.length, activeIndexState])

  // Auto-scroll — defer sau transition (tránh stutter khi mount)
  useEffect(() => {
    if (carouselImages.length <= 1) return

    let intervalId: ReturnType<typeof setInterval> | null = null
    const task = InteractionManager.runAfterInteractions(() => {
      intervalId = setInterval(() => {
        const next = activeIndexState + 1 >= carouselImages.length ? 0 : activeIndexState + 1
        flatListRef.current?.scrollToIndex({ index: next, animated: true })
      }, 3000)
    })

    return () => {
      task.cancel()
      if (intervalId) clearInterval(intervalId)
    }
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
    isActive,
  }: {
    index: number
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

  const renderPagination = () => {
    return (
      <View className="absolute bottom-4 left-0 right-0 flex-row justify-center items-center" style={{ gap: 8 }}>
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
        initialNumToRender={3}
        maxToRenderPerBatch={2}
        windowSize={3}
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
