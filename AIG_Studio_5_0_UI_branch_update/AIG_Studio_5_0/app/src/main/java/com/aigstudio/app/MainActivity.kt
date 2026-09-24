package com.aigstudio.app

import android.app.Activity
import android.app.AlertDialog
import android.os.SystemClock
import android.os.Process
import android.os.PowerManager
import android.content.IntentFilter
import android.content.Intent
import android.app.ActivityManager
import android.content.Context
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Paint
import android.graphics.Path
import android.graphics.drawable.GradientDrawable
import android.os.Bundle
import android.os.Build
import android.os.BatteryManager
import android.view.Window
import android.text.InputType
import android.view.Gravity
import android.view.MotionEvent
import android.view.ScaleGestureDetector
import android.view.View
import android.view.Choreographer
import android.view.ViewGroup
import android.widget.Button
import android.widget.Spinner
import android.widget.SeekBar
import android.widget.ArrayAdapter
import android.widget.CheckBox
import android.widget.EditText
import android.widget.LinearLayout
import android.widget.TextView
import android.widget.Toast
import com.aigstudio.core.*
import kotlin.math.*

enum class Tool { LINE, RECT, CIRCLE, DELETE, CHAMFER, FILLET, PAN }

class MainActivity : Activity() {
    private lateinit var cad: CadView
    private lateinit var branchFlow: FlowLayout
    private lateinit var categoryFlow: FlowLayout
    private val toolButtons = mutableMapOf<Tool, Button>()
    private val categoryButtons = mutableMapOf<String, Button>()
    private var activeCategory: String? = null
    private var camSettings = CamSettings()
    private lateinit var fpsIndicator: TextView
    private lateinit var temperatureIndicator: TextView
    private var fpsLoopRunning = false
    private var fpsLastNs = 0L
    private var fpsFrames = 0
    private val temperatureHandler = Handler(Looper.getMainLooper())
    private var temperatureLoopRunning = false
    private val fpsFrameCallback = object : Choreographer.FrameCallback {
        override fun doFrame(frameTimeNanos: Long) {
            if (!fpsLoopRunning) return
            if (fpsLastNs == 0L) fpsLastNs = frameTimeNanos
            fpsFrames++
            val elapsed = frameTimeNanos - fpsLastNs
            if (elapsed >= 500_000_000L) {
                val measured = fpsFrames * 1_000_000_000.0 / elapsed.toDouble()
                fpsIndicator.text = "FPS " + String.format("%.1f", measured)
                fpsFrames = 0
                fpsLastNs = frameTimeNanos
            }
            Choreographer.getInstance().postFrameCallback(this)
        }
    }
    private val temperatureRunnable = object : Runnable {
        override fun run() {
            if (!temperatureLoopRunning) return
            val battery = registerReceiver(null, IntentFilter(Intent.ACTION_BATTERY_CHANGED))
            val raw = battery?.getIntExtra(BatteryManager.EXTRA_TEMPERATURE, Int.MIN_VALUE) ?: Int.MIN_VALUE
            temperatureIndicator.text = if (raw == Int.MIN_VALUE) "BAT --.-°C" else "BAT " + String.format("%.1f", raw / 10.0) + "°C"
            temperatureHandler.postDelayed(this, 2000L)
        }
    }
    private lateinit var systemHudIndicator: TextView
    private var systemMonitorRunning = false
    private var systemHudExpanded = false
    private var monitorFps = 0.0
    private var monitorFrameTimeMs = 0.0
    private var monitorDroppedFrames = 0L
    private var monitorFrames = 0
    private var monitorLastFrameNs = 0L
    private var monitorWindowStartNs = 0L
    private var monitorMaxTempC = Double.NEGATIVE_INFINITY
    private var monitorMinFps = Double.POSITIVE_INFINITY
    private var monitorFpsSum = 0.0
    private var monitorFpsSamples = 0L
    private var monitorMaxRamMb = 0.0
    private var monitorStartMs = 0L
    private var burnInActive = false
    private var burnInStartMs = 0L
    private var lastCpuMs = 0L
    private var lastCpuWallMs = 0L
    private var monitorSnapshot = "MONITOR --"
    private val systemMonitorHandler = Handler(Looper.getMainLooper())
    private val systemFrameCallback = object : Choreographer.FrameCallback {
        override fun doFrame(frameTimeNanos: Long) {
            if (!systemMonitorRunning) return
            if (monitorLastFrameNs != 0L) {
                monitorFrameTimeMs = (frameTimeNanos - monitorLastFrameNs) / 1_000_000.0
                val refresh = if (Build.VERSION.SDK_INT >= 30) display?.refreshRate?.toDouble() ?: 60.0 else 60.0
                val budget = 1000.0 / refresh.coerceAtLeast(30.0)
                if (monitorFrameTimeMs > budget * 1.5) {
                    monitorDroppedFrames += ((monitorFrameTimeMs / budget).toInt() - 1).coerceAtLeast(1)
                }
            }
            monitorLastFrameNs = frameTimeNanos
            if (monitorWindowStartNs == 0L) monitorWindowStartNs = frameTimeNanos
            monitorFrames++
            val elapsedNs = frameTimeNanos - monitorWindowStartNs
            if (elapsedNs >= 500_000_000L) {
                monitorFps = monitorFrames * 1_000_000_000.0 / elapsedNs.toDouble()
                monitorMinFps = minOf(monitorMinFps, monitorFps)
                monitorFpsSum += monitorFps
                monitorFpsSamples++
                monitorFrames = 0
                monitorWindowStartNs = frameTimeNanos
            }
            if (burnInActive) cad.postInvalidateOnAnimation()
            Choreographer.getInstance().postFrameCallback(this)
        }
    }
    private val systemMonitorRunnable = object : Runnable {
        override fun run() {
            if (!systemMonitorRunning) return
            updateSystemMonitorSnapshot()
            systemMonitorHandler.postDelayed(this, 1000L)
        }
    }
    private val colors = listOf(
        0xFF00BCD4.toInt(), 0xFF8B5CF6.toInt(), 0xFFF59E0B.toInt(),
        0xFF22C55E.toInt(), 0xFFEF4444.toInt(), 0xFF3B82F6.toInt()
    )

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        if (Build.VERSION.SDK_INT >= 30) {
            display?.supportedModes
                ?.filter { it.refreshRate >= 119.0f }
                ?.maxByOrNull { it.refreshRate }
                ?.let { mode ->
                    window.attributes = window.attributes.apply { preferredDisplayModeId = mode.modeId }
                }
        }
        val root = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setBackgroundColor(0xFF07111B.toInt())
        }
        val title = TextView(this).apply {
            text = "AIG CNC • OFFICIAL RGB ORIGINAL • 2D CAD • HQ • 120Hz TARGET • 原點 0.000 • 精度 0.001 mm"
            setTextColor(0xFF3DEBFF.toInt()); textSize = 16f; gravity = Gravity.CENTER_VERTICAL
            setPadding(dp(12), dp(6), dp(12), dp(6))
        }
        root.addView(title, LinearLayout.LayoutParams(-1, dp(40)))
        cad = CadView(this)
        root.addView(cad, LinearLayout.LayoutParams(-1, 0, 1f))

        // Branch area: hidden until a category is selected.  This keeps the CAD canvas clean.
        branchFlow = FlowLayout(this).apply { setPadding(dp(6), dp(2), dp(6), dp(2)); visibility = View.GONE }
        root.addView(branchFlow, LinearLayout.LayoutParams(-1, -2))
        categoryFlow = FlowLayout(this).apply { setPadding(dp(6), dp(3), dp(6), dp(4)) }
        root.addView(categoryFlow, LinearLayout.LayoutParams(-1, -2))

        addCategory("繪圖", 0) { showDrawingBranch() }
        addCategory("修改", 3) { showModifyBranch() }
        addCategory("角部", 2) { showCornerBranch() }
        addCategory("加工", 5) { showMachiningBranch() }
        addCategory("安全", 4) { showSecurityBranch() }
        addCategory("AI", 1) { showAiBranch() }
        addActionTo(categoryFlow, "ChatGPT AI 更新 • 一鍵", 1) { runSecureUpdateCheck() }
        addActionTo(categoryFlow, "↶", 3) { cad.undo() }
        addActionTo(categoryFlow, "↷", 5) { cad.redo() }
        fpsIndicator = TextView(this).apply {
            setTextColor(0xFF3DEBFF.toInt()); textSize = 11f; text = "FPS --"
            setPadding(dp(12), dp(2), dp(12), dp(2)); visibility = View.GONE
        }
        root.addView(fpsIndicator, LinearLayout.LayoutParams(-1, -2))
        temperatureIndicator = TextView(this).apply {
            setTextColor(0xFF3DEBFF.toInt()); textSize = 11f; text = "BAT --.-°C"
            setPadding(dp(12), dp(2), dp(12), dp(2)); visibility = View.GONE
        }
        root.addView(temperatureIndicator, LinearLayout.LayoutParams(-1, -2))
        systemHudIndicator = TextView(this).apply {
            setTextColor(0xFF63FF9D.toInt()); textSize = 11f
            text = "SYSTEM HUD --"; setPadding(dp(12), dp(3), dp(12), dp(5)); visibility = View.GONE
            setOnClickListener { showExpandedSystemHud() }
        }
        root.addView(systemHudIndicator, LinearLayout.LayoutParams(-1, -2))
        val envPrefs = getSharedPreferences("aig_environment", MODE_PRIVATE)
        applyFpsDisplayPreference(envPrefs.getBoolean("fps_display_enabled", false))
        applyTemperatureDisplayPreference(envPrefs.getBoolean("temperature_display_enabled", true))
        applySystemHudPreference(envPrefs.getBoolean("system_hud_enabled", true))


        setContentView(root)
        openCategory("繪圖") { showDrawingBranch() }
        selectTool(Tool.LINE)
        val updateConfig = UpdateConfigStore.load(this)
        if (updateConfig.configured) {
            SecureUpdateManager.autoCheck(this, updateConfig) { result ->
                if (result.available || !result.ok) {
                    Toast.makeText(this, result.message, Toast.LENGTH_LONG).show()
                }
            }
        }
    }

    private fun showDrawingBranch() {
        branchFlow.removeAllViews(); toolButtons.clear()
        addToolToBranch("線", Tool.LINE, 0)
        addToolToBranch("矩形", Tool.RECT, 1)
        addToolToBranch("圓", Tool.CIRCLE, 2)
    }
    private fun showModifyBranch() {
        branchFlow.removeAllViews(); toolButtons.clear()
        addToolToBranch("刪除", Tool.DELETE, 4)
        addToolToBranch("移動", Tool.PAN, 0)
    }
    private fun showCornerBranch() {
        branchFlow.removeAllViews(); toolButtons.clear()
        addToolToBranch("C 倒角", Tool.CHAMFER, 2) {
            askValue("倒角 C 值", cad.chamferValue) { cad.chamferValue = it; selectTool(Tool.CHAMFER) }
        }
        addToolToBranch("R 角", Tool.FILLET, 1) {
            askValue("R 角半徑", cad.filletValue) { cad.filletValue = it; selectTool(Tool.FILLET) }
        }
    }
    private fun showMachiningBranch() {
        branchFlow.removeAllViews(); toolButtons.clear()
        addActionTo(branchFlow, "CAM 設定", 5) { showCamSettingsDialog() }
        addActionTo(branchFlow, "3D 加工", 4) { showMachining3D() }
    }

    private fun showCamSettingsDialog() {
        val box = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(dp(14), dp(8), dp(14), dp(4))
        }
        fun numeric(label: String, value: Double, signed: Boolean = false): EditText {
            return EditText(this).apply {
                hint = label
                setText(DisplayFormat.mm(value))
                inputType = InputType.TYPE_CLASS_NUMBER or InputType.TYPE_NUMBER_FLAG_DECIMAL or
                    (if (signed) InputType.TYPE_NUMBER_FLAG_SIGNED else 0)
                box.addView(this)
            }
        }

        val diameter = numeric("刀徑 mm", camSettings.toolDiameter)
        val depth = numeric("加工深度 Z mm", camSettings.depth, true)
        val safeZ = numeric("Safe-Z mm", camSettings.safeZ)
        val feed = numeric("Feed mm/min", camSettings.feedMmMin)

        AlertDialog.Builder(this)
            .setTitle("真 CAM 設定")
            .setView(box)
            .setPositiveButton("套用") { _, _ ->
                runCatching {
                    CamSettings(
                        toolDiameter = diameter.text.toString().toDouble(),
                        depth = depth.text.toString().toDouble(),
                        safeZ = safeZ.text.toString().toDouble(),
                        feedMmMin = feed.text.toString().toDouble(),
                        climb = camSettings.climb
                    )
                }.onSuccess {
                    camSettings = it
                    Toast.makeText(this, "CAM 設定已套用", Toast.LENGTH_SHORT).show()
                }.onFailure { error ->
                    Toast.makeText(this, "CAM 設定無效: " + error.message, Toast.LENGTH_LONG).show()
                }
            }
            .setNegativeButton("取消", null)
            .show()
    }

    private fun showMachining3D() {
        val snapshot = cad.snapshot()
        if (snapshot.entities.isEmpty()) {
            Toast.makeText(this, "3D 加工 BLOCKED：請先建立真 2D 幾何", Toast.LENGTH_LONG).show()
            return
        }

        runCatching { Machining3DEngine.build(snapshot, camSettings) }
            .onSuccess { result ->
                val box = LinearLayout(this).apply {
                    orientation = LinearLayout.VERTICAL
                    setBackgroundColor(0xFF050A11.toInt())
                }
                val screenH = resources.displayMetrics.heightPixels
                val min3dH = dp(220)
                val max3dH = dp(620)
                val threeDHeight = (screenH * 0.56f).roundToInt().coerceIn(min3dH, max3dH)
                box.addView(
                    Machining3DView(this, result),
                    LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, threeDHeight)
                )

                val removed = result.removal.depth.count { it < 0.0 }
                val cuts = result.cam.toolpaths.sumOf { path -> path.moves.count { !it.rapid } }
                box.addView(TextView(this).apply {
                    setTextColor(0xFF63FF9D.toInt())
                    textSize = 12f
                    setPadding(dp(12), dp(6), dp(12), dp(8))
                    text = "TRUE 3D • mesh V=" + result.mesh.vertices.size +
                        " T=" + result.mesh.triangles.size +
                        " • CAM=" + result.cam.toolpaths.size +
                        " • CUT=" + cuts +
                        " • removed=" + removed +
                        " • 精度 0.001 mm"
                })

                AlertDialog.Builder(this)
                    .setTitle("RGB 真 3D 加工 • 拖曳旋轉 • 雙指縮放/平移")
                    .setView(box)
                    .setPositiveButton("返回 2D", null)
                    .show()
            }
            .onFailure { error ->
                Toast.makeText(this, "3D 加工 BLOCKED: " + error.message, Toast.LENGTH_LONG).show()
            }
    }

    private fun showSecurityBranch() {
        branchFlow.removeAllViews(); toolButtons.clear()
        addActionTo(branchFlow, "網路狀態", 0) { showNetworkStatus() }
        addActionTo(branchFlow, "ChatGPT AI 更新 • 一鍵", 1) { runSecureUpdateCheck() }
        addActionTo(branchFlow, "防毒掃描", 4) { showSecurityScan() }
        addActionTo(branchFlow, "更新設定", 5) { showUpdateSettings() }
        addActionTo(branchFlow, "系統環境", 2) { showEnvironmentSettings() }
    }

    private fun applyFpsDisplayPreference(enabled: Boolean) {
        if (::fpsIndicator.isInitialized) {
            fpsIndicator.visibility = if (enabled) View.VISIBLE else View.GONE
        }
        if (enabled && !fpsLoopRunning) {
            fpsLoopRunning = true
            fpsLastNs = 0L
            fpsFrames = 0
            Choreographer.getInstance().postFrameCallback(fpsFrameCallback)
        } else if (!enabled && fpsLoopRunning) {
            fpsLoopRunning = false
            Choreographer.getInstance().removeFrameCallback(fpsFrameCallback)
        }
    }

    private fun applyTemperatureDisplayPreference(enabled: Boolean) {
        if (::temperatureIndicator.isInitialized) {
            temperatureIndicator.visibility = if (enabled) View.VISIBLE else View.GONE
        }
        if (enabled && !temperatureLoopRunning) {
            temperatureLoopRunning = true
            temperatureHandler.post(temperatureRunnable)
        } else if (!enabled && temperatureLoopRunning) {
            temperatureLoopRunning = false
            temperatureHandler.removeCallbacks(temperatureRunnable)
        }
    }

    
    private fun applySystemHudPreference(enabled: Boolean) {
        if (::systemHudIndicator.isInitialized) {
            systemHudIndicator.visibility = if (enabled) View.VISIBLE else View.GONE
        }
        if (enabled && !systemMonitorRunning) {
            systemMonitorRunning = true
            monitorStartMs = SystemClock.elapsedRealtime()
            monitorWindowStartNs = 0L
            monitorLastFrameNs = 0L
            lastCpuMs = Process.getElapsedCpuTime()
            lastCpuWallMs = SystemClock.elapsedRealtime()
            Choreographer.getInstance().postFrameCallback(systemFrameCallback)
            systemMonitorHandler.post(systemMonitorRunnable)
        } else if (!enabled && systemMonitorRunning && !burnInActive) {
            systemMonitorRunning = false
            Choreographer.getInstance().removeFrameCallback(systemFrameCallback)
            systemMonitorHandler.removeCallbacks(systemMonitorRunnable)
        }
    }

    private fun thermalStatusLabel(): String {
        if (Build.VERSION.SDK_INT < 29) return "N/A"
        val pm = getSystemService(Context.POWER_SERVICE) as PowerManager
        return when (pm.currentThermalStatus) {
            PowerManager.THERMAL_STATUS_NONE -> "NORMAL"
            PowerManager.THERMAL_STATUS_LIGHT -> "LIGHT"
            PowerManager.THERMAL_STATUS_MODERATE -> "MODERATE"
            PowerManager.THERMAL_STATUS_SEVERE -> "SEVERE"
            PowerManager.THERMAL_STATUS_CRITICAL -> "CRITICAL"
            PowerManager.THERMAL_STATUS_EMERGENCY -> "EMERGENCY"
            PowerManager.THERMAL_STATUS_SHUTDOWN -> "SHUTDOWN"
            else -> "UNKNOWN"
        }
    }

    private fun updateSystemMonitorSnapshot() {
        val battery = registerReceiver(null, IntentFilter(Intent.ACTION_BATTERY_CHANGED))
        val rawTemp = battery?.getIntExtra(BatteryManager.EXTRA_TEMPERATURE, Int.MIN_VALUE) ?: Int.MIN_VALUE
        val tempC = if (rawTemp == Int.MIN_VALUE) Double.NaN else rawTemp / 10.0
        val level = battery?.getIntExtra(BatteryManager.EXTRA_LEVEL, -1) ?: -1
        val scale = battery?.getIntExtra(BatteryManager.EXTRA_SCALE, 100) ?: 100
        val batteryPct = if (level >= 0 && scale > 0) level * 100 / scale else -1
        val batteryStatus = battery?.getIntExtra(BatteryManager.EXTRA_STATUS, -1) ?: -1
        val charging = batteryStatus == BatteryManager.BATTERY_STATUS_CHARGING || batteryStatus == BatteryManager.BATTERY_STATUS_FULL

        val am = getSystemService(Context.ACTIVITY_SERVICE) as ActivityManager
        val mi = ActivityManager.MemoryInfo()
        am.getMemoryInfo(mi)
        val appRamMb = android.os.Debug.getPss().toDouble() / 1024.0
        val availRamMb = mi.availMem.toDouble() / (1024.0 * 1024.0)
        monitorMaxRamMb = maxOf(monitorMaxRamMb, appRamMb)

        val nowWall = SystemClock.elapsedRealtime()
        val nowCpu = Process.getElapsedCpuTime()
        val wallDelta = (nowWall - lastCpuWallMs).coerceAtLeast(1L)
        val cpuLoad = ((nowCpu - lastCpuMs).toDouble() / wallDelta.toDouble() * 100.0).coerceIn(0.0, 999.0)
        lastCpuMs = nowCpu
        lastCpuWallMs = nowWall

        if (!tempC.isNaN()) monitorMaxTempC = maxOf(monitorMaxTempC, tempC)
        val thermal = thermalStatusLabel()
        val ramPressure = when {
            mi.lowMemory -> "HIGH"
            availRamMb < 512.0 -> "HIGH"
            availRamMb < 1024.0 -> "MODERATE"
            else -> "NORMAL"
        }
        val perfState = when {
            thermal in setOf("CRITICAL","EMERGENCY","SHUTDOWN") || ramPressure == "HIGH" -> "RED"
            thermal in setOf("MODERATE","SEVERE") || (!tempC.isNaN() && tempC >= 43.0) || monitorFrameTimeMs > 20.0 -> "YELLOW"
            else -> "GREEN"
        }
        val elapsedMs = if (burnInActive) nowWall - burnInStartMs else nowWall - monitorStartMs
        val hh = elapsedMs / 3_600_000
        val mm = (elapsedMs / 60_000) % 60
        val ss = (elapsedMs / 1000) % 60
        val avgFps = if (monitorFpsSamples > 0) monitorFpsSum / monitorFpsSamples else monitorFps
        val minFps = if (monitorMinFps.isFinite()) monitorMinFps else monitorFps
        val tempText = if (tempC.isNaN()) "--.-" else String.format("%.1f", tempC)
        monitorSnapshot =
            "FPS " + String.format("%.1f", monitorFps) +
            " | " + String.format("%.1f", monitorFrameTimeMs) + "ms" +
            " | BAT " + tempText + "°C " + (if (batteryPct >= 0) "$batteryPct%" else "--%") + (if (charging) "⚡" else "") +
            " | RAM " + String.format("%.0f", appRamMb) + "MB" +
            " | Thermal " + thermal +
            "\nDropped " + monitorDroppedFrames +
            " | App CPU " + String.format("%.0f", cpuLoad) + "%" +
            " | Mem " + ramPressure +
            " | State " + perfState +
            (if (burnInActive) " | BURN " + String.format("%02d:%02d:%02d", hh, mm, ss) else "")
        if (::systemHudIndicator.isInitialized) {
            systemHudIndicator.text = monitorSnapshot.substringBefore("\n")
            systemHudIndicator.setTextColor(when(perfState) {
                "RED" -> Color.rgb(255,82,82)
                "YELLOW" -> Color.rgb(255,193,7)
                else -> Color.rgb(99,255,157)
            })
        }

        if (burnInActive && (thermal in setOf("CRITICAL","EMERGENCY","SHUTDOWN") || (!tempC.isNaN() && tempC >= 47.0))) {
            burnInActive = false
            Toast.makeText(this, "Renderer 燒機已因高溫自動停止 • BAT " + tempText + "°C • Thermal " + thermal, Toast.LENGTH_LONG).show()
        }

        // Keep expanded statistics available without changing CNC safety state.
        if (systemHudExpanded) {
            systemHudExpanded = false
        }
    }

    private fun showExpandedSystemHud() {
        systemHudExpanded = true
        val now = SystemClock.elapsedRealtime()
        val elapsed = if (burnInActive) now - burnInStartMs else now - monitorStartMs
        val avgFps = if (monitorFpsSamples > 0) monitorFpsSum / monitorFpsSamples else monitorFps
        val minFps = if (monitorMinFps.isFinite()) monitorMinFps else monitorFps
        val maxTemp = if (monitorMaxTempC.isFinite()) String.format("%.1f°C", monitorMaxTempC) else "--"
        val body = buildString {
            appendLine(monitorSnapshot)
            appendLine("平均 FPS: " + String.format("%.1f", avgFps))
            appendLine("最低 FPS: " + String.format("%.1f", minFps))
            appendLine("最高 BAT 溫度: " + maxTemp)
            appendLine("最高 App RAM: " + String.format("%.0f MB", monitorMaxRamMb))
            appendLine("Dropped Frames: " + monitorDroppedFrames)
            appendLine("Renderer Governor: UI/VISUAL ONLY")
            appendLine("CNC Safety Gate: SEPARATE / UNCHANGED")
            append("0.001 mm precision: LOCKED")
        }
        AlertDialog.Builder(this)
            .setTitle(if (burnInActive) "系統監控 HUD • Renderer 燒機中" else "系統監控 HUD")
            .setMessage(body)
            .setPositiveButton(if (burnInActive) "停止 Renderer 燒機" else "開始 Renderer 燒機") { _, _ ->
                if (burnInActive) {
                    burnInActive = false
                    Toast.makeText(this, "Renderer 燒機停止", Toast.LENGTH_SHORT).show()
                } else {
                    burnInActive = true
                    burnInStartMs = SystemClock.elapsedRealtime()
                    monitorDroppedFrames = 0L
                    monitorMaxTempC = Double.NEGATIVE_INFINITY
                    monitorMinFps = Double.POSITIVE_INFINITY
                    monitorFpsSum = 0.0
                    monitorFpsSamples = 0L
                    monitorMaxRamMb = 0.0
                    if (!systemMonitorRunning) applySystemHudPreference(true)
                    Toast.makeText(this, "Renderer 燒機開始 • 高溫將自動停止", Toast.LENGTH_LONG).show()
                }
            }
            .setNegativeButton("關閉", null)
            .show()
    }

