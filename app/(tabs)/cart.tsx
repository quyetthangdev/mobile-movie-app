/**
 * Tab Cart — Perf UI, defer shell → content sau transition.
 * Header: back (left) + "Giỏ hàng (N)" (center) + clear all (right).
 * Same UI as menu/cart.tsx but as a standalone tab.
 */
import BottomSheet, {
  BottomSheetBackdrop,
  type BottomSheetBackdropProps,
} from '@gorhom/bottom-sheet'
import { BlurView } from 'expo-blur'
import { LinearGradient } from 'expo-linear-gradient'
import { useRouter } from 'expo-router'
import { ChevronLeft, Trash2 } from 'lucide-react-native'
import React, { Suspense, lazy, useCallback, useMemo, useRef, useState } from 'react'
import { Modal, Platform, Pressable, StyleSheet, Text, View, useColorScheme } from 'react-native'
import {
  TouchableOpacity as GHTouchable,
  GestureHandlerRootView,
} from 'react-native-gesture-handler'
import Animated, {
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  type SharedValue,
} from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { colors } from '@/constants'
import { STATIC_TOP_INSET } from '@/constants/status-bar'
import { TAB_ROUTES } from '@/constants/navigation.config'
import { TabScreenLayout } from '@/components/layout'
import { useRunAfterTransition } from '@/hooks'
import { useOrderFlowStore } from '@/stores'
import { useOrderFlowCartItemCount } from '@/stores/selectors'

const CartContent = lazy(() => import('@/components/cart/cart-content'))

// ─── Clear Confirmation Sheet ────────────────────────────────────────────────

function ClearCartSheet({
  visible,
  onClose,
  onConfirm,
  isDark,
}: {
  visible: boolean
  onClose: () => void
  onConfirm: () => void
  isDark: boolean
}) {
  const insets = useSafeAreaInsets()
  const sheetRef = useRef<BottomSheet>(null)
  const snapPoints = useMemo(() => [220 + insets.bottom], [insets.bottom])

  const bgStyle = useMemo(
    () => ({ backgroundColor: isDark ? colors.gray[900] : colors.white.light }),
    [isDark],
  )
  const handleIndicator = useMemo(
    () => ({ backgroundColor: isDark ? colors.gray[600] : colors.gray[300] }),
    [isDark],
  )

  const renderBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop
        {...props}
        disappearsOnIndex={-1}
        appearsOnIndex={0}
        opacity={0.4}
        pressBehavior="close"
      />
    ),
    [],
  )

  const handleChange = useCallback(
    (index: number) => {
      if (index === -1) onClose()
    },
    [onClose],
  )

  const closeSheet = useCallback(() => sheetRef.current?.close(), [])

  const handleConfirmPress = useCallback(() => {
    onConfirm()
    closeSheet()
  }, [onConfirm, closeSheet])

  if (!visible) return null

  return (
    <Modal
      transparent
      visible
      statusBarTranslucent
      animationType="none"
      onRequestClose={closeSheet}
    >
      <GestureHandlerRootView style={{ flex: 1 }}>
        <BottomSheet
          ref={sheetRef}
          index={0}
          snapPoints={snapPoints}
          enablePanDownToClose
          enableContentPanningGesture={false}
          enableHandlePanningGesture
          enableDynamicSizing={false}
          activeOffsetY={[-10, 10]}
          failOffsetX={[-5, 5]}
          backdropComponent={renderBackdrop}
          backgroundStyle={bgStyle}
          handleIndicatorStyle={handleIndicator}
          onChange={handleChange}
        >
          <View style={[confirmStyles.content, { paddingBottom: insets.bottom + 16 }]}>
            <View style={confirmStyles.body}>
              <Trash2 size={32} color={colors.destructive.light} />
              <Text style={[confirmStyles.title, { color: isDark ? colors.gray[50] : colors.gray[900] }]}>
                Xoá giỏ hàng?
              </Text>
              <Text style={[confirmStyles.desc, { color: isDark ? colors.gray[400] : colors.gray[500] }]}>
                Tất cả món trong giỏ sẽ bị xoá và không thể hoàn tác.
              </Text>
            </View>

            <View style={confirmStyles.btnRow}>
              <View style={confirmStyles.btnWrap}>
                <GHTouchable
                  onPress={closeSheet}
                  activeOpacity={0.8}
                  style={[confirmStyles.btn, { backgroundColor: isDark ? colors.gray[700] : colors.gray[100] }]}
                >
                  <Text style={[confirmStyles.btnText, { color: isDark ? colors.gray[50] : colors.gray[700] }]}>
                    Huỷ
                  </Text>
                </GHTouchable>
              </View>
              <View style={confirmStyles.btnWrap}>
                <GHTouchable
                  onPress={handleConfirmPress}
                  activeOpacity={0.8}
                  style={[confirmStyles.btn, { backgroundColor: colors.destructive.light }]}
                >
                  <Text style={[confirmStyles.btnText, { color: colors.white.light }]}>
                    Xoá tất cả
                  </Text>
                </GHTouchable>
              </View>
            </View>
          </View>
        </BottomSheet>
      </GestureHandlerRootView>
    </Modal>
  )
}

