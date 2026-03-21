/**
 * Tab Menu — FlashList + data flattening.
 */
import { FlashList } from '@shopify/flash-list'
import dayjs from 'dayjs'
import { Image as ExpoImage } from 'expo-image'
import { MapPin } from 'lucide-react-native'
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Image,
  InteractionManager,
  RefreshControl,
  StyleSheet,
  Text,
  View,
  useColorScheme,
} from 'react-native'

import { Images } from '@/assets/images'
import { SelectBranchDropdown } from '@/components/branch'
import { ScreenContainer } from '@/components/layout/screen-container'
import {
  ClientCatalogSelect,
  MenuItemQuantityControl,
  PriceFilterChip,
  PriceRangeFilter,
} from '@/components/menu'
import { NativeGesturePressable } from '@/components/navigation/native-gesture-pressable'
import { Skeleton } from '@/components/ui'
// import { publicFileURL } from '@/constants'
import {
  useCatalog,
  useMenuScreenState,
  usePressInPrefetchMenuItem,
  usePrimaryColor,
  usePublicSpecificMenu,
  useRunAfterTransition,
  useSpecificMenu,
  useTabScrollRestore,
  useViewableMenuPrefetch,
} from '@/hooks'
import { useMasterTransitionOptional } from '@/lib/navigation/master-transition-provider'
import { getThemeColor } from '@/lib/utils'
import type { IMenuItem, ISpecificMenuRequest } from '@/types'
import { formatCurrency } from '@/utils'
import { getProductImageUrl } from '@/utils/product-image-url'

/** Mục phẳng: Header (tên catalog) hoặc Row (IMenuItem) */
type FlatMenuItem =
  | { type: 'header'; id: string; name: string }
  | { type: 'row'; id: string; item: IMenuItem }

/** Ngưỡng defer: >50 items → group/flatten off-thread để tránh jank */
const DEFER_THRESHOLD = 50
/** Data layering: render 25 item đầu ngay, phần còn lại sau 120ms */
const FIRST_BATCH_SIZE = 25
const SECOND_BATCH_DELAY_MS = 120
/** Fallback: nếu JS bị block, timer 120ms có thể delay — force sync sau 250ms */
const DISPLAY_DATA_FALLBACK_MS = 250

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
  fixedHeader: { backgroundColor: '#ffffff' },
})

const menuListEmptyStyles = StyleSheet.create({
  container: { padding: 24, alignItems: 'center' },
  text: { textAlign: 'center', color: '#6b7280' },
})

const menuFlashListStyles = StyleSheet.create({
  content: { paddingBottom: 100 },
})

/** Progressive mount: Catalog 50ms, Filter 100ms — phân tán tải Yoga layout */
const CATALOG_MOUNT_DELAY_MS = 50
const FILTER_MOUNT_DELAY_MS = 100

const MenuListHeader = React.memo(function MenuListHeader({
  showSkeleton,
  branch,
  noBranchText,
}: {
  showSkeleton: boolean
  branch: { name: string; address: string } | null | undefined
  noBranchText: string
}) {
  const [catalogReady, setCatalogReady] = useState(false)
  const [filterReady, setFilterReady] = useState(false)

  useEffect(() => {
    if (showSkeleton) {
      queueMicrotask(() => {
        setCatalogReady(false)
        setFilterReady(false)
      })
      return
    }
    const t1 = setTimeout(() => setCatalogReady(true), CATALOG_MOUNT_DELAY_MS)
    const t2 = setTimeout(() => setFilterReady(true), FILTER_MOUNT_DELAY_MS)
    return () => {
      clearTimeout(t1)
      clearTimeout(t2)
    }
  }, [showSkeleton])

  return (
    <View style={menuListHeaderStyles.root}>
      {/* Frame 1: Logo + Branch info (mount ngay) */}
      <View style={menuListHeaderStyles.logoRow}>
        <Image
          source={Images.Brand.Logo as unknown as number}
          style={menuListHeaderStyles.logoImage}
          resizeMode="contain"
        />
        <SelectBranchDropdown />
      </View>

      <View style={menuListHeaderStyles.branchRow}>
        <MapPin size={16} color="#e50914" />
        <Text style={menuListHeaderStyles.branchText}>
          {branch ? `${branch.name} (${branch.address})` : noBranchText}
        </Text>
      </View>

      {/* Frame 2 (50ms): ClientCatalogSelect — Frame 3 (100ms): PriceRangeFilter */}
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
                {catalogReady ? (
                  <ClientCatalogSelect />
                ) : (
                  <Skeleton style={menuListHeaderStyles.skeletonMain} />
                )}
              </View>
              {filterReady ? (
                <PriceRangeFilter />
              ) : (
                <Skeleton style={menuListHeaderStyles.skeletonFilter} />
              )}
            </View>
            <PriceFilterChip />
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
}: {
  name: string
}) {
  const primaryColor = usePrimaryColor()
  return (
    <View style={headerRowStyles.container}>
      <Text style={[headerRowStyles.title, { color: primaryColor }]}>
        {name}
      </Text>
    </View>
  )
})

