import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'

import { useOrderFlowStore } from '@/stores'
import { OrderTypeEnum } from '@/types'

const PICKUP_TIME_OPTIONS = [0, 5, 10, 15, 30, 45, 60] as const

export function usePickupTimeForUpdate() {
  const { t } = useTranslation('menu')
  const { updatingData, addDraftPickupTime } = useOrderFlowStore()

  const orderType = updatingData?.updateDraft?.type
  const pickupTime = updatingData?.updateDraft?.timeLeftTakeOut ?? updatingData?.originalOrder?.timeLeftTakeOut ?? 0

  const shouldRender = orderType === OrderTypeEnum.TAKE_OUT

  const selectedValue = pickupTime.toString()

  const options = useMemo(
    () =>
      PICKUP_TIME_OPTIONS.map((minutes) => ({
        value: minutes.toString(),
        label:
          minutes === 0
            ? t('menu.immediately')
            : `${minutes} ${t('menu.minutes')}`,
      })),
    [t],
  )

  const handleChange = (value: string) => {
    const minutes = parseInt(value, 10)
    addDraftPickupTime(minutes)
  }

  return { shouldRender, selectedValue, options, handleChange }
}
