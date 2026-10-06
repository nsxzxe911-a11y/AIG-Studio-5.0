package com.aigstudio.app

import android.app.Activity
import android.app.ActivityManager
import android.content.Intent
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.widget.FrameLayout
import com.aigstudio.core.StudioStartupEngineContract

/**
 * Restored production startup page.
 *
 * This is a local, offline-only visual bootstrap. It deliberately does not run
 * network/update work and it does not expose the engineering shell. The real
 * Runtime remains MainActivity and still opens on the formal RGB HOME surface.
 */
class StartupActivity : Activity() {
    private val handler=Handler(Looper.getMainLooper())

    override fun onCreate(savedInstanceState:Bundle?) {
        super.onCreate(savedInstanceState)

        val memoryClass=(getSystemService(ACTIVITY_SERVICE) as ActivityManager).memoryClass
        val startupQuality=StudioStartupEngineContract.qualityMode(
            lowMemory=memoryClass<256,
            thermalHigh=false,
            preferHq=memoryClass>=512
        )
        val bootShell=FrameLayout(this)
        val bootOverlay=AigStartupOverlay(this)
        bootOverlay.setRuntimeProfile(startupQuality,false)
        bootShell.addView(
            bootOverlay,
            FrameLayout.LayoutParams(
                FrameLayout.LayoutParams.MATCH_PARENT,
                FrameLayout.LayoutParams.MATCH_PARENT
            )
        )
        setContentView(bootShell)

        // Keep this page deterministic and offline. These are bootstrap visual
        // milestones only; MainActivity performs the real Runtime initialization.
        handler.postDelayed({ bootOverlay.advance(StartupMilestone.SAFE_THEME) },80L)
        handler.postDelayed({ bootOverlay.advance(StartupMilestone.INITIALIZING_CORE) },220L)
        handler.postDelayed({ bootOverlay.advance(StartupMilestone.CHECKING_CONFIGURATION) },380L)
        handler.postDelayed({ bootOverlay.advance(StartupMilestone.LOADING_UI) },540L)
        handler.postDelayed({
            startActivity(Intent(this,MainActivity::class.java))
            @Suppress("DEPRECATION")
            overridePendingTransition(0,0)
            finish()
        },720L)
    }

    override fun onDestroy() {
        handler.removeCallbacksAndMessages(null)
        super.onDestroy()
    }
}
