import { useQueryClient } from '@tanstack/react-query'
import {
  Clock,
  Loader2,
  MapPin,
  Notebook,
  Phone,
  Receipt,
  ShoppingCart,
  User,
} from 'lucide-react-native'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Text, TouchableOpacity, useColorScheme, View } from 'react-native'

import { getOrderBySlug } from '@/api/order'
import { Badge, Button, Dialog, ScrollArea } from '@/components/ui'

import { colors, PHONE_NUMBER_REGEX, Role, ROUTE } from '@/constants'
import {
  useCalculateDeliveryFee,
  useCreateOrder,
  useCreateOrderWithoutLogin,
} from '@/hooks'
import { navigateNative } from '@/lib/navigation'
import {
  IOrderingData,
  useBranchStore,
  useUpdateOrderStore,
  useUserStore,
} from '@/stores'
import { useOrderFlowCreateOrder } from '@/stores/selectors'
import { ICreateOrderRequest, OrderTypeEnum } from '@/types'
import {
  calculateCartItemDisplay,
  calculateCartTotals,
  formatCurrency,
  parseKm,
  showErrorToast,
  showToast,
} from '@/utils'

interface IPlaceOrderDialogProps {
  onSuccess?: () => void
  disabled?: boolean | undefined
  onSuccessfulOrder?: () => void
  fullWidthButton?: boolean
  /** Dùng TouchableOpacity thay Button — giảm PlaceOrderDialog ~10ms (Profiler) */
  lightButton?: boolean
}

