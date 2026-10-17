package com.aigstudio.app

import android.app.Activity
import android.view.View
import android.view.ViewGroup
import android.view.ViewTreeObserver
import android.widget.TextView
import android.widget.Toast
import com.aigstudio.core.*
import java.io.File
import java.util.Locale
import java.util.WeakHashMap

/**
 * Production Android binding for the dual-project hard rule:
 * visible action -> shared command -> real core -> real state/result -> UI refresh.
 * Axis JOG is deliberately preview/simulation-only; no CNC transport is opened here.
 */
object FormalPageCoreBindingInstaller {
    private val installed=java.util.Collections.newSetFromMap(WeakHashMap<Activity,Boolean>())
    private val currentPage=WeakHashMap<Activity,String>()
    private val camCache=WeakHashMap<Activity,CamModel>()
    private val axisState=WeakHashMap<Activity,StudioAxisRuntimeState>()
    private const val ACTION_HOST="VISIBLE FUNCTION ACTIONS"
    private const val CORE_PREFIX="CORE:"

    fun install(activity:Activity) {
        if(!installed.add(activity)) return
        val decor=activity.window.decorView
        val listener=object:ViewTreeObserver.OnGlobalLayoutListener {
            override fun onGlobalLayout() {
                if(activity.isFinishing || activity.isDestroyed) {
                    if(decor.viewTreeObserver.isAlive) decor.viewTreeObserver.removeOnGlobalLayoutListener(this)
                    return
                }
                runCatching { sync(activity) }
            }
        }
        decor.viewTreeObserver.addOnGlobalLayoutListener(listener)
        decor.post { runCatching { sync(activity) } }
    }

    private fun sync(activity:Activity) {
        val page=detectPage(activity) ?: return
        currentPage[activity]=page
        val host=findByDescription(activity.window.decorView,ACTION_HOST) as? ViewGroup ?: return
        // HOME/SETTINGS use their dedicated formal surfaces; this host belongs to workstation pages.
        if(page=="HOME" || page=="SETTINGS") return
        val actions=StudioFormalPageContract.actions(page)
        val already=(0 until host.childCount).mapNotNull{host.getChildAt(it).contentDescription?.toString()}
        if(actions.all{CORE_PREFIX+it.command in already}) return
        host.removeAllViews()
        actions.forEachIndexed { index,action ->
            host.addView(RgbGlowButton(activity).apply {
                text=action.label
                contentDescription=CORE_PREFIX+action.command
                isAllCaps=false
                setRgbState(surfaceColor(page,index),false)
                setOnClickListener {
                    val message=runCatching { executeFormalCoreAction(activity,page,action.command) }
                        .getOrElse { "CORE:${action.command} • BLOCKED • "+(it.message?:it.javaClass.simpleName) }
                    Toast.makeText(activity,message,Toast.LENGTH_SHORT).show()
                    findCad(activity)?.invalidate()
                }
            })
        }
    }

    private fun detectPage(activity:Activity):String? {
        val home=findContainsDescription(activity.window.decorView,"AIG CNC FORMAL RGB HOME")
        if(home?.isShown==true) return "HOME"
        val title=findByDescription(activity.window.decorView,"CURRENT PRODUCTION MODE") as? TextView
        val text=title?.text?.toString().orEmpty()
        for(page in listOf("CAD","CAM","SIM","3AX","4AX","5AX","6AX","NC","AI")) {
            val expected=runCatching{"UX • "+RuntimeUxFlowContract.title(page)}.getOrNull()
            if(expected!=null && text==expected) return page
            if(text.uppercase(Locale.US).contains(page)) return page
        }
        return currentPage[activity]
    }

