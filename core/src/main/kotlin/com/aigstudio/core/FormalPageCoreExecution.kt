package com.aigstudio.core

import kotlin.math.abs
import kotlin.math.round

enum class StudioCoreEffect {
    PROJECT_STATE,
    GEOMETRY,
    TOOLPATH,
    MATERIAL_REMOVAL,
    AXIS_STATE,
    NC_RESULT,
    AI_CONTEXT,
    RUNTIME_SETTING,
    NAVIGATION_ONLY,
    PLACEHOLDER
}

data class StudioCoreRoute(
    val page:String,
    val command:String,
    val coreTarget:String,
    val effect:StudioCoreEffect
)

object StudioPageCoreCatalog {
    private fun r(page:String,command:String,target:String,effect:StudioCoreEffect)=
        StudioCoreRoute(page,command,target,effect)

    private val routes=listOf(
        r("HOME","PROJECT.SAVE","StudioProjectRepository.save",StudioCoreEffect.PROJECT_STATE),
        r("HOME","PROJECT.RECOVERY","StudioProjectRepository.load",StudioCoreEffect.PROJECT_STATE),
        r("HOME","SYNC.STATUS","ProjectSyncPolicy.classify",StudioCoreEffect.PROJECT_STATE),
        r("HOME","PROJECT.AUTOSAVE","StudioProjectRepository.save",StudioCoreEffect.PROJECT_STATE),

        r("CAD","CAD.LINE","History.run(AddEntitiesCommand(Line))",StudioCoreEffect.GEOMETRY),
        r("CAD","CAD.SELECT","CadView selection / DrawingDocument",StudioCoreEffect.GEOMETRY),
        r("CAD","CAD.SNAP","CadSnapEngine",StudioCoreEffect.GEOMETRY),
        r("CAD","CAD.UNDO","History.undo",StudioCoreEffect.GEOMETRY),

        r("CAM","CAM.AUTO","CamModel.fromCad/CamEngine.generate",StudioCoreEffect.TOOLPATH),
        r("CAM","CAM.MANUAL","ManualCamPathEngine/CamEngine.generateManual",StudioCoreEffect.TOOLPATH),
        r("CAM","CAM.CONTOUR","CamEngine.generate",StudioCoreEffect.TOOLPATH),
        r("CAM","CAM.SAFE_Z","CamSettings.safeZ",StudioCoreEffect.TOOLPATH),

        r("SIM","SIM.MATERIAL_REMOVAL","MaterialRemoval3D.simulate",StudioCoreEffect.MATERIAL_REMOVAL),
        r("SIM","SIM.COLLISION_CHECK","MachiningRiskScanner.inspect",StudioCoreEffect.MATERIAL_REMOVAL),
        r("SIM","SIM.SINGLE_BLOCK","Machining3DEngine/MaterialRemoval3D prefix",StudioCoreEffect.MATERIAL_REMOVAL),
        r("SIM","SIM.RESET","Machining3DResult reset",StudioCoreEffect.MATERIAL_REMOVAL),

        r("3AX","AXIS3.JOG_X","StudioAxisPageRuntime.jog(X)",StudioCoreEffect.AXIS_STATE),
        r("3AX","AXIS3.JOG_Z","StudioAxisPageRuntime.jog(Z)",StudioCoreEffect.AXIS_STATE),
        r("3AX","AXIS3.ZERO","StudioAxisPageRuntime.zero",StudioCoreEffect.AXIS_STATE),
        r("3AX","AXIS3.PLAY","Machining3DEngine build/play",StudioCoreEffect.AXIS_STATE),

        r("4AX","AXIS4.JOG_A","StudioAxisPageRuntime.jog(A)",StudioCoreEffect.AXIS_STATE),
        r("4AX","AXIS4.JOG_X","StudioAxisPageRuntime.jog(X)",StudioCoreEffect.AXIS_STATE),
        r("4AX","AXIS4.ZERO","StudioAxisPageRuntime.zero",StudioCoreEffect.AXIS_STATE),
        r("4AX","AXIS4.PLAY","Machining3DEngine build/play",StudioCoreEffect.AXIS_STATE),

        r("5AX","AXIS5.JOG_A","StudioAxisPageRuntime.jog(A)",StudioCoreEffect.AXIS_STATE),
        r("5AX","AXIS5.JOG_B","StudioAxisPageRuntime.jog(B)",StudioCoreEffect.AXIS_STATE),
        r("5AX","AXIS5.ZERO","StudioAxisPageRuntime.zero",StudioCoreEffect.AXIS_STATE),
        r("5AX","AXIS5.PLAY","Machining3DEngine build/play",StudioCoreEffect.AXIS_STATE),

        r("6AX","AXIS6.JOG_A","StudioAxisPageRuntime.jog(A)",StudioCoreEffect.AXIS_STATE),
        r("6AX","AXIS6.JOG_B","StudioAxisPageRuntime.jog(B)",StudioCoreEffect.AXIS_STATE),
        r("6AX","AXIS6.JOG_C","StudioAxisPageRuntime.jog(C)",StudioCoreEffect.AXIS_STATE),
        r("6AX","AXIS6.PLAY","Machining3DEngine build/play",StudioCoreEffect.AXIS_STATE),

        r("NC","NC.EDIT","NC working-copy editor",StudioCoreEffect.NC_RESULT),
        r("NC","NC.PARSE","NcModalTracker.trace",StudioCoreEffect.NC_RESULT),
        r("NC","NC.VALIDATE","NcProgramSafetyPolicy.blocking",StudioCoreEffect.NC_RESULT),
        r("NC","NC.POST","FanucPostProcessor/NC generator",StudioCoreEffect.NC_RESULT),

        r("AI","AI.CHECK","MachiningRiskScanner + NC safety",StudioCoreEffect.AI_CONTEXT),
        r("AI","AI.READ_CAD","DrawingSnapshot",StudioCoreEffect.AI_CONTEXT),
        r("AI","AI.READ_CAM","CamModel.toolpaths",StudioCoreEffect.AI_CONTEXT),
        r("AI","AI.READ_NC","NC working copy",StudioCoreEffect.AI_CONTEXT),

        r("SETTINGS","SETTINGS.PRECISION","CoordinatePrecisionRuntime.configure",StudioCoreEffect.RUNTIME_SETTING),
        r("SETTINGS","SETTINGS.FPS","RuntimeEnvironmentSettings FPS",StudioCoreEffect.RUNTIME_SETTING),
        r("SETTINGS","SETTINGS.QUALITY","RuntimeEnvironmentSettings quality",StudioCoreEffect.RUNTIME_SETTING),
        r("SETTINGS","SETTINGS.HUD","RuntimeEnvironmentSettings HUD",StudioCoreEffect.RUNTIME_SETTING)
    )
    private val byCommand=routes.associateBy{it.command}
    init {
        require(byCommand.size==routes.size){"duplicate Studio formal command"}
        require(routes.none{it.effect==StudioCoreEffect.NAVIGATION_ONLY || it.effect==StudioCoreEffect.PLACEHOLDER})
    }
    fun requireRoute(command:String):StudioCoreRoute =
        byCommand[command] ?: error("No real Studio core route for $command")
    fun commands():Set<String> = byCommand.keys
}

