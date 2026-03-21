/**
 * Container cho BottomSheetModal khi màn nằm trong Native Stack.
 * Native Stack vẽ layer native phía trên view gốc → portal ở root bị che.
 * - iOS: FullWindowOverlay (react-native-screens) — gorhom#832.
 * - Android: RN `Modal` (transparent) — lớp window riêng, luôn trên Native Stack;
 *   chỉ `elevation` trong cùng activity thường KHÔNG thắng được surface của Screen.
 */
import React from 'react'
import { Modal, Platform, StyleSheet, View } from 'react-native'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { FullWindowOverlay } from 'react-native-screens'

/** Android: Modal + RNGH root để gesture sheet/backdrop ổn định */
const BottomSheetAndroidModalContainer = React.memo(
  function BottomSheetAndroidModalContainer({
    children,
  }: React.PropsWithChildren) {
    return (
      <Modal
        animationType="none"
        transparent
        visible
        statusBarTranslucent
        onRequestClose={() => {}}
      >
        <GestureHandlerRootView style={styles.modalRoot}>
          <View style={styles.modalInner} pointerEvents="box-none">
            {children}
          </View>
        </GestureHandlerRootView>
      </Modal>
    )
  },
)

const styles = StyleSheet.create({
  modalRoot: {
    flex: 1,
  },
  modalInner: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'transparent',
  },
})

export const BottomSheetNativeStackContainer = React.memo(
  function BottomSheetNativeStackContainer({
    children,
  }: React.PropsWithChildren) {
    if (Platform.OS === 'ios') {
      return <FullWindowOverlay>{children}</FullWindowOverlay>
    }
    return <BottomSheetAndroidModalContainer>{children}</BottomSheetAndroidModalContainer>
  },
)