private fun showEnvironmentSettings() {
        val prefs = getSharedPreferences("aig_environment", MODE_PRIVATE)
        val box = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(dp(16), dp(10), dp(16), dp(8))
        }

        val fpsValues = arrayOf("Auto", "120 FPS", "60 FPS", "30 FPS")
        val fps = Spinner(this).apply {
            adapter = ArrayAdapter(this@MainActivity, android.R.layout.simple_spinner_dropdown_item, fpsValues)
            val current = prefs.getString("fps_mode", "Auto") ?: "Auto"
            setSelection(fpsValues.indexOf(current).coerceAtLeast(0))
            box.addView(TextView(this@MainActivity).apply { text = "FPS 模式" })
            box.addView(this)
        }

        val powerValues = arrayOf("Balanced", "Performance", "Eco", "Auto")
        val power = Spinner(this).apply {
            adapter = ArrayAdapter(this@MainActivity, android.R.layout.simple_spinner_dropdown_item, powerValues)
            val current = prefs.getString("power_mode", "Balanced") ?: "Balanced"
            setSelection(powerValues.indexOf(current).coerceAtLeast(0))
            box.addView(TextView(this@MainActivity).apply { text = "省電 / 效能模式" })
            box.addView(this)
        }

        val qualityValues = arrayOf("High", "Ultra", "Balanced", "Eco")
        val quality = Spinner(this).apply {
            adapter = ArrayAdapter(this@MainActivity, android.R.layout.simple_spinner_dropdown_item, qualityValues)
            val current = prefs.getString("render_quality", "High") ?: "High"
            setSelection(qualityValues.indexOf(current).coerceAtLeast(0))
            box.addView(TextView(this@MainActivity).apply { text = "3D / SIM 畫質" })
            box.addView(this)
        }

        val rgb = SeekBar(this).apply {
            max = 100
            progress = prefs.getInt("rgb_brightness", 65)
            box.addView(TextView(this@MainActivity).apply { text = "RGB 亮度 0–100%" })
            box.addView(this)
        }

        val systemHud = CheckBox(this).apply {
            text = "系統監控 HUD：精簡列 / 點擊展開"
            isChecked = prefs.getBoolean("system_hud_enabled", true)
            box.addView(this)
        }

        val fpsDisplay = CheckBox(this).apply {
            text = "FPS 顯示：開啟即時實測 FPS"
            isChecked = prefs.getBoolean("fps_display_enabled", false)
            box.addView(this)
        }

        val temperatureDisplay = CheckBox(this).apply {
            text = "溫度顯示（電池感測）：BAT °C"
            isChecked = prefs.getBoolean("temperature_display_enabled", true)
            box.addView(this)
        }

        val overheatWarning = CheckBox(this).apply {
            text = "過熱提醒：43°C 警告 / 47°C 高溫"
            isChecked = prefs.getBoolean("overheat_warning_enabled", true)
            box.addView(this)
        }

        val hud = CheckBox(this).apply {
            text = "效能 HUD：FPS / Frame Time / Battery / Thermal"
            isChecked = prefs.getBoolean("hud_enabled", false)
            box.addView(this)
        }

        val autoThermal = CheckBox(this).apply {
            text = "自動溫度降頻：120 → 60 → 30"
            isChecked = prefs.getBoolean("thermal_auto", true)
            box.addView(this)
        }

        val idleThrottle = CheckBox(this).apply {
            text = "Idle redraw throttling 省電"
            isChecked = prefs.getBoolean("idle_throttle", true)
            box.addView(this)
        }

        AlertDialog.Builder(this)
            .setTitle("AIG CNC 系統環境設定")
            .setView(box)
            .setPositiveButton("套用") { _, _ ->
                val selectedFps = fpsValues[fps.selectedItemPosition]
                prefs.edit()
                    .putString("fps_mode", selectedFps)
                    .putString("power_mode", powerValues[power.selectedItemPosition])
                    .putString("render_quality", qualityValues[quality.selectedItemPosition])
                    .putInt("rgb_brightness", rgb.progress)
                    .putBoolean("system_hud_enabled", systemHud.isChecked)
                    .putBoolean("fps_display_enabled", fpsDisplay.isChecked)
                    .putBoolean("temperature_display_enabled", temperatureDisplay.isChecked)
                    .putBoolean("overheat_warning_enabled", overheatWarning.isChecked)
                    .putInt("temperature_warn_c", 43)
                    .putInt("temperature_high_c", 47)
                    .putBoolean("hud_enabled", hud.isChecked)
                    .putBoolean("thermal_auto", autoThermal.isChecked)
                    .putBoolean("idle_throttle", idleThrottle.isChecked)
                    .apply()

                applySystemHudPreference(systemHud.isChecked)
                applyFpsDisplayPreference(fpsDisplay.isChecked)
                applyTemperatureDisplayPreference(temperatureDisplay.isChecked)

                if (Build.VERSION.SDK_INT >= 30) {
                    val requested = when (selectedFps) {
                        "120 FPS" -> 120f
                        "60 FPS" -> 60f
                        "30 FPS" -> 30f
                        else -> display?.refreshRate ?: 60f
                    }
                    display?.supportedModes
                        ?.minByOrNull { kotlin.math.abs(it.refreshRate - requested) }
                        ?.let { mode -> window.attributes = window.attributes.apply { preferredDisplayModeId = mode.modeId } }
                }
                val visualAlpha = (0.35f + rgb.progress / 100f * 0.65f).coerceIn(0.35f, 1f)
                categoryButtons.values.forEach { it.alpha = visualAlpha }
                toolButtons.values.forEach { it.alpha = visualAlpha }
                Toast.makeText(
                    this,
                    "ENV APPLIED • " + selectedFps + " • RGB " + rgb.progress + "% • CNC 精度仍為 0.001 mm",
                    Toast.LENGTH_LONG
                ).show()
            }
            .setNegativeButton("取消", null)
            .show()
    }
    private fun showNetworkStatus() {
        AlertDialog.Builder(this)
            .setTitle("NETWORK SECURITY")
            .setMessage(
                "NETWORK: " + NetworkSecurity.status(this) +
                    "\nHTTPS ONLY: ENABLED" +
                    "\nCLEAR-TEXT HTTP: BLOCKED"
            )
            .setPositiveButton("OK", null)
            .show()
    }

    private fun runSecureUpdateCheck() {
        val config = UpdateConfigStore.load(this)
        Toast.makeText(this, "ChatGPT AI 更新 • 一鍵：檢查與驗證中…", Toast.LENGTH_SHORT).show()
        SecureUpdateManager.autoCheck(this, config) { result ->
            val apk = result.verifiedApk
            if (result.ok && apk != null) {
                val install = runCatching { SecureUpdateManager.installVerifiedUpdate(this, apk) }
                AlertDialog.Builder(this)
                    .setTitle(if (install.isSuccess) "ChatGPT AI 更新 • 一鍵" else "UPDATE BLOCKED")
                    .setMessage(install.getOrElse { "UPDATE BLOCKED: " + (it.message ?: "installer error") })
                    .setPositiveButton("OK", null)
                    .show()
            } else {
                AlertDialog.Builder(this)
                    .setTitle(if (result.ok) "ChatGPT AI 更新" else "UPDATE BLOCKED")
                    .setMessage(result.message)
                    .setPositiveButton("OK", null)
                    .show()
            }
        }
    }

    private fun showUpdateSettings() {
        val current = UpdateConfigStore.load(this)
        val box = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(dp(14), dp(8), dp(14), dp(6))
        }
        val url = EditText(this).apply {
            hint = "HTTPS update manifest URL"
            setText(current.manifestUrl)
            isSingleLine = false
            box.addView(this)
        }
        val key = EditText(this).apply {
            hint = "RSA public key (X.509 Base64)"
            setText(current.rsaPublicKeyBase64)
            minLines = 3
            box.addView(this)
        }
        val auto = CheckBox(this).apply {
            text = "自動檢查並下載已驗證更新"
            isChecked = current.autoDownload
            box.addView(this)
        }
        AlertDialog.Builder(this)
            .setTitle("AI UPDATE SETTINGS")
            .setView(box)
            .setPositiveButton("儲存") { _, _ ->
                val next = UpdateConfig(url.text.toString().trim(), key.text.toString(), auto.isChecked)
                val valid = runCatching {
                    if (next.manifestUrl.isNotBlank()) NetworkSecurity.requireHttps(next.manifestUrl)
                }.isSuccess
                if (valid) {
                    UpdateConfigStore.save(this, next)
                    Toast.makeText(
                        this,
                        if (next.configured) "安全更新設定完成" else "設定未完整：更新保持 BLOCKED",
                        Toast.LENGTH_LONG
                    ).show()
                } else {
                    Toast.makeText(this, "只允許 HTTPS 更新網址", Toast.LENGTH_LONG).show()
                }
            }
            .setNegativeButton("取消", null)
            .show()
    }

    private fun showSecurityScan() {
        Toast.makeText(this, "安全掃描中…", Toast.LENGTH_SHORT).show()
        Thread({
            val report = AppSecurityScanner.scan(listOf(filesDir, cacheDir))
            runOnUiThread {
                val body = buildString {
                    appendLine("範圍：App 可存取檔案")
                    appendLine("Scanned=" + report.scannedFiles + "  Hashed=" + report.hashedFiles)
                    appendLine("High-risk=" + report.findings.count { it.severity == "HIGH" })
                    report.findings.take(8).forEach {
                        appendLine(it.severity + " • " + java.io.File(it.path).name + " • " + it.reason)
                    }
                    if (report.findings.size > 8) append("... +" + (report.findings.size - 8) + " findings")
                }
                AlertDialog.Builder(this)
                    .setTitle(if (report.clean) "防毒 / 安全掃描 PASS" else "防毒 / 安全掃描 BLOCKED")
                    .setMessage(body)
                    .setPositiveButton("OK", null)
                    .show()
            }
        }, "AppSecurityScan").start()
    }

    private fun showAiBranch() {
        branchFlow.removeAllViews(); toolButtons.clear()
        addActionTo(branchFlow, "AI CAD 檢查", 3) { cad.aiInspect() }
    }

    private fun addCategory(label: String, colorIndex: Int, show: () -> Unit) {
        val b = toolButton(label + " ＋", colors[colorIndex])
        b.setOnClickListener {
            if (activeCategory == label) closeBranches() else openCategory(label, show)
        }
        categoryButtons[label] = b; categoryFlow.addView(b)
    }

    private fun openCategory(label: String, show: () -> Unit) {
        activeCategory = label
        categoryButtons.forEach { (name, b) -> styleButton(b, categoryColor(name), name == label) }
        branchFlow.visibility = View.VISIBLE
        show()
        // Changing category also clears the previous active tool light/state.
        toolButtons.values.forEach { it.alpha = 0.62f }
    }

    private fun closeBranches() {
        activeCategory = null; branchFlow.removeAllViews(); branchFlow.visibility = View.GONE
        categoryButtons.forEach { (name, b) -> styleButton(b, categoryColor(name), false) }
    }

    private fun categoryColor(name: String): Int = when(name) {
        "繪圖" -> colors[0]; "修改" -> colors[3]; "角部" -> colors[2]; "加工" -> colors[5]; "安全" -> colors[4]; else -> colors[1]
    }

    private fun selectTool(tool: Tool) {
        cad.setTool(tool)
        // Exactly one active tool: selecting a new one extinguishes every previous light.
        toolButtons.forEach { (t, b) -> styleButton(b, toolColor(t), selected = t == tool) }
    }
    private fun toolColor(tool: Tool): Int = when (tool) {
        Tool.LINE, Tool.PAN -> colors[0]; Tool.RECT, Tool.FILLET -> colors[1]
        Tool.CIRCLE, Tool.CHAMFER -> colors[2]; Tool.DELETE -> colors[4]
    }
    private fun addToolToBranch(label: String, tool: Tool, colorIndex: Int, onClick: (() -> Unit)? = null) {
        val b = toolButton("└─ $label", colors[colorIndex % colors.size])
        b.alpha = 0.72f
        b.setOnClickListener { if (onClick != null) onClick() else selectTool(tool) }
        toolButtons[tool] = b; branchFlow.addView(b)
    }
    private fun addActionTo(parent: FlowLayout, label: String, colorIndex: Int, run: () -> Unit) {
        val b = toolButton(label, colors[colorIndex]); b.setOnClickListener { run() }; parent.addView(b)
    }
    private fun toolButton(label: String, color: Int) = Button(this).apply {
        text = label; setTextColor(Color.WHITE); textSize = 13f; minWidth = dp(72); minHeight = dp(52)
        isAllCaps = false; elevation = dp(3).toFloat(); setPadding(dp(10), 0, dp(10), 0)
        styleButton(this, color, false)
    }
    private fun styleButton(button: Button, color: Int, selected: Boolean) {
        button.background = GradientDrawable().apply {
            cornerRadius = dp(15).toFloat(); setColor(if (selected) Color.argb(225, 23, 58, 80) else Color.argb(155, 10, 24, 38))
            setStroke(dp(if (selected) 3 else 2), color)
        }
        button.alpha = if (selected) 1f else 0.82f
        button.elevation = dp(if (selected) 8 else 3).toFloat()
    }
    private fun askValue(title: String, current: Double, done: (Double) -> Unit) {
        val input = EditText(this).apply { setText(DisplayFormat.mm(current)); inputType = InputType.TYPE_CLASS_NUMBER or InputType.TYPE_NUMBER_FLAG_DECIMAL }
        AlertDialog.Builder(this).setTitle(title).setView(input)
            .setPositiveButton("確定") { _, _ -> input.text.toString().toDoubleOrNull()?.takeIf { it > 0 }?.let(done) }
            .setNegativeButton("取消", null).show()
    }
    private fun dp(v: Int) = (v * resources.displayMetrics.density).roundToInt()
}

