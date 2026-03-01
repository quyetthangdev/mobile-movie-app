import { useLocalSearchParams } from 'expo-router'
import { ArrowLeft, CheckCircle2, CircleAlert, CircleX, Download, FileDown, SquareMenu } from 'lucide-react-native'
import React, { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ActivityIndicator, Image, type ImageSourcePropType, Platform, ScrollView, Text, TextInput, TouchableOpacity, useColorScheme, View } from 'react-native'
import { ScrollView as GestureScrollView } from 'react-native-gesture-handler'
import { ScreenContainer } from '@/components/layout'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { InvoiceTemplate } from '@/app/profile/components'
import { Images } from '@/assets/images'
import PaymentMethodRadioGroup from '@/components/radio/payment-method-radio-group'
import { Badge, Button, Skeleton } from '@/components/ui'
import { APPLICABILITY_RULE, colors, PaymentMethod, publicFileURL, ROUTE, TAB_ROUTES, VOUCHER_TYPE } from '@/constants'
import { navigateNative } from '@/lib/navigation'
import { useExportPublicOrderInvoice, useInitiatePayment, useInitiatePublicPayment, useOrderBySlug, useRunAfterTransition } from '@/hooks'
import { useDownloadStore, useUserStore } from '@/stores'
import { OrderStatus, OrderTypeEnum } from '@/types'
import { calculateOrderItemDisplay, calculatePlacedOrderTotals, capitalizeFirstLetter, downloadAndSavePDF, formatCurrency, formatDateTime, getPaymentStatusLabel, showErrorToast, showErrorToastMessage, showToast } from '@/utils'

function PaymentSkeletonShell() {
  return (
    <ScreenContainer edges={['top']} className="flex-1 bg-gray-50 dark:bg-gray-900">
      <View className="bg-white dark:bg-gray-800 px-4 py-3 flex-row items-center border-b border-gray-200 dark:border-gray-700">
        <Skeleton className="w-8 h-8 rounded-full mr-3" />
        <Skeleton className="h-5 w-48 rounded-md" />
      </View>
      <ScrollView contentContainerStyle={{ padding: 16 }}>
        <View className="mb-4 rounded-lg bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 p-4 gap-3">
          <Skeleton className="h-4 w-32 rounded-md" />
          <Skeleton className="h-6 w-40 rounded-md" />
          <Skeleton className="h-4 w-28 rounded-md" />
          <Skeleton className="h-4 w-24 rounded-md" />
        </View>
        <View className="mb-4 rounded-lg bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 p-4 gap-3">
          <Skeleton className="h-4 w-40 rounded-md" />
          <Skeleton className="h-10 w-full rounded-lg" />
          <Skeleton className="h-10 w-full rounded-lg" />
        </View>
      </ScrollView>
    </ScreenContainer>
  )
}

