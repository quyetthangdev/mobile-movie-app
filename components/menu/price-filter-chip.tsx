/**
 * Chip hiển thị khi có filter giá — subscribe trực tiếp vào minPrice, maxPrice.
 * Tránh re-render cascade khi parent (MenuListHeader) nhận menuFilter object mới.
 */
import React from 'react'
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { X } from 'lucide-react-native'

import { FILTER_VALUE } from '@/constants'
import {
  useMinPriceFilter,
  useMaxPriceFilter,
  useSetMenuFilter,
  useBranchSlug,
} from '@/stores/selectors'
import { formatCurrency } from '@/utils'

const chipStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 8,
    padding: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e50914',
    backgroundColor: 'rgba(229, 9, 20, 0.05)',
  },
  text: { fontSize: 14, color: '#e50914' },
})

export const PriceFilterChip = React.memo(function PriceFilterChip() {
  const minPrice = useMinPriceFilter()
  const maxPrice = useMaxPriceFilter()
  const setMenuFilter = useSetMenuFilter()
  const branchSlug = useBranchSlug()

  const isActive =
    (minPrice ?? FILTER_VALUE.MIN_PRICE) > FILTER_VALUE.MIN_PRICE ||
    (maxPrice ?? FILTER_VALUE.MAX_PRICE) < FILTER_VALUE.MAX_PRICE

  const handleClear = React.useCallback(() => {
    setMenuFilter((prev) => ({
      ...prev,
      minPrice: FILTER_VALUE.MIN_PRICE,
      maxPrice: FILTER_VALUE.MAX_PRICE,
      branch: branchSlug ?? prev.branch,
    }))
  }, [setMenuFilter, branchSlug])

  if (!isActive) return null

  return (
    <View style={chipStyles.row}>
      <Text style={chipStyles.text}>
        {formatCurrency(minPrice ?? FILTER_VALUE.MIN_PRICE)} -{' '}
        {formatCurrency(maxPrice ?? FILTER_VALUE.MAX_PRICE)}
      </Text>
      <TouchableOpacity onPress={handleClear}>
        <X size={20} color="#6b7280" />
      </TouchableOpacity>
    </View>
  )
})
