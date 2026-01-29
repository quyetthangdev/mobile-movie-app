import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useColorScheme,
} from 'react-native'

import { Drawer } from '@/components/ui'
import { FILTER_VALUE } from '@/constants'
import { useBranchStore, useMenuFilterStore } from '@/stores'
import { formatCurrency, formatCurrencyWithSymbol } from '@/utils'
import DualRangeSlider from './dual-range-slider'

export default function PriceRangeFilter() {
  const { t } = useTranslation(['menu'])
  const { branch } = useBranchStore()
  const { menuFilter, setMenuFilter } = useMenuFilterStore()
  const colorScheme = useColorScheme()
  const isDark = colorScheme === 'dark'

  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  
  // Calculate formatted values
  const minPriceFormatted = formatCurrencyWithSymbol(menuFilter.minPrice, false)
  const maxPriceFormatted = formatCurrencyWithSymbol(menuFilter.maxPrice, false)
  
  const [minPriceInput, setMinPriceInput] = useState<string>(() => minPriceFormatted)
  const [maxPriceInput, setMaxPriceInput] = useState<string>(() => maxPriceFormatted)

  const presets = [
    { label: '< 40K', min: FILTER_VALUE.MIN_PRICE, max: 40000 },
    { label: '40K – 60K', min: 40000, max: 60000 },
    { label: '60K – 80K', min: 60000, max: 80000 },
    { label: '> 80K', min: 80000, max: FILTER_VALUE.MAX_PRICE },
  ]

  const isPresetActive = (min: number, max: number) => {
    return menuFilter.minPrice === min && menuFilter.maxPrice === max
  }

  const handleMinPriceInputChange = (text: string) => {
    const raw = text.replace(/\./g, '')
    const number = Number(raw)

    if (!isNaN(number)) {
      setMinPriceInput(formatCurrencyWithSymbol(number, false))
    } else {
      setMinPriceInput('')
    }
  }

  const handleMaxPriceInputChange = (text: string) => {
    const raw = text.replace(/\./g, '')
    const number = Number(raw)

    if (!isNaN(number)) {
      setMaxPriceInput(formatCurrencyWithSymbol(number, false))
    } else {
      setMaxPriceInput('')
    }
  }

  const handlePresetClick = (min: number, max: number) => {
    setMenuFilter((prev) => ({ ...prev, minPrice: min, maxPrice: max, branch: branch?.slug }))
    setMinPriceInput(formatCurrencyWithSymbol(min, false))
    setMaxPriceInput(formatCurrencyWithSymbol(max, false))
  }

  const handleReset = () => {
    setMenuFilter((prev) => ({
      ...prev,
      minPrice: FILTER_VALUE.MIN_PRICE,
      maxPrice: FILTER_VALUE.MAX_PRICE,
      branch: branch?.slug,
    }))
    setMinPriceInput(formatCurrencyWithSymbol(FILTER_VALUE.MIN_PRICE, false))
    setMaxPriceInput(formatCurrencyWithSymbol(FILTER_VALUE.MAX_PRICE, false))
  }

  const handleApply = () => {
    const minValue = Number(minPriceInput.replace(/\./g, '')) || FILTER_VALUE.MIN_PRICE
    const maxValue = Number(maxPriceInput.replace(/\./g, '')) || FILTER_VALUE.MAX_PRICE

    // Nếu người dùng nhập lệch, hoán đổi trước khi lưu vào store
    const finalMin = Math.min(minValue, maxValue)
    const finalMax = Math.max(minValue, maxValue)

    setMenuFilter((prev) => ({ ...prev, minPrice: finalMin, maxPrice: finalMax }))
    setIsDrawerOpen(false)
  }

  const handleSliderChange = (values: [number, number]) => {
    const [min, max] = values
    setMinPriceInput(formatCurrencyWithSymbol(min, false))
    setMaxPriceInput(formatCurrencyWithSymbol(max, false))
    setMenuFilter((prev) => ({ ...prev, minPrice: min, maxPrice: max }))
  }

  // Sync inputs when drawer opens
  const handleDrawerOpenChange = (open: boolean) => {
    setIsDrawerOpen(open)
    if (open) {
      // Sync with current filter values when drawer opens
      setMinPriceInput(minPriceFormatted)
      setMaxPriceInput(maxPriceFormatted)
    }
  }

  return (
    <Drawer open={isDrawerOpen} onOpenChange={handleDrawerOpenChange} direction="bottom">
      {/* Trigger Button */}
      <Drawer.Trigger asChild>
        <TouchableOpacity
          className="px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg items-center justify-center"
        >
          <Text className="text-gray-900 dark:text-white text-base font-medium">
            {t('menu.priceRangeFilter', 'Khoảng giá')}
          </Text>
        </TouchableOpacity>
      </Drawer.Trigger>

      {/* Drawer Content */}
      <Drawer.Content className="max-h-[85%]">
        {/* Grabber */}
        <View className="items-center py-3">
          <View className="w-10 h-1 rounded-full bg-gray-300 dark:bg-gray-600" />
        </View>

        {/* Content */}
        <View className="px-4 pb-6 flex-1">
          {/* Header */}
          <View className="flex-row items-center justify-between mb-6">
            <Drawer.Title>{t('menu.priceRangeFilter', 'Khoảng giá')}</Drawer.Title>
            <Drawer.Close asChild>
              <TouchableOpacity>
                <Text className="text-gray-600 dark:text-gray-400 text-base">
                  ✕
                </Text>
              </TouchableOpacity>
            </Drawer.Close>
          </View>

          {/* Slider */}
          <View className="mb-6">
            <DualRangeSlider
              min={FILTER_VALUE.MIN_PRICE}
              max={FILTER_VALUE.MAX_PRICE}
              step={1000}
              value={[menuFilter.minPrice, menuFilter.maxPrice]}
              onValueChange={handleSliderChange}
              formatValue={(value: number) => formatCurrency(value)}
              hideMinMaxLabels={true}
            />
          </View>

          {/* Input Fields */}
          <View className="flex-row items-center gap-2 mb-6">
            <View className="flex-1 relative">
              <TextInput
                keyboardType="numeric"
                value={minPriceInput || '0'}
                onChangeText={handleMinPriceInputChange}
                placeholder="0"
                className="w-full h-10 bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white px-4 pr-8"
                style={{ fontSize: 16 }}
              />
              <Text
                style={{
                  position: 'absolute',
                  right: 12,
                  top: '50%',
                  transform: [{ translateY: -8 }],
                  color: isDark ? '#9ca3af' : '#6b7280',
                }}
              >
                đ
              </Text>
            </View>

            <Text className="text-gray-600 dark:text-gray-400 text-lg">→</Text>

            <View className="flex-1 relative">
              <TextInput
                keyboardType="numeric"
                value={maxPriceInput || '0'}
                onChangeText={handleMaxPriceInputChange}
                placeholder="0"
                className="w-full h-10 bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white px-4 pr-8"
                style={{ fontSize: 16 }}
              />
              <Text
                style={{
                  position: 'absolute',
                  right: 12,
                  top: '50%',
                  transform: [{ translateY: -8 }],
                  color: isDark ? '#9ca3af' : '#6b7280',
                }}
              >
                đ
              </Text>
            </View>
          </View>

          {/* Presets */}
          <View className="flex-row flex-wrap gap-2 mb-6">
            {presets.map((preset) => (
              <TouchableOpacity
                key={preset.label}
                onPress={() => handlePresetClick(preset.min, preset.max)}
                className={`px-3 py-2 rounded-lg border ${
                  isPresetActive(preset.min, preset.max)
                    ? 'border-red-600 dark:border-primary bg-red-50 dark:bg-red-900/20'
                    : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800'
                }`}
              >
                <Text
                  className={`text-xs ${
                    isPresetActive(preset.min, preset.max)
                      ? 'text-red-600 dark:text-primary font-semibold'
                      : 'text-gray-900 dark:text-white'
                  }`}
                >
                  {preset.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Action Buttons */}
          <Drawer.Footer className="pt-4">
            <View className="flex-row gap-3 justify-end">
              <TouchableOpacity
                onPress={handleReset}
                className="px-4 py-3 bg-gray-100 dark:bg-gray-700 rounded-lg"
              >
                <Text className="text-gray-900 dark:text-white font-medium">
                  {t('menu.reset', 'Đặt lại')}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleApply}
                className="px-6 py-3 bg-red-600 dark:bg-primary rounded-lg"
              >
                <Text className="text-white font-semibold">
                  {t('menu.apply', 'Áp dụng')}
                </Text>
              </TouchableOpacity>
            </View>
          </Drawer.Footer>
        </View>
      </Drawer.Content>
    </Drawer>
  )
}
