// import { useRouter } from 'expo-router'
// import { ArrowLeft, Package } from 'lucide-react-native'
// import { useCallback, useState } from 'react'
// import { useTranslation } from 'react-i18next'
// import { ActivityIndicator, FlatList, Image, type ImageSourcePropType, ScrollView, Text, TouchableOpacity, useColorScheme, View } from 'react-native'
// import { SafeAreaView } from 'react-native-safe-area-context'

// import { Images } from '@/assets/images'
// import { Badge, Button } from '@/components/ui'
// import { APPLICABILITY_RULE, colors, publicFileURL, ROUTE, VOUCHER_TYPE } from '@/constants'
// import { useOrders } from '@/hooks'
// import { cn } from '@/lib/utils'
// import { useUpdateOrderStore, useUserStore } from '@/stores'
// import { IOrder, OrderStatus } from '@/types'
// import { calculateOrderItemDisplay, calculatePlacedOrderTotals, capitalizeFirstLetter, formatCurrency, formatDateTime, showErrorToast } from '@/utils'

// export default function OrderHistoryPage() {
//   const { t } = useTranslation('menu')
//   const { t: tProfile } = useTranslation('profile')
//   const router = useRouter()
//   const isDark = useColorScheme() === 'dark'
//   const primaryColor = isDark ? colors.primary.dark : colors.primary.light

//   const { userInfo, getUserInfo } = useUserStore()
//   const { setOrderItems } = useUpdateOrderStore()
//   const [status, setStatus] = useState<OrderStatus>(OrderStatus.ALL)
//   const [page, setPage] = useState(1)
//   const pageSize = 10

//   const { data: orderResponse, isPending } = useOrders({
//     page,
//     size: pageSize,
//     owner: userInfo?.slug,
//     order: 'DESC',
//     hasPaging: true,
//     status: status === OrderStatus.ALL ? undefined : status,
//   })

//   const orders = orderResponse?.items || []
//   const hasNext = orderResponse?.hasNext || false
//   const hasPrevious = orderResponse?.hasPrevious || false
//   const currentPage = orderResponse?.page || 1
//   const totalPages = orderResponse?.totalPages || 0

//   // Memoize callbacks
//   const handleViewDetail = useCallback((orderSlug: string) => {
//     router.push(`${ROUTE.CLIENT_PAYMENT.replace('[order]', orderSlug)}` as Parameters<typeof router.push>[0])
//   }, [router])

//   const handleUpdateOrder = useCallback((order: IOrder) => {
//     if (!getUserInfo()?.slug) {
//       showErrorToast(1042)
//       router.push(ROUTE.LOGIN as Parameters<typeof router.push>[0])
//       return
//     }
//     setOrderItems(order)
//     // TODO: Navigate to update order page
//   }, [router, setOrderItems, getUserInfo])

//   // Memoize getStatusBadgeColor to use in renderOrderItem
//   const getStatusBadgeColor = useCallback((status: OrderStatus) => {
//     switch (status) {
//       case OrderStatus.PENDING:
//         return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300'
//       case OrderStatus.SHIPPING:
//         return 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300'
//       case OrderStatus.COMPLETED:
//         return 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300'
//       case OrderStatus.PAID:
//         return 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300'
//       case OrderStatus.FAILED:
//         return 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300'
//       default:
//         return 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-300'
//     }
//   }, [])

//   // Memoize getStatusLabel to use in renderOrderItem
//   const getStatusLabel = useCallback((status: OrderStatus) => {
//     switch (status) {
//       case OrderStatus.PENDING:
//         return t('order.pending', 'Chờ xử lý')
//       case OrderStatus.SHIPPING:
//         return tProfile('profile.shipping', 'Đang giao')
//       case OrderStatus.COMPLETED:
//         return tProfile('profile.completed', 'Hoàn thành')
//       case OrderStatus.PAID:
//         return t('order.paid', 'Đã thanh toán')
//       case OrderStatus.FAILED:
//         return t('order.failed', 'Thất bại')
//       default:
//         return status
//     }
//   }, [t, tProfile])

//   // Memoize renderItem to avoid re-create each render
//   const renderOrderItem = useCallback(({ item: orderItem }: { item: IOrder }) => {
//     const orderItems = orderItem.orderItems || []
//     const voucher = orderItem.voucher || null
//     const displayItems = calculateOrderItemDisplay(orderItems, voucher)
//     const cartTotals = calculatePlacedOrderTotals(displayItems, voucher)

