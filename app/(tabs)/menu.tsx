/**
 * Tab Menu — FlashList + data flattening.
 */
import { FlashList } from '@shopify/flash-list'
import dayjs from 'dayjs'
import { Image as ExpoImage } from 'expo-image'
import { MapPin, X } from 'lucide-react-native'
import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Image,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useColorScheme,
} from 'react-native'

import { Images } from '@/assets/images'
import { SelectBranchDropdown } from '@/components/branch'
import {
  ClientCatalogSelect,
  MenuItemQuantityControl,
  PriceRangeFilter,
} from '@/components/menu'
import { ScreenContainer } from '@/components/layout/screen-container'
import { NativeGesturePressable } from '@/components/navigation/native-gesture-pressable'
import { Skeleton } from '@/components/ui'
import { FILTER_VALUE, publicFileURL } from '@/constants'
import {
  useCatalog,
  useMenuScreenState,
  usePublicSpecificMenu,
  useRunAfterTransition,
  useSpecificMenu,
  useTabScrollRestore,
} from '@/hooks'
import { useMasterTransitionOptional } from '@/lib/navigation/master-transition-provider'
import { getThemeColor } from '@/lib/utils'
import type { IMenuItem, ISpecificMenuRequest } from '@/types'
import { formatCurrency } from '@/utils'

/** Mục phẳng: Header (tên catalog) hoặc Row (IMenuItem) */
type FlatMenuItem =
  | { type: 'header'; id: string; name: string }
  | { type: 'row'; id: string; item: IMenuItem }

const menuListHeaderStyles = StyleSheet.create({
  root: { padding: 16, paddingBottom: 0 },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  logoImage: { height: 32, width: 112 },
  branchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  branchText: { fontSize: 12, color: '#6b7280', marginLeft: 4 },
  catalogSection: { marginBottom: 12 },
  skeletonRow: { flexDirection: 'row', gap: 8 },
  skeletonMain: { flex: 1, height: 50, borderRadius: 12 },
  skeletonFilter: { width: 50, height: 50, borderRadius: 12 },
  catalogRow: { flexDirection: 'row', gap: 8 },
  catalogFlex: { flex: 1 },
  priceFilterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 8,
    padding: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e50914',
    backgroundColor: 'rgba(229, 9, 20, 0.05)',
  },
  priceFilterText: { fontSize: 14, color: '#e50914' },
  fixedHeader: { backgroundColor: '#ffffff' },
})

const menuListEmptyStyles = StyleSheet.create({
  container: { padding: 24, alignItems: 'center' },
  text: { textAlign: 'center', color: '#6b7280' },
})

const menuFlashListStyles = StyleSheet.create({
  content: { paddingBottom: 100 },
})

const MenuListHeader = React.memo(function MenuListHeader({
  showSkeleton,
  branch,
  menuFilter,
  handleClearPriceFilter,
  t,
}: {
  showSkeleton: boolean
  branch: { name: string; address: string } | null | undefined
  primaryColor: string
  menuFilter: { minPrice: number; maxPrice: number }
  handleClearPriceFilter: () => void
  t: (key: string, fallback?: string) => string
}) {
  return (
    <View style={menuListHeaderStyles.root}>
      {/* Logo + Branch dropdown */}
      <View style={menuListHeaderStyles.logoRow}>
        <Image
          source={Images.Brand.Logo as unknown as number}
          style={menuListHeaderStyles.logoImage}
          resizeMode="contain"
        />
        <SelectBranchDropdown />
      </View>

      {/* Branch info */}
      <View style={menuListHeaderStyles.branchRow}>
        <MapPin size={16} color="#e50914" />
        <Text style={menuListHeaderStyles.branchText}>
          {branch
            ? `${branch.name} (${branch.address})`
            : t('menu.noData', 'Chưa chọn chi nhánh')}
        </Text>
      </View>

      {/* Catalog + Price filter */}
      <View style={menuListHeaderStyles.catalogSection}>
        {showSkeleton ? (
          <View style={menuListHeaderStyles.skeletonRow}>
            <Skeleton style={menuListHeaderStyles.skeletonMain} />
            <Skeleton style={menuListHeaderStyles.skeletonFilter} />
          </View>
        ) : (
          <>
            <View style={menuListHeaderStyles.catalogRow}>
              <View style={menuListHeaderStyles.catalogFlex}>
                <ClientCatalogSelect />
              </View>
              <PriceRangeFilter />
            </View>
            {(menuFilter.minPrice > FILTER_VALUE.MIN_PRICE ||
              menuFilter.maxPrice < FILTER_VALUE.MAX_PRICE) && (
              <View style={menuListHeaderStyles.priceFilterChip}>
                <Text style={menuListHeaderStyles.priceFilterText}>
                  {formatCurrency(menuFilter.minPrice)} -{' '}
                  {formatCurrency(menuFilter.maxPrice)}
                </Text>
                <TouchableOpacity onPress={handleClearPriceFilter}>
                  <X size={20} color="#6b7280" />
                </TouchableOpacity>
              </View>
            )}
          </>
        )}
      </View>
    </View>
  )
})

