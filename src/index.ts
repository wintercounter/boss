export { runBuild, resolveBuildConfig } from '@/tasks/build'
export type { BuildResult, ResolvedBuildConfig } from '@/tasks/build'

export { runWatch } from '@/tasks/watch'
export type { WatchOptions, WatchResult } from '@/tasks/watch'

export { runCompile } from '@/tasks/compile'
export type { CompileOptions } from '@/tasks/compile'

export { runPostcss } from '@/tasks/postcss'
export type { BossPostcssOptions } from '@/tasks/postcss'

export type {
    BossApi,
    BossApiConfig,
    BossApiFiles,
    BossBrowserApi,
    BossBrowserObjectPayload,
    BossCssCustomBlock,
    BossCssLike,
    BossCssRuleOptions,
    BossCssSelectorInput,
    BossDtsFile,
    BossFileBase,
    BossFileEntry,
    BossFileSection,
    BossJsFile,
    BossMetaDataPayload,
    BossParseInput,
    BossPluginEventName,
    BossPluginEventPayload,
    BossPluginHandler,
    BossPluginHandlers,
    BossPluginModule,
    BossPluginTest,
    BossPluginTrigger,
    BossProp,
    BossPropPayload,
    BossPropPrimitive,
    BossPropTree,
    BossPropTreePayload,
    BossPropValue,
    BossRuntimeAdapter,
    BossServerApi,
    Plugin,
} from '@/types'
