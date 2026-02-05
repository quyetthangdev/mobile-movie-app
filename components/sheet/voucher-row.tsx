import { Checkbox } from '@/components/ui'
// import { VOUCHER_USAGE_FREQUENCY_UNIT } from '@/constants'
import { IVoucher } from '@/types'
import { formatCurrency } from '@/utils'
import { Ticket } from 'lucide-react-native'
import moment from 'moment'
import { memo } from 'react'
import { useTranslation } from 'react-i18next'
import { Text, TouchableOpacity, View } from 'react-native'

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

function VoucherRow({
  voucher,
  isSelected,
  isValid,
  errorMessage,
  onSelect,
}: Props) {
  const { t } = useTranslation(['voucher'])
  // const isDark = useColorScheme() === 'dark'
  const usagePercentage = (voucher.remainingUsage / voucher.maxUsage) * 100
  const isOutOfStockError = errorMessage === t('voucher.outOfStock')

  const expiryTextForBadge = (endDate: string) => {
    const now = moment()
    const end = moment.utc(endDate).local()
    const diff = moment.duration(end.diff(now))

    if (diff.asSeconds() <= 0) {
      return t('voucher.expiresInHoursMinutes', { hours: 0, minutes: 0 })
    }

    if (diff.asHours() < 24) {
      const hours = Math.floor(diff.asHours())
      const minutes = Math.floor(diff.asMinutes()) % 60
      return t('voucher.expiresInHoursMinutes', { hours, minutes })
    }

    const days = Math.floor(diff.asDays())
    const hours = Math.floor(diff.asHours()) % 24
    const minutes = Math.floor(diff.asMinutes()) % 60
    return t('voucher.expiresInDaysHoursMinutes', { days, hours, minutes })
  }

  // const getUsageFrequencyText = () => {
  //   if (!voucher.usageFrequencyUnit || !voucher.usageFrequencyValue) return null

  //   const unitText =
  //     voucher.usageFrequencyUnit === VOUCHER_USAGE_FREQUENCY_UNIT.HOUR
  //       ? t('voucher.hour')
  //       : voucher.usageFrequencyUnit === VOUCHER_USAGE_FREQUENCY_UNIT.DAY
  //         ? t('voucher.day')
  //         : voucher.usageFrequencyUnit === VOUCHER_USAGE_FREQUENCY_UNIT.WEEK
  //           ? t('voucher.week')
  //           : voucher.usageFrequencyUnit === VOUCHER_USAGE_FREQUENCY_UNIT.MONTH
  //             ? t('voucher.month')
  //             : t('voucher.year')

  //   return `${voucher.usageFrequencyValue} ${t('voucher.times')}/${unitText}`
  // }

  return (
    <TouchableOpacity
      onPress={onSelect}
      className={`px-4 py-3 border-b border-gray-100 dark:border-gray-800 ${
        isSelected
          ? 'bg-primary/10 dark:bg-primary/20'
          : 'bg-white dark:bg-gray-800'
      } ${!isValid ? 'opacity-60' : ''} ${voucher.remainingUsage === 0 ? 'opacity-50' : ''}`}
      disabled={!isValid || voucher.remainingUsage === 0}
    >
      <View className="flex-row gap-3">
        {/* Icon */}
        <View className="w-12 h-12 rounded-md bg-primary items-center justify-center">
          <Ticket size={24} color="#ffffff" />
        </View>

        {/* Content */}
        <View className="flex-1">
          {/* Title */}
          <Text
            numberOfLines={2}
            className="text-sm font-bold text-gray-900 dark:text-gray-50 mb-1"
          >
            {voucher.title}
          </Text>

          {/* Min Order Value */}
          <Text className="text-xs text-gray-600 dark:text-gray-400 mb-1">
            {t('voucher.minOrderValue')}: {formatCurrency(voucher.minOrderValue)}
          </Text>

          {/* Error Message */}
          {errorMessage && (
            <Text className="text-xs italic text-red-600 dark:text-red-400 mb-1">
              {errorMessage}
            </Text>
          )}

          {/* Usage Progress */}
          <View className="mb-2">
            <View className="flex-row items-center justify-between mb-1">
              <Text className="text-xs text-gray-600 dark:text-gray-400">
                {isOutOfStockError ? (
                  <Text className="text-xs italic text-red-600 dark:text-red-400">
                    {t('voucher.outOfStock')}
                  </Text>
                ) : (
                  `${t('voucher.remainingUsage')}: ${Math.round(usagePercentage)}%`
                )}
              </Text>
            </View>
            {voucher.remainingUsage > 0 && (
              <View className="h-1 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <View
                  className="h-full bg-primary"
                  style={{ width: `${usagePercentage}%` }}
                />
              </View>
            )}
          </View>

          {/* Expiry Badge */}
          <View className="flex-row items-center gap-2">
            <View className="px-2 py-1 rounded-md border border-primary bg-primary/10">
              <Text className="text-xs text-primary">
                {expiryTextForBadge(voucher.endDate)}
              </Text>
            </View>
          </View>
        </View>

        {/* Checkbox */}
        <View className="items-center justify-center">
          <Checkbox
            checked={isSelected}
            onCheckedChange={onSelect}
            disabled={!isValid || voucher.remainingUsage === 0}
          />
        </View>
      </View>
    </TouchableOpacity>
  )
}

export default memo(VoucherRow)

