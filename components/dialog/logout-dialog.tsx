import { Button, Dialog } from '@/components/ui'
import { colors } from '@/constants'
import { LogOut } from 'lucide-react-native'
import React from 'react'
import { useTranslation } from 'react-i18next'
import { View } from 'react-native'

interface LogoutDialogProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  onLogout: () => void
}

export default function LogoutDialog({
  isOpen,
  onOpenChange,
  onLogout,
}: LogoutDialogProps) {
  const { t } = useTranslation('auth')

  const handleConfirm = () => {
    onLogout()
    onOpenChange(false)
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <Dialog.Content className="max-w-[22rem] rounded-md sm:max-w-[32rem]">
        <Dialog.Header>
          <Dialog.Title className="text-destructive flex items-center gap-2">
            <LogOut size={20} color={colors.destructive.light} />
            {t('logout.title')}
          </Dialog.Title>
          <Dialog.Description className="mt-2 text-muted-foreground">
            {t('logout.description')}
          </Dialog.Description>
        </Dialog.Header>

        <View className="mt-6 flex flex-row justify-end gap-2">
          <Button variant="outline" onPress={() => onOpenChange(false)}>
            {t('logout.cancel')}
          </Button>
          <Button variant="destructive" onPress={handleConfirm}>
            {t('logout.logout')}
          </Button>
        </View>
      </Dialog.Content>
    </Dialog>
  )
}

