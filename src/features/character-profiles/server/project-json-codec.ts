export interface ProjectJsonCodec {
    parse(contents: string): unknown
    stringify(value: unknown): string
}

export const projectJsonCodec = {
    parse: (contents: string) => JSON.parse(contents) as unknown,
    stringify: (value: unknown) => `${JSON.stringify(value, null, 2)}\n`
} satisfies ProjectJsonCodec
