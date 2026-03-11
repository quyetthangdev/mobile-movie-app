import { FlashList, type ListRenderItem } from '@shopify/flash-list'
import { History, Settings, User, Wallet } from 'lucide-react-native'
import { useRouter } from 'expo-router'
import React, { useCallback, useMemo } from 'react'
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native'

import { LoginForm } from '@/components/auth'
import { ScreenContainer } from '@/components/layout'
import { useAuthStore, useUserStore } from '@/stores'
import { useLoyaltyPoints, useRunAfterTransition } from '@/hooks'
import {
  ProfileItem,
  type ProfileItemProps,
} from '../(tabs)/profile/profile-item'

interface ProfileSettingItem {
  key: string
  label: string
  icon: ProfileItemProps['icon']
}

const SETTINGS_ITEMS: readonly ProfileSettingItem[] = [
  {
    key: 'general-info',
    label: 'Thông tin chung',
    icon: User,
  },
  {
    key: 'points',
    label: 'Điểm tích lũy',
    icon: History,
  },
  {
    key: 'coins',
    label: 'Xu của tôi',
    icon: Wallet,
  },
  {
    key: 'orders-history',
    label: 'Lịch sử đơn hàng',
    icon: History,
  },
  {
    key: 'account-settings',
    label: 'Cài đặt tài khoản',
    icon: Settings,
  },
] as const

export default function ProfilePlaceholderScreen() {
  const router = useRouter()
  const needsUserInfo = useAuthStore((state) => state.needsUserInfo())
  const userInfo = useUserStore((state) => state.userInfo)
  const setLogout = useAuthStore((state) => state.setLogout)
  const removeUserInfo = useUserStore((state) => state.removeUserInfo)

  const [allowFetch, setAllowFetch] = React.useState(false)
  useRunAfterTransition(() => setAllowFetch(true), [])

  const initials = useMemo(() => {
    if (!userInfo) return ''
    const first = userInfo.firstName?.charAt(0) || ''
    const last = userInfo.lastName?.charAt(0) || ''
    return `${first}${last}`.toUpperCase()
  }, [userInfo])

  const { totalPoints } = useLoyaltyPoints(userInfo?.slug, allowFetch)

  const handlePress = useCallback(
    (itemKey: string) => {
      switch (itemKey) {
        case 'general-info':
          router.push('/profile/info' as never)
          break
        case 'points':
          router.push('/profile/loyalty-point' as never)
          break
        case 'coins':
          router.push('/profile/coins-placeholder' as never)
          break
        case 'orders-history':
          router.push('/profile/history' as never)
          break
        case 'account-settings':
          router.push('/profile/change-password' as never)
          break
        default:
          break
      }
    },
    [router],
  )

  const handleLogout = useCallback(() => {
    setLogout()
    removeUserInfo()
    router.replace('/(tabs)/home' as never)
  }, [router, removeUserInfo, setLogout])

  const renderItem: ListRenderItem<ProfileSettingItem> = useCallback(
    ({ item, index }) => {
      const extraLabel =
        item.key === 'points' ? ` — ${totalPoints} điểm` : undefined

      return (
        <ProfileItem
          label={extraLabel ? `${item.label}${extraLabel}` : item.label}
          icon={item.icon}
          onPress={() => handlePress(item.key)}
          index={index}
        />
      )
    },
    [handlePress, totalPoints],
  )

  if (needsUserInfo || !userInfo) {
    return (
      <ScreenContainer edges={['top']} className="flex-1">
        <LoginForm />
      </ScreenContainer>
    )
  }

  return (
    <ScreenContainer edges={['top']} className="flex-1">
      <View style={styles.container}>
        <View style={styles.header}>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarText}>{initials || 'U'}</Text>
          </View>
          <View style={styles.headerText}>
            <Text style={styles.title}>
              {userInfo.firstName} {userInfo.lastName}
            </Text>
            <Text style={styles.phone}>
              {userInfo.phonenumber || 'Chưa cập nhật số điện thoại'}
            </Text>
          </View>
        </View>

        <Text style={styles.subtitle}>
          Quản lý tài khoản, đơn hàng và ưu đãi của bạn.
        </Text>

        <View style={styles.listWrapper}>
          <FlashList
            data={SETTINGS_ITEMS}
            keyExtractor={(item) => item.key}
            renderItem={renderItem}
            showsVerticalScrollIndicator={false}
          />
        </View>

        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutText}>Đăng xuất</Text>
        </TouchableOpacity>
      </View>
    </ScreenContainer>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 24,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
  },
  subtitle: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 24,
  },
  phone: {
    marginTop: 4,
    fontSize: 14,
    color: '#6b7280',
  },
  listWrapper: {
    flex: 1,
    overflow: 'hidden',
    borderRadius: 12,
    backgroundColor: '#ffffff',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#e5e7eb',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatarCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fee2e2',
    marginRight: 12,
  },
  avatarText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#b91c1c',
  },
  headerText: {
    flex: 1,
  },
  logoutButton: {
    marginTop: 16,
    alignSelf: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: '#fee2e2',
  },
  logoutText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#b91c1c',
  },
})
