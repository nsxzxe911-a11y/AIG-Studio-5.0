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

        // Normal users see the fast 720 ms hand-off. CI may explicitly request
        // a longer hold so the real startup page can be captured as evidence.
        val handoffMs=intent.getLongExtra("AIG_STARTUP_EVIDENCE_HOLD_MS",720L)
            .coerceIn(720L,5000L)
        fun at(base:Long):Long=(base.toDouble()/720.0*handoffMs).toLong().coerceAtLeast(1L)

        // Keep this page deterministic and offline. These are bootstrap visual
        // milestones only; MainActivity performs the real Runtime initialization.
        handler.postDelayed({ bootOverlay.advance(StartupMilestone.SAFE_THEME) },at(80L))
        handler.postDelayed({ bootOverlay.advance(StartupMilestone.INITIALIZING_CORE) },at(220L))
        handler.postDelayed({ bootOverlay.advance(StartupMilestone.CHECKING_CONFIGURATION) },at(380L))
        handler.postDelayed({ bootOverlay.advance(StartupMilestone.LOADING_UI) },at(540L))
        handler.postDelayed({
            startActivity(Intent(this,MainActivity::class.java))
            @Suppress("DEPRECATION")
            overridePendingTransition(0,0)
            finish()
        },handoffMs)
    }

    override fun onDestroy() {
        handler.removeCallbacksAndMessages(null)
        super.onDestroy()
    }
}
