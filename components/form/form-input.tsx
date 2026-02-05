import { Controller, type Control, type FieldValues, type Path } from 'react-hook-form'
import { Text, View } from 'react-native'

import { Input } from '@/components/ui'

interface FormInputProps<T extends FieldValues> {
  control: Control<T>
  name: Path<T>
  label?: string
  placeholder?: string
  keyboardType?: 'default' | 'email-address' | 'number-pad'
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters'
}

export function FormInput<T extends FieldValues>({
  control,
  name,
  label,
  placeholder,
  keyboardType = 'default',
  autoCapitalize = 'none',
}: FormInputProps<T>) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field: { value, onChange }, fieldState: { error } }) => (
        <View className="mb-4">
          {label && (
            <Text className="mb-1 text-xs text-gray-500 dark:text-gray-400">
              {label}
            </Text>
          )}

          <Input
            value={value}
            onChangeText={onChange}
            placeholder={placeholder}
            keyboardType={keyboardType}
            autoCapitalize={autoCapitalize}
          />

          {error && (
            <Text className="mt-1 text-xs text-red-500">
              {error.message}
            </Text>
          )}
        </View>
      )}
    />
  )
}