    private fun executeFormalCoreAction(activity:Activity,page:String,command:String):String {
        StudioFormalPageContract.action(page,command)
        return when(command) {
            "PROJECT.SAVE" -> {
                val saved=invokeNoArg(activity,"saveCurrentProjectRevision") as StudioProjectPackage
                "CORE:PROJECT.SAVE • R${saved.revisionMeta.revision}"
            }
            "PROJECT.RECOVERY" -> {
                val file=invokeNoArg(activity,"localProjectFile") as File
                require(file.isFile){"no local project"}
                val pkg=StudioProjectRepository.load(file)
                invokeOne(activity,"applyProjectPackage",StudioProjectPackage::class.java,pkg)
                "CORE:PROJECT.RECOVERY • R${pkg.revisionMeta.revision}"
            }
            "SYNC.STATUS" -> {
                invokeNoArg(activity,"showProjectSyncResolution")
                "CORE:SYNC.STATUS • ProjectRevisionSync"
            }
            "PROJECT.AUTOSAVE" -> {
                val pkg=invokeNoArg(activity,"captureCurrentProject") as StudioProjectPackage
                val file=File(activity.filesDir,"formal-autosave.aigp")
                StudioProjectRepository.save(pkg,file)
                "CORE:PROJECT.AUTOSAVE • ${file.name}"
            }

            "CAD.LINE" -> { selectTool(activity,Tool.LINE);"CORE:CAD.LINE • REAL CAD TOOL ARMED" }
            "CAD.SELECT" -> { selectTool(activity,Tool.SELECT);"CORE:CAD.SELECT • REAL CAD SELECTION" }
            "CAD.SNAP" -> { val enabled=findCad(activity).toggleSnap();"CORE:CAD.SNAP • $enabled" }
            "CAD.UNDO" -> "CORE:CAD.UNDO • changed="+findCad(activity).undo()

            "CAM.AUTO" -> buildCam(activity,CamPathMode.AUTO,"CAM.AUTO")
            "CAM.MANUAL" -> buildCam(activity,CamPathMode.MANUAL,"CAM.MANUAL")
            "CAM.CONTOUR" -> buildCam(activity,null,"CAM.CONTOUR")
            "CAM.SAFE_Z" -> {
                val settings=readField<CamSettings>(activity,"camSettings") ?: error("CamSettings unavailable")
                require(settings.safeZ.isFinite() && settings.safeZ>0.0){"Safe-Z must be > 0"}
                invokeNoArg(activity,"showCamSettingsDialog")
                "CORE:CAM.SAFE_Z • Z=${CoordinatePrecisionRuntime.formatDisplay(settings.safeZ)}"
            }

            "SIM.MATERIAL_REMOVAL" -> {
                val cam=currentCam(activity)
                val snapshot=findCad(activity).snapshot()
                val stock=Stock3D.fromSnapshot(snapshot,10.0,20.0,if(cam.settings.pathMode==CamPathMode.MANUAL)cam.settings.manualPath else emptyList())
                val result=MaterialRemoval3D.simulate(cam.toolpaths,cam.settings,stock)
                "CORE:SIM.MATERIAL_REMOVAL • removed=${result.depth.count{it<0.0}}"
            }
            "SIM.COLLISION_CHECK" -> {
                val settings=readField<CamSettings>(activity,"camSettings") ?: error("CamSettings unavailable")
                val a=readField<Double>(activity,"axisA") ?: 0.0
                val b=readField<Double>(activity,"axisB") ?: 0.0
                val c=readField<Double>(activity,"axisC") ?: 0.0
                val fixtures=readField<MutableList<FixtureObstacle>>(activity,"camFixtures")?.toList() ?: emptyList()
                val assembly=readField<ToolAssemblyConfig>(activity,"camToolAssembly") ?: ToolAssemblyConfig()
                val result=Machining3DEngine.build(findCad(activity).snapshot(),settings,axisA=a,axisB=b,fixtures=fixtures,toolAssembly=assembly,axisC=c)
                "CORE:SIM.COLLISION_CHECK • removed=${result.removal.depth.count{it<0.0}}"
            }
            "SIM.SINGLE_BLOCK" -> {
                val cam=currentCam(activity)
                require(cam.toolpaths.isNotEmpty() && cam.toolpaths.first().moves.isNotEmpty()){"no CAM moves"}
                "CORE:SIM.SINGLE_BLOCK • REAL CAM MOVE 1/${cam.toolpaths.sumOf{it.moves.size}}"
            }
            "SIM.RESET" -> { writeField(activity,"camDerivedCache",null);"CORE:SIM.RESET • derived preview cleared" }

            "AXIS3.JOG_X" -> jog(activity,StudioAxisPageMode.AX3,StudioAxisChannel.X)
            "AXIS3.JOG_Z" -> jog(activity,StudioAxisPageMode.AX3,StudioAxisChannel.Z)
            "AXIS3.ZERO" -> zero(activity,StudioAxisPageMode.AX3)
            "AXIS3.PLAY" -> play(activity,"3AX")
            "AXIS4.JOG_A" -> jog(activity,StudioAxisPageMode.AX4,StudioAxisChannel.A)
            "AXIS4.JOG_X" -> jog(activity,StudioAxisPageMode.AX4,StudioAxisChannel.X)
            "AXIS4.ZERO" -> zero(activity,StudioAxisPageMode.AX4)
            "AXIS4.PLAY" -> play(activity,"4AX")
            "AXIS5.JOG_A" -> jog(activity,StudioAxisPageMode.AX5,StudioAxisChannel.A)
            "AXIS5.JOG_B" -> jog(activity,StudioAxisPageMode.AX5,StudioAxisChannel.B)
            "AXIS5.ZERO" -> zero(activity,StudioAxisPageMode.AX5)
            "AXIS5.PLAY" -> play(activity,"5AX")
            "AXIS6.JOG_A" -> jog(activity,StudioAxisPageMode.AX6,StudioAxisChannel.A)
            "AXIS6.JOG_B" -> jog(activity,StudioAxisPageMode.AX6,StudioAxisChannel.B)
            "AXIS6.JOG_C" -> jog(activity,StudioAxisPageMode.AX6,StudioAxisChannel.C)
            "AXIS6.PLAY" -> play(activity,"6AX")

            "NC.EDIT" -> { invokeNoArg(activity,"showNcEditDialog");"CORE:NC.EDIT • WORKING COPY" }
            "NC.PARSE" -> {
                val nc=ncText(activity);val trace=NcModalTracker.trace(nc)
                "CORE:NC.PARSE • modalEvents=${trace.size}"
            }
            "NC.VALIDATE" -> {
                val findings=NcProgramSafetyPolicy.blocking(ncText(activity))
                "CORE:NC.VALIDATE • blocking=${findings.size}"
            }
            "NC.POST" -> {
                val generated=FanucNc.generate(currentCam(activity))
                writeField(activity,"unifiedNcDraft",generated)
                "CORE:NC.POST • chars=${generated.length}"
            }

            "AI.CHECK" -> {
                val cam=currentCam(activity);val nc=ncText(activity)
                val findings=NcProgramSafetyPolicy.blocking(nc)
                "CORE:AI.CHECK • CAD=${findCad(activity).snapshot().entities.size} • CAM=${cam.toolpaths.size} • NC_BLOCK=${findings.size}"
            }
            "AI.READ_CAD" -> "CORE:AI.READ_CAD • entities=${findCad(activity).snapshot().entities.size}"
            "AI.READ_CAM" -> "CORE:AI.READ_CAM • toolpaths=${currentCam(activity).toolpaths.size}"
            "AI.READ_NC" -> "CORE:AI.READ_NC • chars=${ncText(activity).length}"

            "SETTINGS.PRECISION" -> {
                CoordinatePrecisionRuntime.configure(CoordinatePrecisionRuntime.display(),CoordinatePrecisionRuntime.input(),CoordinatePrecisionRuntime.ncOutput())
                invokeNoArg(activity,"showUserSettingsCenter")
                "CORE:SETTINGS.PRECISION • ${CoordinatePrecisionRuntime.summary()}"
            }
            "SETTINGS.FPS","SETTINGS.QUALITY","SETTINGS.HUD" -> {
                invokeNoArg(activity,"showEnvironmentSettings")
                "CORE:$command • RuntimeEnvironmentSettings"
            }
            else -> error("No Android formal core executor for $command")
        }
    }

