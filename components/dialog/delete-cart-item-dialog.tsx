import { Trash2, TriangleAlert } from 'lucide-react-native'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Text, View } from 'react-native'

import {
  Button,
  Dialog,
  Label,
} from '@/components/ui'
import { VOUCHER_TYPE } from '@/constants'
import { useOrderFlowStore } from '@/stores'
import { IOrderItem } from '@/types'
import { showErrorToast } from '@/utils'

interface DialogDeleteCartItemProps {
  cartItem: IOrderItem
}

export default function DeleteCartItemDialog({
  cartItem,
}: DialogDeleteCartItemProps) {
  const { t } = useTranslation('menu')
  const { t: tCommon } = useTranslation('common')
  const [isOpen, setIsOpen] = useState(false)
  const { removeOrderingItem, getCartItems, removeVoucher } = useOrderFlowStore()

  const handleDelete = (cartItemId: string) => {
    const cartItems = getCartItems()
    if (cartItems) {
      const { orderItems } = cartItems

      if (orderItems.length === 1) {
        removeVoucher()
      }
    }

    setIsOpen(false)
    removeOrderingItem(cartItemId)
  }

  // use useEffect to check if subtotal is less than minOrderValue of voucher
  useEffect(() => {
    const cartItems = getCartItems()
    if (cartItems) {
      const { orderItems, voucher } = cartItems

      // Tính tổng tiền GỐC (chỉ trừ promotion nếu có, KHÔNG trừ voucher)
      const subtotalBeforeVoucher = orderItems.reduce((acc, item) => {
        const original = item.originalPrice
        const promotionDiscount = item.promotionDiscount ?? 0
        return acc + ((original ?? 0) - promotionDiscount) * item.quantity
      }, 0)

      // Nếu không phải SAME_PRICE_PRODUCT thì mới cần check
      const shouldCheckMinOrderValue = voucher?.type !== VOUCHER_TYPE.SAME_PRICE_PRODUCT

      if (shouldCheckMinOrderValue && subtotalBeforeVoucher < (voucher?.minOrderValue || 0)) {
        removeVoucher()
        showErrorToast(1004)
        setTimeout(() => {
          setIsOpen(false)
        }, 0)
      }
    }
  }, [getCartItems, removeVoucher])

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <Button variant="outline" onPress={() => setIsOpen(true)}>
        <Trash2 size={20} color="#ef4444" />
      </Button>
      <Dialog.Content className="max-w-[22rem] rounded-md sm:max-w-[32rem]">
        <Dialog.Header>
          <Dialog.Title className="flex gap-2 items-center text-destructive">
            <TriangleAlert size={20} color="#ef4444" />
            {t('order.deleteItem')}
          </Dialog.Title>
          <Dialog.Description className={`p-2 bg-red-100 rounded-md dark:bg-transparent text-destructive`}>
            {tCommon('common.deleteNote')}
          </Dialog.Description>
        </Dialog.Header>
        <View>
          <View className="flex gap-4 items-center mt-4">
            <Label className="leading-5 text-left">
              {t('order.deleteContent')}{' '}
              <Text className="font-bold">{cartItem.name}</Text>
              {t('order.deleteContent2')}
            </Label>
          </View>
        </View>
        <Dialog.Footer className="flex flex-row gap-2 justify-end">
          <Button variant="outline" onPress={() => setIsOpen(false)}>
            {tCommon('common.cancel')}
          </Button>
          <Button
            variant="destructive"
            onPress={() => handleDelete(cartItem.id)}
          >
            {tCommon('common.confirmDelete')}
          </Button>
        </Dialog.Footer>
      </Dialog.Content>
    </Dialog>
  )
}
