package com.aigstudio.runtime4.renderer.gpu

import android.opengl.GLES30

class GlesProgram {
    private val program: Int
    private val viewportLoc: Int
    private val colorLoc: Int
    private val useTextureLoc: Int

    init {
        val vertex = compile(GLES30.GL_VERTEX_SHADER, """#version 300 es
            layout(location=0) in vec2 aPosition;
            layout(location=1) in vec2 aTexCoord;
            uniform vec2 uViewport;
            out vec2 vTexCoord;
            void main(){
                vec2 zeroToOne = aPosition / uViewport;
                vec2 clip = zeroToOne * 2.0 - 1.0;
                gl_Position = vec4(clip.x, -clip.y, 0.0, 1.0);
                vTexCoord = aTexCoord;
            }
        """.trimIndent())
        val fragment = compile(GLES30.GL_FRAGMENT_SHADER, """#version 300 es
            precision mediump float;
            in vec2 vTexCoord;
            uniform vec4 uColor;
            uniform sampler2D uTexture;
            uniform int uUseTexture;
            out vec4 fragColor;
            void main(){
                vec4 sampleColor = uUseTexture == 1 ? texture(uTexture, vTexCoord) : vec4(1.0);
                fragColor = sampleColor * uColor;
            }
        """.trimIndent())
        program = GLES30.glCreateProgram()
        GLES30.glAttachShader(program, vertex)
        GLES30.glAttachShader(program, fragment)
        GLES30.glLinkProgram(program)
        val status = IntArray(1)
        GLES30.glGetProgramiv(program, GLES30.GL_LINK_STATUS, status, 0)
        require(status[0] == GLES30.GL_TRUE) { "GLES program link failed: ${GLES30.glGetProgramInfoLog(program)}" }
        GLES30.glDeleteShader(vertex); GLES30.glDeleteShader(fragment)
        viewportLoc = GLES30.glGetUniformLocation(program, "uViewport")
        colorLoc = GLES30.glGetUniformLocation(program, "uColor")
        useTextureLoc = GLES30.glGetUniformLocation(program, "uUseTexture")
    }

    fun draw(vertices: FloatArray, mode: Int, width: Float, height: Float, color: FloatArray, textureId: Int? = null, lineWidth: Float = 1f) {
        val buffer = GlesGeometryBuffer.buffer(vertices)
        GLES30.glUseProgram(program)
        GLES30.glUniform2f(viewportLoc, width, height)
        GLES30.glUniform4fv(colorLoc, 1, color, 0)
        GLES30.glUniform1i(useTextureLoc, if (textureId != null) 1 else 0)
        if (textureId != null) {
            GLES30.glActiveTexture(GLES30.GL_TEXTURE0)
            GLES30.glBindTexture(GLES30.GL_TEXTURE_2D, textureId)
        }
        GLES30.glEnableVertexAttribArray(0)
        GLES30.glEnableVertexAttribArray(1)
        buffer.position(0); GLES30.glVertexAttribPointer(0, 2, GLES30.GL_FLOAT, false, 16, buffer)
        buffer.position(2); GLES30.glVertexAttribPointer(1, 2, GLES30.GL_FLOAT, false, 16, buffer)
        GLES30.glLineWidth(lineWidth)
        GLES30.glDrawArrays(mode, 0, vertices.size / 4)
        GLES30.glDisableVertexAttribArray(0); GLES30.glDisableVertexAttribArray(1)
        if (textureId != null) GLES30.glBindTexture(GLES30.GL_TEXTURE_2D, 0)
    }

    fun release() { GLES30.glDeleteProgram(program) }

    private fun compile(type: Int, source: String): Int {
        val shader = GLES30.glCreateShader(type)
        GLES30.glShaderSource(shader, source)
        GLES30.glCompileShader(shader)
        val status = IntArray(1)
        GLES30.glGetShaderiv(shader, GLES30.GL_COMPILE_STATUS, status, 0)
        require(status[0] == GLES30.GL_TRUE) { "GLES shader compile failed: ${GLES30.glGetShaderInfoLog(shader)}" }
        return shader
    }
}
