import { ChevronDown } from 'lucide-react-native'
import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Text, View, useColorScheme } from 'react-native'
import { Dropdown } from 'react-native-element-dropdown'

import { useOrderFlowStore } from '@/stores'
import { OrderTypeEnum } from '@/types'

interface IPickupTimeDropdownProps {
  defaultValue?: number
  onPickupTimeSelect?: (minutes: number) => void
}

interface PickupTimeOption {
  label: string
  value: string
}

const PICKUP_TIME_OPTIONS = [0, 5, 10, 15, 30, 45, 60]

export default function PickupTimeDropdown({
  defaultValue,
  onPickupTimeSelect,
}: IPickupTimeDropdownProps) {
  const { t } = useTranslation('menu')
  const { getCartItems, addPickupTime } = useOrderFlowStore()
  const [isFocus, setIsFocus] = useState(false)
  const colorScheme = useColorScheme()
  const isDark = colorScheme === 'dark'

  const cartItems = getCartItems()

  // Map pickup time options to dropdown format
  const pickupTimeOptions = useMemo<PickupTimeOption[]>(() => {
    return PICKUP_TIME_OPTIONS.map((minutes) => ({
      value: minutes.toString(),
      label:
        minutes === 0
          ? t('menu.immediately')
          : `${minutes} ${t('menu.minutes')}`,
    }))
  }, [t])

  // Get selected value
  const selectedValue = useMemo(() => {
    if (defaultValue !== undefined) {
      return defaultValue.toString()
    }
    if (cartItems?.timeLeftTakeOut !== undefined) {
      return cartItems.timeLeftTakeOut.toString()
    }
    return '0' // Default to immediately
  }, [defaultValue, cartItems])

  // Initialize pickup time if not set
  useEffect(() => {
    if (
      defaultValue === undefined &&
      cartItems?.timeLeftTakeOut === undefined
    ) {
      addPickupTime(0)
    }
  }, [defaultValue, cartItems?.timeLeftTakeOut, addPickupTime])

  // Nếu không phải đơn mang đi thì không render
  if (cartItems?.type !== OrderTypeEnum.TAKE_OUT) {
    return null
  }

  const handleChange = (item: PickupTimeOption) => {
    const minutes = parseInt(item.value, 10)
    addPickupTime(minutes)
    onPickupTimeSelect?.(minutes)
    setIsFocus(false)
  }

  const renderLabel = () => {
    if (selectedValue || isFocus) {
      return (
        <Text
          className={`absolute left-3 top-2 z-10 px-2 text-xs ${
            isFocus ? 'text-blue-500' : 'text-gray-600 dark:text-gray-400'
          }`}
          style={{ backgroundColor: isDark ? '#111827' : '#ffffff' }}
        >
          {t('menu.pickupTime')}
        </Text>
      )
    }
    return null
  }

  return (
    <View className="bg-white p-4 dark:bg-gray-800">
      {renderLabel()}
      <Dropdown
        style={{
          height: 50,
          borderColor: isFocus ? '#3b82f6' : isDark ? '#374151' : '#d1d5db',
          borderWidth: 0.5,
          borderRadius: 8,
          paddingHorizontal: 8,
          backgroundColor: isDark ? '#1f2937' : '#ffffff',
        }}
        placeholderStyle={{
          fontSize: 16,
          color: isDark ? '#9ca3af' : '#6b7280',
        }}
        selectedTextStyle={{
          fontSize: 16,
          color: isDark ? '#ffffff' : '#111827',
        }}
        iconStyle={{
          width: 20,
          height: 20,
        }}
        data={pickupTimeOptions}
        search={false}
        maxHeight={300}
        labelField="label"
        valueField="value"
        placeholder={t('menu.pickupTime')}
        value={selectedValue}
        onFocus={() => setIsFocus(true)}
        onBlur={() => setIsFocus(false)}
        onChange={handleChange}
        renderLeftIcon={() => (
          <View className="mr-2">
            <ChevronDown
              size={20}
              color={isFocus ? '#3b82f6' : isDark ? '#9ca3af' : '#6b7280'}
            />
          </View>
        )}
        containerStyle={{
          backgroundColor: isDark ? '#1f2937' : '#ffffff',
        }}
        itemTextStyle={{
          color: isDark ? '#ffffff' : '#111827',
        }}
        activeColor={isDark ? '#374151' : '#f3f4f6'}
      />
    </View>
  )
}
