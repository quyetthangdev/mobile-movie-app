/**
 * Cart Footer — order type, table, voucher trigger, total + checkout button.
 */
import { colors } from '@/constants'
import type { IVoucher } from '@/types'
import { useOrderFlowStore } from '@/stores'
import { cartActions, useCartItemCount, useCartTotal, useCartVoucher, useCartVoucherDiscount } from '@/stores/cart.store'
import { useOrderFlowOrderType, useOrderFlowTableName } from '@/stores/selectors/order-flow.selectors'
import { showToast } from '@/utils'
import { formatCurrencyNative } from 'cart-price-calc'
import { ChevronRight, ShoppingBag, Ticket } from 'lucide-react-native'
import { useCartValidation } from '@/hooks/use-cart-validation'
import React, { memo, useCallback, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Pressable, StyleSheet, Text, View } from 'react-native'

import { SimpleOrderTypeSheet } from './cart-order-type-sheet'
import { SimpleTableSheet } from './cart-table-sheet'
import { ConfirmOrderSheet } from './cart-confirm-order-sheet'
import { VoucherSheet } from './cart-voucher-sheet'

export const CartFooter = memo(function CartFooter({
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
  const orderType = useOrderFlowOrderType()
  const tableName = useOrderFlowTableName()
  const [orderTypeSheetVisible, setOrderTypeSheetVisible] = useState(false)
  const [tableSheetVisible, setTableSheetVisible] = useState(false)
  const [voucherSheetOpen, setVoucherSheetOpen] = useState(false)

  const voucherDiscount = useCartVoucherDiscount()
  const finalTotal = total - voucherDiscount

  const [confirmSheetVisible, setConfirmSheetVisible] = useState(false)
  const { validate } = useCartValidation()

  const closeConfirmSheet = useCallback(() => setConfirmSheetVisible(false), [])
  const closeOrderTypeSheet = useCallback(() => setOrderTypeSheetVisible(false), [])
  const closeTableSheet = useCallback(() => setTableSheetVisible(false), [])
  const closeVoucherSheet = useCallback(() => setVoucherSheetOpen(false), [])
  const handleApplyVoucher = useCallback((v: IVoucher) => {
    cartActions.setVoucher(v)
    showToast(`Áp dụng: ${v.title}`)
    setVoucherSheetOpen(false)
  }, [])

  const showTableSelect = orderType === 'at-table'
  const orderTypeLabel = orderType === 'take-out' ? t('menu.takeAway') : orderType === 'delivery' ? t('menu.delivery') : t('menu.dineIn')
  const tableLabel = tableName || t('menu.selectTable', 'Chọn bàn')
  const isOrderDisabled = showTableSelect && !tableName
  const orderBtnLabel = isOrderDisabled ? t('menu.selectTable', 'Chọn bàn') : t('menu.placeOrder', 'Đặt hàng')

  const openOrderTypeSheet = useCallback(() => setOrderTypeSheetVisible(true), [])
  const openTableSheet = useCallback(() => setTableSheetVisible(true), [])
  const openVoucherSheet = useCallback(() => setVoucherSheetOpen(true), [])
  const openConfirmSheet = useCallback(async () => {
    if (isOrderDisabled) return
    await validate(true)
    // After validation, check if cart still has items
    const remaining = useOrderFlowStore.getState().orderingData?.orderItems
    if (!remaining || remaining.length === 0) return
    setConfirmSheetVisible(true)
  }, [isOrderDisabled, validate])

  // Memoize isDark/primaryColor-dependent styles
  const ft = useMemo(() => ({
    containerBg: { backgroundColor: isDark ? colors.gray[900] : colors.white.light },
    selectBtnBorder: { borderColor: isDark ? colors.gray[700] : colors.gray[200] },
    selectBtnTextColor: { color: isDark ? colors.gray[50] : colors.gray[900] },
    iconColor: isDark ? colors.mutedForeground.dark : colors.mutedForeground.light,
    mutedColor: { color: isDark ? colors.gray[400] : colors.gray[500] },
    mutedColorAlt: { color: isDark ? colors.gray[500] : colors.gray[400] },
    chevronColor: isDark ? colors.gray[500] : colors.gray[400],
    primaryColorStyle: { color: primaryColor },
    primaryBorderStyle: { borderColor: primaryColor },
    disabledBtnBg: { backgroundColor: isDark ? colors.gray[700] : colors.gray[300] },
    disabledTextColor: { color: isDark ? colors.gray[400] : colors.gray[500] },
    disabledIconColor: isDark ? colors.gray[400] : colors.gray[500],
  }), [isDark, primaryColor])

  const tableBtnBorder = useMemo(
    () => ({
      borderColor: tableName
        ? isDark ? colors.gray[700] : colors.gray[200]
        : isDark ? colors.destructive.dark : '#fca5a5',
    }),
    [tableName, isDark],
  )

  const tableBtnTextColor = useMemo(
    () => ({
      color: tableName
        ? (isDark ? colors.gray[50] : colors.gray[900])
        : (isDark ? colors.gray[400] : colors.gray[500]),
    }),
    [tableName, isDark],
  )

  const voucherBorderStyle = useMemo(
    () => ({ borderColor: voucher ? primaryColor : isDark ? colors.gray[600] : colors.gray[300] }),
    [voucher, primaryColor, isDark],
  )

  const checkoutBtnBg = useMemo(
    () => ({ backgroundColor: isOrderDisabled ? (isDark ? colors.gray[700] : colors.gray[300]) : primaryColor }),
    [isOrderDisabled, isDark, primaryColor],
  )

  return (
    <>
      <View style={[footerStyles.container, ft.containerBg]}>
        {/* Order Type + Table row */}
        <View style={footerStyles.selectRow}>
          <Pressable
            onPress={openOrderTypeSheet}
            style={[footerStyles.selectBtn, ft.selectBtnBorder]}
          >
            <ShoppingBag size={14} color={ft.iconColor} />
            <Text
              style={[footerStyles.selectBtnText, ft.selectBtnTextColor]}
              numberOfLines={1}
            >
              {orderTypeLabel}
            </Text>
          </Pressable>
          {showTableSelect && (
            <Pressable
              onPress={openTableSheet}
              style={[footerStyles.selectBtn, tableBtnBorder]}
            >
              <Text
                style={[footerStyles.selectBtnText, tableBtnTextColor]}
                numberOfLines={1}
              >
                {tableLabel}
              </Text>
              <ChevronRight size={14} color={ft.iconColor} />
            </Pressable>
          )}
        </View>

        {/* Voucher trigger */}
        <Pressable
          onPress={openVoucherSheet}
          style={[footerStyles.voucherTrigger, voucherBorderStyle]}
        >
          <Ticket size={14} color={ft.chevronColor} />
          <Text style={[footerStyles.voucherLabel, footerStyles.voucherLabelFlex, ft.mutedColor]}>
            Mã giảm giá
          </Text>
          {voucher && (
            <View style={footerStyles.voucherRight}>
              {voucherDiscount > 0 && (
                <View style={[footerStyles.discountBadge, ft.primaryBorderStyle]}>
                  <Text style={[footerStyles.discountBadgeText, ft.primaryColorStyle]}>
                    -{formatCurrencyNative(voucherDiscount)}
                  </Text>
                </View>
              )}
              <Text
                style={[footerStyles.voucherName, ft.primaryColorStyle]}
                numberOfLines={1}
              >
                {voucher.title}
              </Text>
            </View>
          )}
          <ChevronRight size={16} color={ft.chevronColor} />
        </Pressable>

        {/* Total + checkout row */}
        <View style={footerStyles.bottomRow}>
          <View style={footerStyles.totalCol}>
            <Text style={[footerStyles.totalLabel, ft.mutedColor]}>
              Tổng cộng ({itemCount})
            </Text>
            <View style={footerStyles.totalRow}>
              {voucherDiscount > 0 && (
                <Text style={[footerStyles.totalOriginal, ft.mutedColorAlt]}>
                  {formatCurrencyNative(total)}
                </Text>
              )}
              <Text style={[footerStyles.totalValue, ft.primaryColorStyle]}>
                {formatCurrencyNative(finalTotal)}
              </Text>
            </View>
          </View>
          <Pressable
            onPress={openConfirmSheet}
            disabled={isOrderDisabled}
            style={[
              footerStyles.checkoutBtn,
              checkoutBtnBg,
              isOrderDisabled && footerStyles.checkoutBtnDisabled,
            ]}
          >
            <ShoppingBag size={18} color={isOrderDisabled ? ft.disabledIconColor : colors.white.light} />
            <Text style={[footerStyles.checkoutText, isOrderDisabled && ft.disabledTextColor]}>
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
        visible={tableSheetVisible}
        onClose={closeTableSheet}
        isDark={isDark}
        primaryColor={primaryColor}
      />

      <VoucherSheet
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
  voucherLabelFlex: {
    flex: 1,
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
