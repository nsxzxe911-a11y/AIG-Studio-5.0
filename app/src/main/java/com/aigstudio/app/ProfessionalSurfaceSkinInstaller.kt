package com.aigstudio.app

import android.app.Activity
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.ColorFilter
import android.graphics.Paint
import android.graphics.PixelFormat
import android.graphics.Rect
import android.graphics.drawable.Drawable
import android.graphics.drawable.GradientDrawable
import android.view.View
import android.view.ViewGroup
import android.view.ViewTreeObserver
import android.widget.TextView
import com.aigstudio.core.UiAssetContract
import java.util.Collections
import java.util.WeakHashMap
import kotlin.math.max

/**
 * Visual-only professional page binding.
 *
 * This installer never owns input callbacks, CAD/CAM geometry, NC state, or
 * multi-axis motion. Existing Runtime listeners and renderers stay authoritative.
 */
object ProfessionalSurfaceSkinInstaller {
    private const val PROCEDURAL_RGB_GLASS = "PROCEDURAL_RGB_GLASS"
    private val installed = Collections.newSetFromMap(WeakHashMap<Activity, Boolean>())
    private val applied = WeakHashMap<View, String>()

    fun install(activity: Activity) {
        if (!installed.add(activity)) return
        val decor = activity.window.decorView
        val listener = ViewTreeObserver.OnGlobalLayoutListener { scan(activity, decor) }
        decor.viewTreeObserver.addOnGlobalLayoutListener(listener)
        decor.post { scan(activity, decor) }
    }

    private fun scan(activity: Activity, decor: View) {
        val home = findByDescription(decor, "AIG CNC FORMAL RGB HOME")
        if (home != null && home.isShown) {
            applySurface(activity, home, "HOME")
            return
        }

        findMachiningViews(decor).forEach { model ->
            val mode = axisMode(activity, model) ?: return@forEach
            applySurface(activity, model, mode)
        }

        val mode = findVisibleRuntimeMode(decor) ?: return
        val host = activity.findViewById<ViewGroup>(android.R.id.content) ?: return
        applySurface(activity, host, mode)
    }

    private fun findByDescription(view: View, marker: String): View? {
        if (view.isShown && view.contentDescription?.toString()?.contains(marker) == true) return view
        if (view is ViewGroup) {
            for (i in 0 until view.childCount) {
                findByDescription(view.getChildAt(i), marker)?.let { return it }
            }
        }
        return null
    }

    private fun findMachiningViews(view: View, out: MutableList<Machining3DView> = mutableListOf()): List<Machining3DView> {
        if (view is Machining3DView && view.isShown) out += view
        if (view is ViewGroup) for (i in 0 until view.childCount) findMachiningViews(view.getChildAt(i), out)
        return out
    }

    private fun axisMode(activity: Activity, view: Machining3DView): String? {
        val direct = runCatching {
            val field = view.javaClass.getDeclaredField("machineMode").apply { isAccessible = true }
            (field.get(view) as? String)?.uppercase()
        }.getOrNull()
        if (direct in setOf("3AX", "4AX", "5AX", "6AX")) return direct
        return runCatching {
            val field = activity.javaClass.getDeclaredField("machiningAxisMode").apply { isAccessible = true }
            (field.get(activity) as? String)?.uppercase()
        }.getOrNull()?.takeIf { it in setOf("3AX", "4AX", "5AX", "6AX") }
    }

    private fun findVisibleRuntimeMode(view: View): String? {
        if (view is TextView && view.isShown) {
            val text = view.text?.toString()?.trim().orEmpty()
            if (text.startsWith("UX •")) {
                val upper = text.uppercase()
                for (id in listOf("6AX", "5AX", "4AX", "3AX", "CAD", "CAM", "SIM", "NC", "AI")) {
                    if (upper.contains(id)) return id
                }
            }
        }
        if (view is ViewGroup) {
            for (i in 0 until view.childCount) findVisibleRuntimeMode(view.getChildAt(i))?.let { return it }
        }
        return null
    }

    private fun applySurface(activity: Activity, target: View, surface: String) {
        if (applied[target] == surface) return
        applied[target] = surface
        if (surface == "6AX") {
            require(UiAssetContract.SIX_AXIS_VISUAL_POLICY == PROCEDURAL_RGB_GLASS)
            target.background = glassDrawable()
            target.invalidate()
            return
        }
        val visual = when (surface) {
            "HOME" -> UiAssetContract.HOME_VISUAL
            "CAD" -> UiAssetContract.CAD_VISUAL
            "CAM" -> UiAssetContract.CAM_VISUAL
            "SIM" -> UiAssetContract.SIM_VISUAL
            "3AX" -> UiAssetContract.AXIS3_VISUAL
            "4AX" -> UiAssetContract.AXIS4_VISUAL
            "5AX" -> UiAssetContract.AXIS5_VISUAL
            else -> null
        }
        if (visual == null) {
            target.background = glassDrawable()
        } else {
            loadCover(activity, visual, surface)?.let { target.background = it }
        }
        target.invalidate()
    }

    private fun loadCover(activity: Activity, asset: String, surface: String): Drawable? = runCatching {
        val bitmap = activity.assets.open(asset).use(BitmapFactory::decodeStream)
            ?: error("Unable to decode canonical visual: $asset")
        require(bitmap.width > 0 && bitmap.height > 0) { "Invalid canonical visual dimensions: $asset" }
        CanonicalCoverDrawable(bitmap, if (surface == "HOME") 218 else 74)
    }.getOrNull()

    private fun glassDrawable() = GradientDrawable(
        GradientDrawable.Orientation.TL_BR,
        intArrayOf(Color.rgb(2, 4, 7), Color.rgb(7, 17, 27), Color.rgb(2, 4, 7))
    ).apply {
        cornerRadius = 18f
        setStroke(1, Color.rgb(39, 233, 255))
    }
}

private class CanonicalCoverDrawable(
    private val bitmap: Bitmap,
    alpha: Int
) : Drawable() {
    private val imagePaint = Paint(Paint.ANTI_ALIAS_FLAG or Paint.FILTER_BITMAP_FLAG).apply {
        this.alpha = alpha.coerceIn(0, 255)
    }
    private val shadePaint = Paint().apply { color = Color.argb(58, 2, 4, 7) }

    override fun draw(canvas: Canvas) {
        val b = bounds
        if (b.width() <= 0 || b.height() <= 0) return
        val scale = max(b.width().toFloat() / bitmap.width, b.height().toFloat() / bitmap.height)
        val srcW = (b.width() / scale).toInt().coerceIn(1, bitmap.width)
        val srcH = (b.height() / scale).toInt().coerceIn(1, bitmap.height)
        val sx = ((bitmap.width - srcW) / 2).coerceAtLeast(0)
        val sy = ((bitmap.height - srcH) / 2).coerceAtLeast(0)
        canvas.drawBitmap(bitmap, Rect(sx, sy, sx + srcW, sy + srcH), b, imagePaint)
        canvas.drawRect(b, shadePaint)
    }

    override fun setAlpha(alpha: Int) { imagePaint.alpha = alpha.coerceIn(0, 255) }
    override fun setColorFilter(colorFilter: ColorFilter?) { imagePaint.colorFilter = colorFilter }
    @Deprecated("Deprecated in Android")
    override fun getOpacity(): Int = PixelFormat.TRANSLUCENT
}
