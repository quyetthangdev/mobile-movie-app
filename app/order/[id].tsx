/**
 * Order Detail — Ngoài tab tree, push trên Root Stack.
 * Redirect đến update-order để tái sử dụng logic hiện có.
 */
import { Redirect, useLocalSearchParams } from 'expo-router'

export default function OrderDetailPage() {
  const { id } = useLocalSearchParams<{ id: string }>()
  return <Redirect href={{ pathname: '/update-order/[slug]', params: { slug: id } }} />
}
