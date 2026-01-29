import { ChevronDown } from 'lucide-react-native'
import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Text, View, useColorScheme } from 'react-native'
import { Dropdown } from 'react-native-element-dropdown'

import { Role, SystemLockFeatureChild, SystemLockFeatureGroup, SystemLockFeatureType } from '@/constants'
import { useGetSystemFeatureFlagsByGroup } from '@/hooks'
import { useOrderFlowStore } from '@/stores'
import { OrderTypeEnum } from '@/types'

export interface OrderTypeOption {
  label: string
  value: string
}

export default function OrderTypeDropdown() {
  const { t } = useTranslation('menu')
  const { setOrderingType, getCartItems } = useOrderFlowStore()
  const { data: featuresSystemFlagsResponse } = useGetSystemFeatureFlagsByGroup(
    SystemLockFeatureGroup.ORDER,
  )

  const cartItems = getCartItems()
  const [isFocus, setIsFocus] = useState(false)
  const colorScheme = useColorScheme()
  const isDark = colorScheme === 'dark'

  // Check if user is logged in (either real user or cart owner is logged in customer)
  const isUserLoggedIn = useMemo(() => {
    // User có slug và role là CUSTOMER
    const isOwnerLoggedInAndRoleCustomer = cartItems?.ownerRole === Role.CUSTOMER && cartItems?.ownerPhoneNumber !== 'default-customer'
    // Hoặc cart owner là customer đã đăng nhập
    return isOwnerLoggedInAndRoleCustomer || isOwnerLoggedInAndRoleCustomer
  }, [cartItems?.ownerRole, cartItems?.ownerPhoneNumber])

  // Wrap featureFlags in useMemo to avoid changing dependencies
  const featureFlags = useMemo(
    () => featuresSystemFlagsResponse?.result || [],
    [featuresSystemFlagsResponse?.result]
  )

  // Lấy parent feature phù hợp với trạng thái logged in
  const relevantParentFeature = useMemo(() => {
    if (isUserLoggedIn) {
      // User đã đăng nhập → lấy CREATE_PRIVATE
      return featureFlags.find((parent) => parent.name === SystemLockFeatureType.CREATE_PRIVATE)

    } else {
      // User chưa đăng nhập → lấy CREATE_PUBLIC
      return featureFlags.find((parent) => parent.name === SystemLockFeatureType.CREATE_PUBLIC)
    }
  }, [featureFlags, isUserLoggedIn])

  // Map children với order types để check trạng thái locked (chỉ từ parent phù hợp)
  const orderTypeLockStatus = useMemo(() => {
    const status: Record<string, boolean> = {}
    const children = relevantParentFeature?.children || []

    children.forEach((child) => {
      status[child.name] = child.isLocked
    })

    return status
  }, [relevantParentFeature])

  const orderTypes = useMemo<OrderTypeOption[]>(
    () => {
      // Map OrderTypeEnum values to SystemLockFeatureChild keys
      const orderTypeToFeatureMap: Record<string, string> = {
        [OrderTypeEnum.AT_TABLE]: SystemLockFeatureChild.AT_TABLE,
        [OrderTypeEnum.TAKE_OUT]: SystemLockFeatureChild.TAKE_OUT,
        [OrderTypeEnum.DELIVERY]: SystemLockFeatureChild.DELIVERY,
      }

      const allTypes: OrderTypeOption[] = [
        {
          value: OrderTypeEnum.AT_TABLE,
          label: t('menu.dineIn'),
        },
        {
          value: OrderTypeEnum.TAKE_OUT,
          label: t('menu.takeAway'),
        },
      ]

      // Check if DELIVERY exists in relevant parent's children
      const hasDeliveryInFeature = relevantParentFeature?.children?.some(
        (child) => child.name === SystemLockFeatureChild.DELIVERY
      )
      // Only add delivery option if:
      // 1. User is logged in (isUserLoggedIn)
      // 2. DELIVERY exists in the relevant parent feature (CREATE_PRIVATE has DELIVERY, CREATE_PUBLIC doesn't)
      if (isUserLoggedIn && hasDeliveryInFeature) {
        allTypes.push({
          value: OrderTypeEnum.DELIVERY,
          label: t('menu.delivery'),
        })
      }

      // Lọc bỏ các order type bị locked (isLocked = true)
      // Map từ OrderTypeEnum value ('at-table') sang SystemLockFeatureChild key ('AT_TABLE')
      const availableTypes = allTypes.filter((type) => {
        const featureKey = orderTypeToFeatureMap[type.value]
        const isLocked = orderTypeLockStatus[featureKey] === true
        return !isLocked
      })

      return availableTypes
    },
    [t, isUserLoggedIn, orderTypeLockStatus, relevantParentFeature]
  )

  const selectedType = useMemo(() => {
    if (cartItems?.type) {
      const currentType = orderTypes.find((type) => type.value === cartItems.type)
      // Nếu type hiện tại không còn available (đã bị filter), chọn type đầu tiên
      if (!currentType) {
        return orderTypes[0]
      }
      return currentType
    }
    // Chọn type đầu tiên có sẵn
    return orderTypes[0]
  }, [cartItems, orderTypes])

  // Auto switch to available order type if current type is locked or not available
  useEffect(() => {
    const currentType = orderTypes.find((type) => type.value === cartItems?.type)

    // Nếu type hiện tại không tồn tại trong danh sách available types
    if (!currentType && orderTypes.length > 0) {
      setOrderingType(orderTypes[0].value as OrderTypeEnum)
    }
  }, [orderTypes, cartItems?.type, setOrderingType])

  const handleChange = (item: OrderTypeOption) => {
    setOrderingType(item.value as OrderTypeEnum)
    setIsFocus(false)
  }

  const renderLabel = () => {
    if (selectedType?.value || isFocus) {
      return (
        <Text
          className={`absolute left-3 top-2 z-10 px-2 text-xs ${
            isFocus ? 'text-blue-500' : 'text-gray-600 dark:text-gray-400'
          }`}
          style={{ backgroundColor: isDark ? '#111827' : '#ffffff' }}
        >
          {t('menu.selectOrderType')}
        </Text>
      )
    }
    return null
  }

  return (
    <View className="bg-white dark:bg-gray-800 p-4">
      {renderLabel()}
      <Dropdown
        style={{
          height: 50,
          borderColor: isFocus ? '#3b82f6' : isDark ? '#374151' : '#d1d5db',
          borderWidth: 0.5,
          borderRadius: 8,
          paddingHorizontal: 8,
          backgroundColor: isDark ? '#1f2937' : '#ffffff',
        }}
        placeholderStyle={{
          fontSize: 16,
          color: isDark ? '#9ca3af' : '#6b7280',
        }}
        selectedTextStyle={{
          fontSize: 16,
          color: isDark ? '#ffffff' : '#111827',
        }}
        inputSearchStyle={{
          height: 40,
          fontSize: 16,
          backgroundColor: isDark ? '#1f2937' : '#ffffff',
          color: isDark ? '#ffffff' : '#111827',
          borderRadius: 8,
        }}
        iconStyle={{
          width: 20,
          height: 20,
        }}
        data={orderTypes}
        search={false}
        maxHeight={300}
        labelField="label"
        valueField="value"
        placeholder={t('menu.selectOrderType')}
        value={selectedType?.value || null}
        onFocus={() => setIsFocus(true)}
        onBlur={() => setIsFocus(false)}
        onChange={handleChange}
        renderLeftIcon={() => (
          <View className="mr-2">
            <ChevronDown
              size={20}
              color={isFocus ? '#3b82f6' : isDark ? '#9ca3af' : '#6b7280'}
            />
          </View>
        )}
        containerStyle={{
          backgroundColor: isDark ? '#1f2937' : '#ffffff',
        }}
        itemTextStyle={{
          color: isDark ? '#ffffff' : '#111827',
        }}
        activeColor={isDark ? '#374151' : '#f3f4f6'}
      />
    </View>
  )
}
