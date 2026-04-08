import { Image } from 'expo-image'
import { useRouter } from 'expo-router'
import React, { useCallback, useRef, useState } from 'react'
import {
  Dimensions,
  Linking,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  useColorScheme,
} from 'react-native'
import Animated, {
  interpolate,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
} from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useTranslation } from 'react-i18next'

import { colors } from '@/constants'
import { Images } from '@/assets/images'

const { width: SCREEN_W } = Dimensions.get('window')

// ─── Slides ──────────────────────────────────────────────────────────────────

const SLIDES = [
  { key: 'slide0', image: Images.Highlight.Menu2 },
  { key: 'slide1', image: Images.Highlight.Menu4 },
  { key: 'slide2', image: Images.Featured.Services1 },
]

// ─── Dot ─────────────────────────────────────────────────────────────────────

function Dot({ active, color }: { active: boolean; color: string }) {
  return (
    <Animated.View
      style={[
        s.dot,
        active
          ? { width: 20, backgroundColor: color }
          : { width: 8, backgroundColor: `${color}40` },
      ]}
    />
  )
}

// ─── Slide ───────────────────────────────────────────────────────────────────

function Slide({
  item,
  isDark,
}: {
  item: (typeof SLIDES)[number]
  isDark: boolean
}) {
  return (
    <View style={[s.slide, { width: SCREEN_W }]}>
      <View style={s.imageWrap}>
        <Image
          source={item.image}
          style={s.image}
          contentFit="cover"
          transition={200}
        />
        {/* Gradient overlay */}
        <View style={[s.imageOverlay, { backgroundColor: isDark ? '#00000060' : '#00000030' }]} />
      </View>
    </View>
  )
}

// ─── Screen ──────────────────────────────────────────────────────────────────

export default function OnboardingScreen() {
  const { t } = useTranslation('onboarding')
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const isDark = useColorScheme() === 'dark'
  const primaryColor = isDark ? colors.primary.dark : colors.primary.light

  const [currentIndex, setCurrentIndex] = useState(0)
  const flatListRef = useRef<Animated.FlatList<(typeof SLIDES)[number]>>(null)
  const scrollX = useSharedValue(0)

  const isLast = currentIndex === SLIDES.length - 1

  const handleScroll = useAnimatedScrollHandler((e) => {
    scrollX.value = e.contentOffset.x
  })

  const handleMomentumEnd = useCallback(
    (e: { nativeEvent: { contentOffset: { x: number } } }) => {
      setCurrentIndex(Math.round(e.nativeEvent.contentOffset.x / SCREEN_W))
    },
    [],
  )

  const handleNext = useCallback(() => {
    if (isLast) {
      router.replace('/(tabs)/home')
    } else {
      flatListRef.current?.scrollToIndex({ index: currentIndex + 1, animated: true })
    }
  }, [isLast, currentIndex, router])

  const handleSkip = useCallback(() => {
    router.replace('/(tabs)/home')
  }, [router])

  const slideKey = SLIDES[currentIndex]?.key ?? 'slide0'
  const slideTitle = t(`${slideKey}Title`)
  const slideDesc = t(`${slideKey}Desc`)

  const cardAnimStyle = useAnimatedStyle(() => {
    const idx = scrollX.value / SCREEN_W
    return {
      opacity: interpolate(
        Math.abs(idx - Math.round(idx)),
        [0, 0.5],
        [1, 0.7],
        'clamp',
      ),
      transform: [
        {
          translateY: interpolate(
            Math.abs(idx - Math.round(idx)),
            [0, 0.5],
            [0, 8],
            'clamp',
          ),
        },
      ],
    }
  })

  return (
    <View style={[s.root, { backgroundColor: isDark ? '#000' : '#f9fafb' }]}>
      {/* Image slides */}
      <Animated.FlatList
        ref={flatListRef}
        data={SLIDES}
        keyExtractor={(item) => item.key}
        renderItem={({ item }) => <Slide item={item} isDark={isDark} />}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={handleScroll}
        onMomentumScrollEnd={handleMomentumEnd}
        scrollEventThrottle={16}
        bounces={false}
        style={s.flatList}
      />

      {/* Skip button */}
      <Pressable
        onPress={handleSkip}
        hitSlop={8}
        style={[s.skipBtn, { top: insets.top + 16 }]}
      >
        <Text style={[s.skipText, { color: '#fff' }]}>{t('skip')}</Text>
      </Pressable>

      {/* Bottom card */}
      <Animated.View
        style={[
          s.card,
          { backgroundColor: isDark ? colors.gray[900] : '#fff', paddingBottom: insets.bottom + 24 },
          cardAnimStyle,
        ]}
      >
        {/* Text */}
        <Text style={[s.title, { color: isDark ? colors.gray[50] : colors.gray[900] }]}>
          {slideTitle}
        </Text>
        <Text style={[s.desc, { color: isDark ? colors.gray[400] : colors.gray[500] }]}>
          {slideDesc}
        </Text>

        {/* Dots */}
        <View style={s.dots}>
          {SLIDES.map((_, i) => (
            <Dot key={i} active={i === currentIndex} color={primaryColor} />
          ))}
        </View>

        {/* CTA button */}
        <Pressable
          onPress={handleNext}
          style={[s.ctaBtn, { backgroundColor: primaryColor }]}
        >
          <Text style={s.ctaBtnText}>
            {isLast ? t('start') : t('next')}
          </Text>
        </Pressable>

        {/* Terms */}
        {isLast && (
          <View style={s.termsRow}>
            <Text style={[s.termsText, { color: isDark ? colors.gray[500] : colors.gray[400] }]}>
              {t('termsPrefix')}{' '}
            </Text>
            <Pressable onPress={() => Linking.openURL('https://trendcoffee.net/policy')} hitSlop={4}>
              <Text style={[s.termsLink, { color: primaryColor }]}>{t('policy')}</Text>
            </Pressable>
            <Text style={[s.termsText, { color: isDark ? colors.gray[500] : colors.gray[400] }]}>{t('and')}</Text>
            <Pressable onPress={() => Linking.openURL('https://trendcoffee.net/security')} hitSlop={4}>
              <Text style={[s.termsLink, { color: primaryColor }]}>{t('security')}</Text>
            </Pressable>
          </View>
        )}
      </Animated.View>
    </View>
  )
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const IMAGE_H = SCREEN_W * 0.85

const s = StyleSheet.create({
  root: { flex: 1 },
  flatList: { flex: 1 },

  slide: { height: '100%' },
  imageWrap: { width: SCREEN_W, height: IMAGE_H },
  image: { width: '100%', height: '100%' },
  imageOverlay: {
    ...StyleSheet.absoluteFillObject,
  },

  skipBtn: {
    position: 'absolute',
    right: 20,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 99,
    backgroundColor: 'rgba(0,0,0,0.25)',
  },
  skipText: { fontSize: 13, fontWeight: '600' },

  // Bottom card
  card: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 28,
    paddingTop: 28,
    gap: 12,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.06,
        shadowRadius: 16,
      },
      android: { elevation: 12 },
    }),
  },

  title: { fontSize: 26, fontWeight: '800', lineHeight: 34 },
  desc:  { fontSize: 15, lineHeight: 22 },

  dots: { flexDirection: 'row', gap: 6, marginTop: 4 },
  dot: { height: 8, borderRadius: 4 },

  ctaBtn: {
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  ctaBtnText: { fontSize: 16, fontWeight: '700', color: '#fff' },

  termsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 4,
  },
  termsText: { fontSize: 12 },
  termsLink: { fontSize: 12, fontWeight: '600' },
})
