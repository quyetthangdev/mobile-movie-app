/**
 * Chọn ngày sinh bằng react-native-date-picker (dạng spinner).
 * Chỉ cập nhật state khi nhấn Confirm hoặc khi cuộn đã dừng (debounce onDateChange).
 * Màu chữ/theme khớp Dark/Light của Profile.
 */
import dayjs from 'dayjs'
import React, {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useRef,
  useState,
} from 'react'
import { useColorScheme } from 'react-native'
import DatePicker from 'react-native-date-picker'

const DEBOUNCE_MS = 500

export type BirthdayPickerRef = {
  open: () => void
  close: () => void
}

export type ProfileThemeColors = {
  text: string
  textMuted: string
  editBtn: string
}

type Props = {
  value: string // YYYY-MM-DD
  onSelect: (date: string) => void
  /** Màu theme từ trang Profile (Dark/Light). Nếu không truyền sẽ dùng useColorScheme(). */
  themeColors?: ProfileThemeColors
  confirmText?: string
  cancelText?: string
}

function parseToDate(value: string): Date {
  if (value && dayjs(value).isValid()) {
    const d = dayjs(value).toDate()
    if (!Number.isNaN(d.getTime())) return d
  }
  return dayjs().subtract(18, 'year').toDate()
}

function formatDate(date: Date): string {
  return dayjs(date).format('YYYY-MM-DD')
}

export const BirthdayPicker = forwardRef<BirthdayPickerRef, Props>(
  function BirthdayPicker(
    {
      value,
      onSelect,
      themeColors,
      confirmText = 'Xác nhận',
      cancelText = 'Huỷ',
    },
    ref,
  ) {
    const colorScheme = useColorScheme()
    const isDark = colorScheme === 'dark'
    const theme = themeColors ?? {
      text: isDark ? '#f3f4f6' : '#111827',
      textMuted: isDark ? '#9ca3af' : '#6b7280',
      editBtn: isDark ? '#3D4F66' : '#e5e7eb',
    }

    const [open, setOpen] = useState(false)
    const [tempDate, setTempDate] = useState(() => parseToDate(value))
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

    const commitDate = useCallback(
      (date: Date) => {
        onSelect(formatDate(date))
      },
      [onSelect],
    )

    const openPicker = useCallback(() => {
      setTempDate(parseToDate(value))
      setOpen(true)
    }, [value])

    const closePicker = useCallback(() => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current)
        debounceRef.current = null
      }
      setOpen(false)
    }, [])

    useImperativeHandle(ref, () => ({ open: openPicker, close: closePicker }), [
      openPicker,
      closePicker,
    ])

    const handleDateChange = useCallback(
      (date: Date) => {
        setTempDate(date)
        if (debounceRef.current) clearTimeout(debounceRef.current)
        debounceRef.current = setTimeout(() => {
          debounceRef.current = null
          commitDate(date)
        }, DEBOUNCE_MS)
      },
      [commitDate],
    )

    const handleConfirm = useCallback(() => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current)
        debounceRef.current = null
      }
      commitDate(tempDate)
      closePicker()
    }, [tempDate, commitDate, closePicker])

    const handleCancel = useCallback(() => {
      closePicker()
    }, [closePicker])

    const pickerTheme = isDark ? 'dark' : 'light'

    return (
      <DatePicker
        modal
        open={open}
        date={tempDate}
        mode="date"
        theme={pickerTheme}
        minimumDate={dayjs().subtract(120, 'year').toDate()}
        maximumDate={dayjs().toDate()}
        onDateChange={handleDateChange}
        onConfirm={handleConfirm}
        onCancel={handleCancel}
        confirmText={confirmText}
        cancelText={cancelText}
        buttonColor={theme.editBtn}
        dividerColor={theme.textMuted}
      />
    )
  },
)
