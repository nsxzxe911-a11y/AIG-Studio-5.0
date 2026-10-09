package com.aigstudio.runtime4.renderer.gpu

import android.content.Context
import android.opengl.GLES30
import android.opengl.GLSurfaceView
import android.util.Log
import com.aigstudio.runtime4.contract.*
import com.aigstudio.runtime4.renderer.*
import javax.microedition.khronos.egl.EGLConfig
import javax.microedition.khronos.opengles.GL10
import kotlin.math.max

class AigGlesRenderer(
    private val context: Context,
    cadRuntime: CadRuntimePort,
    private val sceneRouter: SceneRouter,
    private val cadController: CadSceneController,
) : GLSurfaceView.Renderer {
    val stateSource = RendererStateSource(cadRuntime)
    @Volatile var pressedNodeId: String? = null
    private var widthPx = 1f
    private var heightPx = 1f
    private val density = context.resources.displayMetrics.density
    private var program: GlesProgram? = null
    private var textures: RgbTextureCatalog? = null
    private var firstFrameLogged = false

    override fun onSurfaceCreated(gl: GL10?, config: EGLConfig?) {
        program?.release(); textures?.release()
        program = GlesProgram()
        textures = RgbTextureCatalog(context)
        GLES30.glEnable(GLES30.GL_BLEND)
        GLES30.glBlendFunc(GLES30.GL_SRC_ALPHA, GLES30.GL_ONE_MINUS_SRC_ALPHA)
        Log.i("AIG4", "AIG4_GLES|VERSION|${GLES30.glGetString(GLES30.GL_VERSION)}")
    }

    override fun onSurfaceChanged(gl: GL10?, width: Int, height: Int) {
        widthPx = max(1, width).toFloat(); heightPx = max(1, height).toFloat()
        GLES30.glViewport(0, 0, width, height)
    }

    override fun onDrawFrame(gl: GL10?) {
        val p = program ?: return
        GLES30.glClearColor(0.004f, 0.02f, 0.04f, 1f)
        GLES30.glClear(GLES30.GL_COLOR_BUFFER_BIT or GLES30.GL_DEPTH_BUFFER_BIT)
        if (sceneRouter.current == SceneId.HOME) drawHome(p) else drawCad(p)
        if (!firstFrameLogged) {
            GLES30.glFinish()
            Log.i("AIG4", "AIG4_GLES|FIRST_FRAME|PASS")
            firstFrameLogged = true
        }
    }

    private fun drawHome(p: GlesProgram) {
        textures?.texture("aig-rgb/home/rgb_wallpaper.png")?.let { tex ->
            p.draw(GlesGeometryBuffer.quad(UiBounds(0f,0f,widthPx,heightPx)), GLES30.GL_TRIANGLES, widthPx,heightPx,floatArrayOf(1f,1f,1f,0.95f),tex)
        }
        HomeSceneLayout.nodes(widthPx,heightPx,density).forEach { drawNode(p,it) }
    }

    private fun drawCad(p: GlesProgram) {
        val nodes = cadController.nodes(widthPx,heightPx,density)
        val viewportNode = nodes.first { it.id == "CAD.VIEWPORT" }
        val viewport = CadViewportNode(viewportNode.bounds)
        drawGrid(p, viewportNode.bounds, viewport)
        drawCadGeometry(p, viewport)
        nodes.filter { it.id != "CAD.VIEWPORT" }.forEach { drawNode(p,it) }
    }

    private fun drawGrid(p: GlesProgram, bounds: UiBounds, viewport: CadViewportNode) {
        p.draw(GlesGeometryBuffer.quad(bounds), GLES30.GL_TRIANGLES,widthPx,heightPx,floatArrayOf(0.01f,0.035f,0.06f,1f))
        val grid = mutableListOf<Pair<Float,Float>>()
        for (mm in -100..100 step 10) {
            val v1=viewport.worldToScreen(mm.toDouble(),-100.0); val v2=viewport.worldToScreen(mm.toDouble(),100.0)
            grid += v1; grid += v2
            val h1=viewport.worldToScreen(-100.0,mm.toDouble()); val h2=viewport.worldToScreen(100.0,mm.toDouble())
            grid += h1; grid += h2
        }
        p.draw(GlesGeometryBuffer.polyline(grid), GLES30.GL_LINES,widthPx,heightPx,floatArrayOf(0.08f,0.28f,0.34f,0.34f),lineWidth=1f)
        val x1=viewport.worldToScreen(-100.0,0.0); val x2=viewport.worldToScreen(100.0,0.0)
        val y1=viewport.worldToScreen(0.0,-100.0); val y2=viewport.worldToScreen(0.0,100.0)
        p.draw(GlesGeometryBuffer.line(x1.first,x1.second,x2.first,x2.second),GLES30.GL_LINES,widthPx,heightPx,floatArrayOf(0.1f,0.9f,1f,0.9f),lineWidth=2f)
        p.draw(GlesGeometryBuffer.line(y1.first,y1.second,y2.first,y2.second),GLES30.GL_LINES,widthPx,heightPx,floatArrayOf(0.1f,0.9f,1f,0.9f),lineWidth=2f)
    }

    private fun drawCadGeometry(p: GlesProgram, viewport: CadViewportNode) {
        stateSource.snapshotForFrame().primitives.forEach { shape ->
            val color = if (shape.selected) floatArrayOf(1f,0.72f,0.2f,1f) else floatArrayOf(0.92f,0.98f,1f,1f)
            when(shape) {
                is CadPrimitiveSnapshot.Segment -> {
                    val a=viewport.worldToScreen(shape.ax,shape.ay); val b=viewport.worldToScreen(shape.bx,shape.by)
                    p.draw(GlesGeometryBuffer.line(a.first,a.second,b.first,b.second),GLES30.GL_LINES,widthPx,heightPx,color,lineWidth=2.5f)
                }
                is CadPrimitiveSnapshot.Rect -> {
                    val a=viewport.worldToScreen(shape.x1,shape.y1); val b=viewport.worldToScreen(shape.x2,shape.y1); val c=viewport.worldToScreen(shape.x2,shape.y2); val d=viewport.worldToScreen(shape.x1,shape.y2)
                    p.draw(GlesGeometryBuffer.polyline(listOf(a,b,c,d,a)),GLES30.GL_LINE_STRIP,widthPx,heightPx,color,lineWidth=2.5f)
                }
                is CadPrimitiveSnapshot.Circle -> {
                    val c=viewport.worldToScreen(shape.cx,shape.cy)
                    p.draw(GlesGeometryBuffer.circle(c.first,c.second,shape.radius.toFloat()*viewport.mmScale()),GLES30.GL_LINE_STRIP,widthPx,heightPx,color,lineWidth=2.5f)
                }
                is CadPrimitiveSnapshot.Hole -> {
                    val c=viewport.worldToScreen(shape.cx,shape.cy); val r=shape.radius.toFloat()*viewport.mmScale()
                    p.draw(GlesGeometryBuffer.circle(c.first,c.second,r),GLES30.GL_LINE_STRIP,widthPx,heightPx,color,lineWidth=2.5f)
                    p.draw(GlesGeometryBuffer.line(c.first-r*.35f,c.second,c.first+r*.35f,c.second),GLES30.GL_LINES,widthPx,heightPx,color,lineWidth=2f)
                    p.draw(GlesGeometryBuffer.line(c.first,c.second-r*.35f,c.first,c.second+r*.35f),GLES30.GL_LINES,widthPx,heightPx,color,lineWidth=2f)
                }
                is CadPrimitiveSnapshot.Arc -> {
                    val c=viewport.worldToScreen(shape.cx,shape.cy)
                    p.draw(GlesGeometryBuffer.circle(c.first,c.second,shape.radius.toFloat()*viewport.mmScale(),shape.startDeg,shape.sweepDeg,48),GLES30.GL_LINE_STRIP,widthPx,heightPx,color,lineWidth=2.5f)
                }
            }
        }
    }

    private fun drawNode(p: GlesProgram, node: SceneNode) {
        if (!node.visible) return
        val selectedByTool = node.id == "CAD.${stateSource.snapshotForFrame().activeTool.name}"
        val pressed = node.id == pressedNodeId
        val base = when {
            pressed -> floatArrayOf(0.35f,0.72f,1f,0.96f)
            selectedByTool || node.visualState == VisualState.SELECTED -> floatArrayOf(0.25f,0.9f,1f,0.92f)
            else -> floatArrayOf(0.08f,0.25f,0.38f,0.84f)
        }
        p.draw(GlesGeometryBuffer.quad(node.bounds),GLES30.GL_TRIANGLES,widthPx,heightPx,base)
        if (node is RgbGlassButtonNode) {
            val tex = when (val plan = RgbNodeTexturePlan.forNode(node)) {
                is RgbNodeTexturePlan.Asset -> textures?.texture(plan.path)
                is RgbNodeTexturePlan.GeneratedLabel -> textures?.labelTexture(plan.label)
            }
            if (tex != null) p.draw(GlesGeometryBuffer.quad(node.bounds),GLES30.GL_TRIANGLES,widthPx,heightPx,floatArrayOf(1f,1f,1f,0.94f),tex)
        }
    }
}
