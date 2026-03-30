import React, { memo, useCallback } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'

import { CancelOrderDialog } from '@/components/dialog'
import { colors } from '@/constants'
import type { IOrder } from '@/types'
import { OrderStatus, OrderTypeEnum } from '@/types'
import {
  capitalizeFirstLetter,
  formatCurrency,
  formatDateTime,
} from '@/utils'

import OrderProductItem, {
  getStatusBadgeColors,
  type OrderDisplayData,
} from './order-product-item'

// Re-export shared types for consumers
export type { OrderDisplayData } from './order-product-item'
export { getStatusBadgeColors } from './order-product-item'

// ─── OrderCard (memo'd) ─────────────────────────────────────────────────────

const OrderCard = memo(function OrderCard({
  order,
  displayData,
  primaryColor,
  isDark,
  statusLabel,
  onViewDetail,
  onUpdateOrder,
  onPayment,
  labels,
}: {
  order: IOrder
  displayData: OrderDisplayData | null
  primaryColor: string
  isDark: boolean
  statusLabel: string
  onViewDetail: (slug: string) => void
  onUpdateOrder: (order: IOrder) => void
  onPayment: (slug: string) => void
  labels: {
    subtotal: string
    promotionDiscount: string
    voucher: string
    loyaltyPoint: string
    deliveryFee: string
    totalPayment: string
    moreItems: string
    viewDetail: string
    updateOrder: string
    payment: string
  }
}) {
  const orderItems = order.orderItems || []
  const voucher = order.voucher || null
  const cartTotals = displayData?.cartTotals ?? null
  const statusColors = getStatusBadgeColors(order.status)
  const isPending = order.status === OrderStatus.PENDING

  const handleViewDetail = useCallback(() => onViewDetail(order.slug), [order.slug, onViewDetail])
  const handleUpdate = useCallback(() => onUpdateOrder(order), [order, onUpdateOrder])
  const handlePayment = useCallback(() => onPayment(order.slug), [order.slug, onPayment])

  return (
    <View style={[cardStyles.card, { backgroundColor: isDark ? colors.gray[800] : '#fff', borderColor: isDark ? colors.gray[700] : colors.gray[100] }]}>
      {/* Header */}
      <View style={[cardStyles.cardHeader, { backgroundColor: `${primaryColor}15`, borderBottomColor: `${primaryColor}30` }]}>
        <Text style={[cardStyles.dateText, { color: isDark ? colors.gray[400] : colors.gray[600] }]}>
          {formatDateTime(order.createdAt)}
        </Text>
        <View style={[cardStyles.statusBadge, { backgroundColor: statusColors.bg }]}>
          <Text style={[cardStyles.statusText, { color: statusColors.text }]}>
            {capitalizeFirstLetter(statusLabel)}
          </Text>
        </View>
      </View>

      {/* Products */}
      <View style={cardStyles.body}>
        {orderItems.slice(0, 3).map((product, index) => (
          <OrderProductItem
            key={product.slug || index}
            product={product}
            displayData={displayData}
            voucher={voucher}
            primaryColor={primaryColor}
            isDark={isDark}
            isLast={index === Math.min(orderItems.length - 1, 2)}
          />
        ))}

        {orderItems.length > 3 && (
          <Text style={[cardStyles.moreText, { color: isDark ? colors.gray[400] : colors.gray[500] }]}>
            +{orderItems.length - 3} {labels.moreItems}
          </Text>
        )}

        {/* Summary */}
        <View style={[cardStyles.summarySection, { borderTopColor: isDark ? colors.gray[700] : colors.gray[100] }]}>
          {cartTotals && (
            <>
              <View style={cardStyles.summaryRow}>
                <Text style={[cardStyles.summaryLabel, { color: isDark ? colors.gray[50] : colors.gray[900] }]}>{labels.subtotal}</Text>
                <Text style={[cardStyles.summaryValue, { color: isDark ? colors.gray[50] : colors.gray[900] }]}>{formatCurrency(cartTotals.subTotalBeforeDiscount)}</Text>
              </View>
              <View style={cardStyles.summaryRow}>
                <Text style={[cardStyles.summaryLabelMuted, { color: isDark ? colors.gray[600] : colors.gray[600] }]}>{labels.promotionDiscount}</Text>
                <Text style={[cardStyles.summaryValueMuted, { color: colors.gray[400] }]}>
                  -{formatCurrency(cartTotals.promotionDiscount)}
                </Text>
              </View>
              <View style={cardStyles.summaryRow}>
                <Text style={[cardStyles.summaryLabelMuted, { color: '#22c55e' }]}>{labels.voucher}</Text>
                <Text style={[cardStyles.summaryValueMuted, { color: primaryColor }]}>
                  -{formatCurrency(cartTotals.voucherDiscount)}
                </Text>
              </View>
            </>
          )}
          <View style={cardStyles.summaryRow}>
            <Text style={[cardStyles.summaryLabelMuted, { color: primaryColor }]}>{labels.loyaltyPoint}</Text>
            <Text style={[cardStyles.summaryValueMuted, { color: primaryColor }]}>
              -{formatCurrency(order.accumulatedPointsToUse || 0)}
            </Text>
          </View>
          {order.type === OrderTypeEnum.DELIVERY && order.deliveryFee > 0 && (
            <View style={cardStyles.summaryRow}>
              <Text style={[cardStyles.summaryLabelMuted, { color: colors.gray[400] }]}>{labels.deliveryFee}</Text>
              <Text style={[cardStyles.summaryValueMuted, { color: isDark ? colors.gray[50] : colors.gray[900] }]}>{formatCurrency(order.deliveryFee)}</Text>
            </View>
          )}
          <View style={[cardStyles.totalRow, { borderTopColor: isDark ? colors.gray[700] : colors.gray[100] }]}>
            <Text style={[cardStyles.totalLabel, { color: isDark ? colors.gray[50] : colors.gray[900] }]}>{labels.totalPayment}</Text>
            <Text style={[cardStyles.totalValue, { color: primaryColor }]}>{formatCurrency(order.subtotal || 0)}</Text>
          </View>
        </View>

        {/* Actions */}
        <View style={cardStyles.actionsWrap}>
          {/* Row 1: primary actions */}
          <View style={cardStyles.actionsRow}>
            <Pressable onPress={handleViewDetail} style={[cardStyles.actionBtnOutline, { borderColor: isDark ? colors.gray[600] : colors.gray[300] }]}>
              <Text style={[cardStyles.actionBtnOutlineText, { color: isDark ? colors.gray[50] : colors.gray[700] }]}>{labels.viewDetail}</Text>
            </Pressable>
            {isPending && (
              <Pressable onPress={handlePayment} style={[cardStyles.actionBtn, { backgroundColor: primaryColor }]}>
                <Text style={cardStyles.actionBtnText}>{labels.payment}</Text>
              </Pressable>
            )}
          </View>
          {/* Row 2: secondary actions (pending only) */}
          {isPending && (
            <View style={cardStyles.actionsRow}>
              <Pressable onPress={handleUpdate} style={[cardStyles.actionBtnOutline, { borderColor: '#f97316' }]}>
                <Text style={[cardStyles.actionBtnOutlineText, { color: '#f97316' }]}>{labels.updateOrder}</Text>
              </Pressable>
              <CancelOrderDialog order={order} />
            </View>
          )}
        </View>
      </View>
    </View>
  )
}, (prev, next) =>
  prev.order.slug === next.order.slug &&
  prev.order.status === next.order.status &&
  prev.order.subtotal === next.order.subtotal &&
  prev.displayData === next.displayData &&
  prev.primaryColor === next.primaryColor &&
  prev.isDark === next.isDark &&
  prev.statusLabel === next.statusLabel &&
  prev.onViewDetail === next.onViewDetail &&
  prev.onUpdateOrder === next.onUpdateOrder &&
  prev.onPayment === next.onPayment,
)

