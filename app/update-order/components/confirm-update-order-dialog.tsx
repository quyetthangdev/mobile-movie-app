import { useQueryClient } from '@tanstack/react-query'
import { Loader2 } from 'lucide-react-native'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Text } from 'react-native'

import { Button } from '@/components/ui'
import { ConfirmationDialog } from '@/components/dialog/confirmation-dialog'
import { ROUTE } from '@/constants'
import { useUpdateOrderType } from '@/hooks'
import { navigateNative } from '@/lib/navigation'
import { useOrderFlowStore } from '@/stores'
import { showToast } from '@/utils'

interface ConfirmUpdateOrderDialogProps {
  disabled?: boolean
  orderSlug: string
  onSuccess?: () => void
}

export default function ConfirmUpdateOrderDialog({
  disabled,
  orderSlug,
  onSuccess,
}: ConfirmUpdateOrderDialogProps) {
  const { t } = useTranslation('menu')
  const { t: tCommon } = useTranslation('common')
  const { t: tToast } = useTranslation('toast')
  const [isOpen, setIsOpen] = useState(false)
  const queryClient = useQueryClient()
  const { updatingData, clearUpdatingData } = useOrderFlowStore()
  const { mutate: updateOrderType, isPending } = useUpdateOrderType()

  const draft = updatingData?.updateDraft

  const handleConfirm = () => {
    if (!draft || !orderSlug) return

    const params = {
      type: draft.type,
      table: draft.table || null,
      description: draft.description || '',
      timeLeftTakeOut: draft.timeLeftTakeOut ?? 0,
      deliveryTo: draft.deliveryTo?.placeId || draft.deliveryPlaceId || undefined,
      deliveryPhone: draft.deliveryPhone || undefined,
    }

    updateOrderType(
      { slug: orderSlug, params },
      {
        onSuccess: () => {
          showToast(tToast('toast.updateOrderSuccess'))
          clearUpdatingData()
          queryClient.invalidateQueries({ queryKey: ['order', orderSlug] })
          setIsOpen(false)
          onSuccess?.()
          navigateNative.push(
            `${ROUTE.CLIENT_PAYMENT.replace('[order]', orderSlug)}` as Parameters<
              typeof navigateNative.push
            >[0],
          )
        },
      },
    )
  }

  return (
    <>
      <Button
        disabled={disabled || isPending}
        onPress={() => setIsOpen(true)}
        className="w-full rounded-full bg-primary"
      >
        {isPending ? (
          <Loader2 size={18} color="#fff" />
        ) : (
          <Text className="font-medium text-white">
            {t('order.confirmUpdate', 'Xác nhận cập nhật')}
          </Text>
        )}
      </Button>
      <ConfirmationDialog
        isOpen={isOpen}
        onOpenChange={setIsOpen}
        title={t('order.confirmUpdateOrder', 'Xác nhận cập nhật đơn hàng')}
        description={t('order.confirmUpdateOrderDesc', 'Bạn có chắc muốn cập nhật đơn hàng?')}
        confirmLabel={tCommon('common.confirm', 'Xác nhận')}
        cancelLabel={tCommon('common.cancel', 'Hủy')}
        onConfirm={handleConfirm}
        variant="default"
      />
    </>
  )
}