const headerRowStyles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    marginBottom: 10,
    marginTop: 12,
    borderBottomWidth: 0,
  },
  title: {
    fontSize: 16,
    fontWeight: '800',
    textTransform: 'uppercase' as const,
  },
})

const CatalogHeaderRow = React.memo(function CatalogHeaderRow({
  name,
  primaryColor,
}: {
  name: string
  primaryColor: string
}) {
  return (
    <View style={headerRowStyles.container}>
      <Text style={[headerRowStyles.title, { color: primaryColor }]}>
        {name}
      </Text>
    </View>
  )
})

function menuItemRowPropsAreEqual(
  prev: { item: IMenuItem; primaryColor: string },
  next: { item: IMenuItem; primaryColor: string },
): boolean {
  if (prev.primaryColor !== next.primaryColor) return false
  const a = prev.item
  const b = next.item
  const aSlug = a.slug ?? a.product?.slug
  const bSlug = b.slug ?? b.product?.slug
  if (aSlug !== bSlug) return false
  if (a.isLocked !== b.isLocked) return false
  if ((a.currentStock ?? 0) !== (b.currentStock ?? 0)) return false
  if (a.product?.name !== b.product?.name) return false
  const aMin = a.product?.variants?.length
    ? Math.min(...a.product.variants.map((v) => v.price))
    : 0
  const bMin = b.product?.variants?.length
    ? Math.min(...b.product.variants.map((v) => v.price))
    : 0
  return aMin === bMin
}

const menuItemRowStyles = StyleSheet.create({
  wrapper: {
    marginBottom: 12,
    paddingHorizontal: 16,
    borderTopWidth: 0,
  },
  card: {
    flexDirection: 'row',
    padding: 8,
    backgroundColor: '#fff',
    borderRadius: 16,
    alignItems: 'stretch',
    borderWidth: 0,
  },
  imageWrap: {
    width: 92,
    height: 92,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: '#f3f4f6',
  },
  image: { width: '100%', height: '100%' },
  content: {
    flex: 1,
    marginLeft: 12,
    justifyContent: 'space-between',
    alignSelf: 'stretch',
  },
  productName: { fontSize: 16, fontWeight: '600' },
  qtyWrap: { alignSelf: 'flex-end', transform: [{ scale: 0.85 }] },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 6,
  },
  priceDiscounted: {
    fontSize: 14,
    fontWeight: '700',
    color: '#f97316', // close to primary
  },
  pricePromotionBadge: {
    backgroundColor: '#dc2626',
    borderRadius: 999,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  pricePromotionText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#fff',
  },
  priceOriginal: {
    fontSize: 12,
    color: '#9ca3af',
    textDecorationLine: 'line-through',
  },
})

