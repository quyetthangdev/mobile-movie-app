import { getCatalog } from '@/api'
import { QUERYKEY } from '@/constants'
import { useQuery } from '@tanstack/react-query'

/**
 * Hook to fetch all catalogs
 */
export const useCatalog = () => {
  return useQuery({
    queryKey: [QUERYKEY.catalog],
    queryFn: async () => getCatalog(),
  })
}

