import { IOrderItem } from '@/types'
import { useOrderFlowStore } from '@/stores'
import { QuantitySelector } from '@/components/button'

interface UpdateOrderQuantityNativeProps {
  orderItem: IOrderItem
}

export default function UpdateOrderQuantityNative({
  orderItem,
}: UpdateOrderQuantityNativeProps) {
  const { updateDraftItemQuantity } = useOrderFlowStore()

  const handleChange = (newQuantity: number) => {
    updateDraftItemQuantity(orderItem.id!, newQuantity)
  }

  return (
    <QuantitySelector
      value={orderItem.quantity}
      onChange={handleChange}
      min={1}
    />
  )
}