function menuItemRowPropsAreEqual(
  prev: {
    item: IMenuItem
    onPressIn?: (slug: string) => void
    listIndex?: number
  },
  next: {
    item: IMenuItem
    onPressIn?: (slug: string) => void
    listIndex?: number
  },
): boolean {
  if (prev.onPressIn !== next.onPressIn) return false
  if (prev.listIndex !== next.listIndex) return false
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

/** Số ảnh đầu tiên dùng priority="high" — 4–8 ảnh decode đồng thời, ưu tiên above-fold */
const MENU_IMAGE_HIGH_PRIORITY_INDEX = 4

const MenuItemRow = React.memo(function MenuItemRow({
  item,
  onPressIn,
  listIndex,
}: {
  item: IMenuItem
  onPressIn?: (slug: string) => void
  listIndex?: number
}) {
  const primaryColor = usePrimaryColor()
  const minPrice = item.product?.variants?.length
    ? Math.min(...item.product.variants.map((v) => v.price))
    : 0
  const currentStock = item.currentStock ?? 0
  const hasStock =
    !item.isLocked && (currentStock > 0 || !item.product?.isLimit)

  const hasPromotion = item.promotion && item.promotion.value > 0

  const imageUrl = React.useMemo(
    () => getProductImageUrl(item.product?.image),
    [item.product?.image],
  )

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
          pathname: '/(tabs)/menu/product/[id]',
          params: { id: slug },
        },
      }}
      onPressIn={onPressIn ? () => onPressIn(slug) : undefined}
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
              recyclingKey={(item.product?.image || slug || '').replace(
                /^\//,
                '',
              )}
              priority={
                listIndex != null && listIndex < MENU_IMAGE_HIGH_PRIORITY_INDEX
                  ? 'high'
                  : 'low'
              }
              cachePolicy="disk"
              allowDownscaling
              enforceEarlyResizing
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
  const { scrollRef: _scrollRef, onScrollEnd } = useTabScrollRestore('menu')
  const {
    userSlug,
    isAuthenticated,
    menuFilter,
    setMenuFilter,
    branchSlug,
    branchName,
    branchAddress,
  } = useMenuScreenState()

  const branch = useMemo((): { name: string; address: string } | null => {
    if (branchName != null || branchAddress != null) {
      return {
        name: (branchName as string) ?? '',
        address: (branchAddress as string) ?? '',
      }
    }
    return null
  }, [branchName, branchAddress])

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
  const [headerReady, setHeaderReady] = useState(false)
  const [allowCatalog, setAllowCatalog] = useState(false)
  // androidDelayMs: -20 — fire ~180ms từ mount, pre-emptive để giảm thời gian skeleton
  useRunAfterTransition(() => setAllowFetch(true), [], { androidDelayMs: -20 })
  useRunAfterTransition(
    () => {
      setAllowCatalog(true)
      setHeaderReady(true)
    },
    [],
    { androidDelayMs: 100 },
  )

  const prefetchMenuItem = usePressInPrefetchMenuItem()
  const { viewabilityConfigCallbackPairs } = useViewableMenuPrefetch()

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
  const { data: catalogData } = useCatalog({ enabled: allowCatalog })
  const masterTransition = useMasterTransitionOptional()

  const rawMenuItems = useMemo(
    () => menuData?.result?.menuItems ?? [],
    [menuData?.result?.menuItems],
  )
  const catalogs = useMemo(
    () => catalogData?.result ?? [],
    [catalogData?.result],
  )
  const rawItemCount = rawMenuItems.length

  type GroupedItem = {
    catalog: { slug: string; name: string }
    items: IMenuItem[]
  }
  const computeGrouped = useCallback(
    (
      items: IMenuItem[],
      catalogList: { slug: string; name: string }[],
    ): GroupedItem[] => {
      const groupsBySlug: Record<string, IMenuItem[]> = {}
      for (const item of items) {
        const slug = item.product?.catalog?.slug
        if (slug) (groupsBySlug[slug] ??= []).push(item)
      }
      return catalogList
        .map((catalog) => ({
          catalog,
          items: groupsBySlug[catalog.slug] ?? [],
        }))
        .filter((g) => g.items.length > 0)
        .sort((a, b) => b.items.length - a.items.length)
    },
    [],
  )
  const flattenGrouped = useCallback(
    (grouped: GroupedItem[]): FlatMenuItem[] => {
      const out: FlatMenuItem[] = []
      for (const g of grouped) {
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
    },
    [],
  )

  /** Nhỏ: sync. Lớn (>50): defer qua setTimeout(0) để nhường UI thread. */
  const [deferredGrouped, setDeferredGrouped] = useState<GroupedItem[] | null>(
    null,
  )
  const groupedByCatalogSync = useMemo(() => {
    if (rawItemCount > DEFER_THRESHOLD) return null
    return computeGrouped(rawMenuItems, catalogs)
  }, [rawItemCount, rawMenuItems, catalogs, computeGrouped])

  useEffect(() => {
    if (rawItemCount <= DEFER_THRESHOLD || !catalogs.length) {
      setDeferredGrouped(null)
      return
    }
    const id = setTimeout(() => {
      InteractionManager.runAfterInteractions(() => {
        const grouped = computeGrouped(rawMenuItems, catalogs)
        setDeferredGrouped(grouped)
      })
    }, 0)
    return () => clearTimeout(id)
  }, [rawItemCount, rawMenuItems, catalogs, computeGrouped])

  const groupedByCatalog =
    rawItemCount <= DEFER_THRESHOLD ? groupedByCatalogSync : deferredGrouped
  // const itemCount = groupedByCatalog
  //   ? groupedByCatalog.reduce((sum, g) => sum + g.items.length, 0)
  //   : 0

  const flattenedDataFull = useMemo<FlatMenuItem[]>(() => {
    if (!groupedByCatalog) return []
    return flattenGrouped(groupedByCatalog)
  }, [groupedByCatalog, flattenGrouped])

  /** Data layering: 25 item đầu ngay, full list sau 120ms — tránh FlashList ngộp. */
  const [displayData, setDisplayData] = useState<FlatMenuItem[]>([])
  const displayDataSyncRef = useRef(false)
  useEffect(() => {
    if (flattenedDataFull.length === 0) {
      setDisplayData([])
      displayDataSyncRef.current = false
      return
    }
    if (flattenedDataFull.length <= FIRST_BATCH_SIZE) {
      setDisplayData(flattenedDataFull)
      displayDataSyncRef.current = true
      return
    }
    setDisplayData(flattenedDataFull.slice(0, FIRST_BATCH_SIZE))
    displayDataSyncRef.current = false

    const mainTimer = setTimeout(() => {
      setDisplayData(flattenedDataFull)
      displayDataSyncRef.current = true
    }, SECOND_BATCH_DELAY_MS)

    const fallbackTimer = setTimeout(() => {
      if (!displayDataSyncRef.current) {
        setDisplayData((prev) =>
          prev.length < flattenedDataFull.length ? flattenedDataFull : prev,
        )
      }
    }, DISPLAY_DATA_FALLBACK_MS)

    return () => {
      clearTimeout(mainTimer)
      clearTimeout(fallbackTimer)
    }
  }, [flattenedDataFull])

  const flattenedData =
    flattenedDataFull.length > FIRST_BATCH_SIZE
      ? displayData.length > 0
        ? displayData
        : flattenedDataFull.slice(0, FIRST_BATCH_SIZE)
      : flattenedDataFull

  useEffect(() => {
    if (!isPending && masterTransition?.hideLoadingOverlay)
      masterTransition.hideLoadingOverlay()
  }, [isPending, masterTransition?.hideLoadingOverlay, masterTransition])

  // Flow chuẩn: cache hit → content ngay; cache miss → skeleton → useRunAfterTransition → fetch
  // Defer: khi >50 items đang chờ group/flatten off-thread → giữ skeleton
  const showSkeleton =
    (hasBranch && !menuData) ||
    !headerReady ||
    (rawItemCount > DEFER_THRESHOLD && !groupedByCatalog)

  const getItemType = useCallback((item: FlatMenuItem) => item.type, [])

  const noBranchText = t('menu.noData', 'Chưa chọn chi nhánh')
  const noDataText = t('menu.noData', 'Không có dữ liệu')

  const renderItem = useCallback(
    ({ item, index }: { item: FlatMenuItem; index: number }) => {
      if (item.type === 'header') {
        return <CatalogHeaderRow name={item.name} />
      }
      return (
        <MenuItemRow
          item={item.item}
          onPressIn={prefetchMenuItem}
          listIndex={index}
        />
      )
    },
    [prefetchMenuItem],
  )

  const keyExtractor = useCallback((item: FlatMenuItem) => item.id, [])

  const listHeaderComponent = useMemo(
    () => (
      <MenuListHeader
        showSkeleton={showSkeleton}
        branch={branch ?? null}
        noBranchText={noBranchText}
      />
    ),
    [showSkeleton, branch, noBranchText],
  )

  /** Tránh flash "Không có dữ liệu" khi đang load/xử lý: chỉ hiện khi chắc chắn đã xong và thật sự không có món */
  const isProcessing =
    isPending || (rawMenuItems.length > 0 && flattenedData.length === 0) // có data nhưng chưa group (chờ catalogs/defer)
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
    if (
      hasBranch &&
      !showSkeleton &&
      flattenedData.length === 0 &&
      !isProcessing
    ) {
      return (
        <View style={menuListEmptyStyles.container}>
          <Text style={menuListEmptyStyles.text}>{noDataText}</Text>
        </View>
      )
    }
    return null
  }, [hasBranch, showSkeleton, flattenedData.length, isProcessing, noDataText])

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
      {/* FlashList v2: estimatedItemSize đã bỏ — tự động measure nội bộ */}
      <FlashList
        data={flattenedData}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        getItemType={getItemType}
        ItemSeparatorComponent={null}
        ListHeaderComponent={null}
        ListEmptyComponent={listEmptyComponent}
        onMomentumScrollEnd={onScrollEnd}
        onScrollEndDrag={onScrollEnd}
        viewabilityConfigCallbackPairs={viewabilityConfigCallbackPairs}
        contentContainerStyle={menuFlashListStyles.content}
        showsVerticalScrollIndicator={false}
        drawDistance={300}
        overrideProps={{ initialDrawBatchSize: 6 }}
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
    <ScreenContainer
      edges={['top']}
      topOffset={-12}
      style={{ flex: 1, backgroundColor: themeBackground }}
    >
      <MenuPlaceholderContent />
    </ScreenContainer>
  )
}
