// providers/i18n-provider.tsx
import i18n from '@/i18n'
import { useUserStore } from '@/stores'
import { PropsWithChildren, useEffect } from 'react'

const normalizeLanguage = (lang?: string) => {
  if (!lang) return null
  if (lang.startsWith('en')) return 'en'
  if (lang.startsWith('vi')) return 'vi'
  return null
}

export function I18nProvider({ children }: PropsWithChildren) {
  const language = useUserStore(state => state.userInfo?.language)

  useEffect(() => {
    const normalized = normalizeLanguage(language)
    if (normalized) {
      i18n.changeLanguage(normalized)
    }
  }, [language])

  return children
}