class FlowLayout(context: Context) : ViewGroup(context) {
    private val gap = (6 * resources.displayMetrics.density).roundToInt()
    init {
        background = GradientDrawable().apply {
            cornerRadius = 16f * resources.displayMetrics.density
            setColor(Color.argb(112, 8, 24, 38))
            setStroke(max(1, (1.1f * resources.displayMetrics.density).roundToInt()), Color.argb(150, 61, 235, 255))
        }
    }

    override fun onMeasure(widthMeasureSpec: Int, heightMeasureSpec: Int) {
        val available = MeasureSpec.getSize(widthMeasureSpec) - paddingLeft - paddingRight
        var x = 0; var y = 0; var rowH = 0
        for (i in 0 until childCount) {
            val child = getChildAt(i)
            measureChild(child, widthMeasureSpec, heightMeasureSpec)
            if (x + child.measuredWidth > available && x > 0) { x = 0; y += rowH + gap; rowH = 0 }
            x += child.measuredWidth + gap
            rowH = max(rowH, child.measuredHeight)
        }
        y += rowH + paddingTop + paddingBottom
        setMeasuredDimension(MeasureSpec.getSize(widthMeasureSpec), resolveSize(y, heightMeasureSpec))
    }

    override fun onLayout(changed: Boolean, l: Int, t: Int, r: Int, b: Int) {
        val available = r - l - paddingLeft - paddingRight
        var x = paddingLeft; var y = paddingTop; var rowH = 0
        for (i in 0 until childCount) {
            val child = getChildAt(i)
            if (x - paddingLeft + child.measuredWidth > available && x > paddingLeft) { x = paddingLeft; y += rowH + gap; rowH = 0 }
            child.layout(x, y, x + child.measuredWidth, y + child.measuredHeight)
            x += child.measuredWidth + gap
            rowH = max(rowH, child.measuredHeight)
        }
    }
}

