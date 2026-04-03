import { keepPreviousData, useMutation, useQuery } from '@tanstack/react-query'

import {
  getSystemFeatureFlagGroups,
  updateMultipleParentFeatureFlags,
  getSystemFeatureFlagsByGroup,
  updateMultipleChildFeatureFlags,
  getFeatureFlagsByGroup,
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
    queryKey: [QUERYKEY.systemFeatureFlagsByGroup, groupName],
    queryFn: () => getSystemFeatureFlagsByGroup(groupName),
    placeholderData: keepPreviousData,
    enabled,
  })
}

export const useGetFeatureFlagsByGroup = (group: string) => {
  return useQuery({
    queryKey: [QUERYKEY.giftCardFeatureFlags, group],
    queryFn: () => getFeatureFlagsByGroup(group),
    select: (data) => data.result,
    staleTime: 30_000,
    gcTime: 5 * 60_000,
  })
}
