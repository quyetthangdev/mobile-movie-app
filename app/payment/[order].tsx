import { ScreenContainer } from '@/components/layout'
import { FloatingHeader } from '@/components/navigation/floating-header'
import { useLocalSearchParams } from 'expo-router'
import { CircleAlert, CircleX } from 'lucide-react-native'
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, Text, useColorScheme, View } from 'react-native'
import { ScrollView as GestureScrollView } from 'react-native-gesture-handler'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import PaymentMethodRadioGroup from '@/components/radio/payment-method-radio-group'
import { Skeleton } from '@/components/ui'
import { colors, NotificationMessageCode, PaymentMethod, TAB_ROUTES } from '@/constants'
import { STATIC_TOP_INSET } from '@/constants/status-bar'
import { useInitiatePayment, useInitiatePublicPayment, useOrderBySlug, useRunAfterTransition } from '@/hooks'
import { navigateNative } from '@/lib/navigation'
import { useNotificationStore, useUserStore } from '@/stores'
import { OrderStatus, OrderTypeEnum } from '@/types'
import { calculateOrderDisplayAndTotals, formatCurrency, formatDateTime, getPaymentStatusLabel, showErrorToast, showErrorToastMessage, showToast } from '@/utils'

import { InvoiceSection } from './payment-invoice-section'
import { PaymentProductItem } from './payment-product-item'

function PaymentSkeletonShell() {
  return (
    <ScreenContainer edges={['top']} style={{ flex: 1, backgroundColor: colors.background.light }}>
      <View style={skeletonStyles.header}>
        <Skeleton style={{ width: 32, height: 32, borderRadius: 16, marginRight: 12 }} />
        <Skeleton style={{ height: 20, width: 192, borderRadius: 6 }} />
      </View>
      <ScrollView contentContainerStyle={{ padding: 16 }}>
        <View style={skeletonStyles.card}>
          <Skeleton style={{ height: 16, width: 128, borderRadius: 6 }} />
          <Skeleton style={{ height: 24, width: 160, borderRadius: 6 }} />
          <Skeleton style={{ height: 16, width: 112, borderRadius: 6 }} />
          <Skeleton style={{ height: 16, width: 96, borderRadius: 6 }} />
        </View>
        <View style={skeletonStyles.card}>
          <Skeleton style={{ height: 16, width: 160, borderRadius: 6 }} />
          <Skeleton style={{ height: 40, width: '100%', borderRadius: 8 }} />
          <Skeleton style={{ height: 40, width: '100%', borderRadius: 8 }} />
        </View>
      </ScrollView>
    </ScreenContainer>
  )
}

const skeletonStyles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: colors.white.light, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.gray[200] },
  card: { marginBottom: 16, borderRadius: 12, backgroundColor: colors.white.light, borderWidth: 1, borderColor: colors.gray[100], padding: 16, gap: 12 },
})

