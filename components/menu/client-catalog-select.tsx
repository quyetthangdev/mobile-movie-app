import React, { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useColorScheme } from 'react-native'
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
      // Styling for light/dark mode
      style={{
        backgroundColor: isDark ? '#1f2937' : '#ffffff',
        borderColor: isDark ? '#374151' : '#e5e7eb',
        borderWidth: 1,
        borderRadius: 8,
        paddingHorizontal: 12,
        minHeight: 48,
      }}
      placeholderStyle={{
        color: isDark ? '#9ca3af' : '#6b7280',
        fontSize: 16,
      }}
      selectedTextStyle={{
        color: isDark ? '#ffffff' : '#111827',
        fontSize: 16,
      }}
      itemTextStyle={{
        color: isDark ? '#ffffff' : '#111827',
        fontSize: 16,
      }}
      containerStyle={{
        backgroundColor: isDark ? '#1f2937' : '#ffffff',
        borderColor: isDark ? '#374151' : '#e5e7eb',
        borderRadius: 8,
        marginTop: 4,
      }}
      itemContainerStyle={{
        backgroundColor: isDark ? '#1f2937' : '#ffffff',
        borderBottomColor: isDark ? '#374151' : '#e5e7eb',
      }}
      activeColor={isDark ? '#374151' : '#f3f4f6'}
    />
  )
}
