import { useCallback } from 'react'

import { OrderNoteInput } from '@/components/input'
import { useOrderFlowStore } from '@/stores'
import { IOrderToUpdate } from '@/types'

interface OrderNoteInUpdateOrderInputProps {
  order?: IOrderToUpdate | null
}

export default function OrderNoteInUpdateOrderInput({
  order,
}: OrderNoteInUpdateOrderInputProps) {
  const { setDraftDescription } = useOrderFlowStore()

  const value = order?.description || ''

  const handleChange = useCallback(
    (text: string) => {
      setDraftDescription(text)
    },
    [setDraftDescription],
  )

  return (
    <OrderNoteInput
      value={value}
      onChange={handleChange}
    />
  )
}
