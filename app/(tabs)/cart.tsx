/**
 * Tab Cart — Danh sách món trong giỏ, ghi chú, loại đơn, bàn, voucher, tổng tiền, đặt món.
 */
import { ScreenContainer } from '@/components/layout'
import {
  APPLICABILITY_RULE,
  colors,
  PHONE_NUMBER_REGEX,
  publicFileURL,
  Role,
  VOUCHER_TYPE,
} from '@/constants'
import {
  useCalculateDeliveryFee,
  useRunAfterTransition,
} from '@/hooks'
import { consumeFromProductDetail } from '@/lib/navigation'
import { useBranchStore, useOrderFlowStore, useUserStore } from '@/stores'
import {
  useOrderFlowCreateOrder,
  useOrderFlowDeleteCartItem,
} from '@/stores/selectors'
import { OrderTypeEnum, type IProductVariant } from '@/types'
import {
  calculateCartItemDisplay,
  calculateCartTotals,
  formatCurrency,
  parseKm,
} from '@/utils'
import { useRouter } from 'expo-router'
import {
  ChevronLeft,
  ChevronRight,
  ShoppingCart,
  Tag,
  Trash2,
} from 'lucide-react-native'
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { ImageSourcePropType } from 'react-native'
import {
  FlatList,
  Image,
  Text,
  TouchableOpacity,
  useColorScheme,
  View,
} from 'react-native'
import Animated, {
  LinearTransition,
  SlideOutLeft,
} from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { Images } from '@/assets/images'
import {
  CartItemQuantityControl,
  CartSkeleton,
  ClearCartBottomSheet,
  OrderNoteInput,
  SwipeableCartItem,
} from '@/components/cart'
import { CreateOrderDialog } from '@/components/dialog'
import { CartNoteInput } from '@/components/input'
import {
  OrderTypeSelect,
  OrderTypeSheet,
  ProductVariantSheet,
  TableSelect,
  TableSelectSheet,
} from '@/components/select'
import VoucherListDrawer from '@/components/sheet/voucher-list-drawer'
import { TAB_ROUTES } from '@/constants/navigation.config'
import { cn } from '@/utils/cn'

const CART_ITEM_LAYOUT = LinearTransition.springify().damping(28).stiffness(280)
const CART_ITEM_EXIT = SlideOutLeft.duration(180)
const EMPTY_ORDER_ITEMS: never[] = []

