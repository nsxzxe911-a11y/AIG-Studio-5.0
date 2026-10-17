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
import java.security.MessageDigest
import java.util.Collections
import java.util.WeakHashMap
import kotlin.math.max

/**
 * Installs the current user-approved RGB HOME authority without changing
 * machining callbacks. Formal HOME fails closed: a missing or mismatched
 * authority image must never expose the programmatic engineering shell as
 * production RGB evidence.
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
        AxisCockpitSkinInstaller.install(activity)
        CamWorkflowOverlayInstaller.install(activity)
        val decor = activity.window.decorView
        val listener = object : ViewTreeObserver.OnGlobalLayoutListener {
            override fun onGlobalLayout() {
                val home = findFormalHome(decor) ?: return
                if (applied.add(home)) {
                    val originalDescription=home.contentDescription?.toString().orEmpty()
                        .substringBefore(" | AIG RGB HOME AUTHORITY")
                    runCatching { HomeRgbAsset.load(activity) }
                        .onSuccess { drawable ->
                            home.background=drawable
                            home.alpha=1f
                            home.contentDescription="$originalDescription | AIG RGB HOME AUTHORITY APPLIED|${HomeRgbAsset.AUTHORITY_ID}|${HomeRgbAsset.EXPECTED_SHA256}"
                            home.invalidate()
                            Log.i("AIG-RGB-HOME","AUTHORITY_APPLIED|${HomeRgbAsset.AUTHORITY_ID}|${HomeRgbAsset.EXPECTED_SHA256}")
                        }
                        .onFailure { error ->
                            home.alpha=0f
                            home.contentDescription="$originalDescription | AIG RGB HOME AUTHORITY MISSING|${HomeRgbAsset.AUTHORITY_ID}|${HomeRgbAsset.EXPECTED_SHA256}"
                            Log.e("AIG-RGB-HOME","AUTHORITY_MISSING_BLOCK_FORMAL_HOME|${HomeRgbAsset.AUTHORITY_ID}",error)
                        }
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
    const val AUTHORITY_ID="AIG_MOBILE_CURRENT_APPROVED_V1_20261016"
    const val EXPECTED_SHA256="f360cb828ff6d05076792b0d04474503316dea85896f82f6452b0d6c9d7ae99e"
    private const val ASSET_PATH="aig-authority/current/01_HOME.png"
    private const val EXPECTED_WIDTH=941
    private const val EXPECTED_HEIGHT=1672

    fun load(activity: Activity): Drawable {
        val bytes=activity.assets.open(ASSET_PATH).use { it.readBytes() }
        val digest=MessageDigest.getInstance("SHA-256").digest(bytes).joinToString("") { "%02x".format(it) }
        require(digest==EXPECTED_SHA256) { "Current HOME authority SHA mismatch" }
        val bitmap=BitmapFactory.decodeByteArray(bytes,0,bytes.size) ?: error("Current HOME authority PNG decode failed")
        require(bitmap.width==EXPECTED_WIDTH && bitmap.height==EXPECTED_HEIGHT) {
            "Current HOME authority dimensions invalid: ${bitmap.width}x${bitmap.height}"
        }
        return HomeCoverDrawable(bitmap)
    }
}

private class HomeCoverDrawable(private val bitmap: Bitmap) : Drawable() {
    private val imagePaint = Paint(Paint.ANTI_ALIAS_FLAG or Paint.FILTER_BITMAP_FLAG)
    private val shadePaint = Paint().apply { color = Color.argb(32, 2, 4, 7) }

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
