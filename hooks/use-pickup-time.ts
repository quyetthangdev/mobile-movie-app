import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { useOrderFlowStore } from '@/stores'
import { OrderTypeEnum } from '@/types'

const PICKUP_TIME_OPTIONS = [0, 5, 10, 15, 30, 45, 60] as const

export interface PickupTimeOption {
  label: string
  value: string
}

export interface UsePickupTimeResult {
  shouldRender: boolean
  selectedValue: string
  options: PickupTimeOption[]
  handleChange: (value: string) => void
}

export function usePickupTime(defaultValue?: number, onPickupTimeSelect?: (minutes: number) => void): UsePickupTimeResult {
  const { t } = useTranslation('menu')
  const { getCartItems, addPickupTime } = useOrderFlowStore()
  const [userSelectedTime, setUserSelectedTime] = useState<string | undefined>()

  const cartItems = getCartItems()

  // Derive selectedTime from props/cart, with user selection taking precedence
  const selectedValue = useMemo(() => {
    if (userSelectedTime !== undefined) return userSelectedTime
    if (defaultValue !== undefined) return defaultValue.toString()
    if (cartItems?.timeLeftTakeOut !== undefined) {
      return cartItems.timeLeftTakeOut.toString()
    }
    // Default to 0 (immediately) if no value is set
    return '0'
  }, [userSelectedTime, defaultValue, cartItems])

  // Initialize pickup time if not set
  useEffect(() => {
    if (
      defaultValue === undefined &&
      cartItems?.timeLeftTakeOut === undefined &&
      userSelectedTime === undefined &&
      cartItems?.type === OrderTypeEnum.TAKE_OUT
    ) {
      addPickupTime(0)
    }
  }, [defaultValue, cartItems?.timeLeftTakeOut, cartItems?.type, userSelectedTime, addPickupTime])

  const shouldRender = cartItems?.type === OrderTypeEnum.TAKE_OUT

  const options = useMemo<PickupTimeOption[]>(() => {
    return PICKUP_TIME_OPTIONS.map((minutes) => ({
      value: minutes.toString(),
      label:
        minutes === 0
          ? t('menu.immediately')
          : `${minutes} ${t('menu.minutes')}`,
    }))
  }, [t])

  const handleChange = (value: string) => {
    const minutes = parseInt(value, 10)
    setUserSelectedTime(value)
    addPickupTime(minutes)
    onPickupTimeSelect?.(minutes)
  }

  return {
    shouldRender,
    selectedValue,
    options,
    handleChange,
  }
}


