package com.aigstudio.runtime4.renderer.gpu

import android.opengl.GLES30
import android.opengl.Matrix
import android.util.Log
import com.aigstudio.runtime4.contract.AxisMode
import com.aigstudio.runtime4.renderer.machine.*
import com.aigstudio.runtime4.renderer.*
import java.util.Locale

class AxisGlesSceneRenderer(
    private val stateSource:AxisRendererStateSource,
) {
    private val axis3Parts=Axis3Mesh.parts()
    private val axis4Parts=Axis4Mesh.parts()
    private val axis4Specs=MachineProfile4AxHrtStyle.parts.associateBy{it.id}
    private val axis5Parts=Axis5Mesh.parts()
    private val axis5Specs=MachineProfile5AxTrunnionStyle.parts.associateBy{it.id}
    private val axis6Parts=Axis6Mesh.parts()
    private val axis6Specs=MachineProfile6AxNicStyle.parts.associateBy{it.id}
    private var axis3FirstFrameLogged=false
    private var axis4FirstFrameLogged=false
    private var axis5FirstFrameLogged=false
    private var axis6FirstFrameLogged=false

    fun supports(route:FourthRenderRoute):Boolean = route==FourthRenderRoute.AXIS3 || route==FourthRenderRoute.AXIS4 || route==FourthRenderRoute.AXIS5 || route==FourthRenderRoute.AXIS6

    fun drawAxis3(
        p:GlesProgram,p3:Gles3dProgram,textures:RgbTextureCatalog?,widthPx:Float,heightPx:Float,density:Float,
        drawNode:(SceneNode)->Unit,
    ) {
        val nodes=Axis3SceneLayout.nodes(widthPx,heightPx,density)
        val viewport=nodes.first{it.id=="AXIS3.VIEWPORT"}.bounds
        p.draw(GlesGeometryBuffer.quad(viewport),GLES30.GL_TRIANGLES,widthPx,heightPx,floatArrayOf(0.006f,0.018f,0.032f,1f))
        val state=stateSource.snapshotForFrame(AxisMode.AXIS3)
        val viewProjection=begin3d(viewport,widthPx,heightPx,9f,7f,11f)
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
            drawMesh(p3,mesh.vertices,model,viewProjection,color)
        }
        end3d(widthPx,heightPx)
        val pose=state.pose;val motion=state.motionProgramId?:"NONE";val message=AxisFrameEvidence.messageSuffix(state.message)
        drawHud(p,textures,viewport,widthPx,heightPx,density,String.format(Locale.US,"3AX | X%.3f Y%.3f Z%.3f | MOTION %s | BLOCK %d/%d%s",pose.x,pose.y,pose.z,motion,state.blockIndex,state.blockCount,message))
        nodes.filter{it.id!="AXIS3.VIEWPORT"}.forEach(drawNode)
        if(!axis3FirstFrameLogged){Log.i("AIG4",AxisFrameEvidence.axis3Marker(state));axis3FirstFrameLogged=true}
    }

    fun drawAxis4(
        p:GlesProgram,p3:Gles3dProgram,textures:RgbTextureCatalog?,widthPx:Float,heightPx:Float,density:Float,
        drawNode:(SceneNode)->Unit,
    ) {
        val nodes=Axis4SceneLayout.nodes(widthPx,heightPx,density)
        val viewport=nodes.first{it.id=="AXIS4.VIEWPORT"}.bounds
        p.draw(GlesGeometryBuffer.quad(viewport),GLES30.GL_TRIANGLES,widthPx,heightPx,floatArrayOf(0.005f,0.016f,0.030f,1f))
        val state=stateSource.snapshotForFrame(AxisMode.AXIS4)
        val visual=Axis4Presentation.from(state)
        val workholding=Axis4Presentation.workholdingTransform(state)
        val viewProjection=begin3d(viewport,widthPx,heightPx,9.5f,7.0f,12.5f)
        val motionX=(visual.x*0.02).toFloat().coerceIn(-2.2f,2.2f)
        val motionY=(visual.z*0.02).toFloat().coerceIn(-1.8f,1.8f)
        val motionZ=(visual.y*0.02).toFloat().coerceIn(-2.2f,2.2f)
        axis4Parts.forEach{mesh->
            val spec=axis4Specs.getValue(mesh.part.name)
            val model=FloatArray(16);Matrix.setIdentityM(model,0)
            if(mesh.part==Axis4Part.PLATTER || mesh.part==Axis4Part.CHUCK || mesh.part==Axis4Part.WORKPIECE){
                val pivot=workholding.pivot
                Matrix.translateM(model,0,pivot.x,pivot.y,pivot.z)
                Matrix.rotateM(model,0,workholding.angleDegrees.toFloat(),1f,0f,0f)
                Matrix.translateM(model,0,spec.offset.x-pivot.x,spec.offset.y-pivot.y,spec.offset.z-pivot.z)
            } else if(mesh.part==Axis4Part.SPINDLE || mesh.part==Axis4Part.TOOL){
                Matrix.translateM(model,0,spec.offset.x+motionX,spec.offset.y+motionY,spec.offset.z+motionZ)
            } else {
                Matrix.translateM(model,0,spec.offset.x,spec.offset.y,spec.offset.z)
            }
            val color=when(mesh.part){
                Axis4Part.BASE->floatArrayOf(0.07f,0.18f,0.27f,1f)
                Axis4Part.COLUMN->floatArrayOf(0.10f,0.28f,0.38f,1f)
                Axis4Part.TABLE->floatArrayOf(0.13f,0.42f,0.52f,1f)
                Axis4Part.ROTARY_HOUSING->floatArrayOf(0.12f,0.36f,0.46f,1f)
                Axis4Part.PLATTER->floatArrayOf(0.24f,0.55f,0.62f,1f)
                Axis4Part.CHUCK->floatArrayOf(0.34f,0.62f,0.68f,1f)
                Axis4Part.WORKPIECE->floatArrayOf(0.50f,0.54f,0.58f,1f)
                Axis4Part.SPINDLE->floatArrayOf(0.18f,0.68f,0.82f,1f)
                Axis4Part.TOOL->floatArrayOf(0.84f,0.90f,0.94f,1f)
            }
            drawMesh(p3,mesh.vertices,model,viewProjection,color)
        }
        end3d(widthPx,heightPx)
        val motion=state.motionProgramId?:"NONE";val message=AxisFrameEvidence.messageSuffix(state.message)
        val hudText=String.format(Locale.US,"4AX | X%.3f Y%.3f Z%.3f A%.3f | MOTION %s | BLOCK %d/%d%s",visual.x,visual.y,visual.z,visual.aDegrees,motion,state.blockIndex,state.blockCount,message)
        drawHud(p,textures,viewport,widthPx,heightPx,density,hudText)
        nodes.filter{it.id!="AXIS4.VIEWPORT"}.forEach(drawNode)
        if(!axis4FirstFrameLogged){Log.i("AIG4",AxisFrameEvidence.axis4Marker(state));axis4FirstFrameLogged=true}
    }
    fun drawAxis5(
        p:GlesProgram,p3:Gles3dProgram,textures:RgbTextureCatalog?,widthPx:Float,heightPx:Float,density:Float,
        drawNode:(SceneNode)->Unit,
    ) {
        val nodes=Axis5SceneLayout.nodes(widthPx,heightPx,density)
        val viewport=nodes.first{it.id=="AXIS5.VIEWPORT"}.bounds
        p.draw(GlesGeometryBuffer.quad(viewport),GLES30.GL_TRIANGLES,widthPx,heightPx,floatArrayOf(0.004f,0.014f,0.028f,1f))
        val state=stateSource.snapshotForFrame(AxisMode.AXIS5)
        val visual=Axis5Presentation.from(state);val frame=Axis5Presentation.kinematicFrame(state)
        val viewProjection=begin3d(viewport,widthPx,heightPx,9.8f,7.6f,12.8f)
        val motionX=(visual.x*0.02).toFloat().coerceIn(-2.2f,2.2f);val motionY=(visual.z*0.02).toFloat().coerceIn(-1.8f,1.8f);val motionZ=(visual.y*0.02).toFloat().coerceIn(-2.2f,2.2f)
        fun applyJoint(model:FloatArray,joint:MachineJointSpec,degrees:Double){val q=joint.pivot;val d=joint.direction;Matrix.translateM(model,0,q.x,q.y,q.z);Matrix.rotateM(model,0,degrees.toFloat(),d.x,d.y,d.z);Matrix.translateM(model,0,-q.x,-q.y,-q.z)}
        axis5Parts.forEach{mesh->
            val spec=axis5Specs.getValue(mesh.part.name);val model=FloatArray(16);Matrix.setIdentityM(model,0)
            when(mesh.part){
                Axis5Part.TILT_CRADLE->{applyJoint(model,frame.a,frame.aDegrees);Matrix.translateM(model,0,spec.offset.x,spec.offset.y,spec.offset.z)}
                Axis5Part.PLATTER,Axis5Part.WORKPIECE->{applyJoint(model,frame.a,frame.aDegrees);applyJoint(model,frame.b,frame.bDegrees);Matrix.translateM(model,0,spec.offset.x,spec.offset.y,spec.offset.z)}
                Axis5Part.SPINDLE,Axis5Part.TOOL->Matrix.translateM(model,0,spec.offset.x+motionX,spec.offset.y+motionY,spec.offset.z+motionZ)
                else->Matrix.translateM(model,0,spec.offset.x,spec.offset.y,spec.offset.z)
            }
            val color=when(mesh.part){
                Axis5Part.BASE->floatArrayOf(0.07f,0.17f,0.26f,1f);Axis5Part.COLUMN->floatArrayOf(0.10f,0.27f,0.37f,1f);Axis5Part.TABLE->floatArrayOf(0.12f,0.39f,0.50f,1f)
                Axis5Part.TILT_SUPPORT_LEFT,Axis5Part.TILT_SUPPORT_RIGHT->floatArrayOf(0.14f,0.43f,0.54f,1f);Axis5Part.TILT_CRADLE->floatArrayOf(0.17f,0.50f,0.61f,1f);Axis5Part.PLATTER->floatArrayOf(0.23f,0.61f,0.69f,1f)
                Axis5Part.WORKPIECE->floatArrayOf(0.50f,0.54f,0.58f,1f);Axis5Part.SPINDLE->floatArrayOf(0.18f,0.68f,0.82f,1f);Axis5Part.TOOL->floatArrayOf(0.84f,0.90f,0.94f,1f)
            }
            drawMesh(p3,mesh.vertices,model,viewProjection,color)
        }
        end3d(widthPx,heightPx)
        val motion=state.motionProgramId?:"NONE";val message=AxisFrameEvidence.messageSuffix(state.message)
        val hudText=String.format(Locale.US,"5AX | X%.3f Y%.3f Z%.3f A%.3f B%.3f | MOTION %s | BLOCK %d/%d%s",visual.x,visual.y,visual.z,visual.aDegrees,visual.bDegrees,motion,state.blockIndex,state.blockCount,message)
        drawHud(p,textures,viewport,widthPx,heightPx,density,hudText);nodes.filter{it.id!="AXIS5.VIEWPORT"}.forEach(drawNode)
        if(!axis5FirstFrameLogged){Log.i("AIG4",AxisFrameEvidence.axis5Marker(state));axis5FirstFrameLogged=true}
    }
    fun drawAxis6(
        p:GlesProgram,p3:Gles3dProgram,textures:RgbTextureCatalog?,widthPx:Float,heightPx:Float,density:Float,
        drawNode:(SceneNode)->Unit,
    ) {
        val nodes=Axis6SceneLayout.nodes(widthPx,heightPx,density)
        val viewport=nodes.first{it.id=="AXIS6.VIEWPORT"}.bounds
        p.draw(GlesGeometryBuffer.quad(viewport),GLES30.GL_TRIANGLES,widthPx,heightPx,floatArrayOf(0.003f,0.012f,0.025f,1f))
        val state=stateSource.snapshotForFrame(AxisMode.AXIS6)
        val visual=Axis6Presentation.from(state);val frame=Axis6Presentation.kinematicFrame(state)
        val viewProjection=begin3d(viewport,widthPx,heightPx,9.8f,7.8f,13.2f)
        val motionX=(visual.x*0.02).toFloat().coerceIn(-2.2f,2.2f);val motionY=(visual.z*0.02).toFloat().coerceIn(-1.8f,1.8f);val motionZ=(visual.y*0.02).toFloat().coerceIn(-2.2f,2.2f)
        fun applyJoint(model:FloatArray,joint:MachineJointSpec,degrees:Double){val q=joint.pivot;val d=joint.direction;Matrix.translateM(model,0,q.x,q.y,q.z);Matrix.rotateM(model,0,degrees.toFloat(),d.x,d.y,d.z);Matrix.translateM(model,0,-q.x,-q.y,-q.z)}
        axis6Parts.forEach{mesh->
            val spec=axis6Specs.getValue(mesh.part.name);val model=FloatArray(16);Matrix.setIdentityM(model,0)
            when(mesh.part){
                Axis6Part.SWIVEL_A->{Matrix.translateM(model,0,motionX,motionY,motionZ);applyJoint(model,frame.a,frame.aDegrees);Matrix.translateM(model,0,spec.offset.x,spec.offset.y,spec.offset.z)}
                Axis6Part.SWIVEL_B->{Matrix.translateM(model,0,motionX,motionY,motionZ);applyJoint(model,frame.a,frame.aDegrees);applyJoint(model,frame.b,frame.bDegrees);Matrix.translateM(model,0,spec.offset.x,spec.offset.y,spec.offset.z)}
                Axis6Part.SPINDLE_C,Axis6Part.TOOL->{Matrix.translateM(model,0,motionX,motionY,motionZ);applyJoint(model,frame.a,frame.aDegrees);applyJoint(model,frame.b,frame.bDegrees);applyJoint(model,frame.c,frame.cDegrees);Matrix.translateM(model,0,spec.offset.x,spec.offset.y,spec.offset.z)}
                else->Matrix.translateM(model,0,spec.offset.x,spec.offset.y,spec.offset.z)
            }
            val color=when(mesh.part){
                Axis6Part.BASE->floatArrayOf(0.06f,0.16f,0.25f,1f);Axis6Part.COLUMN->floatArrayOf(0.09f,0.25f,0.36f,1f);Axis6Part.TABLE->floatArrayOf(0.12f,0.37f,0.49f,1f);Axis6Part.WORKPIECE->floatArrayOf(0.50f,0.54f,0.58f,1f)
                Axis6Part.SWIVEL_A->floatArrayOf(0.13f,0.44f,0.57f,1f);Axis6Part.SWIVEL_B->floatArrayOf(0.18f,0.55f,0.67f,1f);Axis6Part.SPINDLE_C->floatArrayOf(0.25f,0.68f,0.76f,1f);Axis6Part.TOOL->floatArrayOf(0.86f,0.92f,0.96f,1f)
            }
            drawMesh(p3,mesh.vertices,model,viewProjection,color)
        }
        end3d(widthPx,heightPx)
        val motion=state.motionProgramId?:"NONE";val message=AxisFrameEvidence.messageSuffix(state.message)
        val hudText=String.format(Locale.US,"6AX | X%.3f Y%.3f Z%.3f A%.3f B%.3f C%.3f | MOTION %s | BLOCK %d/%d%s",visual.x,visual.y,visual.z,visual.aDegrees,visual.bDegrees,visual.cDegrees,motion,state.blockIndex,state.blockCount,message)
        drawHud(p,textures,viewport,widthPx,heightPx,density,hudText);nodes.filter{it.id!="AXIS6.VIEWPORT"}.forEach(drawNode)
        if(!axis6FirstFrameLogged){Log.i("AIG4",AxisFrameEvidence.axis6Marker(state));axis6FirstFrameLogged=true}
    }
    private fun begin3d(viewport:UiBounds,widthPx:Float,heightPx:Float,eyeX:Float,eyeY:Float,eyeZ:Float):FloatArray {
        val vx=viewport.left.toInt().coerceAtLeast(0);val vy=(heightPx-viewport.bottom).toInt().coerceAtLeast(0)
        val vw=viewport.width.toInt().coerceAtLeast(1);val vh=viewport.height.toInt().coerceAtLeast(1)
        GLES30.glViewport(vx,vy,vw,vh);GLES30.glEnable(GLES30.GL_DEPTH_TEST);GLES30.glDepthFunc(GLES30.GL_LEQUAL);GLES30.glClear(GLES30.GL_DEPTH_BUFFER_BIT)
        val projection=FloatArray(16);val view=FloatArray(16);val viewProjection=FloatArray(16)
        Matrix.perspectiveM(projection,0,42f,vw.toFloat()/vh.toFloat(),0.1f,60f)
        Matrix.setLookAtM(view,0,eyeX,eyeY,eyeZ,0f,-0.4f,0f,0f,1f,0f)
        Matrix.multiplyMM(viewProjection,0,projection,0,view,0)
        return viewProjection
    }

    private fun end3d(widthPx:Float,heightPx:Float){GLES30.glDisable(GLES30.GL_DEPTH_TEST);GLES30.glViewport(0,0,widthPx.toInt(),heightPx.toInt())}

    private fun drawMesh(p3:Gles3dProgram,vertices:FloatArray,model:FloatArray,viewProjection:FloatArray,color:FloatArray){
        val mvp=FloatArray(16);Matrix.multiplyMM(mvp,0,viewProjection,0,model,0);p3.draw(vertices,mvp,model,color)
    }

    private fun drawHud(p:GlesProgram,textures:RgbTextureCatalog?,viewport:UiBounds,widthPx:Float,heightPx:Float,density:Float,text:String){
        val hudH=28f*density;val hud=UiBounds(viewport.left+8f*density,viewport.top+8f*density,viewport.right-8f*density,viewport.top+8f*density+hudH)
        p.draw(GlesGeometryBuffer.quad(hud),GLES30.GL_TRIANGLES,widthPx,heightPx,floatArrayOf(0.02f,0.12f,0.18f,0.90f))
        textures?.labelTextureRef(text)?.let{tex->val fitted=LabelTextureLayout.contain(hud,tex.aspectRatio,3f*density,true);p.draw(GlesGeometryBuffer.quad(fitted),GLES30.GL_TRIANGLES,widthPx,heightPx,floatArrayOf(1f,1f,1f,0.96f),tex.id)}
    }
}