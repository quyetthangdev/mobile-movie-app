import { NotepadText } from 'lucide-react-native'
import { useTranslation } from 'react-i18next'
import { View } from 'react-native'

import { Textarea } from '@/components/ui'
import { useOrderFlowStore } from '@/stores'
import { ICartItem } from '@/types'

interface OrderNoteInputProps {
  order: ICartItem | null
}

export default function OrderNoteInput({ order }: OrderNoteInputProps) {
  const { t } = useTranslation('menu')
  const { addOrderNote } = useOrderFlowStore()

  const handleNoteChange = (text: string) => {
    addOrderNote(text)
  }

  return (
    <View className="flex w-full flex-row items-start gap-2.5">
      <View className="mt-2">
        <NotepadText color="#6b7280" size={20} />
      </View>
      <View className="flex-1">
        <Textarea
          defaultValue={order?.note || ''}
          className="min-h-[60px] text-sm shadow-none dark:border-gray-700"
          placeholder={t('order.enterOrderNote')}
          onChangeText={handleNoteChange}
        />
      </View>
    </View>
  )
}
