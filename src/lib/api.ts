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

// Códigos que indicam servidor fora do ar (o proxy responde no lugar dele)
const SERVER_DOWN_STATUS = [502, 503, 504]

// Interceptador de resposta: transforma qualquer erro num ApiError
api.interceptors.response.use(
  (response) => response,
  (error: AxiosError<{ message?: string }>) => {
    const status = error.response?.status ?? null
    const serverDown = !error.response || (status !== null && SERVER_DOWN_STATUS.includes(status))

    const apiError: ApiError = {
      status,
      message:
        error.response?.data?.message ??
        (error.code === 'ECONNABORTED'
          ? 'O servidor demorou para responder.'
          : serverDown
            ? 'Não foi possível conectar ao servidor.'
            : 'Erro ao processar a requisição.'),
    }
    return Promise.reject(apiError)
  },
)