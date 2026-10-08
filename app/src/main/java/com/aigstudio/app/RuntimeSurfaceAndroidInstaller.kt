package com.aigstudio.app

import android.app.Activity
import android.graphics.Color
import android.graphics.drawable.ColorDrawable
import android.graphics.drawable.Drawable
import android.graphics.drawable.LayerDrawable
import android.view.MotionEvent
import android.view.View
import android.view.ViewGroup
import com.aigstudio.core.RuntimeSurfaceVisualContract
import java.util.WeakHashMap

/**
 * Binds approved RGB artwork to the actual production view tree.  This does
 * not create an evidence-only Activity and it never replaces existing click
 * callbacks.  Touch observation returns false so the authoritative callback
 * continues to run.
 */
object RuntimeSurfaceAndroidInstaller {
    private val originalBackgrounds=WeakHashMap<View,Drawable?>()
    private val boundButtons=WeakHashMap<RgbGlowButton,Boolean>()

    fun install(activity:Activity) {
        val decor=activity.window.decorView
        decor.post { bindTree(activity,decor) }
        decor.viewTreeObserver.addOnGlobalLayoutListener {
            bindTree(activity,decor)
        }
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
        button.replaceVisualAsset(RuntimeSurfaceVisualContract.assetId(surface))
        button.setOnTouchListener { _,event ->
            if(event.actionMasked==MotionEvent.ACTION_UP) {
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
        val art=ProductionRgbAssets.drawableById(target.context,RuntimeSurfaceVisualContract.assetId(surface)) ?: return
        art.alpha=RuntimeSurfaceVisualContract.SURFACE_ALPHA
        val original=originalBackgrounds.getOrPut(target){target.background}
        val base=original ?: ColorDrawable(Color.rgb(2,4,7))
        target.background=LayerDrawable(arrayOf(base,art))
        target.invalidate()
    }
}
