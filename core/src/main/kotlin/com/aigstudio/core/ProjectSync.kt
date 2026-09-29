package com.aigstudio.core

import java.io.File

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

data class SharedProjectObservation(
    val state:ProjectSyncState,
    val remoteMeta:ProjectRevisionMeta?,
    val message:String
)

object SharedProjectFolderSync {
    const val POLICY="FOLDER_TRANSPORT_REVISION_WATCH_NO_AUTO_APPLY"
    const val POLL_INTERVAL_MS=1500L
    const val AUTO_APPLY=false
    const val NETWORK_REQUIRED=false

    fun inspect(
        sharedFile:File,
        localMeta:ProjectRevisionMeta,
        localDirty:Boolean,
        loadMeta:(File)->ProjectRevisionMeta
    ):SharedProjectObservation {
        if(!sharedFile.isFile) {
            val state=if(localDirty) ProjectSyncState.LOCAL_DIRTY else ProjectSyncState.CLEAN
            return SharedProjectObservation(state,null,if(localDirty)"本機有新版 • 尚未發布" else "共享資料夾待命")
        }
        val remote=loadMeta(sharedFile)
        val state=ProjectRevisionSync.classify(localMeta,remote,localDirty)
        val source=when(remote.sourcePlatform) {
            "ANDROID" -> "手機"
            "WINDOWS" -> "Windows"
            else -> "其他裝置"
        }
        val message=when(state) {
            ProjectSyncState.CLEAN -> "已同步 • r${remote.revision}"
            ProjectSyncState.LOCAL_DIRTY -> "本機有新版 • r${localMeta.revision}"
            ProjectSyncState.REMOTE_NEWER -> "${source}有新版 • r${remote.revision}"
            ProjectSyncState.CONFLICT -> "同步衝突 • r${remote.revision} • 需選擇"
        }
        return SharedProjectObservation(state,remote,message)
    }

    fun publishConfirmed(
        sourceFile:File,
        sharedFile:File,
        expectedRemoteDigest:String?,
        loadMeta:(File)->ProjectRevisionMeta,
        confirmed:Boolean
    ):ProjectRevisionMeta {
        require(confirmed) { "Shared publish requires explicit user confirmation" }
        require(sourceFile.isFile) { "Local project file missing" }
        sharedFile.parentFile?.let { require(it.exists() || it.mkdirs()) { "Shared folder unavailable" } }
        if(sharedFile.isFile) {
            require(!expectedRemoteDigest.isNullOrBlank()) {
                "Existing shared project requires expected digest"
            }
            val current=loadMeta(sharedFile)
            require(current.contentDigest==expectedRemoteDigest) { "Shared project changed before publish" }
        }
        val temp=File(sharedFile.parentFile,sharedFile.name+".incoming")
        sourceFile.copyTo(temp,overwrite=true)
        val incoming=loadMeta(temp)
        require(incoming.contentDigest.isNotBlank()) { "Incoming shared project digest missing" }
        temp.copyTo(sharedFile,overwrite=true)
        val written=loadMeta(sharedFile)
        require(written.contentDigest==incoming.contentDigest) { "Shared publish verification failed" }
        temp.delete()
        return written
    }

    fun conflictCopy(sharedFile:File,meta:ProjectRevisionMeta):File {
        val dot=sharedFile.name.lastIndexOf('.')
        val stem=if(dot>0) sharedFile.name.substring(0,dot) else sharedFile.name
        val ext=if(dot>0) sharedFile.name.substring(dot) else ""
        val source=meta.sourcePlatform.lowercase().ifBlank{"device"}
        return File(sharedFile.parentFile,"${stem}-conflict-r${meta.revision}-${source}${ext}")
    }
}
