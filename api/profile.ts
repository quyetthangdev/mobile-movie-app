import { IApiResponse, IUserInfo } from "@/types"
import { http } from "@/utils"


export async function getProfile(): Promise<IApiResponse<IUserInfo>> {
    const response = await http.get<IApiResponse<IUserInfo>>('/auth/profile')
    return response.data
  }