class CadView(context: Context) : View(context) {
    private val doc = DrawingDocument()
    private val history = History(doc)
    private val gridPaint = Paint(1).apply { color = 0xFF163044.toInt() }
    private val axisPaint = Paint(2).apply { color = 0xFF00B8D4.toInt() }
    private val geoPaint = Paint(3).apply { color = 0xFFE8F1FA.toInt(); style = Paint.Style.STROKE; strokeCap = Paint.Cap.ROUND }
    private val accentPaint = Paint(3).apply { color = 0xFFFFB020.toInt(); style = Paint.Style.STROKE }
    private val textPaint = Paint(1).apply { color = 0xFF8FB3C9.toInt(); textSize = 14 * resources.displayMetrics.scaledDensity; isDither = true }
    private val gridPath = Path()
    private val normalLinePath = Path()
    private val selectedLinePath = Path()
    private val arcPath = Path()
    private var tool = Tool.LINE
    private var firstPoint: Vec2? = null
    private val selectedLines = mutableListOf<String>()
    private val transform = WorldTransform(0.0, 0.0, 5.0)
    private var lastX = 0f; private var lastY = 0f
    private var lastWorld = Vec2(0.0, 0.0)
    var chamferValue = 5.0
    var filletValue = 5.0

    private val scaleDetector = ScaleGestureDetector(context, object : ScaleGestureDetector.SimpleOnScaleGestureListener() {
        override fun onScale(detector: ScaleGestureDetector): Boolean {
            transform.zoomAt(Vec2(detector.focusX.toDouble(), detector.focusY.toDouble()), detector.scaleFactor.toDouble())
            postInvalidateOnAnimation(); return true
        }
    })

