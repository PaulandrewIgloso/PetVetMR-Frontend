import axios, { type AxiosError } from "axios"

//test
const BASE_URL = import.meta.env.VITE_API_BASE_URL || "https://petvetmr.runasp.net"

export const apiClient = axios.create({
  baseURL: BASE_URL,
  headers: { "Content-Type": "application/json" },
})

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem("token")
  if (token) {
    config.headers = config.headers ?? {}
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

export interface NormalizedApiError {
  status: number
  message: string
}

apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError<{ error?: string; message?: string }>) => {
    const status = error.response?.status ?? 0
    const message =
      error.response?.data?.error ??
      error.response?.data?.message ??
      error.message ??
      "Something went wrong. Please try again."
      
    const isAuthEndpoint = error.config?.url?.includes("/api/Auth/")

     if (status === 401 && !isAuthEndpoint) {
      localStorage.removeItem("token")
      localStorage.removeItem("user")
      window.location.href = "/login"
    }

    return Promise.reject({ status, message } satisfies NormalizedApiError)
  }
)

export const api = {
  get: <T>(path: string) =>
    apiClient.get<T>(path).then((res) => res.data),
  post: <T>(path: string, data: unknown) =>
    apiClient.post<T>(path, data).then((res) => res.data),
  put: <T>(path: string, data: unknown) =>
    apiClient.put<T>(path, data).then((res) => res.data),
  patch: <T>(path: string, data: unknown) =>
    apiClient.patch<T>(path, data).then((res) => res.data),
  delete: <T>(path: string) =>
    apiClient.delete<T>(path).then((res) => res.data),
  postForm: <T>(path: string, formData: FormData) =>
    apiClient
    .post<T>(path, formData, { headers: { "Content-Type": undefined } })
    .then((res) => res.data),
  getBlob: (path: string) =>
    apiClient.get(path, { responseType: "blob" }).then((res) => res.data as Blob),
}