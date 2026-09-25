import { mkdir, readFile, readdir, rename, rm, stat, writeFile } from 'node:fs/promises'

export interface ProjectFileSystem {
    mkdir: typeof mkdir
    readFile: typeof readFile
    readdir: typeof readdir
    rename: typeof rename
    rm: typeof rm
    stat: typeof stat
    writeFile: typeof writeFile
}

export const nodeProjectFileSystem = {
    mkdir,
    readFile,
    readdir,
    rename,
    rm,
    stat,
    writeFile
} satisfies ProjectFileSystem
