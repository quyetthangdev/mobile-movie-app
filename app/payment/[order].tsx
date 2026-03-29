import { ScreenContainer } from '@/components/layout'
import { FloatingHeader } from '@/components/navigation/floating-header'
import { Image as ExpoImage } from 'expo-image'
import { useLocalSearchParams } from 'expo-router'
import { CheckCircle2, CircleAlert, CircleX, Download, FileDown } from 'lucide-react-native'
import React, { useCallback, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ActivityIndicator, Image, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, useColorScheme, View } from 'react-native'
import { ScrollView as GestureScrollView } from 'react-native-gesture-handler'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { Images } from '@/assets/images'
import { InvoiceTemplate } from '@/components/profile'
import PaymentMethodRadioGroup from '@/components/radio/payment-method-radio-group'
import { Skeleton } from '@/components/ui'
import { APPLICABILITY_RULE, colors, PaymentMethod, publicFileURL, ROUTE, TAB_ROUTES, VOUCHER_TYPE } from '@/constants'
import { STATIC_TOP_INSET } from '@/constants/status-bar'
import { useExportPublicOrderInvoice, useInitiatePayment, useInitiatePublicPayment, useOrderBySlug, useRunAfterTransition } from '@/hooks'
import { navigateNative } from '@/lib/navigation'
import { useDownloadStore, useUserStore } from '@/stores'
import type { IOrderItems } from '@/types'
import { OrderStatus, OrderTypeEnum } from '@/types'
import { calculateOrderDisplayAndTotals, capitalizeFirstLetter, downloadAndSavePDF, formatCurrency, formatDateTime, getPaymentStatusLabel, showErrorToast, showErrorToastMessage, showToast } from '@/utils'

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
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#fff', borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#e5e7eb' },
  card: { marginBottom: 16, borderRadius: 12, backgroundColor: '#fff', borderWidth: 1, borderColor: '#f3f4f6', padding: 16, gap: 12 },
})

// ─── PaymentProductItem (memo'd, StyleSheet) ───────────────────────────────

type DisplayItemData = ReturnType<typeof calculateOrderDisplayAndTotals>['displayItems'][number]

const PaymentProductItem = React.memo(function PaymentProductItem({
  item,
  displayItem,
  voucher,
  primaryColor,
  isDark,
  isLast,
  noNoteLabel,
}: {
  item: IOrderItems
  displayItem: DisplayItemData | null
  voucher: { type?: string; applicabilityRule?: string; voucherProducts?: { product?: { slug?: string } }[] } | null
  primaryColor: string
  isDark: boolean
  isLast: boolean
  noNoteLabel: string
}) {
  const original = item.variant?.price || 0
  const priceAfterPromotion = displayItem?.priceAfterPromotion || 0
  const finalPrice = displayItem?.finalPrice || 0

  const isSamePriceVoucher =
    voucher?.type === VOUCHER_TYPE.SAME_PRICE_PRODUCT &&
    voucher?.voucherProducts?.some((vp) => vp.product?.slug === item.variant?.product?.slug)
  const isAtLeastOneVoucher =
    voucher?.applicabilityRule === APPLICABILITY_RULE.AT_LEAST_ONE_REQUIRED &&
    voucher?.voucherProducts?.some((vp) => vp.product?.slug === item.variant?.product?.slug)
  const hasVoucherDiscount = (displayItem?.voucherDiscount ?? 0) > 0
  const hasPromotionDiscount = (displayItem?.promotionDiscount ?? 0) > 0

  const displayPrice = isSamePriceVoucher
    ? finalPrice * item.quantity
    : isAtLeastOneVoucher && hasVoucherDiscount
      ? (original - (displayItem?.voucherDiscount || 0)) * item.quantity
      : hasPromotionDiscount
        ? priceAfterPromotion * item.quantity
        : original * item.quantity

  const shouldShowLineThrough = isSamePriceVoucher || hasPromotionDiscount || hasVoucherDiscount

  return (
    <View style={!isLast ? [pItemStyles.row, pItemStyles.rowBorder] : pItemStyles.row}>
      <View style={pItemStyles.contentRow}>
        <View style={pItemStyles.imageWrap}>
          <ExpoImage
            source={
              item.variant?.product?.image
                ? { uri: `${publicFileURL}/${item.variant.product.image}` }
                : Images.Food.ProductImage as unknown as number
            }
            style={pItemStyles.image}
            contentFit="cover"
            cachePolicy="disk"
          />
          <View style={[pItemStyles.qtyBadge, { backgroundColor: primaryColor }]}>
            <Text style={pItemStyles.qtyText}>x{item.quantity}</Text>
          </View>
        </View>

        <View style={pItemStyles.info}>
          <Text style={[pItemStyles.name, { color: isDark ? colors.gray[50] : colors.gray[900] }]} numberOfLines={2}>
            {capitalizeFirstLetter(item.variant?.product?.name || '')}
          </Text>
          <View style={[pItemStyles.sizeBadge, { borderColor: primaryColor, backgroundColor: isDark ? colors.gray[800] : `${primaryColor}18` }]}>
            <Text style={[pItemStyles.sizeText, { color: primaryColor }]} numberOfLines={1}>
              {capitalizeFirstLetter(item.variant?.size?.name || '')}
            </Text>
          </View>
        </View>

        <View style={pItemStyles.priceCol}>
          {shouldShowLineThrough && (
            <Text style={pItemStyles.priceStrike}>{formatCurrency(original * item.quantity)}</Text>
          )}
          <Text style={[pItemStyles.priceMain, { color: primaryColor }]}>{formatCurrency(displayPrice)}</Text>
        </View>
      </View>

      {item.note ? (
        <View style={[pItemStyles.noteWrap, { backgroundColor: isDark ? colors.gray[700] : '#f9fafb' }]}>
          <TextInput
            value={item.note}
            editable={false}
            multiline
            style={[pItemStyles.noteInput, { color: isDark ? colors.gray[400] : colors.gray[600] }]}
            placeholder={noNoteLabel}
          />
        </View>
      ) : null}
    </View>
  )
})

