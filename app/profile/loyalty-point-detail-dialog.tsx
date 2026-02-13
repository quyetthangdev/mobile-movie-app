import React from 'react'
import { useTranslation } from 'react-i18next'
import { Text, View } from 'react-native'
import { Dialog } from '@/components/ui'
import type { ILoyaltyPointHistory } from '@/types'
import { formatPoints } from '@/utils'
import { LoyaltyPointHistoryType } from '@/constants'

const TYPE_KEYS: Record<string, string> = {
  [LoyaltyPointHistoryType.ADD]: 'profile.points.add',
  [LoyaltyPointHistoryType.USE]: 'profile.points.use',
  [LoyaltyPointHistoryType.RESERVE]: 'profile.points.reserve',
  [LoyaltyPointHistoryType.REFUND]: 'profile.points.refund',
}

interface LoyaltyPointDetailHistoryDialogProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  history: ILoyaltyPointHistory | null
  onCloseSheet?: () => void
}

export function LoyaltyPointDetailHistoryDialog({
  isOpen,
  onOpenChange,
  history,
  onCloseSheet,
}: LoyaltyPointDetailHistoryDialogProps) {
  const { t } = useTranslation('profile')

  const handleClose = () => {
    onOpenChange(false)
    onCloseSheet?.()
  }

  if (!history) return null

  const typeLabel = TYPE_KEYS[history.type] ? t(TYPE_KEYS[history.type]) : history.type
  const isAdd = history.type === LoyaltyPointHistoryType.ADD || history.type === LoyaltyPointHistoryType.REFUND

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <Dialog.Content onClose={handleClose} className="max-w-sm">
        <Dialog.Header>
          <Dialog.Title>{t('profile.points.pointsTransaction')}</Dialog.Title>
          <Dialog.Close onPress={handleClose} />
        </Dialog.Header>
        <View className="gap-3 px-1 pb-2">
          <Row label={t('profile.points.createdAt')} value={history.date ? new Date(history.date).toLocaleString() : '—'} />
          <Row label={t('profile.points.type')} value={typeLabel} />
          <Row
            label={t('profile.points.points')}
            value={`${isAdd ? '+' : ''}${formatPoints(history.points)}`}
            valueClassName={isAdd ? 'text-green-600 dark:text-green-400' : 'text-amber-600 dark:text-amber-400'}
          />
          <Row label={t('profile.points.lastPoints')} value={formatPoints(history.lastPoints)} />
          {history.orderSlug ? (
            <Row label={t('profile.points.orderSlug')} value={history.orderSlug} />
          ) : null}
        </View>
      </Dialog.Content>
    </Dialog>
  )
}

function Row({
  label,
  value,
  valueClassName,
}: {
  label: string
  value: string
  valueClassName?: string
}) {
  return (
    <View className="flex-row justify-between border-b border-gray-100 dark:border-gray-800 pb-2">
      <Text className="text-sm text-gray-500 dark:text-gray-400">{label}</Text>
      <Text className={valueClassName ? `text-sm font-medium ${valueClassName}` : 'text-sm text-gray-900 dark:text-gray-100'} numberOfLines={1}>
        {value}
      </Text>
    </View>
  )
}
