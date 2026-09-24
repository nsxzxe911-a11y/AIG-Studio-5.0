package com.aigstudio.app

import android.app.Activity
import android.app.AlertDialog
import android.os.SystemClock
import android.speech.RecognizerIntent
import android.speech.RecognitionListener
import android.speech.SpeechRecognizer
import android.speech.tts.TextToSpeech
import java.util.Locale
import android.os.Process
import android.os.PowerManager
import android.content.IntentFilter
import android.content.Intent
import android.content.res.Configuration
import android.app.ActivityManager
import android.Manifest
import android.content.Context
import android.content.pm.PackageManager
import android.content.ActivityNotFoundException
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Paint
import android.graphics.Path
import android.graphics.drawable.GradientDrawable
import android.os.Bundle
import android.os.Handler
import android.os.Looper
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

enum class Tool { LINE, RECT, CIRCLE, DELETE, CHAMFER, FILLET, PAN, MEASURE }


data class StudioDisplayProfile(
    val tier: String,
    val uiScale: Float,
    val widthPx: Int,
    val heightPx: Int
)

object StudioDisplayPolicy {
    fun profile(view: View): StudioDisplayProfile {
        val m = view.resources.displayMetrics
        val width = max(view.width, m.widthPixels)
        val height = max(view.height, m.heightPixels)
        val shortEdge = min(width, height)
        val longEdge = max(width, height)
        val tier = when {
            shortEdge >= 2160 && longEdge >= 3800 -> "UHD/4K+"
            shortEdge >= 1440 && longEdge >= 2880 -> "3K-class"
            shortEdge >= 1440 && longEdge >= 2400 -> "2K-class"
            else -> "1080P/FHD+"
        }
        val uiScale = when (tier) {
            "UHD/4K+" -> 1.18f
            "3K-class" -> 1.12f
            "2K-class" -> 1.07f
            else -> 1.0f
        }
        return StudioDisplayProfile(tier, uiScale, width, height)
    }

    fun dp(view: View, value: Float): Int =
        (value * view.resources.displayMetrics.density * profile(view).uiScale).roundToInt()

    fun sp(view: View, value: Float): Float = value * profile(view).uiScale
}

class RgbGlowButton(context: Context) : Button(context) {
    private var accent = Color.rgb(61,235,255)
    private var selectedGlow = false
    private var alarmGlow = false
    private val density = resources.displayMetrics.density

    init {
        isAllCaps = false
        stateListAnimator = null
        setTextColor(Color.WHITE)
        render()
    }

    fun setRgbState(color: Int, selected: Boolean, alarm: Boolean = false) {
        accent = color
        selectedGlow = selected
        alarmGlow = alarm
        render()
    }

    override fun drawableStateChanged() {
        super.drawableStateChanged()
        render()
    }

    private fun mix(base: Int, overlay: Int, amount: Float): Int {
        val a = amount.coerceIn(0f,1f)
        fun m(x:Int,y:Int)=(x+(y-x)*a).roundToInt().coerceIn(0,255)
        return Color.rgb(m(Color.red(base),Color.red(overlay)),m(Color.green(base),Color.green(overlay)),m(Color.blue(base),Color.blue(overlay)))
    }

    private fun render() {
        val disabled = !isEnabled
        val pressedNow = isPressed
        val edge = if (alarmGlow) Color.rgb(255,72,72) else accent
        val base = Color.rgb(10,24,38)
        val amount = when {
            disabled -> 0.04f
            alarmGlow -> 0.38f
            pressedNow -> 0.46f
            selectedGlow -> 0.28f
            else -> 0.08f
        }
        background = GradientDrawable(
            GradientDrawable.Orientation.TOP_BOTTOM,
            intArrayOf(mix(base,edge,amount+0.08f),mix(base,edge,amount))
        ).apply {
            cornerRadius = 15f * density
            setStroke(
                ((if (pressedNow || selectedGlow || alarmGlow) 3.2f else 2f) * density).roundToInt().coerceAtLeast(1),
                if (disabled) Color.rgb(90,100,110) else edge
            )
        }
        alpha = when {
            disabled -> 0.42f
            pressedNow || selectedGlow || alarmGlow -> 1f
            else -> 0.82f
        }
        elevation = when {
            disabled -> 0f
            pressedNow -> 2f*density
            selectedGlow || alarmGlow -> 9f*density
            else -> 3f*density
        }
        scaleX = if (pressedNow) 0.97f else 1f
        scaleY = if (pressedNow) 0.97f else 1f
    }
}


class Axis5xPreview(
    context: Context,
    initialA: Double,
    initialB: Double,
    private val onAxesChanged: (Double, Double) -> Unit
) : View(context) {
    var axisA: Double = initialA
        private set
    var axisB: Double = initialB
        private set
    private var lastX = 0f
    private var lastY = 0f
    private val grid = Paint(Paint.ANTI_ALIAS_FLAG).apply { color = Color.rgb(25,65,88); strokeWidth = 1.2f }
    private val axisPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply { color = Color.rgb(61,235,255); strokeWidth = 5f; strokeCap = Paint.Cap.ROUND }
    private val rotaryPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply { color = Color.rgb(245,158,11); strokeWidth = 4f; style = Paint.Style.STROKE }
    private val textPaint5x = Paint(Paint.ANTI_ALIAS_FLAG).apply { color = Color.WHITE; textSize = 15f * resources.displayMetrics.scaledDensity }

    init {
        setBackgroundColor(Color.rgb(5,15,24))
        isClickable = true
    }

    override fun onDraw(canvas: Canvas) {
        super.onDraw(canvas)
        val cx = width / 2f
        val cy = height / 2f
        for (i in 1..5) {
            val x = width * i / 6f
            val y = height * i / 6f
            canvas.drawLine(x, 0f, x, height.toFloat(), grid)
            canvas.drawLine(0f, y, width.toFloat(), y, grid)
        }
        val scale = min(width, height) * 0.28f
        val aRad = Math.toRadians(axisA)
        val bRad = Math.toRadians(axisB)
        val xEnd = cx + (cos(bRad) * scale).toFloat()
        val xY = cy + (sin(bRad) * scale).toFloat()
        val zEndX = cx + (sin(aRad) * scale * 0.65).toFloat()
        val zEndY = cy - (cos(aRad) * scale).toFloat()
        canvas.drawLine(cx, cy, xEnd, xY, axisPaint)
        canvas.drawLine(cx, cy, zEndX, zEndY, axisPaint)
        val r = scale * 0.78f
        canvas.drawCircle(cx, cy, r, rotaryPaint)
        canvas.drawText("A " + DisplayFormat.mm(axisA) + "°", 18f, 28f, textPaint5x)
        canvas.drawText("B " + DisplayFormat.mm(axisB) + "°", 18f, 54f, textPaint5x)
        canvas.drawText("拖曳：上下=A / 左右=B", 18f, height - 18f, textPaint5x)
    }

    override fun onTouchEvent(event: MotionEvent): Boolean {
        when (event.actionMasked) {
            MotionEvent.ACTION_DOWN -> {
                lastX = event.x
                lastY = event.y
                return true
            }
            MotionEvent.ACTION_MOVE -> {
                val dx = event.x - lastX
                val dy = event.y - lastY
                axisB = (axisB + dx * 0.35).coerceIn(-360.0, 360.0)
                axisA = (axisA - dy * 0.35).coerceIn(-360.0, 360.0)
                lastX = event.x
                lastY = event.y
                onAxesChanged(axisA, axisB)
                postInvalidateOnAnimation()
                return true
            }
        }
        return true
    }
}