    private fun buildCam(activity:Activity,pathMode:CamPathMode?,command:String):String {
        var settings=readField<CamSettings>(activity,"camSettings") ?: error("CamSettings unavailable")
        if(pathMode!=null && settings.pathMode!=pathMode) {
            settings=settings.copy(pathMode=pathMode)
            writeField(activity,"camSettings",settings)
        }
        val snapshot=findCad(activity).snapshot()
        val cam=CamModel.fromCad(System.nanoTime(),snapshot,settings)
        camCache[activity]=cam
        writeField(activity,"camDerivedStale",true)
        return "CORE:$command • toolpaths=${cam.toolpaths.size} • moves=${cam.toolpaths.sumOf{it.moves.size}}"
    }

    private fun currentCam(activity:Activity):CamModel = camCache[activity] ?: run {
        val settings=readField<CamSettings>(activity,"camSettings") ?: error("CamSettings unavailable")
        CamModel.fromCad(System.nanoTime(),findCad(activity).snapshot(),settings).also{camCache[activity]=it}
    }

    private fun jog(activity:Activity,mode:StudioAxisPageMode,channel:StudioAxisChannel):String {
        val runtime=axisRuntime(activity,mode)
        val result=runtime.jog(channel,0.001)
        syncAxisToActivity(activity,runtime.snapshot(),mode)
        return "CORE:${mode.name}.JOG_$channel • ${result.status} • MACHINE OUTPUT=OFF"
    }

