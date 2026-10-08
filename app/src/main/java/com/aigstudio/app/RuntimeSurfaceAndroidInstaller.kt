package com.aigstudio.app

import android.app.Activity
import android.content.Context
import android.graphics.Color
import android.graphics.drawable.ColorDrawable
import android.graphics.drawable.Drawable
import android.graphics.drawable.GradientDrawable
import android.graphics.drawable.LayerDrawable
import android.view.MotionEvent
import android.view.View
import android.view.ViewGroup
import com.aigstudio.core.RuntimeSurfaceVisualContract
import com.aigstudio.core.UiAssetContract
import java.security.MessageDigest
import java.util.Properties
import java.util.WeakHashMap

/**
 * Binds RGB artwork to the actual production view tree. Button icons and
 * full-page interface artwork are deliberately separate: small generated
 * button PNGs must never be stretched and presented as a completed surface.
 */
object RuntimeSurfaceAndroidInstaller {
    private val originalBackgrounds=WeakHashMap<View,Drawable?>()
    private val boundButtons=WeakHashMap<RgbGlowButton,Boolean>()

    fun install(activity:Activity) {
        val decor=activity.window.decorView
        decor.post { bindTree(activity,decor) }
        decor.viewTreeObserver.addOnGlobalLayoutListener { bindTree(activity,decor) }
    }

    private fun bindTree(activity:Activity,view:View) {
        if(view is RgbGlowButton) bindNavButton(activity,view)
        if(view is ViewGroup) {
            val description=view.contentDescription?.toString().orEmpty().uppercase()
            RuntimeSurfaceVisualContract.surfaces.firstOrNull { surface ->
                surface!="HOME" && description.contains(surface) && description.contains("PAGE")
            }?.let { mountOn(view,it) }
            for(i in 0 until view.childCount) bindTree(activity,view.getChildAt(i))
        }
    }

    private fun bindNavButton(activity:Activity,button:RgbGlowButton) {
        if(boundButtons.put(button,true)==true) return
        val label=button.text?.toString().orEmpty()
        val content=button.contentDescription?.toString().orEmpty()
        val surface=when {
            content.startsWith("UI ",ignoreCase=true) -> RuntimeSurfaceVisualContract.normalize(content.substring(3))
            label.uppercase() in RuntimeSurfaceVisualContract.surfaces -> RuntimeSurfaceVisualContract.normalize(label)
            else -> return
        }
        val iconId=RuntimeSurfaceVisualContract.assetId(surface)
        val distinctIcon=ProductionRgbAssets.drawableById(button.context,iconId)
        if(surface=="6AX" && distinctIcon==null) {
            // Historical code pointed 6AX at 5AX. Never repeat that substitution.
            button.setGeneratedAssetEnabled(false)
        } else {
            button.replaceVisualAsset(iconId)
        }
        button.setOnTouchListener { _,event ->
            if(event.actionMasked==MotionEvent.ACTION_UP && surface!="HOME") {
                button.postDelayed({
                    findRuntimeHost(activity.window.decorView)?.let { mountOn(it,surface) }
                },32L)
            }
            false
        }
    }

    private fun findRuntimeHost(view:View):ViewGroup? {
        if(view is ViewGroup && view.contentDescription?.toString()=="AIG CNC PRODUCTION RUNTIME HOST") return view
        if(view is ViewGroup) {
            for(i in 0 until view.childCount) findRuntimeHost(view.getChildAt(i))?.let { return it }
        }
        return null
    }

    private fun mountOn(target:View,surface:String) {
        if(surface=="HOME") return // Formal HOME has its own verified approved full-page installer.
        val original=originalBackgrounds.getOrPut(target){target.background}
        val base=original ?: ColorDrawable(Color.rgb(2,4,7))
        val fullArt=RuntimeFullSurfaceAssets.drawable(target.context,surface)
        val visual=fullArt ?: proceduralSurface(surface)
        visual.alpha=RuntimeSurfaceVisualContract.SURFACE_ALPHA
        target.background=LayerDrawable(arrayOf(base,visual))
        target.invalidate()
    }

    private fun proceduralSurface(surface:String):Drawable {
        val accent=when(surface) {
            "CAM","SIM" -> Color.rgb(51,243,155)
            "3AX","4AX","5AX","6AX" -> Color.rgb(255,77,166)
            "NC" -> Color.rgb(255,179,38)
            else -> Color.rgb(39,233,255)
        }
        return GradientDrawable(
            GradientDrawable.Orientation.TL_BR,
            intArrayOf(Color.rgb(2,4,7),Color.rgb(7,17,27),accent)
        ).apply {
            cornerRadius=18f
            setStroke(2,accent)
        }
    }
}

/**
 * Full-page surface pack lives below runtime-surfaces/. It is intentionally
 * separate from UiAssetContract's small generated button images. A surface
 * image is accepted only when a matching hash is present and its dimensions
 * are large enough to be interface artwork.
 */
private object RuntimeFullSurfaceAssets {
    private val ROOT=UiAssetContract.ANDROID_ROOT+"/runtime-surfaces"
    @Volatile private var hashes:Map<String,String>?=null
    private val cache=mutableMapOf<String,Drawable?>()

    @Synchronized
    private fun expected(context:Context):Map<String,String> {
        hashes?.let{return it}
        val loaded=runCatching {
            val props=Properties()
            context.assets.open("$ROOT/sha256.properties").use(props::load)
            props.stringPropertyNames().associateWith { props.getProperty(it).trim().lowercase() }
        }.getOrDefault(emptyMap())
        hashes=loaded
        return loaded
    }

    @Synchronized
    fun drawable(context:Context,surface:String):Drawable? {
        val id=RuntimeSurfaceVisualContract.assetId(surface)
        if(cache.containsKey(id)) return cache[id]
        val value=runCatching {
            val exp=expected(context)[id] ?: expected(context)["$id.png"] ?: return@runCatching null
            val bytes=context.assets.open("$ROOT/$id.png").use{it.readBytes()}
            val actual=MessageDigest.getInstance("SHA-256").digest(bytes).joinToString(""){"%02x".format(it)}
            require(actual==exp){"Full RGB surface hash mismatch: $id"}
            val d=Drawable.createFromStream(bytes.inputStream(),"$id.png") ?: return@runCatching null
            require(d.intrinsicWidth>=640 && d.intrinsicHeight>=360){"Full RGB surface is icon-sized: $id"}
            d
        }.getOrNull()
        cache[id]=value
        return value
    }
}
