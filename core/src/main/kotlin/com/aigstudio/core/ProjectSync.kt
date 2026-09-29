package com.aigstudio.core

enum class ProjectSyncState {
    CLEAN,
    LOCAL_DIRTY,
    REMOTE_NEWER,
    CONFLICT
}

data class ProjectRevisionMeta(
    val revision:Long=0L,
    val baseRevision:Long=0L,
    val sourcePlatform:String="UNKNOWN",
    val sourceDevice:String="UNKNOWN",
    val contentDigest:String=""
)

object ProjectRevisionSync {
    val resolutionChoices=listOf("ADOPT_REMOTE","KEEP_LOCAL","SAVE_COPY")

    fun classify(
        local:ProjectRevisionMeta,
        remote:ProjectRevisionMeta,
        localDirty:Boolean
    ):ProjectSyncState {
        if(local.contentDigest.isNotBlank() && local.contentDigest==remote.contentDigest) return ProjectSyncState.CLEAN
        if(localDirty && remote.revision>local.baseRevision) return ProjectSyncState.CONFLICT
        if(remote.revision>local.revision) return ProjectSyncState.REMOTE_NEWER
        if(localDirty || local.revision>remote.revision) return ProjectSyncState.LOCAL_DIRTY
        return ProjectSyncState.CLEAN
    }
    fun bump(
        current:ProjectRevisionMeta,
        platform:String,
        device:String,
        contentDigest:String=""
    ):ProjectRevisionMeta {
        require(platform in setOf("ANDROID","WINDOWS")) { "Unsupported source platform" }
        val next=(current.revision+1L).coerceAtLeast(1L)
        return ProjectRevisionMeta(
            revision=next,
            baseRevision=current.revision,
            sourcePlatform=platform,
            sourceDevice=device.take(64),
            contentDigest=contentDigest
        )
    }

    fun statusLabel(state:ProjectSyncState,meta:ProjectRevisionMeta):String =
        "SYNC r${meta.revision} • "+when(state) {
            ProjectSyncState.CLEAN -> "已同步"
            ProjectSyncState.LOCAL_DIRTY -> "本機有新版"
            ProjectSyncState.REMOTE_NEWER -> "有跨裝置新版"
            ProjectSyncState.CONFLICT -> "衝突：需選擇"
        }
}