const MenuItemRow = React.memo(function MenuItemRow({
  item,
  primaryColor,
}: {
  item: IMenuItem
  primaryColor: string
}) {
  const minPrice = item.product?.variants?.length
    ? Math.min(...item.product.variants.map((v) => v.price))
    : 0
  const currentStock = item.currentStock ?? 0
  const hasStock =
    !item.isLocked && (currentStock > 0 || !item.product?.isLimit)

  const hasPromotion = item.promotion && item.promotion.value > 0

  const imageUrl = React.useMemo(() => {
    const raw = item.product?.image?.trim()
    if (!raw) return null
    if (/^https?:\/\//i.test(raw)) return raw
    const base = publicFileURL ?? ''
    if (!base) return null
    return `${base.replace(/\/$/, '')}/${raw.replace(/^\//, '')}`
  }, [item.product?.image])

  const slug = item.slug ?? item.product?.slug ?? ''

  const priceStyle = React.useMemo(
    () => ({ fontSize: 14, color: primaryColor, marginTop: 4 }),
    [primaryColor],
  )

  return (
    <NativeGesturePressable
      navigation={{
        type: 'push',
        href: {
          pathname: '/product/[id]',
          params: { id: slug },
        },
      }}
      hapticStyle="light"
      style={menuItemRowStyles.wrapper}
    >
      <View style={menuItemRowStyles.card}>
        <View style={menuItemRowStyles.imageWrap}>
          {imageUrl ? (
            <ExpoImage
              source={{ uri: imageUrl }}
              style={menuItemRowStyles.image}
              contentFit="cover"
            />
          ) : (
            <Image
              source={Images.Food.DefaultProductImage as number}
              resizeMode="cover"
              style={menuItemRowStyles.image}
            />
          )}
        </View>
        <View style={menuItemRowStyles.content}>
          <View>
            <Text style={menuItemRowStyles.productName} numberOfLines={1}>
              {item.product?.name}
            </Text>
            {hasPromotion && minPrice > 0 ? (
              <View style={menuItemRowStyles.priceRow}>
                <Text style={menuItemRowStyles.priceDiscounted}>
                  {formatCurrency(
                    minPrice * (1 - (item.promotion?.value || 0) / 100),
                  )}
                </Text>
                <View style={menuItemRowStyles.pricePromotionBadge}>
                  <Text style={menuItemRowStyles.pricePromotionText}>
                    -{item.promotion?.value}%
                  </Text>
                </View>
                <Text style={menuItemRowStyles.priceOriginal}>
                  {formatCurrency(minPrice)}
                </Text>
              </View>
            ) : (
              <Text style={priceStyle}>{formatCurrency(minPrice)}</Text>
            )}
          </View>
          <View style={menuItemRowStyles.qtyWrap}>
            <MenuItemQuantityControl
              item={item}
              hasStock={hasStock}
              isMobile={true}
            />
          </View>
        </View>
      </View>
    </NativeGesturePressable>
  )
}, menuItemRowPropsAreEqual)

function MenuPlaceholderContent() {
  const { t } = useTranslation('menu')
  const isDark = useColorScheme() === 'dark'
  const { primary: primaryColor, background: themeBackground } =
    getThemeColor(isDark)
  const { scrollRef: _scrollRef, onScroll } = useTabScrollRestore('menu')
  const {
    userSlug,
    isAuthenticated,
    menuFilter,
    setMenuFilter,
    branch,
    branchSlug,
  } = useMenuScreenState()

  const handleClearPriceFilter = useCallback(() => {
    setMenuFilter((prev) => ({
      ...prev,
      minPrice: FILTER_VALUE.MIN_PRICE,
      maxPrice: FILTER_VALUE.MAX_PRICE,
      branch: branchSlug ?? prev.branch,
    }))
  }, [setMenuFilter, branchSlug])

  const today = dayjs().format('YYYY-MM-DD')

  const menuRequest = useMemo<ISpecificMenuRequest>(
    () => ({
      date: menuFilter?.date ?? today,
      branch: menuFilter?.branch ?? branchSlug,
      catalog: menuFilter?.catalog,
      productName: menuFilter?.productName,
      minPrice: menuFilter?.minPrice,
      maxPrice: menuFilter?.maxPrice,
      slug: menuFilter?.menu,
    }),
    [menuFilter, branchSlug, today],
  )

  // Đảm bảo date của menu luôn sync với ngày hiện tại:
  // nếu store đang giữ ngày cũ (do persist), reset về today.
  useEffect(() => {
    if (menuFilter?.date !== today) {
      setMenuFilter((prev) => ({
        ...prev,
        date: today,
      }))
    }
  }, [menuFilter?.date, setMenuFilter, today])

  const [allowFetch, setAllowFetch] = useState(false)
  useRunAfterTransition(() => setAllowFetch(true), [])

  const hasUser = isAuthenticated && !!userSlug
  const hasBranch = !!menuFilter.branch || !!branchSlug
  const shouldFetchSpecific = allowFetch && hasUser && hasBranch
  const shouldFetchPublic = allowFetch && !hasUser && hasBranch

  const {
    data: specificMenuData,
    isPending: specificPending,
    refetch: refetchSpecific,
  } = useSpecificMenu(menuRequest, shouldFetchSpecific)
  const {
    data: publicMenuData,
    isPending: publicPending,
    refetch: refetchPublic,
  } = usePublicSpecificMenu(menuRequest, shouldFetchPublic)
  const menuData = hasUser ? specificMenuData : publicMenuData
  const isPending = hasUser ? specificPending : publicPending
  const { data: catalogData } = useCatalog()
  const masterTransition = useMasterTransitionOptional()

  const groupedByCatalog = useMemo(() => {
    const items = menuData?.result?.menuItems ?? []
    const catalogs = catalogData?.result ?? []
    const groupsBySlug: Record<string, IMenuItem[]> = {}
    for (const item of items) {
      const slug = item.product?.catalog?.slug
      if (slug) (groupsBySlug[slug] ??= []).push(item)
    }
    return catalogs
      .map((catalog) => ({ catalog, items: groupsBySlug[catalog.slug] ?? [] }))
      .filter((g) => g.items.length > 0)
      .sort((a, b) => b.items.length - a.items.length)
  }, [menuData?.result?.menuItems, catalogData?.result])

  /** Data flattening: chuyển groupedByCatalog thành mảng phẳng header + row */
  const flattenedData = useMemo<FlatMenuItem[]>(() => {
    const out: FlatMenuItem[] = []
    for (const g of groupedByCatalog) {
      out.push({
        type: 'header',
        id: `h-${g.catalog.slug}`,
        name: g.catalog.name,
      })
      for (const item of g.items) {
        out.push({
          type: 'row',
          id: item.slug ?? item.product?.slug ?? `row-${out.length}`,
          item,
        })
      }
    }
    return out
  }, [groupedByCatalog])

  useEffect(() => {
    if (!isPending && masterTransition?.hideLoadingOverlay)
      masterTransition.hideLoadingOverlay()
  }, [isPending, masterTransition?.hideLoadingOverlay, masterTransition])

  // Flow chuẩn: cache hit → content ngay; cache miss → skeleton → useRunAfterTransition → fetch
  const showSkeleton = hasBranch && !menuData

  const getItemType = useCallback((item: FlatMenuItem) => item.type, [])

  const renderItem = useCallback(
    ({ item }: { item: FlatMenuItem }) => {
      if (item.type === 'header') {
        return <CatalogHeaderRow name={item.name} primaryColor={primaryColor} />
      }
      return <MenuItemRow item={item.item} primaryColor={primaryColor} />
    },
    [primaryColor],
  )

  const keyExtractor = useCallback((item: FlatMenuItem) => item.id, [])

  const listHeaderComponent = useMemo(
    () => (
      <MenuListHeader
        showSkeleton={showSkeleton}
        branch={branch ?? null}
        primaryColor={primaryColor}
        menuFilter={menuFilter}
        handleClearPriceFilter={handleClearPriceFilter}
        t={(key, fallback) =>
          fallback !== undefined
            ? (t as (k: string, opts?: { defaultValue?: string }) => string)(
                key,
                {
                  defaultValue: fallback,
                },
              )
            : t(key)
        }
      />
    ),
    [showSkeleton, branch, primaryColor, menuFilter, handleClearPriceFilter, t],
  )

  const listEmptyComponent = useMemo(() => {
    if (!hasBranch) {
      return (
        <View style={menuListEmptyStyles.container}>
          <Text style={menuListEmptyStyles.text}>
            Vui lòng chọn chi nhánh để xem menu
          </Text>
        </View>
      )
    }
    if (hasBranch && !showSkeleton && flattenedData.length === 0) {
      return (
        <View style={menuListEmptyStyles.container}>
          <Text style={menuListEmptyStyles.text}>
            {t('menu.noData', 'Không có dữ liệu')}
          </Text>
        </View>
      )
    }
    return null
  }, [hasBranch, showSkeleton, flattenedData.length, t])
  const [refreshing, setRefreshing] = useState(false)

  const handleRefresh = useCallback(() => {
    if (!hasBranch) return
    setRefreshing(true)
    const refetch = hasUser ? refetchSpecific : refetchPublic
    refetch()
      .catch(() => {
        // silent
      })
      .finally(() => {
        setRefreshing(false)
      })
  }, [hasBranch, hasUser, refetchSpecific, refetchPublic])

  if (showSkeleton && hasBranch) {
    return (
      <View style={{ flex: 1, backgroundColor: themeBackground }}>
        <View style={menuListHeaderStyles.fixedHeader}>
          {listHeaderComponent}
        </View>
        <View style={{ padding: 16, flex: 1 }}>
          {[1, 2].map((catIdx) => (
            <View key={`s-${catIdx}`} style={{ marginBottom: 24 }}>
              <Skeleton
                style={{
                  height: 20,
                  width: 140,
                  borderRadius: 4,
                  marginBottom: 16,
                }}
              />
              {[1, 2, 3].map((i) => (
                <View
                  key={`s-${catIdx}-${i}`}
                  style={{
                    flexDirection: 'row',
                    marginBottom: 12,
                    alignItems: 'center',
                  }}
                >
                  <Skeleton
                    style={{ width: 92, height: 92, borderRadius: 10 }}
                  />
                  <View
                    style={{
                      flex: 1,
                      marginLeft: 12,
                      justifyContent: 'center',
                    }}
                  >
                    <Skeleton
                      style={{ height: 16, width: '70%', borderRadius: 4 }}
                    />
                    <Skeleton
                      style={{
                        height: 14,
                        width: 80,
                        borderRadius: 4,
                        marginTop: 8,
                      }}
                    />
                  </View>
                </View>
              ))}
            </View>
          ))}
        </View>
      </View>
    )
  }

  return (
    <View style={{ flex: 1, backgroundColor: themeBackground }}>
      <View style={menuListHeaderStyles.fixedHeader}>
        {listHeaderComponent}
      </View>
      <FlashList
        data={flattenedData}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        getItemType={getItemType}
        ItemSeparatorComponent={null}
        ListHeaderComponent={null}
        ListEmptyComponent={listEmptyComponent}
        onScroll={onScroll}
        scrollEventThrottle={16}
        contentContainerStyle={menuFlashListStyles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={primaryColor}
          />
        }
      />
    </View>
  )
}

export default function MenuPlaceholder() {
  const isDark = useColorScheme() === 'dark'
  const themeBackground = getThemeColor(isDark).background
  return (
    <ScreenContainer edges={['top']} topOffset={-12} style={{ flex: 1, backgroundColor: themeBackground }}>
      <MenuPlaceholderContent />
    </ScreenContainer>
  )
}
