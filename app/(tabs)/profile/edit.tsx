/**
 * Trang cập nhật thông tin cá nhân.
 * Header: Huỷ bỏ (quay về thông tin cá nhân), tiêu đề, Xác nhận (mở bottom sheet).
 * Các trường chia theo mục. DOB chọn bằng 3 cuộn ngày-tháng-năm.
 */
import { getProfile } from '@/api/profile'
import {
  ConfirmUpdateProfileBottomSheet,
  type ConfirmUpdateProfileBottomSheetRef,
  DateOfBirthWheelPicker,
  type DateOfBirthWheelPickerRef,
} from '@/components/profile'
import { Input } from '@/components/ui'
import { colors } from '@/constants/colors.constant'
import { useUserStore } from '@/stores'
import type { IUserInfo } from '@/types'
import { showToast } from '@/utils'
import dayjs from 'dayjs'
import customParseFormat from 'dayjs/plugin/customParseFormat'
import { useRouter } from 'expo-router'
import React, { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useColorScheme,
} from 'react-native'
import DatePicker from 'react-native-date-picker'
import Animated, {
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

dayjs.extend(customParseFormat)

/** Chuẩn hóa dob từ API (DD/MM/YYYY hoặc YYYY-MM-DD) sang YYYY-MM-DD */
function normalizeDob(value: string | null | undefined): string {
  if (!value || typeof value !== 'string') return ''
  const ddmmyyyy = dayjs(value, 'DD/MM/YYYY', true)
  const yyyymmdd = dayjs(value, 'YYYY-MM-DD', true)
  if (ddmmyyyy.isValid()) return ddmmyyyy.format('YYYY-MM-DD')
  if (yyyymmdd.isValid()) return yyyymmdd.format('YYYY-MM-DD')
  return ''
}

/** Ngày mặc định an toàn để tránh "Date value out of bounds" */
function getSafeDate(value: string): Date {
  const normalized = normalizeDob(value) || value
  if (normalized && dayjs(normalized).isValid()) {
    const d = dayjs(normalized).toDate()
    if (!Number.isNaN(d.getTime())) return d
  }
  return dayjs().subtract(25, 'year').toDate()
}

/** Format dob để hiển thị (chấp nhận DD/MM/YYYY hoặc YYYY-MM-DD) */
function formatDobForDisplay(value: string | null | undefined): string {
  const normalized = normalizeDob(value) || value
  if (!normalized || !dayjs(normalized).isValid()) return ''
  return dayjs(normalized).format('DD/MM/YYYY')
}

const DOB_PICKER_HEIGHT = 220
const ANIM_DURATION = 220

/** Component DOB mẫu inline — bấm để xổ/đóng, animation chạy trên UI thread */
function DobSamplePicker({
  value,
  onSelect,
  theme,
  placeholder,
}: {
  value: string
  onSelect: (date: string) => void
  theme: { bg: string; editBtn: string; text: string; textMuted: string }
  placeholder: string
}) {
  const [expanded, setExpanded] = useState(false)
  const progress = useSharedValue(0)
  const safeDate = getSafeDate(value)

  useEffect(() => {
    progress.value = withTiming(expanded ? 1 : 0, {
      duration: ANIM_DURATION,
    })
  }, [expanded, progress])

  const animatedStyle = useAnimatedStyle(() => {
    'worklet'
    return {
      height: interpolate(progress.value, [0, 1], [0, DOB_PICKER_HEIGHT]),
      opacity: interpolate(progress.value, [0, 0.5, 1], [0, 0.5, 1]),
      overflow: 'hidden' as const,
    }
  })

  return (
    <View>
      <TouchableOpacity
        style={[
          styles.dobTouchable,
          { backgroundColor: theme.bg, borderColor: theme.editBtn },
        ]}
        onPress={() => setExpanded((e) => !e)}
        activeOpacity={0.7}
      >
        <Text
          style={[
            styles.dobText,
            { color: value ? theme.text : theme.textMuted },
          ]}
        >
          {formatDobForDisplay(value) || placeholder}
        </Text>
      </TouchableOpacity>
      <Animated.View style={[styles.dobPickerWrap, animatedStyle]}>
        <View style={styles.dobPickerInner}>
          <DatePicker
            mode="date"
            date={safeDate}
            onDateChange={(d) => onSelect(dayjs(d).format('YYYY-MM-DD'))}
            maximumDate={dayjs().toDate()}
            minimumDate={dayjs().subtract(120, 'year').toDate()}
          />
        </View>
      </Animated.View>
    </View>
  )
}

const PROFILE_THEME = {
  light: {
    bg: colors.background.light,
    card: '#ffffff',
    text: colors.foreground.light,
    textMuted: colors.mutedForeground.light,
    editBtn: colors.border.light,
  },
  dark: {
    bg: '#1F2B3E',
    card: '#2B3B4C',
    text: colors.foreground.dark,
    textMuted: '#8B9BB2',
    editBtn: '#3D4F66',
  },
} as const

function ProfileEditForm({ userInfo }: { userInfo: IUserInfo }) {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const colorScheme = useColorScheme()
  const isDark = colorScheme === 'dark'
  const theme = PROFILE_THEME[isDark ? 'dark' : 'light']
  const { t } = useTranslation('profile')
  const { t: tCommon } = useTranslation('common')
  const { t: tToast } = useTranslation('toast')
  const setUserInfo = useUserStore((state) => state.setUserInfo)

  const [firstName, setFirstName] = useState(userInfo.firstName ?? '')
  const [lastName, setLastName] = useState(userInfo.lastName ?? '')
  const [address, setAddress] = useState(userInfo.address ?? '')
  const [dob, setDob] = useState(
    normalizeDob(userInfo.dob) || (userInfo.dob ?? ''),
  )

  const confirmSheetRef = useRef<ConfirmUpdateProfileBottomSheetRef>(null)
  const dobPickerRef = useRef<DateOfBirthWheelPickerRef>(null)

  const handleCancel = useCallback(() => {
    router.back()
  }, [router])

  const handleConfirmPress = useCallback(() => {
    confirmSheetRef.current?.open()
  }, [])

  const handleConfirmUpdate = useCallback(() => {
    setUserInfo?.({
      ...userInfo,
      firstName,
      lastName,
      address,
      dob: dob || userInfo.dob,
    })
    showToast(
      tToast('updateProfileSuccess', 'Cập nhật thông tin cá nhân thành công'),
    )
    router.back()
  }, [userInfo, firstName, lastName, address, dob, setUserInfo, router, tToast])

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      <StatusBar
        barStyle={isDark ? 'light-content' : 'dark-content'}
        backgroundColor="transparent"
        translucent
      />

      {/* Header: Huỷ bỏ | Tiêu đề | Xác nhận */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity
          style={[
            styles.headerBtn,
            styles.headerSideBtn,
            { backgroundColor: theme.editBtn },
          ]}
          onPress={handleCancel}
        >
          <Text style={[styles.cancelText, { color: theme.text }]}>
            {tCommon('cancel', 'Huỷ bỏ')}
          </Text>
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <Text
            style={[styles.headerTitle, { color: theme.text }]}
            numberOfLines={1}
          >
            {t('contactInfo.edit', 'Chỉnh sửa thông tin')}
          </Text>
        </View>

        <TouchableOpacity
          style={[
            styles.confirmBtn,
            styles.headerSideBtn,
            { backgroundColor: colors.primary[isDark ? 'dark' : 'light'] },
          ]}
          onPress={handleConfirmPress}
        >
          <Text style={styles.confirmText}>Xác nhận</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: 40 }]}
        keyboardShouldPersistTaps="handled"
      >
        {/* Mục: Thông tin cơ bản */}
        <Text style={[styles.sectionTitle, { color: theme.textMuted }]}>
          Thông tin cơ bản
        </Text>
        <View style={[styles.section, { backgroundColor: theme.card }]}>
          <View style={styles.field}>
            <Text style={[styles.label, { color: theme.textMuted }]}>
              {t('lastName', 'Họ')}
            </Text>
            <Input
              value={lastName}
              onChangeText={setLastName}
              placeholder={t('enterLastName', 'Nhập họ')}
              autoCapitalize="words"
            />
          </View>
          <View style={styles.field}>
            <Text style={[styles.label, { color: theme.textMuted }]}>
              {t('firstName', 'Tên')}
            </Text>
            <Input
              value={firstName}
              onChangeText={setFirstName}
              placeholder={t('enterFirstName', 'Nhập tên')}
              autoCapitalize="words"
            />
          </View>
          <View style={styles.field}>
            <Text style={[styles.label, { color: theme.textMuted }]}>
              {t('dob', 'Ngày sinh')}
            </Text>
            <DobSamplePicker
              value={dob}
              onSelect={setDob}
              theme={theme}
              placeholder={t('enterDob', 'Chọn ngày sinh')}
            />
          </View>
        </View>

        {/* Mục: Số điện thoại & Email (chỉ đọc) */}
        <Text style={[styles.sectionTitle, { color: theme.textMuted }]}>
          {t('contactInfo.title', 'Thông tin liên hệ')}
        </Text>
        <View style={[styles.section, { backgroundColor: theme.card }]}>
          <View style={styles.field}>
            <Text style={[styles.label, { color: theme.textMuted }]}>
              {t('contactInfo.phone', 'Số điện thoại')}
            </Text>
            <Input
              value={userInfo.phonenumber ?? ''}
              editable={false}
              className="bg-gray-100 opacity-90 dark:bg-gray-700"
            />
          </View>
          <View style={styles.field}>
            <Text style={[styles.label, { color: theme.textMuted }]}>
              {t('contactInfo.email', 'Email')}
            </Text>
            <Input
              value={userInfo.email ?? ''}
              editable={false}
              className="bg-gray-100 opacity-90 dark:bg-gray-700"
            />
          </View>
        </View>

        {/* Mục: Địa chỉ */}
        <Text style={[styles.sectionTitle, { color: theme.textMuted }]}>
          {t('addressInfo', 'Thông tin địa chỉ')}
        </Text>
        <View style={[styles.section, { backgroundColor: theme.card }]}>
          <View style={styles.field}>
            <Text style={[styles.label, { color: theme.textMuted }]}>
              {t('contactInfo.address', 'Địa chỉ')}
            </Text>
            <Input
              value={address}
              onChangeText={setAddress}
              placeholder={t('enterAddress', 'Nhập địa chỉ')}
            />
          </View>
        </View>
      </ScrollView>

      <DateOfBirthWheelPicker
        ref={dobPickerRef}
        value={dob}
        onSelect={setDob}
      />

      <ConfirmUpdateProfileBottomSheet
        ref={confirmSheetRef}
        onConfirm={handleConfirmUpdate}
      />
    </View>
  )
}

