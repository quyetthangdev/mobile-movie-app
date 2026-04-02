import { ScreenContainer } from '@/components/layout'
import { FloatingHeader } from '@/components/navigation/floating-header'
import { useLocalSearchParams } from 'expo-router'
import React, { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ActivityIndicator, ScrollView, StyleSheet, Text, useColorScheme, View } from 'react-native'
import { ScrollView as GestureScrollView } from 'react-native-gesture-handler'

import { Skeleton } from '@/components/ui'
import { colors, PaymentMethod } from '@/constants'
import { STATIC_TOP_INSET } from '@/constants/status-bar'
import { useOrderBySlug, useRunAfterTransition } from '@/hooks'
import { navigateNative } from '@/lib/navigation'
import { OrderStatus, OrderTypeEnum } from '@/types'
import {
  calculateOrderDisplayAndTotals,
  formatCurrency,
  formatDateTime,
  getPaymentStatusLabel,
} from '@/utils'

import { InvoiceSection } from '@/app/payment/payment-invoice-section'
import { PaymentProductItem } from '@/app/payment/payment-product-item'

// ─── Skeleton ───────────────────────────────────────────────────────────────

function OrderDetailSkeleton() {
  return (
    <ScreenContainer edges={['top']} style={{ flex: 1 }}>
      <View style={sk.header}>
        <Skeleton style={{ width: 32, height: 32, borderRadius: 16, marginRight: 12 }} />
        <Skeleton style={{ height: 20, width: 192, borderRadius: 6 }} />
      </View>
      <ScrollView contentContainerStyle={{ padding: 16 }}>
        <View style={sk.card}>
          <Skeleton style={{ height: 16, width: 128, borderRadius: 6 }} />
          <Skeleton style={{ height: 24, width: 160, borderRadius: 6 }} />
          <Skeleton style={{ height: 16, width: 112, borderRadius: 6 }} />
        </View>
        <View style={sk.card}>
          <Skeleton style={{ height: 40, width: '100%', borderRadius: 8 }} />
          <Skeleton style={{ height: 40, width: '100%', borderRadius: 8 }} />
        </View>
      </ScrollView>
    </ScreenContainer>
  )
}

const sk = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.gray[200] },
  card: { marginBottom: 16, borderRadius: 12, borderWidth: 1, borderColor: colors.gray[100], padding: 16, gap: 12 },
})

// ─── Main Content ────────────────────────────────────────────────────────────

