import { TriangleAlert } from 'lucide-react-native'
import React, { useCallback, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Text, useColorScheme, View } from 'react-native'

import { Button, Dialog } from '@/components/ui'
import { colors } from '@/constants'

import { useDeleteOrder } from '@/hooks'
import { IOrder } from '@/types'
import { showToast } from '@/utils'
import { useQueryClient } from '@tanstack/react-query'

import { ConfirmationDialog } from './confirmation-dialog'

function CancelOrderDialogComponent({
  order,
}: {
  order: IOrder
}) {
  const { t: tToast } = useTranslation('toast')
  const { t } = useTranslation(['menu'])
  const { t: tCommon } = useTranslation('common')
  const [isOpen, setIsOpen] = useState(false)
  const { mutate: deleteOrder } = useDeleteOrder()
  const queryClient = useQueryClient()
  const isDark = useColorScheme() === 'dark'
  const mutedForegroundColor = isDark ? colors.mutedForeground.dark : colors.mutedForeground.light
  
  const handleSubmit = useCallback((orderSlug: string) => {
    deleteOrder(orderSlug, {
      onSuccess: () => {
        setTimeout(() => {
          queryClient.invalidateQueries({ queryKey: ['orders'] })
          showToast(tToast('toast.handleCancelOrderSuccess'))
          setIsOpen(false)
        }, 500)
      },
    })
  }, [deleteOrder, queryClient, tToast])

  const handleOpen = useCallback(() => {
    setIsOpen(true)
  }, [])

  const handleConfirm = useCallback(() => {
    if (order?.slug) {
      handleSubmit(order.slug)
    }
  }, [order, handleSubmit])

  return (
    <>
      <Dialog.Trigger>
        <Button
          variant="outline"
          className="gap-1 px-2 text-sm rounded-md text-muted-foreground"
          onPress={handleOpen}
        >
          <Text style={{ color: mutedForegroundColor }}>
            {t('order.cancelOrder')}
          </Text>
        </Button>
      </Dialog.Trigger>

      <ConfirmationDialog
        isOpen={isOpen}
        onOpenChange={setIsOpen}
        title={t('order.cancelOrder')}
        description={tCommon('common.deleteNote')}
        confirmLabel={tCommon('common.confirmCancel')}
        cancelLabel={tCommon('common.cancel')}
        onConfirm={handleConfirm}
        variant="destructive"
        icon={<TriangleAlert size={24} color="#ef4444" />}
        alignButtons="center"
        titleClassName="pb-4 border-b border-red-500 flex-row items-center gap-2"
        descriptionClassName="p-2 bg-red-100 dark:bg-red-900/30 rounded-md"
        content={
          <View className="py-4">
            <Text className="text-sm text-gray-600 dark:text-gray-400">
              {t('order.cancelOrderWarning')}
            </Text>
          </View>
        }
      />
    </>
  )
}

// Memoize component để tránh re-render không cần thiết trong FlatList
export default React.memo(CancelOrderDialogComponent)