export default function ProfileEditScreen() {
  const router = useRouter()
  const userInfo = useUserStore((state) => state.userInfo)
  const setUserInfo = useUserStore((state) => state.setUserInfo)
  const [dataVersion, setDataVersion] = useState(0)

  useEffect(() => {
    if (!userInfo) {
      router.replace('/(tabs)/profile/general-info-placeholder' as never)
      return
    }
    // Lấy dữ liệu mới nhất từ tài khoản để điền mặc định
    getProfile()
      .then((res) => {
        if (res?.result) {
          const profile = {
            ...res.result,
            dob: normalizeDob(res.result.dob) || res.result.dob,
            address: res.result.address ?? '',
          }
          setUserInfo(profile)
          setDataVersion((v) => v + 1)
        }
      })
      .catch(() => {})
    // Chỉ fetch khi slug đổi (đổi user); không thêm userInfo để tránh loop khi setUserInfo
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userInfo?.slug, router, setUserInfo])

  if (!userInfo) {
    return null
  }

  return (
    <ProfileEditForm
      key={`${userInfo.slug}-${dataVersion}`}
      userInfo={userInfo}
    />
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    minHeight: 56,
  },
  headerBtn: {
    paddingVertical: 8,
    borderRadius: 20,
  },
  headerSideBtn: {
    minWidth: 72,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelText: {
    fontSize: 12,
    fontWeight: '500',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '500',
  },
  confirmBtn: {
    paddingVertical: 8,
    borderRadius: 20,
  },
  confirmText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#ffffff',
  },
  scrollView: { flex: 1 },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  section: {
    borderRadius: 18,
    padding: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    marginTop: 4,
  },
  field: {
    marginBottom: 16,
  },
  label: {
    fontSize: 12,
    marginBottom: 6,
  },
  dobTouchable: {
    height: 40,
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 12,
    justifyContent: 'center',
  },
  dobPickerWrap: {
    marginTop: 8,
    alignItems: 'center',
  },
  dobPickerInner: {
    height: DOB_PICKER_HEIGHT,
    alignItems: 'center',
  },
  dobText: {
    fontSize: 16,
  },
})