export const cardStyles = StyleSheet.create({
  card: { marginBottom: 16, borderRadius: 12, borderWidth: 1, overflow: 'hidden' },
  cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  dateText: { fontSize: 12 },
  statusBadge: { borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6 },
  statusText: { fontSize: 12, fontWeight: '500' },
  body: { padding: 16 },
  moreText: { marginTop: 8, textAlign: 'center', fontSize: 12 },
  summarySection: { marginTop: 16, paddingTop: 16, borderTopWidth: StyleSheet.hairlineWidth, gap: 8 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between' },
  summaryLabel: { fontSize: 14, fontWeight: '500' },
  summaryValue: { fontSize: 14, fontWeight: '500' },
  summaryLabelMuted: { fontSize: 12, fontStyle: 'italic' },
  summaryValueMuted: { fontSize: 12, fontWeight: '500', fontStyle: 'italic' },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8, paddingTop: 8, borderTopWidth: StyleSheet.hairlineWidth },
  totalLabel: { fontSize: 16, fontWeight: '700' },
  totalValue: { fontSize: 18, fontWeight: '700' },
  actionsWrap: { marginTop: 16, gap: 8 },
  actionsRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  actionBtnOutline: { flex: 1, height: 44, borderRadius: 8, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  actionBtnOutlineText: { fontSize: 14, fontWeight: '600' },
  actionBtn: { height: 44, borderRadius: 8, paddingHorizontal: 16, alignItems: 'center', justifyContent: 'center' },
  actionBtnText: { fontSize: 14, fontWeight: '600', color: '#fff' },
})

export default OrderCard