    init {
        setBackgroundColor(0xFF081622.toInt())
        isFocusable = true
        setLayerType(View.LAYER_TYPE_HARDWARE, null)
        geoPaint.strokeJoin = Paint.Join.ROUND
        geoPaint.strokeCap = Paint.Cap.ROUND
        geoPaint.isDither = true
        accentPaint.strokeJoin = Paint.Join.ROUND
        accentPaint.strokeCap = Paint.Cap.ROUND
        accentPaint.isDither = true
    }

    fun snapshot(): DrawingSnapshot = doc.snapshot()
    fun setTool(t: Tool) { tool = t; firstPoint = null; selectedLines.clear(); invalidate() }
    fun undo() { history.undo(); firstPoint = null; selectedLines.clear(); invalidate() }
    fun redo() { history.redo(); firstPoint = null; selectedLines.clear(); invalidate() }
    fun aiInspect() {
        val result = AiCadInspector.inspect(doc.snapshot())
        val message = if (result.issues.isEmpty()) "未發現明顯幾何異常。CAM 前仍需人工確認刀具、座標與 Z 高度。"
        else result.issues.take(8).joinToString("\n") { "${it.severity}: ${it.message}" } +
            if (result.issues.size > 8) "\n…另有 ${result.issues.size - 8} 項" else ""
        AlertDialog.Builder(context)
            .setTitle("AI CAD 安全檢查")
            .setMessage(message)
            .setPositiveButton("知道了", null)
            .show()
    }

