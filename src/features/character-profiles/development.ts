import type { RouteRecordRaw } from 'vue-router'

export const characterProfilesDevelopmentRoutes: RouteRecordRaw[] = import.meta.env.DEV
    ? [
          {
              path: '/__dev/character-profiles/workspace',
              name: 'character-profiles-workspace-prototype',
              component: () => import('./prototypes/WorkspaceFlowPrototype.vue')
          }
      ]
    : []
