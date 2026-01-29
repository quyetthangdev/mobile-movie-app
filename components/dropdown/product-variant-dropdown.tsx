import { ChevronDown } from 'lucide-react-native'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { View, useColorScheme } from 'react-native'
import { Dropdown } from 'react-native-element-dropdown'

import { IProductVariant } from '@/types'

interface ProductVariantOption {
  label: string
  value: string
}

interface ProductVariantDropdownProps {
  defaultValue?: string
  variant: IProductVariant[]
  onChange: (value: string) => void
}

export default function ProductVariantDropdown({
  variant,
  defaultValue,
  onChange,
}: ProductVariantDropdownProps) {
  const { t } = useTranslation(['product'])
  const [isFocus, setIsFocus] = useState(false)
  const colorScheme = useColorScheme()
  const isDark = colorScheme === 'dark'

  // Map variants to dropdown options
  const variantOptions = useMemo<ProductVariantOption[]>(() => {
    return variant.map((item) => ({
      value: item.slug || '',
      label:
        item.size.name?.[0]?.toUpperCase() + item.size.name?.slice(1) || '',
    }))
  }, [variant])

  // Get selected value - use defaultValue, or first variant's slug, or current value
  const selectedValue = useMemo(() => {
    if (defaultValue) {
      return defaultValue
    }
    if (variant.length > 0 && variant[0].slug) {
      return variant[0].slug
    }
    return null
  }, [defaultValue, variant])

  const handleChange = (item: ProductVariantOption) => {
    onChange(item.value)
    setIsFocus(false)
  }

  // const renderLabel = () => {
  //   if (selectedValue || isFocus) {
  //     return (
  //       <Text
  //         className={`absolute left-3 top-2 z-10 px-2 text-xs ${
  //           isFocus ? 'text-blue-500' : 'text-gray-600 dark:text-gray-400'
  //         }`}
  //         style={{ backgroundColor: isDark ? '#111827' : '#ffffff' }}
  //       >
  //         {t('product.selectProductVariant')}
  //       </Text>
  //     )
  //   }
  //   return null
  // }

  return (
    <View className="relative">
      {/* {renderLabel()} */}
      <Dropdown
        style={{
          height: 40,
          borderColor: isFocus ? '#3b82f6' : isDark ? '#374151' : '#d1d5db',
          borderWidth: 0.5,
          borderRadius: 8,
          paddingHorizontal: 8,
          backgroundColor: isDark ? '#1f2937' : '#ffffff',
        }}
        placeholderStyle={{
          fontSize: 14,
          color: isDark ? '#9ca3af' : '#6b7280',
        }}
        selectedTextStyle={{
          fontSize: 14,
          color: isDark ? '#ffffff' : '#111827',
        }}
        iconStyle={{
          width: 20,
          height: 20,
        }}
        data={variantOptions}
        search={false}
        maxHeight={300}
        labelField="label"
        valueField="value"
        placeholder={t('product.selectProductVariant')}
        value={selectedValue}
        onFocus={() => setIsFocus(true)}
        onBlur={() => setIsFocus(false)}
        onChange={handleChange}
        renderLeftIcon={() => (
          <View className="mr-2">
            <ChevronDown
              size={16}
              color={isFocus ? '#3b82f6' : isDark ? '#9ca3af' : '#6b7280'}
            />
          </View>
        )}
        containerStyle={{
          backgroundColor: isDark ? '#1f2937' : '#ffffff',
        }}
        itemTextStyle={{
          color: isDark ? '#ffffff' : '#111827',
          fontSize: 14,
        }}
        activeColor={isDark ? '#374151' : '#f3f4f6'}
      />
    </View>
  )
}
