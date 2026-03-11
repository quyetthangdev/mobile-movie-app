/** Placeholder — test transition hãm phanh. React.memo giảm re-render khi back. */
import React from 'react'
import { Text, View } from 'react-native'
import { ScreenContainer } from '@/components/layout'
import { useRouter } from 'expo-router'
import { ChevronLeft } from 'lucide-react-native'
import { TouchableOpacity } from 'react-native'

function ProfileHistoryPlaceholder() {
  const router = useRouter()

  return (
    <ScreenContainer edges={['top']} className="flex-1">
      <View style={{ padding: 24 }}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 24 }}
        >
          <ChevronLeft size={24} color="#374151" />
          <Text style={{ marginLeft: 4, fontSize: 16 }}>Quay lại</Text>
        </TouchableOpacity>
        <Text style={{ fontSize: 20, fontWeight: '600' }}>Lịch sử đơn hàng</Text>
        <Text style={{ marginTop: 8, color: '#6b7280' }}>Trang rỗng — test transition</Text>
      </View>
    </ScreenContainer>
  )
}

export default React.memo(ProfileHistoryPlaceholder)
