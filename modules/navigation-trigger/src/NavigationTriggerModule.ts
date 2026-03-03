import { NativeModule, requireNativeModule } from 'expo'

declare class NavigationTriggerModule extends NativeModule {
  // View-only module — no module-level functions
}

export default requireNativeModule<NavigationTriggerModule>('NavigationTrigger')