export default function PlaceOrderDialog({
  disabled,
  onSuccessfulOrder,
  onSuccess,
  fullWidthButton = true,
  lightButton = false,
}: IPlaceOrderDialogProps) {
  const queryClient = useQueryClient()
  const { t } = useTranslation(['menu'])
  const { t: tCommon } = useTranslation('common')
  const { t: tToast } = useTranslation('toast')
  const { orderingData, transitionToPayment } = useOrderFlowCreateOrder()
  const clearUpdateOrderStore = useUpdateOrderStore((s) => s.clearStore)
  const { mutate: createOrder, isPending } = useCreateOrder()
  const { mutate: createOrderWithoutLogin, isPending: isPendingWithoutLogin } =
    useCreateOrderWithoutLogin()
  const [isOpen, setIsOpen] = useState(false)
  // #1 Lazy: Chỉ mount Dialog.Content sau lần mở đầu — giảm CPU khi Cart mount
  const [hasOpened, setHasOpened] = useState(false)
  const userInfo = useUserStore((s) => s.userInfo)
  const getUserInfo = useUserStore((s) => s.getUserInfo)
  const branch = useBranchStore((s) => s.branch)

  const isDark = useColorScheme() === 'dark'
  const primaryColor = isDark ? colors.primary.dark : colors.primary.light

  const order = orderingData

  // #1 Lazy: Chỉ tính displayItems, cartTotals, deliveryFee khi dialog mở — giảm CPU khi Cart mount
  const branchSlug =
    !userInfo || userInfo.role.name === Role.CUSTOMER
      ? branch?.slug
      : userInfo.branch?.slug

  const displayItems = hasOpened
    ? calculateCartItemDisplay(order, order?.voucher || null)
    : []
  const cartTotals = hasOpened
    ? calculateCartTotals(displayItems, order?.voucher || null)
    : {
        subTotalBeforeDiscount: 0,
        promotionDiscount: 0,
        voucherDiscount: 0,
        finalTotal: 0,
      }
  const deliveryFee = useCalculateDeliveryFee(
    parseKm(order?.deliveryDistance) || 0,
    branchSlug || '',
    { enabled: hasOpened },
  )

  const handleSubmit = (order: IOrderingData) => {
    if (!order) return

    if (!branchSlug) {
      showErrorToast(11000)
      return
    }

    // Validate delivery case
    if (order.type === OrderTypeEnum.DELIVERY) {
      const phoneOk =
        !!order.deliveryPhone && PHONE_NUMBER_REGEX.test(order.deliveryPhone)
      if (!order.deliveryAddress || !phoneOk) {
        showErrorToast(119000)
        return
      }
    }

    const createOrderRequest: ICreateOrderRequest = {
      type: order.type,
      timeLeftTakeOut: order.timeLeftTakeOut || 0,
      deliveryTo: order.deliveryPlaceId || '',
      deliveryPhone: order.deliveryPhone || '',
      table: order.table || '',
      branch: branchSlug,
      owner: order.owner || getUserInfo()?.slug || '',
      approvalBy: getUserInfo()?.slug || '',
      orderItems: order.orderItems.map((orderItem) => {
        return {
          quantity: orderItem.quantity,
          variant: orderItem.variant.slug,
          promotion: orderItem.promotion ? orderItem.promotion.slug : null,
          note: orderItem.note || '',
        }
      }),
      voucher: order.voucher?.slug || null,
      description: order.description || '',
    }

    // Call API to create order
    if (userInfo) {
      createOrder(createOrderRequest, {
        onSuccess: (data) => {
          const orderSlug = data.result.slug
          const paymentRoute =
            userInfo?.role.name === Role.CUSTOMER
              ? ROUTE.CLIENT_PAYMENT
              : ROUTE.SYSTEM_PAYMENT

          queryClient.prefetchQuery({
            queryKey: ['order', orderSlug],
            queryFn: () => getOrderBySlug(orderSlug),
          })

          navigateNative.push({
            pathname: paymentRoute,
            params: { order: orderSlug },
          })

          onSuccess?.()
          transitionToPayment(orderSlug)

          setIsOpen(false)
          onSuccessfulOrder?.()
          clearUpdateOrderStore()
          showToast(tToast('toast.createOrderSuccess'))
        },
      })
    } else {
      createOrderWithoutLogin(createOrderRequest, {
        onSuccess: (data) => {
          const orderSlug = data.result.slug

          queryClient.prefetchQuery({
            queryKey: ['order', orderSlug],
            queryFn: () => getOrderBySlug(orderSlug),
          })

          navigateNative.push({
            pathname: ROUTE.CLIENT_PAYMENT,
            params: { order: orderSlug },
          })

          onSuccess?.()
          transitionToPayment(orderSlug)

          setIsOpen(false)
          onSuccessfulOrder?.()
          clearUpdateOrderStore()
          showToast(tToast('toast.createOrderSuccess'))
        },
      })
    }
  }

  const buttonLabel = (() => {
    if (order?.type === OrderTypeEnum.AT_TABLE) {
      return order?.table ? t('order.create') : t('menu.noSelectedTable')
    }
    if (order?.type === OrderTypeEnum.DELIVERY) {
      const phoneOk =
        !!order?.deliveryPhone &&
        PHONE_NUMBER_REGEX.test(order?.deliveryPhone || '')
      return order?.deliveryAddress && phoneOk
        ? t('order.create')
        : t('menu.deliveryInfoMissing')
    }
    return t('order.create')
  })()

  const isButtonDisabled = disabled || isPending || isPendingWithoutLogin

  const triggerContent = (
    <>
      {(isPending || isPendingWithoutLogin) && (
        <Loader2 size={16} color="#6b7280" />
      )}
      <Text className="font-medium text-white">{buttonLabel}</Text>
    </>
  )

  return (
    <>
      <Dialog.Trigger>
        {lightButton ? (
          <TouchableOpacity
            disabled={isButtonDisabled}
            onPress={() => {
              setHasOpened(true)
              setIsOpen(true)
            }}
            activeOpacity={0.8}
            className={`flex flex-row items-center justify-center gap-2 rounded-full bg-primary px-16 py-3 text-sm ${
              fullWidthButton ? 'w-full' : ''
            } ${isButtonDisabled ? 'opacity-50' : ''}`}
          >
            {triggerContent}
          </TouchableOpacity>
        ) : (
          <Button
            disabled={isButtonDisabled}
            className={`flex items-center rounded-full bg-primary text-sm ${
              fullWidthButton ? 'w-full' : 'px-16'
            }`}
            onPress={() => {
              setHasOpened(true)
              setIsOpen(true)
            }}
          >
            {triggerContent}
          </Button>
        )}
      </Dialog.Trigger>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        {/* #1 Lazy: Chỉ mount Dialog.Content khi user bấm Đặt món — giảm CPU khi Cart mount */}
        {hasOpened && (
        <Dialog.Content className="max-w-md gap-0 rounded-md p-0">
          <Dialog.Close onPress={() => setIsOpen(false)} />
          <Dialog.Header className="p-4">
            <View className="border-b border-gray-200 pb-2 dark:border-gray-700">
              <View className="flex-row items-center gap-2">
                <View className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/20 p-1">
                  <ShoppingCart size={16} color={primaryColor} />
                </View>
                <Dialog.Title>{t('order.create')}</Dialog.Title>
              </View>
            </View>
            <Dialog.Description className="text-sm text-gray-600 dark:text-gray-400">
              {t('order.confirmOrder')}
            </Dialog.Description>
          </Dialog.Header>

          {/* Order Items List */}
          <ScrollArea className="flex-1 px-4">
            <ScrollArea.Viewport>
              <View className="flex-col gap-4 py-4">
                {/* Order Info */}
                <View className="flex-col gap-2">
                  <View className="flex-row items-center justify-between rounded-md border bg-gray-100 px-2 py-3 text-sm dark:bg-gray-900">
                    <View className="flex-row items-center gap-2">
                      <Receipt size={16} color="#6b7280" />
                      <Text className="text-gray-600 dark:text-gray-400">
                        {t('order.orderType')}
                      </Text>
                    </View>
                    <Badge
                      className={`shadow-none ${order?.type === OrderTypeEnum.AT_TABLE ? '' : 'bg-blue-500/20'}`}
                    >
                      <Text
                        className={
                          order?.type !== OrderTypeEnum.AT_TABLE
                            ? 'text-blue-500'
                            : ''
                        }
                      >
                        {order?.type === OrderTypeEnum.AT_TABLE
                          ? t('menu.dineIn')
                          : order?.type === OrderTypeEnum.DELIVERY
                            ? t('menu.delivery')
                            : t('menu.takeAway')}
                      </Text>
                    </Badge>
                  </View>
                  {order?.timeLeftTakeOut !== undefined && (
                    <View className="flex-row justify-between rounded-md border bg-gray-100 px-2 py-3 text-sm dark:bg-gray-900">
                      <View className="flex-row items-center gap-2">
                        <Clock size={16} color="#6b7280" />
                        <Text className="text-gray-600 dark:text-gray-400">
                          {t('menu.pickupTime')}
                        </Text>
                      </View>
                      <Badge>
                        <Text className="font-medium">
                          {order.timeLeftTakeOut === 0
                            ? t('menu.immediately')
                            : `${order.timeLeftTakeOut} ${t('menu.minutes')}`}
                        </Text>
                      </Badge>
                    </View>
                  )}
                  {order?.tableName && (
                    <View className="flex-row justify-between rounded-md border bg-gray-100 px-2 py-3 text-sm dark:bg-gray-900">
                      <View className="flex-row items-center gap-2">
                        <MapPin size={16} color="#6b7280" />
                        <Text className="text-gray-600 dark:text-gray-400">
                          {t('menu.tableName')}
                        </Text>
                      </View>
                      <Text className="font-medium">{order.tableName}</Text>
                    </View>
                  )}
                  {order?.type === OrderTypeEnum.DELIVERY &&
                    order?.deliveryAddress && (
                      <View className="flex-row justify-between rounded-md border bg-gray-100 px-2 py-3 text-sm dark:bg-gray-900">
                        <View className="flex-row items-center gap-2">
                          <MapPin size={16} color="#6b7280" />
                          <Text className="text-gray-600 dark:text-gray-400">
                            {t('menu.deliveryAddress')}
                          </Text>
                        </View>
                        <Text className="max-w-[70%] text-right font-medium">
                          {order.deliveryAddress}
                        </Text>
                      </View>
                    )}
                  {order?.type === OrderTypeEnum.DELIVERY &&
                    order?.deliveryPhone && (
                      <View className="flex-row justify-between rounded-md border bg-gray-100 px-2 py-3 text-sm dark:bg-gray-900">
                        <View className="flex-row items-center gap-2">
                          <Phone size={16} color="#6b7280" />
                          <Text className="text-gray-600 dark:text-gray-400">
                            {t('menu.deliveryPhone')}
                          </Text>
                        </View>
                        <Text className="font-medium">
                          {order.deliveryPhone}
                        </Text>
                      </View>
                    )}
                  {order?.ownerFullName && (
                    <View className="flex-row justify-between rounded-md border bg-gray-100 px-2 py-3 text-sm dark:bg-gray-900">
                      <View className="flex-row items-center gap-2">
                        <User size={16} color="#6b7280" />
                        <Text className="text-gray-600 dark:text-gray-400">
                          {t('order.customer')}
                        </Text>
                      </View>
                      <Text className="font-medium">{order.ownerFullName}</Text>
                    </View>
                  )}
                  {order?.ownerPhoneNumber && (
                    <View className="flex-row justify-between rounded-md border bg-gray-100 px-2 py-3 text-sm dark:bg-gray-900">
                      <View className="flex-row items-center gap-2">
                        <Phone size={16} color="#6b7280" />
                        <Text className="text-gray-600 dark:text-gray-400">
                          {t('order.phoneNumber')}
                        </Text>
                      </View>
                      <Text className="font-medium">
                        {order.ownerPhoneNumber}
                      </Text>
                    </View>
                  )}
                  {order?.description && (
                    <View className="flex-row justify-between rounded-md border bg-gray-100 px-2 py-3 text-sm dark:bg-gray-900">
                      <View className="flex-row items-center gap-2">
                        <Notebook size={16} color="#6b7280" />
                        <Text className="text-gray-600 dark:text-gray-400">
                          {t('order.note')}
                        </Text>
                      </View>
                      <Text className="font-medium">{order.description}</Text>
                    </View>
                  )}
                </View>
                <View className="mt-6 flex-col gap-4 border-t border-dashed border-gray-300 px-2 py-4 dark:border-gray-600">
                  {order?.orderItems.map((item, index) => (
                    <View
                      key={index}
                      className="flex-row items-center justify-between"
                    >
                      <View className="flex-1 flex-col gap-2">
                        <Text className="font-bold">{item.name}</Text>
                        <View className="flex-row gap-2">
                          <Badge className="w-fit text-xs" variant="outline">
                            <Text className="text-gray-600 dark:text-gray-400">
                              Size {item.size.toUpperCase()}
                            </Text>
                          </Badge>
                          <Text className="text-sm text-gray-600 dark:text-gray-400">
                            x{item.quantity}
                          </Text>
                        </View>
                      </View>
                      {(() => {
                        const finalPrice =
                          (displayItems.find((di) => di.slug === item.slug)
                            ?.finalPrice ?? 0) * item.quantity
                        const original =
                          (item.originalPrice ?? item.originalPrice ?? 0) *
                          item.quantity

                        const hasDiscount = original > finalPrice

                        return (
                          <View className="flex-row items-center gap-1">
                            {hasDiscount ? (
                              <>
                                <Text className="mr-1 text-gray-400 line-through">
                                  {formatCurrency(original)}
                                </Text>
                                <Text className="font-bold text-primary dark:text-primary">
                                  {formatCurrency(finalPrice)}
                                </Text>
                              </>
                            ) : (
                              <Text className="font-bold text-primary dark:text-primary">
                                {formatCurrency(finalPrice)}
                              </Text>
                            )}
                          </View>
                        )
                      })()}
                    </View>
                  ))}
                </View>
              </View>
            </ScrollArea.Viewport>
          </ScrollArea>
          <Dialog.Footer className="p-4">
            {/* Total Amount */}
            <View className="w-full flex-col items-start justify-start gap-1">
              <View className="w-full flex-row items-center justify-between gap-2">
                <Text className="text-sm text-gray-600 dark:text-gray-400">
                  {t('order.subtotal')}:{' '}
                </Text>
                <Text className="text-sm text-gray-600 dark:text-gray-400">
                  {formatCurrency(cartTotals.subTotalBeforeDiscount)}
                </Text>
              </View>
              {cartTotals.promotionDiscount > 0 && (
                <View className="w-full flex-row items-center justify-between gap-2">
                  <Text className="text-sm italic text-yellow-600">
                    {t('order.promotionDiscount')}:
                  </Text>
                  <Text className="text-sm italic text-yellow-600">
                    -{formatCurrency(cartTotals.promotionDiscount)}
                  </Text>
                </View>
              )}
              <View className="w-full flex-row items-center justify-between gap-2">
                <Text className="text-sm italic text-green-500">
                  {t('order.voucher')}:
                </Text>
                <Text className="text-sm italic text-green-500">
                  -{formatCurrency(cartTotals.voucherDiscount)}
                </Text>
              </View>
              {order?.type === OrderTypeEnum.DELIVERY && (
                <View className="w-full flex-row items-center justify-between gap-2">
                  <Text className="text-sm italic text-gray-600 dark:text-gray-400">
                    {t('order.deliveryFee')}:
                  </Text>
                  <Text className="text-sm italic text-gray-600 dark:text-gray-400">
                    {formatCurrency(deliveryFee?.deliveryFee || 0)}
                  </Text>
                </View>
              )}
              <View className="mt-4 w-full flex-row items-center justify-between gap-2 border-t border-gray-200 pt-2 dark:border-gray-700">
                <Text className="text-base font-semibold">
                  {t('order.totalPayment')}:{' '}
                </Text>
                <Text className="text-2xl font-extrabold text-primary">
                  {formatCurrency(
                    cartTotals.finalTotal + (deliveryFee?.deliveryFee || 0),
                  )}
                </Text>
              </View>
              <View className="mt-4 w-full flex-row justify-end gap-2">
                <Button
                  variant="outline"
                  onPress={() => setIsOpen(false)}
                  className="min-w-24 border border-gray-300"
                  disabled={isPending || isPendingWithoutLogin}
                >
                  {tCommon('common.cancel')}
                </Button>
                {(() => {
                  const isDelivery = order?.type === OrderTypeEnum.DELIVERY
                  const phoneOk =
                    !!order?.deliveryPhone &&
                    PHONE_NUMBER_REGEX.test(order.deliveryPhone || '')
                  const createDisabled =
                    isPending ||
                    isPendingWithoutLogin ||
                    (isDelivery && (!order?.deliveryAddress || !phoneOk))
                  return (
                    <Button
                      onPress={() => {
                        if (order) {
                          handleSubmit(order)
                        }
                      }}
                      disabled={createDisabled}
                      className="bg-primary"
                    >
                      {(isPending || isPendingWithoutLogin) && (
                        <Loader2 size={16} color="#ffffff" />
                      )}
                      {t('order.create')}
                    </Button>
                  )
                })()}
              </View>
            </View>
          </Dialog.Footer>
        </Dialog.Content>
        )}
      </Dialog>
    </>
  )
}
