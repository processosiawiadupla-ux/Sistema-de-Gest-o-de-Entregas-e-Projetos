import axios, { AxiosError } from 'axios'

// Instância única usada por todo o frontend
export const api = axios.create({
  baseURL: '/api',
  timeout: 10000, // 10 segundos
  headers: {
    'Content-Type': 'application/json',
  },
})

// Formato padrão de erro que as telas vão receber
export interface ApiError {
  status: number | null
  message: string
}

// Interceptador de resposta: transforma qualquer erro num ApiError
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