function PaymentPageContent() {
  const { t } = useTranslation('menu')
  const { t: tCommon } = useTranslation('common')
  const { order: orderSlug } = useLocalSearchParams<{ order: string }>()
  const isDark = useColorScheme() === 'dark'
  const primaryColor = isDark ? colors.primary.dark : colors.primary.light

  const insets = useSafeAreaInsets()
  const { data: orderResponse, isPending, refetch: refetchOrder } = useOrderBySlug(orderSlug)
  const order = orderResponse?.result
  const { mutate: exportInvoice, isPending: isExportingInvoice } = useExportPublicOrderInvoice()
  const { userInfo } = useUserStore()
  const isLoggedIn = !!userInfo
  
  // Use authenticated payment hook if logged in, otherwise use public hook
  const { mutate: initiatePaymentAuth, isPending: isInitiatingPaymentAuth } = useInitiatePayment()
  const { mutate: initiatePaymentPublic, isPending: isInitiatingPaymentPublic } = useInitiatePublicPayment()
  
  const initiatePayment = isLoggedIn ? initiatePaymentAuth : initiatePaymentPublic
  const isInitiatingPayment = isLoggedIn ? isInitiatingPaymentAuth : isInitiatingPaymentPublic
  
  const { isDownloading, progress, fileName } = useDownloadStore()
  const [qrCode, setQrCode] = useState<string | null>(null)

  const orderItems = useMemo(() => order?.orderItems || [], [order?.orderItems])
  const voucher = order?.voucher || null

  const displayItems = useMemo(
    () => calculateOrderItemDisplay(orderItems, voucher),
    [orderItems, voucher]
  )

  const cartTotals = useMemo(() => {
    const totals = calculatePlacedOrderTotals(displayItems, voucher)
    if (!totals) return null
    
    return totals
  }, [displayItems, voucher])

  const handleBack = () => {
    navigateNative.replace(TAB_ROUTES.HOME)
  }

  const handleDownloadInvoice = () => {
    if (!order?.slug) {
      showToast('Không tìm thấy đơn hàng')
      return
    }
    
    exportInvoice(order.slug, {
      onSuccess: async (blob) => {
        const fileName = `TRENDCoffee-invoice-${order.slug}-${Date.now()}`
        await downloadAndSavePDF(blob, fileName)
      },
      onError: (error) => {
        // eslint-disable-next-line no-console
        console.error('Error exporting invoice:', error)
        showToast('Lỗi khi xuất hóa đơn')
      },
    })
  }

  // const handleGoToHistory = () => {
  //   router.push(`${ROUTE.CLIENT_PROFILE_HISTORY}?tab=history` as Parameters<typeof router.push>[0])
  // }

  const handleCheckout = () => {
    navigateNative.push(`${ROUTE.CLIENT_PAYMENT.replace('[order]', orderSlug || '')}` as Parameters<typeof navigateNative.push>[0])
  }

  const handlePaymentMethodSubmit = (paymentMethod: PaymentMethod, transactionId?: string) => {
    if (!orderSlug || !order) {
      showToast(t('paymentMethod.orderNotFound', 'Không tìm thấy đơn hàng'))
      return
    }

    // Don't allow changing payment method if already paid
    if (order.payment?.paymentMethod && order.payment.statusMessage === OrderStatus.COMPLETED) {
      showToast(t('paymentMethod.alreadyPaid', 'Đơn hàng đã được thanh toán'))
      return
    }

    // Don't allow initiating payment if order already has a payment method
    // Only allow changing if order status is PENDING and payment is not completed
    if (order.payment?.paymentMethod && order.payment.statusMessage !== OrderStatus.COMPLETED) {
      // Allow changing payment method if order is still pending
      // But check if the selected method is different from current
      if (order.payment.paymentMethod === paymentMethod) {
        showToast(t('paymentMethod.samePaymentMethod', 'Phương thức thanh toán này đã được chọn'))
        return
      }
    }

    // Validate transaction ID for credit card
    if (paymentMethod === PaymentMethod.CREDIT_CARD && !transactionId?.trim()) {
      showToast(t('paymentMethod.transactionIdRequired', 'Vui lòng nhập mã giao dịch'))
      return
    }

    // Prepare request payload
    const requestPayload: {
      paymentMethod: string
      orderSlug: string
      transactionId?: string
    } = {
      paymentMethod: paymentMethod as string, // Ensure it's a string
      orderSlug,
    }

    // Only include transactionId if it's provided and not empty
    if (transactionId?.trim()) {
      requestPayload.transactionId = transactionId.trim()
    }

    initiatePayment(
      requestPayload,
      {
        onSuccess: (response) => {
          // Store QR code if available
          if (response?.result?.qrCode) {
            setQrCode(response.result.qrCode)
          }
          
          // Refresh order data to get updated payment info
          refetchOrder()
          
          // Show success message
          if (paymentMethod === PaymentMethod.BANK_TRANSFER) {
            showToast(t('paymentMethod.paymentInitiated', 'Đã khởi tạo thanh toán. Vui lòng quét QR code để thanh toán.'))
          } else {
            showToast(t('paymentMethod.paymentMethodUpdated', 'Đã cập nhật phương thức thanh toán'))
          }
        },
        onError: (error: unknown) => {
          // eslint-disable-next-line no-console
          console.error('Error initiating payment:', error)
          // eslint-disable-next-line no-console
          console.error('Request payload was:', requestPayload)
          
          // Check if it's an Axios error with response data
          if (error && typeof error === 'object' && 'response' in error) {
            const axiosError = error as { response?: { data?: { statusCode?: number; message?: string } } }
             
            if (axiosError.response?.data) {
              const errorData = axiosError.response.data
              // eslint-disable-next-line no-console
              console.error('Error response data:', errorData)
              
              // Use statusCode to show appropriate error toast
              if (errorData.statusCode) {
                showErrorToast(errorData.statusCode)
              } else if (errorData.message) {
                // Use message from server if available
                showErrorToastMessage(errorData.message)
              } else {
                showToast(t('paymentMethod.paymentError', 'Lỗi khi cập nhật phương thức thanh toán'))
              }
              return
            }
          }
          
          // Fallback to generic error message
          showToast(t('paymentMethod.paymentError', 'Lỗi khi cập nhật phương thức thanh toán'))
        },
      }
    )
  }

  if (isPending) {
    return (
      <ScreenContainer edges={['top']} className="flex-1 bg-gray-50 dark:bg-gray-900">
        {/* Header skeleton */}
        <View className="bg-white dark:bg-gray-800 px-4 py-3 flex-row items-center border-b border-gray-200 dark:border-gray-700">
          <Skeleton className="w-8 h-8 rounded-full mr-3" />
          <Skeleton className="h-5 w-48 rounded-md" />
        </View>

        {/* Content skeleton */}
        <ScrollView contentContainerStyle={{ padding: 16 }}>
          {/* Order summary card skeleton */}
          <View className="mb-4 rounded-lg bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 p-4 gap-3">
            <Skeleton className="h-4 w-32 rounded-md" />
            <Skeleton className="h-6 w-40 rounded-md" />
            <Skeleton className="h-4 w-28 rounded-md" />
            <Skeleton className="h-4 w-24 rounded-md" />
          </View>

          {/* Payment method skeleton */}
          <View className="mb-4 rounded-lg bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 p-4 gap-3">
            <Skeleton className="h-4 w-40 rounded-md" />
            <Skeleton className="h-10 w-full rounded-lg" />
            <Skeleton className="h-10 w-full rounded-lg" />
          </View>
        </ScrollView>
      </ScreenContainer>
    )
  }

  if (!order) {
    return (
      <ScreenContainer edges={['top']} className="flex-1">
        <View className="flex-1 items-center justify-center px-4">
          <CircleX size={64} color={isDark ? '#9ca3af' : '#6b7280'} />
          <Text className="mt-4 text-center text-gray-600 dark:text-gray-400">
            {t('menu.noData', 'Không có dữ liệu')}
          </Text>
          <Button variant="default" onPress={handleBack} className="mt-4">
            {tCommon('common.goBack', 'Quay lại')}
          </Button>
        </View>
      </ScreenContainer>
    )
  }

  return (
    <View style={{ flex: 1 }} className="bg-gray-50 dark:bg-gray-900">
      <ScreenContainer edges={['top']} style={{ flex: 1 }}>
        {/* Header */}
        <View className="bg-white dark:bg-gray-800 px-4 py-3 flex-row items-center border-b border-gray-200 dark:border-gray-700">
          <TouchableOpacity onPress={handleBack} className="mr-3">
            <ArrowLeft size={24} color={isDark ? '#9ca3af' : '#6b7280'} />
          </TouchableOpacity>
          <View className="flex-row items-center gap-2 flex-1">
            <SquareMenu size={20} color={primaryColor} />
            <Text className="text-lg font-semibold text-gray-900 dark:text-gray-50">
              {t('order.orderDetail', 'Chi tiết đơn hàng')}
            </Text>
          </View>
        </View>

        {/* Content — GestureScrollView tránh conflict với Stack swipe-back */}
        <GestureScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingBottom: 100 }}
          showsVerticalScrollIndicator={true}
        >
        <View className="px-4 py-4">
          {/* Order Info Card */}
          <View className="mb-4 rounded-lg bg-white dark:bg-gray-800 p-3 border border-gray-100 dark:border-gray-700">
            <View className="flex-row justify-between items-center mb-2">
              <Text className="font-bold text-gray-900 dark:text-gray-50">
                {t('order.order', 'Đơn hàng')}
              </Text>
              <Text className="text-sm text-gray-600 dark:text-gray-400">
                #{order.slug}
              </Text>
            </View>
            <View className="flex-col gap-1">
              <View className="flex-row">
                <Text className="text-sm text-gray-600 dark:text-gray-400">
                  {t('order.orderTime', 'Thời gian đặt hàng')}{' '}
                </Text>
                <Text className="text-sm text-gray-600 dark:text-gray-400">
                  {formatDateTime(order.createdAt)}
                </Text>
              </View>
              {order.type === OrderTypeEnum.DELIVERY && (
                <>
                  <View className="flex-row">
                    <Text className="text-sm text-gray-600 dark:text-gray-400">
                      {t('order.deliveryAddress', 'Địa chỉ giao hàng')}:{' '}
                    </Text>
                    <Text className="flex-1 text-sm text-gray-600 dark:text-gray-400">
                      {order.deliveryTo?.formattedAddress || order.deliveryAddress || '-'}
                    </Text>
                  </View>
                  <View className="flex-row">
                    <Text className="text-sm text-gray-600 dark:text-gray-400">
                      {t('order.deliveryPhone', 'Số điện thoại giao hàng')}:{' '}
                    </Text>
                    <Text className="text-sm text-gray-600 dark:text-gray-400">
                      {order.deliveryPhone || '-'}
                    </Text>
                  </View>
                </>
              )}
              <View className="flex-row">
                <Text className="text-sm text-gray-600 dark:text-gray-400">
                  {t('order.note', 'Ghi chú')}:{' '}
                </Text>
                <Text className="flex-1 text-sm text-gray-600 dark:text-gray-400">
                  {order.description || t('order.noNote', 'Không có ghi chú')}
                </Text>
              </View>
            </View>
          </View>

          {/* Customer and Order Type Cards */}
          <View className="flex-row gap-2 mb-4">
            {/* Customer Card */}
            <View className="flex-1 rounded-lg bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 overflow-hidden">
              <View className="px-3 py-2 rounded-t-lg bg-muted-foreground/10 dark:bg-gray-700">
                <Text className="font-bold text-gray-900 dark:text-gray-50">
                  {t('order.customer', 'Khách hàng')}
                </Text>
              </View>
              <View className="px-3 py-2">
                <Text className="text-sm text-gray-600 dark:text-gray-400">
                  {order.owner?.firstName || order.owner?.lastName
                    ? `${order.owner.firstName || ''} ${order.owner.lastName || ''}`.trim()
                    : '-'} ({order.owner?.phonenumber || '-'})
                </Text>
              </View>
            </View>

            {/* Order Type Card */}
            <View className="flex-1 rounded-lg bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 overflow-hidden">
              <View className="px-3 py-2 rounded-t-lg bg-muted-foreground/10 dark:bg-gray-700">
                <Text className="font-bold text-gray-900 dark:text-gray-50">
                  {t('order.orderType', 'Loại đơn hàng')}
                </Text>
              </View>
              <View className="px-3 py-2">
                <Text className="text-sm text-gray-600 dark:text-gray-400">
                  {order.type === OrderTypeEnum.AT_TABLE
                    ? `${t('order.dineIn', 'Tại bàn')} - ${t('order.tableNumber', 'Bàn')} ${order.table?.name || '-'}`
                    : order.type === OrderTypeEnum.DELIVERY
                      ? t('menu.delivery', 'Giao hàng')
                      : `${t('order.takeAway', 'Mang đi')}${order.timeLeftTakeOut === 0 ? ` - ${t('menu.immediately', 'Ngay')}` : ` - ${order.timeLeftTakeOut} ${t('menu.minutes', 'phút')}`}`}
                </Text>
              </View>
            </View>
          </View>

          {/* Order Items List */}
          <View className="mb-4 rounded-lg bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700">
            <View className="px-4 py-3 border-b rounded-t-lg bg-muted-foreground/10 dark:bg-gray-700 border-gray-100 dark:border-gray-700">
              <Text className="text-sm font-medium text-gray-600 dark:text-gray-400">
                {t('order.aListOfOrders', 'Danh sách sản phẩm')}
              </Text>
            </View>
            <View className="p-4">
              {orderItems.map((item, index) => {
                const displayItem = displayItems.find((di) => di.slug === item.slug)
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
                  <View key={item.slug || index}>
                    {/* Main Row */}
                    <View className={index !== orderItems.length - 1 ? 'mb-4 pb-4 border-b border-gray-100 dark:border-gray-800' : ''}>
                      <View className="flex-row gap-4 items-start">
                        {/* Product Image */}
                        <View className="relative w-16 h-16 shrink-0">
                          <Image
                            source={
                              (item.variant?.product?.image
                                ? { uri: `${publicFileURL}/${item.variant.product.image}` }
                                : Images.Food.ProductImage) as ImageSourcePropType
                            }
                            className="w-full h-full rounded-md"
                            resizeMode="cover"
                          />
                          <View
                            className="absolute -right-2 -bottom-2 w-6 h-6 rounded-full items-center justify-center"
                            style={{ backgroundColor: primaryColor }}
                          >
                            <Text className="text-xs font-bold text-white">
                              x{item.quantity}
                            </Text>
                          </View>
                        </View>

                        {/* Product Info */}
                        <View className="flex-1">
                          <Text className="text-sm font-semibold text-gray-900 dark:text-gray-50 mb-1">
                            {item.variant?.product?.name}
                          </Text>
                          <View className="self-start">
                            <Badge
                              variant="outline"
                              className="rounded-md border-primary text-primary bg-primary/10 mb-2"
                              style={{ maxWidth: 100 }}
                            >
                              <Text className="text-xs font-medium text-primary" numberOfLines={1}>
                                {capitalizeFirstLetter(item.variant?.size?.name || '')}
                              </Text>
                            </Badge>
                          </View>
                        </View>

                        {/* Price */}
                        <View className="items-end">
                          {shouldShowLineThrough && (
                            <Text className="text-sm line-through text-gray-400 mb-1">
                              {formatCurrency(original * item.quantity)}
                            </Text>
                          )}
                          <Text
                            className="font-semibold"
                            style={{ color: primaryColor }}
                          >
                            {formatCurrency(displayPrice)}
                          </Text>
                        </View>
                      </View>

                      {/* Note Row */}
                      {item.note && (
                        <View className="mt-2 bg-gray-50 dark:bg-gray-700 rounded-md">
                          <TextInput
                            value={item.note}
                            editable={false}
                            multiline
                            className="w-full text-xs p-2 text-gray-600 dark:text-gray-400"
                            placeholder={t('order.noNote', 'Không có ghi chú')}
                          />
                        </View>
                      )}
                    </View>
                  </View>
                )
              })}
            </View>
          </View>

          {/* Payment Method and Status */}
          <View className={`mb-4 rounded-lg border ${order?.payment?.statusMessage === OrderStatus.COMPLETED ? 'border-green-500 border-t-md bg-green-50 dark:bg-green-900/20' : 'border-red-500 bg-red-50 dark:bg-red-900/20'} dark:bg-gray-800`}>
            <View className={`px-3 py-4 ${order?.payment?.statusMessage === OrderStatus.COMPLETED ? 'bg-green-200 rounded-t-lg dark:bg-green-800' : 'bg-red-200 rounded-t-lg dark:bg-red-800'}`}>
              <Text className={`font-bold ${order?.payment?.statusMessage === OrderStatus.COMPLETED ? 'text-green-700 dark:text-green-300' : 'text-red-700 dark:text-red-300'}`}>
                {t('paymentMethod.title', 'Phương thức thanh toán')}
              </Text>
            </View>
            {order?.payment ? (
              <View className="px-3 py-4">
                <View className="flex-col gap-2">
                  <Text className="text-sm text-gray-900 dark:text-gray-50">
                    {order.payment.paymentMethod === PaymentMethod.BANK_TRANSFER && (
                      <Text className="italic">{t('paymentMethod.bankTransfer', 'Chuyển khoản ngân hàng')}</Text>
                    )}
                    {order.payment.paymentMethod === PaymentMethod.CASH && (
                      <Text className="italic">{t('paymentMethod.cash', 'Tiền mặt')}</Text>
                    )}
                    {order.payment.paymentMethod === PaymentMethod.POINT && (
                      <Text className="italic">{t('paymentMethod.point', 'Điểm tích lũy')}</Text>
                    )}
                    {order.payment.paymentMethod === PaymentMethod.CREDIT_CARD && (
                      <View className="flex-col gap-1">
                        <Text className="italic">{t('paymentMethod.creditCard', 'Thẻ tín dụng')}</Text>
                        <Text className="text-sm text-gray-600 dark:text-gray-400">
                          {t('paymentMethod.transactionId', 'Mã giao dịch')}: {order.payment.transactionId}
                        </Text>
                      </View>
                    )}
                  </Text>
                  <View className="self-start">
                    <Badge
                      variant="outline"
                      className={`rounded-md border-transparent ${
                        order.payment.statusMessage === OrderStatus.COMPLETED
                          ? 'bg-green-500 dark:bg-green-600'
                          : 'bg-yellow-500 dark:bg-yellow-600'
                      }`}
                      style={{ maxWidth: 120 }}
                    >
                      <Text
                        className={`text-xs font-medium ${
                          order.payment.statusMessage === OrderStatus.COMPLETED
                            ? 'text-white'
                            : 'text-black dark:text-white'
                        }`}
                        numberOfLines={1}
                      >
                        {getPaymentStatusLabel(order.payment.statusCode)}
                      </Text>
                    </Badge>
                  </View>
                </View>
              </View>
            ) : (
              <View className="px-3 py-4">
                <Text className="text-sm text-gray-600 dark:text-gray-400">
                  {t('paymentMethod.notPaid', 'Chưa thanh toán')}
                </Text>
              </View>
            )}
          </View>

          {/* Payment Method Selection */}
          {order.status === OrderStatus.PENDING && (
            <View className="mb-4 rounded-lg bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700">
              <View className="px-4 py-3 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
                <Text className="text-base font-semibold text-gray-900 dark:text-gray-50">
                  {t('paymentMethod.title', 'Phương thức thanh toán')}
                </Text>
                <Text className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  ({t('paymentMethod.cashMethodNote', 'Chọn phương thức thanh toán')})
                </Text>
              </View>
              <View className="p-4">
                <PaymentMethodRadioGroup
                  order={order}
                  defaultValue={order.payment?.paymentMethod || null}
                  disabledMethods={order.payment?.paymentMethod ? [order.payment.paymentMethod as PaymentMethod] : []}
                  disabledReasons={order.payment?.paymentMethod ? { [order.payment.paymentMethod as PaymentMethod]: t('paymentMethod.alreadyPaid', 'Đã thanh toán') } as Record<PaymentMethod, string> : undefined}
                  onSubmit={handlePaymentMethodSubmit}
                />
              </View>
              {isInitiatingPayment && (
                <View className="px-4 pb-4">
                  <View className="flex-row items-center gap-2">
                    <ActivityIndicator size="small" color={primaryColor} />
                    <Text className="text-xs text-gray-500 dark:text-gray-400">
                      {t('paymentMethod.processing', 'Đang xử lý...')}
                    </Text>
                  </View>
                </View>
              )}
              {/* QR Code Display */}
              {(qrCode || order.payment?.qrCode) && order.payment?.paymentMethod === PaymentMethod.BANK_TRANSFER && (
                <View className="px-4 pb-4 border-t border-gray-100 dark:border-gray-700 pt-4">
                  <View className="flex-col justify-center items-center">
                    <Image 
                      source={{ uri: qrCode || order.payment.qrCode || '' }} 
                      className="w-2/5 aspect-square"
                      resizeMode="contain"
                    />
                    <View className="flex-col gap-2 justify-center items-center mt-2">
                      <View className="flex-row items-center gap-1">
                        <Text className="text-sm text-gray-700 dark:text-gray-300">
                          {t('paymentMethod.total', 'Tổng tiền')}:
                        </Text>
                        <Text className="text-lg font-bold" style={{ color: primaryColor }}>
                          {formatCurrency(order.subtotal || 0)}
                        </Text>
                      </View>
                      <View className="flex-row gap-1 items-center px-4">
                        <CircleAlert size={12} color="#3b82f6" />
                        <Text className="text-xs text-gray-500 dark:text-gray-400 text-center">
                          {t('paymentMethod.paymentNote', 'Quét QR code để thanh toán')}
                        </Text>
                      </View>
                    </View>
                  </View>
                </View>
              )}
            </View>
          )}

          {/* Payment Information */}
          <View className="mb-4 rounded-lg bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700">
            <View className="px-3 py-3 rounded-t-lg bg-muted-foreground/10 dark:bg-gray-700">
              <Text className="font-bold text-gray-900 dark:text-gray-50">
                {t('order.paymentInformation', 'Thông tin thanh toán')}
              </Text>
            </View>
            <View className="flex-col gap-2 px-3 py-2">
              {/* Subtotal */}
              <View className="flex-row justify-between items-center">
                <Text className="text-sm text-gray-600 dark:text-gray-400">
                  {t('order.subTotal', 'Tổng tiền hàng')}
                </Text>
                <Text className="text-sm text-gray-900 dark:text-gray-50">
                  {formatCurrency(cartTotals?.subTotalBeforeDiscount || 0)}
                </Text>
              </View>

              {/* Promotion Discount */}
              <View className="flex-row justify-between items-center">
                <Text className="text-sm text-gray-600 dark:text-gray-400">
                  {t('order.discount', 'Giảm giá')}
                </Text>
                <Text className="text-sm text-gray-600 dark:text-gray-400">
                  -{formatCurrency(cartTotals?.promotionDiscount || 0)}
                </Text>
              </View>

              {/* Voucher */}
              {order.voucher && (
                <View className="flex-row justify-between items-center pb-4 border-b border-gray-100 dark:border-gray-700">
                  <Text className="text-sm italic font-medium text-green-500">
                    {t('order.voucher', 'Mã giảm giá')}
                  </Text>
                  <Text className="text-sm italic font-semibold text-green-500">
                    -{formatCurrency(cartTotals?.voucherDiscount || 0)}
                  </Text>
                </View>
              )}

              {/* Loyalty Points */}
              {order.accumulatedPointsToUse > 0 && (
                <View className="flex-row justify-between items-center pb-4">
                  <Text className="text-sm italic font-medium" style={{ color: primaryColor }}>
                    {t('order.loyaltyPoint', 'Điểm tích lũy')}
                  </Text>
                  <Text className="text-sm italic font-semibold" style={{ color: primaryColor }}>
                    -{formatCurrency(order.accumulatedPointsToUse)}
                  </Text>
                </View>
              )}

              {/* Delivery Fee */}
              {order.type === OrderTypeEnum.DELIVERY && order.deliveryFee > 0 && (
                <View className="flex-row justify-between items-center pb-4">
                  <Text className="text-sm italic font-medium text-gray-600 dark:text-gray-400">
                    {t('order.deliveryFee', 'Phí giao hàng')}
                  </Text>
                  <Text className="text-sm italic font-semibold text-gray-600 dark:text-gray-400">
                    {formatCurrency(order.deliveryFee)}
                  </Text>
                </View>
              )}

              {/* Loss (Auto Discount) */}
              {order.loss > 0 && (
                <View className="flex-row justify-between items-center pb-4">
                  <Text className="text-sm italic font-medium text-green-500">
                    {t('order.invoiceAutoDiscountUnderThreshold', 'Giảm giá tự động dưới ngưỡng')}
                  </Text>
                  <Text className="text-sm italic font-semibold text-green-500">
                    -{formatCurrency(order.loss)}
                  </Text>
                </View>
              )}

              {/* Separator */}
              <View className="h-px bg-gray-200 dark:bg-gray-700 my-2" />

              {/* Total Payment */}
              <View className="flex-row justify-between items-center">
                <Text className="font-semibold text-base text-gray-900 dark:text-gray-50">
                  {t('order.totalPayment', 'Tổng thanh toán')}
                </Text>
                <Text
                  className="text-2xl font-extrabold"
                  style={{ color: primaryColor }}
                >
                  {formatCurrency(order.subtotal || 0)}
                </Text>
              </View>

              {/* Product Count */}
              <View className="flex-row justify-between items-center">
                <Text className="text-sm text-gray-600 dark:text-gray-400">
                  ({order.orderItems?.length || 0} {t('order.product', 'sản phẩm')})
                </Text>
              </View>
            </View>
          </View>

          {/* Invoice Template - Only show for PAID orders */}
          {order.status === OrderStatus.PAID && (
            <View className="mb-4">
              <Text className="text-lg text-center text-gray-600 dark:text-gray-400 mb-4">
                {t('order.invoice', 'Hóa đơn')}
              </Text>
              <InvoiceTemplate order={order} />
              
              {/* Download Progress Card - Modern UI */}
              {(isExportingInvoice || isDownloading) && (
                <View 
                  className="mb-4 p-4 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700"
                >
                  <View className="flex-row items-center gap-3 mb-3">
                    <View className="p-2 bg-primary/10 dark:bg-primary/20 rounded-full">
                      <Download 
                        size={20} 
                        color={primaryColor}
                      />
                    </View>
                    <View className="flex-1">
                      <Text className="text-base font-semibold text-gray-900 dark:text-gray-100">
                        {isExportingInvoice 
                          ? tCommon('common.downloadingInvoice', 'Đang tải hóa đơn...')
                          : tCommon('common.savingFile', 'Đang lưu file...')}
                      </Text>
                      <Text className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                        {isExportingInvoice 
                          ? tCommon('common.pleaseWait', 'Vui lòng đợi trong giây lát')
                          : tCommon('common.savingToDownloads', 'Đang lưu vào thư mục Downloads')}
                      </Text>
                    </View>
                    {progress > 0 && (
                      <View className="px-3 py-1 bg-primary/10 dark:bg-primary/20 rounded-full">
                        <Text className="text-sm font-bold text-primary dark:text-primary">
                          {progress}%
                        </Text>
                      </View>
                    )}
                  </View>
                  
                  {/* Progress Bar */}
                  {progress > 0 ? (
                    <View className="h-2.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                      <View
                        className="h-full bg-primary rounded-full"
                        style={{ 
                          width: `${progress}%`,
                        }}
                      />
                    </View>
                  ) : (
                    <View className="flex-row items-center gap-2">
                      <ActivityIndicator size="small" color={primaryColor} />
                      <Text className="text-xs text-gray-500 dark:text-gray-400">
                        {tCommon('common.processing', 'Đang xử lý...')}
                      </Text>
                    </View>
                  )}
                </View>
              )}
              
              {/* Success State */}
              {fileName && !isDownloading && !isExportingInvoice && (
                <View 
                  className="mb-4 p-4 bg-green-50 dark:bg-green-900/20 rounded-xl border border-green-200 dark:border-green-800"
                  style={{
                    shadowColor: '#10b981',
                    shadowOffset: { width: 0, height: 1 },
                    shadowOpacity: 0.1,
                    shadowRadius: 2,
                    elevation: 2,
                  }}
                >
                  <View className="flex-row items-center gap-3">
                    <CheckCircle2 size={24} color="#10b981" />
                    <View className="flex-1">
                      <Text className="text-sm font-semibold text-green-800 dark:text-green-200">
                        {tCommon('common.downloadSuccess', 'Đã tải xuống thành công')}
                      </Text>
                      <Text className="text-xs text-green-600 dark:text-green-300 mt-0.5">
                        {Platform.OS === 'android' 
                          ? tCommon('common.fileSavedToDownloads', 'File đã lưu vào thư mục Downloads')
                          : tCommon('common.fileSavedToFilesApp', 'File đã lưu vào Files app')}
                      </Text>
                    </View>
                  </View>
                </View>
              )}
              
              {/* Download Button */}
              <Button
                variant={isExportingInvoice || isDownloading ? 'secondary' : 'default'}
                className="w-full"
                onPress={handleDownloadInvoice}
                disabled={isExportingInvoice || isDownloading}
                loading={isExportingInvoice || isDownloading}
              >
                {isExportingInvoice || isDownloading
                  ? tCommon('common.downloading', 'Đang tải...')
                  : (
                    <>
                      <FileDown size={18} color="#fff" />
                      <Text className="text-white ml-2">
                        {tCommon('common.downloadPDF', 'Tải xuống PDF')}
                      </Text>
                    </>
                  )}
              </Button>
            </View>
          )}
        </View>
        </GestureScrollView>

        {/* Bottom Action Bar */}
        <View
          style={{ paddingBottom: insets.bottom }}
          className="border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800"
        >
          <View className="px-4 py-4 flex-row gap-2 justify-between">
            {/* <Button
              variant="outline"
              className="flex-1"
              onPress={handleGoToHistory}
            >
              {tCommon('common.goBack', 'Quay lại')}
            </Button> */}
            {order.status === OrderStatus.PENDING && (
              <Button
                className="flex-1 bg-primary"
                onPress={handleCheckout}
              >
                {tCommon('common.checkout', 'Thanh toán')}
              </Button>
            )}
          </View>
        </View>
      </ScreenContainer>
    </View>
  )
}

export default function PaymentPage() {
  const [ready, setReady] = useState(false)
  useRunAfterTransition(() => setReady(true), [])
  if (!ready) return <PaymentSkeletonShell />
  return <PaymentPageContent />
}
