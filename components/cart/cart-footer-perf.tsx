/**
 * Cart Footer — order type, table, voucher trigger, total + checkout button.
 */
import { colors } from '@/constants'
import type { IVoucher } from '@/types'
import { cartActions, useCartItemCount, useCartTotal, useCartVoucher } from '@/stores/cart.store'
import { useOrderFlowStore } from '@/stores'
import { formatCurrencyNative } from 'cart-price-calc'
import { ChevronRight, ShoppingBag, Ticket } from 'lucide-react-native'
import React, { memo, useCallback, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Pressable, StyleSheet, Text, View } from 'react-native'

import { toDisplayItem } from './cart-display-item'
import { calcItemVoucherDiscount } from './cart-item-row'
import { SimpleOrderTypeSheet } from './cart-order-type-sheet'
import { SimpleTableSheet } from './cart-table-sheet'
import { ConfirmOrderSheet } from './cart-confirm-order-sheet'
import { PerfVoucherSheet } from './cart-voucher-sheet'

export const PerfCartFooter = memo(function PerfCartFooter({
  primaryColor,
  isDark,
}: {
  primaryColor: string
  isDark: boolean
}) {
  const { t } = useTranslation('menu')
  const total = useCartTotal()
  const itemCount = useCartItemCount()
  const voucher = useCartVoucher()
  const orderType = useOrderFlowStore((s) => s.orderingData?.type)
  const tableName = useOrderFlowStore((s) => s.orderingData?.tableName)
  const [orderTypeSheetVisible, setOrderTypeSheetVisible] = useState(false)
  const [tableSheetVisible, setTableSheetVisible] = useState(false)
  const [voucherSheetOpen, setVoucherSheetOpen] = useState(false)

  // Compute voucher discount via store selector — no duplicate useCartItems subscription
  const voucherDiscount = useOrderFlowStore(
    useCallback(
      (s) => {
        if (!voucher || total <= 0) return 0
        const items = s.orderingData?.orderItems
        if (!items || items.length === 0) return 0
        let discount = 0
        for (const item of items) {
          const displayItem = toDisplayItem(item)
          discount += calcItemVoucherDiscount(displayItem, voucher) * item.quantity
        }
        return discount
      },
      [voucher, total],
    ),
  )
  const finalTotal = total - voucherDiscount

  const [confirmSheetVisible, setConfirmSheetVisible] = useState(false)

  const closeConfirmSheet = useCallback(() => setConfirmSheetVisible(false), [])
  const closeOrderTypeSheet = useCallback(() => setOrderTypeSheetVisible(false), [])
  const closeTableSheet = useCallback(() => setTableSheetVisible(false), [])
  const closeVoucherSheet = useCallback(() => setVoucherSheetOpen(false), [])
  const handleApplyVoucher = useCallback((v: IVoucher) => {
    cartActions.setVoucher(v)
    import('@/utils').then((m) => m.showToast(`Áp dụng: ${v.title}`))
    setVoucherSheetOpen(false)
  }, [])

  const showTableSelect = orderType === 'at-table'
  const orderTypeLabel = orderType === 'take-out' ? t('menu.takeAway') : orderType === 'delivery' ? t('menu.delivery') : t('menu.dineIn')
  const tableLabel = tableName || t('menu.selectTable', 'Chọn bàn')
  const isOrderDisabled = showTableSelect && !tableName
  const orderBtnLabel = isOrderDisabled ? t('menu.selectTable', 'Chọn bàn') : t('menu.placeOrder', 'Đặt hàng')

  return (
    <>
      <View
        style={[
          footerStyles.container,
          { backgroundColor: isDark ? colors.gray[900] : colors.white.light },
        ]}
      >
        {/* Order Type + Table row */}
        <View style={footerStyles.selectRow}>
          <Pressable
            onPress={() => setOrderTypeSheetVisible(true)}
            style={[footerStyles.selectBtn, { borderColor: isDark ? colors.gray[700] : colors.gray[200] }]}
          >
            <ShoppingBag size={14} color={isDark ? '#9ca3af' : '#6b7280'} />
            <Text
              style={[footerStyles.selectBtnText, { color: isDark ? colors.gray[50] : colors.gray[900] }]}
              numberOfLines={1}
            >
              {orderTypeLabel}
            </Text>
          </Pressable>
          {showTableSelect && (
            <Pressable
              onPress={() => setTableSheetVisible(true)}
              style={[
                footerStyles.selectBtn,
                {
                  borderColor: tableName
                    ? isDark ? colors.gray[700] : colors.gray[200]
                    : isDark ? '#7f1d1d' : '#fca5a5',
                },
              ]}
            >
              <Text
                style={[
                  footerStyles.selectBtnText,
                  { color: tableName ? (isDark ? colors.gray[50] : colors.gray[900]) : (isDark ? colors.gray[400] : colors.gray[500]) },
                ]}
                numberOfLines={1}
              >
                {tableLabel}
              </Text>
              <ChevronRight size={14} color={isDark ? '#9ca3af' : '#6b7280'} />
            </Pressable>
          )}
        </View>

        {/* Voucher trigger */}
        <Pressable
          onPress={() => setVoucherSheetOpen(true)}
          style={[
            footerStyles.voucherTrigger,
            { borderColor: voucher ? primaryColor : isDark ? colors.gray[600] : colors.gray[300] },
          ]}
        >
          <Ticket size={14} color={isDark ? colors.gray[400] : colors.gray[500]} />
          <Text style={[footerStyles.voucherLabel, { flex: 1, color: isDark ? colors.gray[400] : colors.gray[500] }]}>
            Mã giảm giá
          </Text>
          {voucher && (
            <View style={footerStyles.voucherRight}>
              {voucherDiscount > 0 && (
                <View style={[footerStyles.discountBadge, { borderColor: primaryColor }]}>
                  <Text style={[footerStyles.discountBadgeText, { color: primaryColor }]}>
                    -{formatCurrencyNative(voucherDiscount)}
                  </Text>
                </View>
              )}
              <Text
                style={[footerStyles.voucherName, { color: primaryColor }]}
                numberOfLines={1}
              >
                {voucher.title}
              </Text>
            </View>
          )}
          <ChevronRight size={16} color={isDark ? colors.gray[500] : colors.gray[400]} />
        </Pressable>

        {/* Total + checkout row */}
        <View style={footerStyles.bottomRow}>
          <View style={footerStyles.totalCol}>
            <Text style={[footerStyles.totalLabel, { color: isDark ? colors.gray[400] : colors.gray[500] }]}>
              Tổng cộng ({itemCount})
            </Text>
            <View style={footerStyles.totalRow}>
              {voucherDiscount > 0 && (
                <Text style={[footerStyles.totalOriginal, { color: isDark ? colors.gray[500] : colors.gray[400] }]}>
                  {formatCurrencyNative(total)}
                </Text>
              )}
              <Text style={[footerStyles.totalValue, { color: primaryColor }]}>
                {formatCurrencyNative(finalTotal)}
              </Text>
            </View>
          </View>
          <Pressable
            onPress={() => !isOrderDisabled && setConfirmSheetVisible(true)}
            disabled={isOrderDisabled}
            style={[
              footerStyles.checkoutBtn,
              { backgroundColor: isOrderDisabled ? (isDark ? colors.gray[700] : colors.gray[300]) : primaryColor },
              isOrderDisabled && footerStyles.checkoutBtnDisabled,
            ]}
          >
            <ShoppingBag size={18} color={isOrderDisabled ? (isDark ? colors.gray[400] : colors.gray[500]) : colors.white.light} />
            <Text style={[footerStyles.checkoutText, isOrderDisabled && { color: isDark ? colors.gray[400] : colors.gray[500] }]}>
              {orderBtnLabel}
            </Text>
          </Pressable>
        </View>
      </View>

      <ConfirmOrderSheet
        visible={confirmSheetVisible}
        onClose={closeConfirmSheet}
        isDark={isDark}
        primaryColor={primaryColor}
      />

      <SimpleOrderTypeSheet
        visible={orderTypeSheetVisible}
        onClose={closeOrderTypeSheet}
        isDark={isDark}
        primaryColor={primaryColor}
      />

      <SimpleTableSheet
        key={tableSheetVisible ? 'open' : 'closed'}
        visible={tableSheetVisible}
        onClose={closeTableSheet}
        isDark={isDark}
        primaryColor={primaryColor}
      />

      <PerfVoucherSheet
        visible={voucherSheetOpen}
        onClose={closeVoucherSheet}
        isDark={isDark}
        primaryColor={primaryColor}
        onApply={handleApplyVoucher}
      />
    </>
  )
})

const footerStyles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 20,
    gap: 10,
  },
  selectRow: {
    flexDirection: 'row',
    gap: 8,
  },
  selectBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 40,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  selectBtnText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '500',
  },
  voucherTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderRadius: 8,
  },
  voucherLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  voucherRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  voucherName: {
    fontSize: 13,
    fontWeight: '600',
    maxWidth: 120,
  },
  discountBadge: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  discountBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  totalCol: {
    flex: 1,
  },
  totalLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  totalRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
    marginTop: 1,
  },
  totalOriginal: {
    fontSize: 14,
    textDecorationLine: 'line-through',
  },
  totalValue: {
    fontSize: 20,
    fontWeight: '700',
  },
  checkoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 48,
    borderRadius: 9999,
    paddingHorizontal: 20,
  },
  checkoutBtnDisabled: {
    paddingHorizontal: 14,
  },
  checkoutText: {
    color: colors.white.light,
    fontSize: 15,
    fontWeight: '700',
  },
})
