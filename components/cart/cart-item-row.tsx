/**
 * Cart Item Row — swipeable card with image, quantity controls, price display.
 */
import { colors } from '@/constants'
import { cartActions } from '@/stores/cart.store'
import { capitalizeFirst } from '@/utils'
import { formatCurrencyNative } from 'cart-price-calc'
import { Image } from 'expo-image'
import { NotebookText } from 'lucide-react-native'
import React, { memo, useCallback, useMemo, useRef, useState } from 'react'
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native'

import type { CartDisplayItem } from './cart-display-item'
import { PerfSwipeable } from './cart-swipeable'

const DEBOUNCE_QTY_MS = 200

/** Compute per-unit voucher discount for a single item — O(1), no loop */
export function calcItemVoucherDiscount(
  item: CartDisplayItem,
  voucher: { type: string; value: number; voucherProducts?: { product?: { slug?: string } }[] } | null,
): number {
  if (!voucher) return 0
  const vpSet = voucher.voucherProducts
  const eligible =
    !vpSet || vpSet.length === 0 ||
    vpSet.some((vp) => vp.product?.slug === item.productId)
  if (!eligible) return 0

  if (voucher.type === 'same_price_product') {
    const newPrice = voucher.value <= 1
      ? Math.round(item.originalPrice * (1 - voucher.value))
      : Math.min(item.originalPrice, voucher.value)
    return item.originalPrice - newPrice
  }
  if (voucher.type === 'percent_order') {
    return Math.round(item.originalPrice * (voucher.value / 100))
  }
  if (voucher.type === 'fixed_value') {
    return Math.min(item.originalPrice, voucher.value)
  }
  return 0
}

