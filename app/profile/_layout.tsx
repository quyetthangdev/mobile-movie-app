import { Stack } from 'expo-router'

import { stackScreenOptions } from '@/constants/navigation.config'

/**
 * Profile stack: các màn profile/info, profile/edit, profile/history, ...
 * Dùng chung stackScreenOptions → trượt từ phải 280ms, gesture back, freezeOnBlur.
 */
export default function ProfileLayout() {
  return <Stack screenOptions={stackScreenOptions} />
}
