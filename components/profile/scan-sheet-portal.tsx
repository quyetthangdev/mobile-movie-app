import BottomSheet, {
  BottomSheetBackdrop,
  type BottomSheetBackdropProps,
} from '@gorhom/bottom-sheet'
import { memo, useCallback, useMemo, useRef } from 'react'
import { Modal, StyleSheet, View, useColorScheme } from 'react-native'
import { GestureHandlerRootView } from 'react-native-gesture-handler'

import { colors } from '@/constants'
import { useScanSheetStore } from '@/stores/scan-sheet.store'

const SNAP_POINTS = ['90%']

const ScanSheetPortal = memo(function ScanSheetPortal() {
  const { visible, close } = useScanSheetStore()
  const sheetRef = useRef<BottomSheet>(null)
  const isDark = useColorScheme() === 'dark'

  const handleChange = useCallback(
    (index: number) => {
      if (index === -1) close()
    },
    [close],
  )

  const bgStyle = useMemo(
    () => ({ backgroundColor: isDark ? colors.gray[900] : colors.white.light }),
    [isDark],
  )

  const renderBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop
        {...props}
        disappearsOnIndex={-1}
        appearsOnIndex={0}
        opacity={0.4}
        pressBehavior="close"
      />
    ),
    [],
  )

  if (!visible) return null

  return (
    <Modal
      transparent
      visible
      statusBarTranslucent
      animationType="none"
      onRequestClose={() => sheetRef.current?.close()}
    >
      <GestureHandlerRootView style={s.flex}>
        <BottomSheet
          ref={sheetRef}
          index={0}
          snapPoints={SNAP_POINTS}
          enablePanDownToClose
          enableContentPanningGesture={false}
          enableHandlePanningGesture
          enableDynamicSizing={false}
          backdropComponent={renderBackdrop}
          backgroundStyle={bgStyle}
          onChange={handleChange}
        >
          <View style={s.content} />
        </BottomSheet>
      </GestureHandlerRootView>
    </Modal>
  )
})

const s = StyleSheet.create({
  flex: { flex: 1 },
  content: { flex: 1 },
})

export default ScanSheetPortal
