import { useLocalSearchParams } from 'expo-router'
import { Check, MapPin } from 'lucide-react-native'
import React, { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useColorScheme,
} from 'react-native'

import { colors } from '@/constants'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui'
import { useBranch } from '@/hooks'
import { usePrimaryColor } from '@/hooks/use-primary-color'
import { useBranchStore } from '@/stores'

type BranchItem = {
  slug: string
  name: string
  address: string
}

// Tách BranchRow ra memo riêng để chỉ re-render đúng item thay đổi.
// onSelect là stable callback từ parent — mỗi item tự tạo handler từ slug.
const BranchRow = React.memo(function BranchRow({
  item,
  isSelected,
  isLast,
  onSelect,
}: {
  item: BranchItem
  isSelected: boolean
  isLast: boolean
  onSelect: (slug: string) => void
}) {
  const isDark = useColorScheme() === 'dark'
  const primaryColor = usePrimaryColor()
  const pinColor = isDark ? colors.gray[400] : colors.gray[500]

  const handlePress = useCallback(
    () => onSelect(item.slug),
    [item.slug, onSelect],
  )

  const textColor = isDark ? colors.gray[50] : colors.gray[900]
  const mutedColor = isDark ? colors.gray[400] : colors.gray[500]
  const borderColor = isDark ? colors.gray[700] : colors.gray[100]
  const selectedBg = isDark ? colors.gray[700] : colors.gray[50]

  return (
    <TouchableOpacity
      onPress={handlePress}
      activeOpacity={0.7}
      style={[
        styles.branchRow,
        !isLast && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: borderColor },
        isSelected && { backgroundColor: selectedBg },
      ]}
    >
      <View style={styles.pinWrap}>
        <MapPin size={18} color={isSelected ? primaryColor : pinColor} />
      </View>
      <View style={styles.branchInfo}>
        <View style={styles.branchNameRow}>
          <Text
            style={[styles.branchName, { color: isSelected ? primaryColor : textColor }]}
            numberOfLines={1}
          >
            {item.name}
          </Text>
          {isSelected && <Check size={16} color={primaryColor} />}
        </View>
        <Text style={[styles.branchAddress, { color: mutedColor }]} numberOfLines={2}>
          {item.address}
        </Text>
      </View>
    </TouchableOpacity>
  )
})

function SelectBranchDropdown() {
  const { t } = useTranslation('branch')
  const [isOpen, setIsOpen] = useState(false)
  // Lazy fetch: chỉ bật enabled sau lần mở đầu tiên.
  // Các lần sau dùng cache của QueryClient, không re-fetch.
  const hasOpenedRef = useRef(false)
  const [fetchEnabled, setFetchEnabled] = useState(false)

  const { data: branchRes } = useBranch({ enabled: fetchEnabled })
  const branch = useBranchStore((s) => s.branch)
  const setBranch = useBranchStore((s) => s.setBranch)
  const isDark = useColorScheme() === 'dark'

  // Sync branch từ URL params (e.g. deep link vào màn hình có ?branch=xxx)
  const { branch: branchSlugParam } = useLocalSearchParams<{ branch?: string }>()
  useEffect(() => {
    if (!branchSlugParam || !branchRes?.result) return
    const found = branchRes.result.find((b) => b.slug === branchSlugParam)
    if (found) setBranch(found)
  }, [branchSlugParam, branchRes, setBranch])

  const handleOpenChange = useCallback((open: boolean) => {
    setIsOpen(open)
    if (open && !hasOpenedRef.current) {
      hasOpenedRef.current = true
      setFetchEnabled(true)
    }
  }, [])

  const handleSelect = useCallback(
    (slug: string) => {
      const found = branchRes?.result?.find((b) => b.slug === slug)
      if (found) setBranch(found)
    },
    [branchRes, setBranch],
  )

  const branches = branchRes?.result ?? []
  const lastIndex = branches.length - 1

  return (
    <DropdownMenu open={isOpen} onOpenChange={handleOpenChange}>
      <DropdownMenuTrigger asChild>
        <TouchableOpacity style={styles.trigger} activeOpacity={0.7}>
          <MapPin size={16} color={isDark ? colors.gray[400] : colors.gray[500]} />
          <Text
            style={[
              styles.triggerText,
              { color: branch?.name
                ? (isDark ? colors.gray[50] : colors.gray[900])
                : (isDark ? colors.gray[400] : colors.gray[500]) },
            ]}
            numberOfLines={1}
          >
            {branch?.name ?? t('branch.chooseBranch', 'Chọn chi nhánh')}
          </Text>
        </TouchableOpacity>
      </DropdownMenuTrigger>

      <DropdownMenuContent sideOffset={8}>
        <View style={[styles.contentHeader, { borderBottomColor: isDark ? colors.gray[700] : colors.gray[200] }]}>
          <Text style={[styles.contentHeaderText, { color: isDark ? colors.gray[50] : colors.gray[900] }]}>
            {t('branch.chooseBranch', 'Chọn chi nhánh')}
          </Text>
        </View>
        <View style={styles.branchList}>
          {branches.length > 0 ? (
            branches.map((item, index) => (
              <BranchRow
                key={item.slug}
                item={item}
                isSelected={branch?.slug === item.slug}
                isLast={index === lastIndex}
                onSelect={handleSelect}
              />
            ))
          ) : (
            <View style={styles.emptyState}>
              <Text style={[styles.emptyText, { color: isDark ? colors.gray[400] : colors.gray[500] }]}>
                {fetchEnabled
                  ? t('branch.noBranches', 'Không có chi nhánh nào')
                  : '...'}
              </Text>
            </View>
          )}
        </View>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export default React.memo(SelectBranchDropdown)

const styles = StyleSheet.create({
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    minWidth: 120,
    maxWidth: 180,
  },
  triggerText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
  },
  contentHeader: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  contentHeaderText: {
    fontSize: 14,
    fontWeight: '600',
  },
  branchList: {
    maxHeight: 400,
  },
  branchRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  pinWrap: {
    marginTop: 2,
  },
  branchInfo: {
    flex: 1,
  },
  branchNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 2,
  },
  branchName: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
  },
  branchAddress: {
    fontSize: 12,
    lineHeight: 16,
  },
  emptyState: {
    paddingHorizontal: 16,
    paddingVertical: 32,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
  },
})
