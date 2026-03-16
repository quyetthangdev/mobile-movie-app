import { getAllBranches, getBranchInfoForDelivery } from '@/api'
import { useQuery } from '@tanstack/react-query'

/**
 * Hook to fetch all branches
 */
export const useBranch = () => {
  return useQuery({
    queryKey: ['branches'],
    queryFn: async () => getAllBranches(),
  })
}

export interface UseGetBranchInfoForDeliveryOptions {
  /** Khi false, không fetch — dùng để defer khi chưa cần (B1). */
  enabled?: boolean
}

export const useGetBranchInfoForDelivery = (
  slug: string,
  options?: UseGetBranchInfoForDeliveryOptions,
) => {
  const enabled = options?.enabled !== false && !!slug
  return useQuery({
    queryKey: ['branchInfoForDelivery', slug],
    queryFn: async () => {
      return getBranchInfoForDelivery(slug)
    },
    enabled,
  })
}