const pSectionStyles = StyleSheet.create({
  // card: { marginBottom: 16, borderRadius: 12, borderWidth: 1, overflow: 'hidden' },
  cardHeader: { paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  // cardHeaderText: { fontSize: 14, fontWeight: '500' },
  cardBody: { padding: 16 },
})

// ─── PaymentMethodSection (isolates qrCode + isInitiatingPayment state) ────

const PaymentMethodSection = React.memo(function PaymentMethodSection({
  order,
  primaryColor,
  isDark,
  onMethodChange,
  isInitiating,
  qrCode,
}: {
  order: NonNullable<ReturnType<typeof useOrderBySlug>['data']>['result']
  primaryColor: string
  isDark: boolean
  onMethodChange: (method: PaymentMethod, transactionId?: string) => void
  isInitiating: boolean
  qrCode: string | null
}) {
  const { t } = useTranslation('menu')

  if (!order || order.status !== OrderStatus.PENDING) return null

  return (
    <View style={[ps.card, { backgroundColor: isDark ? colors.gray[800] : colors.white.light, borderColor: isDark ? colors.gray[700] : colors.gray[100] }]}>
      <View style={[pSectionStyles.cardHeader, { backgroundColor: isDark ? colors.gray[900] : colors.gray[50], borderBottomColor: isDark ? colors.gray[700] : colors.gray[100] }]}>
        <Text style={[ps.semibold, { color: isDark ? colors.gray[50] : colors.gray[900] }]}>{t('paymentMethod.title', 'Phương thức thanh toán')}</Text>
        <Text style={[ps.xsText, { color: isDark ? colors.gray[400] : colors.gray[500], marginTop: 4 }]}>({t('paymentMethod.cashMethodNote', 'Chọn phương thức thanh toán')})</Text>
      </View>
      <View style={pSectionStyles.cardBody}>
        <PaymentMethodRadioGroup
          order={order}
          defaultValue={order.payment?.paymentMethod || null}
          disabledMethods={order.payment?.paymentMethod ? [order.payment.paymentMethod as PaymentMethod] : []}
          disabledReasons={order.payment?.paymentMethod ? { [order.payment.paymentMethod as PaymentMethod]: t('paymentMethod.alreadyPaid', 'Đã thanh toán') } as Record<PaymentMethod, string> : undefined}
          onSelect={onMethodChange}
        />
      </View>
      {isInitiating && (
        <View style={ps.processingRow}>
          <ActivityIndicator size="small" color={primaryColor} />
          <Text style={[ps.xsText, { color: isDark ? colors.gray[400] : colors.gray[500] }]}>{t('paymentMethod.processing', 'Đang xử lý...')}</Text>
        </View>
      )}
      {(qrCode || order.payment?.qrCode) && order.payment?.paymentMethod === PaymentMethod.BANK_TRANSFER && (
        <View style={[ps.qrSection, { borderTopColor: isDark ? colors.gray[700] : colors.gray[100] }]}>
          <View style={ps.qrCenter}>
            <Image source={{ uri: qrCode || order.payment.qrCode || '' }} style={ps.qrImage} resizeMode="contain" />
            <View style={ps.qrInfoCol}>
              <View style={ps.qrTotalRow}>
                <Text style={[ps.smText, { color: isDark ? colors.gray[300] : colors.gray[700] }]}>{t('paymentMethod.total', 'Tổng tiền')}:</Text>
                <Text style={[ps.lgBold, { color: primaryColor }]}>{formatCurrency(order.subtotal || 0)}</Text>
              </View>
              <View style={ps.qrNoteRow}>
                <CircleAlert size={12} color="#3b82f6" />
                <Text style={[ps.xsText, { color: isDark ? colors.gray[400] : colors.gray[500], textAlign: 'center' }]}>{t('paymentMethod.paymentNote', 'Quét QR code để thanh toán')}</Text>
              </View>
            </View>
          </View>
        </View>
      )}
    </View>
  )
})

// ─── Payment Success Screen ──────────────────────────────────────────────────

const PaymentSuccessScreen = React.memo(function PaymentSuccessScreen({
  orderSlug,
  primaryColor,
  isDark,
  onViewDetail,
}: {
  orderSlug: string
  primaryColor: string
  isDark: boolean
  onViewDetail: () => void
}) {
  const { t } = useTranslation('menu')
  const insets = useSafeAreaInsets()
  const screenBg = isDark ? colors.background.dark : colors.background.light

  const handleGoMenu = useCallback(() => {
    navigateNative.replace(TAB_ROUTES.MENU)
  }, [])

  return (
    <ScreenContainer edges={['top']} style={{ flex: 1, backgroundColor: screenBg }}>
      <View style={[suc.container, { paddingBottom: insets.bottom + 24 }]}>
        <Image
          // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-unsafe-assignment
          source={require('@/assets/images/food/order-success.png')}
          style={suc.image}
          resizeMode="contain"
        />
        <Text style={[suc.title, { color: primaryColor }]}>
          {t('payment.successTitle', 'Thanh toán thành công!')}
        </Text>
        <Text style={[suc.subtitle, { color: isDark ? colors.gray[400] : colors.gray[500] }]}>
          {t('payment.successSubtitle', 'Đơn hàng #{{slug}} của bạn đã được thanh toán.', { slug: orderSlug })}
        </Text>

        <View style={suc.actions}>
          <Pressable
            onPress={onViewDetail}
            style={[suc.btnSecondary, { backgroundColor: isDark ? colors.gray[700] : colors.gray[100], borderColor: isDark ? colors.gray[500] : colors.gray[300], flex: 1 }]}
          >
            <Text style={[suc.btnSecondaryText, { color: isDark ? colors.gray[200] : colors.gray[700] }]}>
              {t('payment.viewOrderDetail', 'Xem chi tiết đơn')}
            </Text>
          </Pressable>
          <Pressable
            onPress={handleGoMenu}
            style={[suc.btnPrimary, { backgroundColor: primaryColor, flex: 1 }]}
          >
            <Text style={suc.btnPrimaryText}>
              {t('payment.goToMenu', 'Xem thực đơn')}
            </Text>
          </Pressable>
        </View>
      </View>
    </ScreenContainer>
  )
})

const suc = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32, gap: 12 },
  image: { width: 200, height: 200, marginBottom: 8 },
  title: { fontSize: 22, fontWeight: '800', textAlign: 'center' },
  subtitle: { fontSize: 14, textAlign: 'center', lineHeight: 20 },
  actions: { width: '100%', flexDirection: 'row', gap: 12, marginTop: 16 },
  btnPrimary: { height: 50, borderRadius: 9999, alignItems: 'center', justifyContent: 'center' },
  btnPrimaryText: { fontSize: 15, fontWeight: '700', color: colors.white.light },
  btnSecondary: { height: 50, borderRadius: 9999, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5 },
  btnSecondaryText: { fontSize: 15, fontWeight: '600' },
})

