/**
 * Product image URL — Single source of truth cho Menu và Product Detail.
 * Cùng URI → cùng cache key trong expo-image → không flicker khi navigate.
 */
import { publicFileURL } from '@/constants'

export function getProductImageUrl(imagePath: string | null | undefined): string | null {
  const raw = imagePath?.trim()
  if (!raw) return null
  if (/^https?:\/\//i.test(raw)) return raw
  const base = publicFileURL ?? ''
  if (!base) return null
  return `${base.replace(/\/$/, '')}/${raw.replace(/^\//, '')}`
}
