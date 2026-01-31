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
import { Filter } from 'lucide-react-native'
import DualRangeSlider from './dual-range-slider'

export default function PriceRangeFilter() {
  const { t } = useTranslation(['menu'])
  const { branch } = useBranchStore()
  const { menuFilter, setMenuFilter } = useMenuFilterStore()
  const colorScheme = useColorScheme()
  const isDark = colorScheme === 'dark'
  // Primary color from CSS variables
  // Light: hsl(35, 93%, 55%) = #F7A737
  // Dark: hsl(35, 70%, 53%) = #D68910
  const primaryColor = isDark ? '#D68910' : '#F7A737'

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
          className="h-[50px] w-[50px] px-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl items-center justify-center active:bg-gray-50 dark:active:bg-gray-700"
        >
          <Text className="text-gray-900 dark:text-white text-sm font-medium">
            <Filter size={17} color="#6b7280" />
          </Text>
        </TouchableOpacity>
      </Drawer.Trigger>

      {/* Drawer Content */}
      <Drawer.Content>
        {/* Grabber */}
        <View className="items-center py-3">
          <View className="w-12 h-1.5 rounded-full bg-gray-300 dark:bg-gray-600" />
        </View>

        {/* Content */}
        <View className="px-4 pb-4">
          {/* Header */}
          <View className="flex-row items-center justify-between mb-5">
            <Drawer.Title className="text-lg font-bold">
              {t('menu.priceRangeFilter', 'Khoảng giá')}
            </Drawer.Title>
            <Drawer.Close asChild>
              <TouchableOpacity
                className="w-9 h-9 items-center justify-center rounded-full active:bg-gray-100 dark:active:bg-gray-700"
              >
                <Text className="text-gray-600 dark:text-gray-400 text-xl font-semibold">
                  ✕
                </Text>
              </TouchableOpacity>
            </Drawer.Close>
          </View>

          {/* Slider Section */}
          <View className="mb-5">
            <Text className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              {t('menu.selectPriceRange', 'Chọn khoảng giá')}
            </Text>
            <View className="items-center">
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
          </View>

          {/* Input Fields */}
          <View className="mb-5">
            <Text className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              {t('menu.enterPrice', 'Nhập giá')}
            </Text>
            <View className="flex-row items-center gap-2.5">
              <View className="flex-1 relative">
                <Text className="text-xs text-gray-500 dark:text-gray-400 mb-1.5 ml-1">
                  {t('menu.minPrice', 'Từ')}
                </Text>
                <TextInput
                  keyboardType="numeric"
                  value={minPriceInput || '0'}
                  onChangeText={handleMinPriceInputChange}
                  placeholder="0"
                  className="w-full h-11 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white px-3 pr-9"
                  style={{ fontSize: 14, fontWeight: '500' }}
                  placeholderTextColor={isDark ? '#9ca3af' : '#6b7280'}
                />
                <Text
                  style={{
                    position: 'absolute',
                    right: 10,
                    bottom: 8,
                    color: isDark ? '#9ca3af' : '#6b7280',
                    fontSize: 12,
                    fontWeight: '500',
                  }}
                >
                  đ
                </Text>
              </View>

              <View className="pt-6">
                <Text className="text-gray-400 dark:text-gray-500 text-lg font-medium">→</Text>
              </View>

              <View className="flex-1 relative">
                <Text className="text-xs text-gray-500 dark:text-gray-400 mb-1.5 ml-1">
                  {t('menu.maxPrice', 'Đến')}
                </Text>
                <TextInput
                  keyboardType="numeric"
                  value={maxPriceInput || '0'}
                  onChangeText={handleMaxPriceInputChange}
                  placeholder="0"
                  className="w-full h-11 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white px-3 pr-9"
                  style={{ fontSize: 14, fontWeight: '500' }}
                  placeholderTextColor={isDark ? '#9ca3af' : '#6b7280'}
                />
                <Text
                  style={{
                    position: 'absolute',
                    right: 10,
                    bottom: 8,
                    color: isDark ? '#9ca3af' : '#6b7280',
                    fontSize: 12,
                    fontWeight: '500',
                  }}
                >
                  đ
                </Text>
              </View>
            </View>
          </View>

          {/* Presets */}
          <View className="mb-5">
            <Text className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              {t('menu.quickSelect', 'Chọn nhanh')}
            </Text>
            <View className="flex-row flex-wrap gap-2">
              {presets.map((preset) => (
                <TouchableOpacity
                  key={preset.label}
                  onPress={() => handlePresetClick(preset.min, preset.max)}
                  className={`px-3.5 py-2.5 rounded-lg border ${
                    isPresetActive(preset.min, preset.max)
                      ? 'border-primary dark:border-primary'
                      : 'border-gray-200 dark:border-gray-600'
                  } active:opacity-70`}
                  style={{
                    borderColor: isPresetActive(preset.min, preset.max)
                      ? isDark
                        ? 'rgba(214, 137, 16, 0.5)'
                        : 'rgba(247, 167, 55, 0.5)'
                      : undefined,
                    backgroundColor: isPresetActive(preset.min, preset.max) ? primaryColor : 'transparent',
                  }}
                >
                  <Text
                    className={`text-xs ${
                      isPresetActive(preset.min, preset.max)
                        ? 'font-semibold'
                        : 'text-gray-900 dark:text-white font-medium'
                    }`}
                    style={{
                      color: isPresetActive(preset.min, preset.max)
                        ? primaryColor
                        : undefined,
                    }}
                  >
                    {preset.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Action Buttons */}
          <Drawer.Footer className="pt-3 border-t border-gray-200 dark:border-gray-700">
            <View className="flex-row gap-2.5">
              <TouchableOpacity
                onPress={handleReset}
                className="flex-1 px-4 py-3 bg-gray-100 dark:bg-gray-700 rounded-lg items-center justify-center active:bg-gray-200 dark:active:bg-gray-600"
              >
                <Text className="text-gray-900 dark:text-white font-semibold text-sm">
                  {t('menu.reset', 'Đặt lại')}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleApply}
                className="flex-1 px-4 py-3 rounded-lg items-center justify-center"
                style={{
                  backgroundColor: primaryColor,
                  shadowColor: primaryColor,
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.25,
                  shadowRadius: 3,
                  elevation: 3,
                }}
              >
                <Text className="text-white font-bold text-sm">
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
