package com.aigstudio.app

import android.app.Activity
import android.app.Application
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.ColorFilter
import android.graphics.Paint
import android.graphics.PixelFormat
import android.graphics.Rect
import android.graphics.drawable.Drawable
import android.os.Bundle
import android.util.Log
import android.view.View
import android.view.ViewGroup
import android.view.ViewTreeObserver
import com.aigstudio.core.UiAssetContract
import java.security.MessageDigest
import java.util.Collections
import java.util.WeakHashMap
import kotlin.math.max

/**
 * Installs the approved AI RGB HOME background without changing MainActivity's
 * machining callbacks. Failure is warning-only: the current Production HOME
 * remains usable and no rollback/downgrade is attempted.
 */
class AigStudioApplication : Application(), Application.ActivityLifecycleCallbacks {
    private val applied = Collections.newSetFromMap(WeakHashMap<View, Boolean>())

    override fun onCreate() {
        super.onCreate()
        registerActivityLifecycleCallbacks(this)
    }

    override fun onActivityCreated(activity: Activity, savedInstanceState: Bundle?) {
        installGlobalSkinChrome(activity)
        OptionalTutorialModule.install(activity)
        CadAssistOverlayInstaller.install(activity)
        CadProfileOverlayInstaller.install(activity)
        CadAdvancedOverlayInstaller.install(activity)
        val decor = activity.window.decorView
        val listener = object : ViewTreeObserver.OnGlobalLayoutListener {
            override fun onGlobalLayout() {
                val home = findFormalHome(decor) ?: return
                if (applied.add(home)) {
                    HomeRgbAsset.load(activity)?.let { home.background = it; home.invalidate() }
                }
                if (decor.viewTreeObserver.isAlive) decor.viewTreeObserver.removeOnGlobalLayoutListener(this)
            }
        }
        decor.viewTreeObserver.addOnGlobalLayoutListener(listener)
        decor.post { listener.onGlobalLayout() }
    }

    private fun installGlobalSkinChrome(activity:Activity) {
        runCatching {
            StudioThemePackRuntime.switchTo("aig_rgb_global_v1")
            activity.window.statusBarColor=Color.rgb(2,4,7)
            activity.window.navigationBarColor=Color.rgb(2,4,7)
            activity.window.decorView.setBackgroundColor(Color.rgb(2,4,7))
        }.onFailure {
            Log.w("AIG-RGB-SKIN","GLOBAL_SKIN_CHROME_SKIP|STATUS_ONLY|NO_ROLLBACK",it)
        }
    }

    private fun findFormalHome(view: View): View? {
        if (view.contentDescription?.toString()?.contains("AIG CNC FORMAL RGB HOME") == true) return view
        if (view is ViewGroup) {
            for (i in 0 until view.childCount) findFormalHome(view.getChildAt(i))?.let { return it }
        }
        return null
    }

    override fun onActivityStarted(activity: Activity) = Unit
    override fun onActivityResumed(activity: Activity) = Unit
    override fun onActivityPaused(activity: Activity) = Unit
    override fun onActivityStopped(activity: Activity) = Unit
    override fun onActivitySaveInstanceState(activity: Activity, outState: Bundle) = Unit
    override fun onActivityDestroyed(activity: Activity) = Unit
}

private object OptionalTutorialModule {
    private const val TAG="AIG-OPTIONAL-MODULE"
    fun install(activity:Activity) {
        runCatching {
            val type=Class.forName("com.aigstudio.app.tutorial.TutorialOverlayInstaller")
            val instance=type.getField("INSTANCE").get(null)
            type.getMethod("install",Activity::class.java).invoke(instance,activity)
        }.onFailure {
            Log.w(TAG,"OPTIONAL_MODULE_SKIP|TUTORIAL_V1|ANDROID|STATUS_ONLY|NO_ROLLBACK",it)
        }
    }
}

private object HomeRgbAsset {
    private const val TAG = "AIG-RGB-HOME"
    private const val EXPECTED_SHA256 = "8c55956f9ea6693b34d78395d6336ea7bf1a0ec4eeece824c22396b18bb854af"

    fun load(activity: Activity): Drawable? = runCatching {
        val path = "${UiAssetContract.ANDROID_HOME_ROOT}/${UiAssetContract.ANDROID_HOME_FILE}"
        val bytes = activity.assets.open(path).use { it.readBytes() }
        val digest = MessageDigest.getInstance("SHA-256").digest(bytes).joinToString("") { "%02x".format(it) }
        require(digest == EXPECTED_SHA256) { "HOME asset SHA mismatch" }
        val bitmap = BitmapFactory.decodeByteArray(bytes, 0, bytes.size) ?: error("HOME JPEG decode failed")
        require(bitmap.width == 720 && bitmap.height == 1280) { "HOME mobile dimensions invalid" }
        HomeCoverDrawable(bitmap)
    }.onFailure { Log.w(TAG, "HOME 416 warning; current HOME continues", it) }.getOrNull()
}

private class HomeCoverDrawable(private val bitmap: Bitmap) : Drawable() {
    private val imagePaint = Paint(Paint.ANTI_ALIAS_FLAG or Paint.FILTER_BITMAP_FLAG).apply { alpha = 220 }
    private val shadePaint = Paint().apply { color = Color.argb(92, 2, 4, 7) }

    override fun draw(canvas: Canvas) {
        val b = bounds
        if (b.width() <= 0 || b.height() <= 0) return
        val scale = max(b.width().toFloat() / bitmap.width, b.height().toFloat() / bitmap.height)
        val srcW = (b.width() / scale).toInt().coerceIn(1, bitmap.width)
        val srcH = (b.height() / scale).toInt().coerceIn(1, bitmap.height)
        val sx = ((bitmap.width - srcW) / 2).coerceAtLeast(0)
        val sy = ((bitmap.height - srcH) / 2).coerceAtLeast(0)
        val src = Rect(sx, sy, sx + srcW, sy + srcH)
        canvas.drawBitmap(bitmap, src, b, imagePaint)
        canvas.drawRect(b, shadePaint)
    }

    override fun setAlpha(alpha: Int) { imagePaint.alpha = alpha.coerceIn(0, 255) }
    override fun setColorFilter(colorFilter: ColorFilter?) { imagePaint.colorFilter = colorFilter }
    @Deprecated("Deprecated in Android")
    override fun getOpacity(): Int = PixelFormat.TRANSLUCENT
}