const confirmStyles = StyleSheet.create({
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 8,
    justifyContent: 'space-between',
  },
  body: {
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
  },
  desc: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  btnRow: {
    flexDirection: 'row',
    alignSelf: 'stretch',
    gap: 10,
    marginTop: 12,
  },
  btnWrap: {
    flex: 1,
  },
  btn: {
    height: 46,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnText: {
    fontSize: 15,
    fontWeight: '700',
  },
})

// ─── Cart Header (absolute overlay, animated bg) ─────────────────────────────

const HEADER_FADE_DISTANCE = 60

function CartHeader({
  onBack,
  onClearAll,
  itemCount,
  isDark,
  scrollY,
}: {
  onBack: () => void
  onClearAll: () => void
  itemCount: number
  isDark: boolean
  scrollY: SharedValue<number>
}) {
  const pageBg = isDark ? colors.background.dark : colors.background.light
  const gradientColors = useMemo(
    () => [`${pageBg}F0`, `${pageBg}AA`, `${pageBg}00`] as const,
    [pageBg],
  )

  const titleAnimStyle = useAnimatedStyle(() => ({
    opacity: interpolate(scrollY.value, [0, HEADER_FADE_DISTANCE], [0.6, 1], 'clamp'),
  }))

  return (
    <View style={headerStyles.container} pointerEvents="box-none">
      {Platform.OS === 'ios' ? (
        <BlurView
          intensity={20}
          tint={isDark ? 'dark' : 'light'}
          style={StyleSheet.absoluteFill}
        />
      ) : null}
      <LinearGradient
        colors={gradientColors}
        locations={[0, 0.5, 1]}
        style={StyleSheet.absoluteFill}
      />

      <View style={[headerStyles.row, { paddingTop: STATIC_TOP_INSET + 10 }]} pointerEvents="auto">
        <Pressable
          onPress={onBack}
          hitSlop={8}
          style={[
            headerStyles.circleBtn,
            { backgroundColor: isDark ? colors.gray[800] : colors.white.light },
            headerStyles.shadow,
          ]}
        >
          <ChevronLeft size={20} color={isDark ? colors.gray[50] : colors.gray[900]} />
        </Pressable>

        <Animated.Text style={[headerStyles.title, { color: isDark ? colors.gray[50] : colors.gray[900] }, titleAnimStyle]}>
          Giỏ hàng{itemCount > 0 ? ` (${itemCount})` : ''}
        </Animated.Text>

        {itemCount > 0 ? (
          <Pressable
            onPress={onClearAll}
            hitSlop={8}
            style={[headerStyles.circleBtn, headerStyles.deleteBtnBg, headerStyles.shadow]}
          >
            <Trash2 size={16} color={colors.white.light} />
          </Pressable>
        ) : (
          <View style={headerStyles.circleBtn} />
        )}
      </View>
    </View>
  )
}

const headerStyles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 20,
    paddingBottom: 24,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  circleBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteBtnBg: {
    backgroundColor: colors.destructive.light,
  },
  shadow: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 24,
    elevation: 2,
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
  },
})

// ─── Skeleton Shell ──────────────────────────────────────────────────────────

function CartShell({ onBack, isDark, scrollY }: { onBack: () => void; isDark: boolean; scrollY: SharedValue<number> }) {
  return (
    <View style={{ flex: 1, backgroundColor: isDark ? colors.background.dark : colors.background.light }}>
      <CartHeader onBack={onBack} onClearAll={() => {}} itemCount={0} isDark={isDark} scrollY={scrollY} />
      <View style={{ padding: 16, gap: 12 }}>
        <View style={{ height: 88, borderRadius: 14, backgroundColor: isDark ? colors.gray[800] : colors.gray[100] }} />
        <View style={{ height: 88, borderRadius: 14, backgroundColor: isDark ? colors.gray[800] : colors.gray[100] }} />
      </View>
    </View>
  )
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function CartScreen() {
  const router = useRouter()
  const isDark = useColorScheme() === 'dark'
  const itemCount = useOrderFlowCartItemCount()
  const clearCart = useOrderFlowStore((s) => s.clearCart)
  const scrollY = useSharedValue(0)
  const [contentReady, setContentReady] = useState(false)
  const [clearSheetVisible, setClearSheetVisible] = useState(false)

  const showContent = useCallback(() => setContentReady(true), [])
  useRunAfterTransition(showContent, [], { androidDelayMs: 40 })

  const handleBack = useCallback(() => {
    if (router.canGoBack()) router.back()
    else router.replace(TAB_ROUTES.MENU)
  }, [router])

  const handleOpenClearSheet = useCallback(() => setClearSheetVisible(true), [])
  const handleCloseClearSheet = useCallback(() => setClearSheetVisible(false), [])
  const handleConfirmClear = useCallback(() => {
    clearCart()
  }, [clearCart])

  return (
    <TabScreenLayout>
      {contentReady ? (
        <>
          <Suspense fallback={<View style={{ flex: 1 }} />}>
            <CartContent scrollY={scrollY} />
          </Suspense>
          <CartHeader
            onBack={handleBack}
            onClearAll={handleOpenClearSheet}
            itemCount={itemCount}
            isDark={isDark}
            scrollY={scrollY}
          />
        </>
      ) : (
        <CartShell onBack={handleBack} isDark={isDark} scrollY={scrollY} />
      )}

      <ClearCartSheet
        visible={clearSheetVisible}
        onClose={handleCloseClearSheet}
        onConfirm={handleConfirmClear}
        isDark={isDark}
      />
    </TabScreenLayout>
  )
}