    override fun onSizeChanged(w: Int, h: Int, oldw: Int, oldh: Int) {
        if (oldw == 0) { transform.originScreenX = w / 2.0; transform.originScreenY = h / 2.0 }
    }

    override fun onDraw(canvas: Canvas) {
        super.onDraw(canvas)
        drawGrid(canvas)
        drawEntities(canvas)
        firstPoint?.let { val p = transform.worldToScreen(it); canvas.drawCircle(p.x.toFloat(), p.y.toFloat(), 8f, accentPaint) }
        canvas.drawText("精度 0.001 mm • 顯示 0.000 • ${tool.name}   X ${DisplayFormat.mm(lastWorld.x)}  Y ${DisplayFormat.mm(lastWorld.y)}   C${DisplayFormat.mm(chamferValue)} R${DisplayFormat.mm(filletValue)}", 16f, 26f, textPaint)
    }

    private fun cncRulerStepMm(): Double {
        val targetPixels = 92.0
        var decade = CNC_RESOLUTION_MM
        while (decade * transform.pixelsPerUnit * 10.0 < targetPixels) decade *= 10.0
        for (m in doubleArrayOf(1.0, 2.0, 5.0, 10.0)) {
            val step = decade * m
            if (step * transform.pixelsPerUnit >= targetPixels) return step
        }
        return decade * 10.0
    }