// ─── Main Page ──────────────────────────────────────────────────────────────

function PaymentPageContent() {
  const { t } = useTranslation('menu')
  const { t: tCommon } = useTranslation('common')
  const { order: orderSlug } = useLocalSearchParams<{ order: string }>()
  const isDark = useColorScheme() === 'dark'
  const primaryColor = isDark ? colors.primary.dark : colors.primary.light

  const insets = useSafeAreaInsets()
  const { data: orderResponse, isPending, refetch: refetchOrder } = useOrderBySlug(orderSlug)
  const order = orderResponse?.result
  const screenBg = isDark ? colors.background.dark : colors.background.light

  // ─── Debug Logging ───
  // useEffect(() => {
  //   if (__DEV__) {
  //     console.log('[Payment Page] Loaded', {
  //       orderSlug,
  //       isLoggedIn: !!useUserStore.getState().userInfo,
  //       isPending,
  //       hasOrder: !!order,
  //       error: orderError ? {
  //         message: orderError instanceof Error ? orderError.message : String(orderError),
  //       } : null,
  //     })
  //   }
  // }, [orderSlug, isPending, order, orderError])

  // Derived: show success screen when there's an unread ORDER_PAID notification for this order
  const showSuccess = useNotificationStore((s) =>
    s.notifications.some(
      (n) =>
        !n.isRead &&
        n.message === NotificationMessageCode.ORDER_PAID &&
        n.metadata?.order === orderSlug,
    ),
  )
  const markNotificationRead = useNotificationStore((s) => s.markAsRead)

  const handleViewDetail = useCallback(() => {
    const paid = useNotificationStore
      .getState()
      .notifications.find(
        (n) =>
          n.message === NotificationMessageCode.ORDER_PAID &&
          n.metadata?.order === orderSlug,
      )
    if (paid) markNotificationRead(paid.slug)
  }, [markNotificationRead, orderSlug])

  // Auto-refetch when FCM "order paid" notification arrives for this order
  const processedRef = useRef<Set<string>>(new Set())
  const notifications = useNotificationStore((s) => s.notifications)
  useEffect(() => {
    const latest = notifications[0]
    if (!latest || latest.isRead) return
    if (processedRef.current.has(latest.slug)) return
    if (
      latest.message === NotificationMessageCode.ORDER_PAID &&
      latest.metadata?.order === orderSlug
    ) {
      processedRef.current.add(latest.slug)
      refetchOrder()
    }
  }, [notifications, orderSlug, refetchOrder])

  const orderItems = useMemo(() => order?.orderItems || [], [order?.orderItems])
  const voucher = order?.voucher || null

  const { displayItemMap, cartTotals } = useMemo(() => {
    const { displayItems, cartTotals } = calculateOrderDisplayAndTotals(orderItems, voucher)
    const map = new Map<string, (typeof displayItems)[number]>()
    for (const di of displayItems) map.set(di.slug, di)
    return { displayItemMap: map, cartTotals }
  }, [orderItems, voucher])

  const handleBack = useCallback(() => {
    navigateNative.replace(TAB_ROUTES.HOME)
  }, [])

  // ── Payment method selection + submission ──
  const userInfo = useUserStore((s) => s.userInfo)
  const isLoggedIn = !!userInfo
  const { mutate: initiatePaymentAuth, isPending: isInitiatingPaymentAuth } = useInitiatePayment()
  const { mutate: initiatePaymentPublic, isPending: isInitiatingPaymentPublic } = useInitiatePublicPayment()
  const initiatePayment = isLoggedIn ? initiatePaymentAuth : initiatePaymentPublic
  const isInitiatingPayment = isLoggedIn ? isInitiatingPaymentAuth : isInitiatingPaymentPublic

  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<PaymentMethod | null>(null)
  const [selectedTransactionId, setSelectedTransactionId] = useState('')
  const [qrCode, setQrCode] = useState<string | null>(null)

  const handleMethodChange = useCallback((method: PaymentMethod, transactionId?: string) => {
    setSelectedPaymentMethod(method)
    if (transactionId !== undefined) setSelectedTransactionId(transactionId)
  }, [])

  const handlePaymentSubmit = useCallback(() => {
    if (!selectedPaymentMethod || !orderSlug || !order) return
    if (order.payment?.paymentMethod && order.payment.statusMessage === OrderStatus.COMPLETED) return
    if (selectedPaymentMethod === PaymentMethod.CREDIT_CARD && !selectedTransactionId.trim()) return

    const payload: { paymentMethod: string; orderSlug: string; transactionId?: string } = {
      paymentMethod: selectedPaymentMethod,
      orderSlug,
    }
    if (selectedTransactionId.trim()) payload.transactionId = selectedTransactionId.trim()

    initiatePayment(payload, {
      onSuccess: (response) => {
        if (response?.result?.qrCode) setQrCode(response.result.qrCode)
        refetchOrder()
      },
      onError: (error: unknown) => {
        if (error && typeof error === 'object' && 'response' in error) {
          const axiosError = error as { response?: { data?: { statusCode?: number; message?: string } } }
          if (axiosError.response?.data?.statusCode) { showErrorToast(axiosError.response.data.statusCode); return }
          if (axiosError.response?.data?.message) { showErrorToastMessage(axiosError.response.data.message); return }
        }
        showToast(t('paymentMethod.paymentError', 'Lỗi khi cập nhật phương thức thanh toán'))
      },
    })
  }, [selectedPaymentMethod, selectedTransactionId, orderSlug, order, initiatePayment, refetchOrder, t])

  if (isPending) {
    return <PaymentSkeletonShell />
  }

  if (showSuccess) {
    return (
      <PaymentSuccessScreen
        orderSlug={orderSlug ?? ''}
        primaryColor={primaryColor}
        isDark={isDark}
        onViewDetail={handleViewDetail}
      />
    )
  }

  if (!order) {
    return (
      <ScreenContainer edges={['top']} style={[{ flex: 1, backgroundColor: screenBg }]}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16 }}>
          <CircleX size={64} color={isDark ? colors.gray[400] : colors.gray[500]} />
          <Text style={{ marginTop: 16, textAlign: 'center', color: isDark ? colors.gray[400] : colors.gray[600] }}>
            {t('menu.noData', 'Không có dữ liệu')}
          </Text>
          <Pressable onPress={handleBack} style={[ps.checkoutBtn, { backgroundColor: primaryColor, marginTop: 16, paddingHorizontal: 24 }]}>
            <Text style={ps.checkoutBtnText}>{tCommon('common.goBack', 'Quay lại')}</Text>
          </Pressable>
        </View>
      </ScreenContainer>
    )
  }

  return (
    <View style={{ flex: 1, backgroundColor: screenBg }}>
      <ScreenContainer edges={['top']} style={{ flex: 1 }}>
        {/* Content — GestureScrollView tránh conflict với Stack swipe-back */}
        <GestureScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingTop: STATIC_TOP_INSET + 60, paddingBottom: 100 }}
          showsVerticalScrollIndicator={true}
        >
        <View style={ps.contentPad}>
          {/* Order Info — unified card, receipt style */}
          <View style={[ps.card, { backgroundColor: isDark ? colors.gray[800] : colors.white.light, borderColor: isDark ? colors.gray[700] : colors.gray[100] }]}>
            <View style={ps.receiptHeader}>
              <View style={ps.receiptHeaderRow}>
                <Text style={[ps.receiptTitle, { color: isDark ? colors.gray[50] : colors.gray[900], flex: 1 }]}>
                  {t('order.order', 'Đơn hàng')} #{order.slug}
                </Text>
                <View style={[ps.orderStatusBadge, {
                  backgroundColor: order.status === OrderStatus.PAID || order.status === OrderStatus.COMPLETED
                    ? `${colors.success.light}18`
                    : order.status === OrderStatus.PENDING
                      ? `${colors.warning.light}18`
                      : `${colors.gray[500]}18`,
                }]}>
                  <Text style={[ps.orderStatusText, {
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
              <Text style={[ps.receiptTime, { color: isDark ? colors.gray[400] : colors.gray[500] }]}>
                {formatDateTime(order.createdAt)}
              </Text>
            </View>
            <View style={[ps.receiptDivider, { backgroundColor: isDark ? colors.gray[700] : colors.gray[100] }]} />
            <View style={ps.receiptBody}>
              <View style={ps.receiptRow}>
                <Text style={[ps.receiptLabel, { color: isDark ? colors.gray[400] : colors.gray[500] }]}>{t('order.customer', 'Khách hàng')}</Text>
                <Text style={[ps.receiptValue, { color: isDark ? colors.gray[50] : colors.gray[900] }]}>
                  {order.owner?.firstName || order.owner?.lastName ? `${order.owner.firstName || ''} ${order.owner.lastName || ''}`.trim() : '-'}
                </Text>
              </View>
              {order.owner?.phonenumber && (
                <View style={ps.receiptRow}>
                  <Text style={[ps.receiptLabel, { color: isDark ? colors.gray[400] : colors.gray[500] }]}>{t('order.phone', 'Điện thoại')}</Text>
                  <Text style={[ps.receiptValue, { color: isDark ? colors.gray[50] : colors.gray[900] }]}>{order.owner.phonenumber}</Text>
                </View>
              )}
              <View style={ps.receiptRow}>
                <Text style={[ps.receiptLabel, { color: isDark ? colors.gray[400] : colors.gray[500] }]}>{t('order.orderType', 'Loại đơn')}</Text>
                <Text style={[ps.receiptValue, { color: isDark ? colors.gray[50] : colors.gray[900] }]}>
                  {order.type === OrderTypeEnum.AT_TABLE
                    ? `${t('order.dineIn', 'Tại bàn')} - Bàn số ${order.table?.name || '-'}`
                    : order.type === OrderTypeEnum.DELIVERY
                      ? t('menu.delivery', 'Giao hàng')
                      : t('order.takeAway', 'Mang đi')}
                </Text>
              </View>
              {order.type === OrderTypeEnum.DELIVERY && order.deliveryTo?.formattedAddress && (
                <View style={ps.receiptRow}>
                  <Text style={[ps.receiptLabel, { color: isDark ? colors.gray[400] : colors.gray[500] }]}>{t('order.deliveryAddress', 'Địa chỉ')}</Text>
                  <Text style={[ps.receiptValue, { color: isDark ? colors.gray[50] : colors.gray[900], flex: 1, textAlign: 'right' }]}>
                    {order.deliveryTo.formattedAddress}
                  </Text>
                </View>
              )}
              {order.description ? (
                <View style={ps.receiptRow}>
                  <Text style={[ps.receiptLabel, { color: isDark ? colors.gray[400] : colors.gray[500] }]}>{t('order.note', 'Ghi chú')}</Text>
                  <Text style={[ps.receiptValue, { color: isDark ? colors.gray[50] : colors.gray[900], flex: 1, textAlign: 'right' }]}>
                    {order.description}
                  </Text>
                </View>
              ) : null}
            </View>
          </View>

          {/* Order Items List — no section header, clean */}
          <View style={[ps.card, { backgroundColor: isDark ? colors.gray[800] : colors.white.light, borderColor: isDark ? colors.gray[700] : colors.gray[100], padding: 16 }]}>
              {orderItems.map((item, index) => (
                <PaymentProductItem
                  key={item.slug || index}
                  item={item}
                  displayItem={displayItemMap.get(item.slug) ?? null}
                  voucher={voucher}
                  primaryColor={primaryColor}
                  isDark={isDark}
                  isLast={index === orderItems.length - 1}
                  noNoteLabel={t('order.noNote', 'Không có ghi chú')}
                />
              ))}
          </View>

          {/* Payment Method Selection — isolated component */}
          <PaymentMethodSection
            order={order}
            primaryColor={primaryColor}
            isDark={isDark}
            onMethodChange={handleMethodChange}
            isInitiating={isInitiatingPayment}
            qrCode={qrCode}
          />

          {/* Payment Summary — receipt-style card */}
          <View style={[ps.card, { backgroundColor: isDark ? colors.gray[800] : colors.white.light, borderColor: isDark ? colors.gray[700] : colors.gray[100] }]}>
            <View style={ps.receiptHeader}>
              <Text style={[ps.receiptTitle, { color: isDark ? colors.gray[50] : colors.gray[900] }]}>
                {t('order.paymentInformation', 'Thông tin thanh toán')}
              </Text>
            </View>
            <View style={[ps.receiptDivider, { backgroundColor: isDark ? colors.gray[700] : colors.gray[100] }]} />
            <View style={ps.receiptBody}>
              {/* Payment method + status */}
              <View style={ps.receiptRow}>
                <Text style={[ps.receiptLabel, { color: isDark ? colors.gray[400] : colors.gray[500] }]}>{t('paymentMethod.title', 'Phương thức')}</Text>
                <Text style={[ps.receiptValue, { color: isDark ? colors.gray[50] : colors.gray[900] }]}>
                  {order.payment
                    ? order.payment.paymentMethod === PaymentMethod.BANK_TRANSFER ? t('paymentMethod.bankTransfer', 'Chuyển khoản')
                      : order.payment.paymentMethod === PaymentMethod.CASH ? t('paymentMethod.cash', 'Tiền mặt')
                      : order.payment.paymentMethod === PaymentMethod.POINT ? t('paymentMethod.point', 'Điểm tích lũy')
                      : t('paymentMethod.creditCard', 'Thẻ tín dụng')
                    : t('paymentMethod.notPaid', 'Chưa thanh toán')}
                </Text>
              </View>
              {order.payment && (
                <View style={ps.receiptRow}>
                  <Text style={[ps.receiptLabel, { color: isDark ? colors.gray[400] : colors.gray[500] }]}>{t('order.status', 'Trạng thái')}</Text>
                  <View style={[ps.statusBadge, { backgroundColor: order.payment.statusMessage === OrderStatus.COMPLETED ? colors.success.light : colors.warning.light }]}>
                    <Text style={[ps.statusBadgeText, { color: colors.white.light }]} numberOfLines={1}>
                      {getPaymentStatusLabel(order.payment.statusCode)}
                    </Text>
                  </View>
                </View>
              )}
              {order.payment?.paymentMethod === PaymentMethod.CREDIT_CARD && order.payment.transactionId && (
                <View style={ps.receiptRow}>
                  <Text style={[ps.receiptLabel, { color: isDark ? colors.gray[400] : colors.gray[500] }]}>{t('paymentMethod.transactionId', 'Mã giao dịch')}</Text>
                  <Text style={[ps.receiptValue, { color: isDark ? colors.gray[50] : colors.gray[900] }]}>{order.payment.transactionId}</Text>
                </View>
              )}

              <View style={[ps.receiptDivider, { backgroundColor: isDark ? colors.gray[700] : colors.gray[100], marginHorizontal: 0 }]} />

              {/* Price breakdown */}
              <View style={ps.receiptRow}>
                <Text style={[ps.receiptLabel, { color: isDark ? colors.gray[400] : colors.gray[500] }]}>{t('order.subTotal', 'Tổng tiền hàng')}</Text>
                <Text style={[ps.receiptValue, { color: isDark ? colors.gray[50] : colors.gray[900] }]}>{formatCurrency(cartTotals?.subTotalBeforeDiscount || 0)}</Text>
              </View>
              {(cartTotals?.promotionDiscount ?? 0) > 0 && (
                <View style={ps.receiptRow}>
                  <Text style={[ps.receiptLabel, { color: isDark ? colors.gray[400] : colors.gray[500] }]}>{t('order.discount', 'Khuyến mãi')}</Text>
                  <Text style={[ps.receiptValue, { color: colors.success.light }]}>-{formatCurrency(cartTotals?.promotionDiscount || 0)}</Text>
                </View>
              )}
              {order.voucher && (cartTotals?.voucherDiscount ?? 0) > 0 && (
                <View style={ps.receiptRow}>
                  <Text style={[ps.receiptLabel, { color: colors.success.light }]}>{t('order.voucher', 'Mã giảm giá')}</Text>
                  <Text style={[ps.receiptValue, { color: colors.success.light }]}>-{formatCurrency(cartTotals?.voucherDiscount || 0)}</Text>
                </View>
              )}
              {order.accumulatedPointsToUse > 0 && (
                <View style={ps.receiptRow}>
                  <Text style={[ps.receiptLabel, { color: primaryColor }]}>{t('order.loyaltyPoint', 'Điểm tích lũy')}</Text>
                  <Text style={[ps.receiptValue, { color: primaryColor }]}>-{formatCurrency(order.accumulatedPointsToUse)}</Text>
                </View>
              )}
              {order.type === OrderTypeEnum.DELIVERY && order.deliveryFee > 0 && (
                <View style={ps.receiptRow}>
                  <Text style={[ps.receiptLabel, { color: isDark ? colors.gray[400] : colors.gray[500] }]}>{t('order.deliveryFee', 'Phí giao hàng')}</Text>
                  <Text style={[ps.receiptValue, { color: isDark ? colors.gray[50] : colors.gray[900] }]}>{formatCurrency(order.deliveryFee)}</Text>
                </View>
              )}
              {order.loss > 0 && (
                <View style={ps.receiptRow}>
                  <Text style={[ps.receiptLabel, { color: colors.success.light }]}>{t('order.invoiceAutoDiscountUnderThreshold', 'Giảm giá tự động')}</Text>
                  <Text style={[ps.receiptValue, { color: colors.success.light }]}>-{formatCurrency(order.loss)}</Text>
                </View>
              )}

              <View style={[ps.receiptDivider, { backgroundColor: isDark ? colors.gray[700] : colors.gray[200], marginHorizontal: 0 }]} />

              {/* Total */}
              <View style={ps.receiptRow}>
                <Text style={[ps.semibold, { color: isDark ? colors.gray[50] : colors.gray[900] }]}>{t('order.totalPayment', 'Tổng thanh toán')}</Text>
                <Text style={[ps.totalPrice, { color: primaryColor }]}>{formatCurrency(order.subtotal || 0)}</Text>
              </View>
              <Text style={[ps.xsText, { color: isDark ? colors.gray[400] : colors.gray[500] }]}>
                ({order.orderItems?.length || 0} {t('order.product', 'sản phẩm')})
              </Text>
            </View>
          </View>

          {/* Invoice — isolated component */}
          <InvoiceSection order={order} primaryColor={primaryColor} isDark={isDark} />
        </View>
        </GestureScrollView>

        {/* Bottom Action Bar */}
        {order.status === OrderStatus.PENDING && (
          <View style={[ps.bottomBar, { paddingBottom: insets.bottom, backgroundColor: isDark ? colors.gray[800] : colors.white.light, borderTopColor: isDark ? colors.gray[700] : colors.gray[200] }]}>
            <Pressable
              onPress={handlePaymentSubmit}
              disabled={!selectedPaymentMethod || isInitiatingPayment}
              style={[ps.checkoutBtn, { backgroundColor: selectedPaymentMethod ? primaryColor : (isDark ? colors.gray[600] : colors.gray[300]) }]}
            >
              {isInitiatingPayment
                ? <ActivityIndicator color={colors.white.light} />
                : <Text style={ps.checkoutBtnText}>
                    {selectedPaymentMethod
                      ? tCommon('common.checkout', 'Thanh toán')
                      : t('paymentMethod.noMethodSelected', 'Chưa chọn phương thức')}
                  </Text>
              }
            </Pressable>
          </View>
        )}
        <FloatingHeader title={t('order.orderDetail', 'Chi tiết đơn hàng')} onBack={handleBack} />
      </ScreenContainer>
    </View>
  )
}

const ps = StyleSheet.create({
  contentPad: { paddingHorizontal: 16, paddingVertical: 16 },
  receiptHeader: { padding: 16, gap: 4 },
  receiptTitle: { fontSize: 16, fontWeight: '700' },
  receiptTime: { fontSize: 12 },
  receiptDivider: { height: StyleSheet.hairlineWidth, marginHorizontal: 16 },
  receiptBody: { padding: 16, gap: 10 },
  receiptRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 },
  receiptLabel: { fontSize: 13 },
  receiptValue: { fontSize: 13, fontWeight: '500' },
  card: { marginBottom: 16, borderRadius: 12, borderWidth: 1, overflow: 'hidden' },
  semibold: { fontSize: 16, fontWeight: '600' },
  smText: { fontSize: 14 },
  xsText: { fontSize: 12 },
  lgBold: { fontSize: 18, fontWeight: '700' },
  statusBadge: { alignSelf: 'flex-start', borderRadius: 6, paddingHorizontal: 10, paddingVertical: 4, marginTop: 8 },
  statusBadgeText: { fontSize: 12, fontWeight: '500' },
  processingRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingBottom: 16 },
  qrSection: { paddingHorizontal: 16, paddingBottom: 16, paddingTop: 16, borderTopWidth: StyleSheet.hairlineWidth },
  qrCenter: { alignItems: 'center' },
  qrImage: { width: '40%', aspectRatio: 1 },
  qrInfoCol: { gap: 8, alignItems: 'center', marginTop: 8 },
  qrTotalRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  qrNoteRow: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 16 },
  totalPrice: { fontSize: 24, fontWeight: '800' },
  bottomBar: { borderTopWidth: StyleSheet.hairlineWidth, paddingHorizontal: 16, paddingTop: 16 },
  checkoutBtn: { height: 48, borderRadius: 9999, alignItems: 'center', justifyContent: 'center' },
  checkoutBtnText: { fontSize: 15, fontWeight: '700', color: colors.white.light },
  receiptHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  orderStatusBadge: { borderRadius: 6, paddingHorizontal: 10, paddingVertical: 4 },
  orderStatusText: { fontSize: 11, fontWeight: '600' },
})

export default function PaymentPage() {
  const [ready, setReady] = useState(false)
  useRunAfterTransition(() => setReady(true), [])
  if (!ready) return <PaymentSkeletonShell />
  return <PaymentPageContent />
}