class MainActivity : Activity() {
    private var adaptiveRefreshController: AdaptiveRefreshController? = null
    companion object {
        private const val REQ_AI_VOICE = 7110
        private const val REQ_AI_VOICE_PERMISSION = 7111
    }
    private lateinit var cad: CadView
    private var voiceTts: TextToSpeech? = null
    private var speechRecognizer: SpeechRecognizer? = null
    private var voiceListening = false
    private lateinit var branchFlow: FlowLayout
    private lateinit var categoryFlow: FlowLayout
    private val toolButtons = mutableMapOf<Tool, Button>()
    private val categoryButtons = mutableMapOf<String, Button>()
    private var activeCategory: String? = null
    private var camSettings = CamSettings()
    private var ncSingleBlock = false
    private var ncDryRun = false
    private var ncBlockSkip = false
    private var axisA = 0.0
    private var axisB = 0.0
    private var workOffset = "G54"
    private var drillCycleBlock = ""
    private var stockMarginMm = 10.0
    private var stockThicknessMm = 20.0
    private lateinit var fpsIndicator: TextView
    private lateinit var temperatureIndicator: TextView
    private var fpsLoopRunning = false
    private var fpsLastNs = 0L
    private var fpsFrames = 0
    private val temperatureHandler = Handler(Looper.getMainLooper())
    private val autosaveHandler = Handler(Looper.getMainLooper())
    private val autosaveRunnable = object : Runnable {
        override fun run() {
            saveCadCheckpoint()
            autosaveHandler.postDelayed(this, 15000L)
        }
    }
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
            val temps = CpuGpuTemperatureProbe.read()
            if (::temperatureIndicator.isInitialized) {
                temperatureIndicator.text =
                    "CPU " + CpuGpuTemperatureProbe.format(temps.cpuC) +
                    "  |  GPU " + CpuGpuTemperatureProbe.format(temps.gpuC)
                val hottest = listOfNotNull(temps.cpuC, temps.gpuC).maxOrNull()
                val prefs = getSharedPreferences("aig_environment", MODE_PRIVATE)
                val warnC = prefs.getInt("temperature_warn_c", 75).toDouble()
                val highC = prefs.getInt("temperature_high_c", 85).toDouble()
                temperatureIndicator.setTextColor(
                    when {
                        hottest == null -> 0xFFA0B4C3.toInt()
                        hottest >= highC -> 0xFFFF5252.toInt()
                        hottest >= warnC -> 0xFFFFC107.toInt()
                        else -> 0xFF3DEBFF.toInt()
                    }
                )
            }
            temperatureHandler.postDelayed(this, RuntimeDeviceProfile.temperatureIntervalMs)
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
    private var lastCpuMs = 0L
    private var lastCpuWallMs = 0L
    private var monitorSnapshot = "MONITOR --"
    private val monitorHistory = mutableListOf<MonitorSample>()
    private var monitorHistoryLimit = 180
    private var monitorHistoryPaused = false
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
            Choreographer.getInstance().postFrameCallback(this)
        }
    }
    private val systemMonitorRunnable = object : Runnable {
        override fun run() {
            if (!systemMonitorRunning) return
            updateSystemMonitorSnapshot()
            systemMonitorHandler.postDelayed(this, RuntimeDeviceProfile.systemMonitorIntervalMs)
        }
    }
    private val colors = listOf(
        0xFF00BCD4.toInt(), 0xFF8B5CF6.toInt(), 0xFFF59E0B.toInt(),
        0xFF22C55E.toInt(), 0xFFEF4444.toInt(), 0xFF3B82F6.toInt()
    )

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        adaptiveRefreshController = AdaptiveRefreshController(this).also { it.start() }
        val root = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setBackgroundColor(0xFF07111B.toInt())
        }
        val title = TextView(this).apply {
            text = "AIG CNC • OFFICIAL RGB ORIGINAL • ${RuntimeDeviceProfile.verificationLabel} • PHYSICAL 120Hz / EMULATOR 60Hz CAP • 原點 0.000 • 精度 0.001 mm"
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
        addActionTo(categoryFlow, "AI VOICE", 0) { startVoiceAssistant() }
        addActionTo(categoryFlow, "AI SUITE", 2) { showAiSystemSuiteDialog() }
        addActionTo(categoryFlow, "ChatGPT AI 更新 • 一鍵", 1) { runSecureUpdateCheck() }
        addActionTo(categoryFlow, "↶", 3) { cad.undo() }
        addActionTo(categoryFlow, "↷", 5) { cad.redo() }
        fpsIndicator = TextView(this).apply {
            setTextColor(0xFF3DEBFF.toInt()); textSize = 11f; text = "FPS --"
            setPadding(dp(12), dp(2), dp(12), dp(2)); visibility = View.GONE
        }
        root.addView(fpsIndicator, LinearLayout.LayoutParams(-1, -2))
        temperatureIndicator = TextView(this).apply {
            setTextColor(0xFF3DEBFF.toInt()); textSize = 11f; text = "CPU N/A  |  GPU N/A"
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
        applyTemperatureDisplayPreference(envPrefs.getBoolean("temperature_display_enabled", RuntimeDeviceProfile.defaultTemperatureDisplayEnabled))
        applySystemHudPreference(envPrefs.getBoolean("system_hud_enabled", RuntimeDeviceProfile.defaultSystemHudEnabled))


        setContentView(root)
        restoreCadCheckpointIfAvailable()
        autosaveHandler.postDelayed(autosaveRunnable, 15000L)
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



    private fun saveCadCheckpoint() {
        runCatching {
            getSharedPreferences("aig_cad_autosave", MODE_PRIVATE)
                .edit()
                .putString("cad_state", cad.exportState())
                .putLong("saved_at", System.currentTimeMillis())
                .putInt("format_version", 2)
                .apply()
        }
    }

    private fun restoreCadCheckpointIfAvailable() {
        val prefs = getSharedPreferences("aig_cad_autosave", MODE_PRIVATE)
        val raw = prefs.getString("cad_state", null) ?: return
        if (raw.isBlank()) return
        val formatVersion = prefs.getInt("format_version", 1)
        if (formatVersion !in 1..2) return
        runCatching { cad.importState(raw) }
            .onSuccess {
                Toast.makeText(this, "AUTO RECOVERY • CAD restored", Toast.LENGTH_SHORT).show()
            }
    }

    private fun showAiSystemSuiteDialog() {
        val prefs = getSharedPreferences("aig_environment", MODE_PRIVATE)
        val box = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(dp(14), dp(10), dp(14), dp(8))
        }
        fun action(label: String, run: () -> Unit) {
            box.addView(Button(this).apply {
                text = label
                isAllCaps = false
                setOnClickListener { run() }
            })
        }
        box.addView(TextView(this).apply {
            setTextColor(0xFFE1EFFF.toInt())
            textSize = 13f
            text = "AIG CNC CURRENT UPGRADE • ${RuntimeDeviceProfile.verificationLabel}\nAI VOICE 2 • CAM 語音設定 • LIVE HISTORY • FPS/Frame Time • BAT/Thermal • RAM • 120Hz • 1080P/2K/3K/4K+ • RGB TACTILE • Renderer Governor • ChatGPT AI 更新"
            setPadding(dp(4),dp(4),dp(4),dp(10))
        })
        action("AI VOICE") { startVoiceAssistant() }
        action("系統監控 HUD") { applySystemHudPreference(true); showExpandedSystemHud() }
        action("環境 / FPS / 溫度設定") { showEnvironmentSettings() }
        action("ChatGPT AI 更新") { runSecureUpdateCheck() }
        AlertDialog.Builder(this)
            .setTitle("AIG CNC AI SYSTEM SUITE")
            .setView(box)
            .setPositiveButton("關閉", null)
            .show()
        prefs.edit().putBoolean("ai_system_suite_enabled", true).apply()
    }

    private fun initVoiceAssistant() {
        if (voiceTts != null) return
        voiceTts = TextToSpeech(this) { statusCode ->
            if (statusCode == TextToSpeech.SUCCESS) voiceTts?.language = Locale.TAIWAN
        }
    }

    private fun speakVoice(text: String) {
        initVoiceAssistant()
        voiceTts?.speak(text, TextToSpeech.QUEUE_FLUSH, null, "aig_voice")
        Toast.makeText(this, text, Toast.LENGTH_SHORT).show()
    }

    private fun ensureSpeechRecognizer(): Boolean {
        if (!SpeechRecognizer.isRecognitionAvailable(this)) return false
        if (speechRecognizer != null) return true
        speechRecognizer = SpeechRecognizer.createSpeechRecognizer(this).apply {
            setRecognitionListener(object : RecognitionListener {
                override fun onReadyForSpeech(params: Bundle?) {
                    voiceListening = true
                    Toast.makeText(this@MainActivity, "AI VOICE • 聆聽中", Toast.LENGTH_SHORT).show()
                }
                override fun onBeginningOfSpeech() {}
                override fun onRmsChanged(rmsdB: Float) {}
                override fun onBufferReceived(buffer: ByteArray?) {}
                override fun onEndOfSpeech() { voiceListening = false }
                override fun onError(error: Int) {
                    voiceListening = false
                    Toast.makeText(this@MainActivity, "AI VOICE • 辨識結束", Toast.LENGTH_SHORT).show()
                }
                override fun onResults(results: Bundle?) {
                    voiceListening = false
                    val heard = results?.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION)?.firstOrNull()
                    if (!heard.isNullOrBlank()) handleVoiceCommand(heard) else speakVoice("沒有聽清楚")
                }
                override fun onPartialResults(partialResults: Bundle?) {
                    val partial = partialResults?.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION)?.firstOrNull()
                    if (!partial.isNullOrBlank()) {
                        // Partial text is intentionally not spoken to avoid audio feedback.
                    }
                }
                override fun onEvent(eventType: Int, params: Bundle?) {}
            })
        }
        return true
    }

    private fun startVoiceAssistant() {
        initVoiceAssistant()
        if (checkSelfPermission(Manifest.permission.RECORD_AUDIO) != PackageManager.PERMISSION_GRANTED) {
            requestPermissions(arrayOf(Manifest.permission.RECORD_AUDIO), REQ_AI_VOICE_PERMISSION)
            return
        }
        if (!ensureSpeechRecognizer()) {
            speakVoice("此裝置沒有可用的語音辨識服務")
            return
        }
        if (voiceListening) {
            speechRecognizer?.stopListening()
            voiceListening = false
            Toast.makeText(this, "AI VOICE • 已停止", Toast.LENGTH_SHORT).show()
            return
        }
        val intent = Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH).apply {
            putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM)
            putExtra(RecognizerIntent.EXTRA_LANGUAGE, "zh-TW")
            putExtra(RecognizerIntent.EXTRA_LANGUAGE_PREFERENCE, "zh-TW")
            putExtra(RecognizerIntent.EXTRA_PARTIAL_RESULTS, true)
            putExtra(RecognizerIntent.EXTRA_MAX_RESULTS, 3)
        }
        speechRecognizer?.startListening(intent)
    }

    private fun confirmVoiceAction(description: String, action: () -> Unit) {
        AlertDialog.Builder(this)
            .setTitle("AI VOICE 安全確認")
            .setMessage("辨識到：$description\n\n這個動作會改變工作狀態，是否執行？")
            .setPositiveButton("執行") { _, _ -> action(); speakVoice("已執行 $description") }
            .setNegativeButton("取消") { _, _ -> speakVoice("已取消") }
            .show()
    }

    private fun currentBatteryTemperatureC(): Double? {
        val battery = registerReceiver(null, IntentFilter(Intent.ACTION_BATTERY_CHANGED))
        val raw = battery?.getIntExtra(BatteryManager.EXTRA_TEMPERATURE, Int.MIN_VALUE) ?: Int.MIN_VALUE
        return if (raw == Int.MIN_VALUE) null else raw / 10.0
    }

    private fun voiceNumber(text: String): Double? {
        val normalized = text
            .replace("負", "-")
            .replace("點", ".")
            .replace("毫米", "")
            .replace("mm", "", ignoreCase = true)
        return Regex("-?\\d+(?:\\.\\d+)?").find(normalized)?.value?.toDoubleOrNull()
    }

    private fun handleVoiceCommand(raw: String) {
        val cmd = raw.trim().lowercase(Locale.TAIWAN)
        when {
            cmd.contains("刀徑") || cmd.contains("tool diameter") -> {
                val value = voiceNumber(cmd)
                if (value == null || value <= 0.0) speakVoice("刀徑數值無效")
                else confirmVoiceAction("刀徑 " + DisplayFormat.mm(value) + " mm") {
                    camSettings = CamSettings(
                        toolDiameter = value,
                        depth = camSettings.depth,
                        safeZ = camSettings.safeZ,
                        feedMmMin = camSettings.feedMmMin,
                        climb = camSettings.climb
                    )
                }
            }
            cmd.contains("safe-z") || cmd.contains("safe z") || cmd.contains("安全高度") -> {
                val value = voiceNumber(cmd)
                if (value == null) speakVoice("Safe-Z 數值無效")
                else confirmVoiceAction("Safe-Z " + DisplayFormat.mm(value) + " mm") {
                    camSettings = CamSettings(
                        toolDiameter = camSettings.toolDiameter,
                        depth = camSettings.depth,
                        safeZ = value,
                        feedMmMin = camSettings.feedMmMin,
                        climb = camSettings.climb
                    )
                }
            }
            cmd.contains("深度") || cmd.contains("depth") -> {
                val value = voiceNumber(cmd)
                if (value == null) speakVoice("加工深度數值無效")
                else confirmVoiceAction("加工深度 " + DisplayFormat.mm(value) + " mm") {
                    camSettings = CamSettings(
                        toolDiameter = camSettings.toolDiameter,
                        depth = value,
                        safeZ = camSettings.safeZ,
                        feedMmMin = camSettings.feedMmMin,
                        climb = camSettings.climb
                    )
                }
            }
            cmd.contains("進給") || cmd.contains("feed") -> {
                val value = voiceNumber(cmd)
                if (value == null || value <= 0.0) speakVoice("Feed 數值無效")
                else confirmVoiceAction("Feed " + String.format("%.1f", value) + " mm/min") {
                    camSettings = CamSettings(
                        toolDiameter = camSettings.toolDiameter,
                        depth = camSettings.depth,
                        safeZ = camSettings.safeZ,
                        feedMmMin = value,
                        climb = camSettings.climb
                    )
                }
            }
            cmd.contains("fps") || cmd.contains("幀率") -> {
                updateSystemMonitorSnapshot()
                speakVoice("目前 FPS " + String.format("%.1f", monitorFps) + "，Frame Time " + String.format("%.1f", monitorFrameTimeMs) + " 毫秒")
            }
            cmd.contains("溫度") || cmd.contains("thermal") -> {
                val temps = CpuGpuTemperatureProbe.read()
                speakVoice(
                    "CPU 溫度 " + (temps.cpuC?.let { String.format("%.1f 度", it) } ?: "無法取得") +
                    "，GPU 溫度 " + (temps.gpuC?.let { String.format("%.1f 度", it) } ?: "無法取得")
                )
            }
            cmd.contains("記憶體") || cmd.contains("ram") -> {
                val appRam = android.os.Debug.getPss().toDouble() / 1024.0
                val am = getSystemService(Context.ACTIVITY_SERVICE) as ActivityManager
                val mi = ActivityManager.MemoryInfo()
                am.getMemoryInfo(mi)
                speakVoice("AIG CNC 使用記憶體 " + String.format("%.0f MB", appRam) + "，可用 " + String.format("%.0f MB", mi.availMem / 1048576.0))
            }
            cmd.contains("系統監控") || cmd.contains("hud") -> { showExpandedSystemHud(); speakVoice("已開啟系統監控") }
            cmd.contains("加工") || cmd.contains("cam") -> { openCategory("加工") { showMachiningBranch() }; speakVoice("切換加工") }
            cmd.contains("安全") -> { openCategory("安全") { showSecurityBranch() }; speakVoice("切換安全") }
            cmd.contains("ai") -> { openCategory("AI") { showAiBranch() }; speakVoice("切換 AI") }
            cmd.contains("角部") || cmd.contains("倒角") || cmd.contains("圓角") -> { openCategory("角部") { showCornerBranch() }; speakVoice("切換角部工具") }
            cmd.contains("修改") -> { openCategory("修改") { showModifyBranch() }; speakVoice("切換修改") }
            cmd.contains("繪圖") || cmd.contains("cad") -> { openCategory("繪圖") { showDrawingBranch() }; speakVoice("切換繪圖") }
            cmd.contains("畫線") || cmd == "line" -> confirmVoiceAction("切換 LINE 繪圖工具") { selectTool(Tool.LINE) }
            cmd.contains("畫圓") || cmd == "circle" -> confirmVoiceAction("切換 CIRCLE 繪圖工具") { selectTool(Tool.CIRCLE) }
            cmd.contains("矩形") || cmd == "rect" -> confirmVoiceAction("切換 RECT 繪圖工具") { selectTool(Tool.RECT) }
            else -> speakVoice("沒有辨識到可安全執行的 AIG CNC 指令")
        }
    }

    override fun onRequestPermissionsResult(requestCode: Int, permissions: Array<out String>, grantResults: IntArray) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults)
        if (requestCode == REQ_AI_VOICE_PERMISSION) {
            if (grantResults.firstOrNull() == PackageManager.PERMISSION_GRANTED) startVoiceAssistant()
            else speakVoice("麥克風權限未開啟")
        }
    }

    override fun onActivityResult(requestCode: Int, resultCode: Int, data: Intent?) {
        super.onActivityResult(requestCode, resultCode, data)
        if (requestCode == REQ_AI_VOICE) {
            if (resultCode == RESULT_OK) {
                val heard = data?.getStringArrayListExtra(RecognizerIntent.EXTRA_RESULTS)?.firstOrNull()
                if (!heard.isNullOrBlank()) handleVoiceCommand(heard) else speakVoice("沒有聽清楚")
            }
        }
    }

    override fun onPause() {
        saveCadCheckpoint()
        super.onPause()
    }

    override fun dispatchTouchEvent(event: MotionEvent): Boolean {
        adaptiveRefreshController?.markInteractive()
        return super.dispatchTouchEvent(event)
    }

    override fun onDestroy() {
        adaptiveRefreshController?.stop()
        adaptiveRefreshController = null
        autosaveHandler.removeCallbacks(autosaveRunnable)
        speechRecognizer?.cancel()
        speechRecognizer?.destroy()
        speechRecognizer = null
        voiceTts?.stop()
        voiceTts?.shutdown()
        systemMonitorHandler.removeCallbacks(systemMonitorRunnable)
        temperatureHandler.removeCallbacks(temperatureRunnable)
        super.onDestroy()
    }

    private fun showDrawingBranch() {
        branchFlow.removeAllViews(); toolButtons.clear()
        addToolToBranch("線", Tool.LINE, 0)
        addToolToBranch("矩形", Tool.RECT, 1)
        addToolToBranch("圓", Tool.CIRCLE, 2)
        addActionTo(branchFlow, "SNAP", 3) { cad.toggleSnap() }
        addToolToBranch("尺寸", Tool.MEASURE, 5)
    }
    private fun showModifyBranch() {
        branchFlow.removeAllViews(); toolButtons.clear()
        addToolToBranch("刪除", Tool.DELETE, 4)
        addToolToBranch("移動", Tool.PAN, 0)
        addActionTo(branchFlow, "GRID", 2) { cad.toggleGrid() }
        addActionTo(branchFlow, "GEOMETRY", 1) { cad.toggleGeometry() }
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
        addActionTo(branchFlow, "STOCK", 4) { showStockDialog() }
        addActionTo(branchFlow, "NC EDIT", 0) { showNcEditDialog() }
        addActionTo(branchFlow, "G54–G59", 3) { showWorkOffsetDialog() }
        addActionTo(branchFlow, "G81/G73/G83/G84", 2) { showDrillCycleDialog() }
        addActionTo(branchFlow, "5X A/B", 1) { show5xDialog() }
        addActionTo(branchFlow, "3D 加工", 4) { showMachining3D() }
    }

    private fun showStockDialog() {
        val box = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(dp(14), dp(8), dp(14), dp(4))
        }
        fun numeric(label: String, value: Double): EditText = EditText(this).apply {
            hint = label
            setText(DisplayFormat.mm(value))
            inputType = InputType.TYPE_CLASS_NUMBER or InputType.TYPE_NUMBER_FLAG_DECIMAL
            box.addView(this)
        }
        val margin = numeric("工件外框 Margin mm", stockMarginMm)
        val thickness = numeric("工件厚度 mm", stockThicknessMm)
        AlertDialog.Builder(this)
            .setTitle("STOCK / 工件")
            .setView(box)
            .setPositiveButton("套用") { _, _ ->
                runCatching {
                    val m = margin.text.toString().toDouble()
                    val t = thickness.text.toString().toDouble()
                    require(m >= 0.0 && t > 0.0)
                    stockMarginMm = m
                    stockThicknessMm = t
                }.onSuccess {
                    Toast.makeText(this, "STOCK 已套用 • margin=" + DisplayFormat.mm(stockMarginMm) + " • T=" + DisplayFormat.mm(stockThicknessMm), Toast.LENGTH_SHORT).show()
                }.onFailure {
                    Toast.makeText(this, "STOCK 設定無效", Toast.LENGTH_LONG).show()
                }
            }
            .setNegativeButton("取消", null)
            .show()
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
        val leadIn = numeric("Lead-in mm", camSettings.leadInMm)
        val leadOut = numeric("Lead-out mm", camSettings.leadOutMm)

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
                        climb = camSettings.climb,
                        leadInMm = leadIn.text.toString().toDouble(),
                        leadOutMm = leadOut.text.toString().toDouble()
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


    private fun showWorkOffsetDialog() {
        val offsets = arrayOf("G54","G55","G56","G57","G58","G59")
        AlertDialog.Builder(this)
            .setTitle("工件座標 • " + workOffset)
            .setSingleChoiceItems(offsets, offsets.indexOf(workOffset).coerceAtLeast(0)) { dialog, which ->
                workOffset = offsets[which]
                Toast.makeText(this, "WORK OFFSET " + workOffset, Toast.LENGTH_SHORT).show()
                dialog.dismiss()
            }
            .setNegativeButton("取消", null)
            .show()
    }

    private fun showDrillCycleDialog() {
        val box = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(dp(12),dp(8),dp(12),dp(8))
        }
        val cycleSpinner = Spinner(this).apply {
            adapter = ArrayAdapter(this@MainActivity, android.R.layout.simple_spinner_dropdown_item, DrillCycle.entries.map { it.code })
            box.addView(this)
        }
        fun num(label: String, value: Double, signed: Boolean = false): EditText = EditText(this).apply {
            hint = label
            setText(DisplayFormat.mm(value))
            inputType = InputType.TYPE_CLASS_NUMBER or InputType.TYPE_NUMBER_FLAG_DECIMAL or
                (if (signed) InputType.TYPE_NUMBER_FLAG_SIGNED else 0)
            box.addView(this)
        }
        val x = num("X mm", 0.0, true)
        val y = num("Y mm", 0.0, true)
        val z = num("Z depth mm", camSettings.depth, true)
        val r = num("R retract mm", 2.0)
        val q = num("Q peck mm (G73/G83)", 5.0)
        val feed = num("Feed mm/min", camSettings.feedMmMin)
        val tapPitch = num("Tap pitch mm/rev (G84)", 1.0)
        val tapRpm = num("Tap spindle RPM (G84)", 500.0)
        val useM29 = CheckBox(this).apply { text = "G84 使用 Fanuc M29 rigid tapping"; isChecked = false; box.addView(this) }

        AlertDialog.Builder(this)
            .setTitle("Fanuc 鑽孔循環")
            .setView(box)
            .setPositiveButton("套用到 NC") { _, _ ->
                runCatching {
                    val cycle = DrillCycle.entries[cycleSpinner.selectedItemPosition]
                    val hole = DrillHole(
                        x = x.text.toString().toDouble(),
                        y = y.text.toString().toDouble(),
                        z = z.text.toString().toDouble(),
                        r = r.text.toString().toDouble(),
                        k = if (cycle == DrillCycle.G73 || cycle == DrillCycle.G83) q.text.toString().toDouble() else null,
                        feed = feed.text.toString().toDouble(),
                        tapPitchMm = if (cycle == DrillCycle.G84) tapPitch.text.toString().toDouble() else null,
                        tapSpindleRpm = if (cycle == DrillCycle.G84) tapRpm.text.toString().toInt() else null,
                        rigidTapM29 = cycle == DrillCycle.G84 && useM29.isChecked
                    )
                    FanucNc.cannedCycle(cycle, listOf(hole), camSettings.safeZ, hole.r)
                }.onSuccess {
                    drillCycleBlock = it
                    Toast.makeText(this, "DRILL CYCLE READY", Toast.LENGTH_SHORT).show()
                }.onFailure {
                    Toast.makeText(this, "DRILL CYCLE 無效: " + it.message, Toast.LENGTH_LONG).show()
                }
            }
            .setNegativeButton("取消", null)
            .show()
    }

    private fun show5xDialog() {
        val box = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(dp(12), dp(8), dp(12), dp(8))
        }
        fun axisEditor(label: String, value: Double): EditText = EditText(this).apply {
            hint = label
            setText(DisplayFormat.mm(value))
            inputType = InputType.TYPE_CLASS_NUMBER or InputType.TYPE_NUMBER_FLAG_DECIMAL or InputType.TYPE_NUMBER_FLAG_SIGNED
            box.addView(this)
        }
        val aInput = axisEditor("A axis °", axisA)
        val bInput = axisEditor("B axis °", axisB)
        val previewText = TextView(this).apply {
            setTextColor(Color.rgb(61,235,255))
            textSize = 12f
            setPadding(dp(4),dp(6),dp(4),dp(4))
        }
        fun refresh5xText(a: Double, b: Double) {
            previewText.text = "5X • A " + DisplayFormat.mm(a) + "° • B " + DisplayFormat.mm(b) + "°"
            aInput.setText(DisplayFormat.mm(a))
            bInput.setText(DisplayFormat.mm(b))
        }
        val preview = Axis5xPreview(this, axisA, axisB) { a, b -> refresh5xText(a, b) }
        box.addView(preview, LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, dp(260)))
        box.addView(previewText)
        val presets = LinearLayout(this).apply { orientation = LinearLayout.HORIZONTAL }
        fun preset(label: String, a: Double, b: Double) {
            presets.addView(RgbGlowButton(this).apply {
                text = label
                setRgbState(Color.rgb(61,235,255), false)
                setOnClickListener { refresh5xText(a,b) }
            }, LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1f))
        }
        preset("ZERO",0.0,0.0)
        preset("A90",90.0,0.0)
        preset("B60",0.0,60.0)
        preset("B90",0.0,90.0)
        box.addView(presets)
        refresh5xText(axisA, axisB)
        AlertDialog.Builder(this)
            .setTitle("AIG CNC 5X • A/B")
            .setView(box)
            .setPositiveButton("套用") { _, _ ->
                val a = aInput.text.toString().toDoubleOrNull()
                val b = bInput.text.toString().toDoubleOrNull()
                if (a == null || b == null || a !in -360.0..360.0 || b !in -360.0..360.0) {
                    Toast.makeText(this, "A/B 軸角度無效", Toast.LENGTH_LONG).show()
                } else {
                    axisA = a
                    axisB = b
                    val ncPreview = "G0 A" + FanucNc.fmt(axisA) + " B" + FanucNc.fmt(axisB)
                    Toast.makeText(this, "5X " + ncPreview, Toast.LENGTH_SHORT).show()
                }
            }
            .setNegativeButton("取消", null)
            .show()
    }

    private fun showNcEditDialog() {
        val snapshot = cad.snapshot()
        if (snapshot.entities.isEmpty()) {
            Toast.makeText(this, "NC EDIT：請先建立 2D 幾何", Toast.LENGTH_LONG).show()
            return
        }
        val cam = runCatching { CamModel.fromCad(System.currentTimeMillis(), snapshot, camSettings) }
            .getOrElse {
                Toast.makeText(this, "CAM 產生失敗: " + it.message, Toast.LENGTH_LONG).show()
                return
            }
        val stock = Stock3D.fromSnapshot(snapshot, stockMarginMm, stockThicknessMm)
        val risk = MachiningRiskScanner.inspect(cam, stock)
        val editor = EditText(this).apply {
            val baseNc = FanucNc.generate(cam, FanucPostSettings(workOffset = workOffset, axisA = axisA, axisB = axisB))
            setText(if (drillCycleBlock.isBlank()) baseNc else FanucNc.insertBeforeProgramEnd(baseNc, drillCycleBlock))
            setTextColor(Color.rgb(225,240,255))
            setBackgroundColor(Color.rgb(5,12,20))
            textSize = 13f
            gravity = Gravity.TOP or Gravity.START
            minLines = 18
            inputType = InputType.TYPE_CLASS_TEXT or InputType.TYPE_TEXT_FLAG_MULTI_LINE or InputType.TYPE_TEXT_FLAG_NO_SUGGESTIONS
            showSoftInputOnFocus = false
            isVerticalScrollBarEnabled = true
            isHorizontalScrollBarEnabled = true
            setHorizontallyScrolling(true)
            setPadding(dp(12),dp(10),dp(12),dp(10))
        }
        val box = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(dp(10),dp(8),dp(10),dp(6))
        }
        val mode = TextView(this).apply {
            setTextColor(Color.rgb(99,255,157))
            textSize = 12f
        }
        fun refreshMode() {
            mode.text = "NC EDIT • SINGLE BLOCK=" + if (ncSingleBlock) "ON" else "OFF" +
                " • DRY RUN=" + if (ncDryRun) "ON" else "OFF" +
                " • BLOCK SKIP=" + if (ncBlockSkip) "ON" else "OFF" +
                " • COLLISION=" + risk.collisionCount +
                " • OVERCUT=" + risk.overcutCount
        }
        refreshMode()
        box.addView(mode)
        val previewStatus = TextView(this).apply {
            setTextColor(Color.rgb(61,235,255))
            textSize = 11f
            text = "NC PREVIEW • READY"
            setPadding(dp(2),dp(4),dp(2),dp(4))
        }
        var previewLine = 0
        fun stepPreview(reset: Boolean = false) {
            val lines = editor.text.toString().split("\n")
            if (reset) previewLine = 0
            if (lines.isEmpty()) {
                previewStatus.text = "NC PREVIEW • EMPTY"
                return
            }
            while (previewLine < lines.size) {
                val trimmed = lines[previewLine].trim()
                val nonExecutable = trimmed.isBlank() || trimmed == "%" || trimmed.startsWith("(")
                val skippedBlock = ncBlockSkip && trimmed.startsWith("/")
                if (!nonExecutable && !skippedBlock) break
                previewLine++
            }
            if (previewLine >= lines.size) {
                previewStatus.text = "NC PREVIEW • END"
                return
            }
            val start = lines.take(previewLine).sumOf { it.length + 1 }
            val end = (start + lines[previewLine].length).coerceAtMost(editor.length())
            editor.requestFocus()
            editor.setSelection(start.coerceAtMost(editor.length()), end)
            editor.post { editor.bringPointIntoView(start.coerceAtMost(editor.length())) }
            previewStatus.text = (if (ncDryRun) "DRY RUN" else "NC PREVIEW") +
                " • BLOCK " + (previewLine + 1) + " • " + lines[previewLine].trim()
            previewLine++
        }
        box.addView(previewStatus)
        val controls = LinearLayout(this).apply { orientation = LinearLayout.HORIZONTAL }
        fun toggle(label: String, action: () -> Unit) {
            controls.addView(RgbGlowButton(this).apply {
                text = label
                setRgbState(Color.rgb(61,235,255), false)
                setOnClickListener { action(); refreshMode() }
            }, LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1f))
        }
        toggle("SINGLE") { ncSingleBlock = !ncSingleBlock; if (ncSingleBlock) stepPreview(reset = true) }
        toggle("DRY RUN") { ncDryRun = !ncDryRun; previewStatus.text = if (ncDryRun) "DRY RUN • READY" else "NC PREVIEW • READY" }
        toggle("STEP") { stepPreview() }
        toggle("RESET") { previewLine = 0; previewStatus.text = "NC PREVIEW • READY" }
        toggle("BLOCK /") {
            ncBlockSkip = !ncBlockSkip
            val lines = editor.text.toString().lineSequence().toList()
            editor.setText(
                lines.joinToString("\n") { line ->
                    if (ncBlockSkip && line.startsWith("M98 P")) "/" + line
                    else if (!ncBlockSkip && line.startsWith("/M98 P")) line.removePrefix("/")
                    else line
                }
            )
        }
        box.addView(controls)

        fun insertNcToken(token: String) {
            val start = editor.selectionStart.coerceAtLeast(0)
            val end = editor.selectionEnd.coerceAtLeast(start)
            editor.text.replace(start, end, token)
            editor.requestFocus()
        }
        fun deleteNcToken() {
            val start = editor.selectionStart.coerceAtLeast(0)
            val end = editor.selectionEnd.coerceAtLeast(start)
            if (end > start) editor.text.delete(start, end)
            else if (start > 0) editor.text.delete(start - 1, start)
            editor.requestFocus()
        }
        fun jumpNc(position: Int) {
            val p = position.coerceIn(0, editor.length())
            editor.requestFocus()
            editor.setSelection(p)
            editor.post { editor.bringPointIntoView(p) }
        }

        val keyboard = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(dp(4),dp(4),dp(4),dp(4))
        }
        val rows = listOf(
            listOf("G","M","X","Y","Z"),
            listOf("F","S","T","A","B"),
            listOf("7","8","9","-","."),
            listOf("4","5","6","0","/"),
            listOf("1","2","3","INSERT","DELETE"),
            listOf("TOP","BOTTOM","BLOCK SKIP")
        )
        rows.forEach { keys ->
            val row = LinearLayout(this).apply { orientation = LinearLayout.HORIZONTAL }
            keys.forEach { key ->
                row.addView(RgbGlowButton(this).apply {
                    text = key
                    setRgbState(Color.rgb(61,235,255), false)
                    setOnClickListener {
                        when (key) {
                            "DELETE" -> deleteNcToken()
                            "INSERT" -> insertNcToken("\n")
                            "TOP" -> jumpNc(0)
                            "BOTTOM" -> jumpNc(editor.length())
                            "BLOCK SKIP" -> insertNcToken("/")
                            else -> insertNcToken(key)
                        }
                    }
                }, LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1f))
            }
            keyboard.addView(row)
        }

        val landscape = resources.configuration.orientation == Configuration.ORIENTATION_LANDSCAPE
        val content = LinearLayout(this).apply {
            orientation = if (landscape) LinearLayout.HORIZONTAL else LinearLayout.VERTICAL
        }
        if (landscape) {
            content.addView(editor, LinearLayout.LayoutParams(0, dp(460), 0.62f))
            content.addView(keyboard, LinearLayout.LayoutParams(0, dp(460), 0.38f))
        } else {
            content.addView(editor, LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, dp(320)))
            content.addView(keyboard, LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT))
        }
        box.addView(content)

        AlertDialog.Builder(this)
            .setTitle("AIG CNC NC EDIT • FANUC")
            .setView(box)
            .setPositiveButton("完成", null)
            .setNegativeButton("取消", null)
            .show()
    }

    private fun showMachining3D() {
        val snapshot = cad.snapshot()
        if (snapshot.entities.isEmpty()) {
            Toast.makeText(this, "3D 加工 BLOCKED：請先建立真 2D 幾何", Toast.LENGTH_LONG).show()
            return
        }

        runCatching { Machining3DEngine.build(snapshot, camSettings, Stock3D.fromSnapshot(snapshot, stockMarginMm, stockThicknessMm)) }
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
        } else if (!enabled && systemMonitorRunning) {
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
        if (!monitorHistoryPaused) {
            monitorHistory += MonitorSample(
                fps = monitorFps,
                frameTimeMs = monitorFrameTimeMs,
                temperatureC = if (tempC.isNaN()) null else tempC,
                ramMb = appRamMb
            )
            while (monitorHistory.size > monitorHistoryLimit) monitorHistory.removeAt(0)
        }
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
            " | State " + perfState
        if (::systemHudIndicator.isInitialized) {
            systemHudIndicator.text = monitorSnapshot.substringBefore("\n")
            systemHudIndicator.setTextColor(when(perfState) {
                "RED" -> Color.rgb(255,82,82)
                "YELLOW" -> Color.rgb(255,193,7)
                else -> Color.rgb(99,255,157)
            })
        }
        if (systemHudExpanded) systemHudExpanded = false
    }

    private fun showExpandedSystemHud() {
        systemHudExpanded = true
        val box = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(dp(12), dp(8), dp(12), dp(8))
        }
        val stats = TextView(this).apply {
            setTextColor(0xFFE1EFFF.toInt())
            textSize = 12f
        }
        val chart = MonitorHistoryView(this)
        box.addView(stats)
        box.addView(
            chart,
            LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, dp(260))
        )

        val controls = LinearLayout(this).apply {
            orientation = LinearLayout.HORIZONTAL
        }
        fun control(label: String, action: () -> Unit) {
            controls.addView(Button(this).apply {
                text = label
                isAllCaps = false
                setOnClickListener { action() }
            }, LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1f))
        }

        fun setWindow(seconds: Int) {
            monitorHistoryLimit = seconds.coerceIn(180, 1800)
            while (monitorHistory.size > monitorHistoryLimit) monitorHistory.removeAt(0)
            Toast.makeText(this, "歷史範圍 " + (monitorHistoryLimit / 60) + " 分鐘", Toast.LENGTH_SHORT).show()
        }

        control("3m") { setWindow(180) }
        control("10m") { setWindow(600) }
        control("30m") { setWindow(1800) }
        control("暫停/繼續") {
            monitorHistoryPaused = !monitorHistoryPaused
            Toast.makeText(this, if (monitorHistoryPaused) "監控歷史已暫停" else "監控歷史已繼續", Toast.LENGTH_SHORT).show()
        }
        control("清除") {
            monitorHistory.clear()
            monitorDroppedFrames = 0L
            monitorMinFps = Double.POSITIVE_INFINITY
            monitorFpsSum = 0.0
            monitorFpsSamples = 0L
            monitorMaxTempC = Double.NEGATIVE_INFINITY
            monitorMaxRamMb = 0.0
            Toast.makeText(this, "監控歷史已清除", Toast.LENGTH_SHORT).show()
        }
        box.addView(controls)

        fun range(values: List<Double>, suffix: String): String {
            if (values.isEmpty()) return "--"
            return "MIN " + String.format("%.1f", values.minOrNull()) +
                " / AVG " + String.format("%.1f", values.average()) +
                " / MAX " + String.format("%.1f", values.maxOrNull()) + suffix
        }

        val refreshHandler = Handler(Looper.getMainLooper())
        lateinit var refresh: Runnable
        refresh = object : Runnable {
            override fun run() {
                val visible = monitorHistory.takeLast(monitorHistoryLimit)
                chart.samples = visible.toList()
                val fps = visible.map { it.fps }
                val frame = visible.map { it.frameTimeMs }
                val temp = visible.mapNotNull { it.temperatureC }
                val ram = visible.map { it.ramMb }
                stats.text = buildString {
                    appendLine(monitorSnapshot)
                    appendLine("範圍 " + (monitorHistoryLimit / 60) + " 分鐘 • " +
                        (if (monitorHistoryPaused) "PAUSED" else "LIVE") + " • samples=" + visible.size)
                    appendLine("FPS        " + range(fps, ""))
                    appendLine("Frame Time " + range(frame, " ms"))
                    appendLine("BAT        " + range(temp, " °C"))
                    appendLine("RAM        " + range(ram, " MB"))
                    append("Dropped Frames: " + monitorDroppedFrames +
                        " • UI/VISUAL ONLY • CNC 0.001 mm unchanged")
                }
                refreshHandler.postDelayed(this, 1000L)
            }
        }

        val dialog = AlertDialog.Builder(this)
            .setTitle("系統監控歷史曲線")
            .setView(box)
            .setPositiveButton("關閉", null)
            .create()
        dialog.setOnDismissListener {
            refreshHandler.removeCallbacks(refresh)
            systemHudExpanded = false
        }
        dialog.show()
        refreshHandler.post(refresh)
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

        val powerValues = arrayOf("Auto", "Performance", "Balanced", "Eco")
        val power = Spinner(this).apply {
            adapter = ArrayAdapter(this@MainActivity, android.R.layout.simple_spinner_dropdown_item, powerValues)
            val current = prefs.getString("power_mode", "Auto") ?: "Auto"
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
            isChecked = prefs.getBoolean("system_hud_enabled", false)
            box.addView(this)
        }

        val fpsDisplay = CheckBox(this).apply {
            text = "FPS 顯示：開啟即時實測 FPS"
            isChecked = prefs.getBoolean("fps_display_enabled", false)
            box.addView(this)
        }

        val temperatureDisplay = CheckBox(this).apply {
            text = "溫度顯示：CPU °C / GPU °C"
            isChecked = prefs.getBoolean("temperature_display_enabled", RuntimeDeviceProfile.defaultTemperatureDisplayEnabled)
            box.addView(this)
        }

        val overheatWarning = CheckBox(this).apply {
            text = "過熱提醒：CPU/GPU 75°C 警告 / 85°C 高溫"
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
                    .putInt("temperature_warn_c", 75)
                    .putInt("temperature_high_c", 85)
                    .putBoolean("hud_enabled", hud.isChecked)
                    .putBoolean("thermal_auto", autoThermal.isChecked)
                    .putBoolean("idle_throttle", idleThrottle.isChecked)
                    .apply()

                applySystemHudPreference(systemHud.isChecked)
                applyFpsDisplayPreference(fpsDisplay.isChecked)
                applyTemperatureDisplayPreference(temperatureDisplay.isChecked)
                adaptiveRefreshController?.applyFromPreferences()
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
        Tool.CIRCLE, Tool.CHAMFER -> colors[2]; Tool.DELETE -> colors[4]; Tool.MEASURE -> colors[5]
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
    private fun toolButton(label: String, color: Int) = RgbGlowButton(this).apply {
        text = label; textSize = StudioDisplayPolicy.sp(this, 13f)
        minWidth = StudioDisplayPolicy.dp(this, 72f); minHeight = StudioDisplayPolicy.dp(this, 52f)
        setPadding(StudioDisplayPolicy.dp(this, 10f), 0, StudioDisplayPolicy.dp(this, 10f), 0)
        setRgbState(color, false)
    }
    private fun styleButton(button: Button, color: Int, selected: Boolean) {
        if (button is RgbGlowButton) {
            button.setRgbState(color, selected)
        } else {
            button.background = GradientDrawable().apply {
                cornerRadius = dp(15).toFloat()
                setColor(if (selected) Color.argb(225, 23, 58, 80) else Color.argb(155, 10, 24, 38))
                setStroke(dp(if (selected) 3 else 2), color)
            }
            button.alpha = if (selected) 1f else 0.82f
            button.elevation = dp(if (selected) 8 else 3).toFloat()
        }
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
    private val gap = StudioDisplayPolicy.dp(this, 6f)
    init {
        background = GradientDrawable().apply {
            cornerRadius = StudioDisplayPolicy.dp(this@FlowLayout, 16f).toFloat()
            setColor(Color.argb(112, 8, 24, 38))
            setStroke(max(1, StudioDisplayPolicy.dp(this@FlowLayout, 1.1f)), Color.argb(150, 61, 235, 255))
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
    private var snapEnabled = true
    private var gridVisible = true
    private var geometryVisible = true

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
        isClickable = true
        geoPaint.strokeJoin = Paint.Join.ROUND
        geoPaint.strokeCap = Paint.Cap.ROUND
        geoPaint.isDither = true
        accentPaint.strokeJoin = Paint.Join.ROUND
        accentPaint.strokeCap = Paint.Cap.ROUND
        accentPaint.isDither = true
    }

    fun snapshot(): DrawingSnapshot = doc.snapshot()
    fun exportState(): String = buildString {
        doc.all().forEach { e ->
            when (e) {
                is Line -> append("L|").append(e.id).append('|').append(e.a.x).append('|').append(e.a.y).append('|').append(e.b.x).append('|').append(e.b.y).append('\n')
                is Circle -> append("C|").append(e.id).append('|').append(e.center.x).append('|').append(e.center.y).append('|').append(e.radius).append('\n')
                is Arc -> append("A|").append(e.id).append('|').append(e.center.x).append('|').append(e.center.y).append('|').append(e.radius).append('|').append(e.start.x).append('|').append(e.start.y).append('|').append(e.end.x).append('|').append(e.end.y).append('|').append(e.clockwise).append('\n')
            }
        }
    }
    fun importState(raw: String) {
        val restored = mutableListOf<Entity>()
        raw.lineSequence().filter { it.isNotBlank() }.forEach { line ->
            val p = line.split('|')
            when (p.firstOrNull()) {
                "L" -> if (p.size == 6) restored += Line(p[1], Vec2(p[2].toDouble(), p[3].toDouble()), Vec2(p[4].toDouble(), p[5].toDouble()))
                "C" -> if (p.size == 5) restored += Circle(p[1], Vec2(p[2].toDouble(), p[3].toDouble()), p[4].toDouble())
                "A" -> if (p.size == 10) restored += Arc(
                    p[1], Vec2(p[2].toDouble(), p[3].toDouble()), p[4].toDouble(),
                    Vec2(p[5].toDouble(), p[6].toDouble()), Vec2(p[7].toDouble(), p[8].toDouble()), p[9].toBooleanStrictOrNull() ?: false
                )
            }
        }
        if (restored.isNotEmpty()) {
            doc.clear()
            restored.forEach(doc::put)
            firstPoint = null
            selectedLines.clear()
            invalidate()
        }
    }
    fun setTool(t: Tool) { tool = t; firstPoint = null; selectedLines.clear(); invalidate() }
    fun undo() { history.undo(); firstPoint = null; selectedLines.clear(); invalidate() }
    fun redo() { history.redo(); firstPoint = null; selectedLines.clear(); invalidate() }
    fun toggleSnap() { snapEnabled = !snapEnabled; Toast.makeText(context, "SNAP " + if (snapEnabled) "ON" else "OFF", Toast.LENGTH_SHORT).show(); invalidate() }
    fun toggleGrid() { gridVisible = !gridVisible; invalidate() }
    fun toggleGeometry() { geometryVisible = !geometryVisible; invalidate() }
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
        if (gridVisible) drawGrid(canvas)
        if (geometryVisible) drawEntities(canvas)
        firstPoint?.let { val p = transform.worldToScreen(it); canvas.drawCircle(p.x.toFloat(), p.y.toFloat(), 8f, accentPaint) }
        canvas.drawText("精度 0.001 mm • 顯示 0.000 • ${StudioDisplayPolicy.profile(this).tier} • ${tool.name}   X ${DisplayFormat.mm(lastWorld.x)}  Y ${DisplayFormat.mm(lastWorld.y)}   C${DisplayFormat.mm(chamferValue)} R${DisplayFormat.mm(filletValue)}", 16f, 26f, textPaint)
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
        val rawWorld = transform.screenToWorld(Vec2(event.x.toDouble(), event.y.toDouble()))
        lastWorld = if (snapEnabled) snapPoint(rawWorld) else rawWorld
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
            Tool.MEASURE -> showMeasurement(p)
            Tool.PAN -> Unit
        }
    }

    private fun twoPoint(p: Vec2, done: (Vec2,Vec2)->Unit) {
        val a = firstPoint
        if (a == null) firstPoint = p else { done(a,p); firstPoint = null }
    }

    private fun snapPoint(p: Vec2): Vec2 {
        val tolerance = 18.0 / transform.pixelsPerUnit
        val candidates = mutableListOf<Vec2>()
        val entities = doc.all()
        entities.forEach { e ->
            when (e) {
                is Line -> {
                    candidates += e.a
                    candidates += e.b
                    candidates += Vec2((e.a.x + e.b.x) / 2.0, (e.a.y + e.b.y) / 2.0)
                }
                is Circle -> {
                    candidates += e.center
                    val dx = p.x - e.center.x
                    val dy = p.y - e.center.y
                    val d2 = dx * dx + dy * dy
                    val r2 = e.radius * e.radius
                    if (d2 > r2 + EPS) {
                        val l = r2 / d2
                        val m = e.radius * sqrt(d2 - r2) / d2
                        candidates += Vec2(
                            e.center.x + l * dx - m * dy,
                            e.center.y + l * dy + m * dx
                        )
                        candidates += Vec2(
                            e.center.x + l * dx + m * dy,
                            e.center.y + l * dy - m * dx
                        )
                    }
                }
                is Arc -> {
                    candidates += e.center
                    candidates += e.start
                    candidates += e.end
                }
            }
        }
        val lines = entities.filterIsInstance<Line>()
        for (i in 0 until lines.size) {
            for (j in i + 1 until lines.size) {
                Geometry.lineIntersection(lines[i], lines[j])?.let { inter ->
                    if (inter.t1 >= -EPS && inter.t1 <= 1.0 + EPS &&
                        inter.t2 >= -EPS && inter.t2 <= 1.0 + EPS) {
                        candidates += inter.point
                    }
                }
            }
        }
        return candidates.minByOrNull { it.distanceTo(p) }?.takeIf { it.distanceTo(p) <= tolerance } ?: p
    }

    private fun showMeasurement(p: Vec2) {
        val e = nearest(p) ?: run {
            Toast.makeText(context, "尺寸：未選到幾何", Toast.LENGTH_SHORT).show()
            return
        }
        val text = when (e) {
            is Line -> "LINE 長度 = " + DisplayFormat.mm(e.a.distanceTo(e.b)) + " mm"
            is Circle -> "CIRCLE Ø = " + DisplayFormat.mm(e.radius * 2.0) + " mm\nR = " + DisplayFormat.mm(e.radius) + " mm"
            is Arc -> "ARC R = " + DisplayFormat.mm(e.radius) + " mm"
        }
        AlertDialog.Builder(context)
            .setTitle("尺寸 • 0.001 mm")
            .setMessage(text)
            .setPositiveButton("確定", null)
            .show()
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
