/**
 * MenuItemQuantityControl — Chỉ nút + (Add to cart), không hiển thị số lượng.
 * Subscribe store để xử lý add, ClientMenuItem đứng yên.
 */
import { Plus } from 'lucide-react-native'
import moment from 'moment'
import React from 'react'
import { useTranslation } from 'react-i18next'
import { Text, View } from 'react-native'

import { OrderFlowStep } from '@/constants'
import { HIT_SLOP_SMALL } from '@/lib/navigation/constants'
import { scheduleStoreUpdate } from '@/lib/navigation'
import { PressableWithFeedback } from '@/components/navigation'
import { useOrderFlowStore, useUserStore } from '@/stores'
import { IMenuItem, IOrderItem } from '@/types'
import { showToast } from '@/utils'

interface MenuItemQuantityControlProps {
  item: IMenuItem
  hasStock: boolean
  isMobile: boolean
}

export const MenuItemQuantityControl = React.memo(function MenuItemQuantityControl({
  item,
  hasStock,
  isMobile,
}: MenuItemQuantityControlProps) {
  const { t } = useTranslation('menu')
  const { t: tToast } = useTranslation('toast')

  const hasOrderingData = useOrderFlowStore((s) => !!s.orderingData)
  const orderingOwner = useOrderFlowStore((s) => s.orderingData?.owner ?? '')
  const isHydrated = useOrderFlowStore((s) => s.isHydrated)
  const currentStep = useOrderFlowStore((s) => s.currentStep)
  const userSlug = useUserStore((s) => s.userInfo?.slug)
  const initializeOrdering = useOrderFlowStore((s) => s.initializeOrdering)
  const setCurrentStep = useOrderFlowStore((s) => s.setCurrentStep)
  const addOrderingItem = useOrderFlowStore((s) => s.addOrderingItem)

  const ensureOrdering = () => {
    if (currentStep !== OrderFlowStep.ORDERING) setCurrentStep(OrderFlowStep.ORDERING)
    if (!hasOrderingData) {
      initializeOrdering()
      return false
    }
    if (userSlug && !orderingOwner.trim()) {
      initializeOrdering()
      return false
    }
    return true
  }

  const handleAddToCart = () => {
    if (!item?.product?.variants?.length || !isHydrated) return
    if (!ensureOrdering()) return

    const orderItem: IOrderItem = {
      id: `item_${moment().valueOf()}_${Math.random().toString(36).substr(2, 9)}`,
      slug: item?.product?.slug,
      image: item?.product?.image,
      name: item?.product?.name,
      quantity: 1,
      size: item?.product?.variants[0]?.size?.name,
      allVariants: item?.product?.variants,
      variant: item?.product?.variants[0],
      originalPrice: item?.product?.variants[0]?.price,
      productSlug: item?.product?.slug,
      description: item?.product?.description,
      isLimit: item?.product?.isLimit,
      isGift: item?.product?.isGift,
      promotion: item?.promotion ?? null,
      promotionValue: item?.promotion?.value ?? 0,
      note: '',
    }

    try {
      scheduleStoreUpdate(() => addOrderingItem(orderItem))
      showToast(tToast('toast.addSuccess', 'Đã thêm vào giỏ hàng'), 'Thông báo')
    } catch {
      // Silent fail
    }
  }

  if (!hasStock) {
    return (
      <View
        className={
          isMobile
            ? 'px-4 py-1 rounded-full bg-primary'
            : 'w-full px-3 py-2 rounded-full bg-red-500'
        }
      >
        <Text
          className={`text-xs font-semibold text-white ${!isMobile ? 'text-center' : ''}`}
        >
          {t('menu.outOfStock', 'Hết hàng')}
        </Text>
      </View>
    )
  }

  return (
    <PressableWithFeedback
      onPress={handleAddToCart}
      hitSlop={HIT_SLOP_SMALL}
      className={
        isMobile
          ? 'w-8 h-8 rounded-full bg-primary items-center justify-center z-50'
          : 'w-full px-3 py-2 rounded-full bg-primary items-center justify-center'
      }
    >
      <Plus size={20} color="#ffffff" />
    </PressableWithFeedback>
  )
})
