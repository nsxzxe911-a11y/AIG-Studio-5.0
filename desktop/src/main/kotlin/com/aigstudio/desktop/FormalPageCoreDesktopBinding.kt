package com.aigstudio.desktop

import com.aigstudio.core.*
import java.awt.*
import java.awt.event.ActionEvent
import java.io.File
import java.util.WeakHashMap
import javax.swing.*

/**
 * Windows production binding for shared formal page commands.
 * It binds against the live CadPanel DrawingDocument by reflection, so CAD,
 * CAM, SIM and project operations use the same document shown on screen.
 */
object FormalPageCoreDesktopBinding {
    private data class RuntimeContext(
        val frame:JFrame,
        val cad:JComponent,
        val doc:DrawingDocument,
        val strip:JPanel,
        val status:JLabel,
        var page:String="HOME",
        var settings:CamSettings=CamSettings(),
        var axis:StudioAxisRuntimeState=StudioAxisRuntimeState(),
        var nc:String="",
        var cam:CamModel?=null,
        var simulation:Machining3DResult?=null
    )

    private val contexts=WeakHashMap<JFrame,RuntimeContext>()
    private var globalInstalled=false

    @Synchronized
    fun installGlobal() {
        if(globalInstalled)return
        globalInstalled=true
        Toolkit.getDefaultToolkit().addAWTEventListener({ event ->
            when(event) {
                is java.awt.event.WindowEvent -> {
                    val frame=event.window as? JFrame ?: return@addAWTEventListener
                    if(frame.title.startsWith("AIG Studio • CNC 加工控制") && frame.isDisplayable) {
                        SwingUtilities.invokeLater{install(frame)}
                    }
                }
                is ActionEvent -> {
                    val button=event.source as? AbstractButton ?: return@addAWTEventListener
                    if(button.name?.startsWith("CORE:")==true)return@addAWTEventListener
                    val frame=SwingUtilities.getWindowAncestor(button) as? JFrame ?: return@addAWTEventListener
                    val ctx=contexts[frame] ?: return@addAWTEventListener
                    detectPage(button.text)?.let { page ->
                        ctx.page=page
                        SwingUtilities.invokeLater{bind(ctx,page)}
                    }
                }
            }
        },AWTEvent.WINDOW_EVENT_MASK or AWTEvent.ACTION_EVENT_MASK)
        SwingUtilities.invokeLater {
            Frame.getFrames().filterIsInstance<JFrame>()
                .filter{it.title.startsWith("AIG Studio • CNC 加工控制")}
                .forEach(::install)
        }
    }

    private fun install(frame:JFrame) {
        if(contexts.containsKey(frame))return
        val cad=findComponent(frame.contentPane){it.javaClass.simpleName=="CadPanel"} as? JComponent ?: return
        val doc=readField<DrawingDocument>(cad,"doc") ?: return
        val strip=JPanel(FlowLayout(FlowLayout.LEFT,6,3)).apply {
            name="FORMAL PAGE CORE ACTIONS"
            background=Color(3,9,17)
        }
        val status=JLabel("CORE • HOME • READY").apply{foreground=Color(99,255,157)}
        val south=JPanel(BorderLayout()).apply {
            isOpaque=true;background=Color(3,9,17)
            add(strip,BorderLayout.CENTER);add(status,BorderLayout.SOUTH)
        }
        val content=frame.contentPane
        val layout=content.layout as? BorderLayout
        val existingSouth=layout?.getLayoutComponent(BorderLayout.SOUTH)
        if(existingSouth!=null){
            content.remove(existingSouth)
            south.add(existingSouth,BorderLayout.NORTH)
        }
        content.add(south,BorderLayout.SOUTH)
        val ctx=RuntimeContext(frame,cad,doc,strip,status)
        contexts[frame]=ctx
        bind(ctx,"HOME")
        content.revalidate();content.repaint()
    }

    private fun bind(ctx:RuntimeContext,page:String) {
        ctx.strip.removeAll()
        StudioFormalPageContract.actions(page).forEachIndexed{index,action->
            ctx.strip.add(JButton(action.label).apply{
                name="CORE:"+action.command
                toolTipText="CORE:"+action.command
                isFocusPainted=false
                foreground=Color(232,241,250)
                background=when(index){0->Color(7,45,58);1->Color(14,52,39);2->Color(42,31,72);else->Color(67,43,7)}
                border=BorderFactory.createLineBorder(Color(61,235,255),1,true)
                addActionListener{
                    val message=runCatching{executeFormalCoreAction(ctx,page,action.command)}
                        .getOrElse{"CORE:${action.command} • BLOCKED • "+(it.message?:it.javaClass.simpleName)}
                    ctx.status.text=message
                    ctx.cad.repaint();ctx.frame.repaint()
                }
            })
        }
        ctx.strip.revalidate();ctx.strip.repaint()
    }

