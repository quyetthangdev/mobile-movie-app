import { Images } from '@/assets/images'
import { Image } from 'expo-image'
import React, { useCallback, useMemo, useRef } from 'react'
import { FlatList, Text, useWindowDimensions, View } from 'react-native'

import { NativeGesturePressable } from '@/components/navigation/native-gesture-pressable'
import { useGhostMount } from '@/lib/navigation'
import { NewsArticle } from '@/types'

interface NewsCarouselProps {
  /**
   * Array of news articles to display
   */
  articles?: NewsArticle[]
}

/** Mock cố định — không tạo mới mỗi render (tránh alloc chuỗi lớn lặp lại). */
const MOCK_NEWS_ARTICLES: NewsArticle[] = [
  {
    id: '1',
    slug: 'bai-viet-1',
    title:
      'Tổ chức Sự kiện Acoustic hằng tuần tại Trend Coffee – Không gian chill cho cuối tuần thư thái',
    summary:
      'Bạn đang tìm một nơi để thư giãn, nghe nhạc sống và tận hưởng không gian cà phê ấm cúng sau những ngày làm việc căng thẳng? Trend Coffee & Foods chính là điểm hẹn lý tưởng với sự kiện Acoustic hằng tuần – nơi âm nhạc, cà phê và cảm xúc hòa quyện trong một trải nghiệm trọn vẹn.',
    thumbnail: Images.News.Article11 as unknown as string,
    publishDate: '2025-11-27',
  },
  {
    id: '2',
    slug: 'bai-viet-2',
    title:
      'Check-in Giáng sinh, rinh ngay voucher 100k tại Trend Coffee & Foods!',
    summary:
      'Mùa lễ hội cuối năm đã chính thức gõ cửa, mang theo không khí lung linh và rộn ràng khắp mọi nẻo đường. Tại Trend Coffee & Foods, Giáng Sinh năm nay trở nên đặc biệt hơn bao giờ hết với chương trình "Check-in Giáng sinh – Rinh ngay voucher 100k" dành cho tất cả khách hàng.',
    thumbnail: Images.News.Article21 as unknown as string,
    publishDate: '2025-11-27',
  },
  {
    id: '3',
    slug: 'bai-viet-3',
    title: 'Trend Coffee ưu đãi đồng giá 29.000đ trong tuần khai trương',
    summary:
      'Tuần khai trương luôn là dấu mốc quan trọng đối với Trend Coffee, nơi chúng tôi chính thức mở cửa và mang đến cho khách hàng những trải nghiệm đồ uống chất lượng trong không gian rustic hiện đại. Để chào đón giai đoạn đặc biệt này, Trend Coffee triển khai chương trình ưu đãi đồng giá 29.000đ cho toàn bộ menu nước trong suốt tuần lễ khai trương.',
    thumbnail: Images.News.Article31 as unknown as string,
    publishDate: '2025-11-27',
  },
]

/**
 * NewsCarousel Component
 *
 * Displays a horizontal carousel of news articles.
 * Each article shows thumbnail, title, and summary.
 * Tapping an article navigates to its detail page.
 *
 * Matches web version styling for consistency.
 *
 * @example
 * ```tsx
 * <NewsCarousel articles={newsArticles} />
 * ```
 */
export default function NewsCarousel({ articles }: NewsCarouselProps) {
  const flatListRef = useRef<FlatList>(null)
  const { width: screenWidth } = useWindowDimensions()
  const { preload } = useGhostMount()

  const newsArticles = articles ?? MOCK_NEWS_ARTICLES

  // Calculate item width based on screen size (similar to web: max-w-[180px] sm:max-w-[320px])
  const itemWidth = screenWidth < 640 ? 180 : 320
  const itemSpacing = 8
  const horizontalPadding = screenWidth < 640 ? 16 : 20

  const keyExtractor = useCallback((item: NewsArticle) => item.id, [])

  const renderItem = useCallback(
    ({ item, index }: { item: NewsArticle; index: number }) => {
      const thumbSource =
        typeof item.thumbnail === 'string'
          ? { uri: item.thumbnail }
          : (item.thumbnail as number)

      return (
        <View
          style={{
            width: itemWidth,
            marginLeft: index === 0 ? horizontalPadding : itemSpacing,
            marginRight: itemSpacing,
          }}
        >
          <NativeGesturePressable
            navigation={{ type: 'push', href: `/home/news/${item.slug}` }}
            onPressIn={() => preload('news', { slug: item.slug })}
            className="w-full bg-transparent"
          >
            <View className="w-full flex-col">
              <View
                className="relative w-full overflow-hidden rounded-xl bg-gray-200 dark:bg-gray-700"
                style={{ aspectRatio: 4 / 3 }}
              >
                <Image
                  source={thumbSource}
                  style={{ width: '100%', height: '100%' }}
                  contentFit="cover"
                  cachePolicy="memory-disk"
                  recyclingKey={item.id}
                  transition={120}
                />
              </View>

              <View className="flex-1 flex-col py-3 sm:py-4">
                <Text
                  className="text-base font-bold text-gray-900 dark:text-white sm:text-lg"
                  numberOfLines={2}
                  style={{ minHeight: 56 }}
                >
                  {item.title}
                </Text>
                <Text
                  className="text-xs text-gray-600 dark:text-gray-400 sm:text-sm"
                  numberOfLines={screenWidth < 640 ? 2 : 3}
                >
                  {item.summary}
                </Text>
              </View>
            </View>
          </NativeGesturePressable>
        </View>
      )
    },
    [itemWidth, itemSpacing, horizontalPadding, preload, screenWidth],
  )

  const contentContainerStyle = useMemo(
    () => ({ paddingRight: horizontalPadding }),
    [horizontalPadding],
  )

  const getItemLayout = useCallback(
    (_data: ArrayLike<NewsArticle> | null | undefined, index: number) => {
      const offset =
        index === 0
          ? horizontalPadding
          : horizontalPadding + (itemWidth + itemSpacing * 2) * index
      return {
        length: itemWidth + itemSpacing * 2,
        offset,
        index,
      }
    },
    [horizontalPadding, itemWidth, itemSpacing],
  )

  return (
    <View className="w-full items-center">
      <FlatList
        ref={flatListRef}
        data={newsArticles}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        horizontal
        initialNumToRender={3}
        maxToRenderPerBatch={2}
        windowSize={3}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={contentContainerStyle}
        snapToInterval={itemWidth + itemSpacing * 2}
        decelerationRate="fast"
        getItemLayout={getItemLayout}
        removeClippedSubviews
      />
    </View>
  )
}
