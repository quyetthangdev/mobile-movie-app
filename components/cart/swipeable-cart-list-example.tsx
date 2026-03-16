import React, { memo, useCallback } from 'react'
import { FlatList, ListRenderItemInfo } from 'react-native'

import { CartItemQuantityControl, SwipeableCartItem } from '@/components/cart'
import { CartNoteInput } from '@/components/input'
import { useOrderFlowStore } from '@/stores'
import { IOrderItem } from '@/types'

interface SwipeableCartListExampleProps {
  data: IOrderItem[]
}

const CartItemRow = memo(({ item }: { item: IOrderItem }) => {
  const addItemNote = useOrderFlowStore((s) => s.addNote)
  const removeOrderingItem = useOrderFlowStore((s) => s.removeOrderingItem)

  const handleDeleteById = useCallback(
    (id?: string) => {
      if (id != null) removeOrderingItem(id)
    },
    [removeOrderingItem],
  )

  return (
    <SwipeableCartItem itemId={item.id} onDelete={handleDeleteById}>
      {/* Foreground content tối giản cho ví dụ */}
      <CartItemQuantityControl orderItem={item} />
      <CartNoteInput
        value={item.note ?? ''}
        onChange={(text) => addItemNote(item.id, text)}
      />
    </SwipeableCartItem>
  )
})

export const SwipeableCartListExample = ({
  data,
}: SwipeableCartListExampleProps) => {
  const keyExtractor = useCallback((item: IOrderItem) => item.id, [])

  const renderItem = useCallback(
    ({ item }: ListRenderItemInfo<IOrderItem>) => <CartItemRow item={item} />,
    [],
  )

  return (
    <FlatList
      data={data}
      keyExtractor={keyExtractor}
      renderItem={renderItem}
      removeClippedSubviews
      maxToRenderPerBatch={8}
      windowSize={10}
      contentContainerStyle={{ paddingVertical: 8 }}
    />
  )
}

export default SwipeableCartListExample

