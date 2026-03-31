import { ScrollView } from 'react-native'

import { ScreenContainer } from '@/components/layout'
import RegisterForm from '@/components/auth/register-form'

export default function RegisterScreen() {
  return (
    <ScreenContainer edges={['top']} className="flex-1">
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        <RegisterForm />
      </ScrollView>
    </ScreenContainer>
  )
}
