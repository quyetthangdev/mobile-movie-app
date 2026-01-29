import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

import { IThemeStore } from '@/types'
import { createSafeStorage } from '@/utils/storage'

export const useThemeStore = create<IThemeStore>()(
  persist(
    (set, get) => ({
      theme: 'light',
      setTheme: (theme: string) => set({ theme }),
      getTheme: () => get().theme
    }),
    {
      name: 'theme-storage',
      storage: createJSONStorage(() => createSafeStorage()),
    }
  )
)
