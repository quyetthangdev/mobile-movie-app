import React, { useState } from 'react'
import { FlatList, Image, Pressable, View } from 'react-native'

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

  // Filter out null images and ensure at least one image
  const validImages = images.filter((img) => img !== null && img !== undefined)

  if (validImages.length === 0) {
    return null
  }

  const handleImagePress = (image: string | null, index: number) => {
    setSelectedIndex(index)
    onImageClick?.(image)
  }

  return (
    <View className="flex-row gap-2 mt-2">
      <FlatList
        data={validImages}
        horizontal
        showsHorizontalScrollIndicator={false}
        keyExtractor={(item, index) => `image-${index}`}
        renderItem={({ item, index }) => (
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
              source={{ uri: `${publicFileURL}/${item}` }}
              className="w-full h-full"
              resizeMode="cover"
            />
          </Pressable>
        )}
        contentContainerStyle={{ paddingHorizontal: 4 }}
      />
    </View>
  )
}

