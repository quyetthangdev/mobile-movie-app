import { CircleDollarSign, Coins, Coins as CoinsIcon, CreditCard, Smartphone } from 'lucide-react-native'
import { useCallback, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Pressable, Text, useColorScheme, View } from 'react-native'

import { Input, Label, RadioGroup, RadioGroupItem } from '@/components/ui'
import { PaymentMethod, Role, VOUCHER_PAYMENT_METHOD } from '@/constants'
import { cn } from '@/lib/utils'
import { useUserStore } from '@/stores'
import { IOrder } from '@/types'
import { formatCurrency } from '@/utils'

interface PaymentMethodRadioGroupProps {
  order?: IOrder
  defaultValue: string | null
  disabledMethods?: PaymentMethod[]
  disabledReasons?: Record<PaymentMethod, string>
  onSubmit?: (paymentMethod: PaymentMethod, transactionId?: string) => void
}

export default function PaymentMethodRadioGroup({
  order,
  defaultValue,
  disabledMethods,
  disabledReasons,
  onSubmit,
}: PaymentMethodRadioGroupProps) {
  const { t } = useTranslation('menu')
  const { t: tProfile } = useTranslation('profile')
  const { userInfo } = useUserStore()
  const colorScheme = useColorScheme()
  const isDark = colorScheme === 'dark'

  const balance = userInfo?.balance?.points || 0
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>('')
  const [creditCardTransactionId, setCreditCardTransactionId] = useState<string>('')

  const voucherPaymentMethods = useMemo(() =>
    order?.voucher?.voucherPaymentMethods || [],
    [order?.voucher?.voucherPaymentMethods]
  )

  // Get all available payment methods based on user role
  const getAvailablePaymentMethods = useCallback(() => {
    const methods = [PaymentMethod.BANK_TRANSFER]

    if (userInfo && userInfo.role.name !== Role.CUSTOMER) {
      methods.push(PaymentMethod.CASH)
    }

    if (userInfo && userInfo.role.name === Role.CUSTOMER) {
      methods.push(PaymentMethod.POINT)
    }

    if (userInfo && userInfo.role.name !== Role.CUSTOMER) {
      methods.push(PaymentMethod.CREDIT_CARD)
    }

    // Filter out disabled methods
    if (disabledMethods) {
      return methods.filter(method => !disabledMethods.includes(method))
    }

    return methods
  }, [userInfo, disabledMethods])

  // Get supported payment methods from voucher
  const getSupportedPaymentMethods = useCallback(() => {
    if (!order?.voucher || voucherPaymentMethods.length === 0) {
      return getAvailablePaymentMethods()
    }

    const supportedMethods = voucherPaymentMethods.map(vpm => {
      // Map voucher payment methods to PaymentMethod enum
      switch (vpm.paymentMethod) {
        case VOUCHER_PAYMENT_METHOD.CASH:
          return PaymentMethod.CASH
        case VOUCHER_PAYMENT_METHOD.BANK_TRANSFER:
          return PaymentMethod.BANK_TRANSFER
        case VOUCHER_PAYMENT_METHOD.POINT:
          return PaymentMethod.POINT
        case VOUCHER_PAYMENT_METHOD.CREDIT_CARD:
          return PaymentMethod.CREDIT_CARD
        default:
          return PaymentMethod.BANK_TRANSFER
      }
    })

    // Filter out disabled methods
    if (disabledMethods) {
      return supportedMethods.filter(method => !disabledMethods.includes(method))
    }

    return supportedMethods
  }, [order?.voucher, voucherPaymentMethods, getAvailablePaymentMethods, disabledMethods])

  // Check if payment method is supported by voucher and role
  const isPaymentMethodSupported = (paymentMethod: PaymentMethod) => {
    // Nếu method nằm trong danh sách disabled thì không hỗ trợ
    if (disabledMethods?.includes(paymentMethod)) {
      return false
    }

    // Lấy danh sách method theo role
    const availableMethods = getAvailablePaymentMethods()
    if (!availableMethods.includes(paymentMethod)) {
      return false
    }

    // Nếu không có voucher hoặc voucher không giới hạn phương thức thì chỉ check theo role
    if (!order?.voucher || voucherPaymentMethods.length === 0) {
      return true
    }

    // Nếu có voucher, kiểm tra method có trong danh sách voucher hỗ trợ không
    return voucherPaymentMethods.some(vpm => {
      switch (paymentMethod) {
        case PaymentMethod.CASH:
          return vpm.paymentMethod === 'cash'
        case PaymentMethod.BANK_TRANSFER:
          return vpm.paymentMethod === 'bank-transfer'
        case PaymentMethod.POINT:
          return vpm.paymentMethod === 'point'
        case PaymentMethod.CREDIT_CARD:
          return vpm.paymentMethod === 'credit-card'
        default:
          return false
      }
    })
  }

  // Check if there's any compatible payment method between voucher and user role
  const hasCompatiblePaymentMethod = useMemo(() => {
    const availableMethods = getAvailablePaymentMethods()

    if (!order?.voucher || voucherPaymentMethods.length === 0) {
      return availableMethods.length > 0 // Has at least one available method
    }

    const supportedMethods = getSupportedPaymentMethods()
    return supportedMethods.some(method => availableMethods.includes(method))
  }, [order?.voucher, voucherPaymentMethods, getAvailablePaymentMethods, getSupportedPaymentMethods])

  // Initialize payment method when defaultValue changes
  // Use defaultValue directly if available, otherwise use selectedPaymentMethod
  // Make sure to sync selectedPaymentMethod with defaultValue
  const currentValue = selectedPaymentMethod || defaultValue || ''

  const handlePaymentMethodChange = (value: string) => {
    const paymentMethod = value as PaymentMethod
    // Update local state first to trigger re-render
    setSelectedPaymentMethod(paymentMethod)
    
    // Call onSubmit callback
    if (onSubmit) {
      // If credit card is selected, include transaction ID
      if (paymentMethod === PaymentMethod.CREDIT_CARD) {
        onSubmit(paymentMethod, creditCardTransactionId)
      } else {
        onSubmit(paymentMethod)
      }
    }
  }

  const handleTransactionIdChange = (transactionId: string) => {
    setCreditCardTransactionId(transactionId)
    // If credit card is currently selected, update the parent with new transaction ID
    if (selectedPaymentMethod === PaymentMethod.CREDIT_CARD && onSubmit) {
      onSubmit(PaymentMethod.CREDIT_CARD, transactionId)
    }
  }

  // Show warning when no compatible methods exist
  if (!hasCompatiblePaymentMethod) {
    return (
      <View className="flex-col gap-4">
        <View className="p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg border border-orange-200 dark:border-orange-800">
          <View className="flex-row gap-2 items-center">
            <Text className="text-sm font-medium text-orange-800 dark:text-orange-200">
              ⚠️ {t('paymentMethod.voucherNotCompatible', 'Voucher không tương thích với phương thức thanh toán hiện có')}
            </Text>
          </View>
          <Text className="mt-1 text-xs text-orange-600 dark:text-orange-300">
            {t('paymentMethod.voucherNotCompatible')} {voucherPaymentMethods.map(vpm => {
              switch (vpm.paymentMethod) {
                case 'cash': return t('paymentMethod.cash')
                case 'bank-transfer': return t('paymentMethod.bankTransfer')
                case 'point': return t('paymentMethod.coin')
                case 'credit-card': return t('paymentMethod.creditCard')
                default: return vpm.paymentMethod
              }
            }).join(', ')}, {t('paymentMethod.butYouCanUse')} {getAvailablePaymentMethods().map(method => {
              switch (method) {
                case PaymentMethod.CASH: return t('paymentMethod.cash')
                case PaymentMethod.BANK_TRANSFER: return t('paymentMethod.bankTransfer')
                case PaymentMethod.POINT: return t('paymentMethod.coin')
                case PaymentMethod.CREDIT_CARD: return t('paymentMethod.creditCard')
                default: return method
              }
            }).join(', ')}
          </Text>
        </View>
        <RadioGroup
          value={currentValue}
          className="gap-6"
          onValueChange={handlePaymentMethodChange}
        >
          <Pressable
            onPress={() => {
              if (isPaymentMethodSupported(PaymentMethod.BANK_TRANSFER)) {
                handlePaymentMethodChange(PaymentMethod.BANK_TRANSFER)
              }
            }}
            disabled={!isPaymentMethodSupported(PaymentMethod.BANK_TRANSFER)}
            className="flex-row items-center gap-2"
          >
            <RadioGroupItem 
              value={PaymentMethod.BANK_TRANSFER} 
              disabled={!isPaymentMethodSupported(PaymentMethod.BANK_TRANSFER)}
            />
            <View className={cn(
              'flex-row gap-1 items-center pl-2',
              isPaymentMethodSupported(PaymentMethod.BANK_TRANSFER)
                ? 'opacity-100'
                : 'opacity-50'
            )}>
              <Smartphone size={20} color={isDark ? '#9ca3af' : '#6b7280'} />
              <Label className={cn(
                'flex-row gap-1 items-center',
                !isPaymentMethodSupported(PaymentMethod.BANK_TRANSFER) && 'opacity-50'
              )}>
                <Text className="text-gray-700 dark:text-gray-300">
                  {t('paymentMethod.bankTransfer')}
                </Text>
                {!isPaymentMethodSupported(PaymentMethod.BANK_TRANSFER) && (
                  <Text className="ml-1 text-xs text-orange-500">
                    ({disabledReasons?.[PaymentMethod.BANK_TRANSFER] || t('paymentMethod.voucherNotSupport')})
                  </Text>
                )}
              </Label>
            </View>
          </Pressable>
          {userInfo && userInfo.role.name !== Role.CUSTOMER && (
            <View className="flex-row items-center gap-2">
              <View className="flex-col gap-2">
                <View className="flex-row items-center gap-2">
                  <RadioGroupItem 
                    value={PaymentMethod.CREDIT_CARD} 
                    disabled={!isPaymentMethodSupported(PaymentMethod.CREDIT_CARD)}
                  />
                  <Pressable
                    onPress={() => {
                      if (isPaymentMethodSupported(PaymentMethod.CREDIT_CARD)) {
                        handlePaymentMethodChange(PaymentMethod.CREDIT_CARD)
                      }
                    }}
                    disabled={!isPaymentMethodSupported(PaymentMethod.CREDIT_CARD)}
                  >
                    <View className={cn(
                      'flex-row gap-1 items-center',
                      isPaymentMethodSupported(PaymentMethod.CREDIT_CARD)
                        ? 'opacity-100'
                        : 'opacity-50'
                    )}>
                      <CreditCard size={20} color={isDark ? '#9ca3af' : '#6b7280'} />
                      <Label className={cn(
                        'flex-row gap-1 items-center',
                        !isPaymentMethodSupported(PaymentMethod.CREDIT_CARD) && 'opacity-50'
                      )}>
                        <Text className="text-gray-700 dark:text-gray-300">
                          {t('paymentMethod.creditCard')}
                        </Text>
                        {!isPaymentMethodSupported(PaymentMethod.CREDIT_CARD) && (
                          <Text className="ml-1 text-xs text-orange-500">
                            ({disabledReasons?.[PaymentMethod.CREDIT_CARD] || t('paymentMethod.voucherNotSupport')})
                          </Text>
                        )}
                      </Label>
                    </View>
                  </Pressable>
                </View>
                {selectedPaymentMethod === PaymentMethod.CREDIT_CARD && (
                  <View className="ml-6">
                    <Input
                      placeholder={t('paymentMethod.creditCardTransactionIdPlaceholder')}
                      className="h-9"
                      value={creditCardTransactionId}
                      onChangeText={handleTransactionIdChange}
                      editable={isPaymentMethodSupported(PaymentMethod.CREDIT_CARD)}
                    />
                  </View>
                )}
              </View>
            </View>
          )}
          {userInfo && userInfo.role.name !== Role.CUSTOMER && (
            <View className="flex-row items-center gap-2">
              <RadioGroupItem 
                value={PaymentMethod.CASH} 
                disabled={!isPaymentMethodSupported(PaymentMethod.CASH)}
              />
              <Pressable
                onPress={() => {
                  if (isPaymentMethodSupported(PaymentMethod.CASH)) {
                    handlePaymentMethodChange(PaymentMethod.CASH)
                  }
                }}
                disabled={!isPaymentMethodSupported(PaymentMethod.CASH)}
              >
                <View className={cn(
                  'flex-row gap-1 items-center pl-2',
                  isPaymentMethodSupported(PaymentMethod.CASH)
                    ? 'opacity-100'
                    : 'opacity-50'
                )}>
                  <Coins size={20} color={isDark ? '#9ca3af' : '#6b7280'} />
                  <Label className={cn(
                    'flex-row gap-1 items-center',
                    !isPaymentMethodSupported(PaymentMethod.CASH) && 'opacity-50'
                  )}>
                    <Text className="text-gray-700 dark:text-gray-300">
                      {t('paymentMethod.cash')}
                    </Text>
                    {!isPaymentMethodSupported(PaymentMethod.CASH) && (
                      <Text className="ml-1 text-xs text-orange-500">
                        ({disabledReasons?.[PaymentMethod.CASH] || t('paymentMethod.voucherNotSupport')})
                      </Text>
                    )}
                  </Label>
                </View>
              </Pressable>
            </View>
          )}
          {userInfo && userInfo.role.name === Role.CUSTOMER && (
            <View className="flex-row gap-2">
              <RadioGroupItem
                value={PaymentMethod.POINT}
                disabled={!isPaymentMethodSupported(PaymentMethod.POINT)}
                className="mt-0.5"
              />
              <Pressable
                onPress={() => {
                  if (isPaymentMethodSupported(PaymentMethod.POINT)) {
                    handlePaymentMethodChange(PaymentMethod.POINT)
                  }
                }}
                disabled={!isPaymentMethodSupported(PaymentMethod.POINT)}
                className="flex-1"
              >
                <View className="flex-col gap-1">
                  <View className={cn(
                    'flex-row gap-1 items-center pl-2',
                    isPaymentMethodSupported(PaymentMethod.POINT)
                      ? 'opacity-100'
                      : 'opacity-50'
                  )}>
                    <CircleDollarSign size={20} color={isDark ? '#9ca3af' : '#6b7280'} />
                    <Label className={cn(
                      'flex-row gap-1 items-center',
                      !isPaymentMethodSupported(PaymentMethod.POINT) && 'opacity-50'
                    )}>
                      <View className="flex-col">
                        <Text className="text-gray-700 dark:text-gray-300">
                          {t('paymentMethod.coin')}
                        </Text>
                        {!isPaymentMethodSupported(PaymentMethod.POINT) && (
                          <Text className="text-xs text-orange-500">
                            ({disabledReasons?.[PaymentMethod.POINT] || t('paymentMethod.voucherNotSupport')})
                          </Text>
                        )}
                      </View>
                    </Label>
                  </View>
                  <Text className={cn(
                    'flex-row gap-1 items-center text-xs font-medium pl-2',
                    isPaymentMethodSupported(PaymentMethod.POINT)
                      ? 'text-primary'
                      : 'text-primary/50'
                  )}>
                    {tProfile('profile.coinBalance')}: {formatCurrency(balance, '')}
                    <CoinsIcon size={16} color={isDark ? '#60a5fa' : '#3b82f6'} />
                  </Text>
                </View>
              </Pressable>
            </View>
          )}
        </RadioGroup>
      </View>
    )
  }

  return (
    <RadioGroup
      value={currentValue}
      className="gap-6"
      onValueChange={handlePaymentMethodChange}
    >
      <View className="flex-row items-center gap-2">
        <RadioGroupItem 
          value={PaymentMethod.BANK_TRANSFER} 
          disabled={!isPaymentMethodSupported(PaymentMethod.BANK_TRANSFER)}
        />
        <Pressable
          onPress={() => {
            if (isPaymentMethodSupported(PaymentMethod.BANK_TRANSFER)) {
              handlePaymentMethodChange(PaymentMethod.BANK_TRANSFER)
            }
          }}
          disabled={!isPaymentMethodSupported(PaymentMethod.BANK_TRANSFER)}
        >
          <View className={cn(
            'flex-row gap-1 items-center pl-2',
            isPaymentMethodSupported(PaymentMethod.BANK_TRANSFER)
              ? 'opacity-100'
              : 'opacity-50'
          )}>
            <Smartphone size={20} color={isDark ? '#9ca3af' : '#6b7280'} />
            <Label className={cn(
              'flex-row gap-1 items-center',
              !isPaymentMethodSupported(PaymentMethod.BANK_TRANSFER) && 'opacity-50'
            )}>
              <Text className="text-gray-700 dark:text-gray-300">
                {t('paymentMethod.bankTransfer')}
              </Text>
              {!isPaymentMethodSupported(PaymentMethod.BANK_TRANSFER) && (
                <Text className="ml-1 text-xs text-orange-500">
                  ({t('paymentMethod.voucherNotSupport')})
                </Text>
              )}
            </Label>
          </View>
        </Pressable>
      </View>
      {userInfo && userInfo.role.name !== Role.CUSTOMER && (
        <View className="flex-row items-center gap-2">
          <View className="flex-col gap-2">
            <View className="flex-row items-center gap-2">
              <RadioGroupItem 
                value={PaymentMethod.CREDIT_CARD} 
                disabled={!isPaymentMethodSupported(PaymentMethod.CREDIT_CARD)}
              />
              <Pressable
                onPress={() => {
                  if (isPaymentMethodSupported(PaymentMethod.CREDIT_CARD)) {
                    handlePaymentMethodChange(PaymentMethod.CREDIT_CARD)
                  }
                }}
                disabled={!isPaymentMethodSupported(PaymentMethod.CREDIT_CARD)}
              >
                <View className={cn(
                  'flex-row gap-1 items-center',
                  isPaymentMethodSupported(PaymentMethod.CREDIT_CARD)
                    ? 'opacity-100'
                    : 'opacity-50'
                )}>
                  <CreditCard size={20} color={isDark ? '#9ca3af' : '#6b7280'} />
                  <Label className={cn(
                    'flex-row gap-1 items-center',
                    !isPaymentMethodSupported(PaymentMethod.CREDIT_CARD) && 'opacity-50'
                  )}>
                    <Text className="text-gray-700 dark:text-gray-300">
                      {t('paymentMethod.creditCard')}
                    </Text>
                    {!isPaymentMethodSupported(PaymentMethod.CREDIT_CARD) && (
                      <Text className="ml-1 text-xs text-orange-500">
                        ({t('paymentMethod.voucherNotSupport')})
                      </Text>
                    )}
                  </Label>
                </View>
              </Pressable>
            </View>
            {selectedPaymentMethod === PaymentMethod.CREDIT_CARD && (
              <View className="ml-6">
                <Input
                  placeholder={t('paymentMethod.creditCardTransactionIdPlaceholder')}
                  className="h-9 text-sm"
                  value={creditCardTransactionId}
                  onChangeText={handleTransactionIdChange}
                  editable={isPaymentMethodSupported(PaymentMethod.CREDIT_CARD)}
                />
              </View>
            )}
          </View>
        </View>
      )}
      {userInfo && userInfo.role.name !== Role.CUSTOMER && (
        <View className="flex-row items-center gap-2">
          <RadioGroupItem 
            value={PaymentMethod.CASH} 
            disabled={!isPaymentMethodSupported(PaymentMethod.CASH)}
          />
          <Pressable
            onPress={() => {
              if (isPaymentMethodSupported(PaymentMethod.CASH)) {
                handlePaymentMethodChange(PaymentMethod.CASH)
              }
            }}
            disabled={!isPaymentMethodSupported(PaymentMethod.CASH)}
          >
            <View className={cn(
              'flex-row gap-1 items-center pl-2',
              isPaymentMethodSupported(PaymentMethod.CASH)
                ? 'opacity-100'
                : 'opacity-50'
            )}>
              <Coins size={20} color={isDark ? '#9ca3af' : '#6b7280'} />
              <Label className={cn(
                'flex-row gap-1 items-center',
                !isPaymentMethodSupported(PaymentMethod.CASH) && 'opacity-50'
              )}>
                <Text className="text-gray-700 dark:text-gray-300">
                  {t('paymentMethod.cash')}
                </Text>
                {!isPaymentMethodSupported(PaymentMethod.CASH) && (
                  <Text className="ml-1 text-xs text-orange-500">
                    ({t('paymentMethod.voucherNotSupport')})
                  </Text>
                )}
              </Label>
            </View>
          </Pressable>
        </View>
      )}
      {userInfo && userInfo.role.name === Role.CUSTOMER && (
        <View className="flex-row gap-2">
          <RadioGroupItem
            value={PaymentMethod.POINT}
            disabled={!isPaymentMethodSupported(PaymentMethod.POINT)}
            className="mt-0.5"
          />
          <Pressable
            onPress={() => {
              if (isPaymentMethodSupported(PaymentMethod.POINT)) {
                handlePaymentMethodChange(PaymentMethod.POINT)
              }
            }}
            disabled={!isPaymentMethodSupported(PaymentMethod.POINT)}
            className="flex-1"
          >
            <View className="flex-col gap-1">
              <View className={cn(
                'flex-row gap-1 items-center pl-2',
                isPaymentMethodSupported(PaymentMethod.POINT)
                  ? 'opacity-100'
                  : 'opacity-50'
              )}>
                <CircleDollarSign size={20} color={isDark ? '#9ca3af' : '#6b7280'} />
                <Label className={cn(
                  'flex-row gap-1 items-center',
                  !isPaymentMethodSupported(PaymentMethod.POINT) && 'opacity-50'
                )}>
                  <View className="flex-col">
                    <Text className="text-gray-700 dark:text-gray-300">
                      {t('paymentMethod.coin')}
                    </Text>
                    {!isPaymentMethodSupported(PaymentMethod.POINT) && (
                      <Text className="text-xs text-orange-500">
                        ({t('paymentMethod.voucherNotSupport')})
                      </Text>
                    )}
                  </View>
                </Label>
              </View>
              <Text className={cn(
                'flex-row gap-1 items-center text-xs font-medium pl-2',
                isPaymentMethodSupported(PaymentMethod.POINT)
                  ? 'text-primary'
                  : 'text-primary/50'
              )}>
                {tProfile('profile.coinBalance')}: {formatCurrency(balance, '')}
                <CoinsIcon size={16} color={isDark ? '#60a5fa' : '#3b82f6'} />
              </Text>
            </View>
          </Pressable>
        </View>
      )}
    </RadioGroup>
  )
}
