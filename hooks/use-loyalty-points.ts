import { useQuery } from '@tanstack/react-query'

/** Stub: trả về tổng điểm tích lũy. Khi có API thật, thay queryFn bằng gọi API. */
export function useLoyaltyPoints(slug: string) {
  const query = useQuery({
    queryKey: ['loyaltyPoints', slug],
    queryFn: async () => {
      if (!slug) return { totalPoints: 0 }
      // TODO: replace with real API, e.g. getLoyaltyPoints(slug)
      return { totalPoints: 1250 }
    },
    enabled: !!slug,
  })
  return {
    data: query.data,
    isLoading: query.isPending,
    refetch: query.refetch,
  }
}
