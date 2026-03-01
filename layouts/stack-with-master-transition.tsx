/**
 * CustomStack (Native Stack) với MasterTransitionProvider listeners.
 * screenListeners là prop của Navigator, không nằm trong screenOptions.
 */
import { CustomStack, nativeStackScreenOptions } from '@/layouts/custom-stack'
import { useMasterTransition } from '@/lib/navigation/master-transition-provider'

/**
 * Wrapper: Native Stack + Master Transition listeners.
 * Native Stack mặc định giữ màn trong memory (react-native-screens).
 */
export function StackWithMasterTransition() {
  const { screenListeners } = useMasterTransition()
  return (
    <CustomStack
      screenOptions={nativeStackScreenOptions}
      screenListeners={screenListeners}
    />
  )
}
