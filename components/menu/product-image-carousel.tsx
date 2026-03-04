import { Image } from 'expo-image'
import React, { useCallback, useEffect, useRef, useState } from 'react'
import {
  FlatList,
  InteractionManager,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Platform,
  Pressable,
  useColorScheme,
  View,
} from 'react-native'
import Animated, {
  runOnUI,
  useAnimatedReaction,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated'
import type { SharedValue } from 'react-native-reanimated'

import { DOT_SCALE_ACTIVE, SPRING_CONFIGS } from '@/constants'

import { Images } from '@/assets/images'
import { publicFileURL } from '@/constants'
import { HIT_SLOP_ICON } from '@/lib/navigation/constants'

interface PaginationDotProps {
  index: number
  selectedIndexShared: SharedValue<number>
  onPress: () => void
  activeColor: string
  inactiveColor: string
}

const PaginationDot = React.memo(function PaginationDot({
  index,
  selectedIndexShared,
  onPress,
  activeColor,
  inactiveColor,
}: PaginationDotProps) {
  const scale = useSharedValue(1)

  useAnimatedReaction(
    () => selectedIndexShared.value === index,
    (isActive) => {
      scale.value = withSpring(isActive ? DOT_SCALE_ACTIVE : 1, SPRING_CONFIGS.dot)
    },
  )

  const animatedStyle = useAnimatedStyle(() => {
    'worklet'
    const isActive = selectedIndexShared.value === index
    return {
      transform: [{ scale: scale.value }],
      backgroundColor: isActive ? activeColor : inactiveColor,
    }
  }, [index, activeColor, inactiveColor])

  return (
    <Pressable
      onPress={onPress}
      hitSlop={HIT_SLOP_ICON}
      {...({ unstable_pressDelay: 0 } as object)}
    >
      <Animated.View style={animatedStyle} className="h-2 w-2 rounded-full" />
    </Pressable>
  )
})

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
  const [dotsReady, setDotsReady] = useState(false)
  const flatListRef = useRef<FlatList<string | null>>(null)
  const autoScrollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const selectedIndexShared = useSharedValue(0)
  const isDark = useColorScheme() === 'dark'
  const dotActiveColor = isDark ? '#D68910' : '#dc2626'
  const dotInactiveColor = isDark ? '#4b5563' : '#d1d5db'

  const updateSelectedIndexShared = useCallback((index: number) => {
    runOnUI((i: number) => {
      'worklet'
      selectedIndexShared.value = i
    })(index)
  }, [selectedIndexShared])

  // Defer PaginationDot 1 frame — giảm Reanimated work trong frame đầu mount
  useEffect(() => {
    const id = requestAnimationFrame(() => setDotsReady(true))
    return () => cancelAnimationFrame(id)
  }, [])

  // Filter out null images and ensure at least one image
  const validImages = images.filter((img) => img !== null && img !== undefined)

  const handleImagePress = useCallback(
    (image: string | null, index: number) => {
      updateSelectedIndexShared(index)
      setAutoScroll(false)
      setSelectedIndex(index)
      setCurrent(index)
      flatListRef.current?.scrollToIndex({ index, animated: true })
      onImageClick?.(image)
    },
    [onImageClick, updateSelectedIndexShared],
  )

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
        updateSelectedIndexShared(nextIndex)
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
  }, [autoScroll, current, validImages.length, onImageClick, validImages, updateSelectedIndexShared])

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
        updateSelectedIndexShared(index)
        setCurrent(index)
        setSelectedIndex(index)
      }
    },
    [validImages.length, updateSelectedIndexShared],
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
        initialNumToRender={1}
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
      {validImages.length > 1 && dotsReady && (
        <View className="flex-row gap-2 mt-2">
          {validImages.map((_, index) => (
            <PaginationDot
              key={index}
              index={index}
              selectedIndexShared={selectedIndexShared}
              onPress={() => handleDotPress(index)}
              activeColor={dotActiveColor}
              inactiveColor={dotInactiveColor}
            />
          ))}
        </View>
      )}
    </View>
  )
})

export default ProductImageCarousel
