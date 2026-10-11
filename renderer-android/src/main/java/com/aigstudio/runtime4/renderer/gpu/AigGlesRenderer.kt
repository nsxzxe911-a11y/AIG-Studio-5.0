package com.aigstudio.runtime4.renderer.gpu

import android.content.Context
import android.opengl.GLES30
import android.opengl.GLSurfaceView
import android.util.Log
import com.aigstudio.runtime4.contract.*
import com.aigstudio.runtime4.renderer.*
import javax.microedition.khronos.egl.EGLConfig
import javax.microedition.khronos.opengles.GL10
import kotlin.math.*
import java.util.concurrent.ConcurrentHashMap

class AigGlesRenderer(
    private val context:Context,
    cadRuntime:CadRuntimePort,
    camRuntime:CamRuntimePort,
    ncRuntime:NcRuntimePort?,
    axisRuntime:AxisRuntimePort,
    simRuntime:SimRuntimePort?,
    aiRuntime:AiRuntimePort?,
    private val sceneRouter:SceneRouter,
    private val cadController:CadSceneController,
    private val camController:CamSceneController,
    private val ncController:NcSceneController?,
    private val productDeckController:ProductControlDeckController?,
    private val firstFrameSignal:FirstFrameSignal?=null,
):GLSurfaceView.Renderer {
    val stateSource=RendererStateSource(cadRuntime)
    val camStateSource=CamRendererStateSource(camRuntime)
    val ncStateSource=ncRuntime?.let(::NcRendererStateSource)
    val axisStateSource=AxisRendererStateSource(axisRuntime)
    val simStateSource=simRuntime
    val aiStateSource=aiRuntime
    private val simSceneController=simRuntime?.let(::SimSceneController)
    private val aiSceneController=aiRuntime?.let(::AiSceneController)
    private val axisSceneRenderer=AxisGlesSceneRenderer(axisStateSource)
    @Volatile var pressedNodeId:String?=null
    @Volatile var cadImageMapEnabled:Boolean=false
    @Volatile var camImageMapEnabled:Boolean=false
    @Volatile var simImageMapEnabled:Boolean=false
    @Volatile var cadRibbonPageIndex:Int=0
    private val toolPageIndexes=ConcurrentHashMap<PageId,Int>()
    fun setToolPageIndex(page:PageId,index:Int){ toolPageIndexes[page]=index.coerceAtLeast(0) }
    private var widthPx=1f; private var heightPx=1f
    private val density=context.resources.displayMetrics.density
    private var program:GlesProgram?=null; private var program3d:Gles3dProgram?=null; private var textures:RgbTextureCatalog?=null; private var firstFrameLogged=false; private var simFirstFrameLogged=false; private var aiFirstFrameLogged=false
    private val pageSurfaceLogged=mutableSetOf<PageId>()

    override fun onSurfaceCreated(gl:GL10?,config:EGLConfig?){
        program?.release();program3d?.release();textures?.release();program=GlesProgram();program3d=Gles3dProgram();textures=RgbTextureCatalog(context)
        GLES30.glEnable(GLES30.GL_BLEND);GLES30.glBlendFunc(GLES30.GL_SRC_ALPHA,GLES30.GL_ONE_MINUS_SRC_ALPHA)
        Log.i("AIG4","AIG4_GLES|VERSION|${GLES30.glGetString(GLES30.GL_VERSION)}")
    }
    override fun onSurfaceChanged(gl:GL10?,width:Int,height:Int){widthPx=max(1,width).toFloat();heightPx=max(1,height).toFloat();GLES30.glViewport(0,0,width,height)}
    override fun onDrawFrame(gl:GL10?){
        val p=program?:return
        GLES30.glViewport(0,0,widthPx.toInt(),heightPx.toInt())
        GLES30.glClearColor(0.004f,0.02f,0.04f,1f);GLES30.glClear(GLES30.GL_COLOR_BUFFER_BIT or GLES30.GL_DEPTH_BUFFER_BIT)
        when(RenderRoutePolicy.forScene(sceneRouter.current)){
            FourthRenderRoute.HOME->drawHome(p)
            FourthRenderRoute.CAD->drawCad(p)
            FourthRenderRoute.CAM->drawCam(p)
            FourthRenderRoute.SIM->drawSim(p)
            FourthRenderRoute.MULTIFUNCTION->drawMultifunction(p)
            FourthRenderRoute.AXIS3->if(PageSurfaceTexturePlan.path(PageId.AXIS3)==null) program3d?.let{p3->axisSceneRenderer.drawAxis3(p,p3,textures,widthPx,heightPx,density,{node->drawNode(p,node)})}
            FourthRenderRoute.AXIS4->if(PageSurfaceTexturePlan.path(PageId.AXIS4)==null) program3d?.let{p3->axisSceneRenderer.drawAxis4(p,p3,textures,widthPx,heightPx,density,{node->drawNode(p,node)})}
            FourthRenderRoute.AXIS5->if(PageSurfaceTexturePlan.path(PageId.AXIS5)==null) program3d?.let{p3->axisSceneRenderer.drawAxis5(p,p3,textures,widthPx,heightPx,density,{node->drawNode(p,node)})}
            FourthRenderRoute.AXIS6->if(PageSurfaceTexturePlan.path(PageId.AXIS6)==null) program3d?.let{p3->axisSceneRenderer.drawAxis6(p,p3,textures,widthPx,heightPx,density,{node->drawNode(p,node)})}
            FourthRenderRoute.NC->drawNc(p)
            FourthRenderRoute.AI->drawAi(p)
            FourthRenderRoute.UNAVAILABLE->drawUnavailable(p,sceneRouter.current)
        }
        productDeckController?.nodes(sceneRouter.current.toPageId(),widthPx,heightPx,density)?.forEach{drawNode(p,it)}
        drawPageSurfaceOverlay(p,sceneRouter.current.toPageId())
        drawUnifiedMobileChrome(p,sceneRouter.current.toPageId())
        if(!firstFrameLogged){GLES30.glFinish();Log.i("AIG4","AIG4_GLES|FIRST_FRAME|PASS");firstFrameLogged=true;firstFrameSignal?.fireOnce()}
    }

    private fun unifiedToolSource(page:PageId):List<SceneNode> = when(page){
        PageId.CAM->camController.nodes(widthPx,heightPx,density)
        PageId.SIM->simSceneController?.nodes(widthPx,heightPx,density) ?: SimSceneLayout.nodes(widthPx,heightPx,density)
        PageId.NC->ncController?.nodes(widthPx,heightPx,density) ?: NcSceneLayout.nodes(widthPx,heightPx,density,ncStateSource?.snapshotForFrame() ?: NcState.initial())
        PageId.AI->aiSceneController?.nodes(widthPx,heightPx,density) ?: AiSceneLayout.nodes(widthPx,heightPx,density)
        else->emptyList()
    }

    private fun drawUnifiedMobileChrome(p:GlesProgram,page:PageId){
        if(PageSurfaceTexturePlan.path(page)!=null)return
        val source=unifiedToolSource(page)
        val index=toolPageIndexes[page] ?: 0
        val tools=UnifiedMobileControlShell.toolRibbonNodes(source,page,widthPx,heightPx,density,index)
        if(tools.isNotEmpty()){
            val panel=UnifiedMobileControlShell.toolPanelBounds(widthPx,heightPx,density)
            p.draw(GlesGeometryBuffer.quad(panel),GLES30.GL_TRIANGLES,widthPx,heightPx,floatArrayOf(0.006f,0.025f,0.050f,0.94f))
            drawRgbFrame(p,panel,VisualState.NORMAL,(1.2f*density).coerceAtLeast(1f))
            tools.forEach{drawNode(p,it)}
        }
        GlobalPageRibbon.layout(widthPx,heightPx,density,page).buttons.forEach{drawNode(p,it)}
    }

    private fun drawPageSurfaceOverlay(p:GlesProgram,page:PageId){
        val path=PageSurfaceTexturePlan.path(page)
        val textureId=path?.let{textures?.texture(it)}
        val full=UiBounds(0f,0f,widthPx,heightPx)
        p.draw(GlesGeometryBuffer.quad(full),GLES30.GL_TRIANGLES,widthPx,heightPx,floatArrayOf(0f,0f,0f,1f))
        if(textureId!=null){
            val (referenceWidth,referenceHeight)=PageSurfaceTexturePlan.imageSize(page) ?: (widthPx to heightPx)
            val imageBounds=AdaptivePageTransform.forViewport(referenceWidth,referenceHeight,widthPx,heightPx).bounds
            p.draw(GlesGeometryBuffer.quad(imageBounds),GLES30.GL_TRIANGLES,widthPx,heightPx,floatArrayOf(1f,1f,1f,1f),textureId)
            drawImageBackedRuntimeOverlay(p,page)
            drawPressedImageButtonFeedback(p,page)
            if(pageSurfaceLogged.add(page)) Log.i("AIG4","RGB_PAGE_TOP|${page.name}|PASS|$path|FIT=ADAPTIVE_FULL")
            return
        }
        val h=(42f*density).coerceAtMost(heightPx)
        val band=UiBounds(0f,(heightPx-h)/2f,widthPx,(heightPx+h)/2f)
        p.draw(GlesGeometryBuffer.quad(band),GLES30.GL_TRIANGLES,widthPx,heightPx,floatArrayOf(0.34f,0.03f,0.02f,1f))
        textures?.labelTextureRef("MISSING_PAGE_ART | ${page.name}")?.let{tex->
            val fitted=LabelTextureLayout.contain(band,tex.aspectRatio,4f*density,true)
            p.draw(GlesGeometryBuffer.quad(fitted),GLES30.GL_TRIANGLES,widthPx,heightPx,floatArrayOf(1f,1f,1f,1f),tex.id)
        }
        if(pageSurfaceLogged.add(page)) Log.w("AIG4","RGB_PAGE_TOP|${page.name}|MISSING_PAGE_ART")
    }

    private fun primaryNavigationNodes(page:PageId):List<RgbGlassButtonNode> =
        PrimaryPageNavigationLayout.nodes(widthPx,heightPx,page)

    private fun imageInteractionNodes(page:PageId):List<RgbGlassButtonNode> = when(page){
        PageId.HOME->primaryNavigationNodes(page)
        PageId.CAD->primaryNavigationNodes(page)+CadImageInteractionLayout.nodes(widthPx,heightPx).filterIsInstance<RgbGlassButtonNode>()
        PageId.CAM->primaryNavigationNodes(page)+CamImageInteractionLayout.nodes(widthPx,heightPx,camStateSource.snapshotForFrame()).filterIsInstance<RgbGlassButtonNode>().filterNot{it.id.startsWith("IMG.")}
        PageId.SIM->primaryNavigationNodes(page)+SimImageInteractionLayout.nodes(widthPx,heightPx).filterIsInstance<RgbGlassButtonNode>().filterNot{it.id.startsWith("IMG.")}
        PageId.AXIS3,PageId.AXIS4,PageId.AXIS5,PageId.AXIS6,PageId.NC,PageId.AI->primaryNavigationNodes(page)
        else->emptyList()
    }

    private fun drawImageBackedRuntimeOverlay(p:GlesProgram,page:PageId){
        when(page){
            PageId.CAM->drawCamImageLiveOverlay(p)
            PageId.SIM->if(simImageMapEnabled) drawSimImageLiveOverlay(p)
            PageId.AXIS3,PageId.AXIS4,PageId.AXIS5,PageId.AXIS6->drawAxisImageLiveOverlay(p,page)
            PageId.NC->drawNcImageLiveOverlay(p)
            PageId.AI->drawAiImageLiveOverlay(p)
            else->Unit
        }
    }

    private fun drawAxisImageLiveOverlay(p:GlesProgram,page:PageId){
        val viewport=AxisImageRuntimeLayout.viewport(page,widthPx,heightPx) ?: return
        val p3=program3d ?: return
        when(page){
            PageId.AXIS3->axisSceneRenderer.drawAxis3(p,p3,textures,widthPx,heightPx,density,{node->drawNode(p,node)},viewportOverride=viewport,drawControls=false)
            PageId.AXIS4->axisSceneRenderer.drawAxis4(p,p3,textures,widthPx,heightPx,density,{node->drawNode(p,node)},viewportOverride=viewport,drawControls=false)
            PageId.AXIS5->axisSceneRenderer.drawAxis5(p,p3,textures,widthPx,heightPx,density,{node->drawNode(p,node)},viewportOverride=viewport,drawControls=false)
            PageId.AXIS6->axisSceneRenderer.drawAxis6(p,p3,textures,widthPx,heightPx,density,{node->drawNode(p,node)},viewportOverride=viewport,drawControls=false)
            else->Unit
        }
    }

    private fun drawNcImageLiveOverlay(p:GlesProgram){
        val state=ncStateSource?.snapshotForFrame() ?: return
        val plan=NcImageLiveOverlayPlan.build(state,widthPx,heightPx)
        p.draw(GlesGeometryBuffer.quad(plan.editor),GLES30.GL_TRIANGLES,widthPx,heightPx,floatArrayOf(0.002f,0.012f,0.022f,0.98f))
        val lineH=(23f*density).coerceAtLeast(18f)
        val maxLines=kotlin.math.max(1,kotlin.math.floor(plan.editor.height/lineH).toInt())
        val cursorIndex=(plan.cursorLine-1).coerceAtLeast(0)
        val start=(cursorIndex-maxLines/2).coerceIn(0,kotlin.math.max(0,plan.lines.size-maxLines))
        plan.lines.drop(start).take(maxLines).forEachIndexed{row,label->
            val top=plan.editor.top+row*lineH
            val box=UiBounds(plan.editor.left+6f*density,top,plan.editor.right-6f*density,(top+lineH).coerceAtMost(plan.editor.bottom))
            if(start+row==cursorIndex)p.draw(GlesGeometryBuffer.quad(box),GLES30.GL_TRIANGLES,widthPx,heightPx,floatArrayOf(0.04f,0.22f,0.34f,0.90f))
            textures?.labelTextureRef(label)?.let{tex->
                val fitted=LabelTextureLayout.contain(box,tex.aspectRatio,1.5f*density,true)
                p.draw(GlesGeometryBuffer.quad(fitted),GLES30.GL_TRIANGLES,widthPx,heightPx,floatArrayOf(0.86f,0.99f,1f,0.98f),tex.id)
            }
        }
        p.draw(GlesGeometryBuffer.quad(plan.statusPanel),GLES30.GL_TRIANGLES,widthPx,heightPx,floatArrayOf(0.002f,0.014f,0.026f,0.96f))
        val statusBox=UiBounds(plan.statusPanel.left+8f*density,plan.statusPanel.top+8f*density,plan.statusPanel.right-8f*density,(plan.statusPanel.top+42f*density).coerceAtMost(plan.statusPanel.bottom))
        textures?.labelTextureRef(plan.status)?.let{tex->
            val fitted=LabelTextureLayout.contain(statusBox,tex.aspectRatio,2f*density,true)
            p.draw(GlesGeometryBuffer.quad(fitted),GLES30.GL_TRIANGLES,widthPx,heightPx,floatArrayOf(0.92f,0.99f,1f,0.98f),tex.id)
        }
    }

    private fun drawAiImageLiveOverlay(p:GlesProgram){
        val plan=AiImageLiveOverlayPlan.build(aiStateSource?.snapshot(),widthPx,heightPx)
        p.draw(GlesGeometryBuffer.quad(plan.panel),GLES30.GL_TRIANGLES,widthPx,heightPx,floatArrayOf(0.002f,0.014f,0.028f,0.97f))
        val rowH=(48f*density).coerceAtMost(plan.panel.height/(plan.rows.size.coerceAtLeast(1)))
        plan.rows.forEachIndexed{index,label->
            val top=plan.panel.top+10f*density+index*rowH
            if(top<plan.panel.bottom){
                val box=UiBounds(plan.panel.left+10f*density,top,plan.panel.right-10f*density,(top+rowH-4f*density).coerceAtMost(plan.panel.bottom))
                textures?.labelTextureRef(label)?.let{tex->
                    val fitted=LabelTextureLayout.contain(box,tex.aspectRatio,2f*density,true)
                    p.draw(GlesGeometryBuffer.quad(fitted),GLES30.GL_TRIANGLES,widthPx,heightPx,floatArrayOf(0.88f,0.98f,1f,0.98f),tex.id)
                }
            }
        }
    }

    private fun drawCamImageLiveOverlay(p:GlesProgram){
        if(!camImageMapEnabled)return
        val state=camStateSource.snapshotForFrame()
        val plan=CamImageLiveOverlayPlan.build(state,widthPx,heightPx)
        val viewport=CamViewportNode(plan.viewport)
        p.draw(GlesGeometryBuffer.quad(plan.viewport),GLES30.GL_TRIANGLES,widthPx,heightPx,floatArrayOf(0.002f,0.012f,0.020f,0.18f))
        drawCamPath(p,viewport,plan.activePoints,floatArrayOf(0.10f,0.98f,1f,1f),3.2f)
        drawCamPath(p,viewport,plan.candidatePoints,floatArrayOf(1f,0.68f,0.16f,0.92f),2.2f)

        p.draw(GlesGeometryBuffer.quad(plan.pointPanel),GLES30.GL_TRIANGLES,widthPx,heightPx,floatArrayOf(0.003f,0.018f,0.032f,0.96f))
        val pointHeader=UiBounds(plan.pointPanel.left+4f*density,plan.pointPanel.top+4f*density,plan.pointPanel.right-4f*density,plan.pointPanel.top+28f*density)
        textures?.labelTextureRef(plan.pointStatus)?.let{tex->
            val fitted=LabelTextureLayout.contain(pointHeader,tex.aspectRatio,2f*density,true)
            p.draw(GlesGeometryBuffer.quad(fitted),GLES30.GL_TRIANGLES,widthPx,heightPx,floatArrayOf(0.90f,0.98f,1f,0.98f),tex.id)
        }
        val shown=if(plan.activePoints.isNotEmpty())plan.activePoints else plan.candidatePoints
        shown.take(8).forEachIndexed{index,pt->
            val rowTop=pointHeader.bottom+index*25f*density
            if(rowTop+23f*density<=plan.pointPanel.bottom){
                val row=UiBounds(plan.pointPanel.left+6f*density,rowTop,plan.pointPanel.right-6f*density,rowTop+23f*density)
                val label=String.format(java.util.Locale.US,"%02d %s X%.3f Y%.3f Z%.3f A%.2f B%.2f C%.2f",index,pt.motion.name,pt.x,pt.y,pt.z,pt.a,pt.b,pt.c)
                textures?.labelTextureRef(label)?.let{tex->
                    val fitted=LabelTextureLayout.contain(row,tex.aspectRatio,1f*density,true)
                    p.draw(GlesGeometryBuffer.quad(fitted),GLES30.GL_TRIANGLES,widthPx,heightPx,floatArrayOf(0.78f,0.98f,1f,0.96f),tex.id)
                }
            }
        }

        val strategy=state.strategy
        val values=linkedMapOf(
            "CAM.TOOL" to "T${strategy.toolNumber}",
            "CAM.DIAMETER" to String.format(java.util.Locale.US,"%.3f mm",strategy.toolDiameterMm),
            "CAM.FEED" to String.format(java.util.Locale.US,"%.1f mm/min",strategy.feedMmMin),
            "CAM.SPEED" to String.format(java.util.Locale.US,"%.0f rpm",strategy.spindleRpm),
            "CAM.DEPTH" to String.format(java.util.Locale.US,"%.3f mm",strategy.depthMm),
            "CAM.SIDE" to strategy.side.name,
            "CAM.DIRECTION" to strategy.direction.name,
            "CAM.SAFE_Z" to String.format(java.util.Locale.US,"SAFE-Z %.3f mm",strategy.safeZMm),
        )
        values.forEach{(id,text)->
            val rect=CamImagePixelManifest.controls[id] ?: return@forEach
            val box=ImagePixelMapper.pixelRectToScreen(CamImagePixelManifest.spec,widthPx,heightPx,rect)
            p.draw(GlesGeometryBuffer.quad(box),GLES30.GL_TRIANGLES,widthPx,heightPx,floatArrayOf(0.003f,0.020f,0.035f,0.96f))
            textures?.labelTextureRef(text)?.let{tex->
                val fitted=LabelTextureLayout.contain(box,tex.aspectRatio,4f*density,false)
                p.draw(GlesGeometryBuffer.quad(fitted),GLES30.GL_TRIANGLES,widthPx,heightPx,floatArrayOf(0.92f,0.99f,1f,0.98f),tex.id)
            }
        }

        if("CAM.AVOID" in CamImagePixelManifest.controls){
            val avoidData=UiBounds(
                plan.avoidancePanel.left+5f*density,
                plan.avoidancePanel.top+plan.avoidancePanel.height*0.23f,
                plan.avoidancePanel.right-5f*density,
                plan.avoidancePanel.bottom-plan.avoidancePanel.height*0.20f,
            )
            p.draw(GlesGeometryBuffer.quad(avoidData),GLES30.GL_TRIANGLES,widthPx,heightPx,floatArrayOf(0.003f,0.020f,0.035f,0.93f))
            val avoidLines=listOf(
                plan.avoidanceStatus,
                String.format(java.util.Locale.US,"LEAD IN %.3f | OUT %.3f",strategy.leadInMm,strategy.leadOutMm),
                state.message?.let{"${it.severity.name}: ${it.text}"}.orEmpty(),
            ).filter{it.isNotBlank()}
            avoidLines.forEachIndexed{index,label->
                val rowH=(avoidData.height/avoidLines.size.coerceAtLeast(1)).coerceAtMost(28f*density)
                val row=UiBounds(avoidData.left+3f*density,avoidData.top+index*rowH,avoidData.right-3f*density,(avoidData.top+(index+1)*rowH).coerceAtMost(avoidData.bottom))
                textures?.labelTextureRef(label)?.let{tex->
                    val fitted=LabelTextureLayout.contain(row,tex.aspectRatio,2f*density,true)
                    p.draw(GlesGeometryBuffer.quad(fitted),GLES30.GL_TRIANGLES,widthPx,heightPx,floatArrayOf(0.86f,0.98f,1f,0.97f),tex.id)
                }
            }
        }
    }

    private fun drawSimImageLiveOverlay(p:GlesProgram){
        val state=simStateSource?.snapshot() ?: return
        val viewport=SimImagePixelMapper.pixelRectToScreen(widthPx,heightPx,SimImagePixelManifest.viewport)
        val plan=SimImageLiveOverlayPlan.build(state,viewport)
        plan.cells.forEach{cell->
            val mag=cell.magnitude
            val color=if(plan.displayMode=="PATH")
                floatArrayOf(0.10f+0.15f*mag,0.78f+0.18f*mag,1.0f,0.42f)
            else floatArrayOf(0.06f+0.18f*mag,0.32f+0.52f*mag,0.94f,0.40f)
            p.draw(GlesGeometryBuffer.quad(cell.bounds),GLES30.GL_TRIANGLES,widthPx,heightPx,color)
        }
        val status=SimImagePixelMapper.pixelRectToScreen(widthPx,heightPx,SimImagePixelManifest.liveStatus)
        p.draw(GlesGeometryBuffer.quad(status),GLES30.GL_TRIANGLES,widthPx,heightPx,floatArrayOf(0.004f,0.025f,0.045f,0.96f))
        val statusLines=plan.status.split(" | ").chunked(2).map{it.joinToString(" | ")}
        val rowH=status.height/statusLines.size.coerceAtLeast(1)
        statusLines.forEachIndexed{index,label->
            val row=UiBounds(status.left+6f*density,status.top+index*rowH,status.right-6f*density,(status.top+(index+1)*rowH).coerceAtMost(status.bottom))
            textures?.labelTextureRef(label)?.let{tex->
                val fitted=LabelTextureLayout.contain(row,tex.aspectRatio,3f*density,true)
                p.draw(GlesGeometryBuffer.quad(fitted),GLES30.GL_TRIANGLES,widthPx,heightPx,floatArrayOf(0.92f,0.98f,1f,0.98f),tex.id)
            }
        }
    }

    private fun drawPressedImageButtonFeedback(p:GlesProgram,page:PageId){
        val id=pressedNodeId ?: return
        val primaryNav=id.startsWith("IMG.NAV.")
        if(!primaryNav && page==PageId.CAD && !cadImageMapEnabled)return
        if(!primaryNav && page==PageId.CAM && !camImageMapEnabled)return
        if(!primaryNav && page==PageId.SIM && !simImageMapEnabled)return
        val node=imageInteractionNodes(page).firstOrNull{it.id==id} ?: return
        val plan=ImageButtonPressFeedback.plan(node.bounds)
        p.draw(GlesGeometryBuffer.quad(plan.shadow),GLES30.GL_TRIANGLES,widthPx,heightPx,floatArrayOf(0f,0f,0f,0.26f))
        p.draw(GlesGeometryBuffer.quad(plan.depressed),GLES30.GL_TRIANGLES,widthPx,heightPx,UnifiedButtonRenderPolicy.pressedOverlayFill())
        p.draw(GlesGeometryBuffer.quad(plan.topShade),GLES30.GL_TRIANGLES,widthPx,heightPx,floatArrayOf(0f,0.01f,0.025f,0.34f))
        drawRgbFrame(p,plan.depressed,VisualState.PRESSED,(1.8f*density).coerceAtLeast(1f))
        p.draw(GlesGeometryBuffer.quad(plan.bottomHighlight),GLES30.GL_TRIANGLES,widthPx,heightPx,UnifiedButtonRenderPolicy.pressedAccent(0.42f))
    }

    private fun drawSim(p:GlesProgram){
        val controller=simSceneController;val runtime=simStateSource
        val nodes=(controller?.nodes(widthPx,heightPx,density) ?: SimSceneLayout.nodes(widthPx,heightPx,density))
        val viewport=nodes.first{it.id=="SIM.VIEWPORT"}.bounds
        val chromeIds=setOf("SIM.CONTROL_DECK","SIM.VIEWPORT.FRAME")
        nodes.filter{it.id in chromeIds}.forEach{drawNode(p,it)}
        p.draw(GlesGeometryBuffer.quad(viewport),GLES30.GL_TRIANGLES,widthPx,heightPx,floatArrayOf(0.004f,0.018f,0.03f,1f))
        val state=runtime?.snapshot() ?: SimState(message=RuntimeMessage(MessageSeverity.INFO,"SIM_RUNTIME_NOT_BOUND"))
        if(state.ready && state.depth.isNotEmpty() && state.nx>0 && state.ny>0){
            val stride=max(1,max(state.nx,state.ny)/32);val cw=viewport.width/state.nx.toFloat();val ch=viewport.height/state.ny.toFloat()
            var iy=0;while(iy<state.ny){var ix=0;while(ix<state.nx){val idx=iy*state.nx+ix;if(idx<state.depth.size&&state.depth[idx]<0.0){val l=viewport.left+ix*cw;val top=viewport.top+iy*ch;val r=(l+cw*stride).coerceAtMost(viewport.right);val b=(top+ch*stride).coerceAtMost(viewport.bottom);val mag=((-state.depth[idx])/(-state.minDepthMm).coerceAtLeast(0.001)).toFloat().coerceIn(0f,1f);p.draw(GlesGeometryBuffer.quad(UiBounds(l,top,r,b)),GLES30.GL_TRIANGLES,widthPx,heightPx,floatArrayOf(0.08f+0.18f*mag,0.28f+0.58f*mag,0.42f+0.50f*mag,0.90f))};ix+=stride};iy+=stride}
        }
        val statusH=32f*density;val status=UiBounds(viewport.left+6f*density,viewport.top+6f*density,viewport.right-6f*density,(viewport.top+6f*density+statusH).coerceAtMost(viewport.bottom))
        p.draw(GlesGeometryBuffer.quad(status),GLES30.GL_TRIANGLES,widthPx,heightPx,floatArrayOf(0.02f,0.10f,0.16f,0.94f))
        val msg=state.message?.let{" | ${it.severity.name}: ${it.text}"}.orEmpty();val text="SIM ${state.displayMode} | CELLS ${state.removedCells} | MIN ${String.format(java.util.Locale.US,"%.3f",state.minDepthMm)} | VOL ${String.format(java.util.Locale.US,"%.3f",state.removedVolumeMm3)} | BLOCK ${state.blockIndex+1}/${state.blockCount}"+msg
        textures?.labelTextureRef(text)?.let{tex->val fitted=LabelTextureLayout.contain(status,tex.aspectRatio,3f*density,true);p.draw(GlesGeometryBuffer.quad(fitted),GLES30.GL_TRIANGLES,widthPx,heightPx,floatArrayOf(1f,1f,1f,0.96f),tex.id)}
        nodes.filter{it.id!="SIM.VIEWPORT"&&it.id !in chromeIds}.forEach{drawNode(p,it)}
        if(!simFirstFrameLogged){Log.i("AIG4","AIG4_SIM|FIRST_FRAME|PASS|READY=${state.ready}|CELLS=${state.removedCells}|MOTION=${state.motionProgramId.orEmpty()}");simFirstFrameLogged=true}
    }

    private fun drawAi(p:GlesProgram){
        val controller=aiSceneController;val runtime=aiStateSource
        val nodes=(controller?.nodes(widthPx,heightPx,density) ?: AiSceneLayout.nodes(widthPx,heightPx,density))
        val panel=nodes.first{it.id=="AI.STATUS"}.bounds
        p.draw(GlesGeometryBuffer.quad(panel),GLES30.GL_TRIANGLES,widthPx,heightPx,floatArrayOf(0.006f,0.024f,0.045f,1f))
        val state=runtime?.snapshot() ?: AiState(available=false,message=RuntimeMessage(MessageSeverity.INFO,"AI_RUNTIME_NOT_BOUND"))
        val inset=10f*density;val rowH=34f*density
        val rows=listOf("AI LOCAL VAULT | ${state.vaultState}",state.summary,"CHANGES ${state.hasChanges} | VERIFIED ${state.verified} | ISSUES ${state.issueCount}",state.message?.let{"${it.severity.name}: ${it.text}"}.orEmpty()).filter{it.isNotBlank()}
        rows.forEachIndexed{i,label->val box=UiBounds(panel.left+inset,panel.top+inset+i*rowH,panel.right-inset,(panel.top+inset+(i+1)*rowH).coerceAtMost(panel.bottom));textures?.labelTextureRef(label)?.let{tex->val fitted=LabelTextureLayout.contain(box,tex.aspectRatio,2f*density,true);p.draw(GlesGeometryBuffer.quad(fitted),GLES30.GL_TRIANGLES,widthPx,heightPx,floatArrayOf(1f,1f,1f,0.96f),tex.id)}}
        nodes.filter{it.id!="AI.STATUS"}.forEach{drawNode(p,it)}
        if(!aiFirstFrameLogged){Log.i("AIG4","AIG4_AI|FIRST_FRAME|PASS|AVAILABLE=${state.available}|STATE=${state.vaultState}");aiFirstFrameLogged=true}
    }
    private fun drawUnavailable(p:GlesProgram,scene:SceneId){
        val inset=16f*density;val box=UiBounds(inset,inset,widthPx-inset,min(heightPx-inset,inset+72f*density))
        p.draw(GlesGeometryBuffer.quad(box),GLES30.GL_TRIANGLES,widthPx,heightPx,floatArrayOf(0.05f,0.10f,0.14f,0.94f))
        textures?.labelTextureRef("${scene.name} | UNAVAILABLE | LOCAL MESSAGE")?.let{tex->val fitted=LabelTextureLayout.contain(box,tex.aspectRatio,6f*density,true);p.draw(GlesGeometryBuffer.quad(fitted),GLES30.GL_TRIANGLES,widthPx,heightPx,floatArrayOf(1f,1f,1f,0.96f),tex.id)}
        Log.w("AIG4","AIG4_SCENE|${scene.name}|UNAVAILABLE|LOCAL_MESSAGE")
    }
    private fun drawHome(p:GlesProgram){
        val presentation=HomeLivePresentation.from(ncStateSource?.snapshotForFrame(),aiStateSource?.snapshot())
        HomeSceneLayout.nodes(widthPx,heightPx,density,presentation).forEach{drawNode(p,it)}
    }
    private fun drawMultifunction(p:GlesProgram){
        MultifunctionSceneLayout.nodes(widthPx,heightPx,density).forEach{drawNode(p,it)}
    }
    private fun drawCad(p:GlesProgram){
        val nodes=cadController.nodes(widthPx,heightPx,density);val viewportNode=nodes.first{it.id=="CAD.VIEWPORT"};val viewport=CadViewportNode(viewportNode.bounds)
        val chromeIds=setOf("CAD.STATUS_STRIP","CAD.LEFT_TOOLBAR","CAD.INSPECTOR","CAD.VIEWPORT.FRAME")
        nodes.filter{it.id in chromeIds}.forEach{drawNode(p,it)}
        drawGrid(p,viewportNode.bounds,viewport);drawCadGeometry(p,viewport);drawSnapFeedback(p,viewport,viewportNode.bounds)
        nodes.filter{it.id!="CAD.VIEWPORT"&&it.id !in chromeIds}.forEach{drawNode(p,it)}
    }
    private fun drawCam(p:GlesProgram){
        val nodes=camController.nodes(widthPx,heightPx,density);val viewportNode=nodes.first{it.id=="CAM.VIEWPORT"};val viewport=CamViewportNode(viewportNode.bounds)
        val chromeIds=setOf("CAM.CONTROL_DECK","CAM.VIEWPORT.FRAME")
        nodes.filter{it.id in chromeIds}.forEach{drawNode(p,it)}
        p.draw(GlesGeometryBuffer.quad(viewportNode.bounds),GLES30.GL_TRIANGLES,widthPx,heightPx,floatArrayOf(0.008f,0.03f,0.05f,1f))
        val presentation=CamPresentation.from(camStateSource.snapshotForFrame())
        drawCamPath(p,viewport,presentation.active,floatArrayOf(0.2f,0.95f,1f,1f),3f)
        drawCamPath(p,viewport,presentation.candidate,floatArrayOf(1f,0.72f,0.2f,0.88f),2f)
        presentation.localMessage?.let{drawCamMessage(p,viewportNode.bounds,it)}
        nodes.filter{it.id!="CAM.VIEWPORT"&&it.id !in chromeIds}.forEach{drawNode(p,it)}
    }
    private fun drawNc(p:GlesProgram){
        val controller=ncController;val source=ncStateSource
        if(controller==null||source==null){drawHome(p);return}
        val nodes=controller.nodes(widthPx,heightPx,density)
        val editor=nodes.first{it.id=="NC.EDITOR"}
        p.draw(GlesGeometryBuffer.quad(editor.bounds),GLES30.GL_TRIANGLES,widthPx,heightPx,floatArrayOf(0.008f,0.025f,0.045f,1f))
        val state=source.snapshotForFrame();val presentation=NcPresentation.from(state)
        val statusHeight=28f*density;val lineHeight=22f*density
        val usable=(editor.bounds.height-statusHeight-6f*density).coerceAtLeast(lineHeight)
        val maxLines=max(1,floor(usable/lineHeight).toInt())
        val cursorIndex=(presentation.cursorLine-1).coerceAtLeast(0)
        val maxStart=max(0,presentation.lines.size-maxLines)
        val start=(cursorIndex-maxLines/2).coerceIn(0,maxStart)
        presentation.lines.drop(start).take(maxLines).forEachIndexed{row,line->
            val top=editor.bounds.top+row*lineHeight
            val bounds=UiBounds(editor.bounds.left+10f*density,top,editor.bounds.right-8f*density,top+lineHeight)
            if(line.number==presentation.cursorLine)p.draw(GlesGeometryBuffer.quad(bounds),GLES30.GL_TRIANGLES,widthPx,heightPx,floatArrayOf(0.05f,0.22f,0.30f,0.82f))
            val label=line.number.toString().padStart(4,'0')+"  "+line.text
            textures?.labelTextureRef(label)?.let{tex->val fitted=LabelTextureLayout.contain(bounds,tex.aspectRatio,2f*density,true);p.draw(GlesGeometryBuffer.quad(fitted),GLES30.GL_TRIANGLES,widthPx,heightPx,floatArrayOf(1f,1f,1f,0.96f),tex.id)}
        }
        val status=UiBounds(editor.bounds.left+8f*density,editor.bounds.bottom-statusHeight,editor.bounds.right-8f*density,editor.bounds.bottom)
        val local=presentation.localMessage
        val statusColor=when(local?.severity){MessageSeverity.ALARM->floatArrayOf(0.30f,0.03f,0.04f,0.94f);MessageSeverity.WARNING->floatArrayOf(0.28f,0.18f,0.02f,0.94f);else->floatArrayOf(0.02f,0.12f,0.18f,0.92f)}
        p.draw(GlesGeometryBuffer.quad(status),GLES30.GL_TRIANGLES,widthPx,heightPx,statusColor)
        val candidate=presentation.candidateId?.let{" | CAND $it"}.orEmpty()
        val preview=presentation.previewCandidateId?.let{" | PREVIEW $it"}.orEmpty()
        val warning=local?.let{" | ${it.severity.name}: ${it.text}"}.orEmpty()
        val statusText="WORK ${presentation.workingId} V${presentation.revision} | ${state.editMode.name} | CAM ${presentation.camLink.name}"+candidate+preview+warning
        textures?.labelTextureRef(statusText)?.let{tex->val fitted=LabelTextureLayout.contain(status,tex.aspectRatio,3f*density,true);p.draw(GlesGeometryBuffer.quad(fitted),GLES30.GL_TRIANGLES,widthPx,heightPx,floatArrayOf(1f,1f,1f,0.96f),tex.id)}
        nodes.filter{it.id!="NC.EDITOR"}.forEach{drawNode(p,it)}
    }
    private fun drawCamPath(p:GlesProgram,viewport:CamViewportNode,points:List<CamPointSnapshot>,color:FloatArray,lineWidth:Float){
        if(points.size==1){val s=viewport.worldToScreen(points[0].x,points[0].y);p.draw(GlesGeometryBuffer.line(s.first-5f,s.second,s.first+5f,s.second),GLES30.GL_LINES,widthPx,heightPx,color,lineWidth=lineWidth);return}
        points.zipWithNext().forEach{(from,to)->
            val a=viewport.worldToScreen(from.x,from.y);val b=viewport.worldToScreen(to.x,to.y)
            val arcI=to.arcI;val arcJ=to.arcJ
            if((to.motion==CamMotionKind.G2||to.motion==CamMotionKind.G3)&&arcI!=null&&arcJ!=null){
                val cx=from.x+arcI;val cy=from.y+arcJ;val center=viewport.worldToScreen(cx,cy);val radius=hypot(from.x-cx,from.y-cy).toFloat()*viewport.mmScale()
                val start=Math.toDegrees(atan2(from.y-cy,from.x-cx));val end=Math.toDegrees(atan2(to.y-cy,to.x-cx));var sweep=end-start
                if(to.motion==CamMotionKind.G2 && sweep>=0.0)sweep-=360.0
                if(to.motion==CamMotionKind.G3 && sweep<=0.0)sweep+=360.0
                p.draw(GlesGeometryBuffer.circle(center.first,center.second,radius,start,sweep,48),GLES30.GL_LINE_STRIP,widthPx,heightPx,color,lineWidth=lineWidth)
            } else p.draw(GlesGeometryBuffer.line(a.first,a.second,b.first,b.second),GLES30.GL_LINES,widthPx,heightPx,color,lineWidth=lineWidth)
        }
    }
    private fun drawCamMessage(p:GlesProgram,viewport:UiBounds,message:RuntimeMessage){
        val inset=8f*density;val h=28f*density;val w=min(viewport.width-inset*2,360f*density);val box=UiBounds(viewport.left+inset,viewport.top+inset,viewport.left+inset+w,viewport.top+inset+h)
        val base=when(message.severity){MessageSeverity.INFO->floatArrayOf(0.02f,0.12f,0.18f,0.94f);MessageSeverity.WARNING->floatArrayOf(0.28f,0.18f,0.02f,0.94f);MessageSeverity.ALARM->floatArrayOf(0.30f,0.03f,0.04f,0.94f)}
        p.draw(GlesGeometryBuffer.quad(box),GLES30.GL_TRIANGLES,widthPx,heightPx,base)
        textures?.labelTextureRef("${message.severity.name}: ${message.text}")?.let{tex->val fitted=LabelTextureLayout.contain(box,tex.aspectRatio,3f*density,true);p.draw(GlesGeometryBuffer.quad(fitted),GLES30.GL_TRIANGLES,widthPx,heightPx,floatArrayOf(1f,1f,1f,0.96f),tex.id)}
    }

    private fun drawGrid(p:GlesProgram,bounds:UiBounds,viewport:CadViewportNode){
        p.draw(GlesGeometryBuffer.quad(bounds),GLES30.GL_TRIANGLES,widthPx,heightPx,floatArrayOf(0.01f,0.035f,0.06f,1f));val grid=mutableListOf<Pair<Float,Float>>()
        for(mm in -100..100 step 10){val v1=viewport.worldToScreen(mm.toDouble(),-100.0);val v2=viewport.worldToScreen(mm.toDouble(),100.0);grid+=v1;grid+=v2;val h1=viewport.worldToScreen(-100.0,mm.toDouble());val h2=viewport.worldToScreen(100.0,mm.toDouble());grid+=h1;grid+=h2}
        p.draw(GlesGeometryBuffer.polyline(grid),GLES30.GL_LINES,widthPx,heightPx,floatArrayOf(0.08f,0.28f,0.34f,0.34f),lineWidth=1f)
        val x1=viewport.worldToScreen(-100.0,0.0);val x2=viewport.worldToScreen(100.0,0.0);val y1=viewport.worldToScreen(0.0,-100.0);val y2=viewport.worldToScreen(0.0,100.0)
        p.draw(GlesGeometryBuffer.line(x1.first,x1.second,x2.first,x2.second),GLES30.GL_LINES,widthPx,heightPx,floatArrayOf(0.1f,0.9f,1f,0.9f),lineWidth=2f);p.draw(GlesGeometryBuffer.line(y1.first,y1.second,y2.first,y2.second),GLES30.GL_LINES,widthPx,heightPx,floatArrayOf(0.1f,0.9f,1f,0.9f),lineWidth=2f)
    }
    private fun drawCadGeometry(p:GlesProgram,viewport:CadViewportNode){
        stateSource.snapshotForFrame().primitives.forEach{shape->val color=if(shape.selected)floatArrayOf(1f,0.72f,0.2f,1f)else floatArrayOf(0.92f,0.98f,1f,1f);when(shape){
            is CadPrimitiveSnapshot.Segment->{val a=viewport.worldToScreen(shape.ax,shape.ay);val b=viewport.worldToScreen(shape.bx,shape.by);p.draw(GlesGeometryBuffer.line(a.first,a.second,b.first,b.second),GLES30.GL_LINES,widthPx,heightPx,color,lineWidth=2.5f)}
            is CadPrimitiveSnapshot.Rect->{val a=viewport.worldToScreen(shape.x1,shape.y1);val b=viewport.worldToScreen(shape.x2,shape.y1);val c=viewport.worldToScreen(shape.x2,shape.y2);val d=viewport.worldToScreen(shape.x1,shape.y2);p.draw(GlesGeometryBuffer.polyline(listOf(a,b,c,d,a)),GLES30.GL_LINE_STRIP,widthPx,heightPx,color,lineWidth=2.5f)}
            is CadPrimitiveSnapshot.Circle->{val c=viewport.worldToScreen(shape.cx,shape.cy);p.draw(GlesGeometryBuffer.circle(c.first,c.second,shape.radius.toFloat()*viewport.mmScale()),GLES30.GL_LINE_STRIP,widthPx,heightPx,color,lineWidth=2.5f)}
            is CadPrimitiveSnapshot.Hole->{val c=viewport.worldToScreen(shape.cx,shape.cy);val r=shape.radius.toFloat()*viewport.mmScale();p.draw(GlesGeometryBuffer.circle(c.first,c.second,r),GLES30.GL_LINE_STRIP,widthPx,heightPx,color,lineWidth=2.5f);p.draw(GlesGeometryBuffer.line(c.first-r*.35f,c.second,c.first+r*.35f,c.second),GLES30.GL_LINES,widthPx,heightPx,color,lineWidth=2f);p.draw(GlesGeometryBuffer.line(c.first,c.second-r*.35f,c.first,c.second+r*.35f),GLES30.GL_LINES,widthPx,heightPx,color,lineWidth=2f)}
            is CadPrimitiveSnapshot.Arc->{val c=viewport.worldToScreen(shape.cx,shape.cy);p.draw(GlesGeometryBuffer.circle(c.first,c.second,shape.radius.toFloat()*viewport.mmScale(),shape.startDeg,shape.sweepDeg,48),GLES30.GL_LINE_STRIP,widthPx,heightPx,color,lineWidth=2.5f)}
        }}
    }
    private fun drawSnapFeedback(p:GlesProgram,viewport:CadViewportNode,viewportBounds:UiBounds){
        val presentation=CadSnapPresentation.from(stateSource.snapshotForFrame(),viewport,8f*density);presentation.marker?.let{m->p.draw(GlesGeometryBuffer.polyline(m.diamond),GLES30.GL_LINE_STRIP,widthPx,heightPx,floatArrayOf(0.2f,1f,1f,1f),lineWidth=2.5f);p.draw(GlesGeometryBuffer.polyline(m.cross),GLES30.GL_LINES,widthPx,heightPx,floatArrayOf(1f,0.35f,0.95f,1f),lineWidth=2f)}
        val hudWidth=132f*density;val hudHeight=26f*density;val inset=8f*density;val hud=UiBounds(viewportBounds.right-hudWidth-inset,viewportBounds.top+inset,viewportBounds.right-inset,viewportBounds.top+inset+hudHeight)
        p.draw(GlesGeometryBuffer.quad(hud),GLES30.GL_TRIANGLES,widthPx,heightPx,floatArrayOf(0.02f,0.12f,0.18f,0.88f));textures?.labelTextureRef(presentation.hudLabel)?.let{tex->val fitted=LabelTextureLayout.contain(hud,tex.aspectRatio,3f*density,false);p.draw(GlesGeometryBuffer.quad(fitted),GLES30.GL_TRIANGLES,widthPx,heightPx,floatArrayOf(1f,1f,1f,0.96f),tex.id)}
    }
    private fun inset(bounds:UiBounds,amount:Float):UiBounds=UiBounds(bounds.left+amount,bounds.top+amount,bounds.right-amount,bounds.bottom-amount)

    private fun drawRgbFrame(p:GlesProgram,bounds:UiBounds,state:VisualState,thickness:Float){
        val t=thickness.coerceAtLeast(1f)
        p.draw(GlesGeometryBuffer.quad(UiBounds(bounds.left,bounds.top,bounds.right,bounds.top+t)),GLES30.GL_TRIANGLES,widthPx,heightPx,RgbSkinTokens.edgeFor(0,state))
        p.draw(GlesGeometryBuffer.quad(UiBounds(bounds.left,bounds.top,bounds.left+t,bounds.bottom)),GLES30.GL_TRIANGLES,widthPx,heightPx,RgbSkinTokens.edgeFor(1,state))
        p.draw(GlesGeometryBuffer.quad(UiBounds(bounds.left,bounds.bottom-t,bounds.right,bounds.bottom)),GLES30.GL_TRIANGLES,widthPx,heightPx,RgbSkinTokens.edgeFor(2,state))
        p.draw(GlesGeometryBuffer.quad(UiBounds(bounds.right-t,bounds.top,bounds.right,bounds.bottom)),GLES30.GL_TRIANGLES,widthPx,heightPx,RgbSkinTokens.edgeFor(3,state))
    }

    private fun drawGlassPanel(p:GlesProgram,node:RgbGlassPanelNode){
        if(node.skinRole==RgbSkinRole.WORKSTATION_PANEL){
            val t=1f*density
            p.draw(GlesGeometryBuffer.quad(node.bounds),GLES30.GL_TRIANGLES,widthPx,heightPx,AigWorkstationSkinTokens.accent(VisualState.NORMAL))
            p.draw(GlesGeometryBuffer.quad(inset(node.bounds,t)),GLES30.GL_TRIANGLES,widthPx,heightPx,AigWorkstationSkinTokens.panelFill())
            return
        }
        val t=1.5f*density
        p.draw(GlesGeometryBuffer.quad(node.bounds),GLES30.GL_TRIANGLES,widthPx,heightPx,RgbSkinTokens.edgeFor(1,VisualState.NORMAL))
        p.draw(GlesGeometryBuffer.quad(inset(node.bounds,t)),GLES30.GL_TRIANGLES,widthPx,heightPx,RgbSkinTokens.panelFill())
        drawRgbFrame(p,node.bounds,VisualState.NORMAL,t)
    }

    private fun drawGlassButton(p:GlesProgram,node:RgbGlassButtonNode,state:VisualState){
        val workstation=node.skinRole in setOf(RgbSkinRole.WORKSTATION_CONTROL,RgbSkinRole.WORKSTATION_NAV,RgbSkinRole.STATUS_CHIP)
        val t=(if(workstation)1f else 2f)*density
        val edge=if(workstation)AigWorkstationSkinTokens.accent(state) else RgbSkinTokens.edgeFor(0,state)
        p.draw(GlesGeometryBuffer.quad(node.bounds),GLES30.GL_TRIANGLES,widthPx,heightPx,edge)
        val inner=inset(node.bounds,t)
        val fill=if(workstation)AigWorkstationSkinTokens.controlFill(state) else RgbSkinTokens.fillFor(state)
        if(node.skinRole==RgbSkinRole.NAVIGATION && state==VisualState.NORMAL)fill[3]=0.78f
        if(node.skinRole==RgbSkinRole.WORKSTATION_NAV && state==VisualState.NORMAL)fill[3]=0.90f
        p.draw(GlesGeometryBuffer.quad(inner),GLES30.GL_TRIANGLES,widthPx,heightPx,fill)
        if(workstation){
            val accentH=(if(state==VisualState.SELECTED||state==VisualState.PRESSED)2f else 1f)*density
            val accent=UiBounds(inner.left,inner.bottom-accentH,inner.right,inner.bottom)
            p.draw(GlesGeometryBuffer.quad(accent),GLES30.GL_TRIANGLES,widthPx,heightPx,AigWorkstationSkinTokens.accent(state))
        }else{
            drawRgbFrame(p,node.bounds,state,t)
            val shine=UiBounds(inner.left+1f*density,inner.top+1f*density,inner.right-1f*density,(inner.top+2f*density).coerceAtMost(inner.bottom))
            p.draw(GlesGeometryBuffer.quad(shine),GLES30.GL_TRIANGLES,widthPx,heightPx,floatArrayOf(0.80f,0.96f,1f,if(state==VisualState.DISABLED)0.10f else 0.34f))
        }
        when(val plan=RgbNodeTexturePlan.forNode(node)){
            is RgbNodeTexturePlan.Asset->textures?.texture(plan.path)?.let{tex->p.draw(GlesGeometryBuffer.quad(inner),GLES30.GL_TRIANGLES,widthPx,heightPx,floatArrayOf(1f,1f,1f,if(state==VisualState.DISABLED)0.35f else 0.92f),tex)}
            is RgbNodeTexturePlan.AssetWithLabel->{
                if(node.skinRole==RgbSkinRole.HOME_STATUS){
                    val pad=4f*density
                    val iconSize=minOf(inner.height-pad*2,inner.width*0.24f)
                    val iconBounds=UiBounds(inner.left+pad,inner.top+(inner.height-iconSize)*0.5f,inner.left+pad+iconSize,inner.top+(inner.height-iconSize)*0.5f+iconSize)
                    textures?.texture(plan.path)?.let{tex->p.draw(GlesGeometryBuffer.quad(iconBounds),GLES30.GL_TRIANGLES,widthPx,heightPx,floatArrayOf(1f,1f,1f,if(state==VisualState.DISABLED)0.30f else 0.94f),tex)}
                    val labelBounds=UiBounds(iconBounds.right+pad,inner.top+pad,inner.right-pad,inner.bottom-pad)
                    textures?.labelTextureRef(plan.label)?.let{tex->val fitted=LabelTextureLayout.contain(labelBounds,tex.aspectRatio,1f*density,true);p.draw(GlesGeometryBuffer.quad(fitted),GLES30.GL_TRIANGLES,widthPx,heightPx,floatArrayOf(1f,1f,1f,if(state==VisualState.DISABLED)0.44f else 0.98f),tex.id)}
                }else{
                    val iconSize=minOf(inner.width*0.42f,inner.height*0.50f)
                    val iconLeft=inner.left+(inner.width-iconSize)*0.5f
                    val iconTop=inner.top+inner.height*0.08f
                    val iconBounds=UiBounds(iconLeft,iconTop,iconLeft+iconSize,iconTop+iconSize)
                    textures?.texture(plan.path)?.let{tex->p.draw(GlesGeometryBuffer.quad(iconBounds),GLES30.GL_TRIANGLES,widthPx,heightPx,floatArrayOf(1f,1f,1f,if(state==VisualState.DISABLED)0.35f else 0.94f),tex)}
                    val labelBounds=UiBounds(inner.left+4f*density,inner.bottom-inner.height*0.30f,inner.right-4f*density,inner.bottom-4f*density)
                    textures?.labelTextureRef(plan.label)?.let{tex->val fitted=LabelTextureLayout.contain(labelBounds,tex.aspectRatio,2f*density,false);p.draw(GlesGeometryBuffer.quad(fitted),GLES30.GL_TRIANGLES,widthPx,heightPx,floatArrayOf(1f,1f,1f,if(state==VisualState.DISABLED)0.42f else 0.98f),tex.id)}
                }
            }
            is RgbNodeTexturePlan.GeneratedLabel->textures?.labelTextureRef(plan.label)?.let{tex->val fitted=LabelTextureLayout.contain(inner,tex.aspectRatio,4f*density,false);p.draw(GlesGeometryBuffer.quad(fitted),GLES30.GL_TRIANGLES,widthPx,heightPx,floatArrayOf(1f,1f,1f,if(state==VisualState.DISABLED)0.42f else 0.96f),tex.id)}
        }
    }

    private fun drawNode(p:GlesProgram,node:SceneNode){
        if(!node.visible)return
        if(node is AigLabelNode){
            textures?.labelTextureRef(node.text)?.let{tex->val fitted=LabelTextureLayout.contain(node.bounds,tex.aspectRatio,2f*density,true);p.draw(GlesGeometryBuffer.quad(fitted),GLES30.GL_TRIANGLES,widthPx,heightPx,floatArrayOf(0.92f,0.98f,1f,0.98f),tex.id)}
            return
        }
        if(node is AigIconNode){
            textures?.texture(node.textureRef)?.let{tex->p.draw(GlesGeometryBuffer.quad(node.bounds),GLES30.GL_TRIANGLES,widthPx,heightPx,floatArrayOf(1f,1f,1f,0.94f),tex)}
            return
        }
        if(node is RgbGlassPanelNode){drawGlassPanel(p,node);return}
        val selectedByTool=sceneRouter.current==SceneId.CAD && node.id=="CAD.${stateSource.snapshotForFrame().activeTool.name}"
        val pressed=node.id==pressedNodeId
        if(node is RgbGlassButtonNode){
            val state=UnifiedButtonRenderPolicy.stateFor(
                node=node,
                pressed=pressed && node.skinRole!=RgbSkinRole.HOME_STATUS,
                selected=selectedByTool,
            )
            drawGlassButton(p,node,state);return
        }
        val base=when{pressed->floatArrayOf(0.35f,0.72f,1f,0.96f);node.visualState==VisualState.ALARM->floatArrayOf(0.42f,0.05f,0.06f,0.94f);selectedByTool||node.visualState==VisualState.SELECTED->floatArrayOf(0.25f,0.9f,1f,0.92f);else->floatArrayOf(0.08f,0.25f,0.38f,0.84f)}
        p.draw(GlesGeometryBuffer.quad(node.bounds),GLES30.GL_TRIANGLES,widthPx,heightPx,base)
    }
}
