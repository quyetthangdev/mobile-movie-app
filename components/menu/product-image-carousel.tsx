import { Image } from 'expo-image'
import React, { useCallback, useEffect, useRef, useState } from 'react'
import {
  FlatList,
  InteractionManager,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Platform,
  Pressable,
  View,
} from 'react-native'
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated'

import { Images } from '@/assets/images'
import { publicFileURL } from '@/constants'
import { HIT_SLOP_ICON } from '@/lib/navigation/constants'

interface ProductImageCarouselProps {
  images: (string | null)[]
  onImageClick?: (image: string | null) => void
}

const ProductImageCarousel = React.memo(function ProductImageCarousel({
  images,
  onImageClick,
}: ProductImageCarouselProps) {
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [current, setCurrent] = useState(0)
  const [autoScroll, setAutoScroll] = useState(true)
  const flatListRef = useRef<FlatList<string | null>>(null)
  const autoScrollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Filter out null images and ensure at least one image
  const validImages = images.filter((img) => img !== null && img !== undefined)

  // Pagination dot component with scale animation (transform, not width)
  const PaginationDot = React.memo(function PaginationDot({
    isActive,
    onPress,
  }: {
    isActive: boolean
    onPress: () => void
  }) {
    const scale = useSharedValue(isActive ? 2 : 1)
    
    useEffect(() => {
      scale.value = withTiming(isActive ? 2 : 1, {
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
      <Pressable
        onPress={onPress}
        hitSlop={HIT_SLOP_ICON}
        {...({ unstable_pressDelay: 0 } as object)}
      >
        <Animated.View
          style={animatedStyle}
          className={`h-2 w-2 rounded-full ${
            isActive ? 'bg-red-600 dark:bg-primary' : 'bg-gray-300 dark:bg-gray-600'
          }`}
        />
      </Pressable>
    )
  })

  const handleImagePress = useCallback((image: string | null, index: number) => {
    setAutoScroll(false) // Disable auto-scroll when manually clicking
    setSelectedIndex(index)
    setCurrent(index)
    flatListRef.current?.scrollToIndex({ index, animated: true })
    onImageClick?.(image)
  }, [onImageClick])

  const handleDotPress = useCallback(
    (index: number) => {
      handleImagePress(validImages[index], index)
    },
    [handleImagePress, validImages],
  )

  // Auto-scroll effect — defer sau transition (tránh stutter khi mount)
  useEffect(() => {
    if (!autoScroll || validImages.length <= 1) return

    const task = InteractionManager.runAfterInteractions(() => {
      const scrollToNext = () => {
        const nextIndex = (current + 1) % validImages.length
        setCurrent(nextIndex)
        setSelectedIndex(nextIndex)
        flatListRef.current?.scrollToIndex({ index: nextIndex, animated: true })
        onImageClick?.(validImages[nextIndex] || null)
      }
      autoScrollTimerRef.current = setInterval(scrollToNext, 3000)
    })

    return () => {
      task.cancel()
      if (autoScrollTimerRef.current) {
        clearInterval(autoScrollTimerRef.current)
        autoScrollTimerRef.current = null
      }
    }
  }, [autoScroll, current, validImages.length, onImageClick, validImages])

  // Re-enable auto-scroll after 5 seconds of inactivity
  useEffect(() => {
    if (autoScroll) return

    const timeoutId = setTimeout(() => {
      setAutoScroll(true)
    }, 5000)

    return () => clearTimeout(timeoutId)
  }, [autoScroll])

  // Handle scroll end to update current index
  const handleScrollEnd = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const contentOffsetX = event.nativeEvent.contentOffset.x
      const itemWidth = 80 // width + margin (60 + 8*2)
      const index = Math.round(contentOffsetX / itemWidth)
      if (index >= 0 && index < validImages.length) {
        setCurrent(index)
        setSelectedIndex(index)
      }
    },
    [validImages.length],
  )

  // Render item callback - must be defined before early return
  const renderItem = useCallback(({ item, index }: { item: string | null; index: number }) => {
    const imageUrl = item ? `${publicFileURL}/${item}` : ''
    return (
      <Pressable
        onPress={() => handleImagePress(item, index)}
        hitSlop={HIT_SLOP_ICON}
        className={`mr-2 rounded-lg overflow-hidden border-2 active:opacity-90 ${
          selectedIndex === index
            ? 'border-red-600 dark:border-primary'
            : 'border-gray-300 dark:border-gray-600'
        }`}
        style={{ width: 60, height: 60 }}
        {...({ unstable_pressDelay: 0 } as object)}
      >
        <Image
          source={{ uri: imageUrl }}
          placeholder={Images.Food.ProductImage as unknown as number}
          placeholderContentFit="cover"
          className="w-full h-full"
          contentFit="cover"
          cachePolicy="memory-disk"
        />
      </Pressable>
    )
  }, [selectedIndex, handleImagePress])

  if (validImages.length === 0) {
    return null
  }

  return (
    <View
      className="flex-col items-center gap-2 px-2 w-full"
      {...(Platform.OS === 'android' && { renderToHardwareTextureAndroid: true })}
    >
      <FlatList
        ref={flatListRef}
        data={validImages}
        horizontal
        initialNumToRender={5}
        maxToRenderPerBatch={2}
        windowSize={3}
        showsHorizontalScrollIndicator={false}
        keyExtractor={(item, index) => `image-${index}`}
        renderItem={renderItem}
        contentContainerStyle={{ paddingHorizontal: 4 }}
        onMomentumScrollEnd={handleScrollEnd}
        onScrollToIndexFailed={(info) => {
          // Handle scroll to index failure
          const wait = new Promise((resolve) => setTimeout(resolve, 500))
          wait.then(() => {
            flatListRef.current?.scrollToIndex({ index: info.index, animated: true })
          })
        }}
        getItemLayout={(data, index) => ({
          length: 68, // width (60) + margin (8)
          offset: 68 * index,
          index,
        })}
      />
      {validImages.length > 1 && (
        <View className="flex-row gap-2 mt-2">
          {validImages.map((_, index) => (
            <PaginationDot
              key={index}
              isActive={current === index}
              onPress={() => handleDotPress(index)}
            />
          ))}
        </View>
      )}
    </View>
  )
})

export default ProductImageCarousel
