export function getCharacterProfilesErrorMessage(
    reason: unknown,
    fallbackMessage = '本地项目服务暂时无法处理请求。'
): string {
    return reason instanceof Error ? reason.message : fallbackMessage
}
