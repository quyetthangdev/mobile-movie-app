import { useRouter } from 'expo-router'
import {
  CreditCard,
  History,
  Settings,
  User,
  Wallet,
} from 'lucide-react-native'
import React, { useCallback } from 'react'
import { ScrollView, StyleSheet, Text, View } from 'react-native'

import { ScreenContainer } from '@/components/layout'

import { ProfileItem } from './profile-item'

const SETTINGS_ITEMS = [
  {
    label: 'Thông tin chung',
    icon: User,
    href: '/(tabs)/profile/general-info-placeholder',
  },
  {
    label: 'Điểm tích lũy',
    icon: CreditCard,
    href: '/(tabs)/profile/points-placeholder',
  },
  {
    label: 'Xu của tôi',
    icon: Wallet,
    href: '/(tabs)/profile/coins-placeholder',
  },
  {
    label: 'Lịch sử đơn hàng',
    icon: History,
    href: '/(tabs)/profile/orders-history-placeholder',
  },
  {
    label: 'Cài đặt tài khoản',
    icon: Settings,
    href: '/(tabs)/profile/account-settings-placeholder',
  },
] as const

export default function ProfilePlaceholder() {
  const router = useRouter()
  const handlePress = useCallback(
    (href: string) => {
      router.push(href as never)
    },
    [router],
  )

  return (
    <ScreenContainer edges={['top']} className="flex-1">
      <ScrollView
        className="flex-1"
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>Profile Placeholder</Text>
        <Text style={styles.subtitle}>
          Danh sách cài đặt rỗng để kiểm tra hiệu năng animation và transition.
        </Text>

        <View style={styles.list}>
          {SETTINGS_ITEMS.map((item, index) => (
            <ProfileItem
              key={item.label}
              label={item.label}
              icon={item.icon}
              onPress={() => handlePress(item.href)}
              index={index}
            />
          ))}
        </View>
      </ScrollView>
    </ScreenContainer>
  )
}

const styles = StyleSheet.create({
  content: {
    padding: 24,
    paddingBottom: 100,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 8,
    color: '#111827',
  },
  subtitle: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 24,
  },
  list: {
    overflow: 'hidden',
    borderRadius: 12,
    backgroundColor: '#ffffff',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#e5e7eb',
  },
})