    private fun zero(activity:Activity,mode:StudioAxisPageMode):String {
        val runtime=axisRuntime(activity,mode)
        val result=runtime.zero()
        syncAxisToActivity(activity,runtime.snapshot(),mode)
        return "CORE:${mode.name}.ZERO • ${result.status} • MACHINE OUTPUT=OFF"
    }

    private fun play(activity:Activity,mode:String):String {
        val settings=readField<CamSettings>(activity,"camSettings") ?: error("CamSettings unavailable")
        val state=axisState(activity)
        val fixtures=readField<MutableList<FixtureObstacle>>(activity,"camFixtures")?.toList() ?: emptyList()
        val assembly=readField<ToolAssemblyConfig>(activity,"camToolAssembly") ?: ToolAssemblyConfig()
        val result=Machining3DEngine.build(findCad(activity).snapshot(),settings,axisA=state.a,axisB=state.b,fixtures=fixtures,toolAssembly=assembly,axisC=state.c)
        return "CORE:$mode.PLAY • mesh=${result.mesh.triangles.size} • removed=${result.removal.depth.count{it<0.0}} • MACHINE OUTPUT=OFF"
    }

    private fun axisRuntime(activity:Activity,mode:StudioAxisPageMode):StudioAxisPageRuntime =
        StudioAxisPageRuntime(mode,axisState(activity))

    private fun axisState(activity:Activity):StudioAxisRuntimeState = axisState.getOrPut(activity) {
        StudioAxisRuntimeState(
            a=readField<Double>(activity,"axisA") ?: 0.0,
            b=readField<Double>(activity,"axisB") ?: 0.0,
            c=readField<Double>(activity,"axisC") ?: 0.0
        )
    }

    private fun syncAxisToActivity(activity:Activity,state:StudioAxisRuntimeState,mode:StudioAxisPageMode) {
        writeField(activity,"axisA",state.a);writeField(activity,"axisB",state.b);writeField(activity,"axisC",state.c)
        writeField(activity,"machiningAxisMode",when(mode){StudioAxisPageMode.AX3->"3AX";StudioAxisPageMode.AX4->"4AX";StudioAxisPageMode.AX5->"5AX";StudioAxisPageMode.AX6->"6AX"})
        runCatching{invokeOne(activity,"markCamDerivedStale",String::class.java,"AXIS PAGE JOG")}
    }

    private fun ncText(activity:Activity):String = readField<String>(activity,"unifiedNcDraft").orEmpty()
    private fun findCad(activity:Activity):CadView = readField<CadView>(activity,"cad") ?: error("CadView unavailable")
    private fun selectTool(activity:Activity,tool:Tool)=invokeOne(activity,"selectTool",Tool::class.java,tool)

    private fun surfaceColor(page:String,index:Int):Int {
        val colors=intArrayOf(StudioProductionTheme.accent,StudioProductionTheme.cutting,StudioProductionTheme.selected,StudioProductionTheme.warning)
        return colors[index.coerceIn(0,colors.lastIndex)]
    }

    private fun invokeNoArg(activity:Activity,name:String):Any? {
        val m=activity.javaClass.getDeclaredMethod(name);m.isAccessible=true;return m.invoke(activity)
    }
    private fun invokeOne(activity:Activity,name:String,type:Class<*>,value:Any?):Any? {
        val m=activity.javaClass.getDeclaredMethod(name,type);m.isAccessible=true;return m.invoke(activity,value)
    }
    @Suppress("UNCHECKED_CAST")
    private fun <T> readField(activity:Activity,name:String):T?=runCatching{
        val f=activity.javaClass.getDeclaredField(name);f.isAccessible=true;f.get(activity) as T
    }.getOrNull()
    private fun writeField(activity:Activity,name:String,value:Any?) {
        val f=activity.javaClass.getDeclaredField(name);f.isAccessible=true;f.set(activity,value)
    }
    private fun findByDescription(view:View,description:String):View? {
        if(view.contentDescription?.toString()==description)return view
        if(view is ViewGroup)for(i in 0 until view.childCount)findByDescription(view.getChildAt(i),description)?.let{return it}
        return null
    }
    private fun findContainsDescription(view:View,needle:String):View? {
        if(view.contentDescription?.toString()?.contains(needle)==true)return view
        if(view is ViewGroup)for(i in 0 until view.childCount)findContainsDescription(view.getChildAt(i),needle)?.let{return it}
        return null
    }
}
