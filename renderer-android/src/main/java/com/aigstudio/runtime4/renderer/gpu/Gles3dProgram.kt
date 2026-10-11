package com.aigstudio.runtime4.renderer.gpu

import android.opengl.GLES30
import java.nio.ByteBuffer
import java.nio.ByteOrder

class Gles3dProgram {
    private val program:Int
    private val mvpLoc:Int
    private val modelLoc:Int
    private val colorLoc:Int

    init {
        val vertex=compile(GLES30.GL_VERTEX_SHADER,"""#version 300 es
            layout(location=0) in vec3 aPosition;
            layout(location=1) in vec3 aNormal;
            uniform mat4 uMvp;
            uniform mat4 uModel;
            out vec3 vNormal;
            void main(){
                gl_Position=uMvp*vec4(aPosition,1.0);
                vNormal=normalize(mat3(uModel)*aNormal);
            }
        """.trimIndent())
        val fragment=compile(GLES30.GL_FRAGMENT_SHADER,"""#version 300 es
            precision mediump float;
            in vec3 vNormal;
            uniform vec4 uColor;
            out vec4 fragColor;
            void main(){
                vec3 lightDir=normalize(vec3(0.35,0.8,0.45));
                float diffuse=max(dot(normalize(vNormal),lightDir),0.0);
                float lit=0.28+0.72*diffuse;
                fragColor=vec4(uColor.rgb*lit,uColor.a);
            }
        """.trimIndent())
        program=GLES30.glCreateProgram()
        GLES30.glAttachShader(program,vertex);GLES30.glAttachShader(program,fragment);GLES30.glLinkProgram(program)
        val status=IntArray(1);GLES30.glGetProgramiv(program,GLES30.GL_LINK_STATUS,status,0)
        require(status[0]==GLES30.GL_TRUE){"GLES3D link failed: "+GLES30.glGetProgramInfoLog(program)}
        GLES30.glDeleteShader(vertex);GLES30.glDeleteShader(fragment)
        mvpLoc=GLES30.glGetUniformLocation(program,"uMvp")
        modelLoc=GLES30.glGetUniformLocation(program,"uModel")
        colorLoc=GLES30.glGetUniformLocation(program,"uColor")
    }

    fun draw(vertices:FloatArray,mvp:FloatArray,model:FloatArray,color:FloatArray){
        val buffer=ByteBuffer.allocateDirect(vertices.size*4).order(ByteOrder.nativeOrder()).asFloatBuffer()
        buffer.put(vertices).position(0)
        GLES30.glUseProgram(program)
        GLES30.glUniformMatrix4fv(mvpLoc,1,false,mvp,0)
        GLES30.glUniformMatrix4fv(modelLoc,1,false,model,0)
        GLES30.glUniform4fv(colorLoc,1,color,0)
        GLES30.glEnableVertexAttribArray(0);GLES30.glEnableVertexAttribArray(1)
        buffer.position(0);GLES30.glVertexAttribPointer(0,3,GLES30.GL_FLOAT,false,24,buffer)
        buffer.position(3);GLES30.glVertexAttribPointer(1,3,GLES30.GL_FLOAT,false,24,buffer)
        GLES30.glDrawArrays(GLES30.GL_TRIANGLES,0,vertices.size/6)
        GLES30.glDisableVertexAttribArray(0);GLES30.glDisableVertexAttribArray(1)
    }

    fun release(){GLES30.glDeleteProgram(program)}

    private fun compile(type:Int,source:String):Int{
        val shader=GLES30.glCreateShader(type);GLES30.glShaderSource(shader,source);GLES30.glCompileShader(shader)
        val status=IntArray(1);GLES30.glGetShaderiv(shader,GLES30.GL_COMPILE_STATUS,status,0)
        require(status[0]==GLES30.GL_TRUE){"GLES3D shader compile failed: "+GLES30.glGetShaderInfoLog(shader)}
        return shader
    }
}