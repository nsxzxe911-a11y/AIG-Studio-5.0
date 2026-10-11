package com.aigstudio.runtime4.renderer.gpu

import android.content.Context
import android.opengl.GLSurfaceView
import android.text.InputType
import android.util.Log
import android.view.KeyEvent
import android.view.MotionEvent
import android.view.ViewConfiguration
import android.view.inputmethod.BaseInputConnection
import android.view.inputmethod.EditorInfo
import android.view.inputmethod.InputConnection
import android.view.inputmethod.InputMethodManager
import com.aigstudio.runtime4.contract.*
import com.aigstudio.runtime4.contract.ui.AigUiAction
import com.aigstudio.runtime4.renderer.*

class AigGlesView(
    context: Context,
    private val cadRuntime: CadRuntimePort,
    private val camRuntime: CamRuntimePort,
    private val ncRuntime: NcRuntimePort? = null,
    private val axisRuntime: AxisRuntimePort,
    private val simRuntime: SimRuntimePort? = null,
    private val aiRuntime: AiRuntimePort? = null,
    private val pageRuntime: PageConnectionRuntimePort? = null,
    onFirstFrame: (() -> Unit)? = null,
) : GLSurfaceView(context) {
    private val sceneRouter = SceneRouter(SceneId.HOME)
    private val cadController = CadSceneController(cadRuntime)
    private val camController = CamSceneController(camRuntime)
    private val ncController = ncRuntime?.let(::NcSceneController)
    private val simController = simRuntime?.let(::SimSceneController)
    private val aiController = aiRuntime?.let(::AiSceneController)
    private val productDeckController = pageRuntime?.let(::ProductControlDeckController)
    private val ncInput = ncRuntime?.let { runtime -> NcTextInputBridge(runtime){ requestRender() } }
    private val pointerRouter = PointerGestureRouter(cadRuntime)
    private val firstFrameSignal = onFirstFrame?.let { callback -> FirstFrameSignal { post(callback) } }
    private val aigRenderer = AigGlesRenderer(context,cadRuntime,camRuntime,ncRuntime,axisRuntime,simRuntime,aiRuntime,sceneRouter,cadController,camController,ncController,productDeckController,firstFrameSignal)
    private var pressedNode: String? = null
    private val appContext=context.applicationContext
    private val cadRibbonState=CadSwipeRibbonState()
    private var cadRibbonGesture:CadSwipeGestureTracker?=null
    private val pageToolStates=mutableMapOf<PageId,PageToolRibbonState>()
    private var pageToolGesture:PageToolGestureTracker?=null
    private var pageToolGesturePage:PageId?=null
    private val touchSlopPx=ViewConfiguration.get(context).scaledTouchSlop.toFloat().coerceAtLeast(8f)
    private var cadImageMapCurrent:Boolean?=null
    private var camImageMapCurrent:Boolean?=null
    private var simImageMapCurrent:Boolean?=null

    init {
        setEGLContextClientVersion(3)
        preserveEGLContextOnPause = true
        setRenderer(aigRenderer)
        renderMode = RENDERMODE_WHEN_DIRTY
        isFocusable = true
        isFocusableInTouchMode = true
    }

    fun currentScene():SceneId=sceneRouter.current

    private fun cadImageMapReady():Boolean {
        cadImageMapCurrent?.let{return it}
        val path=PageSurfaceTexturePlan.path(PageId.CAD)
        val ok=runCatching {
            path!=null && appContext.assets.open(path).use { CadImagePixelManifest.isCompatibleBytes(it.readBytes()) }
        }.getOrDefault(false)
        cadImageMapCurrent=ok
        aigRenderer.cadImageMapEnabled=ok
        if(!ok) Log.i("AIG4","AIG4_CAD|INTERACTION_MAP_STALE|DISABLED")
        return ok
    }

    private fun camImageMapReady():Boolean {
        camImageMapCurrent?.let{return it}
        val path=PageSurfaceTexturePlan.path(PageId.CAM)
        val ok=runCatching {
            path!=null && appContext.assets.open(path).use { CamImagePixelManifest.isCompatibleBytes(it.readBytes()) }
        }.getOrDefault(false)
        camImageMapCurrent=ok
        aigRenderer.camImageMapEnabled=ok
        if(!ok) Log.i("AIG4","AIG4_CAM|INTERACTION_MAP_STALE|DISABLED")
        return ok
    }

    private fun simImageMapReady():Boolean {
        simImageMapCurrent?.let{return it}
        val path=PageSurfaceTexturePlan.path(PageId.SIM)
        val ok=runCatching {
            path!=null && appContext.assets.open(path).use { SimImagePixelManifest.isCompatibleBytes(it.readBytes()) }
        }.getOrDefault(false)
        simImageMapCurrent=ok
        aigRenderer.simImageMapEnabled=ok
        if(!ok) Log.i("AIG4","AIG4_SIM|INTERACTION_MAP_STALE|DISABLED")
        return ok
    }

    override fun onCheckIsTextEditor():Boolean = ncInput != null

    override fun onCreateInputConnection(outAttrs:EditorInfo):InputConnection? {
        val bridge=ncInput ?: return null
        outAttrs.inputType=InputType.TYPE_CLASS_TEXT or InputType.TYPE_TEXT_FLAG_NO_SUGGESTIONS or InputType.TYPE_TEXT_VARIATION_VISIBLE_PASSWORD
        outAttrs.imeOptions=EditorInfo.IME_ACTION_NONE or EditorInfo.IME_FLAG_NO_EXTRACT_UI
        return object:BaseInputConnection(this,false){
            override fun commitText(text:CharSequence?,newCursorPosition:Int):Boolean = bridge.commitText(text?.toString().orEmpty())
            override fun deleteSurroundingText(beforeLength:Int,afterLength:Int):Boolean {
                var accepted=true
                repeat(beforeLength.coerceAtLeast(0)){ accepted=bridge.backspace() && accepted }
                repeat(afterLength.coerceAtLeast(0)){ accepted=bridge.deleteForward() && accepted }
                return accepted
            }
            override fun sendKeyEvent(event:KeyEvent):Boolean {
                if(event.action!=KeyEvent.ACTION_DOWN)return super.sendKeyEvent(event)
                return when(event.keyCode){
                    KeyEvent.KEYCODE_DEL->bridge.backspace()
                    KeyEvent.KEYCODE_FORWARD_DEL->bridge.deleteForward()
                    KeyEvent.KEYCODE_ENTER->bridge.newBlock()
                    else->super.sendKeyEvent(event)
                }
            }
            override fun setSelection(start:Int,end:Int):Boolean {
                if(start!=end)return false
                val result=ncRuntime?.dispatch(NcCommand.SetCursor(start)) ?: return false
                requestRender()
                return result.accepted
            }
        }
    }

    override fun onTouchEvent(event:MotionEvent):Boolean {
        val density=resources.displayMetrics.density
        val nodes=currentNodes(density)
        when(event.actionMasked){
            MotionEvent.ACTION_DOWN->{
                val page=sceneRouter.current.toPageId()
                if(page!=PageId.CAD && page!=PageId.MULTIFUNCTION && !(page==PageId.CAM && camImageMapReady()) && !(page==PageId.SIM && simImageMapReady())){
                    val raw=rawNodes(density); val toolState=toolState(page,raw)
                    if(toolState!=null && UnifiedMobileControlShell.toolPanelBounds(width.toFloat(),height.toFloat(),density).contains(event.x,event.y)){
                        val toolNodes=UnifiedMobileControlShell.toolRibbonNodes(raw,page,width.toFloat(),height.toFloat(),density,toolState.pageIndex)
                        val hit=hitTestTopmost(toolNodes,event.x,event.y) as? RgbGlassButtonNode
                        if(hit!=null){
                            pageToolGesture=PageToolGestureTracker(touchSlopPx).also{it.onDown(event.x,event.y,hit.id,unifiedState(hit.visualState),hit.enabled)}
                            pageToolGesturePage=page; pressedNode=hit.id; aigRenderer.pressedNodeId=hit.id
                            requestRender(); return true
                        }
                    }
                }
                val hit=hitTestTopmost(nodes,event.x,event.y)
                pressedNode=hit?.id; aigRenderer.pressedNodeId=pressedNode
                if(sceneRouter.current==SceneId.CAD && hit?.id=="CAD.VIEWPORT"){
                    val world=CadViewportNode(hit.bounds).screenToWorld(event.x,event.y); pointerRouter.onDown(world)
                }
                requestRender(); return true
            }
            MotionEvent.ACTION_MOVE->{
                pageToolGesture?.let{gesture->
                    val state=gesture.onMove(event.x,event.y)
                    if(state==PageToolGestureState.SWIPING || state==PageToolGestureState.CANCELLED){pressedNode=null;aigRenderer.pressedNodeId=null}
                    requestRender();return true
                }
                if(sceneRouter.current==SceneId.CAD && pressedNode=="CAD.VIEWPORT"){
                    nodes.firstOrNull{it.id=="CAD.VIEWPORT"}?.let{pointerRouter.onMove(CadViewportNode(it.bounds).screenToWorld(event.x,event.y));requestRender()}
                }
                return true
            }
            MotionEvent.ACTION_UP->{
                pageToolGesture?.let{gesture->
                    val page=pageToolGesturePage ?: sceneRouter.current.toPageId()
                    val release=gesture.onUp(event.x,event.y); val tapId=gesture.tapActivationId
                    pageToolGesture=null; pageToolGesturePage=null; pressedNode=null; aigRenderer.pressedNodeId=null
                    when(release){
                        PageToolRelease.TAP->if(tapId!=null)activate(tapId)
                        PageToolRelease.SWIPE_LEFT,PageToolRelease.SWIPE_RIGHT->{
                            val raw=rawNodes(density); val state=toolState(page,raw)
                            state?.apply(release); val index=state?.pageIndex ?: 0
                            aigRenderer.setToolPageIndex(page,index)
                            val count=UnifiedMobileControlShell.toolPages(raw,page).size
                            Log.i("AIG4","AIG4_${page.name}|RIBBON|${release.name}|PAGE=${index+1}/${count.coerceAtLeast(1)}|NO_COMMAND")
                        }
                        PageToolRelease.CANCEL->Unit
                    }
                    requestRender();return true
                }
                val downId=pressedNode; pressedNode=null; aigRenderer.pressedNodeId=null
                if(sceneRouter.current==SceneId.CAD && downId=="CAD.VIEWPORT"){
                    nodes.firstOrNull{it.id=="CAD.VIEWPORT"}?.let{ val result=pointerRouter.onUp(CadViewportNode(it.bounds).screenToWorld(event.x,event.y)); logCadGeometry(result) }
                    requestRender(); return true
                }
                if(sceneRouter.current==SceneId.NC && downId=="NC.EDITOR"){
                    openNcKeyboard();requestRender();return true
                }
                val upId=hitTestTopmost(nodes,event.x,event.y)?.id
                if(downId!=null && downId==upId)activate(downId)
                requestRender(); return true
            }
            MotionEvent.ACTION_CANCEL->{
                pageToolGesture?.cancel();pageToolGesture=null;pageToolGesturePage=null
                cadRibbonGesture?.cancel();cadRibbonGesture=null;pressedNode=null;aigRenderer.pressedNodeId=null;pointerRouter.cancel();requestRender();return true
            }
        }
        return true
    }

    private fun navigateTo(destination:SceneId){
        if(destination==SceneId.NC && ncController==null){
            Log.w("AIG4","AIG4_NC|NAV|REJECTED|LOCAL_MESSAGE|NC_RUNTIME_NOT_BOUND")
            return
        }
        val from=sceneRouter.current
        sceneRouter.navigate(destination)
        if(destination==SceneId.NC)openNcKeyboard()
        Log.i("AIG4","AIG4_SCENE|${from.name}_TO_${destination.name}|PASS")
    }
    private fun openNcKeyboard(){
        if(ncInput==null)return
        requestFocus()
        (context.getSystemService(Context.INPUT_METHOD_SERVICE) as? InputMethodManager)?.showSoftInput(this,InputMethodManager.SHOW_IMPLICIT)
    }

    private fun activate(nodeId:String){
        val professionalAction=currentNodes(resources.displayMetrics.density)
            .filterIsInstance<RgbGlassButtonNode>()
            .firstOrNull{it.id==nodeId}
            ?.aigActionBinding
        if(professionalAction is AigUiAction.Navigate){
            navigateTo(professionalAction.page.toSceneId())
            return
        }
        val destination=SharedVisualPolicy.destination(nodeId)
        if(destination!=null){navigateTo(destination);return}
        productDeckController?.activate(sceneRouter.current.toPageId(),nodeId)?.let{state->Log.i("AIG4","AIG4_LINK|"+state.page.name+"|"+nodeId+"|PASS");requestRender();return}
        when(sceneRouter.current){
            SceneId.CAD->cadController.activate(nodeId)?.let{logCadCommand(nodeId.substringAfter("CAD."),it)}
            SceneId.CAM->camController.activate(nodeId)?.let{logCamCommand(nodeId.substringAfter("CAM."),it)}
            SceneId.NC->ncController?.activate(nodeId)?.let{logNcCommand(nodeId.substringAfter("NC."),it)}
            SceneId.SIM->simController?.activate(nodeId)?.let{Log.i("AIG4","AIG4_SIM|COMMAND|"+nodeId.substringAfter("SIM.")+"|STATE="+(if(it.ready)"READY" else "LOCAL"))}
            SceneId.AI->aiController?.activate(nodeId)?.let{Log.i("AIG4","AIG4_AI|COMMAND|"+nodeId.substringAfter("AI.")+"|"+(if(it.accepted)"ACCEPTED" else "REJECTED_LOCAL_MESSAGE"))}
            else->Unit
        }
    }

    private fun logCadGeometry(result:CadDispatchResult?){if(result!=null)logCadCommand(result.state.activeTool.name,result)}
    private fun logCadCommand(name:String,result:CadDispatchResult){
        Log.i("AIG4",if(result.accepted)"AIG4_CAD|COMMAND|$name|ACCEPTED|REV=${result.state.revision}" else "AIG4_CAD|COMMAND|$name|REJECTED|LOCAL_MESSAGE")
    }
    private fun logCamCommand(name:String,result:CamDispatchResult){
        val active=result.state.active?.revision?:0L
        Log.i("AIG4",if(result.accepted)"AIG4_CAM|COMMAND|$name|ACCEPTED|ACTIVE_REV=$active|STRATEGY_REV=${result.state.strategy.revision}" else "AIG4_CAM|COMMAND|$name|REJECTED|LOCAL_MESSAGE")
    }
    private fun logNcCommand(name:String,result:NcDispatchResult){
        Log.i("AIG4",if(result.accepted)"AIG4_NC|COMMAND|$name|ACCEPTED|REV=${result.state.working.revision}" else "AIG4_NC|COMMAND|$name|REJECTED|LOCAL_MESSAGE")
    }

    private fun primaryImageSkinActive(page:PageId):Boolean = PageSurfaceTexturePlan.path(page)!=null
    private fun imageSkinNavNodes(page:PageId):List<SceneNode> = PrimaryPageNavigationLayout.nodes(width.toFloat(),height.toFloat(),page)

    private fun rawNodes(density:Float):List<SceneNode> {
        val base=TopLevelNodeResolver.resolve(sceneRouter.current,TopLevelNodeSources(
            home={imageSkinNavNodes(PageId.HOME)},
            cad={if(cadImageMapReady()) imageSkinNavNodes(PageId.CAD)+CadImageInteractionLayout.nodes(width.toFloat(),height.toFloat()).filterNot{it.id.startsWith("IMG.")} else imageSkinNavNodes(PageId.CAD)},
            cam={if(camImageMapReady()) imageSkinNavNodes(PageId.CAM)+CamImageInteractionLayout.nodes(width.toFloat(),height.toFloat(),camController.state()).filterNot{it.id.startsWith("IMG.")} else imageSkinNavNodes(PageId.CAM)},
            sim={if(simImageMapReady()) imageSkinNavNodes(PageId.SIM)+SimImageInteractionLayout.nodes(width.toFloat(),height.toFloat()).filterNot{it.id.startsWith("IMG.")} else imageSkinNavNodes(PageId.SIM)},
            axis3={if(primaryImageSkinActive(PageId.AXIS3)) imageSkinNavNodes(PageId.AXIS3) else Axis3SceneLayout.nodes(width.toFloat(),height.toFloat(),density)},
            axis4={if(primaryImageSkinActive(PageId.AXIS4)) imageSkinNavNodes(PageId.AXIS4) else Axis4SceneLayout.nodes(width.toFloat(),height.toFloat(),density)},
            axis5={if(primaryImageSkinActive(PageId.AXIS5)) imageSkinNavNodes(PageId.AXIS5) else Axis5SceneLayout.nodes(width.toFloat(),height.toFloat(),density)},
            axis6={if(primaryImageSkinActive(PageId.AXIS6)) imageSkinNavNodes(PageId.AXIS6) else Axis6SceneLayout.nodes(width.toFloat(),height.toFloat(),density)},
            nc={if(primaryImageSkinActive(PageId.NC)) imageSkinNavNodes(PageId.NC) else (ncController?.nodes(width.toFloat(),height.toFloat(),density) ?: NcSceneLayout.nodes(width.toFloat(),height.toFloat(),density,NcState.initial()))},
            ai={if(primaryImageSkinActive(PageId.AI)) imageSkinNavNodes(PageId.AI) else (aiController?.nodes(width.toFloat(),height.toFloat(),density) ?: AiSceneLayout.nodes(width.toFloat(),height.toFloat(),density))},
            multifunction={MultifunctionImageInteractionLayout.nodes(width.toFloat(),height.toFloat())},
        ))
        val page=sceneRouter.current.toPageId()
        val deck=if(primaryImageSkinActive(page)) emptyList() else (productDeckController?.nodes(page,width.toFloat(),height.toFloat(),density) ?: emptyList())
        return base+deck
    }
    private fun unifiedState(state:VisualState)=when(state){
        VisualState.NORMAL->UnifiedVisualState.NORMAL
        VisualState.PRESSED->UnifiedVisualState.PRESSED
        VisualState.SELECTED->UnifiedVisualState.SELECTED
        VisualState.DISABLED->UnifiedVisualState.DISABLED
        VisualState.ALARM->UnifiedVisualState.ALARM
    }

    private fun toolState(page:PageId,raw:List<SceneNode>):PageToolRibbonState?{
        val count=UnifiedMobileControlShell.toolPages(raw,page).size
        if(count<=0)return null
        return pageToolStates.getOrPut(page){PageToolRibbonState(count)}
    }

    private fun currentNodes(density:Float):List<SceneNode>{
        val raw=rawNodes(density)
        val page=sceneRouter.current.toPageId()
        if(PageSurfaceTexturePlan.path(page)!=null) return raw
        val index=toolState(page,raw)?.pageIndex ?: 0
        aigRenderer.setToolPageIndex(page,index)
        return UnifiedMobileControlShell.compose(raw,page,width.toFloat(),height.toFloat(),density,index)
    }

}