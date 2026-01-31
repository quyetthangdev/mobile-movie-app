import React, { useCallback, useEffect, useRef, useState } from 'react'
import { FlatList, Image, NativeScrollEvent, NativeSyntheticEvent, Pressable, View } from 'react-native'

import { publicFileURL } from '@/constants'

interface ProductImageCarouselProps {
  images: (string | null)[]
  onImageClick?: (image: string | null) => void
}

export default function ProductImageCarousel({
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

  const handleImagePress = (image: string | null, index: number) => {
    setAutoScroll(false) // Disable auto-scroll when manually clicking
    setSelectedIndex(index)
    setCurrent(index)
    flatListRef.current?.scrollToIndex({ index, animated: true })
    onImageClick?.(image)
  }

  // Auto-scroll effect
  useEffect(() => {
    if (!autoScroll || validImages.length <= 1) return

    const scrollToNext = () => {
      const nextIndex = (current + 1) % validImages.length
      setCurrent(nextIndex)
      setSelectedIndex(nextIndex)
      flatListRef.current?.scrollToIndex({ index: nextIndex, animated: true })
      onImageClick?.(validImages[nextIndex] || null)
    }

    autoScrollTimerRef.current = setInterval(scrollToNext, 3000)

    return () => {
      if (autoScrollTimerRef.current) {
        clearInterval(autoScrollTimerRef.current)
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

  if (validImages.length === 0) {
    return null
  }

  return (
    <View className="flex-col items-center gap-2 px-2 w-full">
      <FlatList
        ref={flatListRef}
        data={validImages}
        horizontal
        showsHorizontalScrollIndicator={false}
        keyExtractor={(item, index) => `image-${index}`}
        renderItem={({ item, index }) => {
          const imageUrl = item ? `${publicFileURL}/${item}` : ''
          return (
            <Pressable
              onPress={() => handleImagePress(item, index)}
              className={`mr-2 rounded-lg overflow-hidden border-2 ${
                selectedIndex === index
                  ? 'border-red-600 dark:border-primary'
                  : 'border-gray-300 dark:border-gray-600'
              }`}
              style={{ width: 60, height: 60 }}
            >
              <Image
                source={{ uri: imageUrl }}
                className="w-full h-full"
                resizeMode="cover"
              />
            </Pressable>
          )
        }}
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
            <Pressable
              key={index}
              onPress={() => handleImagePress(validImages[index], index)}
              className={`rounded-full transition-all ${
                current === index
                  ? 'w-4 h-2 bg-red-600 dark:bg-primary'
                  : 'w-2 h-2 bg-gray-300 dark:bg-gray-600'
              }`}
            />
          ))}
        </View>
      )}
    </View>
  )
}
