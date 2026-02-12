import { ChevronDown } from 'lucide-react-native'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Text, View, useColorScheme } from 'react-native'
import { Dropdown } from 'react-native-element-dropdown'

import { usePickupTime } from '@/hooks'

interface IPickupTimeDropdownProps {
  defaultValue?: number
  onPickupTimeSelect?: (minutes: number) => void
}

export default function PickupTimeDropdown({
  defaultValue,
  onPickupTimeSelect,
}: IPickupTimeDropdownProps) {
  const { t } = useTranslation('menu')
  const [isFocus, setIsFocus] = useState(false)
  const colorScheme = useColorScheme()
  const isDark = colorScheme === 'dark'
  const { shouldRender, selectedValue, options, handleChange: handleValueChange } = usePickupTime(
    defaultValue,
    onPickupTimeSelect
  )

  // Nếu không phải đơn mang đi thì không render
  if (!shouldRender) {
    return null
  }

  const handleDropdownChange = (item: { label: string; value: string }) => {
    // Re-use hook's handler với value string
    handleValueChange(item.value)
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
        data={options}
        search={false}
        maxHeight={300}
        labelField="label"
        valueField="value"
        placeholder={t('menu.pickupTime')}
        value={selectedValue}
        onFocus={() => setIsFocus(true)}
        onBlur={() => setIsFocus(false)}
        onChange={handleDropdownChange}
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
