import React, { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Text, useColorScheme, View } from 'react-native'
import { Dropdown } from 'react-native-element-dropdown'

import { useCatalog } from '@/hooks'
import { useMenuFilterStore } from '@/stores'

interface CatalogOption {
  label: string
  value: string
}

export default function ClientCatalogSelect() {
  const { t } = useTranslation('menu')
  const { menuFilter, setMenuFilter } = useMenuFilterStore()
  const { data: catalogData, isPending: isLoadingCatalog } = useCatalog()
  const colorScheme = useColorScheme()
  const isDark = colorScheme === 'dark'

  const capitalizeFirstLetter = (str: string) => (str ? str.charAt(0).toUpperCase() + str.slice(1) : '')

  // Build catalog options
  const data = useMemo<CatalogOption[]>(() => {
    const allOption: CatalogOption = { label: capitalizeFirstLetter(t('menu.all', 'Tất cả')), value: '' }
    if (catalogData?.result) {
      const catalogOptions = catalogData.result.map((item) => ({
        label: capitalizeFirstLetter(item.name || ''),
        value: item.slug || '',
      }))
      return [allOption, ...catalogOptions]
    }
    return [allOption]
  }, [catalogData, t])

  // Get selected value
  const selectedValue = menuFilter.catalog || null

  // Handle selection change
  const handleChange = (item: CatalogOption) => {
    setMenuFilter((prev) => ({ ...prev, catalog: item.value || undefined }))
  }

  return (
    <Dropdown
      data={data}
      labelField="label"
      valueField="value"
      placeholder={t('menu.selectCatalog', 'Chọn danh mục')}
      value={selectedValue}
      onChange={handleChange}
      disable={isLoadingCatalog}
      // Styling for light/dark mode - improved mobile UI
      style={{
        backgroundColor: isDark ? '#111827' : '#ffffff',
        borderColor: isDark ? '#374151' : '#e5e7eb',
        borderWidth: 1,
        borderRadius: 12,
        paddingHorizontal: 16,
        height: 50,
      }}
      placeholderStyle={{
        color: isDark ? '#9ca3af' : '#6b7280',
        fontSize: 15,
        fontWeight: '400',
      }}
      selectedTextStyle={{
        color: isDark ? '#ffffff' : '#111827',
        fontSize: 15,
        fontWeight: '500',
      }}
      itemTextStyle={{
        color: isDark ? '#ffffff' : '#111827',
        fontSize: 15,
        fontWeight: '400',
      }}
      containerStyle={{
        backgroundColor: isDark ? '#111827' : '#ffffff',
        borderColor: isDark ? '#374151' : '#e5e7eb',
        borderRadius: 12,
        marginTop: 6,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 8,
        borderWidth: 1,
        paddingVertical: 8,
        paddingHorizontal: 4,
        overflow: 'hidden',
      }}
      itemContainerStyle={{
        backgroundColor: isDark ? '#111827' : '#ffffff',
        borderBottomColor: isDark ? '#374151' : '#f3f4f6',
        borderBottomWidth: 1,
        paddingVertical: 2,
        paddingHorizontal: 2,
        minHeight: 44,
      }}
      activeColor={isDark ? '#374151' : '#f3f4f6'}
      maxHeight={300}
      search={false}
      renderItem={(item: CatalogOption, selected?: boolean, index?: number) => {
        const isSelected = selected || item.value === selectedValue
        const isFirst = index === 0
        const isLast = index === data.length - 1
        return (
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingVertical: 10,
              paddingHorizontal: 16,
              backgroundColor: isSelected
                ? isDark
                  ? '#374151'
                  : '#f3f4f6'
                : isDark
                  ? '#111827'
                  : '#ffffff',
              minHeight: 44,
              borderTopLeftRadius: isFirst ? 12 : 0,
              borderTopRightRadius: isFirst ? 12 : 0,
              borderBottomLeftRadius: isLast ? 12 : 0,
              borderBottomRightRadius: isLast ? 12 : 0,
            }}
          >
            <Text
              style={{
                color: isSelected
                  ? isDark
                    ? '#ffffff'
                    : '#111827'
                  : isDark
                    ? '#ffffff'
                    : '#111827',
                fontSize: 15,
                fontWeight: isSelected ? '600' : '400',
                flex: 1,
              }}
            >
              {item.label}
            </Text>
            {isSelected && (
              <View
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: 11,
                  backgroundColor: '#e50914',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginLeft: 12,
                }}
              >
                <Text style={{ color: '#ffffff', fontSize: 12, fontWeight: 'bold' }}>✓</Text>
              </View>
            )}
          </View>
        )
      }}
    />
  )
}
