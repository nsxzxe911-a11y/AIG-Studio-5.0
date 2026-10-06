package com.aigstudio.app

import android.app.Activity
import android.app.Application
import android.graphics.Color
import android.os.Bundle
import android.util.Log

/**
 * Installs professional RGB chrome and visual-only surface skins.
 * Runtime callbacks, CAD/CAM/NC state and multi-axis renderers remain authoritative.
 */
class AigStudioApplication : Application(), Application.ActivityLifecycleCallbacks {
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
        ProfessionalSurfaceSkinInstaller.install(activity)
    }

    private fun installGlobalSkinChrome(activity: Activity) {
        runCatching {
            StudioThemePackRuntime.switchTo("aig_rgb_global_v1")
            activity.window.statusBarColor = Color.rgb(2, 4, 7)
            activity.window.navigationBarColor = Color.rgb(2, 4, 7)
            activity.window.decorView.setBackgroundColor(Color.rgb(2, 4, 7))
        }.onFailure {
            Log.w("AIG-RGB-SKIN", "GLOBAL_SKIN_CHROME_SKIP|STATUS_ONLY|NO_ROLLBACK", it)
        }
    }

    override fun onActivityStarted(activity: Activity) = Unit
    override fun onActivityResumed(activity: Activity) = Unit
    override fun onActivityPaused(activity: Activity) = Unit
    override fun onActivityStopped(activity: Activity) = Unit
    override fun onActivitySaveInstanceState(activity: Activity, outState: Bundle) = Unit
    override fun onActivityDestroyed(activity: Activity) = Unit
}

private object OptionalTutorialModule {
    private const val TAG = "AIG-OPTIONAL-MODULE"

    fun install(activity: Activity) {
        runCatching {
            val type = Class.forName("com.aigstudio.app.tutorial.TutorialOverlayInstaller")
            val instance = type.getField("INSTANCE").get(null)
            type.getMethod("install", Activity::class.java).invoke(instance, activity)
        }.onFailure {
            Log.w(TAG, "OPTIONAL_MODULE_SKIP|TUTORIAL_V1|ANDROID|STATUS_ONLY|NO_ROLLBACK", it)
        }
    }
}
