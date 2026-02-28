import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'

import { SystemLockFeatureChild, SystemLockFeatureGroup, SystemLockFeatureType } from '@/constants'
import { useGetSystemFeatureFlagsByGroup } from '@/hooks'
import { useOrderFlowStore } from '@/stores'
import { OrderTypeEnum } from '@/types'

export interface OrderTypeOption {
  label: string
  value: string
}

export function useOrderTypeOptionsForUpdate() {
  const { t } = useTranslation('menu')
  const { setDraftType, updatingData } = useOrderFlowStore()
  const { data: featuresResponse } = useGetSystemFeatureFlagsByGroup(
    SystemLockFeatureGroup.ORDER,
  )

  const featureFlags = useMemo(
    () => featuresResponse?.result || [],
    [featuresResponse?.result],
  )

  const relevantParentFeature = useMemo(() => {
    return featureFlags.find(
      (parent) => parent.name === SystemLockFeatureType.CREATE_PRIVATE,
    )
  }, [featureFlags])

  const orderTypeLockStatus = useMemo(() => {
    const status: Record<string, boolean> = {}
    const children = relevantParentFeature?.children || []
    children.forEach((child) => {
      status[child.name] = child.isLocked
    })
    return status
  }, [relevantParentFeature])

  const orderTypes = useMemo<OrderTypeOption[]>(() => {
    const allTypes: OrderTypeOption[] = [
      { value: OrderTypeEnum.AT_TABLE, label: t('menu.dineIn') },
      { value: OrderTypeEnum.TAKE_OUT, label: t('menu.takeAway') },
    ]

    const hasDeliveryInFeature = relevantParentFeature?.children?.some(
      (child) => child.name === SystemLockFeatureChild.DELIVERY,
    )
    if (hasDeliveryInFeature) {
      allTypes.push({ value: OrderTypeEnum.DELIVERY, label: t('menu.delivery') })
    }

    const orderTypeToFeatureMap: Record<string, string> = {
      [OrderTypeEnum.AT_TABLE]: SystemLockFeatureChild.AT_TABLE,
      [OrderTypeEnum.TAKE_OUT]: SystemLockFeatureChild.TAKE_OUT,
      [OrderTypeEnum.DELIVERY]: SystemLockFeatureChild.DELIVERY,
    }

    return allTypes.filter((type) => {
      const featureKey = orderTypeToFeatureMap[type.value]
      return orderTypeLockStatus[featureKey] !== true
    })
  }, [t, relevantParentFeature, orderTypeLockStatus])

  const currentType = updatingData?.updateDraft?.type
  const selectedType = useMemo(() => {
    if (currentType) {
      const found = orderTypes.find((type) => type.value === currentType)
      return found || orderTypes[0]
    }
    return orderTypes[0]
  }, [currentType, orderTypes])

  const handleChange = (value: string) => {
    setDraftType(value as OrderTypeEnum)
  }

  return { orderTypes, selectedType, handleChange }
}
