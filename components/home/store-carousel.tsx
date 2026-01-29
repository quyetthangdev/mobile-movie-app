import React, { useRef, useState } from 'react'
import type { ImageSourcePropType, NativeScrollEvent, NativeSyntheticEvent } from 'react-native'
import { Dimensions, FlatList, Image, View } from 'react-native'

import { Images } from '@/assets/images'

interface StoreCarouselProps {
  /**
   * Array of image sources for the carousel
   */
  images?: ImageSourcePropType[]
}

// Default images - using actual store images
const defaultImages: ImageSourcePropType[] = [
  Images.Highlight.Menu2,
  Images.Highlight.Menu3,
  Images.Highlight.Menu4,
  Images.Highlight.Menu5,
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
export default function StoreCarousel({ images }: StoreCarouselProps) {
  const flatListRef = useRef<FlatList>(null)
  const [activeIndex, setActiveIndex] = useState(0)
  const screenWidth = Dimensions.get('window').width

  const carouselImages = images || defaultImages

  // Auto-scroll functionality
  React.useEffect(() => {
    const interval = setInterval(() => {
      setActiveIndex((prev) => {
        const next = prev + 1 >= carouselImages.length ? 0 : prev + 1
        flatListRef.current?.scrollToIndex({ index: next, animated: true })
        return next
      })
    }, 3000)

    return () => clearInterval(interval)
  }, [carouselImages.length])

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const slideSize = screenWidth
    const index = Math.round(event.nativeEvent.contentOffset.x / slideSize)
    setActiveIndex(index)
  }

  const renderItem = ({ item }: { item: ImageSourcePropType }) => {
    return (
      <View className="w-full" style={{ width: screenWidth }}>
        <View className="h-48 sm:h-[28rem] w-full overflow-hidden rounded-xl">
          <Image
            source={item}
            className="w-full h-full"
            resizeMode="cover"
          />
        </View>
      </View>
    )
  }

  const renderPagination = () => {
    return (
      <View className="absolute bottom-4 left-0 right-0 flex-row justify-center items-center space-x-2">
        {carouselImages.map((_, index) => (
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
        onScroll={handleScroll}
        scrollEventThrottle={16}
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
}
