import React from 'react'
import { StyleSheet, Text, View } from 'react-native'

interface DiscountTagOverlayProps {
  label: string
  value: number
  /** size: sm cho card nhỏ (related), md cho ảnh hero */
  size?: 'sm' | 'md'
}

/**
 * Tag giảm giá đặt trên ảnh — nổi bật với shadow, viền trắng.
 */
export const DiscountTagOverlay = React.memo(function DiscountTagOverlay({
  label,
  value,
  size = 'md',
}: DiscountTagOverlayProps) {
  const isSm = size === 'sm'

  return (
    <View style={[styles.tag, styles.shadow, isSm ? styles.tagSm : styles.tagMd]}>
      <Text style={[styles.text, isSm ? styles.textSm : styles.textMd]}>
        {label} {value}%
      </Text>
    </View>
  )
})

const styles = StyleSheet.create({
  tag: {
    backgroundColor: '#dc2626',
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#fff',
  },
  shadow: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
    elevation: 8,
  },
  tagSm: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  tagMd: {
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  text: {
    color: '#fff',
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  textSm: {
    fontSize: 11,
  },
  textMd: {
    fontSize: 13,
  },
})
