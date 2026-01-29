import { getPublicSpecificMenu, getSpecificMenu, getSpecificMenuItem } from "@/api/menu"
import { ISpecificMenuRequest } from "@/types/menu.type"
import { useQuery } from "@tanstack/react-query"

export const useSpecificMenu = (
    query: ISpecificMenuRequest,
    enabled?: boolean,
  ) => {
    return useQuery({
      queryKey: ['specific-menu', query],
      queryFn: async () => getSpecificMenu(query),
      enabled: !!enabled,
    })
  }
  export const usePublicSpecificMenu = (
    query: ISpecificMenuRequest,
    enabled?: boolean,
  ) => {
    return useQuery({
      queryKey: ['public-specific-menu', query],
      queryFn: async () => getPublicSpecificMenu(query),
      enabled: !!enabled,
    })
  }

  export const useSpecificMenuItem = (slug: string) => {
    return useQuery({
      queryKey: ['specific-menu-item', slug],
      queryFn: async () => getSpecificMenuItem(slug),
    })
  }