export const CartDisplayItemRow = memo(
  function CartDisplayItemRow({
    item,
    primaryColor,
    isDark,
    onDelete,
    onSizePress,
    voucher,
  }: {
    item: CartDisplayItem
    primaryColor: string
    isDark: boolean
    onDelete: (cartKey?: string) => void
    onSizePress?: (cartKey: string) => void
    voucher: { type: string; value: number; voucherProducts?: { product?: { slug?: string } }[] } | null
  }) {
    const updateQuantity = cartActions.updateQuantity

    const [pendingQty, setPendingQty] = useState<number | null>(null)
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

    // Display: pending (optimistic) or actual
    const displayQty = pendingQty ?? item.quantity

    const scheduleSync = useCallback(
      (qty: number) => {
        if (debounceRef.current) clearTimeout(debounceRef.current)
        debounceRef.current = setTimeout(() => {
          updateQuantity(item.cartKey, qty)
          setPendingQty(null)
          debounceRef.current = null
        }, DEBOUNCE_QTY_MS)
      },
      [item.cartKey, updateQuantity],
    )

    const handleIncrease = useCallback(() => {
      const next = displayQty + 1
      setPendingQty(next)
      scheduleSync(next)
    }, [displayQty, scheduleSync])

    const handleDecrease = useCallback(() => {
      if (displayQty <= 1) return
      const next = displayQty - 1
      setPendingQty(next)
      scheduleSync(next)
    }, [displayQty, scheduleSync])

    const voucherDiscountPerUnit = useMemo(
      () => calcItemVoucherDiscount(item, voucher),
      [item, voucher],
    )

    const hasPromotion = item.promotionValue > 0
    const hasVoucherDiscount = voucherDiscountPerUnit > 0
    const priceAfterVoucher = item.price - voucherDiscountPerUnit
    const lineTotal = (hasVoucherDiscount ? priceAfterVoucher : item.price) * displayQty
    const lineTotalBeforeVoucher = item.price * displayQty

    const [localNote, setLocalNote] = useState(item.note)
    const noteDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

    const handleNoteChange = useCallback((text: string) => {
      setLocalNote(text)
      if (noteDebounceRef.current) clearTimeout(noteDebounceRef.current)
      noteDebounceRef.current = setTimeout(() => {
        cartActions.addNote(item.cartKey, text)
        noteDebounceRef.current = null
      }, 400)
    }, [item.cartKey])

    return (
      <PerfSwipeable itemId={item.cartKey} onDelete={onDelete}>
        <View style={[rowStyles.card, { backgroundColor: isDark ? colors.gray[800] : colors.white.light }]}>
          {/* Top row: image + info */}
          <View style={rowStyles.topRow}>
            {item.imageUrl ? (
              <Image
                source={{ uri: item.imageUrl }}
                style={rowStyles.image}
                contentFit="cover"
                recyclingKey={item.cartKey}
                cachePolicy="disk"
                placeholder={{ blurhash: 'LKO2?U%2Tw=w]~RBVZRi};RPxuwH' }}
                transition={0}
                priority="high"
              />
            ) : (
              <View style={[rowStyles.image, rowStyles.imagePlaceholder]} />
            )}

            <View style={rowStyles.info}>
              <Text
                style={[rowStyles.name, { color: isDark ? colors.gray[50] : colors.gray[900] }]}
                numberOfLines={1}
              >
                {capitalizeFirst(item.name)}
              </Text>
              {item.sizeName ? (
                <View style={rowStyles.sizeChipWrap}>
                  <Pressable
                    onPress={() => onSizePress?.(item.cartKey)}
                    hitSlop={4}
                    style={[
                      rowStyles.sizeChip,
                      { borderColor: isDark ? colors.gray[600] : colors.gray[300] },
                    ]}
                  >
                    <Text
                      style={[rowStyles.sizeChipText, { color: isDark ? colors.gray[300] : colors.gray[600] }]}
                      numberOfLines={1}
                    >
                      {capitalizeFirst(item.sizeName)}
                    </Text>
                    <Text style={[rowStyles.sizeChipArrow, { color: isDark ? colors.gray[500] : colors.gray[400] }]}>
                      ▾
                    </Text>
                  </Pressable>
                </View>
              ) : null}

              <View style={rowStyles.bottomRow}>
                <View style={rowStyles.priceCol}>
                  <Text style={[rowStyles.price, { color: primaryColor }]}>
                    {formatCurrencyNative(lineTotal)}
                  </Text>
                  {(hasPromotion || hasVoucherDiscount) && (
                    <Text style={[rowStyles.originalPrice, { color: isDark ? colors.gray[500] : colors.gray[400] }]}>
                      {formatCurrencyNative(hasVoucherDiscount ? lineTotalBeforeVoucher : item.originalPrice * displayQty)}
                    </Text>
                  )}
                </View>

                <View style={rowStyles.qtyRow}>
                  <Pressable
                    onPress={handleDecrease}
                    disabled={displayQty <= 1}
                    style={[
                      rowStyles.qtyBtn,
                      { borderColor: isDark ? colors.gray[700] : colors.gray[300] },
                      displayQty <= 1 && { opacity: 0.3 },
                    ]}
                  >
                    <Text style={[rowStyles.qtyBtnText, { color: isDark ? colors.gray[300] : colors.gray[700] }]}>
                      −
                    </Text>
                  </Pressable>
                  <Text style={[rowStyles.qtyText, { color: isDark ? colors.gray[50] : colors.gray[900] }]}>
                    {displayQty}
                  </Text>
                  <Pressable
                    onPress={handleIncrease}
                    style={[rowStyles.qtyBtn, { borderColor: isDark ? colors.gray[700] : colors.gray[300] }]}
                  >
                    <Text style={[rowStyles.qtyBtnText, { color: isDark ? colors.gray[300] : colors.gray[700] }]}>
                      +
                    </Text>
                  </Pressable>
                </View>
              </View>
            </View>
          </View>

          {/* Note input — full width bottom */}
          <View style={[rowStyles.noteRow, {
            borderColor: isDark ? colors.gray[700] : colors.gray[200],
            backgroundColor: isDark ? colors.gray[900] : colors.gray[50],
          }]}>
            <View style={{ marginTop: 1 }}>
              <NotebookText size={12} color={isDark ? colors.gray[500] : colors.gray[400]} />
            </View>
            <TextInput
              value={localNote}
              onChangeText={handleNoteChange}
              placeholder="Ghi chú món..."
              placeholderTextColor={isDark ? colors.gray[600] : colors.gray[400]}
              style={[rowStyles.noteInput, { color: isDark ? colors.gray[200] : colors.gray[700] }]}
              multiline
              numberOfLines={2}
              textAlignVertical="top"
            />
          </View>
        </View>
      </PerfSwipeable>
    )
  },
  (prev, next) =>
    prev.item === next.item &&
    prev.primaryColor === next.primaryColor &&
    prev.isDark === next.isDark &&
    prev.onDelete === next.onDelete &&
    prev.onSizePress === next.onSizePress &&
    prev.voucher === next.voucher,
)

const rowStyles = StyleSheet.create({
  card: {
    marginHorizontal: 10,
    borderRadius: 16,
    overflow: 'hidden',
  },
  topRow: {
    flexDirection: 'row',
    padding: 8,
    gap: 12,
  },
  image: {
    width: 76,
    height: 76,
    borderRadius: 12,
  },
  imagePlaceholder: {
    backgroundColor: colors.gray[200],
  },
  info: {
    flex: 1,
    justifyContent: 'center',
    gap: 2,
  },
  name: {
    fontSize: 15,
    fontWeight: '600',
  },
  size: {
    fontSize: 12,
  },
  sizeChipWrap: {
    flexDirection: 'row',
    marginTop: 2,
  },
  sizeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  sizeChipText: {
    fontSize: 11,
    fontWeight: '500',
    flexShrink: 0,
  },
  sizeChipArrow: {
    fontSize: 8,
    flexShrink: 0,
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  priceCol: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  price: {
    fontSize: 14,
    fontWeight: '700',
  },
  originalPrice: {
    fontSize: 12,
    textDecorationLine: 'line-through',
  },
  qtyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  qtyBtn: {
    width: 28,
    height: 28,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyBtnText: {
    fontSize: 16,
    fontWeight: '600',
    lineHeight: 18,
  },
  qtyText: {
    fontSize: 14,
    fontWeight: '600',
    minWidth: 16,
    textAlign: 'center',
  },
  noteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginHorizontal: 8,
    marginBottom: 8,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderWidth: 1,
    borderRadius: 10,
  },
  noteInput: {
    flex: 1,
    fontSize: 12,
    padding: 0,
  },
})
