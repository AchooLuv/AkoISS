import axios from 'axios'
import { tipsType } from '@/utils/notify'
import type { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios'

export const AXIOS_TIMEOUT = 90000

export class Request {
  instance: AxiosInstance
  baseConfig: AxiosRequestConfig = { baseURL: import.meta.env.BASE_URL, timeout: AXIOS_TIMEOUT }

  constructor(config: AxiosRequestConfig) {
    this.instance = axios.create(Object.assign({}, this.baseConfig, config))

    this.instance.interceptors.response.use(
      (res: AxiosResponse) => res,
      (error: unknown) => {
        const err = error as { response?: { status?: number }; message?: string; code?: string }
        const status = err.response?.status

        // 没有响应体的错误（超时 / 断网 / 被拦截）不会走到下面的 switch，需要单独兜底
        if (!status) {
          const msg =
            err.code === 'ECONNABORTED'
              ? '请求超时，图源站点响应过慢，可稍后重试'
              : `无法连接到图源站点${err.message ? `（${err.message}）` : ''}`
          return Promise.reject(Object.assign(new Error(msg), { friendly: msg }))
        }

        const MAP: Record<number, string> = {
          400: '请求被图源拒绝（400），可能是图片格式不受支持',
          401: '图源要求授权（401）',
          403: '图源拒绝了本次请求（403），可能触发了反爬限制',
          404: '图源接口不存在（404）',
          408: '请求超时（408）',
          413: '图片体积过大被图源拒绝（413）',
          429: '请求过于频繁（429），请稍后再试',
          500: '图源服务器错误（500）',
          502: '图源网关错误（502）',
          503: '图源服务不可用（503）',
          504: '图源响应超时（504）',
        }
        const msg = MAP[status] ?? `请求失败（HTTP ${status}）`
        tipsType(false, msg)
        return Promise.reject(Object.assign(new Error(msg), { friendly: msg, status }))
      }
    )
  }

  public request<T = unknown>(config: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    return this.instance.request<T>(config)
  }

  public get<T = unknown>(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    return this.instance.get<T>(url, config)
  }

  public post<T = unknown>(
    url: string,
    data?: unknown,
    config?: AxiosRequestConfig
  ): Promise<AxiosResponse<T>> {
    return this.instance.post<T>(url, data, config)
  }
}

const ako = new Request({})

export default ako
