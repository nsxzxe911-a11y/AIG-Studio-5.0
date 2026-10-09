package com.aigstudio.production

import android.content.Context
import android.graphics.Color
import android.opengl.GLES20
import android.opengl.GLSurfaceView
import android.opengl.Matrix
import android.util.Log
import android.widget.Button
import android.widget.GridLayout
import android.widget.LinearLayout
import android.widget.TextView
import com.aigstudio.production.runtime.CleanAxisSession
import com.aigstudio.production.runtime.CleanAxisSnapshot
import java.nio.ByteBuffer
import java.nio.ByteOrder
import java.util.Locale
import javax.microedition.khronos.egl.EGLConfig
import javax.microedition.khronos.opengles.GL10

class CleanAxisPanel(
    context:Context,
    private val session:CleanAxisSession,
    private val status:(String)->Unit
):LinearLayout(context) {
    private val hud=TextView(context)
    private val gl=GLSurfaceView(context)
    private val mode=session.mode

    init {
        orientation=VERTICAL
        contentDescription="CLEAN $mode GPU SCENE"
        hud.setTextColor(Color.rgb(99,255,157)); hud.textSize=12f
        addView(hud,LayoutParams(-1,dp(34)))
        val controls=GridLayout(context).apply { columnCount=if(mode=="4AX")2 else if(mode=="5AX")4 else 6 }
        fun axisButton(label:String,delta:Double){
            val b=Button(context).apply {
                text=label; isAllCaps=false; contentDescription="AXIS $mode $label"
                setOnClickListener {
                    when(label.first()) { 'A'->session.rotateA(delta); 'B'->session.rotateB(delta); 'C'->session.rotateC(delta) }
                    updateHud("MOVE")
                    gl.requestRender()
                    val s=session.snapshot()
                    Log.i("AIG-CLEAN-AXIS","CLEAN_AXIS_MOVE|$mode|A=${s.a}|B=${s.b}|C=${s.c}")
                }
            }
            controls.addView(b,GridLayout.LayoutParams().apply { width=0; height=dp(48); columnSpec=GridLayout.spec(GridLayout.UNDEFINED,1f) })
        }
        axisButton("A-",-15.0); axisButton("A+",15.0)
        if(mode in setOf("5AX","6AX")){ axisButton("B-",-15.0); axisButton("B+",15.0) }
        if(mode=="6AX"){ axisButton("C-",-15.0); axisButton("C+",15.0) }
        addView(controls,LayoutParams(-1,dp(52)))
        gl.setEGLContextClientVersion(2)
        gl.setRenderer(AxisRenderer(session))
        gl.renderMode=GLSurfaceView.RENDERMODE_WHEN_DIRTY
        addView(gl,LayoutParams(-1,0,1f))
        updateHud("READY")
        post { gl.requestRender() }
    }

    override fun onDetachedFromWindow(){ gl.onPause(); super.onDetachedFromWindow() }

    private fun updateHud(reason:String){
        val s=session.snapshot()
        val text="$mode • A=${f(s.a)}° • B=${f(s.b)}° • C=${f(s.c)}° • GPU $reason"
        hud.text=text; status(text)
    }
    private fun f(v:Double)=String.format(Locale.US,"%.1f",v)
    private fun dp(v:Int)=(v*resources.displayMetrics.density).toInt().coerceAtLeast(1)

    private class AxisRenderer(private val session:CleanAxisSession):GLSurfaceView.Renderer {
        private var program=0
        private val projection=FloatArray(16)
        private val view=FloatArray(16)
        private var first=true
        private val cube=floatArrayOf(
            -.5f,-.5f,.5f, .5f,-.5f,.5f, .5f,.5f,.5f, -.5f,-.5f,.5f, .5f,.5f,.5f, -.5f,.5f,.5f,
            .5f,-.5f,-.5f, -.5f,-.5f,-.5f, -.5f,.5f,-.5f, .5f,-.5f,-.5f, -.5f,.5f,-.5f, .5f,.5f,-.5f,
            -.5f,-.5f,-.5f, -.5f,-.5f,.5f, -.5f,.5f,.5f, -.5f,-.5f,-.5f, -.5f,.5f,.5f, -.5f,.5f,-.5f,
            .5f,-.5f,.5f, .5f,-.5f,-.5f, .5f,.5f,-.5f, .5f,-.5f,.5f, .5f,.5f,-.5f, .5f,.5f,.5f,
            -.5f,.5f,.5f, .5f,.5f,.5f, .5f,.5f,-.5f, -.5f,.5f,.5f, .5f,.5f,-.5f, -.5f,.5f,-.5f,
            -.5f,-.5f,-.5f, .5f,-.5f,-.5f, .5f,-.5f,.5f, -.5f,-.5f,-.5f, .5f,-.5f,.5f, -.5f,-.5f,.5f
        )
        private val buffer=ByteBuffer.allocateDirect(cube.size*4).order(ByteOrder.nativeOrder()).asFloatBuffer().apply{put(cube);position(0)}

        override fun onSurfaceCreated(unused:GL10?,config:EGLConfig?){
            GLES20.glEnable(GLES20.GL_DEPTH_TEST); GLES20.glClearColor(.005f,.01f,.02f,1f)
            program=link(VS,FS)
            Matrix.setLookAtM(view,0,5.0f,3.8f,6.5f,0f,0f,0f,0f,1f,0f)
            Log.i("AIG-CLEAN-AXIS","CLEAN_AXIS_GPU_CONTEXT|${session.mode}|PASS|GL=${GLES20.glGetString(GLES20.GL_VERSION)}|RENDERER=${GLES20.glGetString(GLES20.GL_RENDERER)}")
        }
        override fun onSurfaceChanged(unused:GL10?,w:Int,h:Int){ GLES20.glViewport(0,0,w,h); Matrix.perspectiveM(projection,0,45f,w.toFloat()/h.coerceAtLeast(1),.1f,100f) }
        override fun onDrawFrame(unused:GL10?){
            GLES20.glClear(GLES20.GL_COLOR_BUFFER_BIT or GLES20.GL_DEPTH_BUFFER_BIT)
            val s=session.snapshot()
            when(s.mode){ "4AX"->draw4(s); "5AX"->draw5(s); "6AX"->draw6(s) }
            if(first){ first=false; Log.i("AIG-CLEAN-AXIS","CLEAN_AXIS_GPU_FIRST_FRAME|${s.mode}|PASS|ONE_SCENE_ONE_RENDERER") }
        }
        private fun draw4(s:CleanAxisSnapshot){
            part(0f,-1.15f,0f,3.6f,.28f,2.4f,0f,0f,0f,.05f,.7f,.9f)
            part(-1.55f,-.15f,0f,.28f,1.8f,.55f,0f,0f,0f,.2f,.55f,.95f)
            part(1.55f,-.15f,0f,.28f,1.8f,.55f,0f,0f,0f,.2f,.55f,.95f)
            part(0f,-.05f,0f,2.65f,.38f,1.25f,s.a.toFloat(),0f,0f,.35f,.95f,.55f)
        }
        private fun draw5(s:CleanAxisSnapshot){
            part(0f,-1.15f,0f,3.7f,.28f,2.5f,0f,0f,0f,.05f,.7f,.9f)
            part(-1.55f,-.25f,0f,.30f,1.65f,.65f,0f,0f,0f,.2f,.55f,.95f)
            part(1.55f,-.25f,0f,.30f,1.65f,.65f,0f,0f,0f,.2f,.55f,.95f)
            part(0f,-.15f,0f,2.65f,.30f,1.55f,s.a.toFloat(),0f,0f,.55f,.3f,.95f)
            part(0f,.05f,0f,1.65f,.22f,1.15f,s.a.toFloat(),s.b.toFloat(),0f,.3f,.95f,.55f)
            part(0f,1.30f,0f,.42f,1.05f,.42f,0f,s.b.toFloat(),0f,.95f,.65f,.2f)
        }
        private fun draw6(s:CleanAxisSnapshot){
            part(0f,-1.2f,0f,3.4f,.30f,2.5f,0f,0f,0f,.05f,.7f,.9f)
            part(-1.15f,.10f,0f,.45f,2.5f,.70f,0f,0f,0f,.2f,.55f,.95f)
            part(-.15f,1.15f,0f,1.7f,.38f,.55f,0f,0f,s.c.toFloat(),.55f,.3f,.95f)
            part(.75f,.55f,0f,.35f,1.15f,.35f,s.a.toFloat(),s.b.toFloat(),s.c.toFloat(),.95f,.65f,.2f)
            part(.75f,-.45f,0f,1.35f,.24f,1.10f,s.a.toFloat(),s.b.toFloat(),s.c.toFloat(),.3f,.95f,.55f)
        }
        private fun part(tx:Float,ty:Float,tz:Float,sx:Float,sy:Float,sz:Float,rx:Float,ry:Float,rz:Float,r:Float,g:Float,b:Float){
            val model=FloatArray(16); val mv=FloatArray(16); val mvp=FloatArray(16)
            Matrix.setIdentityM(model,0); Matrix.translateM(model,0,tx,ty,tz); if(rx!=0f)Matrix.rotateM(model,0,rx,1f,0f,0f); if(ry!=0f)Matrix.rotateM(model,0,ry,0f,1f,0f); if(rz!=0f)Matrix.rotateM(model,0,rz,0f,0f,1f); Matrix.scaleM(model,0,sx,sy,sz)
            Matrix.multiplyMM(mv,0,view,0,model,0); Matrix.multiplyMM(mvp,0,projection,0,mv,0)
            GLES20.glUseProgram(program); val p=GLES20.glGetAttribLocation(program,"aPos"); val m=GLES20.glGetUniformLocation(program,"uMvp"); val c=GLES20.glGetUniformLocation(program,"uColor")
            buffer.position(0); GLES20.glEnableVertexAttribArray(p); GLES20.glVertexAttribPointer(p,3,GLES20.GL_FLOAT,false,12,buffer); GLES20.glUniformMatrix4fv(m,1,false,mvp,0); GLES20.glUniform4f(c,r,g,b,1f); GLES20.glDrawArrays(GLES20.GL_TRIANGLES,0,cube.size/3); GLES20.glDisableVertexAttribArray(p)
        }
        private fun shader(type:Int,src:String)=GLES20.glCreateShader(type).also{GLES20.glShaderSource(it,src);GLES20.glCompileShader(it)}
        private fun link(v:String,f:String)=GLES20.glCreateProgram().also{GLES20.glAttachShader(it,shader(GLES20.GL_VERTEX_SHADER,v));GLES20.glAttachShader(it,shader(GLES20.GL_FRAGMENT_SHADER,f));GLES20.glLinkProgram(it)}
        companion object { const val VS="attribute vec3 aPos; uniform mat4 uMvp; void main(){gl_Position=uMvp*vec4(aPos,1.0);}"; const val FS="precision mediump float; uniform vec4 uColor; void main(){gl_FragColor=uColor;}" }
    }
}
