import i18n from '@/i18n'
import { useDownloadStore } from '@/stores'
import { encode as base64Encode } from 'base-64'
import { Alert, Linking, Platform } from 'react-native'
import { showToast } from './toast'
// Note: PDF files are saved directly to Downloads folder (public storage)
// Location after saving:
// - Android: /storage/emulated/0/Download/[fileName].pdf (có thể tìm thấy trong File Manager/Downloads)
// - iOS: Downloads folder (có thể truy cập từ Files app)

/**
 * Download PDF Blob and save to device
 * @param blob - PDF Blob data (can be Blob, ArrayBuffer, or Uint8Array in React Native)
 * @param fileName - File name (without extension)
 * @returns Promise<boolean> - true if successful, false otherwise
 */
export async function downloadAndSavePDF(
  blob: Blob | ArrayBuffer | Uint8Array,
  fileName: string,
): Promise<boolean> {
  try {
    // Convert to Uint8Array - handle different input types
    showToast(
      i18n.t('common.savingPDF', {
        ns: 'common',
        defaultValue: 'Đang lưu file PDF...',
      }),
    )
    let uint8Array: Uint8Array

    // Check if already Uint8Array
    if (blob instanceof Uint8Array) {
      uint8Array = blob
    }
    // Check if ArrayBuffer
    else if (blob instanceof ArrayBuffer) {
      uint8Array = new Uint8Array(blob)
    }
    // Check if Web Blob API (has arrayBuffer method)
    else if (
      blob &&
      typeof blob === 'object' &&
      'arrayBuffer' in blob &&
      typeof (blob as { arrayBuffer?: unknown }).arrayBuffer === 'function'
    ) {
      const arrayBuffer = await (
        blob as { arrayBuffer: () => Promise<ArrayBuffer> }
      ).arrayBuffer()
      uint8Array = new Uint8Array(arrayBuffer)
    }
    // Check if React Native axios response (has .data property)
    else if (blob && typeof blob === 'object' && 'data' in blob) {
      const data = (blob as { data: unknown }).data
      if (data instanceof Uint8Array) {
        uint8Array = data
      } else if (data instanceof ArrayBuffer) {
        uint8Array = new Uint8Array(data)
      } else {
        // eslint-disable-next-line no-console
        console.error('Unexpected blob data format:', typeof data, data)
        throw new Error('Unsupported blob data format')
      }
    }
    // Fallback: check if it's an ArrayBuffer-like object
    else if (blob && typeof blob === 'object' && 'byteLength' in blob) {
      // Try to convert using Uint8Array constructor
      try {
        uint8Array = new Uint8Array(blob as unknown as ArrayBufferLike)
      } catch {
        throw new Error('Cannot convert blob to Uint8Array')
      }
    }
    // Unknown format
    else {
      // eslint-disable-next-line no-console
      console.error('Unknown blob format:', typeof blob, blob)
      throw new Error('Unsupported blob format')
    }

    // Update download store for UI progress
    // Don't reset progress here - keep progress from API download
    const {
      setIsDownloading,
      setProgress,
      progress: currentProgress,
    } = useDownloadStore.getState()
    setIsDownloading(true)
    // Only set initial progress if not already set (from API download)
    if (currentProgress === 0) {
      setProgress(20) // 20% - starting to save
    }

    // Request storage permission for Android
    if (Platform.OS === 'android') {
      try {
        // Dynamic import to avoid linter warning
        const { PermissionsAndroid } = await import('react-native')
        const androidVersion = Platform.Version

        // Android 13+ (API 33+) - scoped storage, no permission needed for Downloads
        // Android 10-12 (API 29-32) - scoped storage, but may need permission
        // Android < 10 (API < 29) - needs WRITE_EXTERNAL_STORAGE

        if (androidVersion < 33) {
          const granted = await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE,
            {
              title: i18n.t('common.saveImagePermissionTitle', {
                ns: 'common',
                defaultValue: 'Quyền lưu file',
              }),
              message: i18n.t('common.saveImagePermissionMessage', {
                ns: 'common',
                defaultValue:
                  'Ứng dụng cần quyền lưu file PDF vào thư mục Downloads',
              }),
              buttonNeutral: i18n.t('common.cancel', {
                ns: 'common',
                defaultValue: 'Để sau',
              }),
              buttonNegative: i18n.t('common.cancel', {
                ns: 'common',
                defaultValue: 'Từ chối',
              }),
              buttonPositive: i18n.t('common.confirm', {
                ns: 'common',
                defaultValue: 'Đồng ý',
              }),
            },
          )

          if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
            setIsDownloading(false)
            Alert.alert(
              i18n.t('common.permissionDenied', {
                ns: 'common',
                defaultValue: 'Quyền bị từ chối',
              }),
              i18n.t('common.permissionRequired', {
                ns: 'common',
                defaultValue:
                  'Cần quyền lưu file để tải PDF. Vui lòng cấp quyền trong cài đặt.',
              }),
              [
                {
                  text: i18n.t('common.cancel', {
                    ns: 'common',
                    defaultValue: 'Hủy',
                  }),
                  style: 'cancel',
                },
                {
                  text: i18n.t('common.openSettings', {
                    ns: 'common',
                    defaultValue: 'Mở cài đặt',
                  }),
                  onPress: () => Linking.openSettings(),
                },
              ],
            )
            return false
          }
        }
      } catch (permissionError) {
        // eslint-disable-next-line no-console
        console.error('Error requesting storage permission:', permissionError)
        setIsDownloading(false)
        showToast(
          i18n.t('common.errorRequestingPermission', {
            ns: 'common',
            defaultValue: 'Lỗi khi xin quyền lưu file',
          }),
        )
        return false
      }
    }

    // Continue from current progress or set to 40% if starting fresh
    // Don't override progress from API download
    // Check if running on web - react-native-fs doesn't work on web
    if (Platform.OS === 'web') {
      setIsDownloading(false)
      showToast(
        i18n.t('common.errorSavingPDF', {
          ns: 'common',
          defaultValue: 'Lỗi khi lưu file PDF',
        }),
      )
      // eslint-disable-next-line no-console
      console.warn('PDF download is not supported on web platform')
      return false
    }

    // Dynamic import react-native-fs only on native platforms
    const RNFS = await import('react-native-fs')
      .then((m) => m.default)
      .catch(() => null)
    if (!RNFS) {
      setIsDownloading(false)
      showToast(
        i18n.t('common.errorSavingPDF', {
          ns: 'common',
          defaultValue: 'Lỗi khi lưu file PDF',
        }),
      )
      return false
    }

    const { progress: progressAfterPermission } = useDownloadStore.getState()
    setProgress(Math.max(progressAfterPermission, 40)) // 40% - permissions granted, preparing to save

    // Determine download directory path
    let downloadPath: string
    const fileNameWithExt = `${fileName}.pdf`

    if (Platform.OS === 'android') {
      // Android: Save to Downloads folder (public storage)
      downloadPath = `${RNFS.DownloadDirectoryPath}/${fileNameWithExt}`
    } else {
      // iOS: Save to Documents directory (accessible via Files app)
      downloadPath = `${RNFS.DocumentDirectoryPath}/${fileNameWithExt}`
    }

    const { progress: progressAfterPath } = useDownloadStore.getState()
    setProgress(Math.max(progressAfterPath, 60)) // 60% - path determined, writing file

    // Convert Uint8Array to base64 for RNFS.writeFile
    // RNFS.writeFile expects base64 string for binary data
    // Use efficient chunk-based conversion to avoid memory issues with large files
    const chunkSize = 8192 // Process in 8KB chunks
    let binaryString = ''

    for (let i = 0; i < uint8Array.length; i += chunkSize) {
      const chunk = uint8Array.slice(i, i + chunkSize)
      binaryString += String.fromCharCode(...chunk)
    }

    // Use base-64 library for encoding (works in React Native)
    const base64Data: string = base64Encode(binaryString)

    try {
      // Write file to Downloads folder
      // Get current progress before writing (should be from API download)
      const { progress: progressBeforeWrite } = useDownloadStore.getState()
      setProgress(Math.max(progressBeforeWrite, 80)) // 80% - starting to write
      await RNFS.writeFile(downloadPath, base64Data, 'base64')
      const { progress: progressAfterWrite } = useDownloadStore.getState()
      setProgress(Math.max(progressAfterWrite, 90)) // 90% - file written

      // Verify file exists
      const fileExists = await RNFS.exists(downloadPath)
      if (!fileExists) {
        throw new Error('File was not created successfully')
      }

      setProgress(100) // 100% - complete
      setIsDownloading(false)

      // Reset progress after a short delay to show 100%
      setTimeout(() => {
        const { reset } = useDownloadStore.getState()
        reset()
      }, 1000)

      // Show success message
      if (Platform.OS === 'android') {
        showToast(
          i18n.t('common.fileSavedToDownloads', {
            ns: 'common',
            defaultValue: 'Đã lưu PDF vào thư mục Downloads',
          }),
        )
      } else {
        showToast(
          i18n.t('common.fileSavedToFilesApp', {
            ns: 'common',
            defaultValue: 'Đã lưu PDF. Mở Files app để xem',
          }),
        )
      }

      // eslint-disable-next-line no-console
      console.log('PDF saved to:', downloadPath)

      return true
    } catch (writeError) {
      setIsDownloading(false)
      // eslint-disable-next-line no-console
      console.error('Error writing PDF file:', writeError)

      const errorMessage =
        writeError instanceof Error ? writeError.message : String(writeError)

      // Handle specific errors
      if (
        errorMessage.includes('permission') ||
        errorMessage.includes('Permission')
      ) {
        showToast(
          i18n.t('common.noPermissionToSave', {
            ns: 'common',
            defaultValue:
              'Không có quyền lưu file. Vui lòng cấp quyền trong cài đặt',
          }),
        )
        Alert.alert(
          i18n.t('common.permissionDenied', {
            ns: 'common',
            defaultValue: 'Quyền bị từ chối',
          }),
          i18n.t('common.permissionRequired', {
            ns: 'common',
            defaultValue:
              'Cần quyền lưu file để tải PDF. Vui lòng cấp quyền trong cài đặt.',
          }),
          [
            {
              text: i18n.t('common.cancel', {
                ns: 'common',
                defaultValue: 'Hủy',
              }),
              style: 'cancel',
            },
            {
              text: i18n.t('common.openSettings', {
                ns: 'common',
                defaultValue: 'Mở cài đặt',
              }),
              onPress: () => Linking.openSettings(),
            },
          ],
        )
      } else {
        showToast(
          i18n.t('common.errorSavingPDF', {
            ns: 'common',
            defaultValue: 'Lỗi khi lưu file PDF',
          }),
        )
      }

      return false
    }
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Error downloading and saving PDF:', error)
    showToast(
      i18n.t('common.errorSavingPDF', {
        ns: 'common',
        defaultValue: 'Lỗi khi lưu file PDF',
      }),
    )
    return false
  }
}
