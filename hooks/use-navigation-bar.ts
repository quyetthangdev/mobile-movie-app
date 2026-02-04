import { useEffect } from 'react'
import { Platform } from 'react-native'
import changeNavigationBarColor, { hideNavigationBar, showNavigationBar } from 'react-native-navigation-bar-color'

/**
 * Hook để quản lý Navigation Bar trên Android
 * 
 * @param backgroundColor - Màu nền của navigation bar (mặc định: #FFFFFF)
 * @param light - true = icon màu đen (cho nền sáng), false = icon màu trắng (cho nền tối)
 * @param animated - Có animate khi đổi màu không (mặc định: true)
 */
export function useNavigationBar(
  backgroundColor: string = '#FFFFFF',
  light: boolean = true,
  animated: boolean = true
) {
  useEffect(() => {
    // Chỉ áp dụng trên Android
    if (Platform.OS !== 'android') {
      return
    }

    // Đổi màu navigation bar - gọi trực tiếp
    // Implementation JavaScript không trả về Promise nhưng vẫn hoạt động
    try {
      changeNavigationBarColor(backgroundColor, light, animated)
    } catch {
      // Bỏ qua lỗi nếu API không khả dụng
    }

    // Cleanup: Không cần reset vì navigation bar sẽ tự động reset khi app đóng
  }, [backgroundColor, light, animated])
}

/**
 * Utility function để đổi màu navigation bar ngay lập tức
 * 
 * @param backgroundColor - Màu nền của navigation bar
 * @param light - true = icon màu đen, false = icon màu trắng
 * @param animated - Có animate không
 */
export const setNavigationBarColor = (
  backgroundColor: string,
  light: boolean = true,
  animated: boolean = true
): Promise<unknown> => {
  if (Platform.OS !== 'android') {
    return Promise.resolve({ success: false })
  }

  try {
    const result = changeNavigationBarColor(backgroundColor, light, animated) as unknown
    // Thư viện có thể trả về Promise (theo README) nhưng type definition không chính xác
    if (result && typeof result === 'object' && 'catch' in result) {
      return result as Promise<unknown>
    }
    return Promise.resolve({ success: true })
  } catch {
    return Promise.resolve({ success: false })
  }
}

/**
 * Utility function để ẩn/hiện navigation bar
 * 
 * @param hidden - true = ẩn, false = hiện
 */
export const setNavigationBarHidden = (hidden: boolean): boolean => {
  if (Platform.OS !== 'android') {
    return false
  }

  if (hidden) {
    return hideNavigationBar()
  } else {
    showNavigationBar()
    return true
  }
}

