package com.aigstudio.app

import java.io.File

import android.app.Activity
import android.app.AlertDialog
import android.os.SystemClock
import android.speech.RecognizerIntent
import android.speech.RecognitionListener
import android.speech.SpeechRecognizer
import android.speech.tts.TextToSpeech
import java.util.Locale
import java.security.MessageDigest
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
import android.graphics.drawable.Drawable
import android.graphics.drawable.GradientDrawable
import android.graphics.drawable.LayerDrawable
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
import android.widget.FrameLayout
import android.widget.HorizontalScrollView
import android.widget.LinearLayout
import android.widget.TextView
import android.widget.Toast
import com.aigstudio.core.*
import kotlin.math.*

object StudioProductionTheme {
    val ID:String get()=StudioThemePackRuntime.current.id
    val background:Int get()=StudioThemePackRuntime.current.background
    val panel:Int get()=StudioThemePackRuntime.current.panel
    val text:Int get()=StudioThemePackRuntime.current.text
    val accent:Int get()=StudioThemePackRuntime.current.accent
    val selected:Int get()=StudioThemePackRuntime.current.selected
    val cutting:Int get()=StudioThemePackRuntime.current.cutting
    val rapid:Int get()=StudioThemePackRuntime.current.rapid
    val warning:Int get()=StudioThemePackRuntime.current.warning
    val alarm:Int get()=StudioThemePackRuntime.current.alarm
}

object LibraryFiveAxisSkin208 {
    const val ID="library_5x_real_cam_208"
    const val SOURCE_KIND="CHATGPT_ANDROID_LIBRARY_REFERENCE"
    const val SOURCE_MOBILE="image-gen-1(1).png"
    const val SOURCE_LANDSCAPE="image-gen-2(1).png"
    val background=Color.rgb(3,8,16)
    val panel=Color.rgb(10,24,38)
    val text=Color.rgb(225,240,255)
    val cyan=Color.rgb(61,235,255)
    val violet=Color.rgb(139,92,246)
    val magenta=Color.rgb(236,72,153)
    val safe=Color.rgb(99,255,157)
    val warning=Color.rgb(245,158,11)
}

object ProductionRgbAssets {
    private val ROOT=UiAssetContract.ANDROID_ROOT
    @Volatile private var expectedHashes:Map<String,String>?=null
    private val cache=mutableMapOf<String,ByteArray>()

    private fun assetId(name:String):String? {
        val n=name.trim().uppercase(Locale.US).replace(Regex("\\s+")," ")
        return when {
            n=="LINE" || name=="線" -> "line"
            n=="RECT" || n.contains("RECT") || name=="矩形" -> "rect"
            n=="CIRCLE" || name=="圓" -> "circle"
            n=="ARC" || name=="圓弧" -> "arc"
            n=="HOLE" || name=="孔" -> "hole"
            n=="SELECT" || name=="選取" -> "select"
            n=="HOME" || n=="RGB WALLPAPER" || name=="首頁" -> "rgb_wallpaper"
            n.contains("MAINT") || name=="工作/維修" || name=="維修" -> "tool_group"
            n.contains("2D CAD") || n=="CAD" -> "cad"
            n=="CAM" || n.contains("CAM ") -> "cam"
            n=="SIM" || n.contains("3D SIM") -> "sim"
            n=="3D" -> "3d"
            n.contains("3AX") || n.contains("3 AXIS") -> "3ax"
            n.contains("4AX") || n.contains("4 AXIS") -> "4ax"
            n.contains("5AX") || n.contains("5 AXIS") || n=="5X" -> "5ax"
            n.contains("6AX") || n.contains("6 AXIS") || n=="6X" -> "5ax"
            n=="NC" || n.contains("NC_EDIT") || n.contains("NC EDIT") -> "nc"
            n=="AI" || n.contains("AI ") -> "ai"
            n.contains("SAVE") || name=="儲存" -> "save"
            n.contains("RECOVER") || name=="復原" -> "recover"
            n.contains("VERIFY") || name=="驗證" -> "verify"
            else -> null
        }
    }

    @Synchronized
    private fun hashes(context:Context):Map<String,String> {
        expectedHashes?.let{return it}
        val map=context.assets.open("$ROOT/sha256.properties").bufferedReader(Charsets.US_ASCII).useLines { lines ->
            lines.mapNotNull { raw ->
                val line=raw.trim()
                if(line.isBlank() || line.startsWith("#") || !line.contains("=")) null
                else line.substringBefore("=") to line.substringAfter("=")
            }.toMap()
        }
        require(map.isNotEmpty()){"Production RGB asset manifest is empty"}
        expectedHashes=map
        return map
    }

    private fun sha256(bytes:ByteArray):String =
        MessageDigest.getInstance("SHA-256").digest(bytes).joinToString(""){"%02x".format(it)}

    @Synchronized
    private fun verifiedBytes(context:Context,id:String):ByteArray {
        cache[id]?.let{return it}
        val bytes=context.assets.open("$ROOT/$id.png").use{it.readBytes()}
        val expected=hashes(context)[id] ?: error("Production RGB hash missing: $id")
        require(sha256(bytes)==expected){"Production RGB hash mismatch: $id"}
        cache[id]=bytes
        return bytes
    }

    fun drawable(context:Context,name:String):Drawable? {
        val id=assetId(name) ?: return null
        return runCatching {
            Drawable.createFromStream(
                java.io.ByteArrayInputStream(verifiedBytes(context,id)),
                "$id.png"
            )
        }.getOrNull()
    }
}

enum class Tool { LINE, RECT, CIRCLE, ARC, HOLE, SELECT, DELETE, CHAMFER, FILLET, PAN, MEASURE }


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
    companion object {
        private val instances = java.util.Collections.newSetFromMap(java.util.WeakHashMap<RgbGlowButton, Boolean>())
        private val pulseHandler = Handler(Looper.getMainLooper())
        private var globalBrightnessPercent = 65

        fun setGlobalBrightness(percent:Int) {
            globalBrightnessPercent = percent.coerceIn(0,100)
            instances.toList().forEach { it.render() }
        }

        fun globalBrightness():Int = globalBrightnessPercent
        fun refreshThemeAll() {
            instances.toList().forEach { it.refreshTheme() }
        }
    }

    private var accent = Color.rgb(61,235,255)
    private var selectedGlow = false
    private var alarmGlow = false
    private val density = resources.displayMetrics.density
    private val pulseRunnable = object : Runnable {
        override fun run() {
            if (selectedGlow && isAttachedToWindow && isShown) {
                render()
                pulseHandler.postDelayed(this,90L)
            }
        }
    }

    init {
        instances.add(this)
        isAllCaps = false
        stateListAnimator = null
        setTextColor(StudioProductionTheme.text)
        render()
    }

    override fun onAttachedToWindow() {
        super.onAttachedToWindow()
        if (compoundDrawables.none { it != null }) {
            val candidates=listOfNotNull(
                contentDescription?.toString()?.takeIf{it.isNotBlank()},
                text?.toString()?.takeIf{it.isNotBlank()}
            )
            val drawable=candidates.firstNotNullOfOrNull { ProductionRgbAssets.drawable(context,it) }
            drawable?.let {
                val size=StudioDisplayPolicy.dp(this,22f).coerceAtLeast(18)
                it.setBounds(0,0,size,size)
                setCompoundDrawables(it,null,null,null)
                compoundDrawablePadding=StudioDisplayPolicy.dp(this,6f)
            }
        }
    }

    fun setRgbState(color: Int, selected: Boolean, alarm: Boolean = false) {
        accent = color
        selectedGlow = selected
        alarmGlow = alarm
        pulseHandler.removeCallbacks(pulseRunnable)
        render()
        if(selectedGlow && isAttachedToWindow) pulseHandler.post(pulseRunnable)
    }

    fun refreshTheme() {
        setTextColor(StudioProductionTheme.text)
        render()
        invalidate()
    }

    override fun onDetachedFromWindow() {
        pulseHandler.removeCallbacks(pulseRunnable)
        super.onDetachedFromWindow()
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
        val rawEdge = if (alarmGlow) StudioProductionTheme.alarm else accent
        val base = StudioProductionTheme.panel
        val baseBrightness = if (alarmGlow) 1f else globalBrightnessPercent / 100f
        val phase = 2.0 * Math.PI * ((SystemClock.uptimeMillis() % 1180L).toDouble() / 1180.0)
        val pulse = if(selectedGlow) (0.84 + 0.16 * ((sin(phase) + 1.0) * 0.5)).toFloat() else 1f
        val brightness = (baseBrightness * pulse).coerceIn(0f,1f)
        val edge = mix(base, rawEdge, brightness)
        val baseAmount = when {
            disabled -> 0.04f
            alarmGlow -> 0.48f
            pressedNow -> 0.54f
            selectedGlow -> 0.42f
            else -> 0.24f
        }
        val amount = if (alarmGlow) baseAmount else baseAmount * brightness
        val active = pressedNow || selectedGlow || alarmGlow
        val strokePx = (RgbGlassVisualContract.strokeDp(
            disabled, pressedNow, selectedGlow, alarmGlow
        ) * density).roundToInt().coerceAtLeast(1)
        val glowAlpha = when {
            disabled -> 55
            alarmGlow -> 255
            pressedNow -> 235
            selectedGlow -> 210
            else -> (70 + 100 * brightness).roundToInt().coerceIn(70,170)
        }
        val outer = GradientDrawable(
            GradientDrawable.Orientation.TOP_BOTTOM,
            intArrayOf(
                Color.argb((glowAlpha*0.30f).roundToInt(), Color.red(edge), Color.green(edge), Color.blue(edge)),
                Color.argb((glowAlpha*0.10f).roundToInt(), Color.red(edge), Color.green(edge), Color.blue(edge))
            )
        ).apply {
            cornerRadius = 18f * density
            setStroke(strokePx, Color.argb(glowAlpha, Color.red(edge), Color.green(edge), Color.blue(edge)))
        }
        val body = GradientDrawable(
            GradientDrawable.Orientation.TOP_BOTTOM,
            intArrayOf(
                mix(base, edge, (amount + 0.16f).coerceAtMost(0.72f)),
                mix(base, edge, (amount + 0.05f).coerceAtMost(0.62f)),
                mix(StudioProductionTheme.background, edge, (amount*0.48f).coerceAtMost(0.42f))
            )
        ).apply {
            cornerRadius = 15f * density
            setStroke(
                max(1,(1.1f*density).roundToInt()),
                Color.argb(if(active)190 else 110,255,255,255)
            )
        }
        val highlightAlpha = RgbGlassVisualContract.highlightAlpha(
            globalBrightnessPercent, active, alarmGlow
        )
        val highlight = GradientDrawable(
            GradientDrawable.Orientation.TOP_BOTTOM,
            intArrayOf(
                Color.argb(highlightAlpha,255,255,255),
                Color.argb((highlightAlpha*0.18f).roundToInt(),61,235,255),
                Color.TRANSPARENT
            )
        ).apply {
            cornerRadius = 13f*density
        }
        background = LayerDrawable(arrayOf(outer,body,highlight)).apply {
            val inset=(2f*density).roundToInt().coerceAtLeast(1)
            val hiInset=(3f*density).roundToInt().coerceAtLeast(inset)
            setLayerInset(1,inset,inset,inset,inset)
            setLayerInset(2,hiInset,hiInset,hiInset,hiInset)
        }
        alpha = when {
            disabled -> 0.42f
            active -> 1f
            else -> 0.86f
        }
        elevation = (
            RgbGlassVisualContract.elevationDp(
                disabled,pressedNow,selectedGlow,alarmGlow
            ) * density
        ).toFloat()
        scaleX = if (pressedNow) 0.97f else 1f
        scaleY = if (pressedNow) 0.97f else 1f
    }
}


