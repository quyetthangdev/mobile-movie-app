/**
 * Redirect /menu/[slug] → /product/[slug] (backward compatibility).
 * Product detail đã chuyển ra ngoài tab tree tại app/product/[id].tsx.
 */
import { Redirect, useLocalSearchParams } from 'expo-router'

export default function MenuSlugRedirect() {
  const { slug } = useLocalSearchParams<{ slug: string }>()
  return <Redirect href={{ pathname: '/product/[id]', params: { id: slug } }} />
}
