import { useRouter } from 'expo-router'
import { ArrowLeft, Check, Tag, TrendingUp } from 'lucide-react-native'
import React, { useCallback, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Pressable,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
  useColorScheme,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { useLoyaltyPointTransactionColumns } from '@/app/profile/loyalty-point-columns'
import { LoyaltyPointDetailHistoryDialog } from '@/app/profile/loyalty-point-detail-dialog'
import {
  Card,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  Label,
} from '@/components/ui'
import { DataTable } from '@/components/ui/data-table'
import { LoyaltyPointHistoryType } from '@/constants'
import { useLoyaltyPointHistory, useLoyaltyPoints } from '@/hooks'
import { cn } from '@/lib/utils'
import { useUserStore } from '@/stores'
import type { ILoyaltyPointHistory } from '@/types'
import { formatPoints } from '@/utils'

const TYPE_OPTIONS = [
  { value: 'all', labelKey: 'common:common.all' },
  { value: LoyaltyPointHistoryType.ADD, labelKey: 'profile.points.add' },
  { value: LoyaltyPointHistoryType.USE, labelKey: 'profile.points.use' },
  {
    value: LoyaltyPointHistoryType.RESERVE,
    labelKey: 'profile.points.reserve',
  },
  { value: LoyaltyPointHistoryType.REFUND, labelKey: 'profile.points.refund' },
] as const

export default function LoyaltyPointScreen() {
  const { t } = useTranslation(['profile', 'common'])
  const router = useRouter()
  const { userInfo } = useUserStore()
  const slug = userInfo?.slug ?? ''
  const isDark = useColorScheme() === 'dark'
  const iconColor = isDark ? '#9ca3af' : '#6b7280'

  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [isDetailOpen, setIsDetailOpen] = useState(false)
  const [selectedHistory, setSelectedHistory] =
    useState<ILoyaltyPointHistory | null>(null)

  const { data: totalData, isLoading: loadingTotal } = useLoyaltyPoints(slug)
  const { data: historyData, isLoading: loadingHistory } =
    useLoyaltyPointHistory({
      slug,
      page: 1,
      size: 100,
      types:
        typeFilter === 'all'
          ? [
              LoyaltyPointHistoryType.ADD,
              LoyaltyPointHistoryType.USE,
              LoyaltyPointHistoryType.RESERVE,
              LoyaltyPointHistoryType.REFUND,
            ]
          : [typeFilter as LoyaltyPointHistoryType],
    })

  const totalPoints = totalData?.totalPoints ?? 0
  const historyList = historyData?.items ?? []

  const columns = useLoyaltyPointTransactionColumns()

  const handleRowPress = useCallback((row: ILoyaltyPointHistory) => {
    setSelectedHistory(row)
    setIsDetailOpen(true)
  }, [])

  const handleBack = useCallback(() => {
    router.back()
  }, [router])

  const isLoading = loadingTotal || loadingHistory

  return (
    <SafeAreaView
      className="flex-1 bg-gray-50 dark:bg-gray-900"
      edges={['top']}
    >
      {/* Header */}
      <View className="flex-row items-center border-b border-gray-200 bg-white px-4 py-3 dark:border-gray-700 dark:bg-gray-800">
        <Pressable onPress={handleBack} className="mr-3 p-1 active:opacity-70">
          <ArrowLeft size={24} color="#374151" />
        </Pressable>
        <Text className="flex-1 text-lg font-semibold text-gray-900 dark:text-white">
          {t('profile.points.pointsHistory')}
        </Text>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 24 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Summary */}
        <View className="px-4 pt-4">
          <View className="mb-4 rounded-lg bg-primary/10 px-3 py-2 dark:bg-primary/20">
            <Label className="flex-row items-center gap-2 text-primary">
              <View className="rounded-full bg-primary/20 p-1 dark:bg-primary/30">
                <Tag size={16} color="#D68910" />
              </View>
              {t('profile.points.pointsHistory')}
            </Label>
          </View>

          {isLoading ? (
            <View className="mb-4 h-20 rounded-xl bg-gray-200 dark:bg-gray-700" />
          ) : (
            <Card className="mb-4 border border-primary/20 shadow-none dark:border-primary/30">
              <Card.Content className="p-4">
                <View className="flex-row items-center justify-between">
                  <View>
                    <Text className="mb-1 text-sm font-medium text-gray-600 dark:text-gray-400">
                      {t('profile.totalEarned')}
                    </Text>
                    <View className="flex-row items-center gap-1">
                      <TrendingUp size={18} color="#D68910" />
                      <Text className="text-xl font-bold text-primary">
                        {formatPoints(Math.abs(totalPoints))}{' '}
                        {t('profile.points.point')}
                      </Text>
                    </View>
                  </View>
                </View>
              </Card.Content>
            </Card>
          )}
        </View>

        {/* Filter by type - dropdown giống order type trong cart */}
        <View className="mb-2 px-4">
          <Text className="mb-1 text-xs text-gray-500 dark:text-gray-400">
            {t('profile.points.type')}
          </Text>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <TouchableOpacity className="h-11 w-full flex-row items-center gap-2 rounded-md border border-gray-200 bg-white px-3 py-2 active:bg-gray-100/50 dark:border-gray-700 dark:bg-gray-800 dark:active:bg-gray-700/50">
                <Tag size={16} color={iconColor} />
                <Text
                  className="flex-1 text-left text-sm font-medium text-gray-900 dark:text-gray-50"
                  numberOfLines={1}
                  ellipsizeMode="tail"
                >
                  {t(
                    TYPE_OPTIONS.find((o) => o.value === typeFilter)
                      ?.labelKey ?? 'profile.points.type',
                  )}
                </Text>
              </TouchableOpacity>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              className="w-full"
              align="start"
              side="bottom"
              sideOffset={4}
            >
              <View className="border-b border-gray-200 px-3 py-2 dark:border-gray-700">
                <Text className="text-sm font-semibold text-gray-900 dark:text-gray-50">
                  {t('profile.points.type')}
                </Text>
              </View>
              <View className="max-h-[400px]">
                {TYPE_OPTIONS.map((opt, index) => {
                  const isSelected = typeFilter === opt.value
                  const isLast = index === TYPE_OPTIONS.length - 1
                  return (
                    <TouchableOpacity
                      key={opt.value}
                      onPress={() => setTypeFilter(opt.value)}
                      className={cn(
                        'flex-row items-center gap-3 px-4 py-3 active:bg-gray-100 dark:active:bg-gray-700',
                        !isLast &&
                          'border-b border-gray-100 dark:border-gray-800',
                        isSelected && 'bg-gray-50 dark:bg-gray-800/50',
                      )}
                    >
                      <View className="mt-0.5">
                        <Tag size={18} color={iconColor} />
                      </View>
                      <View className="flex-1 flex-row items-center gap-2">
                        <Text
                          className={cn(
                            'flex-1 text-sm font-medium',
                            isSelected
                              ? 'text-primary dark:text-primary'
                              : 'text-gray-900 dark:text-gray-50',
                          )}
                          numberOfLines={1}
                        >
                          {t(opt.labelKey)}
                        </Text>
                        {isSelected && <Check size={16} color={iconColor} />}
                      </View>
                    </TouchableOpacity>
                  )
                })}
              </View>
            </DropdownMenuContent>
          </DropdownMenu>
        </View>

        {/* DataTable */}
        <View className="flex-1 p-4" style={{ minHeight: 300 }}>
          <DataTable<ILoyaltyPointHistory>
            data={historyList}
            columns={columns}
            config={{
              pagination: true,
              pageSize: 10,
              filterDebounceMs: 300,
            }}
            rowKey="id"
            onRowPress={handleRowPress}
            isLoading={loadingHistory}
            emptyComponent={
              <DataTable.Empty message={t('common:common.noData')} />
            }
            loadingComponent={
              <DataTable.Loading message={t('common:common.loading')} />
            }
          >
            <DataTable.Toolbar showFilters={false} />
            <DataTable.Pagination />
          </DataTable>
        </View>
      </ScrollView>

      <LoyaltyPointDetailHistoryDialog
        isOpen={isDetailOpen}
        onOpenChange={setIsDetailOpen}
        history={selectedHistory}
        onCloseSheet={() => setSelectedHistory(null)}
      />
    </SafeAreaView>
  )
}