//     return (
//       <View className="mb-4 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
//         {/* Header */}
//         <View className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
//           <View className="flex-row items-center justify-between">
//             <Text className="text-xs text-gray-600 dark:text-gray-400">
//               {formatDateTime(orderItem.createdAt)}
//             </Text>
//             <View className={cn('px-2 py-1 rounded-full', getStatusBadgeColor(orderItem.status))}>
//               <Text className="text-xs font-medium">
//                 {getStatusLabel(orderItem.status)}
//               </Text>
//             </View>
//           </View>
//         </View>

//         {/* Order Items */}
//         <View className="p-4">
//           {orderItems.slice(0, 3).map((product, index) => {
//             const displayItem = displayItems.find((di) => di.slug === product.slug)
//             const original = product.variant?.price || 0
//             const priceAfterPromotion = displayItem?.priceAfterPromotion || 0
//             const finalPrice = displayItem?.finalPrice || 0

//             const isSamePriceVoucher =
//               voucher?.type === VOUCHER_TYPE.SAME_PRICE_PRODUCT &&
//               voucher?.voucherProducts?.some((vp) => vp.product?.slug === product.variant?.product?.slug)

//             const isAtLeastOneVoucher =
//               voucher?.applicabilityRule === APPLICABILITY_RULE.AT_LEAST_ONE_REQUIRED &&
//               voucher?.voucherProducts?.some((vp) => vp.product?.slug === product.variant?.product?.slug)

//             const hasVoucherDiscount = (displayItem?.voucherDiscount ?? 0) > 0
//             const hasPromotionDiscount = (displayItem?.promotionDiscount ?? 0) > 0

//             const displayPrice = isSamePriceVoucher
//               ? finalPrice
//               : isAtLeastOneVoucher && hasVoucherDiscount
//                 ? original - (displayItem?.voucherDiscount || 0)
//                 : hasPromotionDiscount
//                   ? priceAfterPromotion
//                   : original

//             const shouldShowLineThrough =
//               (isSamePriceVoucher || hasPromotionDiscount || hasVoucherDiscount) &&
//               original > displayPrice

//             return (
//               <View
//                 key={product.slug || index}
//                 className={index !== Math.min(orderItems.length - 1, 2) ? 'mb-3 pb-3 border-b border-gray-100 dark:border-gray-800' : ''}
//               >
//                 <View className="flex-row gap-3">
//                   {/* Product Image */}
//                   <View className="relative">
//                     <Image
//                       source={
//                         (product.variant?.product?.image
//                           ? { uri: `${publicFileURL}/${product.variant.product.image}` }
//                           : Images.Food.ProductImage) as ImageSourcePropType
//                       }
//                       className="w-16 h-16 rounded-md"
//                       resizeMode="cover"
//                     />
//                     <View
//                       className="absolute -right-2 -bottom-2 w-6 h-6 rounded-full items-center justify-center"
//                       style={{ backgroundColor: primaryColor }}
//                     >
//                       <Text className="text-xs font-bold text-white">
//                         x{product.quantity}
//                       </Text>
//                     </View>
//                   </View>

//                   {/* Product Info */}
//                   <View className="flex-1">
//                     <View className="flex-row items-start gap-2 mb-1">
//                       <Text className="flex-1 text-sm font-semibold text-gray-900 dark:text-gray-50" numberOfLines={2}>
//                         {product.variant?.product?.name}
//                       </Text>
//                     </View>
//                     <View className="flex-row items-center gap-2 mb-2">
//                       <Badge variant="outline">
//                         {capitalizeFirstLetter(product.variant?.size?.name || '')}
//                       </Badge>
//                     </View>
//                     <View className="flex-row items-center gap-1">
//                       {shouldShowLineThrough && (
//                         <Text className="text-xs line-through text-gray-400">
//                           {formatCurrency(original * product.quantity)}
//                         </Text>
//                       )}
//                       <Text
//                         className="text-sm font-bold"
//                         style={{ color: primaryColor }}
//                       >
//                         {formatCurrency(displayPrice * product.quantity)}
//                       </Text>
//                     </View>
//                   </View>
//                 </View>
//               </View>
//             )
//           })}