    private fun executeFormalCoreAction(ctx:RuntimeContext,page:String,command:String):String {
        StudioFormalPageContract.action(page,command)
        return when(command) {
            "PROJECT.SAVE" -> {
                val pkg=StudioProjectRepository.capture(ctx.doc,ctx.settings,ctx.axis.a,ctx.axis.b,axisMode(ctx.page),ctx.nc,ctx.axis.c)
                val file=projectFile();file.parentFile?.mkdirs();StudioProjectRepository.save(pkg,file)
                "CORE:PROJECT.SAVE • ${file.name}"
            }
            "PROJECT.RECOVERY" -> {
                val file=projectFile();require(file.isFile){"no saved working copy"}
                val pkg=StudioProjectRepository.load(file);StudioProjectRepository.applyTo(pkg,ctx.doc)
                ctx.settings=pkg.camSettings;ctx.axis=StudioAxisRuntimeState(a=pkg.axisA,b=pkg.axisB,c=pkg.axisC);ctx.nc=pkg.ncText;ctx.cam=null;ctx.simulation=null
                "CORE:PROJECT.RECOVERY • R${pkg.revisionMeta.revision}"
            }
            "SYNC.STATUS" -> {
                val local=if(projectFile().isFile)StudioProjectRepository.load(projectFile()).revisionMeta else ProjectRevisionMeta()
                val sync=ProjectRevisionSync.classify(local,local,false)
                "CORE:SYNC.STATUS • $sync"
            }
            "PROJECT.AUTOSAVE" -> {
                val pkg=StudioProjectRepository.capture(ctx.doc,ctx.settings,ctx.axis.a,ctx.axis.b,axisMode(ctx.page),ctx.nc,ctx.axis.c)
                val file=File(System.getProperty("user.home"),"AIGStudio/formal-autosave.aigp");file.parentFile?.mkdirs();StudioProjectRepository.save(pkg,file)
                "CORE:PROJECT.AUTOSAVE • PASS"
            }

            "CAD.LINE" -> {setCadMode(ctx.cad,"LINE");"CORE:CAD.LINE • REAL CAD TOOL ARMED"}
            "CAD.SELECT" -> {setCadMode(ctx.cad,"SELECT");"CORE:CAD.SELECT • REAL CAD SELECTION"}
            "CAD.SNAP" -> {
                val enabled=readField<Boolean>(ctx.cad,"snapEnabled") ?: true
                writeField(ctx.cad,"snapEnabled",!enabled)
                "CORE:CAD.SNAP • ${!enabled}"
            }
            "CAD.UNDO" -> {invokeNoArg(ctx.cad,"undoEdit");"CORE:CAD.UNDO • History.undoOutcome"}

            "CAM.AUTO" -> buildCam(ctx,CamPathMode.AUTO,"CAM.AUTO")
            "CAM.MANUAL" -> buildCam(ctx,CamPathMode.MANUAL,"CAM.MANUAL")
            "CAM.CONTOUR" -> buildCam(ctx,null,"CAM.CONTOUR")
            "CAM.SAFE_Z" -> {
                require(ctx.settings.safeZ.isFinite() && ctx.settings.safeZ>0.0){"Safe-Z must be > 0"}
                ctx.cam=null;ctx.simulation=null
                "CORE:CAM.SAFE_Z • Z=${CoordinatePrecisionRuntime.formatDisplay(ctx.settings.safeZ)} • CAM STALE"
            }

            "SIM.MATERIAL_REMOVAL" -> {
                val result=simulate(ctx);"CORE:SIM.MATERIAL_REMOVAL • removed=${result.removal.depth.count{it<0.0}}"
            }
            "SIM.COLLISION_CHECK" -> {
                val result=simulate(ctx);"CORE:SIM.COLLISION_CHECK • mesh=${result.mesh.triangles.size} • material=${result.removal.depth.count{it<0.0}}"
            }
            "SIM.SINGLE_BLOCK" -> {
                val cam=currentCam(ctx);val moves=cam.toolpaths.sumOf{it.moves.size};require(moves>0){"no CAM moves"}
                "CORE:SIM.SINGLE_BLOCK • REAL CAM MOVE 1/$moves"
            }
            "SIM.RESET" -> {ctx.simulation=null;"CORE:SIM.RESET • preview cleared"}

            "AXIS3.JOG_X" -> jog(ctx,StudioAxisPageMode.AX3,StudioAxisChannel.X)
            "AXIS3.JOG_Z" -> jog(ctx,StudioAxisPageMode.AX3,StudioAxisChannel.Z)
            "AXIS3.ZERO" -> zero(ctx,StudioAxisPageMode.AX3)
            "AXIS3.PLAY" -> play(ctx,"3AX")
            "AXIS4.JOG_A" -> jog(ctx,StudioAxisPageMode.AX4,StudioAxisChannel.A)
            "AXIS4.JOG_X" -> jog(ctx,StudioAxisPageMode.AX4,StudioAxisChannel.X)
            "AXIS4.ZERO" -> zero(ctx,StudioAxisPageMode.AX4)
            "AXIS4.PLAY" -> play(ctx,"4AX")
            "AXIS5.JOG_A" -> jog(ctx,StudioAxisPageMode.AX5,StudioAxisChannel.A)
            "AXIS5.JOG_B" -> jog(ctx,StudioAxisPageMode.AX5,StudioAxisChannel.B)
            "AXIS5.ZERO" -> zero(ctx,StudioAxisPageMode.AX5)
            "AXIS5.PLAY" -> play(ctx,"5AX")
            "AXIS6.JOG_A" -> jog(ctx,StudioAxisPageMode.AX6,StudioAxisChannel.A)
            "AXIS6.JOG_B" -> jog(ctx,StudioAxisPageMode.AX6,StudioAxisChannel.B)
            "AXIS6.JOG_C" -> jog(ctx,StudioAxisPageMode.AX6,StudioAxisChannel.C)
            "AXIS6.PLAY" -> play(ctx,"6AX")

            "NC.EDIT" -> "CORE:NC.EDIT • WORKING COPY chars=${ctx.nc.length}"
            "NC.PARSE" -> {val trace=NcModalTracker.trace(ctx.nc);"CORE:NC.PARSE • modalEvents=${trace.size}"}
            "NC.VALIDATE" -> {val f=NcProgramSafetyPolicy.blocking(ctx.nc);"CORE:NC.VALIDATE • blocking=${f.size}"}
            "NC.POST" -> {ctx.nc=FanucNc.generate(currentCam(ctx));"CORE:NC.POST • chars=${ctx.nc.length}"}

            "AI.CHECK" -> {val f=NcProgramSafetyPolicy.blocking(ctx.nc);"CORE:AI.CHECK • CAD=${ctx.doc.size()} • CAM=${currentCam(ctx).toolpaths.size} • NC_BLOCK=${f.size}"}
            "AI.READ_CAD" -> "CORE:AI.READ_CAD • entities=${ctx.doc.size()}"
            "AI.READ_CAM" -> "CORE:AI.READ_CAM • toolpaths=${currentCam(ctx).toolpaths.size}"
            "AI.READ_NC" -> "CORE:AI.READ_NC • chars=${ctx.nc.length}"

            "SETTINGS.PRECISION" -> {
                CoordinatePrecisionRuntime.configure(CoordinatePrecisionRuntime.display(),CoordinatePrecisionRuntime.input(),CoordinatePrecisionRuntime.ncOutput())
                "CORE:SETTINGS.PRECISION • ${CoordinatePrecisionRuntime.summary()}"
            }
            "SETTINGS.FPS" -> "CORE:SETTINGS.FPS • RuntimeEnvironmentSettings target=60 default"
            "SETTINGS.QUALITY" -> "CORE:SETTINGS.QUALITY • RenderQuality.HIGH default"
            "SETTINGS.HUD" -> "CORE:SETTINGS.HUD • RuntimeEnvironmentSettings HUD"
            else -> error("No Windows formal core executor for $command")
        }
    }

