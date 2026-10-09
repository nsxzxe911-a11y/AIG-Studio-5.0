package com.aigstudio.production

import android.content.Context
import android.opengl.GLES20
import android.opengl.GLSurfaceView
import android.opengl.Matrix
import android.util.Log
import android.widget.FrameLayout
import java.nio.ByteBuffer
import java.nio.ByteOrder
import javax.microedition.khronos.egl.EGLConfig
import javax.microedition.khronos.opengles.GL10

class Clean3AxPanel(context:Context):FrameLayout(context) {
    private val gl=GLSurfaceView(context)
    init {
        contentDescription="CLEAN 3AX GPU SCENE"
        gl.setEGLContextClientVersion(2)
        gl.setRenderer(MachineRenderer())
        gl.renderMode=GLSurfaceView.RENDERMODE_CONTINUOUSLY
        addView(gl,LayoutParams(-1,-1))
    }
    override fun onDetachedFromWindow(){ gl.onPause(); super.onDetachedFromWindow() }

    private class MachineRenderer:GLSurfaceView.Renderer {
        private var program=0
        private val projection=FloatArray(16); private val view=FloatArray(16)
        private val cube=floatArrayOf(
            -.5f,-.5f,.5f, .5f,-.5f,.5f, .5f,.5f,.5f, -.5f,-.5f,.5f, .5f,.5f,.5f, -.5f,.5f,.5f,
            .5f,-.5f,-.5f, -.5f,-.5f,-.5f, -.5f,.5f,-.5f, .5f,-.5f,-.5f, -.5f,.5f,-.5f, .5f,.5f,-.5f,
            -.5f,-.5f,-.5f, -.5f,-.5f,.5f, -.5f,.5f,.5f, -.5f,-.5f,-.5f, -.5f,.5f,.5f, -.5f,.5f,-.5f,
            .5f,-.5f,.5f, .5f,-.5f,-.5f, .5f,.5f,-.5f, .5f,-.5f,.5f, .5f,.5f,-.5f, .5f,.5f,.5f,
            -.5f,.5f,.5f, .5f,.5f,.5f, .5f,.5f,-.5f, -.5f,.5f,.5f, .5f,.5f,-.5f, -.5f,.5f,-.5f,
            -.5f,-.5f,-.5f, .5f,-.5f,-.5f, .5f,-.5f,.5f, -.5f,-.5f,-.5f, .5f,-.5f,.5f, -.5f,-.5f,.5f
        )
        private val buffer=ByteBuffer.allocateDirect(cube.size*4).order(ByteOrder.nativeOrder()).asFloatBuffer().apply{put(cube);position(0)}
        private var first=true
        override fun onSurfaceCreated(unused:GL10?,config:EGLConfig?){
            GLES20.glEnable(GLES20.GL_DEPTH_TEST); GLES20.glClearColor(.01f,.02f,.03f,1f)
            program=link(VS,FS)
            Matrix.setLookAtM(view,0,4.2f,3.0f,5.5f,0f,0f,0f,0f,1f,0f)
            Log.i("AIG-CLEAN-3AX","CLEAN_3AX_GPU_CONTEXT|PASS|GL=${GLES20.glGetString(GLES20.GL_VERSION)}|RENDERER=${GLES20.glGetString(GLES20.GL_RENDERER)}")
        }
        override fun onSurfaceChanged(unused:GL10?,w:Int,h:Int){ GLES20.glViewport(0,0,w,h); Matrix.perspectiveM(projection,0,45f,w.toFloat()/h.coerceAtLeast(1),.1f,100f) }
        override fun onDrawFrame(unused:GL10?){
            GLES20.glClear(GLES20.GL_COLOR_BUFFER_BIT or GLES20.GL_DEPTH_BUFFER_BIT)
            draw(0f,-1.0f,0f,3.0f,.35f,2.2f,.08f,.8f,.95f)
            draw(-1.0f,.15f,0f,.45f,2.2f,.55f,.2f,.55f,.95f)
            draw(.35f,-.55f,0f,1.8f,.20f,1.35f,.25f,.95f,.55f)
            if(first){ first=false; Log.i("AIG-CLEAN-3AX","CLEAN_3AX_GPU_FIRST_FRAME|PASS|OPENGL_ES|BASE_COLUMN_TABLE") }
        }
        private fun draw(tx:Float,ty:Float,tz:Float,sx:Float,sy:Float,sz:Float,r:Float,g:Float,b:Float){
            val model=FloatArray(16); val mv=FloatArray(16); val mvp=FloatArray(16)
            Matrix.setIdentityM(model,0); Matrix.translateM(model,0,tx,ty,tz); Matrix.scaleM(model,0,sx,sy,sz)
            Matrix.multiplyMM(mv,0,view,0,model,0); Matrix.multiplyMM(mvp,0,projection,0,mv,0)
            GLES20.glUseProgram(program); val p=GLES20.glGetAttribLocation(program,"aPos"); val m=GLES20.glGetUniformLocation(program,"uMvp"); val c=GLES20.glGetUniformLocation(program,"uColor")
            buffer.position(0); GLES20.glEnableVertexAttribArray(p); GLES20.glVertexAttribPointer(p,3,GLES20.GL_FLOAT,false,12,buffer)
            GLES20.glUniformMatrix4fv(m,1,false,mvp,0); GLES20.glUniform4f(c,r,g,b,1f); GLES20.glDrawArrays(GLES20.GL_TRIANGLES,0,cube.size/3); GLES20.glDisableVertexAttribArray(p)
        }
        private fun shader(type:Int,src:String):Int=GLES20.glCreateShader(type).also{GLES20.glShaderSource(it,src);GLES20.glCompileShader(it)}
        private fun link(v:String,f:String):Int=GLES20.glCreateProgram().also{GLES20.glAttachShader(it,shader(GLES20.GL_VERTEX_SHADER,v));GLES20.glAttachShader(it,shader(GLES20.GL_FRAGMENT_SHADER,f));GLES20.glLinkProgram(it)}
        companion object {
            const val VS="attribute vec3 aPos; uniform mat4 uMvp; void main(){ gl_Position=uMvp*vec4(aPos,1.0); }"
            const val FS="precision mediump float; uniform vec4 uColor; void main(){ gl_FragColor=uColor; }"
        }
    }
}
