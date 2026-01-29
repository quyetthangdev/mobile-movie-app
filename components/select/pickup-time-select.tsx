import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { Select } from '@/components/ui'
import { cn } from '@/lib/utils'
import { useOrderFlowStore } from '@/stores'
import { OrderTypeEnum } from '@/types'

interface IPickupTimeSelectProps {
  defaultValue?: number
  onPickupTimeSelect?: (minutes: number) => void
}

const PICKUP_TIME_OPTIONS = [0, 5, 10, 15, 30, 45, 60] as const

export default function PickupTimeSelect({
  defaultValue,
  onPickupTimeSelect,
}: IPickupTimeSelectProps) {
  const { t } = useTranslation('menu')
  const { getCartItems, addPickupTime } = useOrderFlowStore()
  const [userSelectedTime, setUserSelectedTime] = useState<string | undefined>()

  const cartItems = getCartItems()

  // Derive selectedTime from props/cart, with user selection taking precedence
  const selectedTime = useMemo(() => {
    if (userSelectedTime !== undefined) return userSelectedTime
    if (defaultValue !== undefined) return defaultValue.toString()
    if (cartItems?.timeLeftTakeOut !== undefined) {
      return cartItems.timeLeftTakeOut.toString()
    }
    // Default to 0 (immediately) if no value is set
    return '0'
  }, [userSelectedTime, defaultValue, cartItems])

  // Initialize pickup time if not set
  const shouldInitialize = useMemo(() => {
    return (
      defaultValue === undefined &&
      cartItems?.timeLeftTakeOut === undefined &&
      userSelectedTime === undefined
    )
  }, [defaultValue, cartItems, userSelectedTime])

  // Initialize with default value if needed
  if (shouldInitialize && cartItems?.type === OrderTypeEnum.TAKE_OUT) {
    addPickupTime(0)
  }

  const handlePickupTimeSelect = (value: string) => {
    const minutes = parseInt(value, 10)
    setUserSelectedTime(value)
    addPickupTime(minutes)
    onPickupTimeSelect?.(minutes)
  }

  // Don't render if not a take-out order
  if (cartItems?.type !== OrderTypeEnum.TAKE_OUT) {
    return null
  }

  return (
    <Select onValueChange={handlePickupTimeSelect} value={selectedTime}>
      <Select.Trigger
        className={cn(
          'w-full bg-white dark:bg-gray-900',
          !selectedTime && 'highlight-blink-border'
        )}
      >
        <Select.Value placeholder={t('menu.pickupTime')} />
      </Select.Trigger>
      <Select.Content>
        <Select.Group>
          <Select.Label>{t('menu.pickupTime')}</Select.Label>
          {PICKUP_TIME_OPTIONS.map((minutes) => (
            <Select.Item key={minutes} value={minutes.toString()}>
              {minutes === 0
                ? t('menu.immediately')
                : `${minutes} ${t('menu.minutes')}`}
            </Select.Item>
          ))}
        </Select.Group>
      </Select.Content>
    </Select>
  )
}