//           {orderItems.length > 3 && (
//             <Text className="text-xs text-gray-500 dark:text-gray-400 mt-2 text-center">
//               +{orderItems.length - 3} {t('order.moreItems', 'sản phẩm khác')}
//             </Text>
//           )}

//           {/* Order Summary */}
//           <View className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
//             <View className="flex-col gap-2">
//               {cartTotals && (
//                 <>
//                   {cartTotals.promotionDiscount > 0 && (
//                     <View className="flex-row justify-between">
//                       <Text className="text-xs text-gray-600 dark:text-gray-400">
//                         {t('order.promotionDiscount')}
//                       </Text>
//                       <Text className="text-xs font-medium text-yellow-600 dark:text-yellow-500">
//                         -{formatCurrency(cartTotals.promotionDiscount)}
//                       </Text>
//                     </View>
//                   )}
//                   {cartTotals.voucherDiscount > 0 && (
//                     <View className="flex-row justify-between">
//                       <Text className="text-xs text-gray-600 dark:text-gray-400">
//                         {t('order.voucher')}
//                       </Text>
//                       <Text className="text-xs font-medium text-green-600 dark:text-green-500">
//                         -{formatCurrency(cartTotals.voucherDiscount)}
//                       </Text>
//                     </View>
//                   )}
//                 </>
//               )}
//               {orderItem.accumulatedPointsToUse > 0 && (
//                 <View className="flex-row justify-between">
//                   <Text className="text-xs text-gray-600 dark:text-gray-400">
//                     {t('order.loyaltyPoint')}
//                   </Text>
//                   <Text className="text-xs font-medium" style={{ color: primaryColor }}>
//                     -{formatCurrency(orderItem.accumulatedPointsToUse)}
//                   </Text>
//                 </View>
//               )}
//               {orderItem.deliveryFee > 0 && (
//                 <View className="flex-row justify-between">
//                   <Text className="text-xs text-gray-600 dark:text-gray-400">
//                     {t('order.deliveryFee')}
//                   </Text>
//                   <Text className="text-xs font-medium text-gray-900 dark:text-gray-50">
//                     {formatCurrency(orderItem.deliveryFee)}
//                   </Text>
//                 </View>
//               )}
//               <View className="flex-row justify-between pt-2 mt-2 border-t border-gray-200 dark:border-gray-700">
//                 <Text className="text-base font-bold text-gray-900 dark:text-gray-50">
//                   {t('order.totalPayment')}
//                 </Text>
//                 <Text
//                   className="text-lg font-bold"
//                   style={{ color: primaryColor }}
//                 >
//                   {formatCurrency(orderItem.subtotal || 0)}
//                 </Text>
//               </View>
//             </View>
//           </View>

//           {/* Actions */}
//           <View className="flex-row gap-2 mt-4">
//             <Button
//               variant="outline"
//               onPress={() => handleViewDetail(orderItem.slug)}
//               className="flex-1"
//             >
//               {t('order.viewDetail', 'Xem chi tiết')}
//             </Button>
//             {orderItem.status === OrderStatus.PENDING && (
//               <Button
//                 variant="outline"
//                 onPress={() => handleUpdateOrder(orderItem)}
//                 className="flex-1 border-orange-500"
//               >
//                 <Text className="text-orange-500 dark:text-orange-400">
//                   {t('order.updateOrder', 'Cập nhật')}
//                 </Text>
//               </Button>
//             )}
//           </View>
//         </View>
//       </View>
//     )
//   }, [t, handleUpdateOrder, handleViewDetail, getStatusLabel, primaryColor, getStatusBadgeColor])

//   if (isPending && page === 1) {
//     return (
//       <SafeAreaView className="flex-1" edges={['top']}>
//         <View className="flex-1 items-center justify-center">
//           <ActivityIndicator size="large" color={primaryColor} />
//           <Text className="mt-4 text-sm text-gray-600 dark:text-gray-400">
//             {t('order.loading', 'Đang tải...')}
//           </Text>
//         </View>
//       </SafeAreaView>
//     )
//   }

