/**
 * Gift Card Orders screen — Lịch sử mua thẻ quà tặng.
 * Route: /profile/gift-card-orders
 *
 * Hiển thị lịch sử đơn hàng thẻ quà của khách với filter theo type.
 * Tap vào đơn → navigate tới order-success/[slug] để xem chi tiết.
 */
import { FlashList, type ListRenderItem } from '@shopify/flash-list'
import { Clock, Gift, ShoppingBag, UserRound, Users } from 'lucide-react-native'
import { memo, useCallback, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  useColorScheme,
  View,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { FloatingHeader } from '@/components/navigation/floating-header'
import { Skeleton } from '@/components/ui'
import { colors, GiftCardType } from '@/constants'
import { useCardOrders } from '@/hooks/use-card-order'
import { usePrimaryColor } from '@/hooks/use-primary-color'
import { useRunAfterTransition } from '@/hooks/use-run-after-transition'
import { navigateNative } from '@/lib/navigation'
import { useUserStore } from '@/stores'
import type { ICardOrderResponse } from '@/types'
import { formatCurrency } from '@/utils'

// ─── Filter bar ───────────────────────────────────────────────────────────────

const FilterBar = memo(function FilterBar({
  selected,
  primaryColor,
  isDark,
  onSelect,
  filters,
}: {
  selected: string
  primaryColor: string
  isDark: boolean
  onSelect: (v: string) => void
  filters: { label: string; value: string }[]
}) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={s.filterScroll}
    >
      {filters.map((f) => {
        const active = selected === f.value
        return (
          <Pressable
            key={f.value}
            onPress={() => onSelect(f.value)}
            style={[
              s.filterChip,
              {
                backgroundColor: active ? primaryColor : (isDark ? colors.gray[800] : colors.gray[100]),
                borderColor: active ? primaryColor : (isDark ? colors.gray[700] : colors.gray[200]),
              },
            ]}
          >
            <Text style={[s.filterText, { color: active ? colors.white.light : (isDark ? colors.gray[300] : colors.gray[600]) }]}>
              {f.label}
            </Text>
          </Pressable>
        )
      })}
    </ScrollView>
  )
})

// ─── Status badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status, isDark }: { status: string; isDark: boolean }) {
  const { t } = useTranslation('giftCard')
  const upper = (status ?? '').toUpperCase()
  let bg = isDark ? colors.gray[700] : colors.gray[200]
  let color = isDark ? colors.gray[400] : colors.gray[500]
  let label = status

  if (upper === 'COMPLETED' || upper === 'PAID') {
    bg = '#dcfce7'; color = '#16a34a'; label = t('orderStatus.completedShort')
  } else if (upper === 'PENDING') {
    bg = '#fef9c3'; color = '#b45309'; label = t('orderStatus.pendingShort')
  } else if (upper === 'CANCELLED') {
    bg = '#fee2e2'; color = '#dc2626'; label = t('orderStatus.cancelled')
  }

  return (
    <View style={[sb.wrap, { backgroundColor: bg }]}>
      <Text style={[sb.text, { color }]}>{label}</Text>
    </View>
  )
}

const sb = StyleSheet.create({
  wrap: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 },
  text: { fontSize: 10, fontWeight: '700' },
})

// ─── Type icon ────────────────────────────────────────────────────────────────

function TypeIcon({ type, color }: { type: string; color: string }) {
  const upper = (type ?? '').toUpperCase()
  if (upper === GiftCardType.GIFT) return <Users size={16} color={color} />
  if (upper === GiftCardType.BUY) return <ShoppingBag size={16} color={color} />
  return <UserRound size={16} color={color} />
}

// ─── Order list item ──────────────────────────────────────────────────────────

const ITEM_HEIGHT = 92

const OrderListItem = memo(function OrderListItem({
  item,
  primaryColor,
  isDark,
  onPress,
}: {
  item: ICardOrderResponse
  primaryColor: string
  isDark: boolean
  onPress: (slug: string) => void
}) {
  const textColor = isDark ? colors.gray[50] : colors.gray[900]
  const subColor = isDark ? colors.gray[400] : colors.gray[500]
  const bg = isDark ? colors.gray[900] : colors.white.light
  const borderColor = isDark ? colors.gray[700] : colors.gray[100]

  const { t } = useTranslation('giftCard')
  const handlePress = useCallback(() => onPress(item.slug), [item.slug, onPress])

  const dateLabel = useMemo(
    () => new Date(item.orderDate ?? item.createdAt ?? '').toLocaleDateString('vi-VN'),
    [item.orderDate, item.createdAt],
  )

  const typeLabel =
    item.type === GiftCardType.GIFT ? t('type.gift')
    : item.type === GiftCardType.BUY ? t('type.buy')
    : t('type.self')

  return (
    <Pressable
      onPress={handlePress}
      style={[s.item, { backgroundColor: bg, borderColor }]}
    >
      {/* Left icon */}
      <View style={[s.itemIcon, { backgroundColor: `${primaryColor}15` }]}>
        <TypeIcon type={item.type} color={primaryColor} />
      </View>

      {/* Content */}
      <View style={s.itemContent}>
        <View style={s.itemTopRow}>
          <Text style={[s.itemName, { color: textColor }]} numberOfLines={1}>
            {item.cardTitle}
          </Text>
          <StatusBadge status={item.paymentStatus} isDark={isDark} />
        </View>
        <Text style={[s.itemType, { color: subColor }]}>
          {typeLabel} · {t('orders.cards', { count: item.quantity })} · {formatCurrency(item.totalAmount)}
        </Text>
        <View style={s.itemMeta}>
          <Clock size={11} color={subColor} />
          <Text style={[s.itemDate, { color: subColor }]}>
            {dateLabel}
          </Text>
          {item.code && (
            <Text style={[s.itemCode, { color: subColor }]}>· #{item.code}</Text>
          )}
        </View>
      </View>
    </Pressable>
  )
})

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function SkeletonList() {
  return (
    <View style={{ paddingHorizontal: 16, gap: 10, paddingTop: 10 }}>
      {Array.from({ length: 5 }).map((_, i) => (
        <Skeleton key={i} className="w-full rounded-2xl" style={{ height: ITEM_HEIGHT }} />
      ))}
    </View>
  )
}

