import { afterEach, describe, expect, it, vi } from 'vitest'
import { apiClient, request } from './request'

describe('shared request wrapper', () => {
    afterEach(() => {
        vi.restoreAllMocks()
        vi.unstubAllGlobals()
    })

    // Given the API responds with an error payload
    // When the shared request wrapper sends an axios request
    // Then it throws the server error message
    it('uses the server error message for axios responses', async () => {
        vi.spyOn(apiClient, 'request').mockRejectedValue({
            isAxiosError: true,
            response: { data: { error: '服务端错误' } }
        })

        await expect(request({ url: '/projects' }, '请求失败。')).rejects.toThrow('服务端错误')
    })

    // Given the request cannot reach the server
    // When the shared request wrapper sends an axios request
    // Then it throws the provided fallback message
    it('uses the fallback message for non-response failures', async () => {
        vi.spyOn(apiClient, 'request').mockRejectedValue(new Error('network failure'))

        await expect(request({ url: '/projects' }, '请求失败。')).rejects.toThrow('请求失败。')
    })

    // Given a successful non-GET API request
    // When the shared request wrapper completes the request
    // Then it dispatches the data-changed event
    it('dispatches the data-changed event after successful mutations', async () => {
        vi.spyOn(apiClient, 'request').mockResolvedValue({ data: { ok: true } } as never)
        const dispatchEvent = vi.fn()
        vi.stubGlobal('dispatchEvent', dispatchEvent)

        await request({ url: '/projects', method: 'POST', data: {} }, '请求失败。')

        expect(dispatchEvent).toHaveBeenCalledWith(expect.objectContaining({ type: 'atlasloom:data-changed' }))
    })
})
