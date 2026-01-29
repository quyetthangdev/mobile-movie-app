import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ActivityIndicator, Dimensions, Image, Linking, Pressable, Text, View } from 'react-native'

interface YouTubeVideoSectionProps {
  /**
   * YouTube video ID (extracted from URL)
   * Example: For "https://www.youtube.com/watch?v=dQw4w9WgXcQ", videoId would be "dQw4w9WgXcQ"
   */
  videoId: string
  /**
   * Optional title for the video section
   */
  title?: string
}

/**
 * YouTubeVideoSection Component
 * 
 * Displays a YouTube video thumbnail with play button overlay.
 * Tapping opens the video in YouTube app or browser.
 * 
 * Note: React Native doesn't support YouTube iframe API directly.
 * This implementation shows a thumbnail that opens YouTube when tapped.
 * 
 * @example
 * ```tsx
 * <YouTubeVideoSection videoId="dQw4w9WgXcQ" title="Watch our story" />
 * ```
 */
export const YouTubeVideoSection: React.FC<YouTubeVideoSectionProps> = ({
  videoId,
  title,
}) => {
  const { t } = useTranslation('home')
  const [isLoading, setIsLoading] = useState(true)
  const screenWidth = Dimensions.get('window').width
  const videoHeight = (screenWidth * 9) / 16 // 16:9 aspect ratio

  // Generate YouTube thumbnail URL (max quality)
  const thumbnailUrl = `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`
  
  // Generate YouTube URL
  const youtubeUrl = `https://www.youtube.com/watch?v=${videoId}`

  const handleVideoPress = () => {
    // Try to open in YouTube app first, fallback to browser
    const youtubeAppUrl = `vnd.youtube:${videoId}`
    
    Linking.canOpenURL(youtubeAppUrl)
      .then((supported) => {
        if (supported) {
          return Linking.openURL(youtubeAppUrl)
        } else {
          return Linking.openURL(youtubeUrl)
        }
      })
      .catch((err) => {
        // eslint-disable-next-line no-console
        console.error('Failed to open YouTube:', err)
        // Fallback to browser
        Linking.openURL(youtubeUrl)
      })
  }

  return (
    <View className="w-full px-4 py-4">
      <View className="w-full items-center mb-8">
        <View className="w-full items-center">
          <Text className="w-full text-center text-lg sm:text-2xl font-extrabold uppercase text-red-600 dark:text-primary mb-4">
            {title || t('home.videoSection.title', 'Khám phá câu chuyện TREND Coffee')}
          </Text>
        </View>
      </View>

      <View className="w-full items-center">
        <View className="w-full max-w-4xl rounded-lg overflow-hidden" style={{ height: videoHeight }}>
          <Pressable onPress={handleVideoPress} className="relative w-full h-full">
            {/* Thumbnail */}
            <Image
              source={{ uri: thumbnailUrl }}
              className="w-full h-full"
              resizeMode="cover"
              onLoadEnd={() => setIsLoading(false)}
              onError={() => setIsLoading(false)}
            />

            {/* Loading indicator */}
            {isLoading && (
              <View className="absolute inset-0 justify-center items-center bg-gray-200 dark:bg-gray-800">
                <ActivityIndicator size="large" color="#e50914" />
              </View>
            )}

            {/* Play button overlay */}
            <View className="absolute inset-0 justify-center items-center bg-black/20">
              <View className="w-20 h-20 bg-red-600 rounded-full justify-center items-center">
                <View className="ml-1">
                  {/* Play icon - using triangle */}
                  <View
                    style={{
                      width: 0,
                      height: 0,
                      borderLeftWidth: 20,
                      borderTopWidth: 12,
                      borderBottomWidth: 12,
                      borderTopColor: 'transparent',
                      borderBottomColor: 'transparent',
                      borderLeftColor: 'white',
                    }}
                  />
                </View>
              </View>
            </View>
          </Pressable>
        </View>
      </View>
    </View>
  )
}

export default YouTubeVideoSection