// ─── Stable separator ────────────────────────────────────────────────────────

const ItemSeparator = () => <View style={{ height: 10 }} />

// ─── Main screen ─────────────────────────────────────────────────────────────

export default function GiftCardOrdersScreen() {
  const { t } = useTranslation('giftCard')
  const isDark = useColorScheme() === 'dark'
  const primaryColor = usePrimaryColor()
  const insets = useSafeAreaInsets()
  const userSlug = useUserStore((s) => s.userInfo?.slug)

  const TYPE_FILTERS = useMemo(() => [
    { label: t('orders.types.all'), value: 'ALL' },
    { label: t('type.self'),        value: GiftCardType.SELF },
    { label: t('type.gift'),        value: GiftCardType.GIFT },
    { label: t('type.buy'),         value: GiftCardType.BUY },
  ], [t])

  const [ready, setReady] = useState(false)
  const [selectedType, setSelectedType] = useState('ALL')

  useRunAfterTransition(() => setReady(true), [])

  const queryParams = useMemo(
    () => ({ customerSlug: userSlug, page: 1, size: 50, sort: '-createdAt' }),
    [userSlug],
  )

  const { data, isLoading, isFetching, refetch } = useCardOrders(
    queryParams,
    { enabled: ready && !!userSlug },
  )

  const allItems = data?.items ?? []
  const items = selectedType === 'ALL'
    ? allItems
    : allItems.filter((o) => (o.type ?? '').toUpperCase() === selectedType)

  const bg = isDark ? colors.background.dark : colors.background.light
  const textColor = isDark ? colors.gray[50] : colors.gray[900]
  const subColor = isDark ? colors.gray[400] : colors.gray[500]

  const handlePress = useCallback((slug: string) => {
    navigateNative.push(
      `/gift-card/order-success/${slug}` as Parameters<typeof navigateNative.push>[0],
    )
  }, [])

  const handleTypeSelect = useCallback((v: string) => setSelectedType(v), [])

  const renderItem: ListRenderItem<ICardOrderResponse> = useCallback(
    ({ item }) => (
      <OrderListItem
        item={item}
        primaryColor={primaryColor}
        isDark={isDark}
        onPress={handlePress}
      />
    ),
    [primaryColor, isDark, handlePress],
  )

  const keyExtractor = useCallback((item: ICardOrderResponse) => item.slug, [])

  const ListHeader = (
    <>
      <FilterBar
        selected={selectedType}
        primaryColor={primaryColor}
        isDark={isDark}
        onSelect={handleTypeSelect}
        filters={TYPE_FILTERS}
      />
      {!isLoading && items.length > 0 && (
        <Text style={[s.totalText, { color: subColor }]}>{t('orders.countOrders', { count: items.length })}</Text>
      )}
    </>
  )

  const ListEmpty = !isLoading ? (
    <View style={s.emptyWrap}>
      <Gift size={40} color={colors.gray[400]} />
      <Text style={[s.emptyTitle, { color: textColor }]}>{t('orders.empty.noOrders')}</Text>
      <Text style={[s.emptyHint, { color: subColor }]}>
        {selectedType === 'ALL'
          ? t('orders.empty.noOwned')
          : t('orders.empty.noType', { type: TYPE_FILTERS.find(f => f.value === selectedType)?.label })}
      </Text>
    </View>
  ) : null

  return (
    <View style={[s.container, { backgroundColor: bg }]}>
      <FloatingHeader title={t('orders.title')} />

      {(!ready || isLoading) ? (
        <View style={{ paddingTop: insets.top + 64 }}>
          <SkeletonList />
        </View>
      ) : (
        <FlashList
          data={items}
          keyExtractor={keyExtractor}
          renderItem={renderItem}
          contentContainerStyle={{
            paddingTop: insets.top + 64,
            paddingHorizontal: 16,
            paddingBottom: insets.bottom + 24,
          }}
          ListHeaderComponent={ListHeader}
          ListEmptyComponent={ListEmpty}
          showsVerticalScrollIndicator={false}
          ItemSeparatorComponent={ItemSeparator}
          refreshControl={
            <RefreshControl
              refreshing={isFetching && !isLoading}
              onRefresh={refetch}
              tintColor={primaryColor}
            />
          }
        />
      )}
    </View>
  )
}

const s = StyleSheet.create({
  container: { flex: 1 },
  filterScroll: { paddingVertical: 12, gap: 8 },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: 1,
  },
  filterText: { fontSize: 13, fontWeight: '600' },
  totalText: { fontSize: 12, fontWeight: '500', paddingBottom: 4 },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    minHeight: ITEM_HEIGHT,
  },
  itemIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  itemContent: { flex: 1, gap: 4 },
  itemTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  itemName: { flex: 1, fontSize: 14, fontWeight: '700' },
  itemType: { fontSize: 12 },
  itemMeta: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  itemDate: { fontSize: 11 },
  itemCode: { fontSize: 11 },
  emptyWrap: { paddingTop: 60, alignItems: 'center', gap: 10 },
  emptyTitle: { fontSize: 16, fontWeight: '700' },
  emptyHint: { fontSize: 13, textAlign: 'center', paddingHorizontal: 32, lineHeight: 18 },
})