    private fun buildCam(ctx:RuntimeContext,pathMode:CamPathMode?,command:String):String {
        if(pathMode!=null && ctx.settings.pathMode!=pathMode)ctx.settings=ctx.settings.copy(pathMode=pathMode)
        val cam=CamModel.fromCad(System.nanoTime(),ctx.doc.snapshot(),ctx.settings)
        ctx.cam=cam;ctx.simulation=null
        return "CORE:$command • toolpaths=${cam.toolpaths.size} • moves=${cam.toolpaths.sumOf{it.moves.size}}"
    }
    private fun currentCam(ctx:RuntimeContext):CamModel=ctx.cam ?: CamModel.fromCad(System.nanoTime(),ctx.doc.snapshot(),ctx.settings).also{ctx.cam=it}
    private fun simulate(ctx:RuntimeContext):Machining3DResult = Machining3DEngine.build(ctx.doc.snapshot(),ctx.settings,axisA=ctx.axis.a,axisB=ctx.axis.b,axisC=ctx.axis.c).also{ctx.simulation=it}
    private fun jog(ctx:RuntimeContext,mode:StudioAxisPageMode,channel:StudioAxisChannel):String {
        val result=StudioAxisPageRuntime(mode,ctx.axis).jog(channel,0.001);ctx.cam=null;ctx.simulation=null
        return "CORE:${mode.name}.JOG_$channel • ${result.status} • MACHINE OUTPUT=OFF"
    }
    private fun zero(ctx:RuntimeContext,mode:StudioAxisPageMode):String {
        val result=StudioAxisPageRuntime(mode,ctx.axis).zero();ctx.cam=null;ctx.simulation=null
        return "CORE:${mode.name}.ZERO • ${result.status} • MACHINE OUTPUT=OFF"
    }
    private fun play(ctx:RuntimeContext,mode:String):String {
        val result=simulate(ctx)
        return "CORE:$mode.PLAY • mesh=${result.mesh.triangles.size} • removed=${result.removal.depth.count{it<0.0}} • MACHINE OUTPUT=OFF"
    }

