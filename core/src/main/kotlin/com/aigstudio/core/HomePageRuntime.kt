package com.aigstudio.core

class HomePageRuntime(
    private val platform:String,
    private val device:String,
) : PageRuntime {
    init {
        require(platform in setOf("ANDROID","WINDOWS")){"HOME platform must be ANDROID or WINDOWS"}
    }

    override val pageId:PageId=PageId.HOME
    private val localMessages=mutableListOf<PageMessage>()
    private var runtimeRevision=0L
    private var projectName="UNTITLED"
    private var meta=ProjectRevisionMeta()
    private var localDirty=false
    private var settingsSection="MAIN"
    private var syncState=ProjectSyncState.CLEAN
    private var syncMessage="LOCAL FIRST"

    override fun dispatch(command:PageCommand):PageResult {
        val before=snapshot()
        val beforeMeta=meta
        return try {
            PageCommandCatalog.validate(command)
            when(command.commandId){
                "HOME.PROJECTS.NEW" -> newProject(command)
                "HOME.PROJECTS.OPEN" -> openProject(command)
                "HOME.PROJECTS.SAVE" -> saveProject(command)
                "HOME.SETTINGS.OPEN" -> openSettings(command)
                "HOME.SYNC.STATUS" -> syncStatus(command)
                else -> error("HOME command not implemented: ${command.commandId}")
            }
        } catch(t:Throwable){
            restore(before,beforeMeta)
            reject(command,t.message ?: t::class.simpleName.orEmpty())
        }
    }

    override fun snapshot():PageSnapshot = PageSnapshot(pageId,runtimeRevision,mapOf(
        "projectName" to projectName,
        "revision" to meta.revision.toString(),
        "baseRevision" to meta.baseRevision.toString(),
        "digest" to meta.contentDigest,
        "sourcePlatform" to meta.sourcePlatform,
        "localDirty" to localDirty.toString(),
        "settingsSection" to settingsSection,
        "syncState" to syncState.name,
        "syncMessage" to syncMessage,
        "offlineReady" to "true",
    ))

    fun projectMeta():ProjectRevisionMeta=meta
    override fun messages():List<PageMessage> = localMessages.toList()
    override fun exportPayload(target:RuntimeLinkId):RuntimeBridgePayload?=null
    override fun importPayload(source:RuntimeLinkId,payload:RuntimeBridgePayload):PageResult=
        PageResult.Rejected(pageId,"HOME_IMPORT_BRIDGE_NOT_ACTIVE",runtimeRevision)

    private fun newProject(command:PageCommand):PageResult {
        val name=(command.arguments["name"] ?: "UNTITLED").trim()
        require(name.isNotBlank()){"Project name must not be blank"}
        projectName=name
        meta=ProjectRevisionMeta(sourcePlatform=platform,sourceDevice=device.take(64))
        localDirty=true
        syncState=ProjectSyncState.LOCAL_DIRTY
        syncMessage="本機新專案 • 尚未儲存"
        runtimeRevision++
        return accepted(command,mapOf("projectName" to projectName,"localDirty" to "true"))
    }

    private fun openProject(command:PageCommand):PageResult {
        val name=(command.arguments["name"] ?: error("OPEN requires project name")).trim()
        require(name.isNotBlank()){"Project name must not be blank"}
        val revision=long(command,"revision",0L)
        val base=long(command,"baseRevision",revision.coerceAtLeast(0L))
        require(revision>=0L && base>=0L && base<=revision){"Invalid project revision metadata"}
        projectName=name
        meta=ProjectRevisionMeta(
            revision=revision,
            baseRevision=base,
            sourcePlatform=command.arguments["sourcePlatform"] ?: platform,
            sourceDevice=(command.arguments["sourceDevice"] ?: device).take(64),
            contentDigest=command.arguments["digest"].orEmpty(),
        )
        localDirty=false
        syncState=ProjectSyncState.CLEAN
        syncMessage=ProjectRevisionSync.statusLabel(syncState,meta)
        runtimeRevision++
        return accepted(command,mapOf("projectName" to projectName,"revision" to revision.toString()))
    }

    private fun saveProject(command:PageCommand):PageResult {
        require(projectName.isNotBlank()){"No active project"}
        val digest=command.arguments["digest"] ?: meta.contentDigest
        meta=ProjectRevisionSync.bump(meta,platform,device,digest)
        localDirty=false
        syncState=ProjectSyncState.CLEAN
        syncMessage=ProjectRevisionSync.statusLabel(syncState,meta)
        runtimeRevision++
        return accepted(command,mapOf(
            "projectName" to projectName,
            "revision" to meta.revision.toString(),
            "baseRevision" to meta.baseRevision.toString(),
            "digest" to meta.contentDigest,
        ))
    }

    private fun openSettings(command:PageCommand):PageResult {
        val section=(command.arguments["section"] ?: "MAIN").trim().uppercase()
        require(section.isNotBlank()){"Settings section must not be blank"}
        settingsSection=section
        runtimeRevision++
        return accepted(command,mapOf("section" to settingsSection))
    }

    private fun syncStatus(command:PageCommand):PageResult {
        val remoteRevision=long(command,"remoteRevision",meta.revision)
        val remoteBase=long(command,"remoteBaseRevision",remoteRevision.coerceAtMost(meta.revision))
        require(remoteRevision>=0L && remoteBase>=0L && remoteBase<=remoteRevision){"Invalid remote revision metadata"}
        val remote=ProjectRevisionMeta(
            revision=remoteRevision,
            baseRevision=remoteBase,
            sourcePlatform=command.arguments["remotePlatform"] ?: "UNKNOWN",
            sourceDevice=(command.arguments["remoteDevice"] ?: "REMOTE").take(64),
            contentDigest=command.arguments["remoteDigest"].orEmpty(),
        )
        syncState=ProjectRevisionSync.classify(meta,remote,localDirty)
        syncMessage=ProjectRevisionSync.statusLabel(syncState,if(syncState==ProjectSyncState.REMOTE_NEWER || syncState==ProjectSyncState.CONFLICT)remote else meta)
        runtimeRevision++
        return accepted(command,mapOf(
            "syncState" to syncState.name,
            "syncMessage" to syncMessage,
            "localRevision" to meta.revision.toString(),
            "remoteRevision" to remote.revision.toString(),
        ))
    }

    private fun restore(snapshot:PageSnapshot,beforeMeta:ProjectRevisionMeta){
        runtimeRevision=snapshot.revision
        projectName=snapshot.state.getValue("projectName")
        meta=beforeMeta
        localDirty=snapshot.state.getValue("localDirty").toBoolean()
        settingsSection=snapshot.state.getValue("settingsSection")
        syncState=ProjectSyncState.valueOf(snapshot.state.getValue("syncState"))
        syncMessage=snapshot.state.getValue("syncMessage")
    }

    private fun long(command:PageCommand,key:String,default:Long):Long = command.arguments[key]?.toLong() ?: default
    private fun accepted(command:PageCommand,evidence:Map<String,String> = emptyMap())=
        PageResult.Accepted(pageId,command.commandId,runtimeRevision,evidence)

    private fun reject(command:PageCommand,detail:String):PageResult {
        localMessages+=PageMessage(
            pageId,command.subpage.takeIf{it.page==pageId},"HOME_COMMAND_REJECTED",detail,
            relatedButtonId=command.commandId,revision=runtimeRevision,timestampEpochMs=System.currentTimeMillis(),
            severity=PageMessageSeverity.WARNING
        )
        return PageResult.Rejected(pageId,"HOME_COMMAND_REJECTED",runtimeRevision,detail)
    }
}
