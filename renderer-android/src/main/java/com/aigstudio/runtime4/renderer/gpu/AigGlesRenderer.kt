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

class AigGlesRenderer(
    private val context:Context,
    cadRuntime:CadRuntimePort,
    camRuntime:CamRuntimePort,
    ncRuntime:NcRuntimePort?,
    private val sceneRouter:SceneRouter,
    private val cadController:CadSceneController,
    private val camController:CamSceneController,
    private val ncController:NcSceneController?,
    private val firstFrameSignal:FirstFrameSignal?=null,
):GLSurfaceView.Renderer {
    val stateSource=RendererStateSource(cadRuntime)
    val camStateSource=CamRendererStateSource(camRuntime)
    val ncStateSource=ncRuntime?.let(::NcRendererStateSource)
    @Volatile var pressedNodeId:String?=null
    private var widthPx=1f; private var heightPx=1f
    private val density=context.resources.displayMetrics.density
    private var program:GlesProgram?=null; private var textures:RgbTextureCatalog?=null; private var firstFrameLogged=false

    override fun onSurfaceCreated(gl:GL10?,config:EGLConfig?){
        program?.release();textures?.release();program=GlesProgram();textures=RgbTextureCatalog(context)
        GLES30.glEnable(GLES30.GL_BLEND);GLES30.glBlendFunc(GLES30.GL_SRC_ALPHA,GLES30.GL_ONE_MINUS_SRC_ALPHA)
        Log.i("AIG4","AIG4_GLES|VERSION|${GLES30.glGetString(GLES30.GL_VERSION)}")
    }
    override fun onSurfaceChanged(gl:GL10?,width:Int,height:Int){widthPx=max(1,width).toFloat();heightPx=max(1,height).toFloat();GLES30.glViewport(0,0,width,height)}
    override fun onDrawFrame(gl:GL10?){
        val p=program?:return
        GLES30.glClearColor(0.004f,0.02f,0.04f,1f);GLES30.glClear(GLES30.GL_COLOR_BUFFER_BIT or GLES30.GL_DEPTH_BUFFER_BIT)
        when(sceneRouter.current){SceneId.HOME->drawHome(p);SceneId.CAD->drawCad(p);SceneId.CAM->drawCam(p);SceneId.NC->drawNc(p);else->drawHome(p)}
        if(!firstFrameLogged){GLES30.glFinish();Log.i("AIG4","AIG4_GLES|FIRST_FRAME|PASS");firstFrameLogged=true;firstFrameSignal?.fireOnce()}
    }

    private fun drawHome(p:GlesProgram){
        textures?.texture("aig-rgb/home/rgb_wallpaper.png")?.let{tex->p.draw(GlesGeometryBuffer.quad(UiBounds(0f,0f,widthPx,heightPx)),GLES30.GL_TRIANGLES,widthPx,heightPx,floatArrayOf(1f,1f,1f,0.95f),tex)}
        HomeSceneLayout.nodes(widthPx,heightPx,density).forEach{drawNode(p,it)}
    }
    private fun drawCad(p:GlesProgram){
        val nodes=cadController.nodes(widthPx,heightPx,density);val viewportNode=nodes.first{it.id=="CAD.VIEWPORT"};val viewport=CadViewportNode(viewportNode.bounds)
        drawGrid(p,viewportNode.bounds,viewport);drawCadGeometry(p,viewport);drawSnapFeedback(p,viewport,viewportNode.bounds)
        nodes.filter{it.id!="CAD.VIEWPORT"}.forEach{drawNode(p,it)}
    }
    private fun drawCam(p:GlesProgram){
        val nodes=camController.nodes(widthPx,heightPx,density);val viewportNode=nodes.first{it.id=="CAM.VIEWPORT"};val viewport=CamViewportNode(viewportNode.bounds)
        p.draw(GlesGeometryBuffer.quad(viewportNode.bounds),GLES30.GL_TRIANGLES,widthPx,heightPx,floatArrayOf(0.008f,0.03f,0.05f,1f))
        val presentation=CamPresentation.from(camStateSource.snapshotForFrame())
        drawCamPath(p,viewport,presentation.active,floatArrayOf(0.2f,0.95f,1f,1f),3f)
        drawCamPath(p,viewport,presentation.candidate,floatArrayOf(1f,0.72f,0.2f,0.88f),2f)
        presentation.localMessage?.let{drawCamMessage(p,viewportNode.bounds,it)}
        nodes.filter{it.id!="CAM.VIEWPORT"}.forEach{drawNode(p,it)}
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
            textures?.labelTexture(label)?.let{tex->p.draw(GlesGeometryBuffer.quad(bounds),GLES30.GL_TRIANGLES,widthPx,heightPx,floatArrayOf(1f,1f,1f,0.96f),tex)}
        }
        val status=UiBounds(editor.bounds.left+8f*density,editor.bounds.bottom-statusHeight,editor.bounds.right-8f*density,editor.bounds.bottom)
        val local=presentation.localMessage
        val statusColor=when(local?.severity){MessageSeverity.ALARM->floatArrayOf(0.30f,0.03f,0.04f,0.94f);MessageSeverity.WARNING->floatArrayOf(0.28f,0.18f,0.02f,0.94f);else->floatArrayOf(0.02f,0.12f,0.18f,0.92f)}
        p.draw(GlesGeometryBuffer.quad(status),GLES30.GL_TRIANGLES,widthPx,heightPx,statusColor)
        val candidate=presentation.candidateId?.let{" | CAND $it"}.orEmpty()
        val preview=presentation.previewCandidateId?.let{" | PREVIEW $it"}.orEmpty()
        val warning=local?.let{" | ${it.severity.name}: ${it.text}"}.orEmpty()
        val statusText="WORK ${presentation.workingId} V${presentation.revision} | ${state.editMode.name} | CAM ${presentation.camLink.name}"+candidate+preview+warning
        textures?.labelTexture(statusText)?.let{tex->p.draw(GlesGeometryBuffer.quad(status),GLES30.GL_TRIANGLES,widthPx,heightPx,floatArrayOf(1f,1f,1f,0.96f),tex)}
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
        textures?.labelTexture("${message.severity.name}: ${message.text}")?.let{tex->p.draw(GlesGeometryBuffer.quad(box),GLES30.GL_TRIANGLES,widthPx,heightPx,floatArrayOf(1f,1f,1f,0.96f),tex)}
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
        p.draw(GlesGeometryBuffer.quad(hud),GLES30.GL_TRIANGLES,widthPx,heightPx,floatArrayOf(0.02f,0.12f,0.18f,0.88f));textures?.labelTexture(presentation.hudLabel)?.let{tex->p.draw(GlesGeometryBuffer.quad(hud),GLES30.GL_TRIANGLES,widthPx,heightPx,floatArrayOf(1f,1f,1f,0.96f),tex)}
    }
    private fun drawNode(p:GlesProgram,node:SceneNode){
        if(!node.visible)return;val selectedByTool=sceneRouter.current==SceneId.CAD && node.id=="CAD.${stateSource.snapshotForFrame().activeTool.name}";val pressed=node.id==pressedNodeId
        val base=when{pressed->floatArrayOf(0.35f,0.72f,1f,0.96f);node.visualState==VisualState.ALARM->floatArrayOf(0.42f,0.05f,0.06f,0.94f);selectedByTool||node.visualState==VisualState.SELECTED->floatArrayOf(0.25f,0.9f,1f,0.92f);else->floatArrayOf(0.08f,0.25f,0.38f,0.84f)}
        p.draw(GlesGeometryBuffer.quad(node.bounds),GLES30.GL_TRIANGLES,widthPx,heightPx,base);if(node is RgbGlassButtonNode){val tex=when(val plan=RgbNodeTexturePlan.forNode(node)){is RgbNodeTexturePlan.Asset->textures?.texture(plan.path);is RgbNodeTexturePlan.GeneratedLabel->textures?.labelTexture(plan.label)};if(tex!=null)p.draw(GlesGeometryBuffer.quad(node.bounds),GLES30.GL_TRIANGLES,widthPx,heightPx,floatArrayOf(1f,1f,1f,0.94f),tex)}
    }
}
