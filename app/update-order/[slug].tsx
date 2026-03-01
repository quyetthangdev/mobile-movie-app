import { useLocalSearchParams, useRouter } from 'expo-router'
import { ArrowLeft, ShoppingCartIcon } from 'lucide-react-native'
import React, { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ScrollView, Text, TouchableOpacity, View } from 'react-native'
import { ScreenContainer } from '@/components/layout'

import { TAB_ROUTES } from '@/constants'
import { useOrderBySlug, useRunAfterTransition } from '@/hooks'
import { useGpuWarmup } from '@/lib/navigation'
import { cn } from '@/lib/utils'
import { navigateNative } from '@/lib/navigation'
import { useBranchStore, useOrderFlowStore, useUserStore } from '@/stores'
import { OrderStatus, OrderTypeEnum } from '@/types'

import OrderCountdownNative from './components/order-countdown-native'
import UpdateOrderContentNative from './components/update-order-content-native'
import UpdateOrderMenus from './components/update-order-menus'
import UpdateOrderSkeleton from './components/update-order-skeleton'

/**
 * Update Order - Phase 2.
 * Shell-first, logic: fetch order, init store, polling, expired.
 */
export default function UpdateOrderScreen() {
  useGpuWarmup()
  const { t } = useTranslation('menu')
  const { slug } = useLocalSearchParams<{ slug: string }>()
  const [allowFetch, setAllowFetch] = useState(false)
  const [isExpired, setIsExpired] = useState(false)
  const [isDataLoaded, setIsDataLoaded] = useState(false)
  const [shouldReinitialize, setShouldReinitialize] = useState(false)

  const { data: orderResponse, isPending, refetch: refetchOrder } = useOrderBySlug(
    allowFetch ? slug : null,
  )
  const order = orderResponse?.result
  const { initializeUpdating, clearUpdatingData, updatingData } = useOrderFlowStore()
  const orderType =
    (updatingData?.updateDraft?.type as OrderTypeEnum) ??
    (order?.type as OrderTypeEnum) ??
    OrderTypeEnum.AT_TABLE
  const table =
    updatingData?.updateDraft?.table ?? order?.table?.slug ?? ''
  const branchFromOrder =
    typeof order?.branch === 'string'
      ? order.branch
      : (order?.branch as unknown as { slug?: string })?.slug
  const branchFromStore = useBranchStore((s) => s.branch?.slug)
  const userBranch = useUserStore((s) => s.userInfo?.branch?.slug)
  const branchSlug =
    branchFromOrder || branchFromStore || userBranch || ''
  const [activeTab, setActiveTab] = useState<'order' | 'menu'>('order')

  // Shell-first: delay fetch until after transition
  useRunAfterTransition(() => setAllowFetch(true), [])

  // Init updating data when order is valid
  useEffect(() => {
    if (!order || !slug || !allowFetch) return

    const isValidOrder =
      order.slug && order.orderItems && order.orderItems.length > 0

    if (isValidOrder && !isDataLoaded) {
      try {
        initializeUpdating(order)
        queueMicrotask(() => setIsDataLoaded(true))
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error('❌ Update Order: Failed to initialize:', error)
      }
    }
  }, [order, slug, allowFetch, isDataLoaded, initializeUpdating])

  // Reinitialize when refetch completes
  useEffect(() => {
    if (!shouldReinitialize || !order) return
    try {
      initializeUpdating(order)
      queueMicrotask(() => setShouldReinitialize(false))
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('❌ Update Order: Reinitialize failed:', error)
    }
  }, [shouldReinitialize, order, initializeUpdating])

  // Polling when order is PENDING
  useEffect(() => {
    if (!order || !isDataLoaded || isExpired) return
    if (order.status !== OrderStatus.PENDING) return

    const interval = setInterval(async () => {
      try {
        const { data } = await refetchOrder()
        const updated = data?.result
        if (updated && updated.status !== OrderStatus.PENDING) {
          setShouldReinitialize(true)
        }
      } catch {
        // ignore
      }
    }, 5000)

    return () => clearInterval(interval)
  }, [order, isDataLoaded, isExpired, refetchOrder])

  const handleExpire = useCallback(() => {
    setIsExpired(true)
    clearUpdatingData()
    setIsDataLoaded(false)
  }, [clearUpdatingData])

  const router = useRouter()
  const handleBack = () => {
    if (router.canGoBack()) {
      navigateNative.back()
    } else {
      navigateNative.replace(TAB_ROUTES.PROFILE)
    }
  }

  const handleBackToMenu = () => {
    navigateNative.replace(TAB_ROUTES.MENU)
  }

  // Skeleton: chưa cho fetch hoặc đang loading
  if (!allowFetch || isPending) {
    return <UpdateOrderSkeleton />
  }

  // Màn hết hạn
  if (isExpired) {
    return (
      <ScreenContainer
        edges={['top']}
        className="flex-1 bg-gray-50 dark:bg-gray-900"
      >
        <View className="flex-row items-center border-b border-gray-200 bg-white px-4 py-3 dark:border-gray-700 dark:bg-gray-800">
          <TouchableOpacity onPress={handleBack} className="mr-3 p-1">
            <ArrowLeft size={24} color="#6b7280" />
          </TouchableOpacity>
          <Text className="flex-1 text-lg font-semibold text-gray-900 dark:text-white">
            {t('order.updateOrder', 'Cập nhật đơn hàng')}
          </Text>
        </View>
        <View className="flex-1 items-center justify-center px-6">
          <View
            className="mb-6 h-32 w-32 items-center justify-center rounded-full"
            style={{ backgroundColor: 'rgba(247, 167, 55, 0.15)' }}
          >
            <ShoppingCartIcon size={64} color="#F7A737" />
          </View>
          <Text className="mb-2 text-center text-base text-gray-600 dark:text-gray-400">
            {t('order.orderExpired', 'Đơn hàng đã hết hạn cập nhật')}
          </Text>
          <Text className="mb-6 text-center text-sm text-gray-500 dark:text-gray-500">
            {t('order.backToMenuNote', 'Vui lòng tạo đơn hàng mới từ thực đơn')}
          </Text>
          <TouchableOpacity
            onPress={handleBackToMenu}
            className="rounded-lg bg-primary px-6 py-3"
          >
            <Text className="font-medium text-white">
              {t('order.backToMenu', 'Về thực đơn')}
            </Text>
          </TouchableOpacity>
        </View>
      </ScreenContainer>
    )
  }

  // Content chính - Phase 3+ sẽ thêm cart, menu, etc.
  return (
    <ScreenContainer
      edges={['top']}
      className="flex-1 bg-gray-50 dark:bg-gray-900"
    >
      {/* Header */}
      <View className="border-b border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
        <View className="flex-row items-center px-4 py-3">
          <TouchableOpacity onPress={handleBack} className="mr-3 p-1">
            <ArrowLeft size={24} color="#6b7280" />
          </TouchableOpacity>
          <Text className="flex-1 text-lg font-semibold text-gray-900 dark:text-white">
            {t('order.updateOrder', 'Cập nhật đơn hàng')}
          </Text>
        </View>
        {order?.createdAt && (
          <OrderCountdownNative
            createdAt={order.createdAt}
            setIsExpired={handleExpire}
          />
        )}
      </View>

      {/* Tab: Đơn hàng | Thêm món - Phase 5 */}
      <View className="flex-row border-b border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
        <TouchableOpacity
          onPress={() => setActiveTab('order')}
          className={cn(
            'flex-1 items-center justify-center py-3',
            activeTab === 'order' && 'border-b-2 border-primary',
          )}
        >
          <Text
            className={cn(
              'font-semibold',
              activeTab === 'order'
                ? 'text-primary'
                : 'text-gray-500 dark:text-gray-400',
            )}
          >
            {t('order.order', 'Đơn hàng')}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setActiveTab('menu')}
          className={cn(
            'flex-1 items-center justify-center py-3',
            activeTab === 'menu' && 'border-b-2 border-primary',
          )}
        >
          <Text
            className={cn(
              'font-semibold',
              activeTab === 'menu'
                ? 'text-primary'
                : 'text-gray-500 dark:text-gray-400',
            )}
          >
            {t('menu.addMenuItem', 'Thêm món')}
          </Text>
        </TouchableOpacity>
      </View>

      {activeTab === 'order' ? (
        <UpdateOrderContentNative
          orderType={orderType}
          table={table}
          orderSlug={slug || ''}
        />
      ) : (
        <ScrollView
          className="flex-1 bg-gray-50 dark:bg-gray-900"
          contentContainerStyle={{ paddingBottom: 24 }}
          showsVerticalScrollIndicator
        >
          <UpdateOrderMenus branchSlug={branchSlug} />
        </ScrollView>
      )}
    </ScreenContainer>
  )
}