function OrderDetailContent() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const { t } = useTranslation('menu')
  const isDark = useColorScheme() === 'dark'
  const primaryColor = isDark ? colors.primary.dark : colors.primary.light
  const screenBg = isDark ? colors.background.dark : colors.background.light

  const { data: orderResponse, isPending } = useOrderBySlug(id ?? '')
  const order = orderResponse?.result
  const orderItems = order?.orderItems ?? null
  const voucher = order?.voucher ?? null

  const { displayItemMap, cartTotals } = useMemo(() => {
    if (!orderItems) return { displayItemMap: new Map<string, ReturnType<typeof calculateOrderDisplayAndTotals>['displayItems'][number]>(), cartTotals: null }
    const { displayItems, cartTotals } = calculateOrderDisplayAndTotals(orderItems, voucher)
    const map = new Map<string, (typeof displayItems)[number]>()
    for (const di of displayItems) map.set(di.slug, di)
    return { displayItemMap: map, cartTotals }
  }, [orderItems, voucher])

  if (isPending) {
    return (
      <ScreenContainer edges={['top']} style={{ flex: 1, backgroundColor: screenBg }}>
        <FloatingHeader title={t('order.orderDetail', 'Chi tiết đơn hàng')} onBack={navigateNative.back} />
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={primaryColor} />
        </View>
      </ScreenContainer>
    )
  }

  if (!order) {
    return (
      <ScreenContainer edges={['top']} style={{ flex: 1, backgroundColor: screenBg }}>
        <FloatingHeader title={t('order.orderDetail', 'Chi tiết đơn hàng')} onBack={navigateNative.back} />
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <Text style={{ color: isDark ? colors.gray[400] : colors.gray[600] }}>
            {t('order.orderNotFound', 'Không tìm thấy đơn hàng')}
          </Text>
        </View>
      </ScreenContainer>
    )
  }

  return (
    <View style={{ flex: 1, backgroundColor: screenBg }}>
      <ScreenContainer edges={['top']} style={{ flex: 1 }}>
        <GestureScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingTop: STATIC_TOP_INSET + 60, paddingBottom: 40 }}
          showsVerticalScrollIndicator={true}
        >
          <View style={ds.contentPad}>

            {/* Order Info */}
            <View style={[ds.card, { backgroundColor: isDark ? colors.gray[800] : colors.white.light, borderColor: isDark ? colors.gray[700] : colors.gray[100] }]}>
              <View style={ds.receiptHeader}>
                <View style={ds.receiptHeaderRow}>
                  <Text style={[ds.receiptTitle, { color: isDark ? colors.gray[50] : colors.gray[900], flex: 1 }]}>
                    {t('order.order', 'Đơn hàng')} #{order.slug}
                  </Text>
                  <View style={[ds.orderStatusBadge, {
                    backgroundColor: order.status === OrderStatus.PAID || order.status === OrderStatus.COMPLETED
                      ? `${colors.success.light}18`
                      : order.status === OrderStatus.PENDING
                        ? `${colors.warning.light}18`
                        : `${colors.gray[500]}18`,
                  }]}>
                    <Text style={[ds.orderStatusText, {
                      color: order.status === OrderStatus.PAID || order.status === OrderStatus.COMPLETED
                        ? colors.success.light
                        : order.status === OrderStatus.PENDING
                          ? colors.warning.light
                          : isDark ? colors.gray[400] : colors.gray[500],
                    }]}>
                      {order.status === OrderStatus.PAID ? t('order.paid', 'Đã thanh toán')
                        : order.status === OrderStatus.COMPLETED ? t('order.completed', 'Hoàn thành')
                        : order.status === OrderStatus.PENDING ? t('order.pending', 'Chờ thanh toán')
                        : order.status}
                    </Text>
                  </View>
                </View>
                <Text style={[ds.receiptTime, { color: isDark ? colors.gray[400] : colors.gray[500] }]}>
                  {formatDateTime(order.createdAt)}
                </Text>
              </View>
              <View style={[ds.receiptDivider, { backgroundColor: isDark ? colors.gray[700] : colors.gray[100] }]} />
              <View style={ds.receiptBody}>
                <View style={ds.receiptRow}>
                  <Text style={[ds.receiptLabel, { color: isDark ? colors.gray[400] : colors.gray[500] }]}>{t('order.customer', 'Khách hàng')}</Text>
                  <Text style={[ds.receiptValue, { color: isDark ? colors.gray[50] : colors.gray[900] }]}>
                    {order.owner?.firstName || order.owner?.lastName
                      ? `${order.owner.firstName || ''} ${order.owner.lastName || ''}`.trim()
                      : '-'}
                  </Text>
                </View>
                {order.owner?.phonenumber && (
                  <View style={ds.receiptRow}>
                    <Text style={[ds.receiptLabel, { color: isDark ? colors.gray[400] : colors.gray[500] }]}>{t('order.phone', 'Điện thoại')}</Text>
                    <Text style={[ds.receiptValue, { color: isDark ? colors.gray[50] : colors.gray[900] }]}>{order.owner.phonenumber}</Text>
                  </View>
                )}
                <View style={ds.receiptRow}>
                  <Text style={[ds.receiptLabel, { color: isDark ? colors.gray[400] : colors.gray[500] }]}>{t('order.orderType', 'Loại đơn')}</Text>
                  <Text style={[ds.receiptValue, { color: isDark ? colors.gray[50] : colors.gray[900] }]}>
                    {order.type === OrderTypeEnum.AT_TABLE
                      ? `${t('order.dineIn', 'Tại bàn')} - Bàn số ${order.table?.name || '-'}`
                      : order.type === OrderTypeEnum.DELIVERY
                        ? t('menu.delivery', 'Giao hàng')
                        : t('order.takeAway', 'Mang đi')}
                  </Text>
                </View>
                {order.type === OrderTypeEnum.DELIVERY && order.deliveryTo?.formattedAddress && (
                  <View style={ds.receiptRow}>
                    <Text style={[ds.receiptLabel, { color: isDark ? colors.gray[400] : colors.gray[500] }]}>{t('order.deliveryAddress', 'Địa chỉ')}</Text>
                    <Text style={[ds.receiptValue, { color: isDark ? colors.gray[50] : colors.gray[900], flex: 1, textAlign: 'right' }]}>
                      {order.deliveryTo.formattedAddress}
                    </Text>
                  </View>
                )}
                {order.description ? (
                  <View style={ds.receiptRow}>
                    <Text style={[ds.receiptLabel, { color: isDark ? colors.gray[400] : colors.gray[500] }]}>{t('order.note', 'Ghi chú')}</Text>
                    <Text style={[ds.receiptValue, { color: isDark ? colors.gray[50] : colors.gray[900], flex: 1, textAlign: 'right' }]}>
                      {order.description}
                    </Text>
                  </View>
                ) : null}
              </View>
            </View>

            {/* Order Items */}
            <View style={[ds.card, { backgroundColor: isDark ? colors.gray[800] : colors.white.light, borderColor: isDark ? colors.gray[700] : colors.gray[100], padding: 16 }]}>
              {(orderItems ?? []).map((item, index) => (
                <PaymentProductItem
                  key={item.slug || index}
                  item={item}
                  displayItem={displayItemMap.get(item.slug) ?? null}
                  voucher={voucher}
                  primaryColor={primaryColor}
                  isDark={isDark}
                  isLast={index === (orderItems ?? []).length - 1}
                  noNoteLabel={t('order.noNote', 'Không có ghi chú')}
                />
              ))}
            </View>

            {/* Payment Summary */}
            <View style={[ds.card, { backgroundColor: isDark ? colors.gray[800] : colors.white.light, borderColor: isDark ? colors.gray[700] : colors.gray[100] }]}>
              <View style={ds.receiptHeader}>
                <Text style={[ds.receiptTitle, { color: isDark ? colors.gray[50] : colors.gray[900] }]}>
                  {t('order.paymentInformation', 'Thông tin thanh toán')}
                </Text>
              </View>
              <View style={[ds.receiptDivider, { backgroundColor: isDark ? colors.gray[700] : colors.gray[100] }]} />
              <View style={ds.receiptBody}>
                <View style={ds.receiptRow}>
                  <Text style={[ds.receiptLabel, { color: isDark ? colors.gray[400] : colors.gray[500] }]}>{t('paymentMethod.title', 'Phương thức')}</Text>
                  <Text style={[ds.receiptValue, { color: isDark ? colors.gray[50] : colors.gray[900] }]}>
                    {order.payment
                      ? order.payment.paymentMethod === PaymentMethod.BANK_TRANSFER ? t('paymentMethod.bankTransfer', 'Chuyển khoản')
                        : order.payment.paymentMethod === PaymentMethod.CASH ? t('paymentMethod.cash', 'Tiền mặt')
                        : order.payment.paymentMethod === PaymentMethod.POINT ? t('paymentMethod.point', 'Điểm tích lũy')
                        : t('paymentMethod.creditCard', 'Thẻ tín dụng')
                      : t('paymentMethod.notPaid', 'Chưa thanh toán')}
                  </Text>
                </View>
                {order.payment && (
                  <View style={ds.receiptRow}>
                    <Text style={[ds.receiptLabel, { color: isDark ? colors.gray[400] : colors.gray[500] }]}>{t('order.status', 'Trạng thái')}</Text>
                    <View style={[ds.statusBadge, { backgroundColor: order.payment.statusMessage === OrderStatus.COMPLETED ? colors.success.light : colors.warning.light }]}>
                      <Text style={[ds.statusBadgeText, { color: colors.white.light }]} numberOfLines={1}>
                        {getPaymentStatusLabel(order.payment.statusCode)}
                      </Text>
                    </View>
                  </View>
                )}
                {order.payment?.paymentMethod === PaymentMethod.CREDIT_CARD && order.payment.transactionId && (
                  <View style={ds.receiptRow}>
                    <Text style={[ds.receiptLabel, { color: isDark ? colors.gray[400] : colors.gray[500] }]}>{t('paymentMethod.transactionId', 'Mã giao dịch')}</Text>
                    <Text style={[ds.receiptValue, { color: isDark ? colors.gray[50] : colors.gray[900] }]}>{order.payment.transactionId}</Text>
                  </View>
                )}

                <View style={[ds.receiptDivider, { backgroundColor: isDark ? colors.gray[700] : colors.gray[100], marginHorizontal: 0 }]} />

                <View style={ds.receiptRow}>
                  <Text style={[ds.receiptLabel, { color: isDark ? colors.gray[400] : colors.gray[500] }]}>{t('order.subTotal', 'Tổng tiền hàng')}</Text>
                  <Text style={[ds.receiptValue, { color: isDark ? colors.gray[50] : colors.gray[900] }]}>{formatCurrency(cartTotals?.subTotalBeforeDiscount || 0)}</Text>
                </View>
                {(cartTotals?.promotionDiscount ?? 0) > 0 && (
                  <View style={ds.receiptRow}>
                    <Text style={[ds.receiptLabel, { color: isDark ? colors.gray[400] : colors.gray[500] }]}>{t('order.discount', 'Khuyến mãi')}</Text>
                    <Text style={[ds.receiptValue, { color: colors.success.light }]}>-{formatCurrency(cartTotals?.promotionDiscount || 0)}</Text>
                  </View>
                )}
                {order.voucher && (cartTotals?.voucherDiscount ?? 0) > 0 && (
                  <View style={ds.receiptRow}>
                    <Text style={[ds.receiptLabel, { color: colors.success.light }]}>{t('order.voucher', 'Mã giảm giá')}</Text>
                    <Text style={[ds.receiptValue, { color: colors.success.light }]}>-{formatCurrency(cartTotals?.voucherDiscount || 0)}</Text>
                  </View>
                )}
                {order.accumulatedPointsToUse > 0 && (
                  <View style={ds.receiptRow}>
                    <Text style={[ds.receiptLabel, { color: primaryColor }]}>{t('order.loyaltyPoint', 'Điểm tích lũy')}</Text>
                    <Text style={[ds.receiptValue, { color: primaryColor }]}>-{formatCurrency(order.accumulatedPointsToUse)}</Text>
                  </View>
                )}
                {order.type === OrderTypeEnum.DELIVERY && order.deliveryFee > 0 && (
                  <View style={ds.receiptRow}>
                    <Text style={[ds.receiptLabel, { color: isDark ? colors.gray[400] : colors.gray[500] }]}>{t('order.deliveryFee', 'Phí giao hàng')}</Text>
                    <Text style={[ds.receiptValue, { color: isDark ? colors.gray[50] : colors.gray[900] }]}>{formatCurrency(order.deliveryFee)}</Text>
                  </View>
                )}
                {order.loss > 0 && (
                  <View style={ds.receiptRow}>
                    <Text style={[ds.receiptLabel, { color: colors.success.light }]}>{t('order.invoiceAutoDiscountUnderThreshold', 'Giảm giá tự động')}</Text>
                    <Text style={[ds.receiptValue, { color: colors.success.light }]}>-{formatCurrency(order.loss)}</Text>
                  </View>
                )}

                <View style={[ds.receiptDivider, { backgroundColor: isDark ? colors.gray[700] : colors.gray[200], marginHorizontal: 0 }]} />

                <View style={ds.receiptRow}>
                  <Text style={[ds.semibold, { color: isDark ? colors.gray[50] : colors.gray[900] }]}>{t('order.totalPayment', 'Tổng thanh toán')}</Text>
                  <Text style={[ds.totalPrice, { color: primaryColor }]}>{formatCurrency(order.subtotal || 0)}</Text>
                </View>
                <Text style={[ds.xsText, { color: isDark ? colors.gray[400] : colors.gray[500] }]}>
                  ({(orderItems ?? []).length} {t('order.product', 'sản phẩm')})
                </Text>
              </View>
            </View>

            {/* Invoice */}
            <InvoiceSection order={order} primaryColor={primaryColor} isDark={isDark} />

          </View>
        </GestureScrollView>
        <FloatingHeader title={t('order.orderDetail', 'Chi tiết đơn hàng')} onBack={navigateNative.back} />
      </ScreenContainer>
    </View>
  )
}

