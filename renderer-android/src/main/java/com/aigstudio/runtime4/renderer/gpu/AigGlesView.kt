package com.aigstudio.runtime4.renderer.gpu

import android.content.Context
import android.opengl.GLSurfaceView
import android.util.Log
import android.view.MotionEvent
import com.aigstudio.runtime4.contract.*
import com.aigstudio.runtime4.renderer.*

class AigGlesView(
    context: Context,
    private val cadRuntime: CadRuntimePort,
    private val camRuntime: CamRuntimePort,
    onFirstFrame: (() -> Unit)? = null,
) : GLSurfaceView(context) {
    private val sceneRouter = SceneRouter(SceneId.HOME)
    private val cadController = CadSceneController(cadRuntime)
    private val camController = CamSceneController(camRuntime)
    private val pointerRouter = PointerGestureRouter(cadRuntime)
    private val firstFrameSignal = onFirstFrame?.let { callback -> FirstFrameSignal { post(callback) } }
    private val aigRenderer = AigGlesRenderer(context,cadRuntime,camRuntime,sceneRouter,cadController,camController,firstFrameSignal)
    private var pressedNode: String? = null

    init {
        setEGLContextClientVersion(3)
        preserveEGLContextOnPause = true
        setRenderer(aigRenderer)
        renderMode = RENDERMODE_WHEN_DIRTY
        isFocusable = true
        isFocusableInTouchMode = true
    }

    fun currentScene():SceneId=sceneRouter.current

    override fun onTouchEvent(event:MotionEvent):Boolean {
        val density=resources.displayMetrics.density
        val nodes=currentNodes(density)
        when(event.actionMasked){
            MotionEvent.ACTION_DOWN->{
                val hit=hitTestTopmost(nodes,event.x,event.y)
                pressedNode=hit?.id; aigRenderer.pressedNodeId=pressedNode
                if(sceneRouter.current==SceneId.CAD && hit?.id=="CAD.VIEWPORT"){
                    val world=CadViewportNode(hit.bounds).screenToWorld(event.x,event.y); pointerRouter.onDown(world)
                }
                requestRender(); return true
            }
            MotionEvent.ACTION_MOVE->{
                if(sceneRouter.current==SceneId.CAD && pressedNode=="CAD.VIEWPORT"){
                    nodes.firstOrNull{it.id=="CAD.VIEWPORT"}?.let{pointerRouter.onMove(CadViewportNode(it.bounds).screenToWorld(event.x,event.y));requestRender()}
                }
                return true
            }
            MotionEvent.ACTION_UP->{
                val downId=pressedNode; pressedNode=null; aigRenderer.pressedNodeId=null
                if(sceneRouter.current==SceneId.CAD && downId=="CAD.VIEWPORT"){
                    nodes.firstOrNull{it.id=="CAD.VIEWPORT"}?.let{ val result=pointerRouter.onUp(CadViewportNode(it.bounds).screenToWorld(event.x,event.y)); logCadGeometry(result) }
                    requestRender(); return true
                }
                val upId=hitTestTopmost(nodes,event.x,event.y)?.id
                if(downId!=null && downId==upId)activate(downId)
                requestRender(); return true
            }
            MotionEvent.ACTION_CANCEL->{pressedNode=null;aigRenderer.pressedNodeId=null;pointerRouter.cancel();requestRender();return true}
        }
        return true
    }

    private fun activate(nodeId:String){
        when(nodeId){
            "NAV.CAD"->{val from=sceneRouter.current;sceneRouter.navigate(SceneId.CAD);Log.i("AIG4","AIG4_SCENE|${from.name}_TO_CAD|PASS")}
            "NAV.CAM"->{val from=sceneRouter.current;sceneRouter.navigate(SceneId.CAM);Log.i("AIG4","AIG4_SCENE|${from.name}_TO_CAM|PASS")}
            "NAV.HOME"->{val from=sceneRouter.current;sceneRouter.navigate(SceneId.HOME);Log.i("AIG4","AIG4_SCENE|${from.name}_TO_HOME|PASS")}
            else->when(sceneRouter.current){
                SceneId.CAD->cadController.activate(nodeId)?.let{logCadCommand(nodeId.substringAfter("CAD."),it)}
                SceneId.CAM->camController.activate(nodeId)?.let{logCamCommand(nodeId.substringAfter("CAM."),it)}
                else->Unit
            }
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

    private fun currentNodes(density:Float):List<SceneNode> = when(sceneRouter.current){
        SceneId.HOME->HomeSceneLayout.nodes(width.toFloat(),height.toFloat(),density)
        SceneId.CAD->cadController.nodes(width.toFloat(),height.toFloat(),density)
        SceneId.CAM->camController.nodes(width.toFloat(),height.toFloat(),density)
        else->HomeSceneLayout.nodes(width.toFloat(),height.toFloat(),density)
    }
}
