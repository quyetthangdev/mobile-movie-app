import { Trash2, TriangleAlert } from 'lucide-react-native'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Text, View } from 'react-native'

import { Button, Dialog, Label } from '@/components/ui'
import { useOrderFlowStore } from '@/stores'

export default function DeleteAllCartDialog() {
  const { t } = useTranslation('menu')
  const { t: tCommon } = useTranslation('common')
  const [isOpen, setIsOpen] = useState(false)
  const { clearAllData } = useOrderFlowStore()

  const handleDelete = () => {
    setIsOpen(false)
    clearAllData()
  }

  return (
    <>
      <Dialog.Trigger>
        <Button
          variant="destructive"
          onPress={() => setIsOpen(true)}
          className="h-14 rounded-md"
        >
          <View className="flex-row items-center justify-center gap-2">
            <Trash2 size={20} color="#fff" />
            <Text className="text-white">{t('order.deleteAll')}</Text>
          </View>
        </Button>
      </Dialog.Trigger>
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <Dialog.Content className="max-w-[22rem] rounded-md sm:max-w-[32rem]">
          <Dialog.Header>
            <Dialog.Title className="text-destructive flex items-center gap-2">
              <TriangleAlert size={20} color="#ef4444" />
              {t('order.deleteAll')}
            </Dialog.Title>
            <Dialog.Description
              className={`text-destructive rounded-md bg-red-100 p-2 dark:bg-transparent`}
            >
              {tCommon('common.deleteNote')}
            </Dialog.Description>
          </Dialog.Header>
          <View>
            <View className="mt-4 flex items-center gap-4">
              <Label className="text-left leading-5">
                {t('order.deleteAllWarning')}
              </Label>
            </View>
          </View>
          <Dialog.Footer className="flex flex-row justify-end gap-2">
            <Button variant="outline" onPress={() => setIsOpen(false)}>
              {tCommon('common.cancel')}
            </Button>
            <Button variant="destructive" onPress={() => handleDelete()}>
              {tCommon('common.confirmDelete')}
            </Button>
          </Dialog.Footer>
        </Dialog.Content>
      </Dialog>
    </>
  )
}
