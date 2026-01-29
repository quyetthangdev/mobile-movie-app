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

export const useGetBranchInfoForDelivery = (slug: string) => {
  return useQuery({
    queryKey: ['branchInfoForDelivery', slug],
    queryFn: async () => {
      return getBranchInfoForDelivery(slug)
    },
  })
}

