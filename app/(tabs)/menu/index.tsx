/**
 * Tab Menu — FlashList + phase-gated images + ref-stable callbacks.
 * UI & logic ported from perf/index.tsx, store bridged to order-flow.
 */
import { getPublicSpecificMenu, getSpecificMenu } from '@/api/menu'
import { Images } from '@/assets/images'
import { SelectBranchDropdown } from '@/components/branch'
import { MenuItemImage } from '@/components/menu/menu-item-image'
import { PerfPriceSheet } from '@/components/menu/price-sheet'
import { NotificationBell } from '@/components/notification/notification-bell'
import { colors } from '@/constants'
import { STATIC_TOP_INSET } from '@/constants/status-bar'
import { OrderFlowStep } from '@/constants'
import { useCatalog } from '@/hooks/use-catalog'
import { useMenuScreenState } from '@/hooks/use-menu-screen-state'
import { usePrimaryColor } from '@/hooks/use-primary-color'
import { useOrderFlowStore, useUserStore } from '@/stores'
import { useSetMenuFilter } from '@/stores/selectors'
import type { IMenuItem, ISpecificMenuRequest } from '@/types'
import { IOrderItem } from '@/types'
import { capitalizeFirst } from '@/utils'
import { getProductImageUrl } from '@/utils/product-image-url'
import { showToast } from '@/utils/toast'
import { useFocusEffect } from '@react-navigation/native'
import { FlashList } from '@shopify/flash-list'
import { useQuery } from '@tanstack/react-query'
import { formatCurrencyNative } from 'cart-price-calc'
import dayjs from 'dayjs'
import { Image } from 'expo-image'
import { useRouter } from 'expo-router'
import { Plus, Search, SlidersHorizontal, X } from 'lucide-react-native'
import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  AppState,
  InteractionManager,
  Pressable,
  RefreshControl,
  Image as RNImage,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useColorScheme,
  View,
} from 'react-native'

type MenuDisplayItem = {
  id: string
  name: string
  rawPrice: number
  promotionValue: number
  imageUrl: string | null
  heroImagePaths: string[]
  listIndex: number
  /** Slug of the cheapest variant — used for cart + voucher API */
  defaultVariantSlug: string
  /** Raw menu item — used for constructing IOrderItem when adding to cart */
  menuItem: IMenuItem
  /** Pre-computed cheapest variant — avoids reduce() on every tap */
  cheapestVariant: import('@/types').IProductVariant | null
  /** Pre-serialized hero image URLs — avoids JSON.stringify on every detail open */
  heroImageUrlsJson: string
}

const MENU_IMAGE_HIGH_PRIORITY_COUNT = 4
const MENU_IMAGE_PREFETCH_AHEAD_COUNT = 2
const MENU_IMAGE_PREFETCH_DEBOUNCE_MS = 220
const MENU_ENTRY_FETCH_DELAY_MS = 120
const MENU_ENTRY_IMAGE_DELAY_MS = 160
const ENABLE_SCROLL_PREFETCH = false
const SEARCH_DEBOUNCE_MS = 300

// ─── Compact Filter Bar ─────────────────────────────────────────────────────

type CatalogChipData = { slug: string; name: string }

