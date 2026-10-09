package com.aigstudio.runtime4.renderer.gpu

import android.content.Context
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Paint
import android.graphics.Typeface
import android.opengl.GLES30
import android.opengl.GLUtils
import kotlin.math.min

class RgbTextureCatalog(private val context: Context) {
    private val cache = linkedMapOf<String, Int>()

    fun texture(path: String?): Int? {
        if (path.isNullOrBlank()) return null
        cache[path]?.let { return it }
        val bitmap = runCatching { context.assets.open(path).use(BitmapFactory::decodeStream) }.getOrNull() ?: return null
        return upload(path, bitmap)
    }

    fun labelTexture(label: String): Int? {
        val clean = label.trim().ifBlank { return null }
        val key = "generated-label:$clean"
        cache[key]?.let { return it }
        val bitmap = Bitmap.createBitmap(512, 256, Bitmap.Config.ARGB_8888)
        val canvas = Canvas(bitmap)
        val paint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
            color = Color.WHITE
            textAlign = Paint.Align.CENTER
            typeface = Typeface.create(Typeface.DEFAULT, Typeface.BOLD)
            textSize = 92f
        }
        val maxWidth = 448f
        val measured = paint.measureText(clean).coerceAtLeast(1f)
        paint.textSize *= min(1f, maxWidth / measured)
        val baseline = bitmap.height / 2f - (paint.ascent() + paint.descent()) / 2f
        canvas.drawText(clean, bitmap.width / 2f, baseline, paint)
        return upload(key, bitmap)
    }

    private fun upload(key: String, bitmap: Bitmap): Int {
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
        cache[key] = id
        return id
    }

    fun release() {
        if (cache.isNotEmpty()) GLES30.glDeleteTextures(cache.size, cache.values.toIntArray(), 0)
        cache.clear()
    }
}