    private fun drawCncThousandthRulers(canvas: Canvas, stepMm: Double) {
        val left = transform.screenToWorld(Vec2(0.0, height.toDouble())).x
        val right = transform.screenToWorld(Vec2(width.toDouble(), height.toDouble())).x
        val top = transform.screenToWorld(Vec2(0.0, 0.0)).y
        val bottom = transform.screenToWorld(Vec2(0.0, height.toDouble())).y

        var xVal = floor(min(left, right) / stepMm) * stepMm
        val xMax = max(left, right)
        var guard = 0
        while (xVal <= xMax + stepMm * 0.5 && guard < 80) {
            val p = transform.worldToScreen(Vec2(xVal, 0.0))
            val px = p.x.toFloat()
            if (px >= 0f && px <= width.toFloat()) {
                canvas.drawLine(px, height - 13f, px, height.toFloat(), axisPaint)
                val label = DisplayFormat.mm(if (abs(xVal) < CNC_RESOLUTION_MM / 2.0) 0.0 else xVal)
                canvas.drawText(label, px + 3f, height - 17f, textPaint)
            }
            xVal += stepMm
            guard++
        }

        var yVal = floor(min(bottom, top) / stepMm) * stepMm
        val yMax = max(bottom, top)
        guard = 0
        while (yVal <= yMax + stepMm * 0.5 && guard < 80) {
            val p = transform.worldToScreen(Vec2(0.0, yVal))
            val py = p.y.toFloat()
            if (py >= 32f && py <= height.toFloat()) {
                canvas.drawLine(0f, py, 13f, py, axisPaint)
                val label = DisplayFormat.mm(if (abs(yVal) < CNC_RESOLUTION_MM / 2.0) 0.0 else yVal)
                canvas.drawText(label, 17f, py - 4f, textPaint)
            }
            yVal += stepMm
            guard++
        }
    }

