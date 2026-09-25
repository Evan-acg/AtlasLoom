export class ProjectRepositoryError extends Error {
    constructor(
        message: string,
        readonly code:
            'invalid-name' | 'duplicate-name' | 'not-found' | 'read-only' | 'invalid-data' | 'invalid-tag-reference'
    ) {
        super(message)
        this.name = 'ProjectRepositoryError'
    }
}
