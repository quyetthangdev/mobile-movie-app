import { Search, SlidersHorizontal, X } from 'lucide-react-native'
import React, { memo } from 'react'
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'

export type CatalogChipData = { slug: string; name: string }

export const MenuFilterBar = memo(function MenuFilterBar({
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
