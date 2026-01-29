import { NotepadText } from 'lucide-react-native'
import { useTranslation } from 'react-i18next'
import { View } from 'react-native'

import { Input } from '@/components/ui'
import { useOrderFlowStore } from '@/stores'
import { IOrderItem } from '@/types'

interface CartNoteInputProps {
  cartItem: IOrderItem
}

export default function CartNoteInput({ cartItem }: CartNoteInputProps) {
  const { t } = useTranslation('menu')
  const { addNote } = useOrderFlowStore()

  const handleNoteChange = (text: string) => {
    addNote(cartItem.id, text)
  }

  return (
    <View className="flex w-full flex-row items-center justify-center gap-2.5">
      <View className="flex flex-row flex-1 gap-2 justify-between items-center w-full">
        <NotepadText color="#6b7280" size={16} />
        <Input
          defaultValue={cartItem?.note || ''}
          className="h-7 text-[11px] xl:text-sm shadow-none dark:border-gray-700"
          placeholder={t('order.enterNote')}
          onChangeText={handleNoteChange}
        />
      </View>
    </View>
  )
}
