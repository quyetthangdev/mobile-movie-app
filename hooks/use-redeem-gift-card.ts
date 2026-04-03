import { useMutation, useQueryClient } from '@tanstack/react-query'

import { redeemGiftCard } from '@/api'
import { QUERYKEY } from '@/constants'
import type { IApiResponse, IUseGiftCardRequest, IUseGiftCardResponse } from '@/types'

const GIFT_CARD_ERROR_MESSAGES: Record<number, string> = {
  158001: 'Thẻ quà tặng không hợp lệ hoặc không tồn tại',
  158002: 'Thẻ quà tặng này đã được sử dụng',
  158003: 'Thẻ quà tặng đã hết hạn',
  158004: 'Thẻ quà tặng hiện không khả dụng',
  158005: 'Số dư thẻ quà tặng không đủ',
  158006: 'Tính năng thẻ quà tặng tạm thời bị khóa',
  158007: 'Thông tin người nhận không hợp lệ',
  158008: 'Số lượng người nhận vượt quá giới hạn cho phép',
}

export function getGiftCardErrorMessage(errorCode: number, fallback?: string): string {
  return GIFT_CARD_ERROR_MESSAGES[errorCode] ?? fallback ?? 'Đổi thẻ quà tặng thất bại'
}

export const useRedeemGiftCard = () => {
  const queryClient = useQueryClient()

  return useMutation<IApiResponse<IUseGiftCardResponse>, Error, IUseGiftCardRequest>({
    mutationFn: (data) => redeemGiftCard(data),
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({
        queryKey: [QUERYKEY.loyaltyPoints, 'total', { slug: variables.userSlug }],
      })
      void queryClient.invalidateQueries({ queryKey: [QUERYKEY.userGiftCards] })
    },
  })
}
