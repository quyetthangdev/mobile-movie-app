import { confirmEmailVerification, confirmPhoneNumberVerification, login, register, resendEmailVerification, resendPhoneNumberVerification, verifyEmail, verifyPhoneNumber } from "@/api"
import { ILoginRequest, IRegisterRequest, IVerifyEmailRequest } from "@/types"
import { useMutation } from "@tanstack/react-query"

export const useLogin = () => {
    return useMutation({
      mutationFn: async (data: ILoginRequest) => {
        const response = await login(data)
        return response
      },
    })
  }
  
  export const useRegister = () => {
    return useMutation({
      mutationFn: async (data: IRegisterRequest) => {
        return register(data)
      },
    })
  }

  export const useVerifyEmail = () => {
    return useMutation({
      mutationFn: async (data: IVerifyEmailRequest) => {
        return verifyEmail(data)
      },
    })
  }
  
  export const useVerifyPhoneNumber = () => {
    return useMutation({
      mutationFn: async () => {
        return verifyPhoneNumber()
      },
    })
  }
  
  export const useConfirmPhoneNumberVerification = () => {
    return useMutation({
      mutationFn: async (code: string) => {
        return confirmPhoneNumberVerification(code)
      },
    })
  }
  
  export const useResendPhoneNumberVerification = () => {
    return useMutation({
      mutationFn: async () => {
        return resendPhoneNumberVerification()
      },
    })
  }
  
  export const useConfirmEmailVerification = () => {
    return useMutation({
      mutationFn: async (code: string) => {
        return confirmEmailVerification(code)
      },
    })
  }
  
  export const useResendEmailVerification = () => {
    return useMutation({
      mutationFn: async () => {
        return resendEmailVerification()
      },
    })
  }
