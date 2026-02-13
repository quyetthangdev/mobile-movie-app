import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Text } from 'react-native'
import type { DataTableColumn } from '@/components/ui/data-table'
import type { ILoyaltyPointHistory } from '@/types'
import { formatPoints } from '@/utils'
import { LoyaltyPointHistoryType } from '@/constants'
import { cn } from '@/lib/utils'

const TYPE_LABELS: Record<string, string> = {
  [LoyaltyPointHistoryType.ADD]: 'profile.points.add',
  [LoyaltyPointHistoryType.USE]: 'profile.points.use',
  [LoyaltyPointHistoryType.RESERVE]: 'profile.points.reserve',
  [LoyaltyPointHistoryType.REFUND]: 'profile.points.refund',
}

export function useLoyaltyPointTransactionColumns(): DataTableColumn<ILoyaltyPointHistory>[] {
  const { t } = useTranslation('profile')

  return useMemo(
    (): DataTableColumn<ILoyaltyPointHistory>[] => [
      {
        key: 'date',
        title: t('profile.points.createdAt'),
        width: 110,
        sortable: true,
        render: (row) => (
          <Text className="text-sm text-gray-700 dark:text-gray-300" numberOfLines={1}>
            {row.date ? new Date(row.date).toLocaleDateString() : '—'}
          </Text>
        ),
      },
      {
        key: 'type',
        title: t('profile.points.type'),
        width: 100,
        sortable: true,
        filterable: true,
        render: (row) => {
          const labelKey = TYPE_LABELS[row.type] || row.type
          const isAdd = row.type === LoyaltyPointHistoryType.ADD || row.type === LoyaltyPointHistoryType.REFUND
          return (
            <Text
              className={cn(
                'text-sm',
                isAdd ? 'text-green-600 dark:text-green-400' : 'text-amber-600 dark:text-amber-400'
              )}
              numberOfLines={1}
            >
              {t(labelKey)}
            </Text>
          )
        },
      },
      {
        key: 'points',
        title: t('profile.points.points'),
        width: 90,
        sortable: true,
        render: (row) => {
          const isAdd = row.type === LoyaltyPointHistoryType.ADD || row.type === LoyaltyPointHistoryType.REFUND
          const prefix = isAdd ? '+' : ''
          return (
            <Text
              className={cn(
                'text-sm font-medium',
                isAdd ? 'text-green-600 dark:text-green-400' : 'text-amber-600 dark:text-amber-400'
              )}
            >
              {prefix}{formatPoints(row.points)}
            </Text>
          )
        },
      },
      {
        key: 'lastPoints',
        title: t('profile.points.lastPoints'),
        width: 90,
        sortable: true,
        render: (row) => (
          <Text className="text-sm text-gray-700 dark:text-gray-300">
            {formatPoints(row.lastPoints)}
          </Text>
        ),
      },
      {
        key: 'orderSlug',
        title: t('profile.points.orderSlug'),
        width: 100,
        render: (row) => (
          <Text className="text-sm text-gray-600 dark:text-gray-400" numberOfLines={1}>
            {row.orderSlug || '—'}
          </Text>
        ),
      },
    ],
    [t]
  )
}
