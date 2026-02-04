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

  const handleClose = useCallback(() => {
    setIsOpen(false)
  }, [])

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

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <Dialog.Content className="max-w-[22rem] rounded-md sm:max-w-[32rem]">
          <Dialog.Header>
            <Dialog.Title className="pb-4 border-b border-red-500">
              <View className="flex-row items-center gap-2">
                <TriangleAlert size={24} color="#ef4444" />
                <Text className="text-lg font-semibold text-red-500">
                  {t('order.cancelOrder')}
                </Text>
              </View>
            </Dialog.Title>
            <Dialog.Description className="p-2 bg-red-100 dark:bg-red-900/30 rounded-md">
              <Text className="text-sm text-red-600 dark:text-red-400">
                {tCommon('common.deleteNote')}
              </Text>
            </Dialog.Description>

          </Dialog.Header>
          <View className="py-4">
            <Text className="text-sm text-gray-600 dark:text-gray-400">
              {t('order.cancelOrderWarning')}
            </Text>
          </View>
          <Dialog.Footer className="flex-row justify-center gap-2">
            <Button variant="outline" onPress={handleClose}>
              {tCommon('common.cancel')}
            </Button>
            <Button
              variant="destructive"
              onPress={() => {
                if (order?.slug) {
                  handleSubmit(order.slug)
                }
              }}
            >
              {tCommon('common.confirmCancel')}
            </Button>
          </Dialog.Footer>
        </Dialog.Content>
      </Dialog>
    </>
  )
}

// Memoize component để tránh re-render không cần thiết trong FlatList
export default React.memo(CancelOrderDialogComponent)