const pItemStyles = StyleSheet.create({
  row: {},
  rowBorder: { marginBottom: 16, paddingBottom: 16, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#e5e7eb' },
  contentRow: { flexDirection: 'row', gap: 16, alignItems: 'flex-start' },
  imageWrap: { position: 'relative', width: 64, height: 64 },
  image: { width: 64, height: 64, borderRadius: 8 },
  qtyBadge: { position: 'absolute', right: -8, bottom: -8, width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  qtyText: { fontSize: 10, fontWeight: '700', color: '#fff' },
  info: { flex: 1, gap: 4 },
  name: { fontSize: 14, fontWeight: '600', marginBottom: 2 },
  sizeBadge: { alignSelf: 'flex-start', borderWidth: 1, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2 },
  sizeText: { fontSize: 12, fontWeight: '500' },
  priceCol: { alignItems: 'flex-end' },
  priceStrike: { fontSize: 14, color: '#9ca3af', textDecorationLine: 'line-through', marginBottom: 2 },
  priceMain: { fontSize: 14, fontWeight: '600' },
  noteWrap: { marginTop: 8, borderRadius: 8 },
  noteInput: { width: '100%', fontSize: 12, padding: 8 },
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
  orderSlug,
  primaryColor,
  isDark,
  refetchOrder,
}: {
  order: NonNullable<ReturnType<typeof useOrderBySlug>['data']>['result']
  orderSlug: string
  primaryColor: string
  isDark: boolean
  refetchOrder: () => void
}) {
  const { t } = useTranslation('menu')
  const userInfo = useUserStore((s) => s.userInfo)
  const isLoggedIn = !!userInfo
  const { mutate: initiatePaymentAuth, isPending: isInitiatingPaymentAuth } = useInitiatePayment()
  const { mutate: initiatePaymentPublic, isPending: isInitiatingPaymentPublic } = useInitiatePublicPayment()
  const initiatePayment = isLoggedIn ? initiatePaymentAuth : initiatePaymentPublic
  const isInitiatingPayment = isLoggedIn ? isInitiatingPaymentAuth : isInitiatingPaymentPublic
  const [qrCode, setQrCode] = useState<string | null>(null)

  const handleSubmit = useCallback((paymentMethod: PaymentMethod, transactionId?: string) => {
    if (!orderSlug || !order) return
    if (order.payment?.paymentMethod && order.payment.statusMessage === OrderStatus.COMPLETED) return
    if (order.payment?.paymentMethod === paymentMethod) return
    if (paymentMethod === PaymentMethod.CREDIT_CARD && !transactionId?.trim()) return

    const payload: { paymentMethod: string; orderSlug: string; transactionId?: string } = { paymentMethod, orderSlug }
    if (transactionId?.trim()) payload.transactionId = transactionId.trim()

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
  }, [orderSlug, order, t, initiatePayment, refetchOrder])

  if (!order || order.status !== OrderStatus.PENDING) return null

  return (
    <View style={[ps.card, { backgroundColor: isDark ? colors.gray[800] : '#fff', borderColor: isDark ? colors.gray[700] : colors.gray[100] }]}>
      <View style={[pSectionStyles.cardHeader, { backgroundColor: isDark ? colors.gray[900] : '#f9fafb', borderBottomColor: isDark ? colors.gray[700] : colors.gray[100] }]}>
        <Text style={[ps.semibold, { color: isDark ? colors.gray[50] : colors.gray[900] }]}>{t('paymentMethod.title', 'Phương thức thanh toán')}</Text>
        <Text style={[ps.xsText, { color: isDark ? colors.gray[400] : colors.gray[500], marginTop: 4 }]}>({t('paymentMethod.cashMethodNote', 'Chọn phương thức thanh toán')})</Text>
      </View>
      <View style={pSectionStyles.cardBody}>
        <PaymentMethodRadioGroup
          order={order}
          defaultValue={order.payment?.paymentMethod || null}
          disabledMethods={order.payment?.paymentMethod ? [order.payment.paymentMethod as PaymentMethod] : []}
          disabledReasons={order.payment?.paymentMethod ? { [order.payment.paymentMethod as PaymentMethod]: t('paymentMethod.alreadyPaid', 'Đã thanh toán') } as Record<PaymentMethod, string> : undefined}
          onSubmit={handleSubmit}
        />
      </View>
      {isInitiatingPayment && (
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

// ─── InvoiceSection (isolates useDownloadStore + exportInvoice) ──────────────

const InvoiceSection = React.memo(function InvoiceSection({
  order,
  primaryColor,
  isDark,
}: {
  order: NonNullable<ReturnType<typeof useOrderBySlug>['data']>['result']
  primaryColor: string
  isDark: boolean
}) {
  const { t: tCommon } = useTranslation('common')
  const { t } = useTranslation('menu')
  const { mutate: exportInvoice, isPending: isExportingInvoice } = useExportPublicOrderInvoice()
  const { isDownloading, progress, fileName } = useDownloadStore()

  const orderSlugForInvoice = order?.slug
  const handleDownload = useCallback(() => {
    if (!orderSlugForInvoice) return
    exportInvoice(orderSlugForInvoice, {
      onSuccess: async (blob) => {
        const name = `TRENDCoffee-invoice-${orderSlugForInvoice}-${Date.now()}`
        await downloadAndSavePDF(blob, name)
      },
      onError: () => showToast('Lỗi khi xuất hóa đơn'),
    })
  }, [orderSlugForInvoice, exportInvoice])

  if (!order || order.status !== OrderStatus.PAID) return null

  return (
    <View style={ps.invoiceSection}>
      <Text style={[ps.invoiceTitle, { color: isDark ? colors.gray[400] : colors.gray[600] }]}>{t('order.invoice', 'Hóa đơn')}</Text>
      <InvoiceTemplate order={order} />
      {(isExportingInvoice || isDownloading) && (
        <View style={[ps.downloadCard, { backgroundColor: isDark ? colors.gray[900] : '#fff', borderColor: isDark ? colors.gray[700] : colors.gray[200] }]}>
          <View style={ps.downloadRow}>
            <View style={[ps.downloadIcon, { backgroundColor: `${primaryColor}18` }]}>
              <Download size={20} color={primaryColor} />
            </View>
            <View style={ps.flex1}>
              <Text style={[ps.smSemibold, { color: isDark ? colors.gray[100] : colors.gray[900] }]}>
                {isExportingInvoice ? tCommon('common.downloadingInvoice', 'Đang tải hóa đơn...') : tCommon('common.savingFile', 'Đang lưu file...')}
              </Text>
              <Text style={[ps.xsText, { color: isDark ? colors.gray[400] : colors.gray[500], marginTop: 2 }]}>
                {isExportingInvoice ? tCommon('common.pleaseWait', 'Vui lòng đợi trong giây lát') : tCommon('common.savingToDownloads', 'Đang lưu vào thư mục Downloads')}
              </Text>
            </View>
            {progress > 0 && (
              <View style={[ps.progressBadge, { backgroundColor: `${primaryColor}18` }]}>
                <Text style={[ps.smBold, { color: primaryColor }]}>{progress}%</Text>
              </View>
            )}
          </View>
          {progress > 0 ? (
            <View style={[ps.progressTrack, { backgroundColor: isDark ? colors.gray[800] : colors.gray[100] }]}>
              <View style={[ps.progressFill, { width: `${progress}%` as unknown as number, backgroundColor: primaryColor }]} />
            </View>
          ) : (
            <View style={ps.processingRow}>
              <ActivityIndicator size="small" color={primaryColor} />
              <Text style={[ps.xsText, { color: isDark ? colors.gray[400] : colors.gray[500] }]}>{tCommon('common.processing', 'Đang xử lý...')}</Text>
            </View>
          )}
        </View>
      )}
      {fileName && !isDownloading && !isExportingInvoice && (
        <View style={[ps.successCard, { backgroundColor: isDark ? 'rgba(34,197,94,0.1)' : '#f0fdf4', borderColor: isDark ? '#166534' : '#bbf7d0' }]}>
          <View style={ps.downloadRow}>
            <CheckCircle2 size={24} color="#10b981" />
            <View style={ps.flex1}>
              <Text style={[ps.smSemibold, { color: isDark ? '#86efac' : '#166534' }]}>{tCommon('common.downloadSuccess', 'Đã tải xuống thành công')}</Text>
              <Text style={[ps.xsText, { color: isDark ? '#86efac' : '#15803d', marginTop: 2 }]}>
                {Platform.OS === 'android' ? tCommon('common.fileSavedToDownloads', 'File đã lưu vào thư mục Downloads') : tCommon('common.fileSavedToFilesApp', 'File đã lưu vào Files app')}
              </Text>
            </View>
          </View>
        </View>
      )}
      <Pressable onPress={handleDownload} disabled={isExportingInvoice || isDownloading} style={[ps.downloadBtn, { backgroundColor: (isExportingInvoice || isDownloading) ? colors.gray[400] : primaryColor }]}>
        <FileDown size={18} color="#fff" />
        <Text style={ps.downloadBtnText}>{(isExportingInvoice || isDownloading) ? tCommon('common.downloading', 'Đang tải...') : tCommon('common.downloadPDF', 'Tải xuống PDF')}</Text>
      </Pressable>
    </View>
  )
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


  const handleCheckout = useCallback(() => {
    navigateNative.push(`${ROUTE.CLIENT_PAYMENT.replace('[order]', orderSlug || '')}` as Parameters<typeof navigateNative.push>[0])
  }, [orderSlug])

  const handleRefetchOrder = useCallback(() => { refetchOrder() }, [refetchOrder])

  if (isPending) {
    return <PaymentSkeletonShell />
  }

  if (!order) {
    return (
      <ScreenContainer edges={['top']} style={[{ flex: 1, backgroundColor: screenBg }]}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16 }}>
          <CircleX size={64} color={isDark ? '#9ca3af' : '#6b7280'} />
          <Text style={{ marginTop: 16, textAlign: 'center', color: isDark ? colors.gray[400] : colors.gray[600] }}>
            {t('menu.noData', 'Không có d�� liệu')}
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
          <View style={[ps.card, { backgroundColor: isDark ? colors.gray[800] : '#fff', borderColor: isDark ? colors.gray[700] : colors.gray[100] }]}>
            <View style={ps.receiptHeader}>
              <Text style={[ps.receiptTitle, { color: isDark ? colors.gray[50] : colors.gray[900] }]}>
                {t('order.order', 'Đơn hàng')} #{order.slug}
              </Text>
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
                    ? `${t('order.dineIn', 'Tại bàn')} - ${order.table?.name || '-'}`
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
          <View style={[ps.card, { backgroundColor: isDark ? colors.gray[800] : '#fff', borderColor: isDark ? colors.gray[700] : colors.gray[100], padding: 16 }]}>
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
            orderSlug={orderSlug ?? ''}
            primaryColor={primaryColor}
            isDark={isDark}
            refetchOrder={handleRefetchOrder}
          />

          {/* Payment Summary — receipt-style card */}
          <View style={[ps.card, { backgroundColor: isDark ? colors.gray[800] : '#fff', borderColor: isDark ? colors.gray[700] : colors.gray[100] }]}>
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
                  <View style={[ps.statusBadge, { backgroundColor: order.payment.statusMessage === OrderStatus.COMPLETED ? '#22c55e' : '#eab308' }]}>
                    <Text style={[ps.statusBadgeText, { color: '#fff' }]} numberOfLines={1}>
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
                  <Text style={[ps.receiptValue, { color: '#22c55e' }]}>-{formatCurrency(cartTotals?.promotionDiscount || 0)}</Text>
                </View>
              )}
              {order.voucher && (cartTotals?.voucherDiscount ?? 0) > 0 && (
                <View style={ps.receiptRow}>
                  <Text style={[ps.receiptLabel, { color: '#22c55e' }]}>{t('order.voucher', 'Mã giảm giá')}</Text>
                  <Text style={[ps.receiptValue, { color: '#22c55e' }]}>-{formatCurrency(cartTotals?.voucherDiscount || 0)}</Text>
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
                  <Text style={[ps.receiptLabel, { color: '#22c55e' }]}>{t('order.invoiceAutoDiscountUnderThreshold', 'Giảm giá tự động')}</Text>
                  <Text style={[ps.receiptValue, { color: '#22c55e' }]}>-{formatCurrency(order.loss)}</Text>
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
          <View style={[ps.bottomBar, { paddingBottom: insets.bottom, backgroundColor: isDark ? colors.gray[800] : '#fff', borderTopColor: isDark ? colors.gray[700] : colors.gray[200] }]}>
            <Pressable onPress={handleCheckout} style={[ps.checkoutBtn, { backgroundColor: primaryColor }]}>
              <Text style={ps.checkoutBtnText}>{tCommon('common.checkout', 'Thanh toán')}</Text>
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
  // orderHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  // bold: { fontWeight: '700' },
  semibold: { fontSize: 16, fontWeight: '600' },
  smText: { fontSize: 14 },
  // smTextFlex: { fontSize: 14, flex: 1 },
  xsText: { fontSize: 12 },
  // smItalic: { fontSize: 14, fontStyle: 'italic', fontWeight: '500' },
  // smItalicBold: { fontSize: 14, fontStyle: 'italic', fontWeight: '600' },
  smSemibold: { fontSize: 14, fontWeight: '600' },
  smBold: { fontSize: 14, fontWeight: '700' },
  lgBold: { fontSize: 18, fontWeight: '700' },
  // greenItalic: { fontSize: 14, fontStyle: 'italic', fontWeight: '500', color: '#22c55e' },
  // greenItalicBold: { fontSize: 14, fontStyle: 'italic', fontWeight: '600', color: '#22c55e' },
  // infoCol: { gap: 4 },
  // infoRow: { flexDirection: 'row' },
  // padSection: { paddingHorizontal: 12, paddingVertical: 16 },
  // twinCardRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  // twinCard: { flex: 1, borderRadius: 12, borderWidth: 1, overflow: 'hidden' },
  // twinCardHeader: { paddingHorizontal: 12, paddingVertical: 8 },
  // twinCardBody: { paddingHorizontal: 12, paddingVertical: 8 },
  // statusHeader: { paddingHorizontal: 12, paddingVertical: 16, borderTopLeftRadius: 12, borderTopRightRadius: 12 },
  statusBadge: { alignSelf: 'flex-start', borderRadius: 6, paddingHorizontal: 10, paddingVertical: 4, marginTop: 8 },
  statusBadgeText: { fontSize: 12, fontWeight: '500' },
  processingRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingBottom: 16 },
  qrSection: { paddingHorizontal: 16, paddingBottom: 16, paddingTop: 16, borderTopWidth: StyleSheet.hairlineWidth },
  qrCenter: { alignItems: 'center' },
  qrImage: { width: '40%', aspectRatio: 1 },
  qrInfoCol: { gap: 8, alignItems: 'center', marginTop: 8 },
  qrTotalRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  qrNoteRow: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 16 },
  // summaryBody: { gap: 8, paddingHorizontal: 12, paddingVertical: 8 },
  // summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  // summaryRowBorder: { paddingBottom: 16, borderBottomWidth: StyleSheet.hairlineWidth },
  // separator: { height: StyleSheet.hairlineWidth, marginVertical: 8 },
  totalPrice: { fontSize: 24, fontWeight: '800' },
  invoiceSection: { marginBottom: 16 },
  invoiceTitle: { fontSize: 18, textAlign: 'center', marginBottom: 16 },
  downloadCard: { marginBottom: 16, padding: 16, borderRadius: 12, borderWidth: 1 },
  downloadRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  downloadIcon: { padding: 8, borderRadius: 999 },
  flex1: { flex: 1 },
  progressBadge: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 999 },
  progressTrack: { height: 10, borderRadius: 999, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 999 },
  successCard: { marginBottom: 16, padding: 16, borderRadius: 12, borderWidth: 1 },
  downloadBtn: { height: 48, borderRadius: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  downloadBtnText: { fontSize: 15, fontWeight: '600', color: '#fff' },
  bottomBar: { borderTopWidth: StyleSheet.hairlineWidth, paddingHorizontal: 16, paddingTop: 16 },
  checkoutBtn: { height: 48, borderRadius: 9999, alignItems: 'center', justifyContent: 'center' },
  checkoutBtnText: { fontSize: 15, fontWeight: '700', color: '#fff' },
})

export default function PaymentPage() {
  const [ready, setReady] = useState(false)
  useRunAfterTransition(() => setReady(true), [])
  if (!ready) return <PaymentSkeletonShell />
  return <PaymentPageContent />
}
