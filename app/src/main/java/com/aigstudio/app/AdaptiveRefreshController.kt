package com.aigstudio.app

import android.app.Activity
import android.app.ActivityManager
import android.os.Build
import android.os.Handler
import android.os.Looper
import android.os.PowerManager
import android.view.Display
import com.aigstudio.core.PlatformRefreshPolicy
import com.aigstudio.core.CpuThermalFpsPolicy
import com.aigstudio.core.RenderCompatibilityContract
import com.aigstudio.core.VisualMemoryPressure
import com.aigstudio.core.VisualQualityPreset
import com.aigstudio.core.VisualQualityRuntime

class AdaptiveRefreshController(
    private val activity: Activity
) {
    private val handler = Handler(Looper.getMainLooper())
    private val powerManager = activity.getSystemService(PowerManager::class.java)
    private var interactive = true
    private var started = false
    private var latestCpuC: Double? = null
    private var cpuThermalCap = 120
    private var startupSettled = false

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

    private val startupPromotionRunnable = Runnable {
        startupSettled = true
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
        startupSettled = false
        activity.display?.let { applyRefreshRate(it, RenderCompatibilityContract.STARTUP_SAFE_HZ.toFloat()) }
        handler.removeCallbacks(startupPromotionRunnable)
        handler.postDelayed(startupPromotionRunnable, RenderCompatibilityContract.STARTUP_PROMOTION_DELAY_MS)
        markInteractive()
        handler.removeCallbacks(cpuThermalRunnable)
        handler.post(cpuThermalRunnable)
    }

    fun stop() {
        handler.removeCallbacks(idleRunnable)
        handler.removeCallbacks(startupPromotionRunnable)
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
        val fpsMode = prefs.getString("fps_mode", "60 FPS") ?: "60 FPS"
        val powerMode = prefs.getString("power_mode", "Auto") ?: "Auto"
        val idleThrottle = prefs.getBoolean("idle_throttle", true)
        val thermalAuto = prefs.getBoolean("thermal_auto", true)
        val visualBudget = updateVisualQuality()

        var requested = when (fpsMode) {
            "120 FPS" -> 120f
            "60 FPS" -> 60f
            "90 FPS" -> 90f
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
            requested = when {
                powerManager.currentThermalStatus >= PowerManager.THERMAL_STATUS_SEVERE -> minOf(requested, 30f)
                else -> requested
            }
        }

        if (fpsMode == "Auto") requested = minOf(requested, visualBudget.maxFps.toFloat())
        if (!startupSettled) requested = minOf(requested, RenderCompatibilityContract.STARTUP_SAFE_HZ.toFloat())
        requested = PlatformRefreshPolicy.capForRuntime(requested.toInt(), RuntimeDeviceProfile.isEmulator).toFloat()
        applyRefreshRate(display, requested)
    }

    private fun updateVisualQuality() = run {
        val prefs = activity.getSharedPreferences("aig_environment", Activity.MODE_PRIVATE)
        val requested = when ((prefs.getString("visual_quality", "Balanced") ?: "Balanced").trim().uppercase()) {
            "LOW", "ECO", "低負載" -> VisualQualityPreset.LOW
            "HIGH", "高畫質" -> VisualQualityPreset.HIGH
            "ULTRA", "極致" -> VisualQualityPreset.ULTRA
            else -> VisualQualityPreset.BALANCED
        }
        VisualQualityRuntime.setRequested(requested)

        val manager = activity.getSystemService(ActivityManager::class.java)
        val memory = ActivityManager.MemoryInfo().also(manager::getMemoryInfo)
        val gib = 1024L * 1024L * 1024L
        val ramGb = ((memory.totalMem + gib - 1L) / gib).toInt().coerceAtLeast(1)
        val availableRatio = if (memory.totalMem > 0L) memory.availMem.toDouble() / memory.totalMem.toDouble() else 1.0
        val pressure = when {
            memory.lowMemory || availableRatio <= 0.10 -> VisualMemoryPressure.CRITICAL
            availableRatio <= 0.20 -> VisualMemoryPressure.HIGH
            availableRatio <= 0.35 -> VisualMemoryPressure.MODERATE
            else -> VisualMemoryPressure.NORMAL
        }
        val decor = activity.window.decorView
        val hardwareAccelerated = decor.isHardwareAccelerated || !decor.isAttachedToWindow
        val thermalLevel = if (Build.VERSION.SDK_INT >= 29) {
            powerManager.currentThermalStatus
        } else {
            when {
                (latestCpuC ?: 0.0) >= 85.0 -> 4
                (latestCpuC ?: 0.0) >= 75.0 -> 2
                else -> 0
            }
        }
        VisualQualityRuntime.updateFromHardware(
            ramGb = ramGb,
            hardwareAccelerated = hardwareAccelerated,
            memoryPressure = pressure,
            thermalLevel = thermalLevel
        )
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
