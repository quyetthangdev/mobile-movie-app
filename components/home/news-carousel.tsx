import { Images } from '@/assets/images'
import React, { useRef } from 'react'
import { Dimensions, FlatList, Image, Pressable, Text, View } from 'react-native'

import { navigateNative } from '@/lib/navigation'
import { NewsArticle } from '@/types'

interface NewsCarouselProps {
  /**
   * Array of news articles to display
   */
  articles?: NewsArticle[]
}

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
  const screenWidth = Dimensions.get('window').width

  // Mock data - matching web version
  const mockNewsArticles: NewsArticle[] = [
    {
      id: '1',
      slug: 'bai-viet-1',
      title: 'Tổ chức Sự kiện Acoustic hằng tuần tại Trend Coffee – Không gian chill cho cuối tuần thư thái',
      summary: 'Bạn đang tìm một nơi để thư giãn, nghe nhạc sống và tận hưởng không gian cà phê ấm cúng sau những ngày làm việc căng thẳng? Trend Coffee & Foods chính là điểm hẹn lý tưởng với sự kiện Acoustic hằng tuần – nơi âm nhạc, cà phê và cảm xúc hòa quyện trong một trải nghiệm trọn vẹn.',
      thumbnail: Images.News.Article11 as unknown as string,
      publishDate: '2025-11-27',
    },
    {
      id: '2',
      slug: 'bai-viet-2',
      title: 'Check-in Giáng sinh, rinh ngay voucher 100k tại Trend Coffee & Foods!',
      summary: 'Mùa lễ hội cuối năm đã chính thức gõ cửa, mang theo không khí lung linh và rộn ràng khắp mọi nẻo đường. Tại Trend Coffee & Foods, Giáng Sinh năm nay trở nên đặc biệt hơn bao giờ hết với chương trình "Check-in Giáng sinh – Rinh ngay voucher 100k" dành cho tất cả khách hàng.',
      thumbnail: Images.News.Article21 as unknown as string,
      publishDate: '2025-11-27',
    },
    {
      id: '3',
      slug: 'bai-viet-3',
      title: 'Trend Coffee ưu đãi đồng giá 29.000đ trong tuần khai trương',
      summary: 'Tuần khai trương luôn là dấu mốc quan trọng đối với Trend Coffee, nơi chúng tôi chính thức mở cửa và mang đến cho khách hàng những trải nghiệm đồ uống chất lượng trong không gian rustic hiện đại. Để chào đón giai đoạn đặc biệt này, Trend Coffee triển khai chương trình ưu đãi đồng giá 29.000đ cho toàn bộ menu nước trong suốt tuần lễ khai trương.',
      thumbnail: Images.News.Article31 as unknown as string,
      publishDate: '2025-11-27',
    },
  ]

  const newsArticles = articles || mockNewsArticles

  const handleArticlePress = (slug: string) => {
    // Navigate to news detail page
    navigateNative.push(`/home/news/${slug}`)
  }

  // Calculate item width based on screen size (similar to web: max-w-[180px] sm:max-w-[320px])
  const itemWidth = screenWidth < 640 ? 180 : 320
  const itemSpacing = 8 // Reduced spacing between items
  const horizontalPadding = screenWidth < 640 ? 16 : 20 // Padding from screen edges

  const renderItem = ({ item, index }: { item: NewsArticle; index: number }) => {
    return (
      <View
        style={{
          width: itemWidth,
          marginLeft: index === 0 ? horizontalPadding : itemSpacing, // Reduced gap between items
          marginRight: itemSpacing,
        }}
      >
        <Pressable
          onPress={() => handleArticlePress(item.slug)}
          className="bg-transparent w-full"
        >
          {/* Card container - matches web: bg-transparent border-none shadow-none */}
          <View className="w-full flex-col">
            {/* Image container - matches web: rounded-xl bg-muted */}
            <View className="relative w-full overflow-hidden rounded-xl bg-gray-200 dark:bg-gray-700" style={{ aspectRatio: 4 / 3 }}>
              <Image
                source={typeof item.thumbnail === 'string' ? { uri: item.thumbnail } : item.thumbnail}
                className="w-full h-full"
                resizeMode="contain"
              />
            </View>

            {/* Content container - matches web: p-3 sm:p-4 flex flex-col gap-2 */}
            <View className="py-3 sm:py-4 flex-col flex-1">
              {/* Title - matches web: text-base sm:text-lg font-bold line-clamp-2 */}
              <Text
                className="text-base sm:text-lg font-bold text-gray-900 dark:text-white"
                numberOfLines={2}
                style={{ minHeight: 56 }} // sm:min-h-[3.5rem] = 56px
              >
                {item.title}
              </Text>
              {/* Summary - matches web: text-xs sm:text-sm text-muted-foreground line-clamp-2 sm:line-clamp-3 */}
              <Text
                className="text-xs sm:text-sm text-gray-600 dark:text-gray-400"
                numberOfLines={screenWidth < 640 ? 2 : 3}
              >
                {item.summary}
              </Text>
            </View>
          </View>
        </Pressable>
      </View>
    )
  }

  return (
    <View className="w-full items-center">
      <FlatList
        ref={flatListRef}
        data={newsArticles}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingRight: horizontalPadding }}
        snapToInterval={itemWidth + itemSpacing * 2} // itemWidth + margins
        decelerationRate="fast"
        getItemLayout={(data, index) => {
          const offset = index === 0 
            ? horizontalPadding 
            : horizontalPadding + (itemWidth + itemSpacing * 2) * index
          return {
            length: itemWidth + itemSpacing * 2,
            offset,
            index,
          }
        }}
      />
    </View>
  )
}
