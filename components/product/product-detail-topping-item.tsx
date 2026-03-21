/**
 * Product Detail Topping Item — Atomic subscribe.
 * Chỉ useDetailIsToppingSelected(toppingId) → mỗi item chỉ re-render khi chính nó được toggle.
 * View flattening: View duy nhất với flexDirection row, không lồng thừa.
 */
import React, { useCallback } from 'react'
import {
  Pressable,
  StyleSheet,
  Text,
  useColorScheme,
} from 'react-native'
import { HIT_SLOP_TOPPING } from '@/lib/navigation'
import { useDetailIsToppingSelected, useDetailToggleTopping } from '@/stores/selectors'

export interface ProductDetailToppingItemProps {
  id: string
  name: string
  price: number
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  rowSelectedLight: { borderColor: '#d97706', backgroundColor: 'rgba(217,119,6,0.08)' },
  rowSelectedDark: { borderColor: '#f59e0b', backgroundColor: 'rgba(245,158,11,0.12)' },
  rowUnselectedLight: { borderColor: '#e5e7eb', backgroundColor: 'transparent' },
  rowUnselectedDark: { borderColor: '#374151', backgroundColor: 'transparent' },
  name: { fontSize: 14, fontWeight: '500', flex: 1 },
  price: { fontSize: 13, fontWeight: '600', marginLeft: 8 },
})

export const ProductDetailToppingItem = React.memo(
  function ProductDetailToppingItem({ id, name, price }: ProductDetailToppingItemProps) {
    const isDark = useColorScheme() === 'dark'
    const isSelected = useDetailIsToppingSelected(id)
    const toggleTopping = useDetailToggleTopping()

    const onPress = useCallback(() => {
      toggleTopping(id, price, !isSelected)
    }, [id, price, isSelected, toggleTopping])

    return (
      <Pressable
        onPress={onPress}
        hitSlop={HIT_SLOP_TOPPING}
        pressRetentionOffset={HIT_SLOP_TOPPING}
        {...({ unstable_pressDelay: 0 } as object)}
        style={[
          styles.row,
          isSelected
            ? isDark ? styles.rowSelectedDark : styles.rowSelectedLight
            : isDark ? styles.rowUnselectedDark : styles.rowUnselectedLight,
        ]}
      >
        <Text
          style={[
            styles.name,
            { color: isDark ? '#e5e7eb' : '#374151' },
          ]}
          numberOfLines={2}
        >
          {name}
        </Text>
        <Text
          style={[
            styles.price,
            { color: isDark ? '#f59e0b' : '#d97706' },
          ]}
        >
          +{price.toLocaleString()}đ
        </Text>
      </Pressable>
    )
  },
)