class Axis5xPreview(
    context: Context,
    initialA: Double,
    initialB: Double,
    private val runtimeMode: String = "5AX",
    private val onAxesChanged: (Double, Double) -> Unit
) : View(context) {
    private val initialState = MachiningAxisRuntimeContract.state(runtimeMode, initialA, initialB)
    var axisA: Double = initialState.axisA
        private set
    var axisB: Double = initialState.axisB
        private set
    private var lastX = 0f
    private var lastY = 0f
    private val grid = Paint(Paint.ANTI_ALIAS_FLAG).apply { color = Color.rgb(25,65,88); strokeWidth = 1.2f }
    private val axisPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply { color = Color.rgb(61,235,255); strokeWidth = 5f; strokeCap = Paint.Cap.ROUND }
    private val rotaryPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply { color = Color.rgb(245,158,11); strokeWidth = 4f; style = Paint.Style.STROKE }
    private val textPaint5x = Paint(Paint.ANTI_ALIAS_FLAG).apply { color = Color.WHITE; textSize = 15f * resources.displayMetrics.scaledDensity }
    private val fpsMeter5x = SurfaceFpsMeter(refreshHzProvider = { display?.refreshRate?.toDouble() ?: 60.0 })

    init {
        setBackgroundColor(Color.rgb(5,10,18))
        isClickable = true
    }

    fun setAngles(a: Double, b: Double) {
        val next = MachiningAxisRuntimeContract.state(runtimeMode, a, b)
        axisA = next.axisA
        axisB = next.axisB
        postInvalidateOnAnimation()
    }

    override fun onDraw(canvas: Canvas) {
        super.onDraw(canvas)
        val fpsStats = fpsMeter5x.record(System.nanoTime())
        RenderStressProfiler.record(RenderStressScenario.FIVE_AXIS_SYNC, fpsStats)
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
        canvas.drawText(
            fpsStats.compact("5X") + " • HEAVIEST=" +
                (RenderStressProfiler.heaviest()?.scenario?.name ?: "collecting"),
            18f, 80f, textPaint5x
        )
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
                val next = MachiningAxisRuntimeContract.applyDrag(
                    runtimeMode, axisA, axisB, -dy * 0.35, dx * 0.35
                )
                axisA = next.axisA
                axisB = next.axisB
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
    private var environmentRestartApplied = false
    private var adaptiveRefreshController: AdaptiveRefreshController? = null
    companion object {
        private const val REQ_AI_VOICE = 7110
        private const val REQ_AI_VOICE_PERMISSION = 7111
    }
    private lateinit var cad: CadView
    private lateinit var networkStateBadge: TextView
    private val sharedProjectHandler = Handler(Looper.getMainLooper())
    private val sharedProjectExecutor = java.util.concurrent.Executors.newSingleThreadExecutor { task ->
        Thread(task,"aig-studio-shared-sync").apply { isDaemon=true }
    }
    private val sharedProjectScanRunning = java.util.concurrent.atomic.AtomicBoolean(false)
    private val sharedLocalDirty = java.util.concurrent.atomic.AtomicBoolean(false)
    private var sharedLocalRevisionMeta = ProjectRevisionMeta()
    private var sharedProjectLastMessage = ""
    private val sharedProjectRunnable = object : Runnable {
        override fun run() {
            val sharedFile=File(filesDir,"shared-sync/current.aigp")
            if(sharedFile.isFile && ::cad.isInitialized &&
                sharedProjectScanRunning.compareAndSet(false,true)) {
                val localDirty=sharedLocalDirty.get()
                val localMeta=sharedLocalRevisionMeta
                sharedProjectExecutor.execute {
                    val result=runCatching {
                        SharedProjectFolderSync.inspect(
                            sharedFile,localMeta,localDirty
                        ){StudioProjectRepository.load(it).revisionMeta}
                    }
                    sharedProjectHandler.post {
                        sharedProjectScanRunning.set(false)
                        result.onSuccess { observation ->
                            if(observation.state!=ProjectSyncState.CLEAN &&
                                observation.message!=sharedProjectLastMessage &&
                                ::networkStateBadge.isInitialized) {
                                sharedProjectLastMessage=observation.message
                                networkStateBadge.text="SYNC • "+observation.message
                            }
                        }.onFailure {
                            if(::networkStateBadge.isInitialized) {
                                networkStateBadge.text="SYNC BLOCKED • "+(it.message?:"error")
                            }
                        }
                    }
                }
            }
            sharedProjectHandler.postDelayed(this,SharedProjectFolderSync.POLL_INTERVAL_MS)
        }
    }
    private var onlineNetworkCallback: android.net.ConnectivityManager.NetworkCallback? = null
    private val onlineAutoCheckRunning = java.util.concurrent.atomic.AtomicBoolean(false)
    private val onlineAutoCheckCompleted = java.util.concurrent.atomic.AtomicBoolean(false)
    private val onlineAutoRetryScheduled = java.util.concurrent.atomic.AtomicBoolean(false)
    private val onlineAutoRetryCount = java.util.concurrent.atomic.AtomicInteger(0)
    private val onlineNetworkGeneration = java.util.concurrent.atomic.AtomicInteger(0)
    private val onlineCapabilityDebounceToken = java.util.concurrent.atomic.AtomicInteger(0)
    private val onlineNetworkValidated = java.util.concurrent.atomic.AtomicBoolean(false)
    private var voiceTts: TextToSpeech? = null
    private var speechRecognizer: SpeechRecognizer? = null
    private var voiceListening = false
    private lateinit var branchFlow: FlowLayout
    private lateinit var categoryFlow: FlowLayout
    private val toolButtons = mutableMapOf<Tool, Button>()
    private val categoryButtons = mutableMapOf<String, Button>()
    private var activeCategory: String? = null
    private var camSettings = CamSettings()
    private val camFixtures = mutableListOf<FixtureObstacle>()
    private var camToolAssembly = ToolAssemblyConfig()
    private var nextCamFixtureId = 1L
    private var ncSingleBlock = false
    private var ncDryRun = false
    private var ncBlockSkip = false
    private var axisA = 0.0
    private var axisB = 0.0
    private var axisC = 0.0
    private var machiningAxisMode = "3AX"
    private var rotaryClampProfile = RotaryAxisClampProfile.unconfigured()
    private var workOffset = "G54"
    private var controllerProfile = CncControllerProfile.FANUC
    private var ncCoordinateMode = NcCoordinateMode.ABSOLUTE_G90
    private var ncOriginTransformMode = NcOriginTransformMode.WORK_OFFSET_ONLY
    private var ncCutterCompensation = CutterCompensationMode.CAM_GEOMETRY_G40
    private var ncCutterCompRegister = 1
    private var ncCutterCompValueMm = 0.0
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
    private var overheatAlertShown = false
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
                    "  |  GPU " + CpuGpuTemperatureProbe.format(temps.gpuC) +
                    "  |  AUTO CAP " + (adaptiveRefreshController?.currentCpuThermalCap() ?: 120) + " FPS"
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
                if (
                    prefs.getBoolean("overheat_warning_enabled", true) &&
                    hottest != null && hottest >= highC && !overheatAlertShown
                ) {
                    overheatAlertShown = true
                    Toast.makeText(
                        this@MainActivity,
                        "高溫提醒 • CPU/GPU " + String.format("%.1f", hottest) + "°C • 已降低渲染負載",
                        Toast.LENGTH_LONG
                    ).show()
                } else if (hottest == null || hottest < warnC) {
                    overheatAlertShown = false
                }
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
    private var unifiedNcDraft: String? = null
    private var unifiedNcDraftSourceSignature: String? = null
    private var unifiedNcDraftStale: Boolean = false
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
        applyCoordinatePrecisionPreference()
        // System launch window stays visible until the first Production Runtime frame.
        // Do not install a custom engineering/startup shell as the app content view.
        val previousStartupCrashStage=StudioStartupBootGuard.begin(this)
        val startupMemoryClass=(getSystemService(ACTIVITY_SERVICE) as ActivityManager).memoryClass
        val startupQuality=StudioStartupEngineContract.qualityMode(
            lowMemory=startupMemoryClass<256,
            thermalHigh=false,
            preferHq=startupMemoryClass>=512 && !RuntimeDeviceProfile.isEmulator
        )
        val startupSafeBoot=StudioStartupEngineContract.safeBootRequired(previousStartupCrashStage)
        StudioStartupBootGuard.mark(this,StudioStartupStage.SAFE_THEME)
        StudioStartupBootGuard.mark(this,StudioStartupStage.CORE)
        val environmentPrefs = getSharedPreferences("aig_environment", MODE_PRIVATE)
        environmentRestartApplied = environmentPrefs.getBoolean("restart_required", false)
        if (environmentRestartApplied) {
            environmentPrefs.edit().putBoolean("restart_required", false).remove("restart_reason").apply()
        }
        adaptiveRefreshController = AdaptiveRefreshController(this).also { it.start() }
        StudioStartupBootGuard.mark(this,StudioStartupStage.CONFIGURATION)
        val root = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setBackgroundColor(StudioProductionTheme.background)
        }
        val screenWidthDp = resources.configuration.screenWidthDp.coerceAtLeast(1)
        val screenHeightDp = resources.configuration.screenHeightDp.coerceAtLeast(1)
        val workstationLayout = WorkstationChromeContract.layout(screenWidthDp, screenHeightDp)
        fun panel(stroke:Int = Color.argb(110,61,235,255)): GradientDrawable =
            GradientDrawable(
                GradientDrawable.Orientation.TOP_BOTTOM,
                intArrayOf(
                    Color.argb(238,Color.red(StudioProductionTheme.panel),Color.green(StudioProductionTheme.panel),Color.blue(StudioProductionTheme.panel)),
                    Color.argb(246,Color.red(StudioProductionTheme.background),Color.green(StudioProductionTheme.background),Color.blue(StudioProductionTheme.background))
                )
            ).apply {
                cornerRadius = dp(16).toFloat()
                setStroke(dp(2), stroke)
            }
        fun chromeText(label:String, color:Int = StudioProductionTheme.text, size:Float = 11f): TextView =
            TextView(this).apply {
                text = label
                setTextColor(color)
                textSize = StudioDisplayPolicy.sp(this, size)
                setPadding(dp(8), dp(4), dp(8), dp(4))
            }

        val masterRootBar = LinearLayout(this).apply {
            orientation = LinearLayout.HORIZONTAL
            gravity = Gravity.CENTER_VERTICAL
            background = panel()
            setPadding(dp(8),dp(3),dp(8),dp(3))
            contentDescription="MASTER COORDINATE ROOT"
            addView(chromeText(
                MasterRuntimeChainContract.uiLabel(),
                0xFF63FF9D.toInt(),10f
            ).apply { setTypeface(typeface,android.graphics.Typeface.BOLD) },
                LinearLayout.LayoutParams(0,-2,1f))
            addView(chromeText(if(workstationLayout==WorkstationChromeContract.Layout.COMPACT) "LOCAL • SYNC IDLE" else OfflineFirstModuleContract.uiBadge(),0xFF3DEBFF.toInt(),9f).apply {
                gravity=Gravity.END
            })
        }
        masterRootBar.visibility=View.GONE
        root.addView(masterRootBar,LinearLayout.LayoutParams(-1,-2).apply {
            setMargins(dp(5),dp(5),dp(5),dp(2))
        })

        val brandBar = LinearLayout(this).apply {
            orientation = LinearLayout.HORIZONTAL
            gravity = Gravity.CENTER_VERTICAL
            background = panel()
            setPadding(dp(6), dp(4), dp(6), dp(4))
        }
        val brandStack = LinearLayout(this).apply { orientation = LinearLayout.VERTICAL }
        brandStack.addView(chromeText(WorkstationChromeContract.BRAND, 0xFFFFFFFF.toInt(), 19f).apply {
            setTypeface(typeface, android.graphics.Typeface.BOLD)
            letterSpacing = 0.08f
        })
        brandStack.addView(chromeText(
            WorkstationChromeContract.WORKSTATION + " • " + WorkstationChromeContract.ORIGINAL + " • " + StudioProductionTheme.ID,
            StudioProductionTheme.accent, 10f
        ))
        brandBar.addView(brandStack, LinearLayout.LayoutParams(0, -2, 1f))
        val brandState = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            gravity = Gravity.END
        }
        brandState.addView(chromeText(
            WorkstationChromeContract.SYSTEM_READY + " • " + RuntimeDeviceProfile.verificationLabel,
            0xFF63FF9D.toInt(), 9.5f
        ).apply { gravity = Gravity.END })
        brandState.addView(chromeText(
            WorkstationChromeContract.MASTER_ORIGIN + " • " + WorkstationChromeContract.PRECISION,
            0xFFA0BED2.toInt(), 9f
        ).apply { gravity = Gravity.END })
        brandBar.addView(brandState, LinearLayout.LayoutParams(0, -2, 1f))
        brandBar.visibility=View.GONE
        root.addView(brandBar, LinearLayout.LayoutParams(-1, -2).apply {
            setMargins(dp(5), dp(5), dp(5), dp(3))
        })

        var showRuntimeHome:(()->Unit)?=null
        val productionUiSwitch = FlowLayout(this).apply {
            setPadding(dp(5), dp(2), dp(5), dp(3))
            contentDescription = "PRODUCTION UI SWITCH"
        }
        val productionUiButtons = linkedMapOf<String,RgbGlowButton>()
        val productionUiColors = mapOf(
            "CAD" to 0xFF3DEBFF.toInt(),
            "CAM" to 0xFF22C55E.toInt(),
            "SIM" to 0xFF8B5CF6.toInt(),
            "3AX" to 0xFF3B82F6.toInt(),
            "4AX" to 0xFFF59E0B.toInt(),
            "5AX" to 0xFFEC4899.toInt(),
            "NC" to 0xFF50AAFF.toInt(),
            "AI" to 0xFF8B5CF6.toInt()
        )
        val visibleModeTitle = chromeText(
            "目前模式 • CAD • 真 UI / LIVE RUNTIME",
            0xFF63FF9D.toInt(),10.5f
        ).apply {
            contentDescription="CURRENT PRODUCTION MODE"
            setTypeface(typeface,android.graphics.Typeface.BOLD)
        }
        val visibleModeActions = FlowLayout(this).apply {
            contentDescription="VISIBLE FUNCTION ACTIONS"
            setPadding(dp(5),dp(2),dp(5),dp(3))
        }
        fun refreshVisibleMode(id:String) {
            val mode=id.trim().uppercase(Locale.US)
            require(mode in VisibleFunctionUiContract.requiredModes){"Unsupported visible UI mode: $id"}
            visibleModeTitle.text="UX • "+RuntimeUxFlowContract.title(mode)
            visibleModeActions.removeAllViews()
            fun action(label:String,colorIndex:Int,run:()->Unit) {
                addActionTo(visibleModeActions,label,colorIndex,run)
            }
            when(mode) {
                "CAD" -> {
                    action("LINE",0){selectTool(Tool.LINE)}
                    action("SELECT",1){selectTool(Tool.SELECT)}
                    action("更多",2){openCategory("製圖"){showDrawingBranch()}}
                    action("→ CAM",3){showCamWorkstation()}
                }
                "CAM" -> {
                    action("AUTO",3){showCamWorkstation()}
                    action("參數",2){showCamWorkstation()}
                    action("3/4/5/6AX",5){openCategory("加工"){showMachiningBranch()}}
                    action("→ SIM",1){showUnifiedMachiningWorkspace(ProductionUiSwitchContract.runtimeTarget("SIM"))}
                }
                "SIM" -> {
                    action("模擬",5){showUnifiedMachiningWorkspace(ProductionUiSwitchContract.runtimeTarget("SIM"))}
                    action("風險",4){openCategory("安全"){showSecurityBranch()}}
                    action("3/4/5/6AX",2){openCategory("加工"){showMachiningBranch()}}
                    action("→ NC",1){showUnifiedMachiningWorkspace(ProductionUiSwitchContract.runtimeTarget("NC"))}
                }
                "3AX" -> {
                    action("開啟 3AX",5){showUnifiedMachiningWorkspace(ProductionUiSwitchContract.runtimeTarget("3AX"))}
                    action("加工工具",5){openCategory("加工"){showMachiningBranch()}}
                }
                "4AX" -> {
                    action("開啟 4AX",2){showUnifiedMachiningWorkspace(ProductionUiSwitchContract.runtimeTarget("4AX"))}
                    action("加工工具",5){openCategory("加工"){showMachiningBranch()}}
                }
                "5AX" -> {
                    action("開啟 5AX",1){showUnifiedMachiningWorkspace(ProductionUiSwitchContract.runtimeTarget("5AX"))}
                    action("加工工具",5){openCategory("加工"){showMachiningBranch()}}
                }
                "NC" -> {
                    action("NC EDIT",5){showUnifiedMachiningWorkspace(ProductionUiSwitchContract.runtimeTarget("NC"))}
                    action("安全",4){openCategory("安全"){showSecurityBranch()}}
                    action("← SIM",2){showUnifiedMachiningWorkspace(ProductionUiSwitchContract.runtimeTarget("SIM"))}
                }
                "AI" -> {
                    action("AI 檢查",3){cad.aiInspect()}
                    action("AI SUITE",2){showAiSystemSuiteDialog()}
                    action("更新",1){runSecureUpdateCheck()}
                    action("← CAD",0){selectTool(Tool.SELECT)}
                }
            }
            check(visibleModeActions.childCount>0) {
                "NO_UI_NO_FUNCTION: visible actions missing for "+mode
            }
            check(visibleModeActions.childCount<=RuntimeUxFlowContract.MAX_VISIBLE_ACTIONS) {
                "UX overflow: "+mode+" visible actions="+visibleModeActions.childCount
            }
        }

        fun selectProductionUi(id:String) {
            val normalized=ProductionUiSwitchContract.normalize(id)
            productionUiButtons.forEach { (key,button) ->
                button.setRgbState(
                    productionUiColors[key] ?: StudioProductionTheme.accent,
                    key==normalized
                )
            }
        }
        fun addProductionUi(id:String, action:()->Unit) {
            val normalized=ProductionUiSwitchContract.normalize(id)
            val button=RgbGlowButton(this).apply {
                text=normalized
                contentDescription="UI $normalized"
                textSize=StudioDisplayPolicy.sp(this,9.5f)
                minWidth=dp(68)
                minHeight=dp(42)
                maxLines=1
                setRgbState(productionUiColors[normalized] ?: StudioProductionTheme.accent,false)
                setOnClickListener {
                    selectProductionUi(normalized)
                    refreshVisibleMode(normalized)
                    action()
                }
            }
            productionUiButtons[normalized]=button
            productionUiSwitch.addView(button)
        }
        addProductionUi("CAD") {
            Toast.makeText(this,"CAD • LIVE WORKSPACE",Toast.LENGTH_SHORT).show()
        }
        addProductionUi("CAM") { showCamWorkstation() }
        addProductionUi("SIM") { showUnifiedMachiningWorkspace(ProductionUiSwitchContract.runtimeTarget("SIM")) }
        addProductionUi("NC") { showUnifiedMachiningWorkspace(ProductionUiSwitchContract.runtimeTarget("NC")) }
        addProductionUi("AI") { showAiSystemSuiteDialog() }
        check(ProductionUiSwitchContract.stableOrder(productionUiButtons.keys.toList()))
        productionUiSwitch.addView(RgbGlowButton(this).apply {
            text="首頁"
            contentDescription="RETURN TO FORMAL RGB HOME"
            textSize=StudioDisplayPolicy.sp(this,9.5f)
            minWidth=dp(68)
            minHeight=dp(42)
            maxLines=1
            setRgbState(0xFF3DEBFF.toInt(),false)
            setOnClickListener { showRuntimeHome?.invoke() }
        })
        selectProductionUi(ProductionUiSwitchContract.initialMode)
        productionUiSwitch.visibility=View.GONE
        root.addView(productionUiSwitch,LinearLayout.LayoutParams(-1,-2))
        visibleModeTitle.visibility=View.GONE
        root.addView(visibleModeTitle,LinearLayout.LayoutParams(-1,-2))
        networkStateBadge=chromeText(
            "網路 • 本機就緒 • 網路可選",
            0xFFA0B4C3.toInt(),9.5f
        ).apply{
            contentDescription="NETWORK OPTIONAL STATUS"
        }
        networkStateBadge.visibility=View.GONE
        root.addView(networkStateBadge,LinearLayout.LayoutParams(-1,-2))
        val maintenanceStrip=FlowLayout(this).apply {
            contentDescription="MAINTENANCE SYSTEM STRIP"
            setPadding(dp(5),dp(1),dp(5),dp(2))
            addView(RgbGlowButton(this@MainActivity).apply {
                text="維修"
                contentDescription="MAINTENANCE CENTER"
                textSize=StudioDisplayPolicy.sp(this,9.5f)
                minWidth=dp(76)
                minHeight=dp(42)
                maxLines=1
                setRgbState(0xFF8B5CF6.toInt(),false)
                setOnClickListener { showMaintenanceCenter() }
            })
        }
        maintenanceStrip.visibility=View.GONE
        root.addView(maintenanceStrip,LinearLayout.LayoutParams(-1,-2))
        visibleModeActions.visibility=View.GONE
        root.addView(visibleModeActions,LinearLayout.LayoutParams(-1,-2))

        cad = CadView(
            this,
            onGeometryChanged = {
                if (!unifiedNcDraft.isNullOrBlank()) unifiedNcDraftStale = true
            },
            onProjectChanged = {
                sharedLocalDirty.set(true)
            }
        )
        val workspaceColumn = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            background = panel(0x663DEBFF)
            setPadding(dp(3), dp(2), dp(3), dp(3))
        }
        workspaceColumn.addView(chromeText(
            "CAD 繪圖區",
            0xFF3DEBFF.toInt(), 10.5f
        ))

        val cadStage = FrameLayout(this)
        cadStage.addView(cad, FrameLayout.LayoutParams(
            FrameLayout.LayoutParams.MATCH_PARENT,
            FrameLayout.LayoutParams.MATCH_PARENT
        ))

        branchFlow = FlowLayout(this).apply {
            setPadding(dp(6), dp(2), dp(6), dp(2))
            visibility = View.GONE
        }
        categoryFlow = FlowLayout(this).apply {
            setPadding(dp(6), dp(3), dp(6), dp(4))
        }

        val floatingToolCard = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            background = GradientDrawable(
                GradientDrawable.Orientation.TOP_BOTTOM,
                intArrayOf(0xE80A1C2B.toInt(), 0xD9081622.toInt())
            ).apply {
                cornerRadius = dp(14).toFloat()
                setStroke(dp(2), 0xAA3DEBFF.toInt())
            }
            elevation = dp(10).toFloat()
            setPadding(dp(5), dp(4), dp(5), dp(5))
        }
        val floatingHeader = LinearLayout(this).apply {
            orientation = LinearLayout.HORIZONTAL
            gravity = Gravity.CENTER_VERTICAL
        }
        floatingHeader.addView(chromeText(
            FloatingCadToolContract.TITLE,
            0xFF3DEBFF.toInt(), 10f
        ).apply {
            setTypeface(typeface, android.graphics.Typeface.BOLD)
        }, LinearLayout.LayoutParams(0, -2, 1f))

        val backButton = RgbGlowButton(this).apply {
            text = FloatingCadToolContract.BACK
            textSize = StudioDisplayPolicy.sp(this, 9f)
            minWidth = dp(58); minHeight = dp(38)
            setRgbState(0xFFF59E0B.toInt(), false)
            setOnClickListener { closeBranches() }
        }
        val closeButton = RgbGlowButton(this).apply {
            text = FloatingCadToolContract.CLOSE
            textSize = StudioDisplayPolicy.sp(this, 9f)
            minWidth = dp(62); minHeight = dp(38)
            setRgbState(0xFFEF4444.toInt(), false)
        }
        floatingHeader.addView(backButton)
        floatingHeader.addView(closeButton)
        floatingToolCard.addView(floatingHeader, LinearLayout.LayoutParams(-1, -2))

        val quickReachFlow = FlowLayout(this).apply {
            contentDescription = "CAD FIXED QUICK REACH"
            setPadding(dp(2), dp(2), dp(2), dp(2))
        }
        fun quickReach(label:String,accent:Int,run:()->Unit) {
            quickReachFlow.addView(RgbGlowButton(this).apply {
                text=label
                contentDescription="CAD QUICK "+label
                textSize=StudioDisplayPolicy.sp(this,9f)
                minWidth=dp(56)
                minHeight=dp(42)
                maxLines=1
                setRgbState(accent,false)
                setOnClickListener { run() }
            })
        }
        quickReach("選取",0xFF50AAFF.toInt()) { selectTool(Tool.SELECT) }
        quickReach("平移",0xFF3DEBFF.toInt()) { selectTool(Tool.PAN) }
        quickReach("FIT",0xFF63FF9D.toInt()) { cad.fitView() }
        quickReach("↶",0xFF8B5CF6.toInt()) { cad.undo() }
        quickReach("↷",0xFF8B5CF6.toInt()) { cad.redo() }
        floatingToolCard.addView(quickReachFlow, LinearLayout.LayoutParams(-1, -2))
        floatingToolCard.addView(categoryFlow, LinearLayout.LayoutParams(-1, -2))
        floatingToolCard.addView(branchFlow, LinearLayout.LayoutParams(-1, -2))

        val reopenButton = RgbGlowButton(this).apply {
            text = FloatingCadToolContract.REOPEN
            textSize = StudioDisplayPolicy.sp(this, 9.5f)
            minWidth = dp(72); minHeight = dp(42)
            setRgbState(0xFF3DEBFF.toInt(), true)
            visibility = View.GONE
        }
        closeButton.setOnClickListener {
            floatingToolCard.visibility = View.GONE
            reopenButton.visibility = View.VISIBLE
        }
        reopenButton.setOnClickListener {
            floatingToolCard.visibility = View.VISIBLE
            reopenButton.visibility = View.GONE
        }
        if(workstationLayout==WorkstationChromeContract.Layout.COMPACT &&
            AndroidUxContract.CLEAN_START_TOOL_DECK_COLLAPSED) {
            floatingToolCard.visibility = View.GONE
            reopenButton.visibility = View.VISIBLE
        }

        cadStage.addView(
            floatingToolCard,
            FrameLayout.LayoutParams(
                dp(FloatingCadToolContract.panelWidthDp(screenWidthDp)),
                FrameLayout.LayoutParams.WRAP_CONTENT,
                Gravity.TOP or Gravity.START
            ).apply { setMargins(dp(8), dp(8), dp(8), dp(8)) }
        )
        cadStage.addView(
            reopenButton,
            FrameLayout.LayoutParams(
                dp(82), dp(44),
                Gravity.TOP or Gravity.START
            ).apply { setMargins(dp(8), dp(8), 0, 0) }
        )
        workspaceColumn.addView(cadStage, LinearLayout.LayoutParams(-1, 0, 1f))

        val machineRail = LinearLayout(this).apply {
            orientation = if(workstationLayout==WorkstationChromeContract.Layout.COMPACT)
                LinearLayout.HORIZONTAL else LinearLayout.VERTICAL
            gravity = Gravity.CENTER
            background = panel(0x4474F7FF)
            setPadding(dp(4), dp(4), dp(4), dp(4))
        }
        fun railCell(title:String,value:String,color:Int): LinearLayout =
            LinearLayout(this).apply {
                orientation = LinearLayout.VERTICAL
                gravity = Gravity.CENTER
                addView(chromeText(title, 0xFF7894A8.toInt(), 8.5f).apply { gravity = Gravity.CENTER })
                addView(chromeText(value, color, 10f).apply {
                    gravity = Gravity.CENTER
                    setTypeface(typeface, android.graphics.Typeface.BOLD)
                })
            }
        val railCells = listOf(
            railCell("MACHINE","READY",0xFF63FF9D.toInt()),
            railCell("ORIGIN","X0.000 Y0.000 Z0.000",0xFF3DEBFF.toInt()),
            railCell("PRECISION",CoordinatePrecisionRuntime.display().storageValue+" mm",0xFFF59E0B.toInt()),
            railCell("RGB","LIVE",0xFF8B5CF6.toInt())
        )
        railCells.forEach {
            machineRail.addView(
                it,
                if(workstationLayout==WorkstationChromeContract.Layout.COMPACT)
                    LinearLayout.LayoutParams(0,-2,1f)
                else LinearLayout.LayoutParams(-1,0,1f)
            )
        }

        val workspaceFrame = LinearLayout(this).apply {
            orientation = if(workstationLayout==WorkstationChromeContract.Layout.COMPACT)
                LinearLayout.VERTICAL else LinearLayout.HORIZONTAL
            setPadding(dp(5), dp(2), dp(5), dp(2))
        }
        workspaceFrame.addView(workspaceColumn, LinearLayout.LayoutParams(0, 0).apply {
            if(workstationLayout==WorkstationChromeContract.Layout.COMPACT) {
                width = -1; height = 0; weight = 1f
            } else {
                width = 0; height = -1; weight = 1f
            }
        })
        machineRail.visibility=View.GONE
        val cadFormalHeader=LinearLayout(this).apply {
            orientation=LinearLayout.HORIZONTAL
            gravity=Gravity.CENTER_VERTICAL
            background=panel(0x663DEBFF)
            setPadding(dp(8),dp(4),dp(8),dp(4))
            contentDescription="FORMAL CAD PAGE HEADER"
        }
        cadFormalHeader.addView(chromeText(
            "CAD 製圖",
            0xFF3DEBFF.toInt(),12f
        ).apply {
            setTypeface(typeface,android.graphics.Typeface.BOLD)
        },LinearLayout.LayoutParams(0,-2,1f))
        cadFormalHeader.addView(RgbGlowButton(this).apply {
            text="首頁"
            contentDescription="CAD RETURN HOME"
            textSize=StudioDisplayPolicy.sp(this,9.5f)
            minWidth=dp(72)
            minHeight=dp(42)
            setRgbState(0xFF3DEBFF.toInt(),false)
            setOnClickListener { showRuntimeHome?.invoke() }
        })
        root.addView(cadFormalHeader,LinearLayout.LayoutParams(-1,-2).apply {
            setMargins(dp(5),dp(5),dp(5),dp(2))
        })
        root.addView(workspaceFrame, LinearLayout.LayoutParams(-1, 0, 1f))

        // Tool controls now float over the CAD stage; they no longer consume workspace height.
        addCategory("繪圖", 0) { showDrawingBranch() }
        addCategory("檢視", 0) { showViewBranch() }
        addCategory("修改", 3) { showModifyBranch() }
        addCategory("連接", 1) { showLinkBranch() }
        addCategory("角部", 2) { showCornerBranch() }
        addCategory("CAM", 5) { showCamWorkstation() }
        addCategory("加工", 5) { showMachiningBranch() }
        addCategory("安全", 4) { showSecurityBranch() }
        addCategory("檔案", 1) { showProjectFileBranch() }
        addCategory("AI", 1) { showAiBranch() }
        addActionTo(categoryFlow, "AI VOICE", 0) { startVoiceAssistant() }
        addActionTo(categoryFlow, "AI SUITE", 2) { showAiSystemSuiteDialog() }
        addActionTo(categoryFlow, "ChatGPT AI 更新 • 一鍵", 1) { runSecureUpdateCheck() }
        addActionTo(categoryFlow, "↶", 3) { cad.undo() }
        addActionTo(categoryFlow, "↷", 5) { cad.redo() }
        val workstationFooter = chromeText(
            WorkstationChromeContract.FUNCTION_STRIP + "  •  MAKE IT REAL.",
            0xFF7894A8.toInt(), 9f
        ).apply {
            gravity = Gravity.CENTER
            background = panel(0x334D7189)
        }
        workstationFooter.visibility=View.GONE
        root.addView(workstationFooter, LinearLayout.LayoutParams(-1, -2).apply {
            setMargins(dp(5), dp(2), dp(5), dp(2))
        })

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


        val runtimeHost=FrameLayout(this).apply {
            setBackgroundColor(StudioProductionTheme.background)
            contentDescription="AIG CNC PRODUCTION RUNTIME HOST"
        }
        root.visibility=View.GONE
        runtimeHost.addView(root,FrameLayout.LayoutParams(
            FrameLayout.LayoutParams.MATCH_PARENT,
            FrameLayout.LayoutParams.MATCH_PARENT
        ))

        val homeRoot=FrameLayout(this).apply {
            contentDescription="AIG CNC FORMAL RGB HOME • aigii_rgb_neon_v2"
            val base=GradientDrawable(
                GradientDrawable.Orientation.TL_BR,
                intArrayOf(
                    StudioProductionTheme.background,
                    StudioProductionTheme.panel,
                    Color.rgb(2,7,14)
                )
            )
            val wallpaper=ProductionRgbAssets.drawable(this@MainActivity,"HOME")?.apply { alpha=72 }
            background=if(wallpaper!=null)
                android.graphics.drawable.LayerDrawable(arrayOf(base,wallpaper))
            else base
        }
        val homeContent=LinearLayout(this).apply {
            orientation=LinearLayout.VERTICAL
            gravity=Gravity.CENTER_HORIZONTAL
            setPadding(dp(16),dp(24),dp(16),dp(18))
            background=GradientDrawable(
                GradientDrawable.Orientation.TOP_BOTTOM,
                intArrayOf(
                    Color.argb(198,4,12,24),
                    Color.argb(142,4,14,28),
                    Color.argb(210,4,10,20)
                )
            )
        }
        homeContent.addView(chromeText(
            "AIG CNC",
            Color.WHITE,26f
        ).apply {
            gravity=Gravity.CENTER
            setTypeface(typeface,android.graphics.Typeface.BOLD)
            letterSpacing=0.10f
        },LinearLayout.LayoutParams(-1,-2))
        homeContent.addView(chromeText(
            "RGB 智慧製造",
            StudioProductionTheme.accent,12f
        ).apply {
            gravity=Gravity.CENTER
            setTypeface(typeface,android.graphics.Typeface.BOLD)
        },LinearLayout.LayoutParams(-1,-2).apply { setMargins(0,dp(2),0,dp(18)) })

        val homeModes=FlowLayout(this).apply {
            contentDescription="FORMAL RGB HOME MODES"
            setPadding(dp(4),dp(4),dp(4),dp(4))
        }
        fun enterCadRuntime() {
            homeRoot.visibility=View.GONE
            root.visibility=View.VISIBLE
            selectProductionUi("CAD")
            refreshVisibleMode("CAD")
        }
        fun homeAction(label:String,color:Int,run:()->Unit) {
            homeModes.addView(RgbGlowButton(this).apply {
                text=label
                contentDescription="HOME $label"
                textSize=StudioDisplayPolicy.sp(this,12f)
                minWidth=dp(104)
                minHeight=dp(64)
                maxLines=1
                setRgbState(color,false)
                setOnClickListener { run() }
            })
        }
        homeAction("CAD",0xFF3DEBFF.toInt()){enterCadRuntime()}
        homeAction("CAM",0xFF22C55E.toInt()){showCamWorkstation()}
        homeAction("SIM",0xFF8B5CF6.toInt()){showUnifiedMachiningWorkspace(ProductionUiSwitchContract.runtimeTarget("SIM"))}
        homeAction("3AX",0xFF3B82F6.toInt()){showUnifiedMachiningWorkspace(ProductionUiSwitchContract.runtimeTarget("3AX"))}
        homeAction("4AX",0xFFF59E0B.toInt()){showUnifiedMachiningWorkspace(ProductionUiSwitchContract.runtimeTarget("4AX"))}
        homeAction("5AX",0xFFEC4899.toInt()){showUnifiedMachiningWorkspace(ProductionUiSwitchContract.runtimeTarget("5AX"))}
        homeAction("NC",0xFF50AAFF.toInt()){showUnifiedMachiningWorkspace(ProductionUiSwitchContract.runtimeTarget("NC"))}
        homeAction("AI",0xFF8B5CF6.toInt()){showAiSystemSuiteDialog()}
        homeContent.addView(homeModes,LinearLayout.LayoutParams(-1,0,1f))

        val homeUtility=LinearLayout(this).apply {
            orientation=LinearLayout.HORIZONTAL
            gravity=Gravity.CENTER
            setPadding(dp(4),dp(8),dp(4),dp(2))
            addView(RgbGlowButton(this@MainActivity).apply {
                text="工作/維修"
                contentDescription="HOME WORK MAINTENANCE"
                textSize=StudioDisplayPolicy.sp(this,10f)
                minWidth=dp(112)
                minHeight=dp(44)
                setRgbState(0xFF8B5CF6.toInt(),false)
                setOnClickListener { showMaintenanceCenter() }
            })
        }
        homeContent.addView(homeUtility,LinearLayout.LayoutParams(-1,-2))
        homeContent.addView(chromeText(
            "CAD • CAM • SIM • 3AX • 4AX • 5AX • NC • AI",
            0xFFA0BED2.toInt(),9f
        ).apply { gravity=Gravity.CENTER },LinearLayout.LayoutParams(-1,-2))

        homeRoot.addView(homeContent,FrameLayout.LayoutParams(
            FrameLayout.LayoutParams.MATCH_PARENT,
            FrameLayout.LayoutParams.MATCH_PARENT
        ))
        showRuntimeHome={
            root.visibility=View.GONE
            homeRoot.visibility=View.VISIBLE
        }
        runtimeHost.addView(homeRoot,FrameLayout.LayoutParams(
            FrameLayout.LayoutParams.MATCH_PARENT,
            FrameLayout.LayoutParams.MATCH_PARENT
        ))

        StudioStartupBootGuard.mark(this,StudioStartupStage.UI_RENDERER)
        setContentView(runtimeHost)
        if (environmentRestartApplied) {
            Toast.makeText(this, "重開套用完成 • 3D/SIM 畫質核心已重新載入", Toast.LENGTH_SHORT).show()
        }
        StudioStartupBootGuard.mark(this,StudioStartupStage.PROJECT_DATA)
        loadRotaryMachineProfile()
        restoreCadCheckpointIfAvailable()
        autosaveHandler.postDelayed(autosaveRunnable, 15000L)
        if(workstationLayout==WorkstationChromeContract.Layout.COMPACT &&
            AndroidUxContract.CLEAN_START_TOOL_DECK_COLLAPSED) {
            closeBranches()
        } else {
            openCategory("繪圖") { showDrawingBranch() }
        }
        selectTool(Tool.LINE)
        refreshVisibleMode(ProductionUiSwitchContract.initialMode)
        StudioStartupBootGuard.mark(this,StudioStartupStage.HEALTH)
        root.post {
            if (root.isAttachedToWindow) {
                StudioStartupBootGuard.mark(this,StudioStartupStage.WRAP_UP)
                StudioStartupBootGuard.mark(this,StudioStartupStage.HOME)
                StudioStartupBootGuard.complete(this)
                runDualPlatformProjectSmokeIfPresent()
                startSharedProjectWatcher()
                scheduleBackgroundOnlineServices()
            } else {
                StudioStartupBootGuard.mark(this,StudioStartupStage.HEALTH)
                Toast.makeText(this,"PRODUCTION UI ATTACH BLOCKED • SAFE STATE • RETRY APP",Toast.LENGTH_LONG).show()
            }
        }
        // Network never participates in startup. Online services run only after READY/UI attach.
    }



    private fun startSharedProjectWatcher() {
        File(filesDir,"shared-sync").mkdirs()
        sharedLocalDirty.set(false)
        sharedProjectHandler.removeCallbacks(sharedProjectRunnable)
        sharedProjectHandler.postDelayed(sharedProjectRunnable,SharedProjectFolderSync.POLL_INTERVAL_MS)
    }

    private fun runDualPlatformProjectSmokeIfPresent() {
        val input=File(filesDir,"dual-platform-import.aigp")
        if(!input.isFile) return
        val output=File(filesDir,"dual-platform-export.aigp")
        val result=File(filesDir,"dual-platform-result.txt")
        val baseline=File(filesDir,"dual-platform-local-baseline.aigp")
        val editRequested=File(filesDir,"dual-platform-edit.flag").isFile
        val localDirty=File(filesDir,"dual-platform-local-dirty.flag").isFile
        runCatching {
            val remote=StudioProjectRepository.load(input)
            sharedLocalRevisionMeta=remote.revisionMeta
            val syncState=if(baseline.isFile) {
                val local=StudioProjectRepository.load(baseline)
                ProjectRevisionSync.classify(local.revisionMeta,remote.revisionMeta,localDirty)
            } else if(remote.revisionMeta.revision>0L) {
                ProjectSyncState.REMOTE_NEWER
            } else ProjectSyncState.CLEAN
            if(syncState==ProjectSyncState.CONFLICT) {
                result.writeText(
                    "CONFLICT\nREMOTE_REV="+remote.revisionMeta.revision+
                        "\nACTIONS="+ProjectSyncUxContract.conflictUiActions.joinToString("|")+"\n",
                    Charsets.UTF_8
                )
                Toast.makeText(
                    this,
                    "SYNC CONFLICT • "+ProjectSyncUxContract.conflictUiActions.joinToString(" / "),
                    Toast.LENGTH_LONG
                ).show()
                return@runCatching
            }
            val working=if(editRequested) {
                remote.copy(
                    entities=remote.entities.map {
                        if(it is Circle && it.id=="REF-CIRCLE") {
                            it.copy(center=Vec2(it.center.x+0.001,it.center.y))
                        } else it
                    }
                )
            } else remote
            cad.applyPortableProject(working)
            camSettings=working.camSettings
            axisA=working.axisA
            axisB=working.axisB
            axisC=working.axisC
            machiningAxisMode=working.axisMode
            camFixtures.clear();camFixtures.addAll(working.fixtures)
            camToolAssembly=working.toolAssembly
            nextCamFixtureId=(camFixtures.maxOfOrNull{it.id} ?: 0L)+1L
            unifiedNcDraft=working.ncText.takeIf { it.isNotBlank() }
            unifiedNcDraftSourceSignature=currentUnifiedNcSourceSignature()
            unifiedNcDraftStale=false
            val exported=cad.capturePortableProject(
                camSettings,axisA,axisB,machiningAxisMode,unifiedNcDraft.orEmpty(),
                axisC,camFixtures,camToolAssembly
            ).copy(revisionMeta=working.revisionMeta)
            if(editRequested) {
                StudioProjectRepository.saveRevisioned(exported,output,"ANDROID","EMULATOR")
            } else {
                StudioProjectRepository.save(exported,output)
            }
            val saved=StudioProjectRepository.load(output)
            sharedLocalRevisionMeta=saved.revisionMeta
            result.writeText(
                "PASS\nMASTER="+SoftwareCoordinateContract.masterOriginData()+
                    "\nDIGEST="+StudioProjectRepository.canonicalDigest(saved)+
                    "\nENTITIES="+saved.entities.size+
                    "\nFIXTURES="+saved.fixtures.size+
                    "\nAXIS_C="+DisplayFormat.mm(saved.axisC)+
                    "\nREVISION="+saved.revisionMeta.revision+
                    "\nBASE="+saved.revisionMeta.baseRevision+
                    "\nSOURCE="+saved.revisionMeta.sourcePlatform+
                    "\nSYNC_STATE="+syncState.name+"\n",
                Charsets.UTF_8
            )
            Toast.makeText(
                this,
                ProjectRevisionSync.statusLabel(
                    if(editRequested) ProjectSyncState.LOCAL_DIRTY else ProjectSyncState.CLEAN,
                    saved.revisionMeta
                )+" • ANDROID",
                Toast.LENGTH_SHORT
            ).show()
        }.onFailure { error ->
            result.writeText("FAIL\n"+error.javaClass.name+"\n"+(error.message?:"unknown")+"\n",Charsets.UTF_8)
            Toast.makeText(this,"DUAL PROJECT BLOCKED • "+(error.message?:"error"),Toast.LENGTH_LONG).show()
        }
    }

    private fun scheduleBackgroundOnlineServices() {
        if(!::networkStateBadge.isInitialized) return
        networkStateBadge.postDelayed({
            val cm=getSystemService(CONNECTIVITY_SERVICE) as android.net.ConnectivityManager

            fun renderNetworkState(validated:Boolean,message:String?=null) {
                runOnUiThread {
                    if(!::networkStateBadge.isInitialized) return@runOnUiThread
                    networkStateBadge.text=when {
                        message!=null -> "網路 • "+message
                        validated -> "網路 • ONLINE / VALIDATED"
                        else -> "網路 • 離線可用 • 本機功能正常"
                    }
                }
            }

            fun networkUsable(caps:android.net.NetworkCapabilities?):Boolean {
                if(caps==null) return false
                val validated=caps.hasCapability(
                    android.net.NetworkCapabilities.NET_CAPABILITY_VALIDATED
                )
                val notSuspended=if(android.os.Build.VERSION.SDK_INT>=android.os.Build.VERSION_CODES.P) {
                    caps.hasCapability(android.net.NetworkCapabilities.NET_CAPABILITY_NOT_SUSPENDED)
                } else true
                return validated && notSuspended
            }

            fun maybeStartOnlineServices(
                caps:android.net.NetworkCapabilities?,
                generation:Int=onlineNetworkGeneration.get()
            ) {
                val validated=networkUsable(caps)
                if(!validated){
                    onlineNetworkValidated.set(false)
                    renderNetworkState(false)
                    return
                }
                if(onlineNetworkValidated.compareAndSet(false,true)) {
                    UpdateNetworkCircuitBreaker.onValidatedReconnect()
                    onlineAutoCheckCompleted.set(false)
                    onlineAutoRetryScheduled.set(false)
                    onlineAutoRetryCount.set(0)
                }
                renderNetworkState(true)
                if(generation!=onlineNetworkGeneration.get()) return
                if(onlineAutoCheckCompleted.get()) return
                if(onlineAutoRetryScheduled.get()) return
                if(onlineAutoRetryCount.get()>=OfflineFirstRuntimeContract.BACKGROUND_NETWORK_MAX_ATTEMPTS){
                    renderNetworkState(true,"更新待手動重試")
                    return
                }
                val updateConfig=UpdateConfigStore.load(this)
                if(!updateConfig.configured){
                    renderNetworkState(true,"更新設定未完成")
                    return
                }
                if(!OfflineFirstRuntimeContract.onlineServiceAllowed(true,true)) return
                if(!onlineAutoCheckRunning.compareAndSet(false,true)) return
                val requestGeneration=generation
                val backgroundConfig=updateConfig.copy(
                    autoDownload=OfflineFirstRuntimeContract.BACKGROUND_AUTO_DOWNLOAD
                )
                SecureUpdateManager.autoCheck(this,backgroundConfig){result->
                    if(requestGeneration!=onlineNetworkGeneration.get()) {
                        return@autoCheck
                    }
                    onlineAutoCheckRunning.set(false)
                    if(result.ok){
                        onlineAutoCheckCompleted.set(true)
                        onlineAutoRetryCount.set(0)
                        if(result.available) renderNetworkState(true,"更新可用")
                        else renderNetworkState(true)
                    }else{
                        onlineAutoCheckCompleted.set(false)
                        val attempt=onlineAutoRetryCount.incrementAndGet()
                        if(attempt<OfflineFirstRuntimeContract.BACKGROUND_NETWORK_MAX_ATTEMPTS &&
                            onlineAutoRetryScheduled.compareAndSet(false,true)){
                            renderNetworkState(true,"更新快速重試")
                            val retryGeneration=onlineNetworkGeneration.get()
                            networkStateBadge.postDelayed({
                                if(retryGeneration!=onlineNetworkGeneration.get()) return@postDelayed
                                onlineAutoRetryScheduled.set(false)
                                val active=cm.activeNetwork
                                maybeStartOnlineServices(
                                    active?.let{cm.getNetworkCapabilities(it)},
                                    retryGeneration
                                )
                            },OfflineFirstRuntimeContract.BACKGROUND_NETWORK_RETRY_DELAY_MS)
                        }else{
                            renderNetworkState(true,"更新待手動重試")
                        }
                    }
                }
            }

            fun debounceCapabilities(caps:android.net.NetworkCapabilities?) {
                val token=onlineCapabilityDebounceToken.incrementAndGet()
                val generation=onlineNetworkGeneration.get()
                networkStateBadge.postDelayed({
                    if(token!=onlineCapabilityDebounceToken.get()) return@postDelayed
                    if(generation!=onlineNetworkGeneration.get()) return@postDelayed
                    maybeStartOnlineServices(caps,generation)
                },OfflineFirstRuntimeContract.NETWORK_CAPABILITY_DEBOUNCE_MS)
            }

            val callback=object:android.net.ConnectivityManager.NetworkCallback(){
                override fun onCapabilitiesChanged(
                    network:android.net.Network,
                    caps:android.net.NetworkCapabilities
                ){
                    debounceCapabilities(caps)
                }
                override fun onLost(network:android.net.Network){
                    onlineNetworkGeneration.incrementAndGet()
                    onlineCapabilityDebounceToken.incrementAndGet()
                    onlineNetworkValidated.set(false)
                    onlineAutoCheckRunning.set(false)
                    onlineAutoCheckCompleted.set(false)
                    onlineAutoRetryScheduled.set(false)
                    onlineAutoRetryCount.set(0)
                    renderNetworkState(false)
                }
            }

            onlineNetworkCallback?.let { old ->
                runCatching { cm.unregisterNetworkCallback(old) }
            }
            onlineNetworkCallback=callback
            runCatching {
                cm.registerDefaultNetworkCallback(callback)
                val active=cm.activeNetwork
                maybeStartOnlineServices(active?.let { cm.getNetworkCapabilities(it) })
            }.onFailure {
                renderNetworkState(false,"狀態未知 • 本機功能正常")
            }
        },OfflineFirstRuntimeContract.BACKGROUND_NETWORK_DELAY_MS)
    }

    private fun rotaryMachinePrefs() = getSharedPreferences("aig_rotary_machine_profile", MODE_PRIVATE)

    private fun loadRotaryMachineProfile() {
        val prefs=rotaryMachinePrefs()
        fun readAxis(prefix:String):RotaryAxisMCodePair=when(prefs.getString(prefix+"_mode","UNCONFIGURED")){
            "PMC_AUTO" -> RotaryAxisMCodePair.controllerAutomatic(prefs.getBoolean(prefix+"_require_indexed_cut_lock",false))
            "EXPLICIT" -> {
                val lock=prefs.getInt(prefix+"_lock_m",-1)
                val unlock=prefs.getInt(prefix+"_unlock_m",-1)
                if(lock in 0..999 && unlock in 0..999 && lock!=unlock)
                    RotaryAxisMCodePair.explicit(lock,unlock,prefs.getBoolean(prefix+"_require_indexed_cut_lock",false))
                else RotaryAxisMCodePair.unconfigured()
            }
            else -> RotaryAxisMCodePair.unconfigured()
        }
        val g34Template=runCatching{
            G34VendorTemplate.valueOf(prefs.getString("g34_template","UNCONFIGURED") ?: "UNCONFIGURED")
        }.getOrDefault(G34VendorTemplate.UNCONFIGURED)
        val g34DefaultAngle=prefs.getString("g34_default_angle","90.0")?.toDoubleOrNull()?.takeIf{it.isFinite()} ?: 90.0
        rotaryClampProfile=RotaryAxisClampProfile.configured(
            axis4=readAxis("axis4"),
            axis5=readAxis("axis5"),
            installedOptionalCodes=RotaryAxisClampProfile.parseOptionalCodes(prefs.getString("optional_codes","").orEmpty()),
            g34VendorProfile=G34VendorProfile(g34Template,g34DefaultAngle)
        )
    }

    private fun saveRotaryMachineProfile(profile:RotaryAxisClampProfile) {
        val editor=rotaryMachinePrefs().edit().clear()
        fun writeAxis(prefix:String,axis:RotaryAxisMCodePair){
            editor.putBoolean(prefix+"_require_indexed_cut_lock",axis.requireClampForIndexedCutting)
            when {
                axis.controllerAutomatic -> editor.putString(prefix+"_mode","PMC_AUTO")
                axis.explicit -> editor.putString(prefix+"_mode","EXPLICIT")
                    .putInt(prefix+"_lock_m",axis.clampM!!)
                    .putInt(prefix+"_unlock_m",axis.unclampM!!)
                else -> editor.putString(prefix+"_mode","UNCONFIGURED")
            }
        }
        writeAxis("axis4",profile.axis4)
        writeAxis("axis5",profile.axis5)
        editor.putString("optional_codes",profile.optionalCodesCsv())
        editor.putString("g34_template",profile.g34VendorProfile.template.name)
        editor.putString("g34_default_angle",profile.g34VendorProfile.defaultStartAngleDeg.toString())
        editor.apply()
    }

    private fun currentRotaryOperationMode(): RotaryAxisOperationMode = when (machiningAxisMode) {
        "4AX" -> RotaryAxisOperationMode.INDEXED_4AX
        "5AX" -> RotaryAxisOperationMode.INDEXED_5AX
        else -> RotaryAxisOperationMode.NONE
    }

    private fun rotaryClampStatusText():String {
        fun axis(label:String,p:RotaryAxisMCodePair)=label+"="+when{
            p.controllerAutomatic -> "PMC_AUTO"
            p.explicit -> "M"+p.unclampM+" OPEN / M"+p.clampM+" LOCK"
            else -> "UNCONFIGURED"
        }
        return axis("4AX",rotaryClampProfile.axis4)+" • "+axis("5AX",rotaryClampProfile.axis5)+
            " • OPTIONS="+rotaryClampProfile.optionalCodesCsv().ifBlank{"NONE"}+
            " • G34="+rotaryClampProfile.g34VendorProfile.template.name
    }

    private fun currentUnifiedNcSourceSignature(): String {
        val raw = buildString {
            append(cad.exportState()).append('|')
            append(camSettings.toString()).append('|')
            append(workOffset).append('|')
            append(axisA).append('|').append(axisB).append('|')
            append(machiningAxisMode).append('|')
            listOf(rotaryClampProfile.axis4,rotaryClampProfile.axis5).forEach{axis->
                append(axis.controllerAutomatic).append('|')
                append(axis.clampM ?: -1).append('|')
                append(axis.unclampM ?: -1).append('|')
                append(axis.requireClampForIndexedCutting).append('|')
            }
            append(rotaryClampProfile.optionalCodesCsv()).append('|')
            append(rotaryClampProfile.g34VendorProfile.template.name).append('|')
            append(java.lang.Double.doubleToLongBits(rotaryClampProfile.g34VendorProfile.defaultStartAngleDeg)).append('|')
            append(controllerProfile.name).append('|')
            append(ncCoordinateMode.name).append('|')
            append(ncOriginTransformMode.name).append('|')
            append(ncCutterCompensation.name).append('|')
            append(ncCutterCompRegister).append('|')
            append(java.lang.Double.doubleToLongBits(ncCutterCompValueMm)).append('|')
            append(drillCycleBlock)
        }
        val digest = MessageDigest.getInstance("SHA-256").digest(raw.toByteArray(Charsets.UTF_8))
        return digest.joinToString("") { "%02x".format(it) }
    }

    private fun saveCadCheckpoint() {
        runCatching {
            val editor = getSharedPreferences("aig_cad_autosave", MODE_PRIVATE)
                .edit()
                .putString("cad_state", cad.exportState())
                .putLong("saved_at", System.currentTimeMillis())
                .putInt("format_version", 4)
                .putString("nc_controller", controllerProfile.name)
                .putString("nc_coordinate_mode", ncCoordinateMode.name)
                .putString("nc_origin_mode", ncOriginTransformMode.name)
                .putString("nc_cutter_comp", ncCutterCompensation.name)
                .putInt("nc_cutter_d_register", ncCutterCompRegister)
                .putLong("nc_cutter_d_value_bits", java.lang.Double.doubleToLongBits(ncCutterCompValueMm))
                .putString("nc_work_offset", workOffset)
            val draft = unifiedNcDraft
            if (draft.isNullOrBlank()) {
                editor.remove("nc_draft")
                    .remove("nc_source_signature")
                    .remove("nc_stale")
            } else {
                editor.putString("nc_draft", draft)
                    .putString("nc_source_signature", unifiedNcDraftSourceSignature ?: currentUnifiedNcSourceSignature())
                    .putBoolean("nc_stale", unifiedNcDraftStale)
            }
            editor.apply()
            val recovery=recoveryProjectFile()
            recovery.parentFile?.mkdirs()
            StudioProjectRepository.save(captureCurrentProject(),recovery)
        }
    }

    private fun restoreCadCheckpointIfAvailable() {
        val recovery=recoveryProjectFile()
        val local=localProjectFile()
        if(recovery.isFile && (!local.isFile || recovery.lastModified()>=local.lastModified())) {
            val restored=runCatching{StudioProjectRepository.load(recovery)}
            if(restored.isSuccess) {
                applyProjectPackage(restored.getOrThrow())
                Toast.makeText(
                    this,
                    "AUTO RECOVERY • PROJECT V3 • FIXTURE "+camFixtures.size+" • ABC RESTORED",
                    Toast.LENGTH_SHORT
                ).show()
                return
            }
        }
        val prefs = getSharedPreferences("aig_cad_autosave", MODE_PRIVATE)
        val raw = prefs.getString("cad_state", null) ?: return
        if (raw.isBlank()) return
        val formatVersion = prefs.getInt("format_version", 1)
        if (formatVersion !in 1..4) return
        runCatching { cad.importState(raw) }
            .onSuccess {
                if (formatVersion >= 4) {
                    controllerProfile = runCatching {
                        CncControllerProfile.valueOf(prefs.getString("nc_controller", CncControllerProfile.FANUC.name)!!)
                    }.getOrDefault(CncControllerProfile.FANUC)
                    ncCoordinateMode = runCatching {
                        NcCoordinateMode.valueOf(prefs.getString("nc_coordinate_mode", NcCoordinateMode.ABSOLUTE_G90.name)!!)
                    }.getOrDefault(NcCoordinateMode.ABSOLUTE_G90)
                    ncOriginTransformMode = runCatching {
                        NcOriginTransformMode.valueOf(prefs.getString("nc_origin_mode", NcOriginTransformMode.WORK_OFFSET_ONLY.name)!!)
                    }.getOrDefault(NcOriginTransformMode.WORK_OFFSET_ONLY)
                    ncCutterCompensation = runCatching {
                        CutterCompensationMode.valueOf(prefs.getString("nc_cutter_comp", CutterCompensationMode.CAM_GEOMETRY_G40.name)!!)
                    }.getOrDefault(CutterCompensationMode.CAM_GEOMETRY_G40)
                    ncCutterCompRegister = prefs.getInt("nc_cutter_d_register", 1).coerceIn(1,999)
                    ncCutterCompValueMm = java.lang.Double.longBitsToDouble(
                        prefs.getLong("nc_cutter_d_value_bits", java.lang.Double.doubleToLongBits(0.0))
                    ).takeIf { it.isFinite() } ?: 0.0
                    workOffset = prefs.getString("nc_work_offset", "G54")
                        ?.takeIf { Regex("G5[4-9]").matches(it) } ?: "G54"
                }
                if (formatVersion >= 3) {
                    unifiedNcDraft = prefs.getString("nc_draft", null)?.takeIf { it.isNotBlank() }
                    unifiedNcDraftSourceSignature = prefs.getString("nc_source_signature", null)
                    val sourceChanged = unifiedNcDraft != null &&
                        unifiedNcDraftSourceSignature != currentUnifiedNcSourceSignature()
                    unifiedNcDraftStale = prefs.getBoolean("nc_stale", false) || sourceChanged
                }
                val ncState = when {
                    unifiedNcDraft == null -> "NO NC DRAFT"
                    unifiedNcDraftStale -> "NC DRAFT STALE"
                    else -> "NC DRAFT RESTORED"
                }
                Toast.makeText(this, "AUTO RECOVERY • CAD restored • " + ncState, Toast.LENGTH_SHORT).show()
            }
    }

    private fun showThemePackDialog() {
        fun themeStatus(message:String) {
            if(::networkStateBadge.isInitialized) networkStateBadge.text=message
            else Toast.makeText(this,message,Toast.LENGTH_SHORT).show()
        }
        val plan=AiLayoutComposerContract.compose(
            resources.configuration.screenWidthDp.coerceAtLeast(1),
            resources.configuration.screenHeightDp.coerceAtLeast(1),
            getSharedPreferences("aig_environment",MODE_PRIVATE).getBoolean("left_handed_ui",false)
        )
        val box=LinearLayout(this).apply{
            orientation=LinearLayout.VERTICAL
            setPadding(dp(14),dp(10),dp(14),dp(8))
        }
        box.addView(TextView(this).apply{
            setTextColor(StudioProductionTheme.text)
            text="AI Layout Composer • "+plan.deviceClass+" • minTouch="+plan.minTouchDp+"dp\nTheme Pack 可熱切換；CAD/CAM/SIM/NC/座標/CNC安全核心不變。"
            textSize=12f
        })
        StudioThemePackRuntime.ids().forEach { id ->
            box.addView(Button(this).apply{
                text=(if(id==StudioThemePackRuntime.current.id)"✓ " else "")+StudioThemePackRuntime.name(id)
                isAllCaps=false
                setOnClickListener {
                    runCatching {
                        val applied=StudioThemePackRuntime.switchTo(id)
                        RgbGlowButton.refreshThemeAll()
                        window.decorView.setBackgroundColor(applied.background)
                        window.decorView.invalidate()
                        themeStatus("THEME HOT SWAP • "+applied.name+" • NO RESTART")
                    }.onFailure {
                        val restored=StudioThemePackRuntime.rollback()
                        RgbGlowButton.refreshThemeAll()
                        themeStatus("THEME ROLLBACK • "+restored.name+" • RUNTIME CONTINUES")
                    }
                }
            })
        }
        box.addView(Button(this).apply{
            text="AI 自動編排：啟用"
            isAllCaps=false
            setOnClickListener{
                getSharedPreferences("aig_environment",MODE_PRIVATE).edit()
                    .putBoolean("ai_layout_enabled",true).apply()
                themeStatus("AI LAYOUT ENABLED • "+plan.deviceClass+" • STABLE ORDER • NO CORE MUTATION")
            }
        })
        AlertDialog.Builder(this)
            .setTitle("UI 套裝 / AI 編排")
            .setView(box)
            .setPositiveButton("關閉",null)
            .show()
    }

    private fun showMaintenanceCenter() {
        val runtimeVersionName=runCatching {
            packageManager.getPackageInfo(packageName,0).versionName ?: "UNKNOWN"
        }.getOrDefault("UNKNOWN")
        val prefs=getSharedPreferences("aig_cad_autosave",MODE_PRIVATE)
        val checkpoint=prefs.getString("cad_state",null)
        val ncDraftState=prefs.getString("nc_draft",null)
        val networkText=if(::networkStateBadge.isInitialized) networkStateBadge.text.toString() else "網路 • 未初始化"
        val box=LinearLayout(this).apply{
            orientation=LinearLayout.VERTICAL
            setPadding(dp(14),dp(10),dp(14),dp(8))
        }
        box.addView(TextView(this).apply{
            setTextColor(0xFFE1EFFF.toInt())
            textSize=12.5f
            text=buildString{
                appendLine("AIG CNC "+runtimeVersionName+" • 正式 Runtime UI 內建維修")
                appendLine("BOOT="+IntegratedMaintenanceUiContract.DEFAULT_BOOT_TARGET+" • separate engineering shell=OFF")
                appendLine(networkText+" • 維修可離線")
                appendLine("RECOVERY="+if(!checkpoint.isNullOrBlank())"CAD READY" else "NONE"+
                    " • NC="+if(!ncDraftState.isNullOrBlank())"DRAFT" else "NONE")
                append("Master X0.000 Y0.000 Z0.000 • 0.001 mm")
            }
            setPadding(dp(4),dp(4),dp(4),dp(10))
        })
        fun action(label:String,run:()->Unit){
            box.addView(Button(this).apply{
                text=label
                isAllCaps=false
                setOnClickListener{run()}
            })
        }
        action("Recovery / AutoSave"){ restoreCadCheckpointIfAvailable() }
        action("系統監控 HUD"){ applySystemHudPreference(true); showExpandedSystemHud() }
        action("環境 / FPS / 溫度"){ showEnvironmentSettings() }
        action("UI 套裝 / AI 編排"){ showThemePackDialog() }
        action("Security"){ openCategory("安全"){showSecurityBranch()} }
        action("AI SYSTEM SUITE"){ showAiSystemSuiteDialog() }
        action("ChatGPT AI 更新"){ runSecureUpdateCheck() }
        AlertDialog.Builder(this)
            .setTitle("AIG CNC • 維修 / 診斷")
            .setView(box)
            .setPositiveButton("關閉",null)
            .show()
        Toast.makeText(this,"MAINTENANCE CENTER • PRODUCTION UI",Toast.LENGTH_SHORT).show()
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
                    camSettings = camSettings.copy(toolDiameter = value)
                }
            }
            cmd.contains("safe-z") || cmd.contains("safe z") || cmd.contains("安全高度") -> {
                val value = voiceNumber(cmd)
                if (value == null) speakVoice("Safe-Z 數值無效")
                else confirmVoiceAction("Safe-Z " + DisplayFormat.mm(value) + " mm") {
                    camSettings = camSettings.copy(safeZ = value)
                }
            }
            cmd.contains("深度") || cmd.contains("depth") -> {
                val value = voiceNumber(cmd)
                if (value == null) speakVoice("加工深度數值無效")
                else confirmVoiceAction("加工深度 " + DisplayFormat.mm(value) + " mm") {
                    camSettings = camSettings.copy(depth = value)
                }
            }
            cmd.contains("進給") || cmd.contains("feed") -> {
                val value = voiceNumber(cmd)
                if (value == null || value <= 0.0) speakVoice("Feed 數值無效")
                else confirmVoiceAction("Feed " + String.format("%.1f", value) + " mm/min") {
                    camSettings = camSettings.copy(feedMmMin = value)
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
        onlineNetworkCallback?.let { callback ->
            runCatching {
                val cm=getSystemService(CONNECTIVITY_SERVICE) as android.net.ConnectivityManager
                cm.unregisterNetworkCallback(callback)
            }
        }
        onlineNetworkCallback=null
        adaptiveRefreshController?.stop()
        adaptiveRefreshController = null
        autosaveHandler.removeCallbacks(autosaveRunnable)
        sharedProjectHandler.removeCallbacks(sharedProjectRunnable)
        sharedProjectScanRunning.set(false)
        sharedProjectExecutor.shutdownNow()
        onlineNetworkGeneration.incrementAndGet()
        onlineCapabilityDebounceToken.incrementAndGet()
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
        addToolToBranch("圓弧", Tool.ARC, 3)
        addToolToBranch("孔", Tool.HOLE, 4)
        addActionTo(branchFlow, "SNAP", 3) { cad.toggleSnap() }
        addToolToBranch("尺寸", Tool.MEASURE, 5)
    }
    private fun showViewBranch() {
        branchFlow.removeAllViews(); toolButtons.clear()
        addToolToBranch("平移", Tool.PAN, 0)
        addActionTo(branchFlow, "GRID", 2) { cad.toggleGrid() }
        addActionTo(branchFlow, "GEOMETRY", 1) { cad.toggleGeometry() }
        addActionTo(branchFlow, "SNAP", 3) { cad.toggleSnap() }
    }
    private fun showModifyBranch() {
        branchFlow.removeAllViews(); toolButtons.clear()
        addToolToBranch("選取", Tool.SELECT, 1)
        addActionTo(branchFlow, "移動", 0) { cad.promptMoveCopy(copy=false) }
        addActionTo(branchFlow, "複製", 1) { cad.promptMoveCopy(copy=true) }
        addActionTo(branchFlow, "旋轉", 2) { cad.promptRotate() }
        addActionTo(branchFlow, "鏡射 X", 3) { cad.mirrorSelected(vertical=true) }
        addActionTo(branchFlow, "鏡射 Y", 3) { cad.mirrorSelected(vertical=false) }
        addActionTo(branchFlow, "TRIM", 0) { cad.trimSelected() }
        addActionTo(branchFlow, "EXTEND", 1) { cad.extendSelected() }
        addActionTo(branchFlow, "OFFSET", 2) { cad.promptOffset() }
        addActionTo(branchFlow, "ARRAY", 3) { cad.promptArray() }
        addActionTo(branchFlow, "尺寸驅動", 5) { cad.promptDrivenDimension() }
        addActionTo(branchFlow, "刪除選取", 4) { cad.deleteSelected() }
        addToolToBranch("單點刪除", Tool.DELETE, 4)
    }
    private fun showLinkBranch() {
        branchFlow.removeAllViews(); toolButtons.clear()
        addToolToBranch("選取", Tool.SELECT, 1)
        addActionTo(branchFlow, "連接", 1) { cad.connectSelected() }
        addActionTo(branchFlow, "斷開", 4) { cad.disconnectSelected() }
        addActionTo(branchFlow, "全部斷開", 4) { cad.disconnectAllTopology() }
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
        addActionTo(branchFlow, "REAL CAM", 5) { showCamWorkstation() }
        addActionTo(branchFlow, "CAM 設定", 5) { showCamSettingsDialog() }
        addActionTo(branchFlow, "STOCK", 4) { showStockDialog() }
        addActionTo(branchFlow, "3D/3AX/4AX/5AX/6AX + NC", 0) { showUnifiedMachiningWorkspace("3D") }
        addActionTo(branchFlow, "NC EDIT", 0) { showUnifiedMachiningWorkspace("NC_EDIT") }
        addActionTo(branchFlow, "G54–G59", 3) { showWorkOffsetDialog() }
        addActionTo(branchFlow, "CONTROL", 5) { showControllerDialog() }
        addActionTo(branchFlow, "G81/G73/G83/G84", 2) { showDrillCycleDialog() }
        addActionTo(branchFlow, "3 AXIS", 3) { showUnifiedMachiningWorkspace("3AX") }
        addActionTo(branchFlow, "4 AXIS", 2) { showUnifiedMachiningWorkspace("4AX") }
        addActionTo(branchFlow, "5X A/B", 1) { showUnifiedMachiningWorkspace("5AX") }
        addActionTo(branchFlow, "6X A/B/C", 5) { showSixAxisRuntimeStage() }
        addActionTo(branchFlow, "3D 加工", 4) { showUnifiedMachiningWorkspace("3D") }
    }

    private fun showSixAxisRuntimeStage() {
        val snapshot=cad.snapshot()
        if(snapshot.entities.isEmpty() && camSettings.pathMode==CamPathMode.AUTO) {
            Toast.makeText(this,"6AX BLOCKED • AUTO 需要 CAD；MANUAL 可直接建立刀路",Toast.LENGTH_LONG).show()
            return
        }
        val stock=runCatching {
            Stock3D.fromSnapshot(
                snapshot,stockMarginMm,stockThicknessMm,
                if(camSettings.pathMode==CamPathMode.MANUAL)camSettings.manualPath else emptyList()
            )
        }.getOrElse {
            Toast.makeText(this,"6AX STOCK BLOCKED • "+(it.message?:"stock error"),Toast.LENGTH_LONG).show()
            return
        }
        var six=SixAxisRuntimeContract.state(axisA,axisB,axisC)
        val root=LinearLayout(this).apply {
            orientation=LinearLayout.VERTICAL
            setBackgroundColor(0xFF040A11.toInt())
            setPadding(dp(8),dp(8),dp(8),dp(8))
        }
        val status=TextView(this).apply {
            setTextColor(0xFF63FF9D.toInt())
            textSize=StudioDisplayPolicy.sp(this,10.5f)
            setPadding(dp(8),dp(6),dp(8),dp(6))
        }
        val stage=FrameLayout(this).apply { setBackgroundColor(0xFF06101A.toInt()) }
        root.addView(status,LinearLayout.LayoutParams(-1,-2))
        root.addView(stage,LinearLayout.LayoutParams(-1,dp(360)))

        fun rebuild() {
            val result=runCatching {
                Machining3DEngine.build(
                    snapshot,camSettings,stock,six.axisA,six.axisB,
                    fixtures=camFixtures,toolAssembly=camToolAssembly,axisC=six.axisC
                )
            }.getOrElse {
                status.setTextColor(0xFFFF6E6E.toInt())
                status.text="6AX SIM BLOCKED • "+(it.message?:"build error")
                return
            }
            stage.removeAllViews()
            stage.addView(Machining3DView(this,result,"6AX",six.axisC),FrameLayout.LayoutParams(-1,-1))
            stage.addView(object:View(this) {
                private val p=Paint(Paint.ANTI_ALIAS_FLAG).apply {
                    color=0xFF9F72FF.toInt()
                    style=Paint.Style.STROKE
                    strokeWidth=dp(3).toFloat()
                    strokeCap=Paint.Cap.ROUND
                }
                private val dot=Paint(Paint.ANTI_ALIAS_FLAG).apply {
                    color=0xFF27E9FF.toInt()
                    style=Paint.Style.FILL
                }
                override fun onDraw(canvas:Canvas) {
                    super.onDraw(canvas)
                    val c=Math.toRadians(six.axisC)
                    val cx=width*0.82f
                    val cy=height*0.18f
                    val r=dp(42).toFloat()
                    canvas.drawCircle(cx,cy,r,p)
                    val ex=cx+(kotlin.math.cos(c)*r).toFloat()
                    val ey=cy+(kotlin.math.sin(c)*r).toFloat()
                    canvas.drawLine(cx,cy,ex,ey,p)
                    canvas.drawCircle(ex,ey,dp(5).toFloat(),dot)
                }
            },FrameLayout.LayoutParams(-1,-1))
            val vector=SixAxisRuntimeContract.toolVector(1.0,six)
            status.setTextColor(0xFF63FF9D.toInt())
            status.text="6AX 姿態層 • A="+DisplayFormat.mm(six.axisA)+
                "° B="+DisplayFormat.mm(six.axisB)+"° C="+DisplayFormat.mm(six.axisC)+
                "° • TOOL VECTOR="+String.format(Locale.US,"%.3f,%.3f,%.3f",vector.x,vector.y,vector.z)+
                " • SIM=ACTIVE • NC="+SixAxisRuntimeContract.ncInterlockReason()
        }

        val controls=FlowLayout(this).apply { setPadding(dp(4),dp(6),dp(4),dp(4)) }
        fun axisButton(label:String,axis:Char,delta:Double) {
            controls.addView(RgbGlowButton(this).apply {
                text=label
                contentDescription="6AX "+label
                minHeight=dp(44)
                minimumWidth=dp(76)
                setRgbState(if(axis=='C')0xFF9F72FF.toInt() else 0xFF3DEBFF.toInt(),false)
                setOnClickListener {
                    six=SixAxisRuntimeContract.step(six,axis,delta)
                    axisA=six.axisA;axisB=six.axisB;axisC=six.axisC
                    rebuild()
                }
            })
        }
        axisButton("A−",'A',-5.0);axisButton("A+",'A',5.0)
        axisButton("B−",'B',-5.0);axisButton("B+",'B',5.0)
        axisButton("C−",'C',-15.0);axisButton("C+",'C',15.0)
        controls.addView(RgbGlowButton(this).apply {
            text="C0"
            contentDescription="6AX C ZERO"
            minHeight=dp(44);minimumWidth=dp(76)
            setRgbState(0xFF9F72FF.toInt(),false)
            setOnClickListener {
                six=SixAxisRuntimeContract.state(six.axisA,six.axisB,0.0)
                axisC=0.0
                rebuild()
            }
        })
        controls.addView(RgbGlowButton(this).apply {
            text="NC LOCK"
            contentDescription="6AX NC INTERLOCK"
            minHeight=dp(44);minimumWidth=dp(92)
            isEnabled=false
            setRgbState(0xFFFF465F.toInt(),false,true)
        })
        root.addView(controls,LinearLayout.LayoutParams(-1,-2))
        rebuild()
        AlertDialog.Builder(this)
            .setTitle("6AX • XYZ + A/B/C 姿態驗證")
            .setMessage("C 軸已進正式 Runtime 姿態層；未完成機台專屬 6AX kinematics / Post 驗證前，NC 輸出保持鎖定。")
            .setView(root)
            .setNegativeButton("關閉",null)
            .show()
    }

    private fun showCamWorkstation() {
        val snapshot = cad.snapshot()
        if (snapshot.entities.isEmpty() && camSettings.pathMode==CamPathMode.AUTO) {
            Toast.makeText(this, "REAL CAM BLOCKED • AUTO 模式需要 CAD；可切 MANUAL 直接編走刀", Toast.LENGTH_LONG).show()
            return
        }
        val cam = runCatching {
            CamModel.fromCad(System.currentTimeMillis(), snapshot, camSettings, axisA, axisB, axisC=axisC)
        }
            .getOrElse {
                Toast.makeText(this, "REAL CAM BLOCKED • " + (it.message ?: "CAM build error"), Toast.LENGTH_LONG).show()
                return
            }
        val stock = Stock3D.fromSnapshot(
            snapshot,stockMarginMm,stockThicknessMm,
            if(camSettings.pathMode==CamPathMode.MANUAL)camSettings.manualPath else emptyList()
        )
        val risk = MachiningRiskScanner.inspect(cam, stock, camFixtures, camToolAssembly)
        val post = FanucPostSettings(
            workOffset = workOffset,
            tool = 1,
            h = 1,
            spindle = 2300,
            axisA = axisA,
            axisB = axisB,
            controller = controllerProfile,
            coordinateMode = ncCoordinateMode,
            originTransformMode = ncOriginTransformMode,
            cutterCompensation = ncCutterCompensation,
            cutterCompRegister = ncCutterCompRegister,
            cutterCompValueMm = ncCutterCompValueMm,
            rotaryMode = currentRotaryOperationMode(),
            rotaryClampProfile = rotaryClampProfile
        )
        val ncReady = risk.ok && runCatching { CncPost.generate(cam, post) }.isSuccess
        val screenWidthDp = resources.configuration.screenWidthDp.coerceAtLeast(1)
        val layoutMode = CamWorkstationContract.layout(screenWidthDp)

        fun glass(stroke:Int): GradientDrawable = GradientDrawable(
            GradientDrawable.Orientation.TOP_BOTTOM,
            intArrayOf(0xEE0A1826.toInt(), 0xEE050B12.toInt())
        ).apply {
            cornerRadius = dp(12).toFloat()
            setStroke(dp(1), stroke)
        }
        fun textLine(value:String,color:Int=0xFFDDEBFA.toInt(),size:Float=11f):TextView =
            TextView(this).apply {
                text=value
                setTextColor(color)
                textSize=StudioDisplayPolicy.sp(this,size)
                setPadding(dp(8),dp(4),dp(8),dp(4))
            }

        val root = LinearLayout(this).apply {
            orientation=LinearLayout.VERTICAL
            setPadding(dp(8),dp(8),dp(8),dp(8))
            setBackgroundColor(LibraryFiveAxisSkin208.background)
        }
        root.addView(textLine(
            "AIG CNC • " + CamWorkstationContract.TITLE + " • " +
                CamWorkstationContract.SAFE_Z + " " + DisplayFormat.mm(cam.settings.safeZ) + " • " +
                CamWorkstationContract.TOOL_RADIUS + " " + DisplayFormat.mm(cam.settings.toolDiameter/2.0) + " • " +
                workOffset,
            LibraryFiveAxisSkin208.cyan, 12.5f
        ).apply {
            setTypeface(typeface,android.graphics.Typeface.BOLD)
            background=glass(LibraryFiveAxisSkin208.cyan)
        })
        root.addView(textLine(
            CamWorkstationContract.CAM_READY + " • " + CamWorkstationContract.TOOLPATH_FRESH +
                " • NC " + (if(ncReady)"READY" else "BLOCKED"),
            if(ncReady)LibraryFiveAxisSkin208.safe else LibraryFiveAxisSkin208.warning,10.5f
        ))

        val body = LinearLayout(this).apply {
            orientation=if(layoutMode==CamWorkstationContract.Layout.MOBILE_COMPACT)
                LinearLayout.VERTICAL else LinearLayout.HORIZONTAL
        }

        val preview = object: View(this) {
            private val linePaint=Paint(Paint.ANTI_ALIAS_FLAG).apply {
                style=Paint.Style.STROKE
                strokeCap=Paint.Cap.ROUND
            }
            private val fillPaint=Paint(Paint.ANTI_ALIAS_FLAG).apply { style=Paint.Style.FILL }
            override fun onDraw(canvas:Canvas) {
                super.onDraw(canvas)
                canvas.drawColor(LibraryFiveAxisSkin208.background)
                val moves=cam.toolpaths.flatMap{it.moves}
                if(moves.isEmpty()) return
                val minX=minOf(stock.minX,moves.minOf{it.to.x})
                val maxX=maxOf(stock.maxX,moves.maxOf{it.to.x})
                val minY=minOf(stock.minY,moves.minOf{it.to.y})
                val maxY=maxOf(stock.maxY,moves.maxOf{it.to.y})
                val spanX=(maxX-minX).coerceAtLeast(1.0)
                val spanY=(maxY-minY).coerceAtLeast(1.0)
                val pad=dp(24).toFloat()
                fun sx(x:Double)=pad+((x-minX)/spanX*(width-2*pad)).toFloat()
                fun sy(y:Double)=height-pad-((y-minY)/spanY*(height-2*pad)).toFloat()

                fillPaint.color=0x223B82F6
                canvas.drawRect(sx(stock.minX),sy(stock.maxY),sx(stock.maxX),sy(stock.minY),fillPaint)
                linePaint.color=0x663B82F6
                linePaint.strokeWidth=dp(1).toFloat()
                canvas.drawRect(sx(stock.minX),sy(stock.maxY),sx(stock.maxX),sy(stock.minY),linePaint)

                cam.toolpaths.forEach { path ->
                    val list=path.moves
                    for(i in 1 until list.size) {
                        val a=list[i-1]
                        val b=list[i]
                        // TOOLPATH_RGB_GLOW_250: visual-only dual-pass neon path; CAM geometry is untouched.
                        val rgb=if(b.rapid)LibraryFiveAxisSkin208.cyan else LibraryFiveAxisSkin208.safe
                        linePaint.color=Color.argb(if(b.rapid)42 else 54,Color.red(rgb),Color.green(rgb),Color.blue(rgb))
                        linePaint.strokeWidth=dp(if(b.rapid)7 else 9).toFloat()
                        canvas.drawLine(sx(a.to.x),sy(a.to.y),sx(b.to.x),sy(b.to.y),linePaint)
                        linePaint.color=rgb
                        linePaint.strokeWidth=dp(if(b.rapid)2 else 3).toFloat()
                        canvas.drawLine(sx(a.to.x),sy(a.to.y),sx(b.to.x),sy(b.to.y),linePaint)
                    }
                }
                val last=moves.last()
                fillPaint.color=LibraryFiveAxisSkin208.safe
                canvas.drawCircle(sx(last.to.x),sy(last.to.y),dp(5).toFloat(),fillPaint)

                linePaint.color=0x66FFFFFF
                linePaint.strokeWidth=dp(1).toFloat()
                canvas.drawLine(pad,sy(0.0),width-pad,sy(0.0),linePaint)
                canvas.drawLine(sx(0.0),pad,sx(0.0),height-pad,linePaint)
            }
        }.apply {
            background=glass(LibraryFiveAxisSkin208.cyan)
        }

        val parameters=LinearLayout(this).apply {
            orientation=LinearLayout.VERTICAL
            background=glass(LibraryFiveAxisSkin208.violet)
            setPadding(dp(6),dp(6),dp(6),dp(6))
        }
        fun param(label:String,value:String,color:Int=0xFFDDEBFA.toInt()) {
            parameters.addView(textLine(label + "  " + value,color,10.5f))
        }
        param("TOOL DIA",DisplayFormat.mm(cam.settings.toolDiameter)+" mm")
        param("TOOL RADIUS",DisplayFormat.mm(cam.settings.toolDiameter/2.0)+" mm",LibraryFiveAxisSkin208.cyan)
        param("DEPTH",DisplayFormat.mm(cam.settings.depth)+" mm")
        param("SAFE-Z",DisplayFormat.mm(cam.settings.safeZ)+" mm",LibraryFiveAxisSkin208.safe)
        param("FEED",DisplayFormat.mm(cam.settings.feedMmMin)+" mm/min")
        param("SPINDLE","2300 RPM • POST")
        param("WORK OFFSET",workOffset,LibraryFiveAxisSkin208.warning)
        param("LEAD-IN",DisplayFormat.mm(cam.settings.leadInMm)+" mm")
        param("LEAD-OUT",DisplayFormat.mm(cam.settings.leadOutMm)+" mm")
        param("CAM SOURCE",cam.settings.pathMode.name,if(cam.settings.pathMode==CamPathMode.MANUAL)LibraryFiveAxisSkin208.warning else LibraryFiveAxisSkin208.cyan)
        param("CONTOUR SIDE",if(cam.settings.contourSide==ContourSide.OUTSIDE)"外徑 / OUTSIDE" else "內徑 / INSIDE",LibraryFiveAxisSkin208.warning)
        param("PATH DIRECTION",cam.settings.contourDirection.name,LibraryFiveAxisSkin208.cyan)
        param("TOOLPATH STATUS","FRESH • paths="+cam.toolpaths.size)
        param("MACHINING REGION","STOCK XY")

        val legend=LinearLayout(this).apply { orientation=LinearLayout.HORIZONTAL }
        legend.addView(textLine("● G0 RAPID",LibraryFiveAxisSkin208.cyan,9.5f),LinearLayout.LayoutParams(0,-2,1f))
        legend.addView(textLine("● CUTTING RGB",LibraryFiveAxisSkin208.safe,9.5f),LinearLayout.LayoutParams(0,-2,1f))
        legend.addView(textLine("● TOOL",LibraryFiveAxisSkin208.safe,9.5f),LinearLayout.LayoutParams(0,-2,1f))
        parameters.addView(legend)

        if(layoutMode==CamWorkstationContract.Layout.MOBILE_COMPACT) {
            body.addView(preview,LinearLayout.LayoutParams(-1,dp(300)))
            body.addView(android.widget.ScrollView(this).apply { addView(parameters) },
                LinearLayout.LayoutParams(-1,dp(230)))
        } else {
            body.addView(preview,LinearLayout.LayoutParams(0,dp(520),1f))
            body.addView(android.widget.ScrollView(this).apply { addView(parameters) },
                LinearLayout.LayoutParams(dp(310),dp(520)))
        }
        root.addView(body,LinearLayout.LayoutParams(-1,-2))

        root.addView(textLine(
            "CAM " + (if(risk.ok)"SAFE" else "WARNING") +
                " • COLLISION " + risk.collisionCount +
                " • OVERCUT " + risk.overcutCount +
                " • FIXTURE=" + risk.fixtureCoverageWord +
                " • " + CamWorkstationContract.MAKE_IT_REAL,
            if(risk.ok)LibraryFiveAxisSkin208.safe else StudioProductionTheme.alarm,10f
        ).apply { background=glass(if(risk.ok)0x5563FF9D else 0x88FF5252.toInt()) })

        lateinit var dialog:AlertDialog
        val sourceControls=LinearLayout(this).apply { orientation=LinearLayout.HORIZONTAL }
        fun sourceChoice(label:String,selected:Boolean,run:()->Unit) {
            sourceControls.addView(RgbGlowButton(this).apply {
                text=label
                contentDescription="CAM SOURCE "+label
                setRgbState(if(selected)LibraryFiveAxisSkin208.safe else LibraryFiveAxisSkin208.cyan,selected)
                minHeight=dp(44)
                minimumWidth=dp(88)
                setOnClickListener {
                    runCatching{run()}.onSuccess{
                        markProjectDirty()
                        dialog.dismiss()
                        showCamWorkstation()
                    }.onFailure{
                        Toast.makeText(this@MainActivity,"CAM SOURCE BLOCKED • "+(it.message?:"error"),Toast.LENGTH_LONG).show()
                    }
                }
            },LinearLayout.LayoutParams(0,-2,1f))
        }
        sourceChoice("AUTO",camSettings.pathMode==CamPathMode.AUTO) {
            camSettings=ManualCamPathEngine.useAuto(camSettings)
        }
        sourceChoice("手動",camSettings.pathMode==CamPathMode.MANUAL) {
            if(camSettings.manualPath.isEmpty()) {
                val snap=cad.snapshot()
                camSettings=if(snap.entities.isNotEmpty()) {
                    val auto=CamModel.fromCad(
                        System.currentTimeMillis(),snap,
                        camSettings.copy(pathMode=CamPathMode.AUTO)
                    )
                    ManualCamPathEngine.adoptAuto(auto)
                } else {
                    ManualCamPathEngine.startBlank(camSettings,0.0,0.0)
                }
            } else {
                camSettings=ManualCamPathEngine.useManual(camSettings)
            }
        }
        sourceControls.addView(RgbGlowButton(this).apply {
            text="路徑編輯"
            contentDescription="CAM MANUAL PATH EDIT"
            setRgbState(LibraryFiveAxisSkin208.warning,camSettings.pathMode==CamPathMode.MANUAL)
            minHeight=dp(44)
            minimumWidth=dp(104)
            setOnClickListener {
                dialog.dismiss()
                showManualCamPathEditor()
            }
        },LinearLayout.LayoutParams(0,-2,1f))
        root.addView(sourceControls,LinearLayout.LayoutParams(-1,-2))

        val safetyControls=LinearLayout(this).apply { orientation=LinearLayout.HORIZONTAL }
        safetyControls.addView(RgbGlowButton(this).apply {
            text="治具模型"
            contentDescription="CAM FIXTURE MODEL EDITOR"
            setRgbState(LibraryFiveAxisSkin208.warning,camFixtures.isNotEmpty())
            minHeight=dp(44);minimumWidth=dp(112)
            setOnClickListener {
                dialog.dismiss()
                showFixtureModelEditor()
            }
        },LinearLayout.LayoutParams(0,-2,1f))
        safetyControls.addView(RgbGlowButton(this).apply {
            text="刀具總成"
            contentDescription="CAM TOOL ASSEMBLY EDITOR"
            setRgbState(LibraryFiveAxisSkin208.violet,true)
            minHeight=dp(44);minimumWidth=dp(112)
            setOnClickListener {
                dialog.dismiss()
                showToolAssemblyEditor()
            }
        },LinearLayout.LayoutParams(0,-2,1f))
        safetyControls.addView(RgbGlowButton(this).apply {
            text="碰撞預測"
            contentDescription="CAM COLLISION LOOKAHEAD"
            setRgbState(0xFFFF6E6E.toInt(),false)
            minHeight=dp(44);minimumWidth=dp(112)
            setOnClickListener { showCollisionLookAheadDialog() }
        },LinearLayout.LayoutParams(0,-2,1f))
        root.addView(safetyControls,LinearLayout.LayoutParams(-1,-2))

        val contourControls=LinearLayout(this).apply { orientation=LinearLayout.HORIZONTAL }
        fun contourChoice(label:String,selected:Boolean,accent:Int,run:()->Unit) {
            contourControls.addView(RgbGlowButton(this).apply {
                text=label
                contentDescription="CAM "+label
                setRgbState(accent,selected)
                minHeight=dp(44)
                minimumWidth=dp(76)
                maxLines=1
                setOnClickListener {
                    run()
                    markProjectDirty()
                    dialog.dismiss()
                    showCamWorkstation()
                }
            },LinearLayout.LayoutParams(0,-2,1f))
        }
        contourChoice("外徑",camSettings.contourSide==ContourSide.OUTSIDE,LibraryFiveAxisSkin208.warning) {
            camSettings=camSettings.copy(contourSide=ContourSide.OUTSIDE)
        }
        contourChoice("內徑",camSettings.contourSide==ContourSide.INSIDE,LibraryFiveAxisSkin208.warning) {
            camSettings=camSettings.copy(contourSide=ContourSide.INSIDE)
        }
        contourChoice("CCW",camSettings.contourDirection==ContourDirection.CCW,LibraryFiveAxisSkin208.cyan) {
            camSettings=camSettings.copy(
                climb=true,
                contourDirection=ContourDirection.CCW
            )
        }
        contourChoice("CW",camSettings.contourDirection==ContourDirection.CW,LibraryFiveAxisSkin208.cyan) {
            camSettings=camSettings.copy(
                climb=false,
                contourDirection=ContourDirection.CW
            )
        }
        root.addView(contourControls,LinearLayout.LayoutParams(-1,-2))

        val actions=LinearLayout(this).apply { orientation=LinearLayout.HORIZONTAL }
        fun action(label:String,accent:Int,block:()->Unit) {
            val b=RgbGlowButton(this).apply {
                text=label
                setRgbState(accent,false)
                minHeight=dp(44)
                minimumWidth=dp(CamWorkstationContract.buttonMinWidthDp(layoutMode,label))
                if(Build.VERSION.SDK_INT>=26) {
                    setAutoSizeTextTypeUniformWithConfiguration(
                        9, CamWorkstationContract.adaptiveTextSp(label,screenWidthDp).toInt().coerceAtLeast(10),
                        1, android.util.TypedValue.COMPLEX_UNIT_SP
                    )
                }
                setOnClickListener { block() }
            }
            actions.addView(b,LinearLayout.LayoutParams(0,-2,1f))
        }
        action("重算",LibraryFiveAxisSkin208.cyan) {
            dialog.dismiss()
            showCamWorkstation()
        }
        action("設定",LibraryFiveAxisSkin208.violet) { showCamSettingsDialog() }
        action("偏置",LibraryFiveAxisSkin208.warning) { showWorkOffsetDialog() }
        action("3D",0xFF22C55E.toInt()) { showMachining3D() }
        action("NC",0xFF3B82F6.toInt()) { showNcEditDialog() }
        action("←",0xFF7894A8.toInt()) { dialog.dismiss() }
        root.addView(actions,LinearLayout.LayoutParams(-1,-2))

        dialog=AlertDialog.Builder(this)
            .setTitle("AIG CNC • REAL CAM")
            .setView(root)
            .create()
        dialog.show()
    }

    private fun showToolAssemblyEditor() {
        val root=LinearLayout(this).apply {
            orientation=LinearLayout.VERTICAL
            setPadding(dp(12),dp(8),dp(12),dp(6))
        }
        fun field(title:String,value:Double)=EditText(this).apply{
            hint=title
            setText(DisplayFormat.mm(value))
            inputType=InputType.TYPE_CLASS_NUMBER or InputType.TYPE_NUMBER_FLAG_DECIMAL
            root.addView(this)
        }
        root.addView(TextView(this).apply{
            text="刀具總成尺寸會直接進 CAM/SIM/5AX/6AX 刀把碰撞判定；單位 mm"
            setTextColor(LibraryFiveAxisSkin208.warning);textSize=11f
        })
        val holderDiameter=field("刀把直徑",camToolAssembly.holderDiameter)
        val holderLength=field("刀把長度",camToolAssembly.holderLength)
        val stickout=field("刀具伸出量",camToolAssembly.stickout)
        AlertDialog.Builder(this)
            .setTitle("CAM • 刀具總成")
            .setView(root)
            .setPositiveButton("套用"){_,_->
                runCatching{
                    ToolAssemblyConfig(
                        holderDiameter=holderDiameter.text.toString().toDouble(),
                        holderLength=holderLength.text.toString().toDouble(),
                        stickout=stickout.text.toString().toDouble()
                    )
                }.onSuccess{
                    camToolAssembly=it
                    sharedLocalDirty.set(true)
                    Toast.makeText(
                        this,
                        "TOOL ASSEMBLY • Ø"+DisplayFormat.mm(it.holderDiameter)+
                            " L"+DisplayFormat.mm(it.holderLength)+
                            " STICKOUT "+DisplayFormat.mm(it.stickout)+" • REVALIDATE REQUIRED",
                        Toast.LENGTH_LONG
                    ).show()
                }.onFailure{
                    Toast.makeText(this,"TOOL ASSEMBLY BLOCKED • "+(it.message?:"error"),Toast.LENGTH_LONG).show()
                }
            }
            .setNegativeButton("取消",null)
            .show()
    }

    private fun showFixtureModelEditor() {
        val root=LinearLayout(this).apply {
            orientation=LinearLayout.VERTICAL
            setPadding(dp(12),dp(8),dp(12),dp(6))
        }
        val selector=Spinner(this)
        val kinds=FixtureKind.values().map{it.name}
        val kind=Spinner(this).apply {
            adapter=ArrayAdapter(this@MainActivity,android.R.layout.simple_spinner_dropdown_item,kinds)
        }
        root.addView(TextView(this).apply{
            text="夾具 / 壓板 / 虎鉗 / 機台包絡 • XYZ 為 Master Origin 絕對座標"
            setTextColor(LibraryFiveAxisSkin208.warning);textSize=11f
        })
        root.addView(selector)
        root.addView(kind)

        fun field(title:String,initial:String="0.000")=EditText(this).apply{
            hint=title;setText(initial)
            inputType=InputType.TYPE_CLASS_NUMBER or InputType.TYPE_NUMBER_FLAG_DECIMAL or InputType.TYPE_NUMBER_FLAG_SIGNED
            root.addView(this)
        }
        val minX=field("min X")
        val minY=field("min Y")
        val minZ=field("min Z")
        val maxX=field("max X","10.000")
        val maxY=field("max Y","10.000")
        val maxZ=field("max Z","10.000")
        val clearance=field("clearance mm","1.000")

        fun label(f:FixtureObstacle)=f.label()+" • X["+DisplayFormat.mm(f.minX)+","+DisplayFormat.mm(f.maxX)+
            "] Y["+DisplayFormat.mm(f.minY)+","+DisplayFormat.mm(f.maxY)+"] Z["+
            DisplayFormat.mm(f.minZ)+","+DisplayFormat.mm(f.maxZ)+"]"

        fun refresh(select:Int=0) {
            selector.adapter=ArrayAdapter(
                this,android.R.layout.simple_spinner_dropdown_item,
                if(camFixtures.isEmpty()) listOf("尚未建立治具模型") else camFixtures.map(::label)
            )
            if(camFixtures.isNotEmpty()) selector.setSelection(select.coerceIn(0,camFixtures.lastIndex))
        }

        fun load(index:Int) {
            val f=camFixtures.getOrNull(index) ?: return
            kind.setSelection(FixtureKind.values().indexOf(f.kind).coerceAtLeast(0))
            minX.setText(DisplayFormat.mm(f.minX));minY.setText(DisplayFormat.mm(f.minY));minZ.setText(DisplayFormat.mm(f.minZ))
            maxX.setText(DisplayFormat.mm(f.maxX));maxY.setText(DisplayFormat.mm(f.maxY));maxZ.setText(DisplayFormat.mm(f.maxZ))
            clearance.setText(DisplayFormat.mm(f.clearanceMm))
        }

        selector.onItemSelectedListener=object:android.widget.AdapterView.OnItemSelectedListener {
            override fun onItemSelected(parent:android.widget.AdapterView<*>?,view:View?,position:Int,id:Long){load(position)}
            override fun onNothingSelected(parent:android.widget.AdapterView<*>?){}
        }
        refresh()
        if(camFixtures.isNotEmpty()) load(0)

        val buttons=LinearLayout(this).apply{orientation=LinearLayout.HORIZONTAL}
        fun action(label:String,run:()->Unit){
            buttons.addView(RgbGlowButton(this).apply{
                text=label;minHeight=dp(44);setRgbState(LibraryFiveAxisSkin208.cyan,false)
                setOnClickListener{run()}
            },LinearLayout.LayoutParams(0,-2,1f))
        }
        fun buildFixture(id:Long)=FixtureObstacle(
            id=id,
            kind=FixtureKind.valueOf(kind.selectedItem.toString()),
            minX=minX.text.toString().toDouble(),minY=minY.text.toString().toDouble(),minZ=minZ.text.toString().toDouble(),
            maxX=maxX.text.toString().toDouble(),maxY=maxY.text.toString().toDouble(),maxZ=maxZ.text.toString().toDouble(),
            clearanceMm=clearance.text.toString().toDouble()
        )
        action("新增"){
            runCatching{
                val f=buildFixture(nextCamFixtureId++)
                camFixtures.add(f)
                sharedLocalDirty.set(true)
                refresh(camFixtures.lastIndex);load(camFixtures.lastIndex)
            }.onFailure{Toast.makeText(this,"FIXTURE BLOCKED • "+(it.message?:"error"),Toast.LENGTH_LONG).show()}
        }
        action("更新"){
            val i=selector.selectedItemPosition
            val old=camFixtures.getOrNull(i)
            if(old==null) Toast.makeText(this,"尚無治具可更新",Toast.LENGTH_SHORT).show()
            else runCatching{
                camFixtures[i]=buildFixture(old.id)
                sharedLocalDirty.set(true)
                refresh(i);load(i)
            }.onFailure{Toast.makeText(this,"FIXTURE UPDATE BLOCKED • "+(it.message?:"error"),Toast.LENGTH_LONG).show()}
        }
        action("刪除"){
            val i=selector.selectedItemPosition
            if(i in camFixtures.indices) {
                camFixtures.removeAt(i)
                sharedLocalDirty.set(true)
                refresh(i.coerceAtMost((camFixtures.size-1).coerceAtLeast(0)))
                Toast.makeText(this,"FIXTURE REMOVED • 剩餘 "+camFixtures.size,Toast.LENGTH_SHORT).show()
            }
        }
        root.addView(buttons)

        AlertDialog.Builder(this)
            .setTitle("CAM • 治具 / 機台包絡")
            .setMessage("模型資料會進 CAM/SIM/6AX 碰撞檢查；不會自動修改 NC。")
            .setView(root)
            .setPositiveButton("碰撞預測"){_,_->showCollisionLookAheadDialog()}
            .setNegativeButton("關閉",null)
            .show()
    }

    private fun showCollisionLookAheadDialog() {
        if(camFixtures.isEmpty()) {
            Toast.makeText(this,"碰撞預測：請先建立治具或 MACHINE_ENVELOPE",Toast.LENGTH_LONG).show()
            return
        }
        val snapshot=cad.snapshot()
        if(snapshot.entities.isEmpty() && camSettings.pathMode==CamPathMode.AUTO) {
            Toast.makeText(this,"碰撞預測 BLOCKED • AUTO 需要 CAD；MANUAL 可直接預測",Toast.LENGTH_LONG).show()
            return
        }
        val cam=runCatching {
            CamModel.fromCad(System.currentTimeMillis(),snapshot,camSettings,axisA,axisB,axisC=axisC)
        }.getOrElse {
            Toast.makeText(this,"LOOKAHEAD BLOCKED • "+(it.message?:"CAM error"),Toast.LENGTH_LONG).show()
            return
        }
        val stock=runCatching {
            Stock3D.fromSnapshot(
                snapshot,stockMarginMm,stockThicknessMm,
                if(camSettings.pathMode==CamPathMode.MANUAL)camSettings.manualPath else emptyList()
            )
        }.getOrElse {
            Toast.makeText(this,"LOOKAHEAD STOCK BLOCKED • "+(it.message?:"stock error"),Toast.LENGTH_LONG).show()
            return
        }
        val report=MachiningRiskScanner.predictLookAhead(
            cam,stock,camFixtures,camToolAssembly,lookAheadSegments=8
        )
        val message=if(report.clear) {
            "未在前 "+report.horizonSegments+" 段偵測到已建模碰撞 • 仍需完整 SIM / 實機單節驗證"
        } else buildString {
            append("第一風險段 S").append((report.firstRiskSegment ?: 0)+1)
            append(" • 候選必須手動確認並重驗\n\n")
            report.predictions.take(12).forEach { p ->
                append("S").append(p.segmentIndex+1).append(" • ").append(p.action.name)
                p.suggestedLiftZ?.let{append(" • Z≥").append(DisplayFormat.mm(it))}
                append("\n").append(p.reason)
                append(" • A").append(DisplayFormat.mm(p.axisA))
                append(" B").append(DisplayFormat.mm(p.axisB))
                append(" C").append(DisplayFormat.mm(p.axisC)).append("\n\n")
            }
        }
        AlertDialog.Builder(this)
            .setTitle("CAM • 碰撞 Look-Ahead")
            .setMessage(message)
            .setPositiveButton("路徑編輯"){_,_->showManualCamPathEditor()}
            .setNegativeButton("關閉",null)
            .show()
    }

    private fun showManualCamPathEditor() {
        runCatching {
            if(camSettings.manualPath.isEmpty()) {
                val snapshot=cad.snapshot()
                camSettings=if(snapshot.entities.isNotEmpty()) {
                    val auto=CamModel.fromCad(
                        System.currentTimeMillis(),snapshot,
                        camSettings.copy(pathMode=CamPathMode.AUTO)
                    )
                    ManualCamPathEngine.adoptAuto(auto)
                } else {
                    ManualCamPathEngine.startBlank(camSettings,0.0,0.0)
                }
            } else {
                camSettings=ManualCamPathEngine.useManual(camSettings)
            }
        }.onFailure {
            Toast.makeText(this,"MANUAL CAM BLOCKED • "+(it.message?:"error"),Toast.LENGTH_LONG).show()
            return
        }
        markProjectDirty()

        val root=LinearLayout(this).apply {
            orientation=LinearLayout.VERTICAL
            setPadding(dp(12),dp(8),dp(12),dp(6))
        }
        val selector=Spinner(this)
        fun label(index:Int,p:ManualCamPoint)=
            "P"+(index+1)+" • "+(if(p.rapid)"G0" else if(p.arcI!=null)"ARC" else "G1")+
                " • X"+DisplayFormat.mm(p.x)+" Y"+DisplayFormat.mm(p.y)+" Z"+DisplayFormat.mm(p.z)
        fun refresh(select:Int=0) {
            selector.adapter=ArrayAdapter(
                this,android.R.layout.simple_spinner_dropdown_item,
                camSettings.manualPath.mapIndexed(::label)
            )
            if(camSettings.manualPath.isNotEmpty()) {
                selector.setSelection(select.coerceIn(0,camSettings.manualPath.lastIndex))
            }
        }
        refresh()
        root.addView(selector)

        fun field(title:String):EditText=EditText(this).apply {
            hint=title
            inputType=InputType.TYPE_CLASS_NUMBER or InputType.TYPE_NUMBER_FLAG_DECIMAL or InputType.TYPE_NUMBER_FLAG_SIGNED
            root.addView(this)
        }
        val x=field("X mm")
        val y=field("Y mm")
        val z=field("Z mm")
        val rapid=CheckBox(this).apply { text="G0 / 抬刀或快速移動"; root.addView(this) }

        fun load() {
            val p=camSettings.manualPath.getOrNull(selector.selectedItemPosition) ?: return
            x.setText(DisplayFormat.mm(p.x));y.setText(DisplayFormat.mm(p.y));z.setText(DisplayFormat.mm(p.z))
            rapid.isChecked=p.rapid
        }
        selector.onItemSelectedListener=object:android.widget.AdapterView.OnItemSelectedListener {
            override fun onItemSelected(parent:android.widget.AdapterView<*>?,view:View?,position:Int,id:Long){load()}
            override fun onNothingSelected(parent:android.widget.AdapterView<*>?){}
        }
        load()

        root.addView(TextView(this).apply{
            text="MANUAL 優先 • 節點 X/Y/Z 不綁 CAD • G0 必須 ≥ Safe-Z • 用抬刀/落刀避開夾具與壓板"
            setTextColor(LibraryFiveAxisSkin208.warning);textSize=11f
        })

        lateinit var dialog:AlertDialog
        val row=LinearLayout(this).apply{orientation=LinearLayout.HORIZONTAL}
        fun action(label:String,run:()->Unit){
            row.addView(RgbGlowButton(this).apply{
                text=label;setRgbState(LibraryFiveAxisSkin208.cyan,false);minHeight=dp(44)
                setOnClickListener{run()}
            },LinearLayout.LayoutParams(0,-2,1f))
        }
        action("套用節點"){
            val i=selector.selectedItemPosition
            runCatching{
                camSettings=ManualCamPathEngine.replacePoint(
                    camSettings,i,x.text.toString().toDouble(),y.text.toString().toDouble(),
                    z.text.toString().toDouble(),rapid.isChecked
                )
                CamModel.fromCad(System.currentTimeMillis(),cad.snapshot(),camSettings)
            }.onSuccess{
                markProjectDirty()
                Toast.makeText(this,"MANUAL CAM POINT PASS • P"+(i+1),Toast.LENGTH_SHORT).show()
                refresh(i);load()
            }.onFailure{Toast.makeText(this,"POINT BLOCKED • "+(it.message?:"error"),Toast.LENGTH_LONG).show()}
        }
        action("新增切削點"){
            val i=selector.selectedItemPosition
            val p=camSettings.manualPath.getOrNull(i) ?: return@action
            runCatching{
                camSettings=ManualCamPathEngine.insertPoint(
                    camSettings,i+1,
                    ManualCamPoint(p.x,p.y,camSettings.depth,false,axisA=p.axisA,axisB=p.axisB)
                )
            }.onSuccess{markProjectDirty();refresh(i+1);load()}
                .onFailure{Toast.makeText(this,"INSERT BLOCKED • "+(it.message?:"error"),Toast.LENGTH_LONG).show()}
        }
        action("插入避讓"){
            val i=selector.selectedItemPosition
            val current=camSettings.manualPath.getOrNull(i) ?: return@action
            val next=camSettings.manualPath.getOrNull(i+1) ?: current
            val box=LinearLayout(this).apply{orientation=LinearLayout.VERTICAL;setPadding(dp(12),dp(6),dp(12),dp(4))}
            fun f(title:String,value:Double)=EditText(this).apply{
                hint=title;setText(DisplayFormat.mm(value))
                inputType=InputType.TYPE_CLASS_NUMBER or InputType.TYPE_NUMBER_FLAG_DECIMAL or InputType.TYPE_NUMBER_FLAG_SIGNED
                box.addView(this)
            }
            val lift=f("抬刀 Z / Safe-Z",camSettings.safeZ)
            val lx=f("落刀 X",next.x)
            val ly=f("落刀 Y",next.y)
            val lz=f("落刀 Z",if(next.rapid)camSettings.depth else next.z)
            AlertDialog.Builder(this)
                .setTitle("夾具／壓板避讓")
                .setMessage("原位抬刀 → Safe-Z 快移 → 指定 XY 落刀")
                .setView(box)
                .setPositiveButton("插入"){_,_->
                    runCatching{
                        camSettings=ManualCamPathEngine.insertAvoidance(
                            camSettings,i,lift.text.toString().toDouble(),
                            lx.text.toString().toDouble(),ly.text.toString().toDouble(),lz.text.toString().toDouble()
                        )
                    }.onSuccess{markProjectDirty();refresh(i+3);load()}
                        .onFailure{Toast.makeText(this,"AVOIDANCE BLOCKED • "+(it.message?:"error"),Toast.LENGTH_LONG).show()}
                }
                .setNegativeButton("取消",null)
                .show()
        }
        action("刪除"){
            val i=selector.selectedItemPosition
            runCatching{camSettings=ManualCamPathEngine.deletePoint(camSettings,i)}
                .onSuccess{markProjectDirty();refresh(i.coerceAtMost(camSettings.manualPath.lastIndex));load()}
                .onFailure{Toast.makeText(this,"DELETE BLOCKED • "+(it.message?:"error"),Toast.LENGTH_LONG).show()}
        }
        action("3D SIM"){
            dialog.dismiss()
            showMachining3D()
        }
        root.addView(row)

        dialog=AlertDialog.Builder(this)
            .setTitle("CAM 手動走刀 • 夾治具避讓")
            .setView(root)
            .setNegativeButton("關閉",null)
            .create()
        dialog.show()
    }

    private fun showUnifiedMachiningWorkspace(initialMode:String) {
        val snapshot=cad.snapshot()
        if(snapshot.entities.isEmpty() && camSettings.pathMode==CamPathMode.AUTO){
            Toast.makeText(this,"整合加工工作站：AUTO 需要 CAD；MANUAL 可直接走刀",Toast.LENGTH_LONG).show()
            return
        }
        val result=runCatching {
            Machining3DEngine.build(
                snapshot,camSettings,
                Stock3D.fromSnapshot(
                    snapshot,stockMarginMm,stockThicknessMm,
                    if(camSettings.pathMode==CamPathMode.MANUAL)camSettings.manualPath else emptyList()
                ),
                axisA,axisB,
                fixtures=camFixtures,
                toolAssembly=camToolAssembly
            )
        }.getOrElse {
            Toast.makeText(this,"整合工作站 BLOCKED: "+(it.message?:"3D/CAM build error"),Toast.LENGTH_LONG).show()
            return
        }
        val generatedNc=runCatching {
            val base=CncPost.generate(
                result.cam,
                FanucPostSettings(
                    workOffset=workOffset,
                    axisA=axisA,
                    axisB=axisB,
                    controller=controllerProfile,
                    coordinateMode=ncCoordinateMode,
                    originTransformMode=ncOriginTransformMode,
                    cutterCompensation=ncCutterCompensation,
                    cutterCompRegister=ncCutterCompRegister,
                    cutterCompValueMm=ncCutterCompValueMm,
                    rotaryMode=currentRotaryOperationMode(),
                    rotaryClampProfile=rotaryClampProfile
                )
            )
            if(drillCycleBlock.isBlank()) base else FanucNc.insertBeforeProgramEnd(base,drillCycleBlock)
        }.getOrElse {
            Toast.makeText(this,"NC POST BLOCKED • 同頁 3D/軸向仍可檢視 • "+(it.message?:"error"),Toast.LENGTH_LONG).show()
            ""
        }

        val widthDp=resources.configuration.screenWidthDp.coerceAtLeast(1)
        val heightDp=resources.configuration.screenHeightDp.coerceAtLeast(1)
        val plan=UnifiedMachiningWorkspaceContract.plan(widthDp,heightDp)
        lateinit var dialog:AlertDialog

        val root=LinearLayout(this).apply {
            orientation=LinearLayout.VERTICAL
            setBackgroundColor(0xFF040A11.toInt())
            setPadding(dp(6),dp(6),dp(6),dp(6))
        }
        root.addView(TextView(this).apply {
            text="AIG CNC • 加工模擬 / 多軸控制"
            setTextColor(0xFF3DEBFF.toInt())
            textSize=StudioDisplayPolicy.sp(this,11.5f)
            setTypeface(typeface,android.graphics.Typeface.BOLD)
            setPadding(dp(8),dp(5),dp(8),dp(5))
        })

        val modeFlow=FlowLayout(this).apply { setPadding(dp(4),dp(3),dp(4),dp(3)) }
        val modeButtons=mutableMapOf<String,RgbGlowButton>()
        val usage=getSharedPreferences("aig_unified_usage",MODE_PRIVATE)
        val usageMap=UnifiedMachiningWorkspaceContract.rgbImageButtonIds().associateWith { usage.getInt(it,0) }
        val arranged=UnifiedMachiningWorkspaceContract.aiArrange(widthDp,heightDp,usageMap)

        val visualHost=FrameLayout(this).apply { setBackgroundColor(0xFF06101A.toInt()) }
        val ncEditor=EditText(this).apply {
            setText(unifiedNcDraft ?: generatedNc)
            setTextColor(0xFF63FF9D.toInt())
            setBackgroundColor(0xFF05080C.toInt())
            textSize=StudioDisplayPolicy.sp(this,12f)
            typeface=android.graphics.Typeface.MONOSPACE
            gravity=Gravity.TOP or Gravity.START
            inputType=InputType.TYPE_CLASS_TEXT or InputType.TYPE_TEXT_FLAG_MULTI_LINE or InputType.TYPE_TEXT_FLAG_NO_SUGGESTIONS
            isVerticalScrollBarEnabled=true
            isHorizontalScrollBarEnabled=true
            setHorizontallyScrolling(true)
            minLines=10
            setPadding(dp(10),dp(8),dp(10),dp(8))
        }
        val inlineInterlock=NcMachineInterlockSession()
        val inlineNcStatus=TextView(this).apply {
            setTextColor(0xFFBEDCFF.toInt())
            textSize=StudioDisplayPolicy.sp(this,9.5f)
            setPadding(dp(6),dp(3),dp(6),dp(3))
        }
        var inlinePreviewLine=0

        fun refreshInlineNcStatus() {
            val program=ncEditor.text.toString()
            val line=NcCodeCatalog.lineNumberAt(program,ncEditor.selectionStart.coerceAtLeast(0))
            val blocked=NcProgramSafetyPolicy.blocking(program,rotaryClampProfile,currentRotaryOperationMode())
            val machine=inlineInterlock.inspect(program)
            inlineNcStatus.setTextColor(
                if(blocked.isEmpty() && machine.canExecute) 0xFF63FF9D.toInt() else 0xFFFF6E6E.toInt()
            )
            inlineNcStatus.text=
                "LINE "+line+" • "+NcCodeCatalog.lineHelp(program,line,rotaryClampProfile,currentRotaryOperationMode())+"\n"+
                NcSemanticAuthority.lineEvidence(program,line,controllerProfile,rotaryClampProfile,currentRotaryOperationMode())+"\n"+
                NcExecutionTimeline.lineEvidence(program,line,controllerProfile,rotaryClampProfile=rotaryClampProfile,rotaryMode=currentRotaryOperationMode())+"\n"+
                CncControllerCapabilityMatrix.summary(controllerProfile,program,rotaryClampProfile.allowedMachineCodes())+
                (if(blocked.isEmpty() && machine.canExecute) " • SAFETY=PASS • SESSION ACTIVE"
                else " • WARNING • SESSION ACTIVE • EDITING ENABLED • EXECUTION INTERLOCK="+(
                    blocked.take(2).map{it.code} +
                        (if(machine.canExecute) emptyList() else listOf(machine.evidence()))
                ).joinToString(","))
        }

        fun inlineInsert(token:String) {
            val start=ncEditor.selectionStart.coerceAtLeast(0)
            val end=ncEditor.selectionEnd.coerceAtLeast(start)
            ncEditor.text.replace(start,end,token)
            refreshInlineNcStatus()
            ncEditor.requestFocus()
        }

        fun inlineDelete() {
            val start=ncEditor.selectionStart.coerceAtLeast(0)
            val end=ncEditor.selectionEnd.coerceAtLeast(start)
            if(end>start) ncEditor.text.delete(start,end)
            else if(start>0) ncEditor.text.delete(start-1,start)
            refreshInlineNcStatus()
            ncEditor.requestFocus()
        }

        fun toggleCurrentBlockPrefix() {
            val text=ncEditor.text
            val pos=ncEditor.selectionStart.coerceIn(0,text.length)
            val lineStart=(text.lastIndexOf('\n',(pos-1).coerceAtLeast(0))+1).coerceAtLeast(0)
            if(lineStart<text.length && text[lineStart]=='/') text.delete(lineStart,lineStart+1)
            else text.insert(lineStart,"/")
            refreshInlineNcStatus()
        }

        fun stepInlineNc(reset:Boolean=false) {
            val program=ncEditor.text.toString()
            val machine=inlineInterlock.inspect(program)
            val blocked=NcProgramSafetyPolicy.blocking(program,rotaryClampProfile,currentRotaryOperationMode())
            if(!machine.canExecute || blocked.isNotEmpty()){
                inlineNcStatus.setTextColor(0xFFFF6E6E.toInt())
                inlineNcStatus.text=
                    "STEP BLOCKED • "+
                    (blocked.take(3).joinToString(","){it.code}.ifBlank { machine.evidence() })
                return
            }
            val lines=program.split("\n")
            if(reset) inlinePreviewLine=0
            while(inlinePreviewLine<lines.size){
                val t=lines[inlinePreviewLine].trim()
                val nonExecutable=t.isBlank() || t=="%" || t.startsWith("(")
                val skipped=ncBlockSkip && t.startsWith("/")
                if(!nonExecutable && !skipped) break
                inlinePreviewLine++
            }
            if(inlinePreviewLine>=lines.size){
                inlineNcStatus.text="NC PREVIEW • END"
                return
            }
            val start=lines.take(inlinePreviewLine).sumOf{it.length+1}.coerceAtMost(ncEditor.length())
            val end=(start+lines[inlinePreviewLine].length).coerceAtMost(ncEditor.length())
            ncEditor.requestFocus()
            ncEditor.setSelection(start,end)
            inlineNcStatus.text=
                (if(ncDryRun)"DRY RUN" else "SINGLE BLOCK")+
                " • LINE "+(inlinePreviewLine+1)+" • "+lines[inlinePreviewLine].trim()+"\n"+
                NcExecutionTimeline.lineEvidence(program,inlinePreviewLine+1,controllerProfile,rotaryClampProfile=rotaryClampProfile,rotaryMode=currentRotaryOperationMode())
            inlinePreviewLine++
        }

        fun safeSaveInlineNc() {
            val candidate=ncEditor.text.toString()
            val blocked=NcProgramSafetyPolicy.blocking(candidate,rotaryClampProfile,currentRotaryOperationMode())
            val machine=inlineInterlock.inspect(candidate)
            val hasExecutionWarning=blocked.isNotEmpty() || !machine.canExecute

            // Editing and draft persistence must never be disabled by NC warnings.
            // Safety findings only prevent machine execution/rotary motion until revalidated.
            unifiedNcDraft=candidate
            unifiedNcDraftSourceSignature=currentUnifiedNcSourceSignature()
            unifiedNcDraftStale=hasExecutionWarning
            markProjectDirty()
            saveCadCheckpoint()
            refreshInlineNcStatus()

            if(hasExecutionWarning){
                inlineNcStatus.setTextColor(0xFFFFB020.toInt())
                inlineNcStatus.text=
                    "NC DRAFT SAVED • WARNING ONLY • EDITING ENABLED • EXECUTION INTERLOCK • "+
                    (blocked.take(4).joinToString(","){it.code}.ifBlank { machine.evidence() })
                Toast.makeText(
                    this,
                    "NC 草稿已儲存 • 警告不鎖編輯 • 執行前需修正/確認",
                    Toast.LENGTH_LONG
                ).show()
            } else {
                Toast.makeText(this,"NC DRAFT SAVED • SAFETY PASS • SOURCE BOUND",Toast.LENGTH_SHORT).show()
            }
        }

        ncEditor.setOnClickListener { ncEditor.post { refreshInlineNcStatus() } }

        val inlineKeyboard=LinearLayout(this).apply {
            orientation=LinearLayout.VERTICAL
            setPadding(dp(3),dp(2),dp(3),dp(2))
        }
        val inlineRows=listOf(
            listOf("G","M","X","Y","Z"),
            listOf("A","B","F","S","T"),
            listOf("7","8","9","-","."),
            listOf("4","5","6","0","/"),
            listOf("1","2","3","INSERT","DELETE"),
            listOf("BLOCK /","SINGLE","DRY RUN","BLOCK SKIP","STEP"),
            listOf("SAFE SAVE")
        )
        inlineRows.forEach { keys ->
            val row=LinearLayout(this).apply { orientation=LinearLayout.HORIZONTAL }
            keys.forEach { key ->
                val displayKey=when(key){
                    "INSERT" -> UiTextPolicy.display("INSERT",54)
                    "DELETE" -> UiTextPolicy.display("DELETE",54)
                    "BLOCK /" -> "/"
                    "SINGLE" -> UiTextPolicy.display("SINGLE_BLOCK",54)
                    "DRY RUN" -> UiTextPolicy.display("DRY_RUN",54)
                    "BLOCK SKIP" -> UiTextPolicy.display("BLOCK_SKIP",54)
                    "STEP" -> UiTextPolicy.display("STEP",54)
                    "SAFE SAVE" -> UiTextPolicy.display("SAFE_SAVE",54)
                    else -> key
                }
                row.addView(RgbGlowButton(this).apply {
                    text=displayKey
                    contentDescription=key
                    maxLines=1
                    textSize=StudioDisplayPolicy.sp(this,9.5f)
                    minHeight=dp(32)
                    setRgbState(0xFF3DEBFF.toInt(),false)
                    setOnClickListener {
                        when(key){
                            "INSERT" -> inlineInsert("\n")
                            "DELETE" -> inlineDelete()
                            "BLOCK /" -> toggleCurrentBlockPrefix()
                            "SINGLE" -> {
                                ncSingleBlock=!ncSingleBlock
                                if(ncSingleBlock) stepInlineNc(true)
                                else { refreshInlineNcStatus(); Toast.makeText(this@MainActivity,"SINGLE BLOCK OFF",Toast.LENGTH_SHORT).show() }
                            }
                            "DRY RUN" -> {
                                ncDryRun=!ncDryRun
                                refreshInlineNcStatus()
                                Toast.makeText(this@MainActivity,"DRY RUN "+if(ncDryRun)"ON" else "OFF",Toast.LENGTH_SHORT).show()
                            }
                            "BLOCK SKIP" -> {
                                ncBlockSkip=!ncBlockSkip
                                refreshInlineNcStatus()
                                Toast.makeText(this@MainActivity,"BLOCK SKIP "+if(ncBlockSkip)"ON" else "OFF",Toast.LENGTH_SHORT).show()
                            }
                            "STEP" -> stepInlineNc()
                            "SAFE SAVE" -> safeSaveInlineNc()
                            else -> inlineInsert(key)
                        }
                    }
                },LinearLayout.LayoutParams(0,LinearLayout.LayoutParams.WRAP_CONTENT,1f))
            }
            inlineKeyboard.addView(row)
        }
        refreshInlineNcStatus()

        val ncPanel=LinearLayout(this).apply {
            orientation=LinearLayout.VERTICAL
            setBackgroundColor(0xEE081722.toInt())
            addView(TextView(this@MainActivity).apply {
                val draftState = if(unifiedNcDraftStale) " • DRAFT STALE" else if(unifiedNcDraft!=null) " • DRAFT RESTORED" else ""
                text="可編輯 G-code • EDITABLE NC • "+controllerProfile.displayName+draftState+" • INLINE TOOLS"
                setTextColor(if(unifiedNcDraftStale) 0xFFFF6E6E.toInt() else 0xFFFFD25A.toInt())
                textSize=StudioDisplayPolicy.sp(this,10.5f)
                setPadding(dp(8),dp(5),dp(8),dp(5))
            })
            addView(inlineNcStatus,LinearLayout.LayoutParams(-1,-2))
            addView(ncEditor,LinearLayout.LayoutParams(-1,0,1f))
            addView(android.widget.ScrollView(this@MainActivity).apply {
                isFillViewport=false
                addView(inlineKeyboard)
            },LinearLayout.LayoutParams(-1,dp(190)))
        }

        var activeMode=initialMode
        var activeAxisMode=when(initialMode) {
            "4AX" -> "4AX"
            "5AX" -> "5AX"
            "3D","3AX" -> "3AX"
            else -> machiningAxisMode
        }
        var draftA=axisA
        var draftB=axisB
        var activeMachiningView:Machining3DView?=null
        var activeAxisPreview:Axis5xPreview?=null
        var simulationResult=result
        var simulationIndex=0
        var simulationPlaying=false
        var simulationSpeed=1
        val simulationHandler=Handler(Looper.getMainLooper())
        val simulationStatus=TextView(this).apply {
            setTextColor(0xFF63FF9D.toInt())
            textSize=StudioDisplayPolicy.sp(this,9.5f)
            maxLines=2
            setPadding(dp(9),dp(5),dp(9),dp(5))
            background=GradientDrawable(
                GradientDrawable.Orientation.LEFT_RIGHT,
                intArrayOf(Color.argb(224,5,18,31),Color.argb(190,11,35,50),Color.argb(224,5,18,31))
            ).apply {
                cornerRadius=dp(10).toFloat()
                setStroke(dp(1),0xFF3DEBFF.toInt())
            }
            elevation=dp(5).toFloat()
            text="真走刀 • 3AX/4AX/5AX • PLAY / PAUSE / STEP / RESET • MACHINE EXECUTION=OFF"
        }
        fun simulationMode(mode:String):String=when(mode){
            "4AX" -> "4AX"
            "5AX" -> "5AX"
            else -> "3AX"
        }
        fun fallbackIconRes(id:String):Int=when(id){
            "CAD" -> R.drawable.ic_rgb_cad
            "CAM" -> R.drawable.ic_rgb_cam
            "3D" -> R.drawable.ic_rgb_3d
            "3AX" -> R.drawable.ic_rgb_3ax
            "4AX" -> R.drawable.ic_rgb_4ax
            "5AX" -> R.drawable.ic_rgb_5ax
            "6AX" -> R.drawable.ic_rgb_5ax
            "NC_EDIT" -> R.drawable.ic_rgb_nc
            else -> R.drawable.ic_rgb_3d
        }
        fun iconFor(id:String):Drawable? =
            ProductionRgbAssets.drawable(this,id) ?: getDrawable(fallbackIconRes(id))

        fun rebuildSimulationResult(mode:String) {
            val m=simulationMode(mode)
            val target=MachiningAxisRuntimeContract.state(m,draftA,draftB)
            val schedule=when(m){
                "4AX" -> MultiAxisOrientationSchedule(
                    startA=0.0,startB=0.0,endA=target.axisA,endB=0.0,
                    mode=MultiAxisInterpolationMode.LINEAR_SYNC
                )
                "5AX" -> MultiAxisOrientationSchedule(
                    startA=0.0,startB=0.0,endA=target.axisA,endB=target.axisB,
                    mode=MultiAxisInterpolationMode.LINEAR_SYNC
                )
                else -> null
            }
            simulationResult=Machining3DEngine.build(
                snapshot,camSettings,
                Stock3D.fromSnapshot(
                    snapshot,stockMarginMm,stockThicknessMm,
                    if(camSettings.pathMode==CamPathMode.MANUAL)camSettings.manualPath else emptyList()
                ),
                target.axisA,target.axisB,schedule,
                fixtures=camFixtures,
                toolAssembly=camToolAssembly
            )
            activeAxisMode=m
            simulationIndex=0
        }

        fun installSimulationView(mode:String) {
            rebuildSimulationResult(mode)
            val view=Machining3DView(this,simulationResult,simulationMode(mode))
            activeMachiningView=view
            visualHost.addView(view,FrameLayout.LayoutParams(-1,-1))
            view.showProgressiveFrame(0)
        }

        lateinit var simulationTick:Runnable
        fun showSimulationFrame(index:Int) {
            val view=activeMachiningView ?: return
            val frame=runCatching { view.showProgressiveFrame(index) }.getOrElse {
                simulationPlaying=false
                simulationStatus.text="SIM BLOCKED • "+(it.message?:"error")
                return
            }
            simulationIndex=frame.index
            activeAxisPreview?.setAngles(frame.toolPoint.axisA,frame.toolPoint.axisB)
            simulationStatus.text="主 UI 機台 • "+activeAxisMode+" • "+(frame.index+1)+"/"+frame.total+
                " • X="+DisplayFormat.mm(frame.toolPoint.to.x)+
                " Y="+DisplayFormat.mm(frame.toolPoint.to.y)+
                " Z="+DisplayFormat.mm(frame.toolPoint.z)+
                " • A="+DisplayFormat.mm(frame.toolPoint.axisA)+
                " B="+DisplayFormat.mm(frame.toolPoint.axisB)+
                " • removed="+frame.removedCells+" • MACHINE EXECUTION=OFF"
        }
        simulationTick=object:Runnable {
            override fun run() {
                if(!simulationPlaying) return
                val moves=simulationResult.cam.toolpaths.flatMap{it.moves}
                if(moves.isEmpty() || simulationIndex>=moves.lastIndex){
                    simulationPlaying=false
                    simulationStatus.text="真走刀完成 • "+activeAxisMode+
                        " • removed="+(activeMachiningView?.progressiveRemovedCells()?:0)
                    return
                }
                showSimulationFrame(simulationIndex+1)
                if(simulationPlaying){
                    val delay=when(simulationSpeed){4->30L;2->60L;else->120L}
                    simulationHandler.postDelayed(this,delay)
                }
            }
        }

        fun renderMode(mode:String){
            simulationPlaying=false
            simulationHandler.removeCallbacks(simulationTick)
            activeMachiningView=null
            activeAxisPreview=null
            activeMode=mode
            ncPanel.visibility=if(mode=="NC_EDIT") View.VISIBLE else View.GONE
            modeButtons.forEach { (id,b)-> b.setRgbState(colors[(id.hashCode() and Int.MAX_VALUE)%colors.size],id==mode) }
            visualHost.removeAllViews()
            when(mode){
                "CAD" -> {
                    visualHost.addView(TextView(this).apply {
                        text="2D CAD / 2D繪圖\n使用 RGB 圖片鍵返回主 CAD 工作區"
                        gravity=Gravity.CENTER
                        setTextColor(0xFF3DEBFF.toInt())
                        textSize=StudioDisplayPolicy.sp(this,16f)
                    },FrameLayout.LayoutParams(-1,-1))
                }
                "CAM" -> {
                    visualHost.addView(TextView(this).apply {
                        text="REAL CAM / 真實刀路\nCAM paths="+result.cam.toolpaths.size+"\nG0 青藍 • Cutting 綠 • Active 桃紫"
                        gravity=Gravity.CENTER
                        setTextColor(0xFFFFB020.toInt())
                        textSize=StudioDisplayPolicy.sp(this,15f)
                    },FrameLayout.LayoutParams(-1,-1))
                }
                "3D","3AX" -> {
                    installSimulationView("3AX")
                    showSimulationFrame(0)
                }
                "4AX" -> {
                    val state=MachiningAxisRuntimeContract.state("4AX",draftA,draftB)
                    draftA=state.axisA; draftB=state.axisB
                    installSimulationView("4AX")
                    showSimulationFrame(0)
                }
                "5AX" -> {
                    val state=MachiningAxisRuntimeContract.state("5AX",draftA,draftB)
                    draftA=state.axisA; draftB=state.axisB
                    installSimulationView("5AX")
                    showSimulationFrame(0)
                }
                "NC_EDIT" -> {
                    visualHost.addView(Machining3DView(this,result,machiningAxisMode),FrameLayout.LayoutParams(-1,-1))
                    ncEditor.requestFocus()
                }
            }
            if(mode in setOf("3D","3AX","4AX","5AX")){
                visualHost.addView(
                    simulationStatus,
                    FrameLayout.LayoutParams(-1,-2,Gravity.TOP).apply {
                        setMargins(dp(8),dp(8),dp(8),0)
                    }
                )
            }
            usage.edit().putInt(mode,(usage.getInt(mode,0)+1).coerceAtMost(20)).apply()
        }

        val modeButtonWidthDp=(widthDp/plan.buttonColumns).coerceIn(58,140)
        arranged.forEach { spec ->
            val b=RgbGlowButton(this).apply {
                text=UnifiedMachiningWorkspaceContract.displayLabel(spec.id,modeButtonWidthDp)
                contentDescription=spec.zh+" / "+spec.en
                maxLines=1
                textSize=StudioDisplayPolicy.sp(this,UnifiedMachiningWorkspaceContract.adaptiveTextSp(spec.id,modeButtonWidthDp).toFloat())
                setCompoundDrawablesWithIntrinsicBounds(iconFor(spec.id),null,null,null)
                compoundDrawablePadding=dp(4)
                gravity=Gravity.CENTER
                minHeight=dp(48)
                minimumHeight=dp(44)
                setRgbState(colors[(spec.id.hashCode() and Int.MAX_VALUE)%colors.size],spec.id==initialMode)
                setOnClickListener {
                    if(spec.id=="CAD"){
                        dialog.dismiss()
                        openCategory("繪圖"){showDrawingBranch()}
                    } else if(spec.id=="CAM"){
                        dialog.dismiss()
                        showCamWorkstation()
                    } else if(spec.id=="6AX") {
                        dialog.dismiss()
                        showSixAxisRuntimeStage()
                    } else renderMode(spec.id)
                }
            }
            modeButtons[spec.id]=b
            modeFlow.addView(b)
        }
        root.addView(modeFlow,LinearLayout.LayoutParams(-1,-2))

        val body=LinearLayout(this).apply {
            orientation=if(plan.ncDock=="RIGHT") LinearLayout.HORIZONTAL else LinearLayout.VERTICAL
        }
        if(plan.ncDock=="RIGHT"){
            body.addView(visualHost,LinearLayout.LayoutParams(0,-1,plan.visualWeight.toFloat()))
            body.addView(ncPanel,LinearLayout.LayoutParams(0,-1,plan.ncWeight.toFloat()))
        }else{
            body.addView(visualHost,LinearLayout.LayoutParams(-1,0,0.74f))
            body.addView(ncPanel,LinearLayout.LayoutParams(-1,0,0.26f))
        }
        root.addView(body,LinearLayout.LayoutParams(-1,0,1f))

        val actionRow=LinearLayout(this).apply {
            orientation=LinearLayout.HORIZONTAL
            setPadding(dp(6),dp(4),dp(6),dp(4))
        }
        val actionScroll=HorizontalScrollView(this).apply {
            isFillViewport=false
            isHorizontalScrollBarEnabled=false
            overScrollMode=View.OVER_SCROLL_NEVER
            addView(actionRow,FrameLayout.LayoutParams(-2,-2))
        }
        fun action(key:String,color:Int,description:String,run:()->Unit){
            val button=RgbGlowButton(this).apply {
                text=UiTextPolicy.display(key,72)
                contentDescription=description
                maxLines=1
                minHeight=dp(44)
                minimumHeight=dp(44)
                minWidth=dp(78)
                textSize=StudioDisplayPolicy.sp(this,9.5f)
                setPadding(dp(10),dp(4),dp(10),dp(4))
                setRgbState(color,false)
                setOnClickListener{run()}
            }
            actionRow.addView(button,LinearLayout.LayoutParams(-2,-2).apply { marginEnd=dp(6) })
        }
        action("PLAY",0xFF3FFF9D.toInt(),"真走刀播放"){
            if(activeMode !in setOf("3D","3AX","4AX","5AX")){
                simulationStatus.text="SIM BLOCKED • 請先選 3D / 3AX / 4AX / 5AX"
            }else{
                renderMode(activeMode)
                simulationPlaying=true
                showSimulationFrame(simulationIndex)
                simulationHandler.removeCallbacks(simulationTick)
                simulationHandler.post(simulationTick)
            }
        }
        action("PAUSE",0xFFFFB020.toInt(),"暫停仿真"){
            simulationPlaying=false
            simulationHandler.removeCallbacks(simulationTick)
            simulationStatus.text="真走刀暫停 • "+activeAxisMode+" • frame="+(simulationIndex+1)
        }
        action("STEP",0xFF3DEBFF.toInt(),"單步仿真"){
            simulationPlaying=false
            simulationHandler.removeCallbacks(simulationTick)
            if(activeMachiningView==null && activeMode in setOf("3D","3AX","4AX","5AX")) renderMode(activeMode)
            val moves=simulationResult.cam.toolpaths.flatMap{it.moves}
            if(moves.isNotEmpty()) showSimulationFrame((simulationIndex+1).coerceAtMost(moves.lastIndex))
        }
        action("RESET",0xFF7D70FF.toInt(),"重置仿真"){
            simulationPlaying=false
            simulationHandler.removeCallbacks(simulationTick)
            simulationIndex=0
            if(activeMachiningView!=null) showSimulationFrame(0)
            simulationStatus.text="真走刀重置 • "+activeAxisMode+" • MACHINE EXECUTION=OFF"
        }
        action("SPEED",0xFFEC4899.toInt(),"仿真速度"){
            simulationSpeed=when(simulationSpeed){1->2;2->4;else->1}
            simulationStatus.text="真走刀速度 ×"+simulationSpeed+" • "+activeAxisMode
        }
        action("APPLY_AXIS",0xFF8B5CF6.toInt(),"套用軸向"){
            machiningAxisMode=activeAxisMode
            axisA=if(activeAxisMode=="3AX")0.0 else draftA
            axisB=if(activeAxisMode=="5AX")draftB else 0.0
            drillCycleBlock=""
            if(!unifiedNcDraft.isNullOrBlank()) unifiedNcDraftStale=true
            markProjectDirty()
            saveCadCheckpoint()
            Toast.makeText(
                this,
                "AXIS APPLIED • "+machiningAxisMode+" • A="+DisplayFormat.mm(axisA)+" B="+DisplayFormat.mm(axisB)+
                    " • "+rotaryClampStatusText()+" • DRILL BLOCK RESET • NC DRAFT STALE",
                Toast.LENGTH_LONG
            ).show()
        }
        action("SAFE_SAVE",0xFF22C55E.toInt(),"安全儲存"){
            safeSaveInlineNc()
        }
        action("NC_TOOLS",0xFF3B82F6.toInt(),"同頁 NC 工具"){
            renderMode("NC_EDIT")
            ncEditor.requestFocus()
            refreshInlineNcStatus()
            Toast.makeText(this,"INLINE NC TOOLS READY • NO SECOND DIALOG",Toast.LENGTH_SHORT).show()
        }
        action("BACK",0xFFF59E0B.toInt(),"返回"){ dialog.dismiss() }
        root.addView(actionScroll,LinearLayout.LayoutParams(-1,-2))

        val formalModeTitle=when(initialMode){
            "3D" -> "SIM"
            "NC_EDIT" -> "NC"
            else -> initialMode
        }
        dialog=AlertDialog.Builder(this)
            .setTitle("AIG CNC • "+formalModeTitle)
            .setView(root)
            .create()
        dialog.setOnDismissListener {
            simulationPlaying=false
            simulationHandler.removeCallbacks(simulationTick)
        }
        dialog.show()
        dialog.window?.apply {
            setBackgroundDrawable(android.graphics.drawable.ColorDrawable(Color.TRANSPARENT))
            setLayout(
                android.view.WindowManager.LayoutParams.MATCH_PARENT,
                android.view.WindowManager.LayoutParams.MATCH_PARENT
            )
            attributes=attributes.apply {
                width=android.view.WindowManager.LayoutParams.MATCH_PARENT
                height=android.view.WindowManager.LayoutParams.MATCH_PARENT
                dimAmount=0.18f
            }
            addFlags(android.view.WindowManager.LayoutParams.FLAG_DIM_BEHIND)
        }
        renderMode(initialMode)
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
        val side = Spinner(this).apply {
            adapter=ArrayAdapter(
                this@MainActivity,
                android.R.layout.simple_spinner_dropdown_item,
                listOf("外徑 / OUTSIDE","內徑 / INSIDE")
            )
            setSelection(if(camSettings.contourSide==ContourSide.OUTSIDE)0 else 1)
            box.addView(this)
        }
        val direction = Spinner(this).apply {
            adapter=ArrayAdapter(
                this@MainActivity,
                android.R.layout.simple_spinner_dropdown_item,
                listOf("CCW","CW")
            )
            setSelection(if(camSettings.contourDirection==ContourDirection.CCW)0 else 1)
            box.addView(this)
        }

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
                        climb = direction.selectedItemPosition==0,
                        contourSide = if(side.selectedItemPosition==0) ContourSide.OUTSIDE else ContourSide.INSIDE,
                        contourDirection = if(direction.selectedItemPosition==0) ContourDirection.CCW else ContourDirection.CW,
                        pathMode = camSettings.pathMode,
                        manualPath = camSettings.manualPath,
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


    private fun showControllerDialog() {
        val box = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(dp(14), dp(8), dp(14), dp(4))
        }
        fun <T> spinner(values: Array<T>, label: (T) -> String, selected: T): Spinner =
            Spinner(this).apply {
                adapter = ArrayAdapter(
                    this@MainActivity,
                    android.R.layout.simple_spinner_dropdown_item,
                    values.map(label)
                )
                setSelection(values.indexOf(selected).coerceAtLeast(0))
                box.addView(this)
            }

        val profiles = CncControllerProfile.entries.toTypedArray()
        val coordinates = NcCoordinateMode.entries.toTypedArray()
        val origins = NcOriginTransformMode.entries.toTypedArray()
        val compensations = CutterCompensationMode.entries.toTypedArray()
        val profileSpinner = spinner(profiles,{it.displayName},controllerProfile)
        val coordinateSpinner = spinner(coordinates,{it.displayName},ncCoordinateMode)
        val originSpinner = spinner(origins,{it.displayName},ncOriginTransformMode)
        val compensationSpinner = spinner(compensations,{it.displayName},ncCutterCompensation)
        val cutterDRegister = EditText(this).apply {
            hint = "D 補正號碼 1..999"
            inputType = InputType.TYPE_CLASS_NUMBER
            setText(ncCutterCompRegister.toString())
            box.addView(this)
        }
        val cutterDValue = EditText(this).apply {
            hint = "D 補正值 mm，例如 5.000 / -0.010"
            inputType = InputType.TYPE_CLASS_NUMBER or InputType.TYPE_NUMBER_FLAG_DECIMAL or InputType.TYPE_NUMBER_FLAG_SIGNED
            setText(DisplayFormat.mm(ncCutterCompValueMm))
            box.addView(this)
        }

        val clampModes=arrayOf(
            "UNCONFIGURED / NC BLOCK",
            "CONTROLLER / PMC AUTO • VERIFIED MACHINE ONLY",
            "EXPLICIT MACHINE M-CODES"
        )
        fun modeIndex(axis:RotaryAxisMCodePair)=when{axis.controllerAutomatic->1;axis.explicit->2;else->0}

        box.addView(TextView(this).apply {
            text="4AX M碼設定 • 每台機器依廠商/PMC不同，可留空"
            setTextColor(Color.rgb(80,210,255));textSize=12f
        })
        val clamp4ModeSpinner=spinner(clampModes,{it},clampModes[modeIndex(rotaryClampProfile.axis4)])
        val unlock4M=EditText(this).apply {
            hint="4AX 開鎖 M(   )";setText(rotaryClampProfile.axis4.unclampM?.toString().orEmpty())
            inputType=InputType.TYPE_CLASS_NUMBER;box.addView(this)
        }
        val clamp4M=EditText(this).apply {
            hint="4AX 鎖定 M(   )";setText(rotaryClampProfile.axis4.clampM?.toString().orEmpty())
            inputType=InputType.TYPE_CLASS_NUMBER;box.addView(this)
        }
        val clamp4IndexedCut=CheckBox(this).apply {
            text="4AX indexed cutting requires LOCK";isChecked=rotaryClampProfile.axis4.requireClampForIndexedCutting;box.addView(this)
        }

        box.addView(TextView(this).apply {
            text="5AX M碼設定 • 可與4AX完全不同"
            setTextColor(Color.rgb(180,120,255));textSize=12f
        })
        val clamp5ModeSpinner=spinner(clampModes,{it},clampModes[modeIndex(rotaryClampProfile.axis5)])
        val unlock5M=EditText(this).apply {
            hint="5AX 開鎖 M(   )";setText(rotaryClampProfile.axis5.unclampM?.toString().orEmpty())
            inputType=InputType.TYPE_CLASS_NUMBER;box.addView(this)
        }
        val clamp5M=EditText(this).apply {
            hint="5AX 鎖定 M(   )";setText(rotaryClampProfile.axis5.clampM?.toString().orEmpty())
            inputType=InputType.TYPE_CLASS_NUMBER;box.addView(this)
        }
        val clamp5IndexedCut=CheckBox(this).apply {
            text="5AX indexed cutting requires LOCK";isChecked=rotaryClampProfile.axis5.requireClampForIndexedCutting;box.addView(this)
        }

        val machineOptionalCodes=EditText(this).apply {
            hint="廠商已安裝選配 G/M；多個用逗號分隔，留空=未確認"
            setText(rotaryClampProfile.optionalCodesCsv());inputType=InputType.TYPE_CLASS_TEXT;box.addView(this)
        }
        val g34Templates=G34VendorTemplate.entries.toTypedArray()
        box.addView(TextView(this).apply {
            text="G34 廠商格式模板"
            setTextColor(Color.rgb(255,190,90));textSize=12f
        })
        val g34TemplateSpinner=spinner(
            g34Templates,
            {
                when(it){
                    G34VendorTemplate.UNCONFIGURED -> "未設定 / 依廠商"
                    G34VendorTemplate.XY_J0_I_DIAMETER_K_COUNT -> "X/Y中心 • J0=預設角 • I=節圓直徑 • K=孔數"
                }
            },
            rotaryClampProfile.g34VendorProfile.template
        )
        val g34DefaultAngle=EditText(this).apply {
            hint="G34 J0 預設起始角度，例如 90"
            inputType=InputType.TYPE_CLASS_NUMBER or InputType.TYPE_NUMBER_FLAG_DECIMAL or InputType.TYPE_NUMBER_FLAG_SIGNED
            setText(rotaryClampProfile.g34VendorProfile.defaultStartAngleDeg.toString());box.addView(this)
        }
        box.addView(TextView(this).apply {
            text="此模板只代表目前機台/廠商：J0採預設角；I為節圓直徑（I30→R15）；K為孔數。別台機器可不選此模板。"
            setTextColor(Color.rgb(255,170,80));textSize=11f
        })
        box.addView(TextView(this).apply {
            text="G/M屬機台/廠商設定。未配置或未安裝只會在NC欄WARNING/BLOCK送機；CAD/CAM/SIM/正式Runtime照常使用，不閃退、不切工程版。"
            setTextColor(Color.rgb(255,190,90));textSize=11f
            setPadding(dp(4),dp(10),dp(4),dp(4))
        })

        box.addView(TextView(this).apply {
            text = "適用時機：一般加工/複製區段→G90；重複圖形/子程式→G91；角度特徵暫時原點/多夾具重新指定原點→G92。G92是獨立ORIGIN TRANSFORM，不改CAD/CAM/SIM ABS XYZ。"
            setTextColor(Color.rgb(160,190,210))
            textSize = 11f
            setPadding(dp(4),dp(10),dp(4),dp(4))
        })

        AlertDialog.Builder(this)
            .setTitle("CNC CONTROL / POST MODE")
            .setView(box)
            .setPositiveButton("套用") { _, _ ->
                runCatching {
                    val profile = profiles[profileSpinner.selectedItemPosition]
                    val coordinate = coordinates[coordinateSpinner.selectedItemPosition]
                    val origin = origins[originSpinner.selectedItemPosition]
                    val comp = compensations[compensationSpinner.selectedItemPosition]
                    val dRegister = cutterDRegister.text.toString().trim().toIntOrNull()
                        ?: error("D 補正號碼需為 1..999")
                    require(dRegister in 1..999) { "D 補正號碼需為 1..999" }
                    val dValue = cutterDValue.text.toString().trim().toDoubleOrNull()
                        ?: error("D 補正值需為有效 mm")
                    require(dValue.isFinite()) { "D 補正值需為有效 mm" }
                    fun axisProfile(mode:Spinner,lock:EditText,unlock:EditText,cut:CheckBox):RotaryAxisMCodePair =
                        when(mode.selectedItemPosition){
                            0 -> RotaryAxisMCodePair.unconfigured()
                            1 -> RotaryAxisMCodePair.controllerAutomatic(cut.isChecked)
                            else -> RotaryAxisMCodePair.explicit(
                                clampM=lock.text.toString().trim().toIntOrNull() ?: error("鎖定 M碼需 0..999"),
                                unclampM=unlock.text.toString().trim().toIntOrNull() ?: error("開鎖 M碼需 0..999"),
                                requireClampForIndexedCutting=cut.isChecked
                            )
                        }
                    val g34Angle=g34DefaultAngle.text.toString().trim().toDoubleOrNull()
                        ?: error("G34 預設角度需為數值")
                    val clampProfile=RotaryAxisClampProfile.configured(
                        axis4=axisProfile(clamp4ModeSpinner,clamp4M,unlock4M,clamp4IndexedCut),
                        axis5=axisProfile(clamp5ModeSpinner,clamp5M,unlock5M,clamp5IndexedCut),
                        installedOptionalCodes=RotaryAxisClampProfile.parseOptionalCodes(machineOptionalCodes.text.toString()),
                        g34VendorProfile=G34VendorProfile(g34Templates[g34TemplateSpinner.selectedItemPosition],g34Angle)
                    )
                    arrayOf(profile,coordinate,origin,comp,clampProfile,dRegister,dValue)
                }.onSuccess { values ->
                    controllerProfile = values[0] as CncControllerProfile
                    ncCoordinateMode = values[1] as NcCoordinateMode
                    ncOriginTransformMode = values[2] as NcOriginTransformMode
                    ncCutterCompensation = values[3] as CutterCompensationMode
                    rotaryClampProfile = values[4] as RotaryAxisClampProfile
                    ncCutterCompRegister = values[5] as Int
                    ncCutterCompValueMm = values[6] as Double
                    saveRotaryMachineProfile(rotaryClampProfile)
                    drillCycleBlock = ""
                    if(!unifiedNcDraft.isNullOrBlank()) unifiedNcDraftStale = true
                    Toast.makeText(
                        this,
                        "POST " + controllerProfile.displayName + " • " + ncCoordinateMode.displayName +
                            " • " + ncOriginTransformMode.displayName +
                            " • "+ncCutterCompensation.code+" D"+ncCutterCompRegister+"="+DisplayFormat.mm(ncCutterCompValueMm)+" mm" +
                            (if(ncCutterCompensation==CutterCompensationMode.CAM_GEOMETRY_G40) " • G40 audit-only"
                             else " • G41/G42 SAVED • POST FAIL-CLOSED UNTIL RAW-CONTOUR SIM") +
                            " • " + rotaryClampStatusText() + " • NC DRAFT STALE",
                        Toast.LENGTH_LONG
                    ).show()
                }.onFailure { error ->
                    Toast.makeText(this,"CONTROL BLOCKED • "+(error.message?:"invalid rotary/post profile"),Toast.LENGTH_LONG).show()
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
        box.addView(TextView(this).apply {
            text = "AXIS MODE " + machiningAxisMode + " • " + rotaryClampStatusText()
            setTextColor(if(currentRotaryOperationMode()==RotaryAxisOperationMode.NONE || rotaryClampProfile.pairFor(currentRotaryOperationMode())?.configured==true)
                Color.rgb(99,255,157) else Color.rgb(255,110,110))
            textSize = 11f
            setPadding(dp(4),dp(4),dp(4),dp(8))
        })
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
        val useM29 = CheckBox(this).apply {
            text = "G84 使用 Fanuc M29 rigid tapping（三菱Profile不套用）"
            isChecked = false
            box.addView(this)
        }

        AlertDialog.Builder(this)
            .setTitle(controllerProfile.displayName + " • " + machiningAxisMode + " • 鑽孔循環")
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
                        rigidTapM29 = cycle == DrillCycle.G84 &&
                            useM29.isChecked &&
                            controllerProfile == CncControllerProfile.FANUC
                    )
                    val rotaryMode = currentRotaryOperationMode()
                    FanucNc.cannedCycle(
                        cycle = cycle,
                        holes = listOf(hole),
                        safeZ = camSettings.safeZ,
                        retractZ = hole.r,
                        rotaryMode = rotaryMode,
                        axisA = if(rotaryMode==RotaryAxisOperationMode.NONE) 0.0 else axisA,
                        axisB = if(rotaryMode==RotaryAxisOperationMode.INDEXED_5AX) axisB else 0.0,
                        clampProfile = rotaryClampProfile
                    )
                }.onSuccess {
                    drillCycleBlock = it
                    if(!unifiedNcDraft.isNullOrBlank()) unifiedNcDraftStale = true
                    Toast.makeText(this, "DRILL CYCLE READY • "+machiningAxisMode+" • "+rotaryClampStatusText(), Toast.LENGTH_LONG).show()
                }.onFailure {
                    Toast.makeText(this, "DRILL CYCLE BLOCKED: " + it.message, Toast.LENGTH_LONG).show()
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
                    machiningAxisMode = "5AX"
                    drillCycleBlock = ""
                    if(!unifiedNcDraft.isNullOrBlank()) unifiedNcDraftStale = true
                    val ncPreview = "G0 A" + FanucNc.fmt(axisA) + " B" + FanucNc.fmt(axisB)
                    Toast.makeText(this, "5X " + ncPreview, Toast.LENGTH_SHORT).show()
                }
            }
            .setNegativeButton("取消", null)
            .show()
    }

    private fun showNcEditDialog() {
        val snapshot = cad.snapshot()
        if (snapshot.entities.isEmpty() && camSettings.pathMode==CamPathMode.AUTO) {
            Toast.makeText(this, "NC EDIT：AUTO 需要 CAD；MANUAL 可直接 Post", Toast.LENGTH_LONG).show()
            return
        }
        val cam = runCatching {
            CamModel.fromCad(System.currentTimeMillis(), snapshot, camSettings, axisA, axisB, axisC=axisC)
        }
            .getOrElse {
                Toast.makeText(this, "CAM 產生失敗: " + it.message, Toast.LENGTH_LONG).show()
                return
            }
        val stock = Stock3D.fromSnapshot(
            snapshot,stockMarginMm,stockThicknessMm,
            if(camSettings.pathMode==CamPathMode.MANUAL)camSettings.manualPath else emptyList()
        )
        val risk = MachiningRiskScanner.inspect(cam, stock, camFixtures, camToolAssembly)
        if(!risk.ok) {
            Toast.makeText(
                this,
                "NC BLOCKED • MODELED COLLISION="+risk.collisionCount+
                    " • OVERCUT="+risk.overcutCount+" • 先修 CAM/SIM 再輸出",
                Toast.LENGTH_LONG
            ).show()
            return
        }
        val baseNc = runCatching {
            CncPost.generate(
                cam,
                FanucPostSettings(
                    workOffset = workOffset,
                    axisA = axisA,
                    axisB = axisB,
                    controller = controllerProfile,
                    coordinateMode = ncCoordinateMode,
                    originTransformMode = ncOriginTransformMode,
                    cutterCompensation = ncCutterCompensation
                )
            )
        }.getOrElse { error ->
            Toast.makeText(
                this,
                "NC POST BLOCKED • CAD/CAM/SIM ABS XYZ不變 • " + (error.message ?: "unsupported post mode"),
                Toast.LENGTH_LONG
            ).show()
            return
        }
        val ncProgram = if (drillCycleBlock.isBlank()) baseNc else
            runCatching { FanucNc.insertBeforeProgramEnd(baseNc, drillCycleBlock) }
                .getOrElse { error ->
                    Toast.makeText(this,"NC INSERT BLOCKED: "+(error.message?:"invalid block"),Toast.LENGTH_LONG).show()
                    return
                }
        val editor = EditText(this).apply {
            setText(ncProgram)
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
        val machineInterlockSession = NcMachineInterlockSession()
        val modalStatus = TextView(this).apply {
            setTextColor(Color.rgb(255,210,90))
            textSize = 10.5f
            setPadding(dp(2),dp(4),dp(2),dp(4))
        }
        fun refreshModalStatus() {
            val program = editor.text.toString()
            val blocked = NcProgramSafetyPolicy.blocking(program,rotaryClampProfile,currentRotaryOperationMode())
            val machine = machineInterlockSession.inspect(program)
            modalStatus.setTextColor(if (blocked.isEmpty() && machine.canExecute) Color.rgb(255,210,90) else Color.rgb(255,110,110))
            modalStatus.text = "MODAL • " + NcModalTracker.evidence(program) +
                "\nAUX • " + NcAuxiliaryTracker.evidence(program) +
                "\nCODE • " + NcCodeCatalog.programLegend(program,machineSpecificAllowed=rotaryClampProfile.allowedMachineCodes()) +
                "\n" + CncControllerCapabilityMatrix.summary(controllerProfile,program,rotaryClampProfile.allowedMachineCodes()) +
                (if (blocked.isEmpty()) " • SAFETY=PASS"
                else "\nBLOCKED • " + blocked.take(4).joinToString(" • ") {
                    (if (it.lineNumber > 0) "L" + it.lineNumber + " " else "") + it.code
                }) + "\n" + machine.evidence()
        }
        refreshModalStatus()
        val lineHelp = TextView(this).apply {
            setTextColor(Color.rgb(190,220,255))
            textSize = 10.5f
            setPadding(dp(2),dp(4),dp(2),dp(4))
        }
        fun refreshLineHelp() {
            val program = editor.text.toString()
            val line = NcCodeCatalog.lineNumberAt(program, editor.selectionStart.coerceAtLeast(0))
            lineHelp.text = "LINE HELP • " +
                NcCodeCatalog.lineHelp(program,line,rotaryClampProfile,currentRotaryOperationMode()) + "\n" +
                NcSemanticAuthority.lineEvidence(program,line,controllerProfile,rotaryClampProfile,currentRotaryOperationMode()) + "\n" +
                NcExecutionTimeline.lineEvidence(program,line,controllerProfile,rotaryClampProfile=rotaryClampProfile,rotaryMode=currentRotaryOperationMode())
        }
        editor.setOnClickListener { editor.post { refreshLineHelp() } }
        refreshLineHelp()
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
        box.addView(modalStatus)
        box.addView(lineHelp)
        val previewStatus = TextView(this).apply {
            setTextColor(Color.rgb(61,235,255))
            textSize = 11f
            text = "NC PREVIEW • READY"
            setPadding(dp(2),dp(4),dp(2),dp(4))
        }
        var previewLine = 0
        fun stepPreview(reset: Boolean = false) {
            val program = editor.text.toString()
            val machine = machineInterlockSession.inspect(program)
            if (!machine.canExecute) {
                previewStatus.setTextColor(Color.rgb(255,110,110))
                previewStatus.text = machine.evidence() + " • STEP BLOCKED"
                return
            }
            previewStatus.setTextColor(Color.rgb(61,235,255))
            val lines = program.split("\n")
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
            refreshLineHelp()
            editor.post { editor.bringPointIntoView(start.coerceAtMost(editor.length())) }
            previewStatus.text = (if (ncDryRun) "DRY RUN" else "NC PREVIEW") +
                " • BLOCK " + (previewLine + 1) + " • " + lines[previewLine].trim() + "\n" + NcExecutionTimeline.lineEvidence(editor.text.toString(),previewLine + 1,controllerProfile,rotaryClampProfile=rotaryClampProfile,rotaryMode=currentRotaryOperationMode())
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
        toggle("RESET") {
            previewLine = 0
            val reset = machineInterlockSession.reset()
            val checked = if (reset.state == NcMachineInterlockState.REVALIDATE_REQUIRED)
                machineInterlockSession.revalidate(editor.text.toString()) else reset
            previewStatus.text = checked.evidence()
            refreshModalStatus()
        }
        toggle("RESUME") {
            val resumed = machineInterlockSession.resume()
            previewStatus.text = resumed.evidence()
            refreshModalStatus()
        }
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
            refreshModalStatus()
        }
        box.addView(controls)

        fun insertNcToken(token: String) {
            val start = editor.selectionStart.coerceAtLeast(0)
            val end = editor.selectionEnd.coerceAtLeast(start)
            editor.text.replace(start, end, token)
            refreshModalStatus()
            refreshLineHelp()
            editor.requestFocus()
        }
        fun deleteNcToken() {
            val start = editor.selectionStart.coerceAtLeast(0)
            val end = editor.selectionEnd.coerceAtLeast(start)
            if (end > start) editor.text.delete(start, end)
            else if (start > 0) editor.text.delete(start - 1, start)
            refreshModalStatus()
            editor.requestFocus()
        }
        fun jumpNc(position: Int) {
            val p = position.coerceIn(0, editor.length())
            editor.requestFocus()
            editor.setSelection(p)
            refreshLineHelp()
            editor.post { editor.bringPointIntoView(p) }
        }
        fun showNcOperatorPalette() {
            val groups=NcCodeCatalog.operatorPalette()
            val groupLabels=groups.map { it.first+" • "+it.second.size+" codes" }.toTypedArray()
            AlertDialog.Builder(this)
                .setTitle("G/M 功能 • FANUC")
                .setItems(groupLabels) { _, groupIndex ->
                    val group=groups[groupIndex]
                    val codeLabels=group.second.map { code ->
                        val d=NcCodeCatalog.describe(code)
                        code+" • "+d.shortName+" • "+d.layer
                    }.toTypedArray()
                    AlertDialog.Builder(this)
                        .setTitle(group.first)
                        .setItems(codeLabels) { _, codeIndex ->
                            insertNcToken(group.second[codeIndex]+" ")
                        }
                        .setNegativeButton("返回",null)
                        .show()
                }
                .setNegativeButton("關閉",null)
                .show()
        }

        val keyboard = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(dp(4),dp(4),dp(4),dp(4))
        }
        val rows = listOf(
            listOf("G/M 功能","G90","G54","G43","M98"),
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
                            "G/M 功能" -> showNcOperatorPalette()
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
        if (snapshot.entities.isEmpty() && camSettings.pathMode==CamPathMode.AUTO) {
            Toast.makeText(this, "3D 加工 BLOCKED：AUTO 需要 CAD；MANUAL 可直接模擬", Toast.LENGTH_LONG).show()
            return
        }

        runCatching {
            Machining3DEngine.build(
                snapshot,camSettings,
                Stock3D.fromSnapshot(
                    snapshot,stockMarginMm,stockThicknessMm,
                    if(camSettings.pathMode==CamPathMode.MANUAL)camSettings.manualPath else emptyList()
                ),
                axisA,axisB,
                fixtures=camFixtures,
                toolAssembly=camToolAssembly,
                axisC=axisC
            )
        }
            .onSuccess { result ->
                val box = LinearLayout(this).apply {
                    orientation = LinearLayout.VERTICAL
                    setBackgroundColor(0xFF050A11.toInt())
                }
                val screenH = resources.displayMetrics.heightPixels
                val min3dH = dp(220)
                val max3dH = dp(820)
                val threeDHeight = (screenH * 0.72f).roundToInt().coerceIn(min3dH, max3dH)
                box.addView(
                    Machining3DView(this, result),
                    LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, threeDHeight)
                )

                val removed = result.removal.depth.count { it < 0.0 }
                val cuts = result.cam.toolpaths.sumOf { path -> path.moves.count { !it.rapid } }
                val absoluteMoves = result.cam.toolpaths.flatMap { it.moves }
                val minX = absoluteMoves.minOfOrNull { it.to.x } ?: 0.0
                val maxX = absoluteMoves.maxOfOrNull { it.to.x } ?: 0.0
                val minY = absoluteMoves.minOfOrNull { it.to.y } ?: 0.0
                val maxY = absoluteMoves.maxOfOrNull { it.to.y } ?: 0.0
                val minZ = absoluteMoves.minOfOrNull { it.z } ?: 0.0
                val maxZ = absoluteMoves.maxOfOrNull { it.z } ?: 0.0
                val animationSummary = runCatching {
                    val program = CncPost.generate(
                        result.cam,
                        FanucPostSettings(
                            workOffset = workOffset,
                            axisA = axisA,
                            axisB = axisB,
                            controller = controllerProfile,
                            coordinateMode = ncCoordinateMode,
                            originTransformMode = ncOriginTransformMode,
                            cutterCompensation = ncCutterCompensation
                        )
                    )
                    NcExecutionTimeline.programSummary(program,controllerProfile,rotaryClampProfile=rotaryClampProfile,rotaryMode=currentRotaryOperationMode())
                }.getOrElse { error ->
                    "NC→3D ANIM BLOCKED • NC_POST=" + (error.message ?: "error")
                }
                box.addView(TextView(this).apply {
                    setTextColor(0xFF63FF9D.toInt())
                    textSize = 12f
                    setPadding(dp(12), dp(6), dp(12), dp(8))
                    text = "TRUE 3D • mesh V=" + result.mesh.vertices.size +
                        " T=" + result.mesh.triangles.size +
                        " • CAM=" + result.cam.toolpaths.size +
                        " • CUT=" + cuts +
                        " • removed=" + removed +
                        " • 精度 0.001 mm" +
                        "\nABS " + SoftwareCoordinateContract.coordinateMode() +
                        " • MASTER " + SoftwareCoordinateContract.masterOriginData() +
                        " • X[" + DisplayFormat.mm(minX) + ".." + DisplayFormat.mm(maxX) + "]" +
                        " • Y[" + DisplayFormat.mm(minY) + ".." + DisplayFormat.mm(maxY) + "]" +
                        " • Z[" + DisplayFormat.mm(minZ) + ".." + DisplayFormat.mm(maxZ) + "]" +
                        " • NC MODE=" + ncCoordinateMode.code +
                        " • ORIGIN=" + ncOriginTransformMode.code +
                        " • COMP=" + ncCutterCompensation.code +
                        " • " + workOffset + " NC-only • OFFSET SHIFT=OFF • TOLERANCE SHIFT=OFF" +
                        "\n" + animationSummary
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

            val rgbLevel = getSharedPreferences("aig_environment", MODE_PRIVATE).getInt("rgb_brightness", 65)
            val rgbMode = when(rgbLevel) {
                0 -> RgbStressMode.RGB_OFF
                100 -> RgbStressMode.RGB_MAX
                else -> null
            }
            if(rgbMode != null && monitorFps > 0.0 && monitorFrameTimeMs >= 0.0) {
                RgbMaxStressProfiler.record(
                    rgbMode,
                    RgbStressSample(
                        fps=monitorFps,
                        frameTimeMs=monitorFrameTimeMs,
                        cpuPercent=cpuLoad,
                        temperatureC=if(tempC.isNaN()) null else tempC,
                        droppedFrames=monitorDroppedFrames,
                        hardwareEvidence=true
                    )
                )
            }
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
            " | AUTO CAP " + (adaptiveRefreshController?.currentCpuThermalCap() ?: 120) + " FPS" +
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
            RenderStressProfiler.reset()
            RgbMaxStressProfiler.reset()
            Toast.makeText(this, "監控、3D/5X 與 RGB A/B 壓力資料已清除", Toast.LENGTH_SHORT).show()
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
                    appendLine(RenderStressProfiler.summary())
                    appendLine(RgbMaxStressProfiler.summary())
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

private fun applyCoordinatePrecisionPreference() {
        val prefs=getSharedPreferences("aig_environment", MODE_PRIVATE)
        val display=CoordinatePrecisionMode.fromStorage(
            prefs.getString("coordinate_precision","0.001")
        )
        val nc=CoordinatePrecisionMode.fromStorage(
            prefs.getString("nc_output_precision","0.001")
        )
        CoordinatePrecisionRuntime.configure(display=display,input=display,ncOutput=nc)
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

        val coordinatePrecisionValues = arrayOf("0.001","0.01","0.1")
        val coordinatePrecisionLabels = arrayOf("0.001 mm","0.01 mm","0.1 mm")
        val coordinatePrecision = Spinner(this).apply {
            adapter = ArrayAdapter(this@MainActivity, android.R.layout.simple_spinner_dropdown_item, coordinatePrecisionLabels)
            val current = prefs.getString("coordinate_precision","0.001") ?: "0.001"
            setSelection(coordinatePrecisionValues.indexOf(current).coerceAtLeast(0))
            box.addView(TextView(this@MainActivity).apply { text = "座標顯示 / 輸入步進" })
            box.addView(this)
        }

        val ncPrecision = Spinner(this).apply {
            adapter = ArrayAdapter(this@MainActivity, android.R.layout.simple_spinner_dropdown_item, coordinatePrecisionLabels)
            val current = prefs.getString("nc_output_precision","0.001") ?: "0.001"
            setSelection(coordinatePrecisionValues.indexOf(current).coerceAtLeast(0))
            box.addView(TextView(this@MainActivity).apply { text = "NC 輸出精度（獨立設定）" })
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

        box.addView(TextView(this).apply {
            text = "即時套用：FPS / 120Hz / CPU/GPU 溫度 / HUD / RGB / 熱控\nRGB A/B：設 0% 或 100% 會自動記錄真機 FPS / CPU / 溫度\n重開套用：3D / SIM 畫質核心"
            setTextColor(0xFFA0BED2.toInt())
            textSize = 11f
            setPadding(dp(4), dp(10), dp(4), dp(4))
        })

        AlertDialog.Builder(this)
            .setTitle("AIG CNC 系統環境設定")
            .setView(box)
            .setPositiveButton("套用") { _, _ ->
                val selectedFps = fpsValues[fps.selectedItemPosition]
                val selectedQuality = qualityValues[quality.selectedItemPosition]
                val previousQuality = prefs.getString("render_quality", "High") ?: "High"
                val restartRequired =
                    prefs.getBoolean("restart_required", false) ||
                    SettingsApplyPolicy.requiresRestart(previousQuality, selectedQuality)
                prefs.edit()
                    .putString("fps_mode", selectedFps)
                    .putString("power_mode", powerValues[power.selectedItemPosition])
                    .putString("render_quality", selectedQuality)
                    .putString("coordinate_precision", coordinatePrecisionValues[coordinatePrecision.selectedItemPosition])
                    .putString("nc_output_precision", coordinatePrecisionValues[ncPrecision.selectedItemPosition])
                    .putBoolean("restart_required", restartRequired)
                    .putString("restart_reason", if (restartRequired) "3D_SIM_RENDER_QUALITY" else "")
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
                val selectedCoordinatePrecision=CoordinatePrecisionMode.fromStorage(
                    coordinatePrecisionValues[coordinatePrecision.selectedItemPosition]
                )
                val selectedNcPrecision=CoordinatePrecisionMode.fromStorage(
                    coordinatePrecisionValues[ncPrecision.selectedItemPosition]
                )
                CoordinatePrecisionRuntime.configure(
                    display=selectedCoordinatePrecision,
                    input=selectedCoordinatePrecision,
                    ncOutput=selectedNcPrecision
                )

                applySystemHudPreference(systemHud.isChecked)
                applyFpsDisplayPreference(fpsDisplay.isChecked)
                applyTemperatureDisplayPreference(temperatureDisplay.isChecked)
                adaptiveRefreshController?.applyFromPreferences()
                RgbGlowButton.setGlobalBrightness(rgb.progress)
                Toast.makeText(
                    this,
                    "ENV APPLIED • " + selectedFps + " • RGB " + rgb.progress + "% • " + CoordinatePrecisionRuntime.summary() +
                        if (restartRequired) " • 3D/SIM 畫質：重開後完整生效" else "",
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
                    "\nCLEAR-TEXT HTTP: BLOCKED" +
                    "\nREMOTE CIRCUIT: " + UpdateNetworkCircuitBreaker.status()
            )
            .setPositiveButton("OK", null)
            .show()
    }

    private fun runSecureUpdateCheck() {
        val config = UpdateConfigStore.load(this)
        if (!config.configured) {
            Toast.makeText(this, "AI 更新設定未完成 • Runtime 正常", Toast.LENGTH_SHORT).show()
            showUpdateSettings()
            return
        }
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

    private fun markProjectDirty() { sharedLocalDirty.set(true) }

    private fun localProjectFile():File = File(filesDir,"projects/current.aigp")
    private fun recoveryProjectFile():File = File(filesDir,"recovery/current-recovery.aigp")
    private fun sharedProjectFile():File = File(filesDir,"shared-sync/current.aigp")

    private fun captureCurrentProject():StudioProjectPackage {
        val local=localProjectFile()
        val baseMeta=runCatching {
            if(local.isFile) StudioProjectRepository.load(local).revisionMeta else sharedLocalRevisionMeta
        }.getOrDefault(sharedLocalRevisionMeta)
        return cad.capturePortableProject(
            camSettings,axisA,axisB,machiningAxisMode,unifiedNcDraft.orEmpty(),
            axisC,camFixtures,camToolAssembly
        ).copy(revisionMeta=baseMeta)
    }

    private fun applyProjectPackage(project:StudioProjectPackage) {
        cad.applyPortableProject(project)
        camSettings=project.camSettings
        axisA=project.axisA;axisB=project.axisB;axisC=project.axisC
        machiningAxisMode=project.axisMode
        camFixtures.clear();camFixtures.addAll(project.fixtures)
        camToolAssembly=project.toolAssembly
        nextCamFixtureId=(camFixtures.maxOfOrNull{it.id} ?: 0L)+1L
        unifiedNcDraft=project.ncText.takeIf{it.isNotBlank()}
        unifiedNcDraftSourceSignature=currentUnifiedNcSourceSignature()
        unifiedNcDraftStale=false
        sharedLocalRevisionMeta=project.revisionMeta
        sharedLocalDirty.set(false)
    }

    private fun saveCurrentProjectRevision():StudioProjectPackage {
        val local=localProjectFile()
        local.parentFile?.mkdirs()
        val savedMeta=StudioProjectRepository.saveRevisioned(
            captureCurrentProject(),local,"ANDROID",android.os.Build.MODEL.take(64)
        )
        val saved=StudioProjectRepository.load(local)
        require(saved.revisionMeta==savedMeta)
        sharedLocalRevisionMeta=saved.revisionMeta
        sharedLocalDirty.set(false)
        return saved
    }

    private fun showProjectSyncResolution() {
        val shared=sharedProjectFile()
        if(!shared.isFile){
            Toast.makeText(this,"共享專案尚不存在",Toast.LENGTH_LONG).show()
            return
        }
        val remote=runCatching{StudioProjectRepository.load(shared)}.getOrElse{
            Toast.makeText(this,"共享專案 BLOCKED • "+(it.message?:"error"),Toast.LENGTH_LONG).show()
            return
        }
        val local=localProjectFile()
        val localPackage=runCatching{if(local.isFile)StudioProjectRepository.load(local) else captureCurrentProject()}.getOrElse{
            Toast.makeText(this,"本機專案 BLOCKED • "+(it.message?:"error"),Toast.LENGTH_LONG).show()
            return
        }
        val state=ProjectRevisionSync.classify(localPackage.revisionMeta,remote.revisionMeta,sharedLocalDirty.get())
        AlertDialog.Builder(this)
            .setTitle("共享專案 • "+state.name)
            .setMessage(ProjectRevisionSync.statusLabel(state,remote.revisionMeta)+"\n"+
                "遠端 R"+remote.revisionMeta.revision+" • 本機 R"+localPackage.revisionMeta.revision+"\n"+
                "不會自動覆蓋；請明確選擇。")
            .setPositiveButton("採用新版"){_,_->
                runCatching{
                    applyProjectPackage(remote)
                    local.parentFile?.mkdirs()
                    StudioProjectRepository.save(remote,local)
                }.onSuccess{Toast.makeText(this,"已採用共享新版 • R"+remote.revisionMeta.revision,Toast.LENGTH_LONG).show()}
                 .onFailure{Toast.makeText(this,"採用 BLOCKED • "+(it.message?:"error"),Toast.LENGTH_LONG).show()}
            }
            .setNegativeButton("保留本機"){_,_->
                sharedLocalDirty.set(true)
                Toast.makeText(this,"保留本機 • 未覆蓋共享檔",Toast.LENGTH_LONG).show()
            }
            .setNeutralButton("另存副本"){_,_->
                runCatching{
                    val dir=File(filesDir,"projects").apply{mkdirs()}
                    val copy=File(dir,"local-copy-R"+localPackage.revisionMeta.revision+"-"+System.currentTimeMillis()+".aigp")
                    StudioProjectRepository.save(localPackage,copy)
                    copy
                }.onSuccess{Toast.makeText(this,"本機副本已保留 • "+it.name,Toast.LENGTH_LONG).show()}
                 .onFailure{Toast.makeText(this,"另存 BLOCKED • "+(it.message?:"error"),Toast.LENGTH_LONG).show()}
            }
            .show()
    }

    private fun publishCurrentProjectConfirmed() {
        val local=runCatching{
            saveCurrentProjectRevision()
            localProjectFile()
        }.getOrElse{
            Toast.makeText(this,"專案儲存 BLOCKED • "+(it.message?:"error"),Toast.LENGTH_LONG).show()
            return
        }
        val shared=sharedProjectFile().apply{parentFile?.mkdirs()}
        val expected=runCatching{if(shared.isFile)StudioProjectRepository.load(shared).revisionMeta.contentDigest else null}.getOrNull()
        val localMeta=StudioProjectRepository.load(local).revisionMeta
        AlertDialog.Builder(this)
            .setTitle("共享發布確認")
            .setMessage("本機 R"+localMeta.revision+" → 共享專案\n若共享檔在確認後改變，發布會自動 BLOCKED。")
            .setPositiveButton("確認發布"){_,_->
                runCatching{
                    SharedProjectFolderSync.publishConfirmed(
                        local,shared,expected,{StudioProjectRepository.load(it).revisionMeta},true
                    )
                }.onSuccess{meta->
                    sharedLocalRevisionMeta=meta;sharedLocalDirty.set(false)
                    Toast.makeText(this,"共享發布完成 • R"+meta.revision,Toast.LENGTH_LONG).show()
                }.onFailure{Toast.makeText(this,"共享發布 BLOCKED • "+(it.message?:"error"),Toast.LENGTH_LONG).show()}
            }
            .setNegativeButton("取消",null)
            .show()
    }

    private fun showProjectFileBranch() {
        branchFlow.removeAllViews();toolButtons.clear()
        addActionTo(branchFlow,"專案儲存",1){
            runCatching{saveCurrentProjectRevision()}
                .onSuccess{Toast.makeText(this,"專案已儲存 • R"+it.revisionMeta.revision+" • V3",Toast.LENGTH_LONG).show()}
                .onFailure{Toast.makeText(this,"專案儲存 BLOCKED • "+(it.message?:"error"),Toast.LENGTH_LONG).show()}
        }
        addActionTo(branchFlow,"專案開啟",0){
            val file=localProjectFile()
            runCatching{require(file.isFile){"尚無本機專案"};StudioProjectRepository.load(file)}
                .onSuccess{applyProjectPackage(it);Toast.makeText(this,"專案已開啟 • R"+it.revisionMeta.revision+" • FIXTURE "+it.fixtures.size,Toast.LENGTH_LONG).show()}
                .onFailure{Toast.makeText(this,"專案開啟 BLOCKED • "+(it.message?:"error"),Toast.LENGTH_LONG).show()}
        }
        addActionTo(branchFlow,"共享狀態",2){showProjectSyncResolution()}
        addActionTo(branchFlow,"共享發布",5){publishCurrentProjectConfirmed()}
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
        "繪圖" -> colors[0]; "修改" -> colors[3]; "角部" -> colors[2]; "加工" -> colors[5]; "安全" -> colors[4]; "檔案" -> colors[1]; else -> colors[1]
    }

    private fun selectTool(tool: Tool) {
        cad.setTool(tool)
        // Exactly one active tool: selecting a new one extinguishes every previous light.
        toolButtons.forEach { (t, b) -> styleButton(b, toolColor(t), selected = t == tool) }
    }
    private fun toolColor(tool: Tool): Int = when (tool) {
        Tool.LINE, Tool.PAN -> colors[0]; Tool.RECT, Tool.FILLET, Tool.SELECT -> colors[1]
        Tool.CIRCLE, Tool.CHAMFER -> colors[2]; Tool.ARC -> colors[3]; Tool.HOLE, Tool.DELETE -> colors[4]
        Tool.MEASURE -> colors[5]
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

class CadView(
    context: Context,
    private val onGeometryChanged: () -> Unit = {},
    private val onProjectChanged: () -> Unit = {}
) : View(context) {
    private val doc = DrawingDocument()
    private val history = History(doc)
    private val gridPaint = Paint(1).apply { color = 0xFF163044.toInt() }
    private val axisPaint = Paint(2).apply { color = 0xFF00B8D4.toInt() }
    private val geoPaint = Paint(3).apply { color = 0xFFE8F1FA.toInt(); style = Paint.Style.STROKE; strokeCap = Paint.Cap.ROUND }
    private val accentPaint = Paint(3).apply { color = 0xFFFFB020.toInt(); style = Paint.Style.STROKE }
    private val controlFill = Paint(Paint.ANTI_ALIAS_FLAG).apply { color = 0xFF3DEBFF.toInt(); style = Paint.Style.FILL }
    private val controlStroke = Paint(Paint.ANTI_ALIAS_FLAG).apply { color = 0xFFFFB020.toInt(); style = Paint.Style.STROKE; strokeWidth = 2f * resources.displayMetrics.density }
    private val textPaint = Paint(1).apply { color = 0xFF8FB3C9.toInt(); textSize = 14 * resources.displayMetrics.scaledDensity; isDither = true }
    private val gridPath = Path()
    private val normalLinePath = Path()
    private val selectedLinePath = Path()
    private val arcPath = Path()
    private val renderEngine = CadRenderEngine("AIG-Studio-CAD2D")
    private var sceneRevision = 1L
    private var tool = Tool.LINE
    private var firstPoint: Vec2? = null
    private var arcCenter: Vec2? = null
    private var arcStart: Vec2? = null
    private val selectedIds = linkedSetOf<String>()
    private val transform = WorldTransform(0.0, 0.0, 5.0)
    private var lastX = 0f; private var lastY = 0f
    private var lastWorld = Vec2(0.0, 0.0)
    var chamferValue = 5.0
    var filletValue = 5.0
    private var snapEnabled = true
    private var gridVisible = true
    private var geometryVisible = true
    private var pendingPickOperation:String? = null

    private val scaleDetector = ScaleGestureDetector(context, object : ScaleGestureDetector.SimpleOnScaleGestureListener() {
        override fun onScale(detector: ScaleGestureDetector): Boolean {
            transform.zoomAt(Vec2(detector.focusX.toDouble(), detector.focusY.toDouble()), detector.scaleFactor.toDouble())
            sceneRevision++
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
    fun capturePortableProject(
        settings:CamSettings,axisA:Double,axisB:Double,axisMode:String,ncText:String,
        axisC:Double=0.0,fixtures:List<FixtureObstacle> = emptyList(),
        toolAssembly:ToolAssemblyConfig = ToolAssemblyConfig()
    ):StudioProjectPackage =
        StudioProjectRepository.capture(
            doc,settings,axisA,axisB,axisMode,ncText,axisC,fixtures,toolAssembly
        )
    fun applyPortableProject(project:StudioProjectPackage) {
        StudioProjectRepository.applyTo(project,doc)
        firstPoint=null; arcCenter=null; arcStart=null; selectedIds.clear(); sceneRevision++; invalidate()
    }
    fun exportState(): String = buildString {
        doc.all().forEach { e ->
            when (e) {
                is Line -> append("L|").append(e.id).append('|').append(e.a.x).append('|').append(e.a.y).append('|').append(e.b.x).append('|').append(e.b.y).append('\n')
                is Circle -> append("C|").append(e.id).append('|').append(e.center.x).append('|').append(e.center.y).append('|').append(e.radius).append('\n')
                is Arc -> append("A|").append(e.id).append('|').append(e.center.x).append('|').append(e.center.y).append('|').append(e.radius).append('|').append(e.start.x).append('|').append(e.start.y).append('|').append(e.end.x).append('|').append(e.end.y).append('|').append(e.clockwise).append('\n')
            }
        }
        doc.links().forEach { link ->
            append("T|").append(link.aId).append('|').append(link.bId).append('\n')
        }
    }
    fun importState(raw: String) {
        val restored = mutableListOf<Entity>()
        val restoredLinks = mutableListOf<CadTopologyLink>()
        raw.lineSequence().filter { it.isNotBlank() }.forEach { line ->
            val p = line.split('|')
            when (p.firstOrNull()) {
                "L" -> if (p.size == 6) restored += Line(p[1], Vec2(p[2].toDouble(), p[3].toDouble()), Vec2(p[4].toDouble(), p[5].toDouble()))
                "C" -> if (p.size == 5) restored += Circle(p[1], Vec2(p[2].toDouble(), p[3].toDouble()), p[4].toDouble())
                "A" -> if (p.size == 10) restored += Arc(
                    p[1], Vec2(p[2].toDouble(), p[3].toDouble()), p[4].toDouble(),
                    Vec2(p[5].toDouble(), p[6].toDouble()), Vec2(p[7].toDouble(), p[8].toDouble()), p[9].toBooleanStrictOrNull() ?: false
                )
                "T" -> if (p.size == 3) restoredLinks += CadTopologyLink.of(p[1],p[2])
            }
        }
        if (restored.isNotEmpty()) {
            doc.clear()
            restored.forEach(doc::put)
            doc.restoreLinks(restoredLinks)
            firstPoint = null
            arcCenter = null
            arcStart = null
            selectedIds.clear()
            sceneRevision++
            invalidate()
        }
    }
    fun setTool(t: Tool) {
        tool = t
        pendingPickOperation = null
        firstPoint = null
        arcCenter = null
        arcStart = null
        selectedIds.clear()
        sceneRevision++
        invalidate()
    }
    fun undo() {
        val geometryChanged = history.undoWithEffect() ?: return
        firstPoint = null; arcCenter=null; arcStart=null; selectedIds.clear(); sceneRevision++
        onProjectChanged()
        if (geometryChanged) onGeometryChanged()
        invalidate()
    }
    fun redo() {
        val geometryChanged = history.redoWithEffect() ?: return
        firstPoint = null; arcCenter=null; arcStart=null; selectedIds.clear(); sceneRevision++
        onProjectChanged()
        if (geometryChanged) onGeometryChanged()
        invalidate()
    }
    fun toggleSnap() {
        snapEnabled = !snapEnabled
        Toast.makeText(
            context,
            "SNAP " + if (snapEnabled) "ON • END/MID/CENTER/INTERSECTION/TANGENT/H/V" else "OFF",
            Toast.LENGTH_SHORT
        ).show()
        invalidate()
    }
    fun toggleGrid() { gridVisible = !gridVisible; sceneRevision++; invalidate() }
    fun toggleGeometry() { geometryVisible = !geometryVisible; sceneRevision++; invalidate() }

    fun fitView() {
        val entities=doc.all()
        if(width<=0 || height<=0 || entities.isEmpty()) {
            transform.originScreenX=width.coerceAtLeast(1)/2.0
            transform.originScreenY=height.coerceAtLeast(1)/2.0
            transform.pixelsPerUnit=5.0
            sceneRevision++
            invalidate()
            return
        }
        var minX=Double.POSITIVE_INFINITY
        var minY=Double.POSITIVE_INFINITY
        var maxX=Double.NEGATIVE_INFINITY
        var maxY=Double.NEGATIVE_INFINITY
        fun include(x:Double,y:Double) {
            minX=min(minX,x); minY=min(minY,y)
            maxX=max(maxX,x); maxY=max(maxY,y)
        }
        entities.forEach { e ->
            when(e) {
                is Line -> { include(e.a.x,e.a.y); include(e.b.x,e.b.y) }
                is Circle -> {
                    include(e.center.x-e.radius,e.center.y-e.radius)
                    include(e.center.x+e.radius,e.center.y+e.radius)
                }
                is Arc -> {
                    include(e.center.x-e.radius,e.center.y-e.radius)
                    include(e.center.x+e.radius,e.center.y+e.radius)
                }
            }
        }
        val spanX=(maxX-minX).coerceAtLeast(1.0)
        val spanY=(maxY-minY).coerceAtLeast(1.0)
        val marginPx=48.0*resources.displayMetrics.density
        val usableW=(width-2.0*marginPx).coerceAtLeast(1.0)
        val usableH=(height-2.0*marginPx).coerceAtLeast(1.0)
        transform.pixelsPerUnit=min(usableW/spanX,usableH/spanY).coerceIn(0.2,200.0)
        val cx=(minX+maxX)/2.0
        val cy=(minY+maxY)/2.0
        transform.originScreenX=width/2.0-cx*transform.pixelsPerUnit
        transform.originScreenY=height/2.0+cy*transform.pixelsPerUnit
        sceneRevision++
        invalidate()
    }

    private fun runGeometryCommand(command: Command) {
        history.run(command)
        sceneRevision++
        onProjectChanged()
        onGeometryChanged()
        invalidate()
    }

    private fun runTopologyCommand(command: Command) {
        history.run(command)
        sceneRevision++
        onProjectChanged()
        invalidate()
    }

    private fun ensureSelection(action: String): Boolean {
        if (selectedIds.isNotEmpty()) return true
        Toast.makeText(context, "$action：請先用「選取」點選幾何", Toast.LENGTH_SHORT).show()
        return false
    }

    fun promptMoveCopy(copy: Boolean) {
        val action = if (copy) "複製" else "移動"
        if (!ensureSelection(action)) return
        val box = LinearLayout(context).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(24,12,24,4)
        }
        fun value(hintText:String)=EditText(context).apply {
            hint=hintText
            setText("0.000")
            inputType=InputType.TYPE_CLASS_NUMBER or InputType.TYPE_NUMBER_FLAG_DECIMAL or InputType.TYPE_NUMBER_FLAG_SIGNED
            box.addView(this)
        }
        val dx=value("ΔX mm")
        val dy=value("ΔY mm")
        AlertDialog.Builder(context)
            .setTitle("$action • ${selectedIds.size} 個幾何")
            .setView(box)
            .setPositiveButton("套用") { _, _ ->
                val x=dx.text.toString().toDoubleOrNull()
                val y=dy.text.toString().toDoubleOrNull()
                if(x==null || y==null) {
                    Toast.makeText(context,"$action BLOCKED：ΔX/ΔY 格式錯誤",Toast.LENGTH_SHORT).show()
                } else runCatching {
                    if(copy) {
                        val before=doc.all().map{it.id}.toSet()
                        runGeometryCommand(CadEditEngine.copyCommand(doc,selectedIds,x,y))
                        selectedIds.clear()
                        selectedIds.addAll(doc.all().map{it.id}.filter{it !in before})
                    } else {
                        runGeometryCommand(CadEditEngine.moveCommand(doc,selectedIds,x,y))
                    }
                }.onFailure {
                    Toast.makeText(context,"$action BLOCKED：" + (it.message ?: "error"),Toast.LENGTH_SHORT).show()
                }
            }
            .setNegativeButton("取消",null)
            .show()
    }

    fun promptRotate() {
        if (!ensureSelection("旋轉")) return
        val input=EditText(context).apply {
            setText("90.000")
            inputType=InputType.TYPE_CLASS_NUMBER or InputType.TYPE_NUMBER_FLAG_DECIMAL or InputType.TYPE_NUMBER_FLAG_SIGNED
        }
        AlertDialog.Builder(context)
            .setTitle("旋轉 • 選取中心")
            .setView(input)
            .setPositiveButton("套用") { _, _ ->
                val angle=input.text.toString().toDoubleOrNull()
                if(angle==null) Toast.makeText(context,"旋轉 BLOCKED：角度格式錯誤",Toast.LENGTH_SHORT).show()
                else runCatching {
                    runGeometryCommand(CadEditEngine.rotateCommand(doc,selectedIds,angle))
                }.onFailure {
                    Toast.makeText(context,"旋轉 BLOCKED：" + (it.message ?: "error"),Toast.LENGTH_SHORT).show()
                }
            }
            .setNegativeButton("取消",null)
            .show()
    }

    fun mirrorSelected(vertical: Boolean) {
        if (!ensureSelection("鏡射")) return
        runCatching {
            val command = if(vertical)
                CadEditEngine.mirrorVerticalCommand(doc,selectedIds)
            else CadEditEngine.mirrorHorizontalCommand(doc,selectedIds)
            runGeometryCommand(command)
        }.onFailure {
            Toast.makeText(context,"鏡射 BLOCKED：" + (it.message ?: "error"),Toast.LENGTH_SHORT).show()
        }
    }

    fun connectSelected() {
        if (!ensureSelection("連接")) return
        runCatching {
            runTopologyCommand(CadEditEngine.connectCommand(doc,selectedIds,JOIN_TOLERANCE_MM))
            Toast.makeText(context,"CONNECT PASS • TOPOLOGY ONLY • 0.001 mm",Toast.LENGTH_SHORT).show()
        }.onFailure {
            Toast.makeText(context,"CONNECT BLOCKED：" + (it.message ?: "error"),Toast.LENGTH_SHORT).show()
        }
    }

    fun disconnectSelected() {
        if (!ensureSelection("斷開")) return
        runCatching {
            runTopologyCommand(CadEditEngine.disconnectCommand(doc,selectedIds))
            Toast.makeText(context,"DISCONNECT PASS • TOPOLOGY ONLY",Toast.LENGTH_SHORT).show()
        }.onFailure {
            Toast.makeText(context,"DISCONNECT BLOCKED：" + (it.message ?: "error"),Toast.LENGTH_SHORT).show()
        }
    }

    fun disconnectAllTopology() {
        val before=doc.links().size
        if(before==0) {
            Toast.makeText(context,"全部斷開：目前沒有連接關係",Toast.LENGTH_SHORT).show()
            return
        }
        runCatching {
            runTopologyCommand(CadEditEngine.disconnectAllCommand())
        }.onSuccess {
            Toast.makeText(
                context,
                "全部斷開 PASS • links=$before • 幾何不變 • CAM/NC 不受 topology 阻擋",
                Toast.LENGTH_SHORT
            ).show()
        }.onFailure {
            Toast.makeText(context,"全部斷開 BLOCKED：" + (it.message ?: "error"),Toast.LENGTH_SHORT).show()
        }
    }

    fun deleteSelected() {
        if (!ensureSelection("刪除選取")) return
        runCatching {
            runGeometryCommand(CadEditEngine.deleteCommand(selectedIds))
            selectedIds.clear()
        }.onFailure {
            Toast.makeText(context,"刪除 BLOCKED：" + (it.message ?: "error"),Toast.LENGTH_SHORT).show()
        }
    }

    fun trimSelected() {
        if(selectedIds.size==2) {
            runCatching { runGeometryCommand(CadEditEngine.trimCommand(doc,selectedIds)) }
                .onSuccess { Toast.makeText(context,"TRIM PASS • CAM/SIM/NC REBUILD",Toast.LENGTH_SHORT).show() }
                .onFailure { Toast.makeText(context,"TRIM BLOCKED：" + (it.message ?: "error"),Toast.LENGTH_SHORT).show() }
            return
        }
        tool=Tool.SELECT
        selectedIds.clear()
        pendingPickOperation="TRIM"
        sceneRevision++
        invalidate()
        Toast.makeText(context,"TRIM • 先點目標 LINE，再點邊界 LINE",Toast.LENGTH_SHORT).show()
    }

    fun extendSelected() {
        if(selectedIds.size==2) {
            runCatching { runGeometryCommand(CadEditEngine.extendCommand(doc,selectedIds)) }
                .onSuccess { Toast.makeText(context,"EXTEND PASS • CAM/SIM/NC REBUILD",Toast.LENGTH_SHORT).show() }
                .onFailure { Toast.makeText(context,"EXTEND BLOCKED：" + (it.message ?: "error"),Toast.LENGTH_SHORT).show() }
            return
        }
        tool=Tool.SELECT
        selectedIds.clear()
        pendingPickOperation="EXTEND"
        sceneRevision++
        invalidate()
        Toast.makeText(context,"EXTEND • 先點目標 LINE，再點邊界 LINE",Toast.LENGTH_SHORT).show()
    }

    private fun handlePendingPick(p:Vec2):Boolean {
        val operation=pendingPickOperation ?: return false
        val line=nearest(p) as? Line
        if(line==null) {
            Toast.makeText(context,"$operation • 請點 LINE",Toast.LENGTH_SHORT).show()
            return true
        }
        if(line.id in selectedIds) {
            Toast.makeText(context,"$operation • 請點另一條邊界 LINE",Toast.LENGTH_SHORT).show()
            return true
        }
        selectedIds.add(line.id)
        sceneRevision++
        invalidate()
        if(selectedIds.size==1) {
            Toast.makeText(context,"$operation • 目標已選，請點邊界 LINE",Toast.LENGTH_SHORT).show()
            return true
        }
        val ids=selectedIds.toList()
        val result=runCatching {
            val command=if(operation=="TRIM")
                CadEditEngine.trimCommand(doc,ids)
            else CadEditEngine.extendCommand(doc,ids)
            runGeometryCommand(command)
        }
        selectedIds.clear()
        pendingPickOperation=null
        result.onSuccess {
            Toast.makeText(context,"$operation PASS • CAM/SIM/NC REBUILD",Toast.LENGTH_SHORT).show()
        }.onFailure {
            Toast.makeText(context,"$operation BLOCKED：" + (it.message ?: "error"),Toast.LENGTH_SHORT).show()
        }
        sceneRevision++
        invalidate()
        return true
    }

    fun promptOffset() {
        if (!ensureSelection("OFFSET")) return
        val input=EditText(context).apply {
            setText("1.000")
            inputType=InputType.TYPE_CLASS_NUMBER or InputType.TYPE_NUMBER_FLAG_DECIMAL or InputType.TYPE_NUMBER_FLAG_SIGNED
        }
        AlertDialog.Builder(context)
            .setTitle("OFFSET • mm")
            .setView(input)
            .setPositiveButton("套用") { _, _ ->
                val value=input.text.toString().toDoubleOrNull()
                if(value==null) Toast.makeText(context,"OFFSET BLOCKED：格式錯誤",Toast.LENGTH_SHORT).show()
                else runCatching { runGeometryCommand(CadEditEngine.offsetCommand(doc,selectedIds,value)) }
                    .onFailure { Toast.makeText(context,"OFFSET BLOCKED：" + (it.message ?: "error"),Toast.LENGTH_SHORT).show() }
            }
            .setNegativeButton("取消",null)
            .show()
    }

    fun promptArray() {
        if (!ensureSelection("ARRAY")) return
        val box=LinearLayout(context).apply{orientation=LinearLayout.VERTICAL;setPadding(24,12,24,4)}
        fun field(label:String,initial:String)=EditText(context).apply{hint=label;setText(initial);inputType=InputType.TYPE_CLASS_NUMBER or InputType.TYPE_NUMBER_FLAG_DECIMAL or InputType.TYPE_NUMBER_FLAG_SIGNED;box.addView(this)}
        val count=field("總數","3")
        val dx=field("ΔX mm","10.000")
        val dy=field("ΔY mm","0.000")
        AlertDialog.Builder(context)
            .setTitle("LINEAR ARRAY")
            .setView(box)
            .setPositiveButton("套用") { _, _ ->
                runCatching {
                    val n=count.text.toString().toInt()
                    val x=dx.text.toString().toDouble()
                    val y=dy.text.toString().toDouble()
                    runGeometryCommand(CadEditEngine.linearArrayCommand(doc,selectedIds,n,x,y))
                }.onFailure { Toast.makeText(context,"ARRAY BLOCKED：" + (it.message ?: "error"),Toast.LENGTH_SHORT).show() }
            }
            .setNegativeButton("取消",null)
            .show()
    }

    fun promptDrivenDimension() {
        val id=selectedIds.firstOrNull()
        val entity=id?.let(doc::get)
        if(entity==null){Toast.makeText(context,"尺寸驅動：請先選取幾何",Toast.LENGTH_SHORT).show();return}
        val kind=DimensionDriveEngine.defaultKind(entity)
        val current=DimensionDriveEngine.currentValue(entity,kind)
        val input=EditText(context).apply{
            setText(DisplayFormat.mm(current))
            inputType=InputType.TYPE_CLASS_NUMBER or InputType.TYPE_NUMBER_FLAG_DECIMAL
        }
        AlertDialog.Builder(context)
            .setTitle("尺寸驅動 • ${kind.name}")
            .setView(input)
            .setPositiveButton("套用") { _, _ ->
                val value=input.text.toString().toDoubleOrNull()
                if(value==null) Toast.makeText(context,"DIM BLOCKED：格式錯誤",Toast.LENGTH_SHORT).show()
                else runCatching { runGeometryCommand(DimensionDriveEngine.command(doc,id,value,kind)) }
                    .onFailure { Toast.makeText(context,"DIM BLOCKED：" + (it.message ?: "error"),Toast.LENGTH_SHORT).show() }
            }
            .setNegativeButton("取消",null)
            .show()
    }

    private fun selectedCenterPoint():Vec2? =
        if(selectedIds.isEmpty()) null else runCatching { CadEditEngine.selectionCenter(doc,selectedIds) }.getOrNull()

    private fun promptSelectedCenterEdit(center:Vec2) {
        val box=LinearLayout(context).apply {
            orientation=LinearLayout.VERTICAL
            setPadding(24,12,24,4)
        }
        fun field(label:String,value:String)=EditText(context).apply {
            hint=label
            setText(value)
            inputType=InputType.TYPE_CLASS_NUMBER or InputType.TYPE_NUMBER_FLAG_DECIMAL or InputType.TYPE_NUMBER_FLAG_SIGNED
            box.addView(this)
        }
        val x=field("中心 X mm",DisplayFormat.mm(center.x))
        val y=field("中心 Y mm",DisplayFormat.mm(center.y))
        AlertDialog.Builder(context)
            .setTitle("選取中心點 • 整體移動")
            .setView(box)
            .setPositiveButton("套用"){_,_->
                val px=x.text.toString().toDoubleOrNull()
                val py=y.text.toString().toDoubleOrNull()
                if(px==null || py==null) {
                    Toast.makeText(context,"中心點 BLOCKED：X/Y 格式錯誤",Toast.LENGTH_SHORT).show()
                } else runCatching {
                    runGeometryCommand(
                        CadEditEngine.moveCommand(doc,selectedIds,px-center.x,py-center.y)
                    )
                }.onSuccess {
                    Toast.makeText(context,"中心點 PASS • X="+DisplayFormat.mm(px)+" Y="+DisplayFormat.mm(py),Toast.LENGTH_SHORT).show()
                }.onFailure {
                    Toast.makeText(context,"中心點 BLOCKED："+(it.message?:"error"),Toast.LENGTH_SHORT).show()
                }
            }
            .setNegativeButton("取消",null)
            .show()
    }

    private fun promptControlPointEdit(control:CadControlPoint) {
        val entity=doc.get(control.entityId) ?: return
        val box=LinearLayout(context).apply {
            orientation=LinearLayout.VERTICAL
            setPadding(24,12,24,4)
        }
        fun field(label:String,value:String)=EditText(context).apply {
            hint=label
            setText(value)
            inputType=InputType.TYPE_CLASS_NUMBER or InputType.TYPE_NUMBER_FLAG_DECIMAL or InputType.TYPE_NUMBER_FLAG_SIGNED
            box.addView(this)
        }
        if(control.kind==CadControlPointKind.RADIUS) {
            val current=(entity as? Circle)?.radius ?: return
            val radius=field("R mm",DisplayFormat.mm(current))
            AlertDialog.Builder(context)
                .setTitle("控制點 • 半徑")
                .setView(box)
                .setPositiveButton("套用"){_,_->
                    val r=radius.text.toString().toDoubleOrNull()
                    if(r==null || r<CNC_RESOLUTION_MM) {
                        Toast.makeText(context,"R BLOCKED：半徑需 >= 0.001 mm",Toast.LENGTH_SHORT).show()
                    } else {
                        val circle=doc.get(control.entityId) as? Circle ?: return@setPositiveButton
                        runCatching {
                            runGeometryCommand(
                                CadControlPointEngine.editCommand(
                                    doc,control,circle.center+Vec2(r,0.0)
                                )
                            )
                        }.onSuccess {
                            Toast.makeText(context,"控制點 PASS • R="+DisplayFormat.mm(r),Toast.LENGTH_SHORT).show()
                        }.onFailure {
                            Toast.makeText(context,"控制點 BLOCKED："+(it.message?:"error"),Toast.LENGTH_SHORT).show()
                        }
                    }
                }
                .setNegativeButton("取消",null)
                .show()
            return
        }
        val x=field("X mm",DisplayFormat.mm(control.point.x))
        val y=field("Y mm",DisplayFormat.mm(control.point.y))
        AlertDialog.Builder(context)
            .setTitle("控制點 • "+control.kind.name)
            .setView(box)
            .setPositiveButton("套用"){_,_->
                val px=x.text.toString().toDoubleOrNull()
                val py=y.text.toString().toDoubleOrNull()
                if(px==null || py==null) {
                    Toast.makeText(context,"控制點 BLOCKED：X/Y 格式錯誤",Toast.LENGTH_SHORT).show()
                } else runCatching {
                    runGeometryCommand(CadControlPointEngine.editCommand(doc,control,Vec2(px,py)))
                }.onSuccess {
                    Toast.makeText(context,"控制點 PASS • X="+DisplayFormat.mm(px)+" Y="+DisplayFormat.mm(py),Toast.LENGTH_SHORT).show()
                }.onFailure {
                    Toast.makeText(context,"控制點 BLOCKED："+(it.message?:"error"),Toast.LENGTH_SHORT).show()
                }
            }
            .setNegativeButton("取消",null)
            .show()
    }

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
        sceneRevision++
    }

    override fun onDraw(canvas: Canvas) {
        super.onDraw(canvas)
        val sceneKey = sceneRevision xor (width.toLong() shl 32) xor height.toLong()
        renderEngine.draw(canvas, width, height, sceneKey) { layer ->
            if (gridVisible) drawGrid(layer)
            if (geometryVisible) drawEntities(layer)
        }
        firstPoint?.let { val p = transform.worldToScreen(it); canvas.drawCircle(p.x.toFloat(), p.y.toFloat(), 8f, accentPaint) }
        canvas.drawText("精度 0.001 mm • 顯示 0.000 • ${StudioDisplayPolicy.profile(this).tier} • ${renderEngine.backendName} cache=${renderEngine.cacheHits}/${renderEngine.recordings} • ${tool.name}   X ${DisplayFormat.mm(lastWorld.x)}  Y ${DisplayFormat.mm(lastWorld.y)}   C${DisplayFormat.mm(chamferValue)} R${DisplayFormat.mm(filletValue)}", 16f, 26f, textPaint)
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
                val path = if (e.id in selectedIds) selectedLinePath else normalLinePath
                path.moveTo(a.x.toFloat(), a.y.toFloat())
                path.lineTo(b.x.toFloat(), b.y.toFloat())
            }
            is Circle -> {
                val p = transform.worldToScreen(e.center)
                val paint = if (e.id in selectedIds) accentPaint else geoPaint
                canvas.drawCircle(p.x.toFloat(), p.y.toFloat(), (e.radius * transform.pixelsPerUnit).toFloat(), paint)
            }
            is Arc -> {
                val paint = if (e.id in selectedIds) accentPaint else geoPaint
                drawArcPolyline(canvas, e, paint)
            }
        } }
        geoPaint.color = 0xFFE8F1FA.toInt()
        canvas.drawPath(normalLinePath, geoPaint)
        accentPaint.color = 0xFFFFB020.toInt()
        canvas.drawPath(selectedLinePath, accentPaint)

        doc.links().forEach { link ->
            val a=doc.get(link.aId) as? Line
            val b=doc.get(link.bId) as? Line
            if(a!=null && b!=null) {
                val pa=listOf(a.a,a.b).minByOrNull { p -> min(p.distanceTo(b.a),p.distanceTo(b.b)) }
                val pb=listOf(b.a,b.b).minByOrNull { p -> pa?.distanceTo(p) ?: Double.MAX_VALUE }
                if(pa!=null && pb!=null) {
                    val sa=transform.worldToScreen(pa); val sb=transform.worldToScreen(pb)
                    canvas.drawCircle(sa.x.toFloat(),sa.y.toFloat(),6f,accentPaint)
                    canvas.drawCircle(sb.x.toFloat(),sb.y.toFloat(),6f,accentPaint)
                }
            }
        }
        drawSelectedControlPoints(canvas)
    }

    private fun drawSelectedControlPoints(canvas:Canvas) {
        if(selectedIds.isEmpty()) return
        val density=resources.displayMetrics.density
        val outer=7f*density
        val inner=3.2f*density
        CadControlPointEngine.points(doc,selectedIds).forEach { control ->
            val p=transform.worldToScreen(control.point)
            controlStroke.color=if(control.kind==CadControlPointKind.CENTER) 0xFFFFB020.toInt() else 0xFF3DEBFF.toInt()
            canvas.drawCircle(p.x.toFloat(),p.y.toFloat(),outer,controlStroke)
            controlFill.color=if(control.kind==CadControlPointKind.CENTER) 0xFFFFB020.toInt() else 0xFF3DEBFF.toInt()
            canvas.drawCircle(p.x.toFloat(),p.y.toFloat(),inner,controlFill)
            if(control.kind==CadControlPointKind.CENTER) {
                canvas.drawLine(p.x.toFloat()-outer,p.y.toFloat(),p.x.toFloat()+outer,p.y.toFloat(),controlStroke)
                canvas.drawLine(p.x.toFloat(),p.y.toFloat()-outer,p.x.toFloat(),p.y.toFloat()+outer,controlStroke)
            }
        }
        selectedCenterPoint()?.let { center ->
            val p=transform.worldToScreen(center)
            val r=9f*density
            controlStroke.color=0xFF63FF9D.toInt()
            controlFill.color=0xFF63FF9D.toInt()
            canvas.drawRect(p.x.toFloat()-r,p.y.toFloat()-r,p.x.toFloat()+r,p.y.toFloat()+r,controlStroke)
            canvas.drawCircle(p.x.toFloat(),p.y.toFloat(),3.5f*density,controlFill)
        }
    }

    private fun drawArcPolyline(canvas: Canvas, arc: Arc, paint: Paint = geoPaint) {
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
        canvas.drawPath(arcPath, paint)
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
                sceneRevision++
                invalidate(); return true
            }
            MotionEvent.ACTION_MOVE -> if (tool == Tool.PAN) {
                transform.pan((event.x-lastX).toDouble(), (event.y-lastY).toDouble())
                lastX=event.x; lastY=event.y; sceneRevision++; postInvalidateOnAnimation(); return true
            }
        }
        return true
    }

    private fun handleTap(p: Vec2) {
        when (tool) {
            Tool.LINE -> twoPoint(p) { a,b ->
                if (a.distanceTo(b) >= CNC_RESOLUTION_MM)
                    runGeometryCommand(AddEntitiesCommand(listOf(Line(a=a,b=b))))
            }
            Tool.RECT -> twoPoint(p) { a,b ->
                if (abs(a.x - b.x) < CNC_RESOLUTION_MM || abs(a.y - b.y) < CNC_RESOLUTION_MM) return@twoPoint
                val ids=CadSemanticIdentity.newRectIds()
                runGeometryCommand(AddEntitiesCommand(listOf(
                    Line(id=ids[0],a=a,b=Vec2(b.x,a.y)),
                    Line(id=ids[1],a=Vec2(b.x,a.y),b=b),
                    Line(id=ids[2],a=b,b=Vec2(a.x,b.y)),
                    Line(id=ids[3],a=Vec2(a.x,b.y),b=a)
                )))
            }
            Tool.CIRCLE -> twoPoint(p) { a,b ->
                a.distanceTo(b).takeIf { it >= CNC_RESOLUTION_MM }?.let {
                    runGeometryCommand(AddEntitiesCommand(listOf(Circle(center=a,radius=it))))
                }
            }
            Tool.ARC -> {
                val center=arcCenter
                if(center==null){
                    arcCenter=p
                    Toast.makeText(context,"ARC：中心點",Toast.LENGTH_SHORT).show()
                } else {
                    val start=arcStart
                    if(start==null){
                        if(center.distanceTo(p)>=CNC_RESOLUTION_MM){
                            arcStart=p
                            Toast.makeText(context,"ARC：終點",Toast.LENGTH_SHORT).show()
                        }
                    } else {
                        val radius=center.distanceTo(start)
                        val direction=p-center
                        if(direction.length()>=CNC_RESOLUTION_MM){
                            val end=center+direction.normalized()*radius
                            runGeometryCommand(AddEntitiesCommand(listOf(
                                Arc(center=center,radius=radius,start=start,end=end,clockwise=false)
                            )))
                        }
                        arcCenter=null
                        arcStart=null
                    }
                }
            }
            Tool.HOLE -> twoPoint(p) { center,edge ->
                center.distanceTo(edge).takeIf { it>=CNC_RESOLUTION_MM }?.let { radius ->
                    runGeometryCommand(AddEntitiesCommand(listOf(
                        Circle(id=CadSemanticIdentity.newHoleId(),center=center,radius=radius)
                    )))
                }
            }
            Tool.SELECT -> {
                if(handlePendingPick(p)) return
                val selectedCenter=selectedCenterPoint()
                if(selectedCenter!=null && selectedCenter.distanceTo(p)<=24.0/transform.pixelsPerUnit) {
                    promptSelectedCenterEdit(selectedCenter)
                    return
                }
                val control=if(selectedIds.isNotEmpty())
                    CadControlPointEngine.nearest(doc,selectedIds,p,24.0/transform.pixelsPerUnit)
                else null
                if(control!=null) {
                    promptControlPointEdit(control)
                    return
                }
                nearest(p)?.let { e ->
                    val group=CadSelectionEngine.selectionIds(doc,e)
                    if(group.all{it in selectedIds}) selectedIds.removeAll(group) else selectedIds.addAll(group)
                    sceneRevision++
                    invalidate()
                }
            }
            Tool.DELETE -> nearest(p)?.let { e ->
                runGeometryCommand(DeleteEntitiesCommand(CadSelectionEngine.selectionIds(doc,e)))
            }
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
        return CadSnapEngine.snapTo(doc,p,tolerance,reference=firstPoint) ?: p
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
        return CadSelectionEngine.nearest(doc,p,tolerance)
    }

    private fun selectTwoLines(p: Vec2) {
        val line = nearest(p) as? Line ?: return
        selectedIds.add(line.id)
        if (selectedIds.size == 2) {
            val pair=selectedIds.toList()
            try {
                val command = if (tool == Tool.CHAMFER)
                    chamferCommand(doc, pair[0], pair[1], chamferValue)
                else filletCommand(doc, pair[0], pair[1], filletValue)
                runGeometryCommand(command)
            } catch (ex: Exception) {
                Toast.makeText(context, ex.message ?: "幾何運算失敗", Toast.LENGTH_SHORT).show()
            }
            selectedIds.clear()
        }
        sceneRevision++
        invalidate()
    }
}