//   return (
//     <SafeAreaView className="flex-1 bg-gray-50 dark:bg-gray-900" edges={['top']}>
//       {/* Header */}
//       <View className="bg-white dark:bg-gray-800 px-4 py-3 flex-row items-center border-b border-gray-200 dark:border-gray-700">
//         <TouchableOpacity onPress={() => router.back()} className="mr-3">
//           <ArrowLeft size={24} color={isDark ? '#9ca3af' : '#6b7280'} />
//         </TouchableOpacity>
//         <View className="flex-row items-center gap-2 flex-1">
//           <Package size={20} color={primaryColor} />
//           <Text className="text-lg font-semibold text-gray-900 dark:text-gray-50">
//             {t('order.history', 'Lịch sử đơn hàng')}
//           </Text>
//         </View>
//       </View>

//       {/* Status Filter */}
//       <View className="px-4 py-3 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
//         <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row gap-2">
//           {[
//             { value: OrderStatus.ALL, label: tProfile('profile.all', 'Tất cả') },
//             { value: OrderStatus.PENDING, label: t('order.pending', 'Chờ xử lý') },
//             { value: OrderStatus.SHIPPING, label: tProfile('profile.shipping', 'Đang giao') },
//             { value: OrderStatus.COMPLETED, label: tProfile('profile.completed', 'Hoàn thành') },
//           ].map((statusOption) => (
//             <TouchableOpacity
//               key={statusOption.value}
//               onPress={() => {
//                 setStatus(statusOption.value)
//                 setPage(1)
//               }}
//               className={status === statusOption.value
//                 ? 'px-4 py-2 rounded-full bg-primary'
//                 : 'px-4 py-2 rounded-full bg-gray-100 dark:bg-gray-700'}
//             >
//               <Text
//                 className={status === statusOption.value
//                   ? 'text-sm font-medium text-white'
//                   : 'text-sm font-medium text-gray-700 dark:text-gray-300'}
//               >
//                 {statusOption.label}
//               </Text>
//             </TouchableOpacity>
//           ))}
//         </ScrollView>
//       </View>

//       {/* Order List */}
//       {orders.length > 0 ? (
//         <FlatList
//           data={orders}
//           renderItem={renderOrderItem}
//           keyExtractor={(item) => item.slug}
//           contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
//           showsVerticalScrollIndicator={false}
//           // Performance optimizations
//           initialNumToRender={10}
//           windowSize={5}
//           maxToRenderPerBatch={10}
//           updateCellsBatchingPeriod={50}
//           removeClippedSubviews={true}
//           ListFooterComponent={
//             totalPages > 1 ? (
//               <View className="flex-row items-center justify-center gap-4 mt-4">
//                 <TouchableOpacity
//                   onPress={() => setPage(page - 1)}
//                   disabled={!hasPrevious}
//                   className={`px-4 py-2 rounded-md ${hasPrevious ? 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700' : 'bg-gray-100 dark:bg-gray-800 opacity-50'}`}
//                 >
//                   <Text className={`text-sm font-medium ${hasPrevious ? 'text-gray-900 dark:text-gray-50' : 'text-gray-400'}`}>
//                     {t('order.previous', 'Trước')}
//                   </Text>
//                 </TouchableOpacity>
//                 <Text className="text-sm text-gray-600 dark:text-gray-400">
//                   {currentPage} / {totalPages}
//                 </Text>
//                 <TouchableOpacity
//                   onPress={() => setPage(page + 1)}
//                   disabled={!hasNext}
//                   className={`px-4 py-2 rounded-md ${hasNext ? 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700' : 'bg-gray-100 dark:bg-gray-800 opacity-50'}`}
//                 >
//                   <Text className={`text-sm font-medium ${hasNext ? 'text-gray-900 dark:text-gray-50' : 'text-gray-400'}`}>
//                     {t('order.next', 'Sau')}
//                   </Text>
//                 </TouchableOpacity>
//               </View>
//             ) : null
//           }
//         />
//       ) : (
//         <View className="flex-1 items-center justify-center px-4">
//           <Package size={64} color={isDark ? '#9ca3af' : '#6b7280'} />
//           <Text className="mt-4 text-lg font-semibold text-gray-900 dark:text-gray-50">
//             {t('order.noOrders', 'Chưa có đơn hàng')}
//           </Text>
//           <Text className="mt-2 text-sm text-gray-600 dark:text-gray-400 text-center">
//             {t('order.noOrdersDescription', 'Bạn chưa có đơn hàng nào')}
//           </Text>
//         </View>
//       )}
//     </SafeAreaView>
//   )
// }

