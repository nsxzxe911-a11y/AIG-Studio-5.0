package com.aigstudio.app

import android.app.Activity
import android.app.Application
import android.content.Context
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.ColorFilter
import android.graphics.Paint
import android.graphics.PixelFormat
import android.graphics.RectF
import android.graphics.drawable.Drawable
import android.os.Bundle
import android.util.Log
import android.view.MotionEvent
import android.view.View
import android.view.ViewGroup
import android.view.ViewTreeObserver
import java.security.MessageDigest
import java.util.Collections
import java.util.WeakHashMap
import kotlin.math.min

/**
 * Installs an approved RGB HOME authority without changing machining callbacks.
 * Priority is the current user-approved 2026-10-16 authority, then the verified
 * 2026-10-05 AIG-II 427 stable authority. The programmatic engineering shell is
 * never a production fallback and is never visible beneath approved art.
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
                        .substringBefore(" | AIG RGB HOME STABLE AUTHORITY")
                    when(val loaded=HomeRgbAsset.loadBest(activity)) {
                        is LoadedHomeAuthority.Current -> {
                            installAuthoritySurface(home,decor,loaded.drawable,currentLayout=true)
                            home.contentDescription="$originalDescription | AIG RGB HOME AUTHORITY APPLIED|${loaded.authorityId}|${loaded.sha256}"
                            Log.i("AIG-RGB-HOME","AUTHORITY_APPLIED|${loaded.authorityId}|${loaded.sha256}|SHELL_HIDDEN|PIXEL_HIT_MAP_ACTIVE")
                        }
                        is LoadedHomeAuthority.Stable -> {
                            installAuthoritySurface(home,decor,loaded.drawable,currentLayout=false)
                            home.contentDescription="$originalDescription | AIG RGB HOME STABLE AUTHORITY APPLIED|${loaded.authorityId}|${loaded.sha256}"
                            Log.w("AIG-RGB-HOME","STABLE_AUTHORITY_APPLIED|${loaded.authorityId}|${loaded.sha256}|CURRENT_AUTHORITY_PENDING|SHELL_HIDDEN|NO_UNVERIFIED_HIT_MAP")
                        }
                        is LoadedHomeAuthority.Missing -> {
                            home.alpha=0f
                            home.contentDescription="$originalDescription | AIG RGB HOME AUTHORITY MISSING|${HomeRgbAsset.CURRENT_AUTHORITY_ID}|${HomeRgbAsset.CURRENT_SHA256}"
                            Log.e("AIG-RGB-HOME","AUTHORITY_MISSING_BLOCK_FORMAL_HOME|${loaded.detail}")
                        }
                    }
                }
                if (decor.viewTreeObserver.isAlive) decor.viewTreeObserver.removeOnGlobalLayoutListener(this)
            }
        }
        decor.viewTreeObserver.addOnGlobalLayoutListener(listener)
        decor.post { listener.onGlobalLayout() }
    }

    private fun installAuthoritySurface(home:View,decor:View,drawable:Drawable,currentLayout:Boolean) {
        home.background=drawable
        home.alpha=1f
        if(home is ViewGroup) {
            // A formal Authority page is a single visible visual layer. The legacy
            // programmatic HOME survives only as hidden callback state.
            for(i in 0 until home.childCount) home.getChildAt(i).visibility=View.INVISIBLE
            home.addView(
                AuthorityHomeHitMapView(home.context,currentLayout) { page ->
                    if(page=="HOME") true
                    else findByContentDescription(decor,"UI $page")?.performClick()==true
                },
                ViewGroup.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT,ViewGroup.LayoutParams.MATCH_PARENT)
            )
        }
        home.invalidate()
    }

    private fun findFormalHome(view: View): View? {
        val description=view.contentDescription?.toString().orEmpty()
        if(description.contains("AIG CNC FORMAL RGB HOME") ||
            description.contains("AIG CNC PRODUCTION HOME RUNTIME • FIRST FRAME")) return view
        if (view is ViewGroup) {
            for (i in 0 until view.childCount) findFormalHome(view.getChildAt(i))?.let { return it }
        }
        return null
    }

    private fun findByContentDescription(view:View,target:String):View? {
        if(view.contentDescription?.toString()==target) return view
        if(view is ViewGroup) {
            for(i in 0 until view.childCount) findByContentDescription(view.getChildAt(i),target)?.let{return it}
        }
        return null
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

    override fun onActivityStarted(activity: Activity) = Unit
    override fun onActivityResumed(activity: Activity) = Unit
    override fun onActivityPaused(activity: Activity) = Unit
    override fun onActivityStopped(activity: Activity) = Unit
    override fun onActivitySaveInstanceState(activity: Activity, outState: Bundle) = Unit
    override fun onActivityDestroyed(activity: Activity) = Unit
}

private class AuthorityHomeHitMapView(
    context:Context,
    private val currentLayout:Boolean,
    private val navigate:(String)->Boolean,
):View(context) {
    // Measured directly from Current Approved 01_HOME.png, SHA-256
    // f360cb828ff6d05076792b0d04474503316dea85896f82f6452b0d6c9d7ae99e.
    private data class Hit(val page:String,val left:Int,val top:Int,val right:Int,val bottom:Int)
    private val sourceWidth=941f
    private val sourceHeight=1672f
    private val currentHits=listOf(
        Hit("HOME",18,156,109,254),
        Hit("CAD",111,156,195,254),
        Hit("CAM",199,156,282,254),
        Hit("SIM",289,156,370,254),
        Hit("3AX",378,156,460,254),
        Hit("4AX",466,156,548,254),
        Hit("5AX",555,156,639,254),
        Hit("6AX",644,156,728,254),
        Hit("NC",732,156,815,254),
        Hit("AI",822,156,915,254),
        Hit("CAD",18,965,312,1093),
        Hit("CAM",321,965,608,1093),
        Hit("SIM",615,965,916,1093),
        Hit("3AX",18,1100,312,1219),
        Hit("4AX",322,1100,608,1219),
        Hit("5AX",615,1100,916,1219),
        Hit("6AX",18,1225,312,1344),
        Hit("NC",322,1225,608,1344),
        Hit("AI",615,1225,916,1344),
    )

    init {
        isClickable=currentLayout
        contentDescription=if(currentLayout)
            "AIG RGB AUTHORITY HIT MAP • CURRENT • PIXEL VERIFIED • REAL CALLBACKS"
        else
            "AIG RGB STABLE AUTHORITY • VISUAL FALLBACK ONLY • NO UNVERIFIED HIT MAP"
    }

    override fun onTouchEvent(event:MotionEvent):Boolean {
        if(!currentLayout) return false
        if(event.action!=MotionEvent.ACTION_UP) return true
        if(width<=0 || height<=0) return true
        val scale=min(width/sourceWidth,height/sourceHeight)
        val drawWidth=sourceWidth*scale
        val drawHeight=sourceHeight*scale
        val left=(width-drawWidth)/2f
        val top=(height-drawHeight)/2f
        if(event.x<left || event.x>left+drawWidth || event.y<top || event.y>top+drawHeight) return true
        val sourceX=(event.x-left)/scale
        val sourceY=(event.y-top)/scale
        currentHits.firstOrNull {
            sourceX>=it.left && sourceX<=it.right && sourceY>=it.top && sourceY<=it.bottom
        }?.let { navigate(it.page) }
        performClick()
        return true
    }

    override fun performClick():Boolean {
        super.performClick()
        return true
    }
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

private sealed interface LoadedHomeAuthority {
    val drawable:Drawable?
    data class Current(override val drawable:Drawable,val authorityId:String,val sha256:String):LoadedHomeAuthority
    data class Stable(override val drawable:Drawable,val authorityId:String,val sha256:String):LoadedHomeAuthority
    data class Missing(val detail:String):LoadedHomeAuthority { override val drawable:Drawable?=null }
}

private object HomeRgbAsset {
    const val CURRENT_AUTHORITY_ID="AIG_MOBILE_CURRENT_APPROVED_V1_20261016"
    const val CURRENT_SHA256="f360cb828ff6d05076792b0d04474503316dea85896f82f6452b0d6c9d7ae99e"
    private const val CURRENT_PATH="aig-authority/current/01_HOME.png"
    private const val CURRENT_WIDTH=941
    private const val CURRENT_HEIGHT=1672

    private const val STABLE_AUTHORITY_ID="AIG_RGB_HOME_427"
    private const val STABLE_SHA256="8835cded863074b4de9b848e12eb037254119b5a7f21e135b66657f764fbd652"
    private const val STABLE_PATH="aig-generated-rgb/approved/427/home_mobile.jpg"
    private const val STABLE_WIDTH=720
    private const val STABLE_HEIGHT=1280

    fun loadBest(activity:Activity):LoadedHomeAuthority {
        val current=runCatching { load(activity,CURRENT_PATH,CURRENT_SHA256,CURRENT_WIDTH,CURRENT_HEIGHT,"PNG") }
        if(current.isSuccess) return LoadedHomeAuthority.Current(current.getOrThrow(),CURRENT_AUTHORITY_ID,CURRENT_SHA256)
        val stable=runCatching { load(activity,STABLE_PATH,STABLE_SHA256,STABLE_WIDTH,STABLE_HEIGHT,"JPEG") }
        if(stable.isSuccess) return LoadedHomeAuthority.Stable(stable.getOrThrow(),STABLE_AUTHORITY_ID,STABLE_SHA256)
        return LoadedHomeAuthority.Missing("CURRENT=${current.exceptionOrNull()?.message};STABLE=${stable.exceptionOrNull()?.message}")
    }

    private fun load(activity:Activity,path:String,expectedSha:String,width:Int,height:Int,format:String):Drawable {
        val bytes=activity.assets.open(path).use { it.readBytes() }
        val digest=MessageDigest.getInstance("SHA-256").digest(bytes).joinToString("") { "%02x".format(it) }
        require(digest==expectedSha) { "$format HOME authority SHA mismatch" }
        val bitmap=BitmapFactory.decodeByteArray(bytes,0,bytes.size) ?: error("$format HOME authority decode failed")
        require(bitmap.width==width && bitmap.height==height) {
            "$format HOME authority dimensions invalid: ${bitmap.width}x${bitmap.height}"
        }
        return HomeFitDrawable(bitmap)
    }
}

private class HomeFitDrawable(private val bitmap: Bitmap) : Drawable() {
    private val imagePaint = Paint(Paint.ANTI_ALIAS_FLAG or Paint.FILTER_BITMAP_FLAG)
    private val shadePaint = Paint().apply { color = Color.argb(12, 2, 4, 7) }

    override fun draw(canvas: Canvas) {
        val b=bounds
        if(b.width()<=0 || b.height()<=0) return
        canvas.drawColor(Color.rgb(2,4,7))
        val scale=min(b.width().toFloat()/bitmap.width,b.height().toFloat()/bitmap.height)
        val drawWidth=bitmap.width*scale
        val drawHeight=bitmap.height*scale
        val left=b.left+(b.width()-drawWidth)/2f
        val top=b.top+(b.height()-drawHeight)/2f
        val dst=RectF(left,top,left+drawWidth,top+drawHeight)
        canvas.drawBitmap(bitmap,null,dst,imagePaint)
        canvas.drawRect(dst,shadePaint)
    }

    override fun setAlpha(alpha: Int) { imagePaint.alpha = alpha.coerceIn(0, 255) }
    override fun setColorFilter(colorFilter: ColorFilter?) { imagePaint.colorFilter = colorFilter }
    @Deprecated("Deprecated in Android")
    override fun getOpacity(): Int = PixelFormat.TRANSLUCENT
}
