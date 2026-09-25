export async function request<T>(path: string, options: RequestInit, fallbackMessage: string): Promise<T> {
    const response = await fetch(`/api${path}`, {
        ...options,
        headers: { 'Content-Type': 'application/json', ...options.headers }
    })
    const body = (await response.json()) as T | { error?: string }

    if (!response.ok) {
        const message = typeof body === 'object' && body !== null && 'error' in body ? body.error : undefined
        throw new Error(typeof message === 'string' ? message : fallbackMessage)
    }

    return body as T
}
