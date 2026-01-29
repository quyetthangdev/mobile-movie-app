import {
    IApiResponse,
    ILoginRequest,
    ILoginResponse,
    IRefreshTokenResponse,
    IRegisterRequest,
} from '@/types'
import { http } from '@/utils'
  
  export async function login(params: ILoginRequest): Promise<ILoginResponse> {
    const response = await http.post<ILoginResponse>('/auth/login', params)
    return response.data
  }
  
  export async function register(
    params: IRegisterRequest,
  ): Promise<IApiResponse<ILoginResponse>> {
    const response = await http.post<IApiResponse<ILoginResponse>>(
      '/auth/register',
      params,
    )
    return response.data
  }

  export async function refreshToken(params: {
    refreshToken: string
    accessToken: string
  }): Promise<IApiResponse<IRefreshTokenResponse>> {
    const response = await http.post<IApiResponse<IRefreshTokenResponse>>(
      '/auth/refresh',
      params,
    )
    return response.data
  }