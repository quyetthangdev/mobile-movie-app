import {
  CircleDollarSign,
  Coins,
  Coins as CoinsIcon,
  CreditCard,
  Smartphone,
} from 'lucide-react-native'
import { useCallback, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Text, useColorScheme, View } from 'react-native'

import { RadioGroup } from '@/components/ui'
import { PaymentMethod, Role, VOUCHER_PAYMENT_METHOD } from '@/constants'
import { cn } from '@/lib/utils'
import { useUserStore } from '@/stores'
import { IOrder } from '@/types'
import { formatCurrency } from '@/utils'

import { PaymentMethodOption } from './payment-method-option'

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
  const userInfo = useUserStore((s) => s.userInfo)
  const colorScheme = useColorScheme()
  const isDark = colorScheme === 'dark'

  const balance = userInfo?.balance?.points || 0
  const [selectedPaymentMethod, setSelectedPaymentMethod] =
    useState<string>('')
  const [creditCardTransactionId, setCreditCardTransactionId] =
    useState<string>('')

  const voucherPaymentMethods = useMemo(
    () => order?.voucher?.voucherPaymentMethods || [],
    [order?.voucher?.voucherPaymentMethods],
  )

  const isNonCustomer =
    userInfo && userInfo.role.name !== Role.CUSTOMER
  const isCustomer =
    userInfo && userInfo.role.name === Role.CUSTOMER

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
      return methods.filter(
        (method) => !disabledMethods.includes(method),
      )
    }

    return methods
  }, [userInfo, disabledMethods])

  // Get supported payment methods from voucher
  const getSupportedPaymentMethods = useCallback(() => {
    if (!order?.voucher || voucherPaymentMethods.length === 0) {
      return getAvailablePaymentMethods()
    }

    const supportedMethods = voucherPaymentMethods.map((vpm) => {
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

    if (disabledMethods) {
      return supportedMethods.filter(
        (method) => !disabledMethods.includes(method),
      )
    }

    return supportedMethods
  }, [
    order?.voucher,
    voucherPaymentMethods,
    getAvailablePaymentMethods,
    disabledMethods,
  ])

  // Check if payment method is supported by voucher and role
  const isPaymentMethodSupported = useCallback(
    (paymentMethod: PaymentMethod) => {
      if (disabledMethods?.includes(paymentMethod)) {
        return false
      }

      const availableMethods = getAvailablePaymentMethods()
      if (!availableMethods.includes(paymentMethod)) {
        return false
      }

      if (!order?.voucher || voucherPaymentMethods.length === 0) {
        return true
      }

      return voucherPaymentMethods.some((vpm) => {
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
    },
    [
      disabledMethods,
      getAvailablePaymentMethods,
      order?.voucher,
      voucherPaymentMethods,
    ],
  )

  // Check if there's any compatible payment method
  const hasCompatiblePaymentMethod = useMemo(() => {
    const availableMethods = getAvailablePaymentMethods()

    if (!order?.voucher || voucherPaymentMethods.length === 0) {
      return availableMethods.length > 0
    }

    const supportedMethods = getSupportedPaymentMethods()
    return supportedMethods.some((method) =>
      availableMethods.includes(method),
    )
  }, [
    order?.voucher,
    voucherPaymentMethods,
    getAvailablePaymentMethods,
    getSupportedPaymentMethods,
  ])

  const currentValue = selectedPaymentMethod || defaultValue || ''

  const handlePaymentMethodChange = useCallback(
    (value: string) => {
      const paymentMethod = value as PaymentMethod
      setSelectedPaymentMethod(paymentMethod)

      if (onSubmit) {
        if (paymentMethod === PaymentMethod.CREDIT_CARD) {
          onSubmit(paymentMethod, creditCardTransactionId)
        } else {
          onSubmit(paymentMethod)
        }
      }
    },
    [onSubmit, creditCardTransactionId],
  )

  const handleTransactionIdChange = useCallback(
    (transactionId: string) => {
      setCreditCardTransactionId(transactionId)
      if (
        selectedPaymentMethod === PaymentMethod.CREDIT_CARD &&
        onSubmit
      ) {
        onSubmit(PaymentMethod.CREDIT_CARD, transactionId)
      }
    },
    [selectedPaymentMethod, onSubmit],
  )

  const handleSelectMethod = useCallback(
    (method: PaymentMethod) => {
      handlePaymentMethodChange(method)
    },
    [handlePaymentMethodChange],
  )

  const getDisabledReason = useCallback(
    (method: PaymentMethod) =>
      disabledReasons?.[method] ||
      t('paymentMethod.voucherNotSupport'),
    [disabledReasons, t],
  )

  const bankTransferSupported = isPaymentMethodSupported(
    PaymentMethod.BANK_TRANSFER,
  )
  const creditCardSupported = isPaymentMethodSupported(
    PaymentMethod.CREDIT_CARD,
  )
  const cashSupported = isPaymentMethodSupported(PaymentMethod.CASH)
  const pointSupported = isPaymentMethodSupported(
    PaymentMethod.POINT,
  )

  const radioGroup = (
    <RadioGroup
      value={currentValue}
      className="gap-6"
      onValueChange={handlePaymentMethodChange}
    >
      <PaymentMethodOption
        method={PaymentMethod.BANK_TRANSFER}
        icon={Smartphone}
        label={t('paymentMethod.bankTransfer')}
        isSupported={bankTransferSupported}
        isDark={isDark}
        disabledReason={getDisabledReason(
          PaymentMethod.BANK_TRANSFER,
        )}
        onSelect={handleSelectMethod}
      />
      {isNonCustomer && (
        <PaymentMethodOption
          method={PaymentMethod.CREDIT_CARD}
          icon={CreditCard}
          label={t('paymentMethod.creditCard')}
          isSupported={creditCardSupported}
          isDark={isDark}
          disabledReason={getDisabledReason(
            PaymentMethod.CREDIT_CARD,
          )}
          onSelect={handleSelectMethod}
          showTransactionInput={
            selectedPaymentMethod === PaymentMethod.CREDIT_CARD
          }
          transactionId={creditCardTransactionId}
          onTransactionIdChange={handleTransactionIdChange}
          transactionPlaceholder={t(
            'paymentMethod.creditCardTransactionIdPlaceholder',
          )}
        />
      )}
      {isNonCustomer && (
        <PaymentMethodOption
          method={PaymentMethod.CASH}
          icon={Coins}
          label={t('paymentMethod.cash')}
          isSupported={cashSupported}
          isDark={isDark}
          disabledReason={getDisabledReason(PaymentMethod.CASH)}
          onSelect={handleSelectMethod}
        />
      )}
      {isCustomer && (
        <PaymentMethodOption
          method={PaymentMethod.POINT}
          icon={CircleDollarSign}
          label={t('paymentMethod.coin')}
          isSupported={pointSupported}
          isDark={isDark}
          disabledReason={getDisabledReason(PaymentMethod.POINT)}
          onSelect={handleSelectMethod}
          pointLayout
        >
          <Text
            className={cn(
              'flex-row gap-1 items-center text-xs font-medium pl-2',
              pointSupported ? 'text-primary' : 'text-primary/50',
            )}
          >
            {tProfile('profile.coinBalance')}:{' '}
            {formatCurrency(balance, '')}
            <CoinsIcon
              size={16}
              color={isDark ? '#60a5fa' : '#3b82f6'}
            />
          </Text>
        </PaymentMethodOption>
      )}
    </RadioGroup>
  )

  if (!hasCompatiblePaymentMethod) {
    return (
      <View className="flex-col gap-4">
        <View className="rounded-lg border border-orange-200 bg-orange-50 p-4 dark:border-orange-800 dark:bg-orange-900/20">
          <View className="flex-row items-center gap-2">
            <Text className="text-sm font-medium text-orange-800 dark:text-orange-200">
              ⚠️{' '}
              {t(
                'paymentMethod.voucherNotCompatible',
                'Voucher không tương thích với phương thức thanh toán hiện có',
              )}
            </Text>
          </View>
          <Text className="mt-1 text-xs text-orange-600 dark:text-orange-300">
            {t('paymentMethod.voucherNotCompatible')}{' '}
            {voucherPaymentMethods
              .map((vpm) => {
                switch (vpm.paymentMethod) {
                  case 'cash':
                    return t('paymentMethod.cash')
                  case 'bank-transfer':
                    return t('paymentMethod.bankTransfer')
                  case 'point':
                    return t('paymentMethod.coin')
                  case 'credit-card':
                    return t('paymentMethod.creditCard')
                  default:
                    return vpm.paymentMethod
                }
              })
              .join(', ')}
            , {t('paymentMethod.butYouCanUse')}{' '}
            {getAvailablePaymentMethods()
              .map((method) => {
                switch (method) {
                  case PaymentMethod.CASH:
                    return t('paymentMethod.cash')
                  case PaymentMethod.BANK_TRANSFER:
                    return t('paymentMethod.bankTransfer')
                  case PaymentMethod.POINT:
                    return t('paymentMethod.coin')
                  case PaymentMethod.CREDIT_CARD:
                    return t('paymentMethod.creditCard')
                  default:
                    return method
                }
              })
              .join(', ')}
          </Text>
        </View>
        {radioGroup}
      </View>
    )
  }

  return radioGroup
}