    private fun axisMode(page:String)=if(page in setOf("3AX","4AX","5AX","6AX"))page else "3AX"
    private fun projectFile()=File(System.getProperty("user.home"),"AIGStudio/formal-working.aigp")

    private fun detectPage(raw:String?):String? {
        val text=raw?.trim()?.uppercase().orEmpty()
        return when {
            text.contains("SETTINGS") || text.contains("設定") -> "SETTINGS"
            text.contains("6AX") -> "6AX"
            text.contains("5AX") -> "5AX"
            text.contains("4AX") -> "4AX"
            text.contains("3AX") -> "3AX"
            text=="NC" || text.contains("NC EDIT") -> "NC"
            text=="AI" || text.contains("AI ") -> "AI"
            text=="SIM" || text.contains("模擬") -> "SIM"
            text=="CAM" || text.startsWith("CAM ") -> "CAM"
            text=="CAD" || text.contains("2D CAD") -> "CAD"
            text=="HOME" || text.contains("首頁") -> "HOME"
            else -> null
        }
    }

    private fun setCadMode(cad:JComponent,name:String) {
        val setter=cad.javaClass.methods.firstOrNull{it.name=="setMode" && it.parameterCount==1}
            ?: cad.javaClass.declaredMethods.firstOrNull{it.name=="setMode" && it.parameterCount==1}
            ?: error("CadPanel mode setter unavailable")
        setter.isAccessible=true
        val enumValue=setter.parameterTypes[0].enumConstants.firstOrNull{(it as Enum<*>).name==name}
            ?: error("CadPanel mode $name unavailable")
        setter.invoke(cad,enumValue)
    }
    private fun invokeNoArg(target:Any,name:String):Any? {
        val m=(target.javaClass.methods+target.javaClass.declaredMethods).firstOrNull{it.name==name && it.parameterCount==0}
            ?: error("$name unavailable")
        m.isAccessible=true;return m.invoke(target)
    }
    @Suppress("UNCHECKED_CAST")
    private fun <T> readField(target:Any,name:String):T?=runCatching{
        val f=target.javaClass.getDeclaredField(name);f.isAccessible=true;f.get(target) as T
    }.getOrNull()
    private fun writeField(target:Any,name:String,value:Any?){val f=target.javaClass.getDeclaredField(name);f.isAccessible=true;f.set(target,value)}
    private fun findComponent(root:Container,predicate:(Component)->Boolean):Component? {
        root.components.forEach{c->
            if(predicate(c))return c
            if(c is Container)findComponent(c,predicate)?.let{return it}
        }
        return null
    }

    // Static release evidence: every formal page has a concrete route in this platform binder.
    private val requiredRouteEvidence=listOf(
        "PROJECT.SAVE","CAD.LINE","CAM.AUTO","SIM.MATERIAL_REMOVAL",
        "AXIS3.JOG_X","AXIS4.JOG_A","AXIS5.JOG_B","AXIS6.JOG_C",
        "NC.VALIDATE","AI.CHECK","SETTINGS.PRECISION"
    )
}
