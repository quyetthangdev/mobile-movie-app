import { useEffect, useState } from 'react'
import type { ImageSourcePropType } from 'react-native'
import { Dimensions, Image, TouchableOpacity, View } from 'react-native'

import { Images } from '@/assets/images'
import {
  Card,
  Carousel,
  CarouselContent,
  CarouselItem,
  type CarouselApi,
} from '@/components/ui'
import { publicFileURL } from '@/constants'

export default function ProductImageCarousel({
  images,
  onImageClick,
}: {
  images: (string | null | undefined)[]
  onImageClick: (image: string | null) => void
}) {
  const [api, setApi] = useState<CarouselApi | null>(null)
  const [current, setCurrent] = useState(0)
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [autoScroll, setAutoScroll] = useState(true)

  const handleImageClick = (image: string | null | undefined, index: number) => {
    setAutoScroll(false) // Disable auto-scroll when manually clicking
    setSelectedIndex(index)
    setCurrent(index)
    if (api) {
      api.scrollTo(index)
    }
    onImageClick(image ?? null)
  }

  useEffect(() => {
    if (!api || !autoScroll) return

    const intervalId = setInterval(() => {
      if (api) {
        api.scrollNext()
      }
    }, 3000) // Auto-scroll every 3 seconds

    return () => {
      clearInterval(intervalId)
    }
  }, [api, autoScroll])

  // Re-enable auto-scroll after 5 seconds of inactivity
  useEffect(() => {
    if (autoScroll) return

    const timeoutId = setTimeout(() => {
      setAutoScroll(true)
    }, 5000)

    return () => clearTimeout(timeoutId)
  }, [autoScroll])

  const screenWidth = Dimensions.get('window').width
  const itemWidth = screenWidth / 3 // Show 3 items per screen

  return (
    <View className="flex w-full flex-col items-center gap-2 px-2">
      <Carousel
        opts={{
          align: 'start',
          loop: true, // Enable loop
        }}
        setApi={setApi}
        onIndexChange={setCurrent}
        className="w-full"
      >
        <CarouselContent>
          {images.map((image, index) => (
            <CarouselItem key={index} className="px-1">
              <View className="flex w-full py-1">
                <TouchableOpacity
                  onPress={() => handleImageClick(image, index)}
                  activeOpacity={0.8}
                >
                  <Card
                    className={`relative w-full overflow-hidden ${
                      selectedIndex === index ? 'ring-2 ring-primary' : ''
                    }`}
                    style={{ width: itemWidth - 8 }}
                  >
                    <Image
                      source={
                        (image
                          ? { uri: `${publicFileURL}/${image}` }
                          : Images.Food.ProductImage) as ImageSourcePropType
                      }
                      className="h-24 w-full rounded-md"
                      resizeMode="cover"
                    />
                  </Card>
                </TouchableOpacity>
              </View>
            </CarouselItem>
          ))}
        </CarouselContent>
      </Carousel>
      {images.length > 1 && (
        <View className="mt-4 flex-row gap-2">
          {images.map((image, index) => (
            <TouchableOpacity
              key={index}
              onPress={() => handleImageClick(image, index)}
              className={`h-2 rounded-full ${
                current === index ? 'w-4 bg-primary' : 'w-2 bg-gray-300'
              }`}
            />
          ))}
        </View>
      )}
    </View>
  )
}