const MenuFilterBar = memo(function MenuFilterBar({
  searchText,
  onSearchChange,
  onSearchClear,
  catalogs,
  selectedCatalog,
  onCatalogSelect,
  currentMinPrice,
  currentMaxPrice,
  primaryColor,
  isDark,
  onOpenPriceSheet,
  searchPlaceholder,
  allLabel,
}: {
  searchText: string
  onSearchChange: (t: string) => void
  onSearchClear: () => void
  catalogs: CatalogChipData[]
  selectedCatalog: string | undefined
  onCatalogSelect: (slug: string | undefined) => void
  currentMinPrice: number
  currentMaxPrice: number
  primaryColor: string
  isDark: boolean
  onOpenPriceSheet: () => void
  searchPlaceholder: string
  allLabel: string
}) {
  const chipBg = isDark ? '#1f2937' : '#f3f4f6'
  const chipColor = isDark ? '#d1d5db' : '#4b5563'
  const hasPriceFilter =
    currentMinPrice > 0 || currentMaxPrice < 300_000

  return (
    <View style={filterStyles.container}>
      {/* Row 1 — search + filter icon */}
      <View style={filterStyles.searchRow}>
        <View style={filterStyles.searchWrap}>
          <View style={filterStyles.searchIconWrap}>
            <Search size={15} color={isDark ? '#9ca3af' : '#6b7280'} />
          </View>
          <TextInput
            value={searchText}
            onChangeText={onSearchChange}
            placeholder={searchPlaceholder}
            placeholderTextColor={isDark ? '#6b7280' : '#9ca3af'}
            style={[
              filterStyles.searchInput,
              {
                backgroundColor: isDark ? '#1f2937' : '#f3f4f6',
                color: isDark ? '#f9fafb' : '#111827',
                paddingRight: searchText ? 36 : 12,
              },
            ]}
            returnKeyType="search"
            autoCorrect={false}
          />
          {searchText.length > 0 && (
            <Pressable
              onPress={onSearchClear}
              style={filterStyles.clearBtn}
              hitSlop={8}
            >
              <X size={15} color={isDark ? '#9ca3af' : '#6b7280'} />
            </Pressable>
          )}
        </View>

        {/* Price filter trigger */}
        <Pressable
          onPress={onOpenPriceSheet}
          style={[
            filterStyles.filterBtn,
            { backgroundColor: isDark ? '#1f2937' : '#f3f4f6' },
            hasPriceFilter && { borderColor: primaryColor, borderWidth: 1.5 },
          ]}
        >
          <SlidersHorizontal
            size={16}
            color={hasPriceFilter ? primaryColor : isDark ? '#9ca3af' : '#6b7280'}
          />
          {hasPriceFilter && (
            <View style={[filterStyles.activeDot, { backgroundColor: primaryColor }]} />
          )}
        </Pressable>
      </View>

      {/* Row 2 — catalog chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={filterStyles.chipScroll}
        keyboardShouldPersistTaps="always"
      >
        <Pressable
          onPress={() => onCatalogSelect(undefined)}
          style={[
            filterStyles.chip,
            !selectedCatalog
              ? { backgroundColor: primaryColor }
              : { backgroundColor: chipBg },
          ]}
        >
          <Text
            style={[
              filterStyles.chipText,
              !selectedCatalog
                ? filterStyles.chipTextActive
                : { color: chipColor },
            ]}
          >
            {allLabel}
          </Text>
        </Pressable>
        {catalogs.map((c) => {
          const sel = selectedCatalog === c.slug
          return (
            <Pressable
              key={c.slug}
              onPress={() => onCatalogSelect(c.slug)}
              style={[
                filterStyles.chip,
                sel
                  ? { backgroundColor: primaryColor }
                  : { backgroundColor: chipBg },
              ]}
            >
              <Text
                style={[
                  filterStyles.chipText,
                  sel ? filterStyles.chipTextActive : { color: chipColor },
                ]}
                numberOfLines={1}
              >
                {c.name.charAt(0).toUpperCase() + c.name.slice(1)}
              </Text>
            </Pressable>
          )
        })}
      </ScrollView>
    </View>
  )
})

const filterStyles = StyleSheet.create({
  container: {
    gap: 6,
    paddingBottom: 4,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 8,
    gap: 8,
  },
  searchWrap: {
    flex: 1,
  },
  searchIconWrap: {
    position: 'absolute',
    left: 12,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
    zIndex: 1,
  },
  searchInput: {
    height: 38,
    borderRadius: 10,
    paddingLeft: 36,
    fontSize: 14,
  },
  clearBtn: {
    position: 'absolute',
    right: 12,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
    zIndex: 1,
  },
  filterBtn: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeDot: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  chipScroll: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    gap: 6,
    alignItems: 'center',
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 999,
  },
  chipText: {
    fontSize: 13,
  },
  chipTextActive: {
    color: '#ffffff',
    fontWeight: '600',
  },
})

const MenuItemRow = memo(
  function MenuItemRow({
    id,
    name,
    imageUrl,
    listIndex,
    rawPrice,
    promotionValue,
    showImage,
    primaryColor,
    onDetail,
    onAddToCart,
  }: {
    id: string
    name: string
    imageUrl: string | null
    listIndex: number
    rawPrice: number
    promotionValue: number
    showImage: boolean
    primaryColor: string
    onDetail: (id: string) => void
    onAddToCart: (id: string) => void
  }) {
    const imagePriority =
      showImage && listIndex < MENU_IMAGE_HIGH_PRIORITY_COUNT ? 'high' : 'normal'
    const hasPromotion = promotionValue > 0 && rawPrice > 0
    const discountedPrice = hasPromotion
      ? rawPrice * (1 - promotionValue / 100)
      : rawPrice

    const handlePress = useCallback(() => onDetail(id), [id, onDetail])
    const handleAdd = useCallback(() => onAddToCart(id), [id, onAddToCart])

    return (
      <Pressable onPress={handlePress} style={styles.wrapper}>
        <View style={styles.card}>
          <View style={styles.imageWrap}>
            <MenuItemImage
              id={id}
              imageUrl={imageUrl}
              isEnabled={showImage}
              transitionMs={0}
              priority={imagePriority}
            />
          </View>
          <View style={styles.content}>
            <View>
              <Text style={styles.productName} numberOfLines={1}>
                {capitalizeFirst(name)}
              </Text>
              {hasPromotion ? (
                <View style={styles.priceRow}>
                  <Text style={styles.priceDiscounted}>
                    {formatCurrencyNative(discountedPrice)}
                  </Text>
                  <View style={styles.pricePromotionBadge}>
                    <Text style={styles.pricePromotionText}>
                      -{promotionValue}%
                    </Text>
                  </View>
                  <Text style={styles.priceOriginal}>
                    {formatCurrencyNative(rawPrice)}
                  </Text>
                </View>
              ) : (
                <Text style={[styles.priceRegular, { color: primaryColor }]}>
                  {formatCurrencyNative(rawPrice)}
                </Text>
              )}
            </View>
            <View style={styles.addButtonWrap}>
              <Pressable
                onPress={handleAdd}
                style={[styles.addButton, { backgroundColor: primaryColor }]}
              >
                <Plus size={20} color="#ffffff" />
              </Pressable>
            </View>
          </View>
        </View>
      </Pressable>
    )
  },
  (prev, next) =>
    prev.id === next.id &&
    prev.name === next.name &&
    prev.imageUrl === next.imageUrl &&
    prev.listIndex === next.listIndex &&
    prev.rawPrice === next.rawPrice &&
    prev.promotionValue === next.promotionValue &&
    prev.showImage === next.showImage &&
    prev.primaryColor === next.primaryColor &&
    prev.onDetail === next.onDetail &&
    prev.onAddToCart === next.onAddToCart,
)

export default function MenuPage() {
  const router = useRouter()
  const isDark = useColorScheme() === 'dark'
  const primaryColor = usePrimaryColor()
  const { t } = useTranslation('menu')
  const { userSlug, isAuthenticated, menuFilter, branchSlug } =
    useMenuScreenState()
  const setMenuFilter = useSetMenuFilter()
  const [allowFetch, setAllowFetch] = useState(false)
  const [imagePhaseReady, setImagePhaseReady] = useState(false)

  // ── Order flow store bridge (read via getState to avoid re-render deps) ──

  // ── Search: local input + debounced filter keyword ──
  const [searchText, setSearchText] = useState('')
  const [searchKeyword, setSearchKeyword] = useState('')
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const handleSearchChange = useCallback((text: string) => {
    setSearchText(text)
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current)
    searchTimerRef.current = setTimeout(() => {
      setSearchKeyword(text.trim().toLowerCase())
    }, SEARCH_DEBOUNCE_MS)
  }, [])

  const handleSearchClear = useCallback(() => {
    setSearchText('')
    setSearchKeyword('')
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current)
  }, [])

  useEffect(() => () => {
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current)
  }, [])

  // Stable ref map — handlers read from here instead of closing over itemsRaw.
  const itemsMapRef = React.useRef<Map<string, MenuDisplayItem>>(new Map())
  const shouldClearMemoryCacheOnBlurRef = React.useRef(false)
  const hasUserStartedScrollRef = React.useRef(false)
  const hasLoadedImagesOnceRef = React.useRef(false)
  const prefetchedImageUrlsRef = React.useRef<Record<string, true>>({})
  const prefetchTimeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(
    null,
  )

  useFocusEffect(
    useCallback(() => {
      setAllowFetch(false)
      const isFirstLoad = !hasLoadedImagesOnceRef.current
      if (isFirstLoad) setImagePhaseReady(false)

      let timer: ReturnType<typeof setTimeout> | null = null
      const task = InteractionManager.runAfterInteractions(() => {
        // Single timeout: batch fetch + image enable to reduce re-renders
        timer = setTimeout(() => {
          setAllowFetch(true)
          if (isFirstLoad) {
            setImagePhaseReady(true)
            hasLoadedImagesOnceRef.current = true
          }
        }, isFirstLoad ? MENU_ENTRY_IMAGE_DELAY_MS : MENU_ENTRY_FETCH_DELAY_MS)
      })

      return () => {
        task.cancel()
        if (timer) clearTimeout(timer)
        setAllowFetch(false)
      }
    }, []),
  )

  useEffect(() => {
    const subscription = AppState.addEventListener('memoryWarning', () => {
      shouldClearMemoryCacheOnBlurRef.current = true
    })
    return () => {
      subscription.remove()
    }
  }, [])

  useFocusEffect(
    useCallback(() => {
      return () => {
        if (!shouldClearMemoryCacheOnBlurRef.current) return
        shouldClearMemoryCacheOnBlurRef.current = false
        queueMicrotask(() => Image.clearMemoryCache())
        hasUserStartedScrollRef.current = false
      }
    }, []),
  )

  const hasUser = isAuthenticated && !!userSlug
  const hasBranch = !!menuFilter.branch || !!branchSlug

  // ── Catalog chips ──
  const { data: catalogRes } = useCatalog({ enabled: allowFetch && hasBranch })
  const catalogList = useMemo<CatalogChipData[]>(
    () =>
      catalogRes?.result?.map((c) => ({ slug: c.slug, name: c.name })) ?? [],
    [catalogRes],
  )
  const handleCatalogSelect = useCallback(
    (slug: string | undefined) => {
      setMenuFilter((prev) => ({ ...prev, catalog: slug }))
    },
    [setMenuFilter],
  )

  const [priceSheetVisible, setPriceSheetVisible] = useState(false)
  const handleOpenPriceSheet = useCallback(() => setPriceSheetVisible(true), [])
  const handleClosePriceSheet = useCallback(() => setPriceSheetVisible(false), [])
  const handlePriceSelect = useCallback(
    (min: number, max: number) => {
      setMenuFilter((prev) => ({
        ...prev,
        minPrice: min,
        maxPrice: max,
      }))
    },
    [setMenuFilter],
  )

  const menuDate = menuFilter.date
  const menuBranch = menuFilter.branch
  const menuCatalog = menuFilter.catalog
  const menuProductName = menuFilter.productName
  const menuMinPrice = menuFilter.minPrice
  const menuMaxPrice = menuFilter.maxPrice
  const menuSlug = menuFilter.menu

  const request = useMemo<ISpecificMenuRequest>(
    () => ({
      date: menuDate ?? dayjs().format('YYYY-MM-DD'),
      branch: menuBranch ?? branchSlug,
      catalog: menuCatalog,
      productName: menuProductName,
      minPrice: menuMinPrice,
      maxPrice: menuMaxPrice,
      slug: menuSlug,
    }),
    [
      menuDate,
      menuBranch,
      menuCatalog,
      menuProductName,
      menuMinPrice,
      menuMaxPrice,
      menuSlug,
      branchSlug,
    ],
  )

  const {
    data: privateData,
    isFetching: isPrivateFetching,
    refetch: refetchPrivate,
  } = useQuery({
    queryKey: ['specific-menu', request],
    queryFn: () => getSpecificMenu(request),
    enabled: hasBranch && hasUser && allowFetch,
    staleTime: 60_000,
    refetchOnMount: false,
  })
  const {
    data: publicData,
    isFetching: isPublicFetching,
    refetch: refetchPublic,
  } = useQuery({
    queryKey: ['public-specific-menu', request],
    queryFn: () => getPublicSpecificMenu(request),
    enabled: hasBranch && !hasUser && allowFetch,
    staleTime: 60_000,
    refetchOnMount: false,
  })
  const isFetching = hasUser ? isPrivateFetching : isPublicFetching
  const menuData = hasUser ? privateData : publicData

  const [isRefreshing, setIsRefreshing] = useState(false)
  const handleRefresh = useCallback(() => {
    setIsRefreshing(true)
    const refetch = hasUser ? refetchPrivate : refetchPublic
    refetch().finally(() => setIsRefreshing(false))
  }, [hasUser, refetchPrivate, refetchPublic])

  const itemsRaw = useMemo<MenuDisplayItem[]>(() => {
    const raw = menuData?.result?.menuItems ?? []
    return raw.map((item, index) => {
      const variants = item.product?.variants ?? []
      let minPrice = 0
      let cheapestVariantSlug = ''
      let cheapestVariantObj = variants.length > 0 ? variants[0] : null
      if (variants.length > 0) {
        minPrice = variants[0].price ?? 0
        cheapestVariantSlug = variants[0].slug ?? ''
        for (let i = 1; i < variants.length; i += 1) {
          const price = variants[i].price ?? 0
          if (price < minPrice) {
            minPrice = price
            cheapestVariantSlug = variants[i].slug ?? ''
            cheapestVariantObj = variants[i]
          }
        }
      }

      const heroImagePaths = [
        item.product?.image,
        ...(item.product?.images ?? []),
      ].filter((value): value is string => !!value)

      return {
        id: item.slug ?? item.product?.slug ?? `menu-item-${index}`,
        name: item.product?.name ?? 'Unnamed item',
        rawPrice: minPrice,
        promotionValue: item.promotion?.value ?? 0,
        imageUrl: getProductImageUrl(item.product?.image),
        heroImagePaths,
        listIndex: index,
        defaultVariantSlug: cheapestVariantSlug,
        menuItem: item,
        cheapestVariant: cheapestVariantObj,
        heroImageUrlsJson: JSON.stringify(
          heroImagePaths.map((p) => getProductImageUrl(p)).filter(Boolean),
        ),
      }
    })
  }, [menuData?.result?.menuItems])

  // Keep O(1) lookup map in sync with latest items
  useEffect(() => {
    const m = new Map<string, MenuDisplayItem>()
    for (const item of itemsRaw) m.set(item.id, item)
    itemsMapRef.current = m
  }, [itemsRaw])

  // Client-side filter — no API round-trip, instant UI response.
  const filteredItems = useMemo(() => {
    if (!searchKeyword) return itemsRaw
    return itemsRaw.filter((item) =>
      item.name.toLowerCase().includes(searchKeyword),
    )
  }, [itemsRaw, searchKeyword])

  const onViewableItemsChanged = useCallback(
    (info: { viewableItems: Array<{ index: number | null }> }) => {
      if (!ENABLE_SCROLL_PREFETCH) return
      if (!hasUserStartedScrollRef.current) return

      if (prefetchTimeoutRef.current) {
        clearTimeout(prefetchTimeoutRef.current)
      }

      prefetchTimeoutRef.current = setTimeout(() => {
        const visibleIndexes = info.viewableItems
          .map((entry) => entry.index)
          .filter((index): index is number => index != null && index >= 0)

        if (visibleIndexes.length === 0) {
          prefetchTimeoutRef.current = null
          return
        }

        const furthestVisibleIndex = Math.max(...visibleIndexes)
        const startIndex = furthestVisibleIndex + 1
        const endIndex = Math.min(
          itemsRaw.length - 1,
          furthestVisibleIndex + MENU_IMAGE_PREFETCH_AHEAD_COUNT,
        )

        if (startIndex > endIndex) {
          prefetchTimeoutRef.current = null
          return
        }

        const urlsToPrefetch: string[] = []
        for (let i = startIndex; i <= endIndex; i += 1) {
          const imageUrl = itemsRaw[i]?.imageUrl
          if (!imageUrl || prefetchedImageUrlsRef.current[imageUrl]) continue
          prefetchedImageUrlsRef.current[imageUrl] = true
          urlsToPrefetch.push(imageUrl)
        }

        if (urlsToPrefetch.length > 0) {
          Image.prefetch(urlsToPrefetch).catch(() => {})
        }
        prefetchTimeoutRef.current = null
      }, MENU_IMAGE_PREFETCH_DEBOUNCE_MS)
    },
    [itemsRaw],
  )

  useEffect(
    () => () => {
      if (prefetchTimeoutRef.current) {
        clearTimeout(prefetchTimeoutRef.current)
      }
    },
    [],
  )

  // Stable handlers: read from ref, no itemsRaw dep → renderItem reference
  // never changes on background refetch → FlashList skips full re-render.
  const handleOpenDetail = useCallback(
    (itemId: string) => {
      const selectedItem = itemsMapRef.current.get(itemId)
      if (!selectedItem) return

      router.push({
        pathname: '/(tabs)/menu/product/[id]',
        params: {
          id: selectedItem.id,
          name: selectedItem.name,
          basePrice: String(selectedItem.rawPrice),
          promotionValue: String(selectedItem.promotionValue),
          imageUrl: selectedItem.imageUrl ?? '',
          imageUrls: selectedItem.heroImageUrlsJson,
        },
      })
    },
    [router],
  )

  const handleAddToCart = useCallback(
    (itemId: string) => {
      const displayItem = itemsMapRef.current.get(itemId)
      if (!displayItem) return

      // Read store state at call time — no hook deps, no re-render cascade
      const store = useOrderFlowStore.getState()
      if (!store.isHydrated) return
      if (store.currentStep !== OrderFlowStep.ORDERING) {
        store.setCurrentStep(OrderFlowStep.ORDERING)
      }
      if (!store.orderingData) {
        store.initializeOrdering()
      }
      const userSlug = useUserStore.getState().userInfo?.slug
      if (userSlug && !store.orderingData?.owner?.trim()) {
        store.initializeOrdering()
      }

      const mi = displayItem.menuItem
      const variants = mi.product?.variants ?? []
      const cheapestVariant = displayItem.cheapestVariant

      if (!cheapestVariant) return

      const orderItem: IOrderItem = {
        id: `item_${dayjs().valueOf()}_${Math.random().toString(36).substring(2, 11)}`,
        slug: mi.product?.slug || '',
        image: mi.product?.image || '',
        name: mi.product?.name || '',
        quantity: 1,
        size: cheapestVariant.size?.name || '',
        allVariants: variants,
        variant: cheapestVariant,
        originalPrice: cheapestVariant.price,
        productSlug: mi.product?.slug || '',
        description: mi.product?.description || '',
        isLimit: mi.product?.isLimit || false,
        isGift: mi.product?.isGift || false,
        promotion: mi.promotion ? mi.promotion : null,
        promotionValue: mi.promotion ? mi.promotion.value : 0,
        note: '',
      }

      store.addOrderingItem(orderItem)
      showToast(t('menu.addedToCart', { name: displayItem.name }))
    },
    [t],
  )

  const showImage = imagePhaseReady

  const renderItem = useCallback(
    ({ item }: { item: MenuDisplayItem }) => (
      <MenuItemRow
        id={item.id}
        name={item.name}
        imageUrl={item.imageUrl}
        listIndex={item.listIndex}
        rawPrice={item.rawPrice}
        promotionValue={item.promotionValue}
        showImage={showImage}
        primaryColor={primaryColor}
        onDetail={handleOpenDetail}
        onAddToCart={handleAddToCart}
      />
    ),
    [handleOpenDetail, handleAddToCart, showImage, primaryColor],
  )

  const pageBg = isDark ? colors.background.dark : colors.background.light

  return (
    <View style={[styles.screen, { backgroundColor: pageBg }]}>
      {/* Header + filter — static, solid bg */}
      <View style={[styles.header, { backgroundColor: isDark ? colors.gray[900] : '#ffffff', paddingTop: STATIC_TOP_INSET + 12 }]}>
        <View style={styles.headerRow}>
          <RNImage
            source={Images.Brand.Logo as unknown as number}
            style={styles.logo}
            resizeMode="contain"
          />
          <View style={styles.headerRight}>
            <NotificationBell color={isDark ? '#9ca3af' : '#6b7280'} />
            <SelectBranchDropdown />
          </View>
        </View>
        {hasBranch && (
          <MenuFilterBar
            searchText={searchText}
            onSearchChange={handleSearchChange}
            onSearchClear={handleSearchClear}
            catalogs={catalogList}
            selectedCatalog={menuCatalog}
            onCatalogSelect={handleCatalogSelect}
            currentMinPrice={menuMinPrice ?? 0}
            currentMaxPrice={menuMaxPrice ?? 300_000}
            primaryColor={primaryColor}
            isDark={isDark}
            onOpenPriceSheet={handleOpenPriceSheet}
            searchPlaceholder={t('menu.searchProduct')}
            allLabel={t('menu.all')}
          />
        )}
      </View>

      {!hasBranch ? (
        <View style={styles.emptyBox}>
          <Text style={styles.emptyText}>
            {t('menu.selectBranchPrompt')}
          </Text>
        </View>
      ) : (
        <FlashList
          data={filteredItems}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          drawDistance={300}
          keyboardDismissMode="on-drag"
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              tintColor={primaryColor}
              colors={[primaryColor]}
            />
          }
          onScrollBeginDrag={() => {
            hasUserStartedScrollRef.current = true
          }}
          onViewableItemsChanged={
            ENABLE_SCROLL_PREFETCH ? onViewableItemsChanged : undefined
          }
          viewabilityConfig={{
            itemVisiblePercentThreshold: 50,
            minimumViewTime: 80,
          }}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <Text style={styles.emptyText}>
                {isFetching
                  ? t('menu.loadingMenu')
                  : searchKeyword
                    ? t('menu.searchNotFound', { keyword: searchText })
                    : t('menu.noMenuData')}
              </Text>
            </View>
          }
        />
      )}

      <PerfPriceSheet
        key={priceSheetVisible ? 'open' : 'closed'}
        visible={priceSheetVisible}
        onClose={handleClosePriceSheet}
        currentMin={menuMinPrice ?? 0}
        currentMax={menuMaxPrice ?? 300_000}
        primaryColor={primaryColor}
        isDark={isDark}
        onSelect={handlePriceSelect}
        labels={{
          title: t('menu.priceRange'),
          reset: t('menu.reset'),
          from: t('menu.from'),
          to: t('menu.to'),
          quickSelect: t('menu.quickSelect'),
          apply: t('menu.apply'),
          allPrices: t('menu.allPrices'),
        }}
      />

    </View>
  )
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  header: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e5e7eb',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  headerRight: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 4,
  },
  logo: {
    height: 32,
    width: 112,
  },
  listContent: {
    paddingTop: 8,
    paddingBottom: 160,
  },
  wrapper: {
    marginBottom: 12,
    paddingHorizontal: 16,
  },
  card: {
    flexDirection: 'row',
    padding: 8,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    alignItems: 'stretch',
  },
  imageWrap: {
    width: 88,
    height: 88,
    borderRadius: 10,
    overflow: 'hidden',
  },
  content: {
    flex: 1,
    marginLeft: 12,
    justifyContent: 'space-between',
    alignSelf: 'stretch',
  },
  productName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 6,
  },
  priceDiscounted: {
    fontSize: 14,
    fontWeight: '700',
    color: '#f97316',
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
    color: '#ffffff',
  },
  priceOriginal: {
    fontSize: 12,
    color: '#9ca3af',
    textDecorationLine: 'line-through',
  },
  priceRegular: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 4,
  },
  addButtonWrap: {
    alignSelf: 'flex-end',
  },
  addButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyBox: {
    margin: 16,
    borderRadius: 12,
    backgroundColor: '#f3f4f6',
    padding: 16,
  },
  emptyText: {
    fontSize: 14,
    color: '#6b7280',
  },
})
