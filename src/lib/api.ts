import axios, { AxiosError } from 'axios'

export const api = axios.create({
  baseURL: '/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
})

export interface ApiError {
  status: number | null
  message: string
}

api.interceptors.response.use(
  (response) => response,
  (error: AxiosError<{ message?: string }>) => {
    const apiError: ApiError = {
      status: error.response?.status ?? null,
      message:
        error.response?.data?.message ??
        (error.code === 'ECONNABORTED'
          ? 'O servidor demorou para responder.'
          : error.response
            ? 'Erro ao processar a requisição.'
            : 'Não foi possível conectar ao servidor.'),
    }
    return Promise.reject(apiError)
  },
)