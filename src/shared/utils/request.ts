import axios, { type AxiosRequestConfig } from 'axios'

type ErrorResponse = {
    error?: unknown
}

export const apiClient = axios.create({
    baseURL: '/api',
    headers: { 'Content-Type': 'application/json' }
})

export async function request<T>(config: AxiosRequestConfig, fallbackMessage: string): Promise<T> {
    try {
        const response = await apiClient.request<T>(config)
        return response.data
    } catch (error: unknown) {
        if (axios.isAxiosError<ErrorResponse>(error)) {
            const message = error.response?.data?.error
            if (typeof message === 'string') throw new Error(message, { cause: error })
        }

        throw new Error(fallbackMessage, { cause: error })
    }
}
