import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'
import { Ticket } from 'lucide-react-native'
import { memo, useCallback, useMemo, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { Text, TouchableOpacity, useColorScheme, View } from 'react-native'

import { Checkbox } from '@/components/ui'
import { VOUCHER_TYPE } from '@/constants'
import { colors } from '@/constants/colors.constant'
import { IVoucher } from '@/types'
import { formatCurrency } from '@/utils'
import VoucherConditionSheet, {
  VoucherConditionSheetRef,
} from './voucher-condition-sheet'

dayjs.extend(utc)

interface Props {
  voucher: IVoucher
  isSelected: boolean
  isValid: boolean
  errorMessage: string
  onSelect: () => void
  cartTotals?: {
    subTotalBeforeDiscount?: number
    promotionDiscount?: number
  }
}

function VoucherCard({
  voucher,
  isSelected,
  isValid,
  errorMessage,
  onSelect,
}: Props) {
  const { t } = useTranslation(['voucher'])
  const isDark = useColorScheme() === 'dark'
  const conditionSheetRef = useRef<VoucherConditionSheetRef>(null)

  const usagePercentage = Math.min(
    100,
    (voucher.remainingUsage / voucher.maxUsage) * 100,
  )
  const isOutOfStockError = errorMessage === t('voucher.outOfStock')
  const isDisabled = !isValid || voucher.remainingUsage === 0

  const expiryText = (endDate: string) => {
    const now = dayjs()
    const end = dayjs.utc(endDate)
    const diff = end.diff(now, 'second')

    if (diff <= 0) {
      return t('voucher.expiresInHoursMinutes', { hours: 0, minutes: 0 })
    }
    if (diff < 86400) {
      const hours = Math.floor(diff / 3600)
      const minutes = Math.floor((diff % 3600) / 60)
      return t('voucher.expiresInHoursMinutes', { hours, minutes })
    }
    const days = Math.floor(diff / 86400)
    const hours = Math.floor((diff % 86400) / 3600)
    const minutes = Math.floor((diff % 3600) / 60)
    return t('voucher.expiresInDaysHoursMinutes', { days, hours, minutes })
  }

  const discountLabel = useCallback(() => {
    if (voucher.type === VOUCHER_TYPE.PERCENT_ORDER) {
      return t('voucher.percentDiscount', { value: voucher.value })
    }
    if (voucher.type === VOUCHER_TYPE.SAME_PRICE_PRODUCT) {
      return t('voucher.samePriceProduct', {
        value: formatCurrency(voucher.value),
      })
    }
    return t('voucher.fixedDiscount', { value: formatCurrency(voucher.value) })
  }, [t, voucher.type, voucher.value])

  const paymentMethodLabel = useCallback(
    (method: string) => {
      const map: Record<string, string> = {
        cash: t('voucher.paymentMethod.cash'),
        'bank-transfer': t('voucher.paymentMethod.bankTransfer'),
        point: t('voucher.paymentMethod.point'),
        'credit-card': t('voucher.paymentMethod.creditCard'),
      }
      return map[method] ?? method
    },
    [t],
  )

  const voucherConditions = useMemo(() => {
    const conditions: string[] = []

    conditions.push(`${t('voucher.value')}: ${discountLabel()}`)

    conditions.push(
      `${t('voucher.minOrderValue')}: ${formatCurrency(voucher.minOrderValue)}`,
    )

    conditions.push(
      voucher.isVerificationIdentity
        ? t('voucher.requiresAccount')
        : t('voucher.noAccountRequired'),
    )

    conditions.push(
      voucher.numberOfUsagePerUser > 0
        ? `${t('voucher.numberOfUsagePerUser')}: ${voucher.numberOfUsagePerUser} ${t('voucher.usage')}/1 ${t('voucher.verificationIdentityType')}`
        : `${t('voucher.numberOfUsagePerUser')}: ${t('voucher.unlimited')}`,
    )

    if (voucher.voucherProducts?.length > 0) {
      const productNames = voucher.voucherProducts
        .map((vp) => vp.product?.name || vp.slug)
        .filter(Boolean)
      conditions.push(`${t('voucher.products')}: ${productNames.join(', ')}`)
    } else {
      conditions.push(`${t('voucher.products')}: ${t('voucher.allProducts')}`)
    }

    if (voucher.voucherPaymentMethods?.length > 0) {
      conditions.push(
        `${t('voucher.paymentMethods')}: ${voucher.voucherPaymentMethods
          .map((pm) => paymentMethodLabel(pm.paymentMethod))
          .join(', ')}`,
      )
    }

    return conditions
  }, [voucher, t, discountLabel, paymentMethodLabel])

  const expiryDateText = useMemo(
    () => dayjs(voucher.endDate).format('DD/MM/YYYY HH:mm'),
    [voucher.endDate],
  )

  const openConditions = useCallback(() => {
    conditionSheetRef.current?.open()
  }, [])

  const toggleSelection = useCallback(() => {
    if (isDisabled) return
    onSelect()
  }, [isDisabled, onSelect])

  return (
    <>
      {/* Card */}
      <View
        className={`mx-3 my-2 overflow-hidden rounded-xl border ${
          isSelected
            ? 'border-primary'
            : 'border-gray-200 dark:border-gray-700'
        } ${isDisabled ? 'opacity-60' : ''}`}
      >
        <View
          className={`flex-row ${
            isSelected ? 'bg-primary/10 dark:bg-primary/20' : 'bg-white dark:bg-gray-800'
          }`}
        >
          {/* Left image strip — stretches full card height */}
          <View className="w-16 items-center justify-center self-stretch bg-primary">
            <Ticket size={28} color="#ffffff" />
          </View>

          {/* Dashed separator */}
          <View
            style={{
              width: 1,
              borderStyle: 'dashed',
              borderLeftWidth: 1.5,
              borderColor: isDark ? '#374151' : '#e5e7eb',
            }}
          />

          {/* Content */}
          <View className="flex-1 px-3 py-3">
            {/* Title */}
            <Text
              numberOfLines={2}
              className="mb-1 text-sm font-bold text-gray-900 dark:text-gray-50"
            >
              {voucher.title}
            </Text>

            {/* Discount value */}
            <Text className="mb-1 text-xs font-semibold text-primary">
              {discountLabel()}
            </Text>

            {/* Min order */}
            <Text className="mb-1 text-xs text-gray-500 dark:text-gray-400">
              {t('voucher.minOrderValue')}: {formatCurrency(voucher.minOrderValue)}
            </Text>

            {/* Error */}
            {errorMessage ? (
              <Text className="mb-1 text-xs italic text-red-500 dark:text-red-400">
                {errorMessage}
              </Text>
            ) : null}

            {/* Usage progress */}
            <View className="mb-2">
              {!isOutOfStockError && voucher.remainingUsage > 0 && (
                <>
                  <Text className="mb-1 text-xs text-gray-500 dark:text-gray-400">
                    {t('voucher.remainingUsage')}: {Math.round(usagePercentage)}%
                  </Text>
                  <View className="h-1 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
                    <View
                      className="h-full bg-primary"
                      style={{ width: `${usagePercentage}%` }}
                    />
                  </View>
                </>
              )}
            </View>

            {/* Expiry + View Conditions */}
            <View className="flex-row items-center justify-between">
              <View className="rounded-md border border-primary bg-primary/10 px-2 py-1">
                <Text className="text-xs text-primary">
                  {expiryText(voucher.endDate)}
                </Text>
              </View>

              <TouchableOpacity onPress={openConditions} className="px-1 py-1">
                <Text
                  className="text-xs font-medium"
                  style={{
                    color: isDark
                      ? colors.mutedForeground.dark
                      : colors.mutedForeground.light,
                  }}
                >
                  {t('voucher.viewConditions')}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Checkbox */}
          <View className="items-center justify-center pr-3">
            <Checkbox
              checked={isSelected}
              onCheckedChange={toggleSelection}
              disabled={isDisabled}
              checkedBorderColor={isDark ? colors.primary.dark : colors.primary.light}
              checkedBackgroundColor={isDark ? colors.primary.dark : colors.primary.light}
              checkedIconColor={isDark ? colors.white.dark : colors.white.light}
            />
          </View>
        </View>
      </View>

      <VoucherConditionSheet
        ref={conditionSheetRef}
        title={t('voucher.conditionSheetTitle')}
        voucherCode={voucher.code}
        expiryText={expiryDateText}
        conditions={voucherConditions}
      />
    </>
  )
}

export default memo(VoucherCard)
