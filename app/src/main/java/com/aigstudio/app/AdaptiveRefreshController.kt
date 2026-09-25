package com.aigstudio.app

import android.app.Activity
import android.os.Build
import android.os.Handler
import android.os.Looper
import android.os.PowerManager
import android.view.Display
import com.aigstudio.core.PlatformRefreshPolicy
import com.aigstudio.core.CpuThermalFpsPolicy

class AdaptiveRefreshController(
    private val activity: Activity
) {
    private val handler = Handler(Looper.getMainLooper())
    private val powerManager = activity.getSystemService(PowerManager::class.java)
    private var interactive = true
    private var started = false
    private var latestCpuC: Double? = null
    private var cpuThermalCap = 120

    private val cpuThermalRunnable = object : Runnable {
        override fun run() {
            if (!started) return
            latestCpuC = CpuGpuTemperatureProbe.read().cpuC
            cpuThermalCap = CpuThermalFpsPolicy.capWithHysteresis(latestCpuC, cpuThermalCap)
            applyFromPreferences()
            handler.postDelayed(this, RuntimeDeviceProfile.temperatureIntervalMs)
        }
    }

    private val idleRunnable = Runnable {
        interactive = false
        applyFromPreferences()
    }

    private val thermalListener =
        if (Build.VERSION.SDK_INT >= 29) {
            PowerManager.OnThermalStatusChangedListener { applyFromPreferences() }
        } else null

    fun start() {
        if (started) return
        started = true
        if (Build.VERSION.SDK_INT >= 29 && thermalListener != null) {
            powerManager.addThermalStatusListener(activity.mainExecutor, thermalListener)
        }
        markInteractive()
        handler.removeCallbacks(cpuThermalRunnable)
        handler.post(cpuThermalRunnable)
    }

    fun stop() {
        handler.removeCallbacks(idleRunnable)
        handler.removeCallbacks(cpuThermalRunnable)
        val listener = thermalListener
        if (Build.VERSION.SDK_INT >= 29 && listener != null) {
            powerManager.removeThermalStatusListener(listener)
        }
        started = false
    }

    fun markInteractive() {
        interactive = true
        handler.removeCallbacks(idleRunnable)
        applyFromPreferences()
        handler.postDelayed(idleRunnable, 1_200L)
    }

    fun applyFromPreferences() {
        val display = activity.display ?: return
        val prefs = activity.getSharedPreferences("aig_environment", Activity.MODE_PRIVATE)
        val fpsMode = prefs.getString("fps_mode", "Auto") ?: "Auto"
        val powerMode = prefs.getString("power_mode", "Auto") ?: "Auto"
        val idleThrottle = prefs.getBoolean("idle_throttle", true)
        val thermalAuto = prefs.getBoolean("thermal_auto", true)

        var requested = when (fpsMode) {
            "120 FPS" -> 120f
            "60 FPS" -> 60f
            "30 FPS" -> 30f
            else -> when (powerMode) {
                "Performance" -> 120f
                "Balanced" -> 60f
                "Eco" -> 30f
                else -> 120f
            }
        }

        if (fpsMode == "Auto" && idleThrottle && !interactive) {
            requested = minOf(requested, 30f)
        }

        if (thermalAuto && fpsMode == "Auto") {
            val cpuC = latestCpuC
            if (cpuC != null && cpuC.isFinite()) {
                requested = minOf(requested, cpuThermalCap.toFloat())
            } else if (Build.VERSION.SDK_INT >= 29) {
                requested = when {
                    powerManager.currentThermalStatus >= PowerManager.THERMAL_STATUS_SEVERE -> minOf(requested, 30f)
                    powerManager.currentThermalStatus >= PowerManager.THERMAL_STATUS_MODERATE -> minOf(requested, 60f)
                    else -> requested
                }
            }
        } else if (thermalAuto && Build.VERSION.SDK_INT >= 29) {
            // Manual FPS remains user-selected unless Android reports a severe thermal state.
            requested = when {
                powerManager.currentThermalStatus >= PowerManager.THERMAL_STATUS_SEVERE -> minOf(requested, 30f)
                else -> requested
            }
        }

        requested = PlatformRefreshPolicy.capForRuntime(requested.toInt(), RuntimeDeviceProfile.isEmulator).toFloat()
        applyRefreshRate(display, requested)
    }

    fun currentCpuTemperatureC(): Double? = latestCpuC
    fun currentCpuThermalCap(): Int = cpuThermalCap
    fun currentCpuThermalReason(): String = CpuThermalFpsPolicy.reason(latestCpuC, cpuThermalCap)

    private fun applyRefreshRate(display: Display, requestedHz: Float) {
        if (Build.VERSION.SDK_INT < 23) return
        val current = display.mode
        val candidates = display.supportedModes.filter {
            it.physicalWidth == current.physicalWidth &&
            it.physicalHeight == current.physicalHeight &&
            it.refreshRate <= requestedHz + 0.5f
        }
        val mode = candidates.maxByOrNull { it.refreshRate }
            ?: display.supportedModes.minByOrNull { kotlin.math.abs(it.refreshRate - requestedHz) }
            ?: return
        val attrs = activity.window.attributes
        attrs.preferredDisplayModeId = mode.modeId
        attrs.preferredRefreshRate = mode.refreshRate
        activity.window.attributes = attrs
    }
}
