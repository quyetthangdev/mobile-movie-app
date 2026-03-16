import { keepPreviousData, useMutation, useQuery } from '@tanstack/react-query'

import {
  getSystemFeatureFlagGroups,
  updateMultipleParentFeatureFlags,
  getSystemFeatureFlagsByGroup,
  updateMultipleChildFeatureFlags,
} from '@/api'
import { QUERYKEY } from '@/constants'

export const useBulkToggleParentFeatureFlags = () => {
  return useMutation({
    mutationFn: (updates: { slug: string; isLocked: boolean }[]) =>
      updateMultipleParentFeatureFlags(updates),
  })
}

export const useBulkToggleChildFeatureFlags = () => {
  return useMutation({
    mutationFn: (updates: { slug: string; isLocked: boolean }[]) =>
      updateMultipleChildFeatureFlags(updates),
  })
}

export const useGetSystemFeatureFlagGroups = () => {
  return useQuery({
    queryKey: [QUERYKEY.systemFeatureFlagGroups],
    queryFn: () => getSystemFeatureFlagGroups(),
  })
}

export interface UseGetSystemFeatureFlagsByGroupOptions {
  /** Khi false, không fetch — defer đến khi cần (B2). */
  enabled?: boolean
}

export const useGetSystemFeatureFlagsByGroup = (
  groupName: string,
  options?: UseGetSystemFeatureFlagsByGroupOptions,
) => {
  const enabled = options?.enabled !== false && !!groupName
  return useQuery({
    queryKey: [QUERYKEY.systemFeatureFlagsByGroup],
    queryFn: () => getSystemFeatureFlagsByGroup(groupName),
    placeholderData: keepPreviousData,
    enabled,
  })
}
