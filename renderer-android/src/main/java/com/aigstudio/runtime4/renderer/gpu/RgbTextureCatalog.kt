package com.aigstudio.runtime4.renderer.gpu

import android.content.Context
import android.graphics.BitmapFactory
import android.opengl.GLES30
import android.opengl.GLUtils

class RgbTextureCatalog(private val context: Context) {
    private val cache = linkedMapOf<String, Int>()

    fun texture(path: String?): Int? {
        if (path.isNullOrBlank()) return null
        cache[path]?.let { return it }
        val bitmap = runCatching { context.assets.open(path).use(BitmapFactory::decodeStream) }.getOrNull() ?: return null
        val ids = IntArray(1)
        GLES30.glGenTextures(1, ids, 0)
        val id = ids[0]
        GLES30.glBindTexture(GLES30.GL_TEXTURE_2D, id)
        GLES30.glTexParameteri(GLES30.GL_TEXTURE_2D, GLES30.GL_TEXTURE_MIN_FILTER, GLES30.GL_LINEAR)
        GLES30.glTexParameteri(GLES30.GL_TEXTURE_2D, GLES30.GL_TEXTURE_MAG_FILTER, GLES30.GL_LINEAR)
        GLES30.glTexParameteri(GLES30.GL_TEXTURE_2D, GLES30.GL_TEXTURE_WRAP_S, GLES30.GL_CLAMP_TO_EDGE)
        GLES30.glTexParameteri(GLES30.GL_TEXTURE_2D, GLES30.GL_TEXTURE_WRAP_T, GLES30.GL_CLAMP_TO_EDGE)
        GLUtils.texImage2D(GLES30.GL_TEXTURE_2D, 0, bitmap, 0)
        bitmap.recycle()
        GLES30.glBindTexture(GLES30.GL_TEXTURE_2D, 0)
        cache[path] = id
        return id
    }

    fun release() {
        if (cache.isNotEmpty()) GLES30.glDeleteTextures(cache.size, cache.values.toIntArray(), 0)
        cache.clear()
    }
}
