/**
 * CartOrderNoteInput — Order note cho Cart List footer.
 * - Local state (uncontrolled) + debounce 300ms trước khi dispatch lên Zustand
 * - Không subscribe orderDescription → CartList không re-render khi user type
 * - Init từ store.getState() 1 lần khi mount
 */
import { useTranslation } from 'react-i18next'
import React, { useCallback, useEffect, useRef, useState } from 'react'
import { View } from 'react-native'

import { Textarea } from '@/components/ui'
import { useOrderFlowStore } from '@/stores'

const DEBOUNCE_MS = 300

export function CartOrderNoteInput() {
  const { t } = useTranslation('menu')
  const [localValue, setLocalValue] = useState(() => {
    return useOrderFlowStore.getState().orderingData?.description ?? ''
  })
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastDispatchedRef = useRef(localValue)
  const localValueRef = useRef(localValue)

  useEffect(() => {
    localValueRef.current = localValue
  }, [localValue])

  const setOrderingDescription = useOrderFlowStore(
    (s) => s.setOrderingDescription,
  )

  const flushDebounce = useCallback(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
      debounceRef.current = null
    }
    const current = localValueRef.current
    if (lastDispatchedRef.current !== current) {
      lastDispatchedRef.current = current
      setOrderingDescription(current)
    }
  }, [setOrderingDescription])

  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current)
        debounceRef.current = null
      }
      const current = localValueRef.current
      if (lastDispatchedRef.current !== current) {
        setOrderingDescription(current)
      }
    }
  }, [setOrderingDescription])

  const handleChange = useCallback(
    (text: string) => {
      setLocalValue(text)
      if (debounceRef.current) clearTimeout(debounceRef.current)
      debounceRef.current = setTimeout(() => {
        debounceRef.current = null
        lastDispatchedRef.current = text
        setOrderingDescription(text)
      }, DEBOUNCE_MS)
    },
    [setOrderingDescription],
  )

  return (
    <View className="flex w-full flex-row items-center justify-center gap-2.5">
      <View className="flex flex-row flex-1 gap-2 justify-between items-start w-full">
        <Textarea
          value={localValue}
          className="bg-white text-[11px] shadow-none xl:text-sm dark:border-muted-foreground/60 dark:bg-transparent"
          placeholder={t('order.enterOrderNote')}
          onChangeText={handleChange}
          onBlur={flushDebounce}
        />
      </View>
    </View>
  )
}
