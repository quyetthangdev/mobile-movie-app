import { useQuery } from '@tanstack/react-query'

import { getUserIdentityCode } from '@/api/user'
import { QUERYKEY } from '@/constants'

/**
 * Lấy identity code của user hiện tại để render QR.
 * Chỉ fetch khi `enabled = true` (lazy — gọi khi sheet mở).
 * staleTime 5 phút để tránh re-fetch liên tục khi đóng/mở sheet.
 */
export function useIdentityCode(enabled: boolean) {
  const query = useQuery({
    queryKey: QUERYKEY.identityCode,
    queryFn: async () => {
      const res = await getUserIdentityCode()
      return res.result.identityCode
    },
    enabled,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    retry: 2,
  })

  return {
    identityCode: query.data ?? null,
    isLoading: query.isPending && query.fetchStatus !== 'idle',
    isError: query.isError,
    refetch: query.refetch,
  }
}
