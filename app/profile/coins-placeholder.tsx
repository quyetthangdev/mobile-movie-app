import { useRouter } from 'expo-router'
import React from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'

import { ScreenContainer } from '@/components/layout'

export default function CoinsPlaceholder() {
  const router = useRouter()

  return (
    <ScreenContainer edges={['top']} className="flex-1">
      <View style={styles.header}>
        <Pressable style={styles.backHitSlop} onPress={() => router.back()}>
          <Text style={styles.backLabel}>{'‹'}</Text>
        </Pressable>
        <Text style={styles.headerTitle}>Xu của tôi</Text>
        <View style={styles.headerRightSpacer} />
      </View>

      <View style={styles.center}>
        <Text style={styles.title}>Xu của tôi</Text>
        <Text style={styles.subtitle}>
          Trang rỗng để kiểm tra transition hãm phanh.
        </Text>
      </View>
    </ScreenContainer>
  )
}

const styles = StyleSheet.create({
  header: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e5e7eb',
    backgroundColor: '#ffffff',
  },
  backHitSlop: {
    width: 40,
    height: 40,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  backLabel: {
    fontSize: 24,
    color: '#111827',
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  headerRightSpacer: {
    width: 40,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 8,
    color: '#111827',
  },
  subtitle: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
  },
})
