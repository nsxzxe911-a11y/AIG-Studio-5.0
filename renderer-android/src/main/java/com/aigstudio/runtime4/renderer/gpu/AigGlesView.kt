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
    onFirstFrame: (() -> Unit)? = null,
) : GLSurfaceView(context) {
    private val sceneRouter = SceneRouter(SceneId.HOME)
    private val cadController = CadSceneController(cadRuntime)
    private val pointerRouter = PointerGestureRouter(cadRuntime)
    private val firstFrameSignal = onFirstFrame?.let { callback -> FirstFrameSignal { post(callback) } }
    private val aigRenderer = AigGlesRenderer(context, cadRuntime, sceneRouter, cadController, firstFrameSignal)
    private var pressedNode: String? = null

    init {
        setEGLContextClientVersion(3)
        preserveEGLContextOnPause = true
        setRenderer(aigRenderer)
        renderMode = RENDERMODE_WHEN_DIRTY
        isFocusable = true
        isFocusableInTouchMode = true
    }

    fun currentScene(): SceneId = sceneRouter.current

    override fun onTouchEvent(event: MotionEvent): Boolean {
        val density = resources.displayMetrics.density
        val nodes = currentNodes(density)
        when (event.actionMasked) {
            MotionEvent.ACTION_DOWN -> {
                val hit = hitTestTopmost(nodes, event.x, event.y)
                pressedNode = hit?.id
                aigRenderer.pressedNodeId = pressedNode
                if (hit?.id == "CAD.VIEWPORT") {
                    val world = CadViewportNode(hit.bounds).screenToWorld(event.x, event.y)
                    pointerRouter.onDown(world)
                }
                requestRender()
                return true
            }
            MotionEvent.ACTION_MOVE -> {
                if (pressedNode == "CAD.VIEWPORT") {
                    val viewport = nodes.firstOrNull { it.id == "CAD.VIEWPORT" }
                    if (viewport != null) {
                        pointerRouter.onMove(CadViewportNode(viewport.bounds).screenToWorld(event.x, event.y))
                        requestRender()
                    }
                }
                return true
            }
            MotionEvent.ACTION_UP -> {
                val downId = pressedNode
                pressedNode = null
                aigRenderer.pressedNodeId = null
                if (downId == "CAD.VIEWPORT") {
                    val viewport = nodes.firstOrNull { it.id == "CAD.VIEWPORT" }
                    if (viewport != null) {
                        val world = CadViewportNode(viewport.bounds).screenToWorld(event.x, event.y)
                        val result = pointerRouter.onUp(world)
                        logGeometryResult(result)
                    }
                    requestRender()
                    return true
                }
                val upId = hitTestTopmost(nodes, event.x, event.y)?.id
                if (downId != null && downId == upId) activate(downId)
                requestRender()
                return true
            }
            MotionEvent.ACTION_CANCEL -> {
                pressedNode = null
                aigRenderer.pressedNodeId = null
                pointerRouter.cancel()
                requestRender()
                return true
            }
        }
        return true
    }

    private fun activate(nodeId: String) {
        when (nodeId) {
            "NAV.CAD" -> {
                val from = sceneRouter.current
                sceneRouter.navigate(SceneId.CAD)
                if (from == SceneId.HOME) Log.i("AIG4", "AIG4_SCENE|HOME_TO_CAD|PASS")
            }
            "NAV.HOME" -> {
                val from = sceneRouter.current
                sceneRouter.navigate(SceneId.HOME)
                if (from == SceneId.CAD) Log.i("AIG4", "AIG4_SCENE|CAD_TO_HOME|PASS")
            }
            else -> {
                val result = cadController.activate(nodeId)
                if (result != null) logCommand(nodeId.substringAfter("CAD."), result)
            }
        }
    }

    private fun logGeometryResult(result: CadDispatchResult?) {
        if (result == null) return
        val tool = result.state.activeTool.name
        logCommand(tool, result)
    }

    private fun logCommand(name: String, result: CadDispatchResult) {
        if (result.accepted) {
            Log.i("AIG4", "AIG4_CAD|COMMAND|$name|ACCEPTED|REV=${result.state.revision}")
        } else {
            Log.i("AIG4", "AIG4_CAD|COMMAND|$name|REJECTED|LOCAL_MESSAGE")
        }
    }

    private fun currentNodes(density: Float): List<SceneNode> = when (sceneRouter.current) {
        SceneId.HOME -> HomeSceneLayout.nodes(width.toFloat(), height.toFloat(), density)
        else -> cadController.nodes(width.toFloat(), height.toFloat(), density)
    }
}