data class StudioFormalAction(
    val label:String,
    val command:String,
    val nextPage:String?=null,
    val executesCoreBeforeNavigation:Boolean=true
)

object StudioFormalPageContract {
    const val MAX_VISIBLE_ACTIONS=4
    val requiredPages=listOf("HOME","CAD","CAM","SIM","3AX","4AX","5AX","6AX","NC","AI","SETTINGS")
    private val actionsByPage=linkedMapOf(
        "HOME" to listOf(
            StudioFormalAction("SAVE","PROJECT.SAVE"),
            StudioFormalAction("RECOVER","PROJECT.RECOVERY"),
            StudioFormalAction("SYNC","SYNC.STATUS"),
            StudioFormalAction("AUTOSAVE","PROJECT.AUTOSAVE")
        ),
        "CAD" to listOf(
            StudioFormalAction("LINE","CAD.LINE"),
            StudioFormalAction("SELECT","CAD.SELECT"),
            StudioFormalAction("SNAP","CAD.SNAP"),
            StudioFormalAction("UNDO","CAD.UNDO")
        ),
        "CAM" to listOf(
            StudioFormalAction("AUTO","CAM.AUTO"),
            StudioFormalAction("MANUAL","CAM.MANUAL"),
            StudioFormalAction("CONTOUR","CAM.CONTOUR"),
            StudioFormalAction("SAFE-Z","CAM.SAFE_Z")
        ),
        "SIM" to listOf(
            StudioFormalAction("材料移除","SIM.MATERIAL_REMOVAL"),
            StudioFormalAction("碰撞檢查","SIM.COLLISION_CHECK"),
            StudioFormalAction("單節","SIM.SINGLE_BLOCK"),
            StudioFormalAction("RESET","SIM.RESET")
        ),
        "3AX" to listOf(
            StudioFormalAction("X JOG","AXIS3.JOG_X"),StudioFormalAction("Z JOG","AXIS3.JOG_Z"),
            StudioFormalAction("ZERO","AXIS3.ZERO"),StudioFormalAction("PLAY","AXIS3.PLAY")
        ),
        "4AX" to listOf(
            StudioFormalAction("A JOG","AXIS4.JOG_A"),StudioFormalAction("X JOG","AXIS4.JOG_X"),
            StudioFormalAction("ZERO","AXIS4.ZERO"),StudioFormalAction("PLAY","AXIS4.PLAY")
        ),
        "5AX" to listOf(
            StudioFormalAction("A JOG","AXIS5.JOG_A"),StudioFormalAction("B JOG","AXIS5.JOG_B"),
            StudioFormalAction("ZERO","AXIS5.ZERO"),StudioFormalAction("PLAY","AXIS5.PLAY")
        ),
        "6AX" to listOf(
            StudioFormalAction("A JOG","AXIS6.JOG_A"),StudioFormalAction("B JOG","AXIS6.JOG_B"),
            StudioFormalAction("C JOG","AXIS6.JOG_C"),StudioFormalAction("PLAY","AXIS6.PLAY")
        ),
        "NC" to listOf(
            StudioFormalAction("EDIT","NC.EDIT"),StudioFormalAction("PARSE","NC.PARSE"),
            StudioFormalAction("安全驗證","NC.VALIDATE"),StudioFormalAction("POST","NC.POST")
        ),
        "AI" to listOf(
            StudioFormalAction("AI CHECK","AI.CHECK"),StudioFormalAction("READ CAD","AI.READ_CAD"),
            StudioFormalAction("READ CAM","AI.READ_CAM"),StudioFormalAction("READ NC","AI.READ_NC")
        ),
        "SETTINGS" to listOf(
            StudioFormalAction("PRECISION","SETTINGS.PRECISION"),StudioFormalAction("FPS","SETTINGS.FPS"),
            StudioFormalAction("QUALITY","SETTINGS.QUALITY"),StudioFormalAction("HUD","SETTINGS.HUD")
        )
    )
    init {
        require(actionsByPage.keys.toList()==requiredPages)
        actionsByPage.forEach{(page,actions)->
            require(actions.isNotEmpty() && actions.size<=MAX_VISIBLE_ACTIONS){"$page formal action count invalid"}
            actions.forEach{
                require(it.executesCoreBeforeNavigation){"${it.command} must execute core before navigation"}
                require(StudioPageCoreCatalog.requireRoute(it.command).page==page){"${it.command} page mismatch"}
            }
        }
    }
    fun actions(page:String):List<StudioFormalAction> =
        actionsByPage[page.trim().uppercase()] ?: error("Unsupported Studio formal page: $page")
    fun action(page:String,command:String):StudioFormalAction =
        actions(page).firstOrNull{it.command==command} ?: error("$command is not visible on $page")
}

