/**
 * MenuFilter narrow selectors — chỉ subscribe field cần cho request.
 * Tránh re-render khi field khác (vd: productName) thay đổi nhưng branch/date không đổi.
 */
import type { ISpecificMenuRequest } from '@/types'

import { useShallow } from 'zustand/react/shallow'

import { useBranchStore } from '../branch.store'
import { useMenuFilterStore } from '../menu-filter.store'

/** Chỉ các field cần cho ISpecificMenuRequest — dùng cho SliderRelatedProducts, Menu */
export const useMenuFilterForRequest = (catalogOverride?: string) =>
  useMenuFilterStore(
    useShallow((s) => {
      const f = s.menuFilter
      return {
        date: f.date,
        branch: f.branch,
        catalog: catalogOverride ?? f.catalog,
        productName: f.productName,
        minPrice: f.minPrice,
        maxPrice: f.maxPrice,
        slug: f.menu,
      } satisfies Omit<ISpecificMenuRequest, 'branch'> & { branch?: string }
    }),
  )

/** Branch slug — hẹp hơn branch full object */
export const useBranchSlug = () => useBranchStore((s) => s.branch?.slug)
