/**
 * CartFooter — subscribe useOrderFlowCartFooterData + useCartDisplayStore.
 * P1: Lấy finalTotal từ cart-display store — không re-render vì là child khi parent đổi orderItems.
 */
import { PHONE_NUMBER_REGEX } from '@/constants'
import { useBranchSlug } from '@/stores/selectors'
import { OrderTypeEnum } from '@/types'
import { ChevronRight, Tag } from 'lucide-react-native'
import React, { lazy, Suspense, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Alert,
  Text,
  TouchableOpacity,
  useColorScheme,
  View,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useShallow } from 'zustand/react/shallow'

import { colors } from '@/constants'
import {
  OrderTypeSelect,
  TableSelect,
} from '@/components/select'
import { Skeleton } from '@/components/ui'
import { printReactProfilerStats } from '@/lib/qa/react-profiler-logger'
import { formatCurrency } from '@/utils'

import { useCartDisplayStore } from '@/stores'
import { useOrderFlowCartFooterData } from '@/stores/selectors'

const LazyCreateOrderDialog = lazy(() =>
  import('@/components/dialog/create-order-dialog').then((m) => ({
    default: m.default,
  })),
)

export type CartFooterProps = {
  /** Phí giao hàng — từ useCalculateDeliveryFee của parent */
  deliveryFee?: number
  voucherDisplayText: string
  footerContentReady: boolean
  footerBarReady: boolean
  fetchOrderTypeEnabled: boolean
  onBeforeOpenOrderType: () => void
  onBeforeOpenTable: () => void
  onVoucherPress: () => void
  /** true = sheet mở bằng openOnMount (lazy load), không import sheet từ trigger */
  useMountOpenForSheets?: boolean
}

export const CartFooter = React.memo(function CartFooter({
  deliveryFee = 0,
  voucherDisplayText,
  footerContentReady,
  footerBarReady,
  fetchOrderTypeEnabled,
  onBeforeOpenOrderType,
  onBeforeOpenTable,
  onVoucherPress,
  useMountOpenForSheets = false,
}: CartFooterProps) {
  const { t } = useTranslation('menu')
  const insets = useSafeAreaInsets()
  const isDark = useColorScheme() === 'dark'
  const primaryColor = isDark ? colors.primary.dark : colors.primary.light

  const { rawSubTotal, cartTotals } = useCartDisplayStore(
    useShallow((s) => ({
      rawSubTotal: s.rawSubTotal,
      cartTotals: s.cartTotals,
    })),
  )
  const finalTotal = useMemo(
    () => (cartTotals?.finalTotal ?? rawSubTotal) + deliveryFee,
    [cartTotals?.finalTotal, rawSubTotal, deliveryFee],
  )

  const {
    type: orderType,
    table: orderTable,
    deliveryPhone: orderDeliveryPhone,
    deliveryAddress: orderDeliveryAddress,
    orderItemsLength,
  } = useOrderFlowCartFooterData()
  const branchSlug = useBranchSlug()
  const [mountCreateDialog, setMountCreateDialog] = useState(false)

  const isOrderReady = useMemo(() => {
    if (orderItemsLength === 0) return false
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
    orderItemsLength,
    orderType,
    orderTable,
    orderDeliveryPhone,
    orderDeliveryAddress,
    branchSlug,
  ])

  const footerStyle = {
    paddingBottom: Math.max(insets.bottom, 16) + 8,
    paddingTop: 12,
  }

  const handlePrintProfilerStats = () => {
    printReactProfilerStats()
    Alert.alert('Profiler', 'Da in React Profiler stats ra log.')
  }

  if (!footerBarReady) return null

  return (
    <View
      className="absolute bottom-0 left-0 right-0 border-t border-gray-200 bg-white px-4 dark:border-gray-700 dark:bg-gray-800"
      style={footerStyle}
    >
      <View className="mb-3 flex-row gap-3">
        {footerContentReady ? (
          <>
            <View className="min-w-0 flex-1">
              <OrderTypeSelect
                fetchEnabled={fetchOrderTypeEnabled}
                onBeforeOpen={onBeforeOpenOrderType}
                useMountOpen={useMountOpenForSheets}
              />
            </View>
            {orderType === OrderTypeEnum.AT_TABLE && (
              <View className="min-w-0 flex-1">
                <TableSelect
                  onBeforeOpen={onBeforeOpenTable}
                  useMountOpen={useMountOpenForSheets}
                />
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
        onPress={onVoucherPress}
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
        <TouchableOpacity
          className="flex-col"
          activeOpacity={0.9}
          delayLongPress={250}
          onLongPress={handlePrintProfilerStats}
        >
          <Text className="text-xs text-gray-500">
            {t('order.totalPayment')}
          </Text>
          <Text className="text-xl font-bold text-gray-900 dark:text-white" numberOfLines={1}>
            {formatCurrency(finalTotal)}
          </Text>
        </TouchableOpacity>

        <View className="ml-4">
          {mountCreateDialog ? (
            <Suspense fallback={<Skeleton className="h-12 w-28 rounded-full" />}>
              <LazyCreateOrderDialog
                disabled={!isOrderReady}
                fullWidthButton={false}
                lightButton
                autoOpenOnMount
              />
            </Suspense>
          ) : (
            <TouchableOpacity
              disabled={!isOrderReady}
              onPress={() => setMountCreateDialog(true)}
              activeOpacity={0.8}
              className={`flex flex-row items-center justify-center gap-2 rounded-full bg-primary px-6 py-3 text-sm ${
                !isOrderReady ? 'opacity-50' : ''
              }`}
            >
              <Text className="font-medium text-white">
                {t('order.create')}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  )
})
