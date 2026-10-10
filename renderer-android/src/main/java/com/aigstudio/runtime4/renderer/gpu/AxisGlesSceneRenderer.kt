package com.aigstudio.runtime4.renderer.gpu

import android.opengl.GLES30
import android.opengl.Matrix
import android.util.Log
import com.aigstudio.runtime4.contract.AxisMode
import com.aigstudio.runtime4.renderer.*
import java.util.Locale

class AxisGlesSceneRenderer(
    private val stateSource: AxisRendererStateSource,
) {
    private val axis3Parts = Axis3Mesh.parts()
    private var axis3FirstFrameLogged = false

    fun supports(route: FourthRenderRoute): Boolean = route == FourthRenderRoute.AXIS3

    fun drawAxis3(
        p: GlesProgram,
        p3: Gles3dProgram,
        textures: RgbTextureCatalog?,
        widthPx: Float,
        heightPx: Float,
        density: Float,
        drawNode: (SceneNode) -> Unit,
    ) {
        val nodes=Axis3SceneLayout.nodes(widthPx,heightPx,density)
        val viewport=nodes.first{it.id=="AXIS3.VIEWPORT"}.bounds
        p.draw(GlesGeometryBuffer.quad(viewport),GLES30.GL_TRIANGLES,widthPx,heightPx,floatArrayOf(0.006f,0.018f,0.032f,1f))
        val state=stateSource.snapshotForFrame(AxisMode.AXIS3)
        val vx=viewport.left.toInt().coerceAtLeast(0);val vy=(heightPx-viewport.bottom).toInt().coerceAtLeast(0)
        val vw=viewport.width.toInt().coerceAtLeast(1);val vh=viewport.height.toInt().coerceAtLeast(1)
        GLES30.glViewport(vx,vy,vw,vh);GLES30.glEnable(GLES30.GL_DEPTH_TEST);GLES30.glDepthFunc(GLES30.GL_LEQUAL);GLES30.glClear(GLES30.GL_DEPTH_BUFFER_BIT)
        val projection=FloatArray(16);val view=FloatArray(16);val viewProjection=FloatArray(16)
        Matrix.perspectiveM(projection,0,42f,vw.toFloat()/vh.toFloat(),0.1f,60f)
        Matrix.setLookAtM(view,0,9f,7f,11f,0f,-0.4f,0f,0f,1f,0f)
        Matrix.multiplyMM(viewProjection,0,projection,0,view,0)
        val motionX=(state.pose.x*0.02).toFloat().coerceIn(-2.2f,2.2f)
        val motionY=(state.pose.z*0.02).toFloat().coerceIn(-1.8f,1.8f)
        val motionZ=(state.pose.y*0.02).toFloat().coerceIn(-2.2f,2.2f)
        axis3Parts.forEach{mesh->
            val model=FloatArray(16);Matrix.setIdentityM(model,0)
            val color=when(mesh.part){
                Axis3Part.BASE->{Matrix.translateM(model,0,0f,-2.4f,0f);floatArrayOf(0.10f,0.22f,0.30f,1f)}
                Axis3Part.COLUMN->{Matrix.translateM(model,0,-2.7f,0.2f,0.4f);floatArrayOf(0.12f,0.32f,0.42f,1f)}
                Axis3Part.TABLE->{Matrix.translateM(model,0,0f,-1.55f,0f);floatArrayOf(0.16f,0.48f,0.58f,1f)}
                Axis3Part.WORKPIECE->{Matrix.translateM(model,0,0f,-0.88f,0f);floatArrayOf(0.48f,0.52f,0.56f,1f)}
                Axis3Part.SPINDLE->{Matrix.translateM(model,0,motionX,2.0f+motionY,motionZ);floatArrayOf(0.18f,0.68f,0.82f,1f)}
                Axis3Part.TOOL->{Matrix.translateM(model,0,motionX,0.15f+motionY,motionZ);floatArrayOf(0.82f,0.88f,0.92f,1f)}
            }
            val mvp=FloatArray(16);Matrix.multiplyMM(mvp,0,viewProjection,0,model,0);p3.draw(mesh.vertices,mvp,model,color)
        }
        GLES30.glDisable(GLES30.GL_DEPTH_TEST);GLES30.glViewport(0,0,widthPx.toInt(),heightPx.toInt())
        val hudH=28f*density;val hud=UiBounds(viewport.left+8f*density,viewport.top+8f*density,viewport.right-8f*density,viewport.top+8f*density+hudH)
        p.draw(GlesGeometryBuffer.quad(hud),GLES30.GL_TRIANGLES,widthPx,heightPx,floatArrayOf(0.02f,0.12f,0.18f,0.90f))
        val pose=state.pose;val motion=state.motionProgramId?:"NONE";val message=state.message?.let{" | ${it.severity.name}: ${it.text}"}.orEmpty()
        val text=String.format(Locale.US,"3AX | X%.3f Y%.3f Z%.3f | MOTION %s | BLOCK %d/%d%s",pose.x,pose.y,pose.z,motion,state.blockIndex,state.blockCount,message)
        textures?.labelTextureRef(text)?.let{tex->val fitted=LabelTextureLayout.contain(hud,tex.aspectRatio,3f*density,true);p.draw(GlesGeometryBuffer.quad(fitted),GLES30.GL_TRIANGLES,widthPx,heightPx,floatArrayOf(1f,1f,1f,0.96f),tex.id)}
        nodes.filter{it.id!="AXIS3.VIEWPORT"}.forEach(drawNode)
        if(!axis3FirstFrameLogged){Log.i("AIG4","AIG4_AXIS3|FIRST_FRAME|PASS|MOTION=$motion|BLOCK=${state.blockIndex}/${state.blockCount}");axis3FirstFrameLogged=true}
    }
}