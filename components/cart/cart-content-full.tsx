/**
 * CartContentFull — Phase 2, mount sau delay.
 * Chứa: FlashList, useQuery, BottomSheet, logic tính toán.
 * Chỉ mount khi phase2Ready — tránh spike frame đầu.
 */
import { ScreenContainer } from '@/components/layout'
import {
  APPLICABILITY_RULE,
  colors,
  PHONE_NUMBER_REGEX,
  Role,
  VOUCHER_TYPE,
} from '@/constants'
import { useCalculateDeliveryFee } from '@/hooks'
import { useOrderFlowStore, useUserStore } from '@/stores'
import { useBranchSlug, useOrderFlowDeleteCartItem } from '@/stores/selectors'
import { OrderTypeEnum } from '@/types'
import {
  calculateCartItemDisplay,
  calculateCartTotals,
  formatCurrency,
  parseKm,
} from '@/utils'
import { useIsFocused } from '@react-navigation/native'
import { ChevronRight, ShoppingCart, Tag } from 'lucide-react-native'
import React, {
  startTransition,
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { useTranslation } from 'react-i18next'
import { Text, TouchableOpacity, useColorScheme, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useDebounce } from 'use-debounce'
import { useShallow } from 'zustand/react/shallow'

import {
  CartHeaderBlur,
  CartList,
  ClearCartBottomSheet,
  useCartHeaderHeight,
} from '@/components/cart'
import { CreateOrderDialog } from '@/components/dialog'
import {
  OrderTypeSelect,
  OrderTypeSheet,
  ProductVariantSheet,
  TableSelect,
  TableSelectSheet,
} from '@/components/select'
import VoucherListDrawer from '@/components/sheet/voucher-list-drawer'
import { Skeleton } from '@/components/ui'
import { cn } from '@/utils/cn'

const EMPTY_ORDER_ITEMS: never[] = []

export type CartContentFullProps = {
  onBack: () => void
  onBackToMenu: () => void
}

export function CartContentFull({
  onBack,
  onBackToMenu,
}: CartContentFullProps) {
  const { t } = useTranslation('menu')
  const { t: tVoucher } = useTranslation('voucher')
  const isDark = useColorScheme() === 'dark'
  const insets = useSafeAreaInsets()
  const isFocused = useIsFocused()
  const primaryColor = isDark ? colors.primary.dark : colors.primary.light
  const primaryColorStyle = useMemo(
    () => ({ color: primaryColor }),
    [primaryColor],
  )

  const shouldRender = isFocused
  /** Một subscription + useShallow — giảm số listener Zustand so với nhiều useOrderFlowStore riêng. */
  const {
    orderItems,
    voucher,
    type: orderType,
    deliveryDistance: orderDeliveryDistance,
    table: orderTable,
    deliveryPhone: orderDeliveryPhone,
    deliveryAddress: orderDeliveryAddress,
  } = useOrderFlowStore(
    useShallow((s) => {
      const d = s.orderingData
      return {
        orderItems: d?.orderItems ?? EMPTY_ORDER_ITEMS,
        voucher: d?.voucher ?? null,
        type: d?.type,
        deliveryDistance: d?.deliveryDistance,
        table: d?.table,
        deliveryPhone: d?.deliveryPhone,
        deliveryAddress: d?.deliveryAddress,
      }
    }),
  )

  const branchSlugFromBranch = useBranchSlug()
  const { hasUser, roleName, userBranchSlug } = useUserStore(
    useShallow((s) => ({
      hasUser: !!s.userInfo,
      roleName: s.userInfo?.role?.name,
      userBranchSlug: s.userInfo?.branch?.slug,
    })),
  )
  const branchSlug = useMemo(
    () =>
      !hasUser || roleName === Role.CUSTOMER
        ? branchSlugFromBranch
        : userBranchSlug,
    [hasUser, roleName, branchSlugFromBranch, userBranchSlug],
  )

  const [deliveryFeeFetchEnabled, setDeliveryFeeFetchEnabled] = useState(false)

  const [phase, setPhase] = useState({
    footerReady: false,
    fetchOrderTypeEnabled: false,
    listReady: false,
    footerContentReady: false,
    footerBarReady: false,
    sheetsReady: false,
  })

  const [heavyCalcReady, setHeavyCalcReady] = useState(false)

  const orderItemsCount = orderItems.length
  const deferredOrderItems = useDeferredValue(orderItems)
  const orderItemsForDisplay =
    orderItemsCount > 15 ? deferredOrderItems : orderItems
  // T8: Debounce 80ms cho display calculation — giảm recalc khi user bấm +/− nhanh
  const [debouncedOrderItemsForDisplay] = useDebounce(orderItemsForDisplay, 80)
  const cartItemsForDisplay = useMemo(
    () =>
      shouldRender && heavyCalcReady && debouncedOrderItemsForDisplay.length > 0
        ? ({ orderItems: debouncedOrderItemsForDisplay } as Parameters<
            typeof calculateCartItemDisplay
          >[0])
        : null,
    [shouldRender, heavyCalcReady, debouncedOrderItemsForDisplay],
  )
  const displayItems = useMemo(
    () =>
      shouldRender && cartItemsForDisplay
        ? calculateCartItemDisplay(cartItemsForDisplay, voucher)
        : [],
    [shouldRender, cartItemsForDisplay, voucher],
  )
  const cartTotals = useMemo(
    () =>
      shouldRender && heavyCalcReady
        ? calculateCartTotals(displayItems, voucher)
        : {
            subTotalBeforeDiscount: 0,
            promotionDiscount: 0,
            voucherDiscount: 0,
            finalTotal: 0,
          },
    [shouldRender, heavyCalcReady, displayItems, voucher],
  )

  const deliveryDistance = useMemo(
    () => parseKm(orderDeliveryDistance) ?? 0,
    [orderDeliveryDistance],
  )
  const shouldFetchDeliveryFee =
    shouldRender &&
    deliveryFeeFetchEnabled &&
    orderType === OrderTypeEnum.DELIVERY &&
    deliveryDistance > 0 &&
    !!(branchSlug ?? '')
  const deliveryFee = useCalculateDeliveryFee(
    deliveryDistance,
    branchSlug ?? '',
    { enabled: shouldFetchDeliveryFee },
  )
  const finalTotal = useMemo(
    () => (cartTotals?.finalTotal ?? 0) + (deliveryFee?.deliveryFee ?? 0),
    [cartTotals?.finalTotal, deliveryFee?.deliveryFee],
  )

  const { removeOrderingItem, getCartItems, removeVoucher } =
    useOrderFlowDeleteCartItem()
  const [undoItem, setUndoItem] = useState<(typeof orderItems)[number] | null>(
    null,
  )
  const [showProductVariantSheet, setShowProductVariantSheet] = useState(false)
  /** Chỉ mount 1 sheet tại 1 thời điểm — tránh xung đột nhiều BottomSheet (gorhom #2429). */
  const [activeSheet, setActiveSheet] = useState<
    'orderType' | 'table' | 'voucher' | 'clear' | null
  >(null)

  const {
    footerReady,
    fetchOrderTypeEnabled,
    listReady,
    footerContentReady,
    footerBarReady,
    sheetsReady,
  } = phase
  const undoTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const voucherDisplayText = useMemo(() => {
    if (!footerContentReady) return t('cart.applyVoucher', 'Áp dụng voucher')
    if (!voucher) return t('cart.applyVoucher', 'Áp dụng voucher')
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
  }, [voucher, tVoucher, t, footerContentReady])

  // Gộp phase: heavyCalcReady + listReady — data và list xuất hiện cùng lúc, tránh white flash
  // Tối giản delay để chuyển nhanh (tham khảo Profile → thông tin) — slide 250ms
  useEffect(() => {
    const t1 = setTimeout(
      () =>
        setPhase((p) => ({
          ...p,
          footerReady: true,
          fetchOrderTypeEnabled: true,
        })),
      150,
    )
    const t2 = setTimeout(
      () =>
        startTransition(() => {
          setHeavyCalcReady(true)
          setPhase((p) => ({
            ...p,
            listReady: true,
            footerContentReady: true,
            footerBarReady: true,
          }))
        }),
      280,
    )
    const t3 = setTimeout(
      () =>
        setPhase((p) => ({
          ...p,
          sheetsReady: true,
        })),
      350,
    )
    const t4 = setTimeout(() => setDeliveryFeeFetchEnabled(true), 350)
    return () => {
      clearTimeout(t1)
      clearTimeout(t2)
      clearTimeout(t3)
      clearTimeout(t4)
    }
  }, [])

  // T4: Cleanup undo timeout khi unmount — tránh memory leak
  useEffect(() => {
    return () => {
      if (undoTimeoutRef.current) {
        clearTimeout(undoTimeoutRef.current)
        undoTimeoutRef.current = null
      }
    }
  }, [])

  const handleOpenClearCart = () => {
    setActiveSheet('clear')
    const sheet = ClearCartBottomSheet as { open?: () => void }
    if (typeof sheet.open === 'function') sheet.open()
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
      const cartItems = getCartItems()
      const item = cartItems?.orderItems?.find((i) => i.id === itemId)
      if (item) handleDeleteCartItem(item)
    },
    [getCartItems, handleDeleteCartItem],
  )

  const handleUndoDelete = () => {
    if (!undoItem) return
    if (undoTimeoutRef.current) {
      clearTimeout(undoTimeoutRef.current)
      undoTimeoutRef.current = null
    }
    useOrderFlowStore.getState().addOrderingItem(undoItem)
    setUndoItem(null)
  }

  const headerHeight = useCartHeaderHeight()

  const handleVoucherPress = () => {
    setActiveSheet('voucher')
    const drawer = VoucherListDrawer as { open?: () => void }
    if (typeof drawer.open === 'function') drawer.open()
  }

  const handleOpenProductVariantSheet = useCallback((itemId: string) => {
    const sheet = ProductVariantSheet as { openForItem?: (id: string) => void }
    if (typeof sheet.openForItem === 'function') {
      sheet.openForItem(itemId)
    }
    setShowProductVariantSheet(true)
  }, [])

  const isOrderReady = useMemo(() => {
    if (orderItems.length === 0) return false
    if (!branchSlug) return false

    if (orderType === OrderTypeEnum.AT_TABLE) {
      return !!orderTable
    }

    if (orderType === OrderTypeEnum.DELIVERY) {
      const phoneOk =
        !!orderDeliveryPhone && PHONE_NUMBER_REGEX.test(orderDeliveryPhone)
      return !!orderDeliveryAddress && phoneOk
    }

    return true
  }, [
    orderItems.length,
    orderType,
    orderTable,
    orderDeliveryPhone,
    orderDeliveryAddress,
    branchSlug,
  ])

  const containerClassName = useMemo(
    () => cn('flex-1', isDark ? 'bg-gray-900' : colors.background.light),
    [isDark],
  )

  if (!shouldRender) return null

  if (orderItems.length === 0) {
    return (
      <ScreenContainer edges={['bottom']} className={containerClassName}>
        <CartHeaderBlur
          onBack={onBack}
          onClearCart={handleOpenClearCart}
          orderCount={0}
          isDark={isDark}
        />
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
            onPress={onBackToMenu}
            className="rounded-xl px-8 py-4"
            style={{ backgroundColor: primaryColor }}
          >
            <Text className="font-semibold text-white">
              {t('cart.viewMenu', 'Xem thực đơn')}
            </Text>
          </TouchableOpacity>
        </View>
        {sheetsReady && activeSheet === 'clear' && (
          <ClearCartBottomSheet onClose={() => setActiveSheet(null)} />
        )}
      </ScreenContainer>
    )
  }

  return (
    <ScreenContainer edges={['bottom']} className={containerClassName}>
      <CartHeaderBlur
        onBack={onBack}
        onClearCart={handleOpenClearCart}
        orderCount={orderItems.length}
        isDark={isDark}
      />
      <CartList
        displayItems={displayItems}
        orderItems={orderItems}
        primaryColorStyle={primaryColorStyle}
        t={t}
        paddingBottom={Math.max(insets.bottom, 16) + 180}
        paddingTop={headerHeight}
        footerReady={footerReady}
        listReady={listReady}
        isDark={isDark}
        onDelete={handleDeleteCartItemById}
        onOpenVariantSheet={handleOpenProductVariantSheet}
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

      {footerBarReady ? (
        <View
          className="absolute bottom-0 left-0 right-0 border-t border-gray-200 bg-white px-4 dark:border-gray-700 dark:bg-gray-800"
          style={{
            paddingBottom: Math.max(insets.bottom, 16) + 8,
            paddingTop: 12,
          }}
        >
          <View className="mb-3 flex-row gap-3">
            {footerContentReady ? (
              <>
                <View className="min-w-0 flex-1">
                  <OrderTypeSelect
                    fetchEnabled={fetchOrderTypeEnabled}
                    onBeforeOpen={() => setActiveSheet('orderType')}
                  />
                </View>
                {orderType === OrderTypeEnum.AT_TABLE && (
                  <View className="min-w-0 flex-1">
                    <TableSelect onBeforeOpen={() => setActiveSheet('table')} />
                  </View>
                )}
              </>
            ) : (
              <>
                <Skeleton className="h-11 flex-1 rounded-md" />
                {orderType === OrderTypeEnum.AT_TABLE && (
                  <Skeleton className="h-11 flex-1 rounded-md" />
                )}
              </>
            )}
          </View>

          <TouchableOpacity
            onPress={handleVoucherPress}
            className="flex-row items-center justify-between rounded-xl border border-dashed border-gray-300 bg-white px-4 py-3 active:bg-gray-50"
            activeOpacity={0.9}
          >
            <View className="flex-row items-center gap-2">
              <Tag size={20} color={primaryColor} />
              <Text className="text-sm font-medium text-gray-900 dark:text-white">
                {voucherDisplayText}
              </Text>
            </View>
            <ChevronRight size={20} color="#9ca3af" />
          </TouchableOpacity>

          <View className="mt-3 flex-row items-center justify-between">
            <View className="flex-col">
              <Text className="text-xs text-gray-500">
                {t('order.totalPayment')}
              </Text>
              <Text
                className="text-xl font-bold text-gray-900 dark:text-white"
                numberOfLines={1}
              >
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
      ) : (
        <View
          className="absolute bottom-0 left-0 right-0 border-t border-gray-200 bg-white px-4 dark:border-gray-700 dark:bg-gray-800"
          style={{
            paddingBottom: Math.max(insets.bottom, 16) + 8,
            paddingTop: 12,
          }}
        >
          <View className="mb-3 flex-row gap-3">
            <Skeleton className="h-11 flex-1 rounded-md" />
            {orderType === OrderTypeEnum.AT_TABLE && (
              <Skeleton className="h-11 flex-1 rounded-md" />
            )}
          </View>
          <Skeleton className="h-14 w-full rounded-xl" />
          <View className="mt-3 flex-row items-center justify-between">
            <Skeleton className="h-8 w-24 rounded" />
            <Skeleton className="h-11 w-28 rounded-md" />
          </View>
        </View>
      )}

      {sheetsReady && activeSheet === 'orderType' && (
        <OrderTypeSheet
          fetchEnabled={fetchOrderTypeEnabled}
          onClose={() => setActiveSheet(null)}
        />
      )}

      {sheetsReady &&
        activeSheet === 'table' &&
        orderType === OrderTypeEnum.AT_TABLE &&
        !!branchSlug && (
          <TableSelectSheet
            branchSlug={branchSlug}
            onClose={() => setActiveSheet(null)}
          />
        )}

      {showProductVariantSheet && <ProductVariantSheet />}

      {sheetsReady && activeSheet === 'voucher' && (
        <VoucherListDrawer onClose={() => setActiveSheet(null)} />
      )}

      {sheetsReady && activeSheet === 'clear' && (
        <ClearCartBottomSheet onClose={() => setActiveSheet(null)} />
      )}
    </ScreenContainer>
  )
}
