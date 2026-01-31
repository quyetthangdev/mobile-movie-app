import React, { useRef } from 'react'
import { useTranslation } from 'react-i18next'
import type { ImageSourcePropType } from 'react-native'
import { FlatList, Image, Text, View } from 'react-native'

import { Images } from '@/assets/images'

interface HighlightMenuItem {
  id: number
  image: ImageSourcePropType
  nameKey: string
}

interface HighlightMenuCarouselProps {
  /**
   * Optional data prop for dynamic menu items
   * If not provided, uses default hardcoded data
   */
  items?: HighlightMenuItem[]
}

/**
 * HighlightMenuCarousel Component
 * 
 * Displays a horizontal carousel of highlighted menu items.
 * Each item shows an image and translated name.
 * 
 * @example
 * ```tsx
 * <HighlightMenuCarousel />
 * ```
 */
export default function HighlightMenuCarousel({
  items,
}: HighlightMenuCarouselProps = {}): React.ReactElement {
  const { t } = useTranslation('home')
  const flatListRef = useRef<FlatList>(null)

  // Default data with actual image imports
  const defaultHighlightMenus: HighlightMenuItem[] = [
    { id: 1, image: Images.Highlight.Menu2 as ImageSourcePropType, nameKey: 'highlightMenu.coffee' },
    { id: 2, image: Images.Highlight.Menu3 as ImageSourcePropType, nameKey: 'highlightMenu.tea' },
    { id: 3, image: Images.Highlight.Menu4 as ImageSourcePropType, nameKey: 'highlightMenu.smoothie' },
    { id: 4, image: Images.Highlight.Menu5 as ImageSourcePropType, nameKey: 'highlightMenu.food' },
  ]

  const highlightMenus = items || defaultHighlightMenus

  const renderItem = ({ item, index }: { item: HighlightMenuItem; index: number }) => {
    return (
      <View className={`w-40 mx-2.5 py-2 ${index === 0 ? 'ml-0' : ''}`}>
        <View className="w-full aspect-square rounded-xl overflow-hidden bg-gray-100">
          <Image
            source={item.image}
            className="w-full h-full"
            resizeMode="cover"
            accessibilityLabel={t(item.nameKey)}
          />
        </View>
        <View className="mt-2 px-1 items-center">
           <Text className="text-center text-lg font-semibold text-primary" numberOfLines={1}>
            {t(item.nameKey)}
          </Text>
        </View>
      </View>
    )
  }

  return (
    <View className="w-full">
      <FlatList
        ref={flatListRef}
        data={highlightMenus}
        renderItem={renderItem}
        keyExtractor={(item) => item.id.toString()}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 10 }}
        snapToInterval={180}
        decelerationRate="fast"
      />
    </View>
  )
}
