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
import kotlin.math.ceil
import kotlin.math.min

internal data class GeneratedLabelTexture(val id:Int,val aspectRatio:Float)
private data class TextureEntry(val id:Int,val width:Int,val height:Int)

class RgbTextureCatalog(private val context: Context) {
    private val cache = linkedMapOf<String, TextureEntry>()

    fun texture(path: String?): Int? {
        if (path.isNullOrBlank()) return null
        cache[path]?.let { return it.id }
        val bitmap = runCatching { context.assets.open(path).use(BitmapFactory::decodeStream) }.getOrNull() ?: return null
        return upload(path, bitmap).id
    }

    fun labelTexture(label: String): Int? = labelTextureRef(label)?.id

    internal fun labelTextureRef(label:String):GeneratedLabelTexture? {
        val clean=label.trim().ifBlank{return null}
        val key="generated-label:$clean"
        cache[key]?.let{return GeneratedLabelTexture(it.id,it.width.toFloat()/it.height.toFloat())}
        val paint=Paint(Paint.ANTI_ALIAS_FLAG).apply{
            color=Color.WHITE
            textAlign=Paint.Align.LEFT
            typeface=Typeface.create(Typeface.MONOSPACE,Typeface.BOLD)
            textSize=64f
        }
        val horizontalPad=20
        val verticalPad=14
        val maxInnerWidth=1960f
        val measured0=paint.measureText(clean).coerceAtLeast(1f)
        if(measured0>maxInnerWidth)paint.textSize*=maxInnerWidth/measured0
        val measured=paint.measureText(clean).coerceAtLeast(1f)
        val fm=paint.fontMetrics
        val textHeight=(fm.descent-fm.ascent).coerceAtLeast(1f)
        val width=(ceil(measured).toInt()+horizontalPad*2).coerceIn(48,2048)
        val height=(ceil(textHeight).toInt()+verticalPad*2).coerceIn(48,256)
        val bitmap=Bitmap.createBitmap(width,height,Bitmap.Config.ARGB_8888)
        val canvas=Canvas(bitmap)
        val baseline=height/2f-(paint.ascent()+paint.descent())/2f
        canvas.drawText(clean,horizontalPad.toFloat(),baseline,paint)
        val entry=upload(key,bitmap)
        return GeneratedLabelTexture(entry.id,entry.width.toFloat()/entry.height.toFloat())
    }

    private fun upload(key: String, bitmap: Bitmap): TextureEntry {
        val width=bitmap.width
        val height=bitmap.height
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
        val entry=TextureEntry(id,width,height)
        cache[key] = entry
        return entry
    }

    fun release() {
        if (cache.isNotEmpty()) GLES30.glDeleteTextures(cache.size, cache.values.map{it.id}.toIntArray(), 0)
        cache.clear()
    }
}