import { requireNativeView } from 'expo'
import * as React from 'react'

import type { NavigationTriggerViewProps } from './NavigationTrigger.types'

const NativeView: React.ComponentType<NavigationTriggerViewProps> =
  requireNativeView('NavigationTrigger')

export default function NavigationTriggerView(props: NavigationTriggerViewProps) {
  return <NativeView {...props} />
}
