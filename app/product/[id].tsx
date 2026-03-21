/**
 * Redirect /product/[id] → /(tabs)/menu/product/[id] (backward compatibility).
 * Product Detail đã chuyển vào tab Menu tại app/(tabs)/menu/product/[id].tsx.
 */
import { Redirect, useLocalSearchParams } from 'expo-router'

export default function ProductRedirect() {
  const { id } = useLocalSearchParams<{ id: string }>()
  return (
    <Redirect
      href={{ pathname: '/(tabs)/menu/product/[id]', params: { id: id ?? '' } }}
    />
  )
}
