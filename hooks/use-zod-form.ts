// hooks/useZodForm.ts
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm, type FieldValues, type UseFormProps } from 'react-hook-form'
import type { ZodType } from 'zod'

export function useZodForm<T extends FieldValues>(
  schema: ZodType<T>,
  options?: Omit<UseFormProps<T>, 'resolver'>,
) {
  return useForm<T>({
    resolver: zodResolver(schema),
    mode: 'onChange',
    ...options,
  })
}