export default function CartScreen() {
  const { t } = useTranslation('menu')
  const { t: tVoucher } = useTranslation('voucher')
  const isDark = useColorScheme() === 'dark'
  const insets = useSafeAreaInsets()
  const router = useRouter()
  const primaryColor = isDark ? colors.primary.dark : colors.primary.light
  const primaryColorStyle = useMemo(
    () => ({ color: primaryColor }),
    [primaryColor],
  )

  const { orderingData } = useOrderFlowCreateOrder()
  const order = orderingData
  const branch = useBranchStore((s) => s.branch)
  const userInfo = useUserStore((s) => s.userInfo)
  const branchSlug =
    !userInfo || userInfo.role?.name === Role.CUSTOMER
      ? branch?.slug
      : userInfo.branch?.slug

  const voucher = order?.voucher ?? null
  const displayItems = useMemo(
    () => calculateCartItemDisplay(order ?? null, voucher),
    [order, voucher],
  )
  const cartTotals = useMemo(
    () => calculateCartTotals(displayItems, voucher),
    [displayItems, voucher],
  )
  const displayItemsMap = useMemo(() => {
    const map = new Map<string, (typeof displayItems)[number]>()
    for (const d of displayItems) {
      if (!map.has(d.slug)) map.set(d.slug, d)
    }
    return map
  }, [displayItems])
  const [contentReady, setContentReady] = useState(false)
  const fromProductDetail = consumeFromProductDetail()
  useRunAfterTransition(() => setContentReady(true), [], {
    androidDelayMs: fromProductDetail ? 400 : 50,
  })

  // B1: Chỉ fetch delivery fee khi contentReady + loại DELIVERY + đã có khoảng cách
  const deliveryDistance = parseKm(order?.deliveryDistance) ?? 0
  const shouldFetchDeliveryFee =
    contentReady &&
    order?.type === OrderTypeEnum.DELIVERY &&
    deliveryDistance > 0 &&
    !!(branchSlug ?? '')
  const deliveryFee = useCalculateDeliveryFee(
    deliveryDistance,
    branchSlug ?? '',
    { enabled: shouldFetchDeliveryFee },
  )
  const finalTotal =
    (cartTotals?.finalTotal ?? 0) + (deliveryFee?.deliveryFee ?? 0)
  const orderItems = useMemo(
    () => order?.orderItems ?? EMPTY_ORDER_ITEMS,
    [order?.orderItems],
  )

  const setOrderingDescription = useOrderFlowStore(
    (s) => s.setOrderingDescription,
  )
  const addItemNote = useOrderFlowStore((s) => s.addNote)
  const { removeOrderingItem, getCartItems, removeVoucher } =
    useOrderFlowDeleteCartItem()
  const [undoItem, setUndoItem] = useState<(typeof orderItems)[number] | null>(
    null,
  )
  const [showProductVariantSheet, setShowProductVariantSheet] = useState(false)
  const [showClearCartSheet, setShowClearCartSheet] = useState(false)
  const [sheetsReady, setSheetsReady] = useState(false)
  const [footerReady, setFooterReady] = useState(false)
  const [fetchOrderTypeEnabled, setFetchOrderTypeEnabled] = useState(false)
  const undoTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Stagger mount sheets 150ms sau contentReady — sẵn sàng khi user tap (lazy mount gây lỗi không mở)
  useEffect(() => {
    if (!contentReady) return
    const id = setTimeout(() => setSheetsReady(true), 150)
    return () => clearTimeout(id)
  }, [contentReady])

  // Defer OrderNoteInput 150ms sau contentReady — giảm Textarea/InternalTextInput cost khi Cart mount (Profiler: 4.4ms)
  useEffect(() => {
    if (!contentReady) return
    const id = setTimeout(() => setFooterReady(true), 150)
    return () => clearTimeout(id)
  }, [contentReady])

  // B2: Stagger fetch order type options 200ms sau contentReady
  useEffect(() => {
    if (!contentReady) return
    const id = setTimeout(() => setFetchOrderTypeEnabled(true), 200)
    return () => clearTimeout(id)
  }, [contentReady])
  const handleOrderNoteChange = useCallback(
    (text: string) => setOrderingDescription(text),
    [setOrderingDescription],
  )

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back()
    } else {
      router.replace(TAB_ROUTES.MENU)
    }
  }

  const handleOpenClearCart = () => {
    setShowClearCartSheet(true)
    setTimeout(() => {
      if (
        typeof (ClearCartBottomSheet as { open?: () => void }).open === 'function'
      ) {
        ;(ClearCartBottomSheet as { open: () => void }).open()
      }
    }, 50)
  }

  const handleDeleteCartItem = useCallback(
    (item: (typeof orderItems)[number]) => {
      const cartItems = getCartItems()
      if (cartItems) {
        const { orderItems: items } = cartItems
        if (items.length === 1) {
          removeVoucher()
        }
      }

      setUndoItem(item)
      if (undoTimeoutRef.current) {
        clearTimeout(undoTimeoutRef.current)
      }
      undoTimeoutRef.current = setTimeout(() => {
        setUndoItem(null)
        undoTimeoutRef.current = null
      }, 5000)

      removeOrderingItem(item.id)
    },
    [getCartItems, removeVoucher, removeOrderingItem],
  )

  const handleDeleteCartItemById = useCallback(
    (itemId?: string) => {
      if (!itemId) return
      const item = orderItems.find((i) => i.id === itemId)
      if (item) handleDeleteCartItem(item)
    },
    [orderItems, handleDeleteCartItem],
  )

  const handleUndoDelete = () => {
    if (!undoItem) return
    if (undoTimeoutRef.current) {
      clearTimeout(undoTimeoutRef.current)
      undoTimeoutRef.current = null
    }
    // Thêm lại item vào giỏ (cập nhật lạc quan)
    useOrderFlowStore.getState().addOrderingItem(undoItem)
    setUndoItem(null)
  }

  const renderHeader = () => (
    <View className="border-b border-gray-200 bg-white dark:bg-gray-900">
      <View className="flex-row items-center px-4 py-3">
        {/* Cột trái: nút back, width cố định để tiêu đề luôn ở giữa */}
        <View className="h-12 w-12 items-center justify-center rounded-full bg-muted-foreground/5">
          <TouchableOpacity onPress={handleBack} className="p-1" hitSlop={8}>
            <ChevronLeft size={24} color={colors.mutedForeground.light} />
          </TouchableOpacity>
        </View>

        {/* Tiêu đề giữa, flex-1 + text-center */}
        <Text className="flex-1 text-center text-base font-semibold text-gray-900">
          {t('tabs.cart', 'Giỏ hàng')} ({orderItems.length})
        </Text>

        {/* Cột phải: nút xoá hết, width cố định, canh phải */}
        <View className="w-fit items-end">
          <TouchableOpacity
            onPress={handleOpenClearCart}
            activeOpacity={0.9}
            className="h-12 w-12 flex-row items-center justify-center gap-1 rounded-full bg-destructive/5 px-3 py-1"
          >
            <Trash2 size={14} color={colors.destructive.light} />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  )

  const handleVoucherPress = () => {
    const drawer = VoucherListDrawer as { open?: () => void }
    if (typeof drawer.open === 'function') {
      drawer.open()
    }
  }

  const handleOpenProductVariantSheet = useCallback((itemId: string) => {
    const sheet = ProductVariantSheet as { openForItem?: (id: string) => void }
    if (typeof sheet.openForItem === 'function') {
      sheet.openForItem(itemId) // Sets pendingItemId nếu sheet chưa mount
    }
    setShowProductVariantSheet(true) // Lazy mount — giữ mounted để openForItem hoạt động lần sau
  }, [])

  const handleBackToMenu = () => {
    router.replace(TAB_ROUTES.MENU)
  }

  const renderCartItem = useCallback(
    ({ item }: { item: (typeof orderItems)[number] }) => {
      const displayItem = displayItemsMap.get(item.slug)
      const originalUnit = item.originalPrice ?? 0
      const finalUnit = displayItem?.finalPrice ?? item.originalPrice ?? 0
      const original = originalUnit * item.quantity
      const finalPrice = finalUnit * item.quantity
      const hasDiscount = original > finalPrice
      const hasPromotion = (displayItem?.promotionDiscount ?? 0) > 0
      const hasAnyDiscount = hasDiscount || hasPromotion

      return (
        <Animated.View layout={CART_ITEM_LAYOUT} exiting={CART_ITEM_EXIT}>
          <View className="bg-transparent px-4 py-2">
            <SwipeableCartItem
              itemId={item.id}
              onDelete={handleDeleteCartItemById}
            >
              <View className="overflow-hidden rounded-xl bg-white dark:bg-gray-900">
                <View className="flex-row gap-3 p-3">
                  <View className="h-24 w-24 overflow-hidden rounded-lg bg-gray-200 dark:bg-gray-700">
                    <Image
                      source={
                        (item?.image
                          ? {
                              uri: `${publicFileURL}/${item.image}`,
                            }
                          : Images.Food.ProductImage) as ImageSourcePropType
                      }
                      className="h-full w-full"
                      resizeMode="cover"
                    />
                  </View>
                  <View className="flex-1">
                    <View className="flex-row items-start justify-between gap-2">
                      <Text
                        className="flex-1 text-sm font-semibold text-gray-900 dark:text-white"
                        numberOfLines={2}
                      >
                        {item.name}
                      </Text>
                    </View>
                    <View className="mt-1 flex-row items-center">
                      <TouchableOpacity
                        activeOpacity={0.8}
                        className="rounded-full border border-gray-300 bg-white px-3 py-1 dark:border-gray-600 dark:bg-gray-900"
                        onPress={() => {
                          const variants = (item.allVariants ||
                            []) as IProductVariant[]
                          if (!variants.length) return
                          handleOpenProductVariantSheet(item.id)
                        }}
                      >
                        <Text className="text-xs font-medium text-gray-700 dark:text-gray-200">
                          {(item.variant as { size?: { name?: string } })?.size
                            ?.name ??
                            item.size ??
                            t('product.selectSize', 'Chọn size')}
                        </Text>
                      </TouchableOpacity>
                    </View>
                    <View className="mt-2 flex-row items-end justify-between">
                      <View className="flex-row">
                        {hasAnyDiscount ? (
                          <>
                            <Text
                              className="text-base font-bold"
                              style={primaryColorStyle}
                            >
                              {formatCurrency(finalPrice)}
                            </Text>
                            <View className="mt-0.5 flex-row items-center gap-2">
                              <Text className="text-xs text-gray-500 line-through dark:text-gray-400">
                                {formatCurrency(original)}
                              </Text>
                              {hasPromotion && (
                                <View className="rounded-full bg-amber-100 px-2 py-0.5 dark:bg-amber-900/40">
                                  <Text className="text-[10px] font-semibold text-amber-700 dark:text-amber-200">
                                    {t('product.specialOffer', 'Khuyến mãi')}
                                  </Text>
                                </View>
                              )}
                            </View>
                          </>
                        ) : (
                          <Text
                            className="text-base font-bold"
                            style={primaryColorStyle}
                          >
                            {formatCurrency(original)}
                          </Text>
                        )}
                      </View>
                      <View className="ml-4">
                        <CartItemQuantityControl orderItem={item} />
                      </View>
                    </View>
                  </View>
                </View>
                <View className="border-t border-gray-100 px-3 pb-3 pt-2 dark:border-gray-700">
                  <CartNoteInput
                    value={item.note ?? ''}
                    onChange={(text) => addItemNote(item.id, text)}
                  />
                </View>
              </View>
            </SwipeableCartItem>
          </View>
        </Animated.View>
      )
    },
    [
      displayItemsMap,
      handleDeleteCartItemById,
      addItemNote,
      handleOpenProductVariantSheet,
      primaryColorStyle,
      t,
    ],
  )

  const renderListFooter = useCallback(
    () => (
      <>
        <View className="mt-2 border-t border-gray-200 bg-white p-4">
          <Text className="mb-2 text-sm font-semibold text-gray-900">
            {t('order.orderNote')}
          </Text>
          {footerReady ? (
            <OrderNoteInput
              value={order?.description ?? ''}
              onChange={handleOrderNoteChange}
            />
          ) : (
            <View className="min-h-[60px]" />
          )}
        </View>
      </>
    ),
    [order?.description, handleOrderNoteChange, t, footerReady],
  )

  const isOrderReady = (() => {
    if (!order || orderItems.length === 0) return false
    if (!branchSlug) return false

    if (order.type === OrderTypeEnum.AT_TABLE) {
      return !!order.table
    }

    if (order.type === OrderTypeEnum.DELIVERY) {
      const phoneOk =
        !!order.deliveryPhone && PHONE_NUMBER_REGEX.test(order.deliveryPhone)
      return !!order.deliveryAddress && phoneOk
    }

    return true
  })()

  if (!order || orderItems.length === 0) {
    return (
      <ScreenContainer
        edges={['top', 'bottom']}
        className={cn('flex-1', isDark ? 'bg-gray-900' : colors.background.light)}
      >
        {renderHeader()}
        <View className="flex-1 items-center justify-center px-6">
          <View
            className="mb-6 h-28 w-28 items-center justify-center rounded-full"
            style={{ backgroundColor: 'rgba(247, 167, 55, 0.12)' }}
          >
            <ShoppingCart size={56} color={primaryColor} />
          </View>
          <Text className="mb-2 text-center text-lg font-semibold text-gray-900 dark:text-white">
            {t('cart.emptyTitle', 'Giỏ hàng trống')}
          </Text>
          <Text className="mb-8 text-center text-sm text-gray-500 dark:text-gray-400">
            {t('cart.emptyDescription', 'Thêm món từ thực đơn để đặt hàng')}
          </Text>
          <TouchableOpacity
            onPress={handleBackToMenu}
            className="rounded-xl px-8 py-4"
            style={{ backgroundColor: primaryColor }}
          >
            <Text className="font-semibold text-white">
              {t('cart.viewMenu', 'Xem thực đơn')}
            </Text>
          </TouchableOpacity>
        </View>
      </ScreenContainer>
    )
  }

  // Defer mount nội dung nặng (FlatList, footer, sheets) sau transition — giảm spike Product Detail → Cart
  if (!contentReady) {
    return (
      <ScreenContainer
        edges={['top', 'bottom']}
        className={cn('flex-1', isDark ? 'bg-gray-900' : colors.background.light)}
      >
        {renderHeader()}
        <CartSkeleton isDark={isDark} />
      </ScreenContainer>
    )
  }

  return (
    <ScreenContainer
      edges={['top', 'bottom']}
      className={cn('flex-1', isDark ? 'bg-gray-900' : colors.background.light)}
    >
      {renderHeader()}
      <FlatList
        data={orderItems}
        keyExtractor={(item) => item.id}
        renderItem={renderCartItem}
        ListFooterComponent={renderListFooter}
        contentContainerStyle={{
          paddingBottom: Math.max(insets.bottom, 16) + 180,
        }}
        showsVerticalScrollIndicator
        initialNumToRender={2}
        maxToRenderPerBatch={2}
        windowSize={5}
        removeClippedSubviews
      />

      {undoItem && (
        <View className="absolute bottom-24 left-4 right-4 rounded-full bg-gray-900/95 px-4 py-3">
          <View className="flex-row items-center justify-between">
            <Text className="flex-1 text-sm text-white" numberOfLines={2}>
              {t('cart.itemRemoved', 'Đã xoá 1 món khỏi giỏ hàng')}
            </Text>
            <TouchableOpacity onPress={handleUndoDelete} className="ml-4">
              <Text className="text-sm font-semibold text-amber-300">
                {t('cart.undo', 'Hoàn tác')}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Footer cố định: Loại đơn, bàn, voucher, tổng tiền + nút đặt món */}
      <View
        className="absolute bottom-0 left-0 right-0 border-t border-gray-200 bg-white px-4 dark:border-gray-700 dark:bg-gray-800"
        style={{
          paddingBottom: Math.max(insets.bottom, 16) + 8,
          paddingTop: 12,
        }}
      >
        {/* Loại đơn + Bàn */}
        <View className="mb-3 flex-row gap-3">
          <View className="min-w-0 flex-1">
            <OrderTypeSelect fetchEnabled={fetchOrderTypeEnabled} />
          </View>
          {order?.type === OrderTypeEnum.AT_TABLE && (
            <View className="min-w-0 flex-1">
              <TableSelect />
            </View>
          )}
        </View>

        {/* Voucher */}
        <TouchableOpacity
          onPress={handleVoucherPress}
          className="flex-row items-center justify-between rounded-xl border border-dashed border-gray-300 bg-white px-4 py-3 active:bg-gray-50"
          activeOpacity={0.9}
        >
          <View className="flex-row items-center gap-2">
            <Tag size={20} color={primaryColor} />
            <Text className="text-sm font-medium text-gray-900">
              {voucher
                ? (() => {
                    const { type, value, applicabilityRule: rule } = voucher
                    const discountText =
                      type === VOUCHER_TYPE.PERCENT_ORDER
                        ? tVoucher('voucher.percentDiscount', { value })
                        : type === VOUCHER_TYPE.FIXED_VALUE
                          ? tVoucher('voucher.fixedDiscount', {
                              value: formatCurrency(value),
                            })
                          : type === VOUCHER_TYPE.SAME_PRICE_PRODUCT
                            ? tVoucher('voucher.samePriceProduct', {
                                value: formatCurrency(value),
                              })
                            : ''
                    const ruleText =
                      rule === APPLICABILITY_RULE.ALL_REQUIRED
                        ? tVoucher(
                            type === VOUCHER_TYPE.SAME_PRICE_PRODUCT
                              ? 'voucher.requireAllSamePrice'
                              : type === VOUCHER_TYPE.PERCENT_ORDER
                                ? 'voucher.requireAllPercent'
                                : 'voucher.requireAllFixed',
                          )
                        : tVoucher(
                            type === VOUCHER_TYPE.SAME_PRICE_PRODUCT
                              ? 'voucher.requireAtLeastOneSamePrice'
                              : type === VOUCHER_TYPE.PERCENT_ORDER
                                ? 'voucher.requireAtLeastOnePercent'
                                : 'voucher.requireAtLeastOneFixed',
                          )
                    return `${discountText} ${ruleText}`
                  })()
                : t('cart.applyVoucher', 'Áp dụng voucher')}
            </Text>
          </View>
          <ChevronRight size={20} color="#9ca3af" />
        </TouchableOpacity>

        {/* Tổng tiền + nút đặt món */}
        <View className="mt-3 flex-row items-center justify-between">
          <View className="flex-col">
            <Text className="text-xs text-gray-500">
              {t('order.totalPayment')}
            </Text>
            <Text className="text-xl font-bold text-gray-900" numberOfLines={1}>
              {formatCurrency(finalTotal)}
            </Text>
          </View>

          <View className="ml-4">
            <CreateOrderDialog
              disabled={!isOrderReady}
              fullWidthButton={false}
              lightButton
            />
          </View>
        </View>
      </View>

      {/* Sheet chọn bàn — mount khi sheetsReady (150ms sau contentReady) */}
      {sheetsReady && order?.type === OrderTypeEnum.AT_TABLE && branchSlug && (
        <TableSelectSheet branchSlug={branchSlug} />
      )}

      {/* Sheet chọn loại đơn — mount khi sheetsReady */}
      {sheetsReady && <OrderTypeSheet fetchEnabled={fetchOrderTypeEnabled} />}

      {/* Sheet chọn size — lazy mount khi user tap chọn size */}
      {showProductVariantSheet && <ProductVariantSheet />}

      {/* Voucher drawer — mount khi sheetsReady (giống TableSelectSheet) để open() luôn hoạt động ổn định */}
      {sheetsReady && <VoucherListDrawer />}

      {/* Bottom sheet xác nhận xoá toàn bộ giỏ hàng — lazy: chỉ mount khi user tap nút xoá hết */}
      {showClearCartSheet && <ClearCartBottomSheet />}
    </ScreenContainer>
  )
}