enum class StudioAxisPageMode { AX3, AX4, AX5, AX6 }
enum class StudioAxisChannel { X, Y, Z, A, B, C }

data class StudioAxisRuntimeState(
    var x:Double=0.0,
    var y:Double=0.0,
    var z:Double=0.0,
    var a:Double=0.0,
    var b:Double=0.0,
    var c:Double=0.0,
    var mutationSerial:Long=0L
)

data class StudioAxisMutation(
    val mode:StudioAxisPageMode,
    val channel:StudioAxisChannel?,
    val value:Double,
    val status:String
)

class StudioAxisPageRuntime(
    private var mode:StudioAxisPageMode,
    private val state:StudioAxisRuntimeState
) {
    companion object {
        const val RESOLUTION_MM=0.001
        const val MACHINE_OUTPUT_ENABLED=false
    }
    val machineOutputEnabled:Boolean get()=MACHINE_OUTPUT_ENABLED
    val supportedChannels:Set<StudioAxisChannel> get()=when(mode){
        StudioAxisPageMode.AX3->setOf(StudioAxisChannel.X,StudioAxisChannel.Y,StudioAxisChannel.Z)
        StudioAxisPageMode.AX4->setOf(StudioAxisChannel.X,StudioAxisChannel.Y,StudioAxisChannel.Z,StudioAxisChannel.A)
        StudioAxisPageMode.AX5->setOf(StudioAxisChannel.X,StudioAxisChannel.Y,StudioAxisChannel.Z,StudioAxisChannel.A,StudioAxisChannel.B)
        StudioAxisPageMode.AX6->setOf(StudioAxisChannel.X,StudioAxisChannel.Y,StudioAxisChannel.Z,StudioAxisChannel.A,StudioAxisChannel.B,StudioAxisChannel.C)
    }
    fun selectMode(next:StudioAxisPageMode){mode=next}
    fun jog(channel:StudioAxisChannel,delta:Double):StudioAxisMutation {
        require(channel in supportedChannels){"$channel unsupported in $mode"}
        require(delta.isFinite() && abs(delta)>=RESOLUTION_MM-1e-12){"JOG must be finite and at least 0.001"}
        val quantized=round(delta/RESOLUTION_MM)*RESOLUTION_MM
        when(channel){
            StudioAxisChannel.X->state.x+=quantized
            StudioAxisChannel.Y->state.y+=quantized
            StudioAxisChannel.Z->state.z+=quantized
            StudioAxisChannel.A->state.a+=quantized
            StudioAxisChannel.B->state.b+=quantized
            StudioAxisChannel.C->state.c+=quantized
        }
        state.mutationSerial++
        return StudioAxisMutation(mode,channel,value(channel),"SIM/PREVIEW ONLY • MACHINE OUTPUT=OFF")
    }
    fun zero():StudioAxisMutation {
        supportedChannels.forEach{channel->
            when(channel){
                StudioAxisChannel.X->state.x=0.0;StudioAxisChannel.Y->state.y=0.0;StudioAxisChannel.Z->state.z=0.0
                StudioAxisChannel.A->state.a=0.0;StudioAxisChannel.B->state.b=0.0;StudioAxisChannel.C->state.c=0.0
            }
        }
        state.mutationSerial++
        return StudioAxisMutation(mode,null,0.0,"ZERO • SIM/PREVIEW ONLY • MACHINE OUTPUT=OFF")
    }
    fun snapshot():StudioAxisRuntimeState=state.copy()
    private fun value(channel:StudioAxisChannel)=when(channel){
        StudioAxisChannel.X->state.x;StudioAxisChannel.Y->state.y;StudioAxisChannel.Z->state.z
        StudioAxisChannel.A->state.a;StudioAxisChannel.B->state.b;StudioAxisChannel.C->state.c
    }
}
