package com.aigstudio.app

import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Paint
import android.graphics.RectF
import android.view.View

object StudioVisualSceneRenderer {
    private val cache=mutableMapOf<String,Bitmap?>()
    private val paint=Paint(Paint.ANTI_ALIAS_FLAG or Paint.FILTER_BITMAP_FLAG or Paint.DITHER_FLAG)

    private fun fileFor(surface:String):String = when(surface.uppercase()) {
        "CAD" -> "visuals/cad_visual.png"
        "CAM" -> "visuals/cam_visual.jpg"
        "SIM","3D" -> "visuals/sim_visual.jpg"
        "3AX" -> "visuals/axis3_visual.jpg"
        "4AX" -> "visuals/axis4_visual.png"
        "5AX","5X","AXIS" -> "visuals/axis5_visual.jpg"
        "HOME" -> "visuals/home_visual.png"
        else -> "visuals/home_visual.png"
    }

    private fun image(view:View,surface:String):Bitmap? {
        if(surface.uppercase() != "HOME") return null
        val file=fileFor(surface)
        if(cache.containsKey(file)) return cache[file]
        val bitmap=runCatching {
            view.context.assets.open(file).use(BitmapFactory::decodeStream)
        }.getOrNull()
        cache[file]=bitmap
        return bitmap
    }

    fun draw(canvas:Canvas,view:View,surface:String,alpha:Int=135,darkAlpha:Int=56) {
        val bitmap=image(view,surface) ?: return
        val w=view.width.toFloat(); val h=view.height.toFloat()
        if(w<=0f || h<=0f) return
        val srcRatio=bitmap.width.toFloat()/bitmap.height.toFloat()
        val dstRatio=w/h
        val dw=if(srcRatio>dstRatio) h*srcRatio else w
        val dh=if(srcRatio>dstRatio) h else w/srcRatio
        paint.alpha=alpha.coerceIn(0,255)
        canvas.drawBitmap(
            bitmap,null,
            RectF((w-dw)/2f,(h-dh)/2f,(w+dw)/2f,(h+dh)/2f),
            paint
        )
        canvas.drawColor(Color.argb(darkAlpha.coerceIn(0,220),2,7,14))
    }
}