    private fun drawGrid(canvas: Canvas) {
        val stepMm = cncRulerStepMm()
        val step = stepMm * transform.pixelsPerUnit
        gridPath.reset()
        var x = transform.originScreenX % step
        while (x < width) {
            gridPath.moveTo(x.toFloat(), 0f)
            gridPath.lineTo(x.toFloat(), height.toFloat())
            x += step
        }
        var y = transform.originScreenY % step
        while (y < height) {
            gridPath.moveTo(0f, y.toFloat())
            gridPath.lineTo(width.toFloat(), y.toFloat())
            y += step
        }
        canvas.drawPath(gridPath, gridPaint)
        canvas.drawLine(0f, transform.originScreenY.toFloat(), width.toFloat(), transform.originScreenY.toFloat(), axisPaint)
        canvas.drawLine(transform.originScreenX.toFloat(), 0f, transform.originScreenX.toFloat(), height.toFloat(), axisPaint)
        canvas.drawText("原點 X0.000 Y0.000", transform.originScreenX.toFloat()+8f, transform.originScreenY.toFloat()-8f, textPaint)
        drawCncThousandthRulers(canvas, stepMm)
    }

    private fun drawEntities(canvas: Canvas) {
        normalLinePath.reset()
        selectedLinePath.reset()
        doc.all().forEach { e -> when (e) {
            is Line -> {
                val a = transform.worldToScreen(e.a); val b = transform.worldToScreen(e.b)
                val path = if (selectedLines.contains(e.id)) selectedLinePath else normalLinePath
                path.moveTo(a.x.toFloat(), a.y.toFloat())
                path.lineTo(b.x.toFloat(), b.y.toFloat())
            }
            is Circle -> {
                val p = transform.worldToScreen(e.center)
                geoPaint.color = 0xFFE8F1FA.toInt()
                canvas.drawCircle(p.x.toFloat(), p.y.toFloat(), (e.radius * transform.pixelsPerUnit).toFloat(), geoPaint)
            }
            is Arc -> {
                geoPaint.color = 0xFFE8F1FA.toInt()
                drawArcPolyline(canvas, e)
            }
        } }
        geoPaint.color = 0xFFE8F1FA.toInt()
        canvas.drawPath(normalLinePath, geoPaint)
        geoPaint.color = 0xFFFFB020.toInt()
        canvas.drawPath(selectedLinePath, geoPaint)
    }

    private fun drawArcPolyline(canvas: Canvas, arc: Arc) {
        val startA = atan2(arc.start.y - arc.center.y, arc.start.x - arc.center.x)
        val endA = atan2(arc.end.y - arc.center.y, arc.end.x - arc.center.x)
        var delta = endA - startA
        if (arc.clockwise) while (delta > 0) delta -= 2 * Math.PI else while (delta < 0) delta += 2 * Math.PI
        if (abs(delta) > Math.PI) delta += if (delta > 0) -2 * Math.PI else 2 * Math.PI
        arcPath.reset()
        for (i in 0..32) {
            val a = startA + delta * i / 32.0
            val p = transform.worldToScreen(Vec2(arc.center.x + cos(a) * arc.radius, arc.center.y + sin(a) * arc.radius))
            if (i == 0) arcPath.moveTo(p.x.toFloat(), p.y.toFloat()) else arcPath.lineTo(p.x.toFloat(), p.y.toFloat())
        }
        canvas.drawPath(arcPath, geoPaint)
    }

    override fun onTouchEvent(event: MotionEvent): Boolean {
        scaleDetector.onTouchEvent(event)
        if (event.pointerCount > 1) return true
        lastWorld = transform.screenToWorld(Vec2(event.x.toDouble(), event.y.toDouble()))
        when (event.actionMasked) {
            MotionEvent.ACTION_DOWN -> {
                lastX = event.x; lastY = event.y
                if (tool != Tool.PAN) handleTap(lastWorld)
                invalidate(); return true
            }
            MotionEvent.ACTION_MOVE -> if (tool == Tool.PAN) {
                transform.pan((event.x-lastX).toDouble(), (event.y-lastY).toDouble())
                lastX=event.x; lastY=event.y; postInvalidateOnAnimation(); return true
            }
        }
        return true
    }

    private fun handleTap(p: Vec2) {
        when (tool) {
            Tool.LINE -> twoPoint(p) { a,b ->
                if (a.distanceTo(b) >= CNC_RESOLUTION_MM) history.run(AddEntitiesCommand(listOf(Line(a=a,b=b))))
            }
            Tool.RECT -> twoPoint(p) { a,b ->
                if (abs(a.x - b.x) < CNC_RESOLUTION_MM || abs(a.y - b.y) < CNC_RESOLUTION_MM) return@twoPoint
                history.run(AddEntitiesCommand(listOf(
                    Line(a=a,b=Vec2(b.x,a.y)), Line(a=Vec2(b.x,a.y),b=b),
                    Line(a=b,b=Vec2(a.x,b.y)), Line(a=Vec2(a.x,b.y),b=a)
                )))
            }
            Tool.CIRCLE -> twoPoint(p) { a,b -> a.distanceTo(b).takeIf { it >= CNC_RESOLUTION_MM }?.let { history.run(AddEntitiesCommand(listOf(Circle(center=a,radius=it)))) } }
            Tool.DELETE -> nearest(p)?.let { history.run(DeleteEntityCommand(it.id)) }
            Tool.CHAMFER, Tool.FILLET -> selectTwoLines(p)
            Tool.PAN -> Unit
        }
    }

    private fun twoPoint(p: Vec2, done: (Vec2,Vec2)->Unit) {
        val a = firstPoint
        if (a == null) firstPoint = p else { done(a,p); firstPoint = null }
    }

    private fun nearest(p: Vec2): Entity? {
        val tolerance = 18.0 / transform.pixelsPerUnit
        return doc.all().mapNotNull { e -> when (e) {
            is Line -> Geometry.distancePointToSegment(p,e) to e
            is Circle -> abs(p.distanceTo(e.center)-e.radius) to e
            is Arc -> abs(p.distanceTo(e.center)-e.radius) to e
        }}.filter { it.first < tolerance }.minByOrNull { it.first }?.second
    }

    private fun selectTwoLines(p: Vec2) {
        val line = nearest(p) as? Line ?: return
        if (!selectedLines.contains(line.id)) selectedLines.add(line.id)
        if (selectedLines.size == 2) {
            try {
                val command = if (tool == Tool.CHAMFER)
                    chamferCommand(doc, selectedLines[0], selectedLines[1], chamferValue)
                else filletCommand(doc, selectedLines[0], selectedLines[1], filletValue)
                history.run(command)
            } catch (ex: Exception) {
                Toast.makeText(context, ex.message ?: "幾何運算失敗", Toast.LENGTH_SHORT).show()
            }
            selectedLines.clear()
        }
    }
}
