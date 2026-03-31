import dayjs from 'dayjs'
import { Eye, EyeOff } from 'lucide-react-native'
import { useCallback, useMemo, useRef, useState } from 'react'
import { useController } from 'react-hook-form'
import {
  ActivityIndicator,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'

import { FormInput } from '@/components/form/form-input'
import {
  DateOfBirthWheelPicker,
  type DateOfBirthWheelPickerRef,
} from '@/components/profile/date-of-birth-wheel-picker'
import { useRegister, useZodForm, usePostAuthActions } from '@/hooks'
import { navigateNative } from '@/lib/navigation'
import { useRegisterSchema, TRegisterSchema } from '@/schemas'

export default function RegisterForm() {
  const registerSchema = useRegisterSchema()
  const dobPickerRef = useRef<DateOfBirthWheelPickerRef>(null)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  const {
    control,
    handleSubmit,
    setValue,
    formState: { isSubmitting },
  } = useZodForm(registerSchema)

  const { mutate: registerMutation, isPending } = useRegister()
  const { handleAuthSuccess } = usePostAuthActions()

  const {
    field: { value: dobValue },
    fieldState: { error: dobError },
  } = useController({ control, name: 'dob' })

  // Form stores dob as DD/MM/YYYY (schema format)
  // Picker expects YYYY-MM-DD — convert for display
  const dobForPicker = useMemo(() => {
    if (!dobValue) return ''
    const parts = dobValue.split('/')
    if (parts.length !== 3) return ''
    const [day, month, year] = parts
    return `${year}-${month}-${day}`
  }, [dobValue])

  const handleDobSelect = useCallback(
    (date: string) => {
      // Picker returns YYYY-MM-DD, convert to DD/MM/YYYY for schema
      const d = dayjs(date)
      if (d.isValid()) {
        setValue('dob', d.format('DD/MM/YYYY'), { shouldValidate: true })
      }
    },
    [setValue],
  )

  const onSubmit = (data: TRegisterSchema) => {
    registerMutation(
      {
        firstName: data.firstName,
        lastName: data.lastName,
        dob: data.dob,
        phonenumber: data.phonenumber,
        password: data.password,
      },
      {
        onSuccess: async (response) => {
          await handleAuthSuccess(response.result.result)
        },
        onError: () => {
          // Global error handler (QueryCache) sẽ show toast
        },
      },
    )
  }

  const isLoading = isPending || isSubmitting

  return (
    <View className="flex-1 px-6 pt-8">
      <Text className="mb-2 text-3xl font-sans-bold text-foreground">
        Đăng ký
      </Text>
      <Text className="mb-8 text-base font-sans text-muted-foreground">
        Tạo tài khoản mới để trải nghiệm đầy đủ tính năng
      </Text>

      {/* Họ */}
      <FormInput
        control={control}
        name="lastName"
        label="Họ"
        placeholder="Nhập họ"
        autoCapitalize="words"
        disabled={isLoading}
        useTextInput
      />

      {/* Tên */}
      <FormInput
        control={control}
        name="firstName"
        label="Tên"
        placeholder="Nhập tên"
        autoCapitalize="words"
        disabled={isLoading}
        useTextInput
      />

      {/* Ngày sinh */}
      <View className="mb-4">
        <Text className="mb-1 text-xs text-muted-foreground">
          Ngày sinh
        </Text>
        <TouchableOpacity
          className={`rounded-lg border bg-card px-4 py-3 ${dobError ? 'border-destructive' : 'border-border'}`}
          onPress={() => dobPickerRef.current?.open()}
          disabled={isLoading}
          activeOpacity={0.7}
        >
          <Text
            className={`text-base font-sans ${dobValue ? 'text-foreground' : 'text-muted-foreground'}`}
          >
            {dobValue || 'Chọn ngày sinh'}
          </Text>
        </TouchableOpacity>
        {dobError && (
          <Text className="mt-1 text-xs text-destructive">{dobError.message}</Text>
        )}
      </View>

      {/* Số điện thoại */}
      <FormInput
        control={control}
        name="phonenumber"
        label="Số điện thoại"
        placeholder="Nhập số điện thoại"
        keyboardType="phone-pad"
        autoCapitalize="none"
        disabled={isLoading}
        useTextInput
        transformOnChange={(v) => v.replace(/\D/g, '')}
      />

      {/* Mật khẩu */}
      <View>
        <Text className="mb-1 text-xs text-muted-foreground">
          Mật khẩu
        </Text>
        <View className="mb-4">
          <FormInput
            control={control}
            name="password"
            placeholder="Nhập mật khẩu"
            secureTextEntry={!showPassword}
            autoCapitalize="none"
            disabled={isLoading}
            useTextInput
            containerClassName="mb-0"
            className="pr-12"
          />
          <TouchableOpacity
            className="absolute bottom-3 right-4 p-1"
            onPress={() => setShowPassword((v) => !v)}
            disabled={isLoading}
            hitSlop={8}
          >
            {showPassword ? (
              <EyeOff size={20} color="#9ca3af" />
            ) : (
              <Eye size={20} color="#9ca3af" />
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Xác nhận mật khẩu */}
      <View>
        <Text className="mb-1 text-xs text-muted-foreground">
          Xác nhận mật khẩu
        </Text>
        <View className="mb-8">
          <FormInput
            control={control}
            name="confirmPassword"
            placeholder="Nhập lại mật khẩu"
            secureTextEntry={!showConfirmPassword}
            autoCapitalize="none"
            disabled={isLoading}
            useTextInput
            containerClassName="mb-0"
            className="pr-12"
          />
          <TouchableOpacity
            className="absolute bottom-3 right-4 p-1"
            onPress={() => setShowConfirmPassword((v) => !v)}
            disabled={isLoading}
            hitSlop={8}
          >
            {showConfirmPassword ? (
              <EyeOff size={20} color="#9ca3af" />
            ) : (
              <Eye size={20} color="#9ca3af" />
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Submit */}
      <TouchableOpacity
        className="mb-6 items-center justify-center rounded-lg bg-primary py-4"
        onPress={handleSubmit(onSubmit)}
        disabled={isLoading}
      >
        {isLoading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text className="text-base font-sans-semibold text-primary-foreground">
            Đăng ký
          </Text>
        )}
      </TouchableOpacity>

      {/* Login link */}
      <TouchableOpacity
        className="mb-8 items-center"
        onPress={() => navigateNative.replace('/auth/login')}
        disabled={isLoading}
      >
        <Text className="text-sm font-sans text-muted-foreground">
          Đã có tài khoản?{' '}
          <Text className="font-sans-semibold text-primary">Đăng nhập</Text>
        </Text>
      </TouchableOpacity>

      {/* Date picker bottom sheet */}
      <DateOfBirthWheelPicker
        ref={dobPickerRef}
        value={dobForPicker}
        onSelect={handleDobSelect}
      />
    </View>
  )
}
