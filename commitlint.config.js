const pascalCase = '[A-Z][a-z0-9]+(?:[A-Z][a-z0-9]+)*'
const headerPattern = new RegExp(
    `^(?<type>${pascalCase})\\((?<scope>${pascalCase})\\): (?<subject>\\S(?:.*\\S)?)$`,
    'u'
)
const chineseCharacter = /\p{Script=Han}/u

export default {
    plugins: [
        {
            rules: {
                'atlasloom-header-format': ({ header }) => {
                    const match = headerPattern.exec(header ?? '')
                    if (!match) {
                        return [false, 'header must match Type(Scope): 中文描述 using PascalCase']
                    }

                    return [
                        chineseCharacter.test(match.groups?.subject ?? ''),
                        'subject must contain at least one Chinese character'
                    ]
                }
            }
        }
    ],
    rules: {
        'atlasloom-header-format': [2, 'always']
    }
}
