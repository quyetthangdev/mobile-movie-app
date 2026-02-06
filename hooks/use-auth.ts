import { confirmEmailVerification, confirmForgotPassword, confirmPhoneNumberVerification, initiateForgotPassword, login, register, resendEmailVerification, resendOTPForgotPassword, resendPhoneNumberVerification, verifyEmail, verifyOTPForgotPassword, verifyPhoneNumber } from "@/api"
import { IConfirmForgotPasswordRequest, IInitiateForgotPasswordRequest, ILoginRequest, IRegisterRequest, IResendOTPForgotPasswordRequest, IVerifyEmailRequest, IVerifyOTPForgotPasswordRequest } from "@/types"
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

  export const useInitiateForgotPassword = () => {
    return useMutation({
      mutationFn: async (params: IInitiateForgotPasswordRequest) => {
        return initiateForgotPassword(params)
      },
    })
  }
  
  export const useVerifyOTPForgotPassword = () => {
    return useMutation({
      mutationFn: async (params: IVerifyOTPForgotPasswordRequest) => {
        return verifyOTPForgotPassword(params)
      },
    })
  }
  
  export const useResendOTPForgotPassword = () => {
    return useMutation({
      mutationFn: async (params: IResendOTPForgotPasswordRequest) => {
        return resendOTPForgotPassword(params)
      },
    })
  }
  
  export const useConfirmForgotPassword = () => {
    return useMutation({
      mutationFn: async (params: IConfirmForgotPasswordRequest) => {
        return confirmForgotPassword(params)
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