const ds = StyleSheet.create({
  contentPad: { paddingHorizontal: 16, paddingVertical: 16 },
  card: { marginBottom: 16, borderRadius: 12, borderWidth: 1, overflow: 'hidden' },
  receiptHeader: { padding: 16, gap: 4 },
  receiptTitle: { fontSize: 16, fontWeight: '700' },
  receiptTime: { fontSize: 12 },
  receiptDivider: { height: StyleSheet.hairlineWidth, marginHorizontal: 16 },
  receiptBody: { padding: 16, gap: 10 },
  receiptRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 },
  receiptLabel: { fontSize: 13 },
  receiptValue: { fontSize: 13, fontWeight: '500' },
  receiptHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  orderStatusBadge: { borderRadius: 6, paddingHorizontal: 10, paddingVertical: 4 },
  orderStatusText: { fontSize: 11, fontWeight: '600' },
  statusBadge: { alignSelf: 'flex-start', borderRadius: 6, paddingHorizontal: 10, paddingVertical: 4, marginTop: 8 },
  statusBadgeText: { fontSize: 12, fontWeight: '500' },
  semibold: { fontSize: 16, fontWeight: '600' },
  totalPrice: { fontSize: 24, fontWeight: '800' },
  xsText: { fontSize: 12 },
})

export default function OrderDetailPage() {
  const [ready, setReady] = useState(false)
  useRunAfterTransition(() => setReady(true), [])
  if (!ready) return <OrderDetailSkeleton />
  return <OrderDetailContent />
}
