package com.aigstudio.core

enum class FpsMode(val fps:Int){ FPS_30(30), FPS_60(60), FPS_120(120), AUTO(0) }
enum class GlowLevel{ OFF, LOW, MEDIUM, HIGH }
enum class PowerMode{ PERFORMANCE, BALANCED, ECO, AUTO }
enum class RenderQuality{ ULTRA, HIGH, BALANCED, ECO }
enum class OrientationMode{ AUTO, PORTRAIT, LANDSCAPE, WORKSPACE_FIRST }
enum class InputProfile{ TOUCH, SPEN, MOUSE }
enum class MemoryPressure{ NORMAL, MODERATE, HIGH, CRITICAL }

data class AnimationToggles(
    val rgbBreathing:Boolean=true,
    val inertial3d:Boolean=true,
    val axis5x:Boolean=true,
    val toolMotion:Boolean=true,
    val materialRemoval:Boolean=true
)

data class RuntimeEnvironmentSettings(
    val fpsMode:FpsMode=FpsMode.AUTO,
    val maxFps:Int=120,
    val rgbBrightness:Int=65,
    val glowLevel:GlowLevel=GlowLevel.MEDIUM,
    val selectedGlowBoostPercent:Int=20,
    val glassOpacityPercent:Int=70,
    val powerMode:PowerMode=PowerMode.AUTO,
    val renderQuality:RenderQuality=RenderQuality.HIGH,
    val vsync:Boolean=true,
    val idleRedrawThrottle:Boolean=true,
    val idleFps:Int=30,
    val interactionBoostEnabled:Boolean=true,
    val autoThermalThrottle:Boolean=true,
    val thermalCooldownMs:Long=15_000L,
    val frameTimeGateEnabled:Boolean=true,
    val frameTimeBadFramesBeforeDrop:Int=6,
    val frameTimeGoodFramesBeforeRaise:Int=90,
    val memoryPressureModeEnabled:Boolean=true,
    val lowBatteryBalancedThreshold:Int=20,
    val lowBatteryEcoThreshold:Int=10,
    val animations:AnimationToggles=AnimationToggles(),
    val orientationMode:OrientationMode=OrientationMode.AUTO,
    val touchSensitivity:Double=1.0,
    val sPenSensitivity:Double=0.85,
    val mouseSensitivity:Double=1.0,
    val hudEnabled:Boolean=false,
    val fpsDisplayEnabled:Boolean=false
){
    init{
        require(maxFps in setOf(30,60,90,120))
        require(rgbBrightness in 0..100)
        require(selectedGlowBoostPercent in 0..25)
        require(glassOpacityPercent in 0..100)
        require(idleFps in setOf(30,60))
        require(thermalCooldownMs in 1_000L..120_000L)
        require(frameTimeBadFramesBeforeDrop in 2..120)
        require(frameTimeGoodFramesBeforeRaise in 30..3_600)
        require(lowBatteryEcoThreshold in 1..20)
        require(lowBatteryBalancedThreshold in 10..40)
        require(lowBatteryEcoThreshold < lowBatteryBalancedThreshold)
        require(touchSensitivity in 0.5..2.0)
        require(sPenSensitivity in 0.5..2.0)
        require(mouseSensitivity in 0.5..2.0)
    }

    fun targetFps(displayHz:Double,batteryPercent:Int=100,thermalLevel:Int=0,charging:Boolean=false):Int{
        val base=when(fpsMode){
            FpsMode.FPS_30->30
            FpsMode.FPS_60->60
            FpsMode.FPS_120->120
            FpsMode.AUTO->when(powerMode){
                PowerMode.PERFORMANCE->120
                PowerMode.BALANCED->60
                PowerMode.ECO->30
                PowerMode.AUTO->if(charging)120 else 60
            }
        }
        var target=minOf(base,maxFps,displayHz.toInt().coerceAtLeast(30))
        if(autoThermalThrottle){
            target=when{
                thermalLevel>=4->minOf(target,30)
                thermalLevel>=2->minOf(target,60)
                else->target
            }
        }
        if(powerMode==PowerMode.AUTO){
            target=when{
                batteryPercent<=lowBatteryEcoThreshold && !charging->minOf(target,30)
                batteryPercent<=lowBatteryBalancedThreshold && !charging->minOf(target,60)
                else->target
            }
        }
        return normalizeFps(target)
    }

    fun adaptiveTargetFps(
        displayHz:Double,
        batteryPercent:Int=100,
        thermalLevel:Int=0,
        charging:Boolean=false,
        interactive:Boolean=true
    ):Int{
        var target=targetFps(displayHz,batteryPercent,thermalLevel,charging)
        if(
            interactionBoostEnabled &&
            interactive &&
            fpsMode==FpsMode.AUTO &&
            powerMode==PowerMode.AUTO &&
            thermalLevel<2 &&
            (charging || batteryPercent>lowBatteryBalancedThreshold)
        ){
            target=normalizeFps(minOf(maxFps,displayHz.toInt().coerceAtLeast(30),120))
        }
        if(idleRedrawThrottle && !interactive){
            target=minOf(target,idleFps)
        }
        return normalizeFps(target)
    }

    fun effectiveRgbBrightness(batteryPercent:Int=100,charging:Boolean=false):Int{
        if(powerMode!=PowerMode.AUTO || charging) return rgbBrightness
        return when{
            batteryPercent<=lowBatteryEcoThreshold->minOf(rgbBrightness,35)
            batteryPercent<=lowBatteryBalancedThreshold->minOf(rgbBrightness,50)
            else->rgbBrightness
        }
    }

    companion object{
        fun normalizeFps(value:Int)=when{
            value>=120->120
            value>=90->90
            value>=60->60
            else->30
        }
    }
}

data class RenderBudget(
    val fps:Int,
    val frameBudgetMs:Double,
    val meshScale:Double,
    val overlayScale:Double,
    val glowScale:Double,
    val cacheScale:Double,
    val reason:String
)

/**
 * Stateful UI/renderer governor.
 *
 * Safety contract:
 * - May change display FPS, visual mesh/overlay density, glow and visual caches only.
 * - Must never mutate CAD geometry, CAM toolpaths, material-removal math, NC output,
 *   offsets, Safe-Z, or CNC numeric precision.
 */
class RendererGovernor(
    private val settings:RuntimeEnvironmentSettings,
    initialFps:Int=60
){
    private var currentFps=RuntimeEnvironmentSettings.normalizeFps(initialFps)
    private var lastThermalDropMs:Long=Long.MIN_VALUE
    private var badFrameCount=0
    private var goodFrameCount=0

    fun update(
        nowMs:Long,
        displayHz:Double,
        frameTimeMs:Double,
        batteryPercent:Int,
        thermalLevel:Int,
        charging:Boolean,
        memoryPressure:MemoryPressure=MemoryPressure.NORMAL,
        interactive:Boolean=true
    ):RenderBudget{
        require(frameTimeMs>=0.0)
        val requested=settings.adaptiveTargetFps(displayHz,batteryPercent,thermalLevel,charging,interactive)

        // Thermal protection drops immediately. Recovery is intentionally delayed.
        val thermalCap=when{
            !settings.autoThermalThrottle->120
            thermalLevel>=4->30
            thermalLevel>=2->60
            else->120
        }
        if(currentFps>thermalCap){
            currentFps=thermalCap
            lastThermalDropMs=nowMs
            badFrameCount=0
            goodFrameCount=0
        }

        val targetBudgetMs=1000.0/currentFps
        if(settings.frameTimeGateEnabled){
            if(frameTimeMs>targetBudgetMs*1.15){
                badFrameCount++
                goodFrameCount=0
            }else if(frameTimeMs<targetBudgetMs*0.90){
                goodFrameCount++
                badFrameCount=0
            }else{
                badFrameCount=0
                goodFrameCount=0
            }

            if(badFrameCount>=settings.frameTimeBadFramesBeforeDrop){
                currentFps=stepDown(currentFps)
                badFrameCount=0
                goodFrameCount=0
            }
        }

        val cooldownElapsed=lastThermalDropMs==Long.MIN_VALUE ||
            nowMs-lastThermalDropMs>=settings.thermalCooldownMs
        if(currentFps<requested && cooldownElapsed &&
            (!settings.frameTimeGateEnabled || goodFrameCount>=settings.frameTimeGoodFramesBeforeRaise)){
            currentFps=minOf(stepUp(currentFps),requested)
            goodFrameCount=0
        }
        if(currentFps>requested) currentFps=requested

        val memory=if(settings.memoryPressureModeEnabled) memoryPressure else MemoryPressure.NORMAL
        val cacheScale=when(memory){
            MemoryPressure.NORMAL->1.0
            MemoryPressure.MODERATE->0.75
            MemoryPressure.HIGH->0.50
            MemoryPressure.CRITICAL->0.25
        }
        val visualScale=when(memory){
            MemoryPressure.NORMAL->1.0
            MemoryPressure.MODERATE->0.90
            MemoryPressure.HIGH->0.75
            MemoryPressure.CRITICAL->0.60
        }
        val reason=when{
            !interactive && settings.idleRedrawThrottle->"IDLE_THROTTLE"
            thermalLevel>=4->"THERMAL_HIGH"
            thermalLevel>=2->"THERMAL_WARM"
            memory==MemoryPressure.CRITICAL->"MEMORY_CRITICAL_VISUAL_ONLY"
            memory==MemoryPressure.HIGH->"MEMORY_HIGH_VISUAL_ONLY"
            currentFps<requested->"FRAME_TIME_OR_COOLDOWN"
            else->"NORMAL"
        }
        return RenderBudget(
            fps=currentFps,
            frameBudgetMs=1000.0/currentFps,
            meshScale=visualScale,
            overlayScale=visualScale,
            glowScale=if(memory>=MemoryPressure.HIGH)0.75 else 1.0,
            cacheScale=cacheScale,
            reason=reason
        )
    }

    private fun stepDown(fps:Int)=when{
        fps>=120->90
        fps>=90->60
        fps>=60->30
        else->30
    }

    private fun stepUp(fps:Int)=when{
        fps<60->60
        fps<90->90
        fps<120->120
        else->120
    }
}

object CncPrecisionContract{
    const val RESOLUTION_MM=0.001
    fun assertRendererIsolation(settings:RuntimeEnvironmentSettings){
        require(CNC_RESOLUTION_MM==RESOLUTION_MM)
        require(JOIN_TOLERANCE_MM==RESOLUTION_MM)
        val governor=RendererGovernor(settings)
        val budget=governor.update(
            nowMs=0L,
            displayHz=120.0,
            frameTimeMs=8.33,
            batteryPercent=100,
            thermalLevel=0,
            charging=true,
            memoryPressure=MemoryPressure.CRITICAL
        )
        require(budget.cacheScale<=1.0)
        require(RESOLUTION_MM==0.001)
    }
}

object PlatformRefreshPolicy {
    const val PHYSICAL_MAX_HZ = 120
    const val EMULATOR_MAX_HZ = 60
    const val IDLE_HZ = 30

    fun capForRuntime(requestedHz:Int,isEmulator:Boolean):Int =
        minOf(requestedHz, if(isEmulator) EMULATOR_MAX_HZ else PHYSICAL_MAX_HZ)

    fun visualLoadScale(isEmulator:Boolean):Double = if(isEmulator) 0.65 else 1.0
}

object CpuThermalFpsPolicy {
    const val COOL_TO_120_C = 65.0
    const val WARM_TO_90_C = 75.0
    const val HOT_TO_60_C = 85.0
    const val RECOVERY_HYSTERESIS_C = 3.0

    fun capForTemperature(cpuC:Double?):Int = when {
        cpuC == null || !cpuC.isFinite() -> 120
        cpuC >= HOT_TO_60_C -> 30
        cpuC >= WARM_TO_90_C -> 60
        cpuC >= COOL_TO_120_C -> 90
        else -> 120
    }

    fun capWithHysteresis(cpuC:Double?,currentCap:Int):Int {
        val raw=capForTemperature(cpuC)
        if(cpuC == null || !cpuC.isFinite()) return raw
        if(raw < currentCap) return raw
        if(raw == currentCap) return raw
        val recoveryThreshold=when(currentCap){
            30 -> HOT_TO_60_C - RECOVERY_HYSTERESIS_C
            60 -> WARM_TO_90_C - RECOVERY_HYSTERESIS_C
            90 -> COOL_TO_120_C - RECOVERY_HYSTERESIS_C
            else -> Double.NEGATIVE_INFINITY
        }
        return if(cpuC <= recoveryThreshold) raw else currentCap
    }

    fun reason(cpuC:Double?,cap:Int):String =
        if(cpuC == null || !cpuC.isFinite()) "CPU_TEMP_UNAVAILABLE"
        else "CPU_TEMP_" + "%.1f".format(java.util.Locale.US,cpuC) + "C_CAP_" + cap
}

object ThermalSensorPolicy {
    fun isCpuType(type:String):Boolean {
        val t=type.lowercase()
        return listOf("cpu","cluster","big","little","ap_thermal","ap-thermal").any { t.contains(it) }
    }

    fun isGpuType(type:String):Boolean {
        val t=type.lowercase()
        return listOf("gpu","g3d","mali","adreno").any { t.contains(it) }
    }

    fun normalizeCelsius(raw:Double):Double? {
        val c=when {
            kotlin.math.abs(raw)>=1000.0 -> raw/1000.0
            else -> raw
        }
        return c.takeIf { it in -20.0..150.0 }
    }
}

object SettingsApplyPolicy {
    fun requiresRestart(previousRenderQuality:String,newRenderQuality:String):Boolean =
        previousRenderQuality.trim().uppercase() != newRenderQuality.trim().uppercase()

    fun restartReason(previousRenderQuality:String,newRenderQuality:String):String? =
        if(requiresRestart(previousRenderQuality,newRenderQuality)) "3D_SIM_RENDER_QUALITY" else null
}


data class SurfaceFpsStats(
    val fps:Double,
    val frameIntervalMs:Double,
    val frames:Long,
    val droppedFrames:Long
){
    fun compact(label:String):String =
        label + " FPS " + "%.1f".format(java.util.Locale.US,fps) +
            " • " + "%.2f".format(java.util.Locale.US,frameIntervalMs) + "ms" +
            " • drop=" + droppedFrames
}

class SurfaceFpsMeter(
    private val refreshHzProvider:()->Double = { 60.0 },
    private val sampleWindowNs:Long = 500_000_000L
){
    private var lastFrameNs=0L
    private var windowStartNs=0L
    private var frames=0L
    private var dropped=0L
    private var latest=SurfaceFpsStats(0.0,0.0,0,0)

    fun record(frameTimeNs:Long):SurfaceFpsStats{
        require(frameTimeNs>=0L)
        if(lastFrameNs==0L){
            lastFrameNs=frameTimeNs
            windowStartNs=frameTimeNs
            return latest
        }
        if(frameTimeNs<=lastFrameNs) return latest

        val interval=frameTimeNs-lastFrameNs
        val refresh=refreshHzProvider().coerceIn(30.0,240.0)
        val budgetNs=1_000_000_000.0/refresh
        if(interval>budgetNs*1.5){
            dropped += ((interval/budgetNs).toLong()-1L).coerceAtLeast(1L)
        }
        lastFrameNs=frameTimeNs
        frames++
        latest=latest.copy(
            frameIntervalMs=interval/1_000_000.0,
            frames=frames,
            droppedFrames=dropped
        )

        val elapsed=frameTimeNs-windowStartNs
        if(elapsed>=sampleWindowNs && elapsed>0L){
            latest=SurfaceFpsStats(
                fps=frames*1_000_000_000.0/elapsed.toDouble(),
                frameIntervalMs=latest.frameIntervalMs,
                frames=frames,
                droppedFrames=dropped
            )
            frames=0L
            dropped=0L
            windowStartNs=frameTimeNs
        }
        return latest
    }

    fun current():SurfaceFpsStats=latest

    fun reset(){
        lastFrameNs=0L
        windowStartNs=0L
        frames=0L
        dropped=0L
        latest=SurfaceFpsStats(0.0,0.0,0,0)
    }
}

enum class RenderStressScenario {
    SMALL_MODEL,
    MEDIUM_MODEL,
    LARGE_MODEL,
    MATERIAL_REMOVAL,
    FIVE_AXIS_SYNC
}

data class RenderStressAggregate(
    val scenario:RenderStressScenario,
    val samples:Long,
    val averageFps:Double,
    val averageFrameMs:Double,
    val totalDroppedFrames:Long,
    val peakFrameMs:Double
){
    fun compact():String =
        scenario.name +
            " fps=" + "%.1f".format(java.util.Locale.US,averageFps) +
            " ms=" + "%.2f".format(java.util.Locale.US,averageFrameMs) +
            " drop=" + totalDroppedFrames +
            " n=" + samples
}

object RenderStressClassifier {
    fun modelScenario(triangleCount:Int):RenderStressScenario = when {
        triangleCount <= 1_500 -> RenderStressScenario.SMALL_MODEL
        triangleCount <= 6_000 -> RenderStressScenario.MEDIUM_MODEL
        else -> RenderStressScenario.LARGE_MODEL
    }
}

object RenderStressProfiler {
    private data class MutableAggregate(
        var samples:Long=0,
        var fpsSum:Double=0.0,
        var frameMsSum:Double=0.0,
        var dropped:Long=0,
        var peakFrameMs:Double=0.0,
        var lastDropSnapshot:Long=0
    )

    private val data=linkedMapOf<RenderStressScenario,MutableAggregate>()

    @Synchronized
    fun record(scenario:RenderStressScenario,stats:SurfaceFpsStats){
        if(stats.fps<=0.0 || stats.frameIntervalMs<=0.0) return
        val a=data.getOrPut(scenario){MutableAggregate()}
        a.samples++
        a.fpsSum+=stats.fps
        a.frameMsSum+=stats.frameIntervalMs
        val dropDelta =
            if(stats.droppedFrames>=a.lastDropSnapshot) stats.droppedFrames-a.lastDropSnapshot
            else stats.droppedFrames
        a.dropped+=dropDelta.coerceAtLeast(0L)
        a.lastDropSnapshot=stats.droppedFrames
        a.peakFrameMs=maxOf(a.peakFrameMs,stats.frameIntervalMs)
    }

    @Synchronized
    fun snapshot():List<RenderStressAggregate> =
        data.map { (scenario,a) ->
            RenderStressAggregate(
                scenario=scenario,
                samples=a.samples,
                averageFps=if(a.samples==0L)0.0 else a.fpsSum/a.samples,
                averageFrameMs=if(a.samples==0L)0.0 else a.frameMsSum/a.samples,
                totalDroppedFrames=a.dropped,
                peakFrameMs=a.peakFrameMs
            )
        }

    @Synchronized
    fun heaviest():RenderStressAggregate? =
        snapshot().maxWithOrNull(
            compareBy<RenderStressAggregate> { it.averageFrameMs }
                .thenBy { it.totalDroppedFrames }
                .thenBy { -it.averageFps }
        )

    @Synchronized
    fun missingScenarios():List<RenderStressScenario> =
        RenderStressScenario.entries.filter { it !in data.keys }

    @Synchronized
    fun summary():String {
        val all=snapshot()
        if(all.isEmpty()) return "STRESS • collecting"
        val worst=heaviest()
        val missing=missingScenarios()
        return "STRESS • " + all.joinToString(" | "){it.compact()} +
            (worst?.let{" • HEAVIEST=" + it.scenario.name} ?: "") +
            (if(missing.isEmpty()) " • COVERAGE=COMPLETE"
             else " • pending=" + missing.joinToString(","){it.name})
    }

    @Synchronized
    fun reset(){ data.clear() }
}

object RenderFrameContract{
    fun budgetMs(fps:Int):Double{
        require(fps in setOf(30,60,90,120))
        return 1000.0/fps
    }

    fun isWithinBudget(frameTimeMs:Double,fps:Int,tolerance:Double=1.15):Boolean{
        require(frameTimeMs>=0.0)
        require(tolerance>=1.0)
        return frameTimeMs<=budgetMs(fps)*tolerance
    }

    fun displayBucket(displayHz:Double):Int =
        RuntimeEnvironmentSettings.normalizeFps(displayHz.toInt().coerceAtLeast(30))
}


/**
 * Pure cache decision policy shared by the Android renderer and core regression.
 * It never touches geometry; it only decides whether a display list must be re-recorded.
 */
class RenderCachePolicy {
    private var valid=false
    private var sceneKey=Long.MIN_VALUE
    private var width=-1
    private var height=-1

    var recordings:Long=0
        private set
    var cacheHits:Long=0
        private set

    fun shouldRecord(nextSceneKey:Long,nextWidth:Int,nextHeight:Int,backendCacheValid:Boolean):Boolean {
        require(nextWidth>0 && nextHeight>0)
        val hit=valid && backendCacheValid &&
            sceneKey==nextSceneKey && width==nextWidth && height==nextHeight
        if(hit){
            cacheHits++
            return false
        }
        valid=true
        sceneKey=nextSceneKey
        width=nextWidth
        height=nextHeight
        recordings++
        return true
    }

    fun invalidate(){ valid=false }

    fun hitRate():Double {
        val total=recordings+cacheHits
        return if(total==0L) 0.0 else cacheHits.toDouble()/total.toDouble()
    }
}


enum class RgbStressMode { RGB_OFF, RGB_MAX }

data class RgbStressSample(
    val fps:Double,
    val frameTimeMs:Double,
    val cpuPercent:Double,
    val temperatureC:Double?,
    val droppedFrames:Long,
    val hardwareEvidence:Boolean
)

data class RgbStressAggregate(
    val mode:RgbStressMode,
    val samples:Long,
    val hardwareSamples:Long,
    val averageFps:Double,
    val averageFrameMs:Double,
    val averageCpuPercent:Double,
    val averageTemperatureC:Double?,
    val droppedFrames:Long
)

data class RgbStressComparison(
    val fpsDelta:Double,
    val frameTimeDeltaMs:Double,
    val cpuDeltaPercent:Double,
    val temperatureDeltaC:Double?,
    val droppedFrameDelta:Long,
    val hardwareEvidence:Boolean
)

object RgbMaxStressProfiler {
    private data class MutableAggregate(
        var samples:Long=0,
        var hardwareSamples:Long=0,
        var fpsSum:Double=0.0,
        var frameMsSum:Double=0.0,
        var cpuSum:Double=0.0,
        var tempSum:Double=0.0,
        var tempSamples:Long=0,
        var dropped:Long=0,
        var lastDropSnapshot:Long=0
    )
    private val data=linkedMapOf<RgbStressMode,MutableAggregate>()

    @Synchronized
    fun record(mode:RgbStressMode,sample:RgbStressSample){
        require(sample.fps>=0.0 && sample.frameTimeMs>=0.0)
        require(sample.cpuPercent in 0.0..999.0)
        require(sample.droppedFrames>=0L)
        val a=data.getOrPut(mode){MutableAggregate()}
        a.samples++
        if(sample.hardwareEvidence) a.hardwareSamples++
        a.fpsSum+=sample.fps
        a.frameMsSum+=sample.frameTimeMs
        a.cpuSum+=sample.cpuPercent
        sample.temperatureC?.takeIf{it.isFinite()}?.let{
            a.tempSum+=it
            a.tempSamples++
        }
        val delta=if(sample.droppedFrames>=a.lastDropSnapshot) sample.droppedFrames-a.lastDropSnapshot else sample.droppedFrames
        a.dropped+=delta.coerceAtLeast(0L)
        a.lastDropSnapshot=sample.droppedFrames
    }

    @Synchronized
    fun snapshot():List<RgbStressAggregate> = data.map { (mode,a) ->
        RgbStressAggregate(
            mode=mode,
            samples=a.samples,
            hardwareSamples=a.hardwareSamples,
            averageFps=if(a.samples==0L)0.0 else a.fpsSum/a.samples,
            averageFrameMs=if(a.samples==0L)0.0 else a.frameMsSum/a.samples,
            averageCpuPercent=if(a.samples==0L)0.0 else a.cpuSum/a.samples,
            averageTemperatureC=if(a.tempSamples==0L)null else a.tempSum/a.tempSamples,
            droppedFrames=a.dropped
        )
    }

    @Synchronized
    fun comparison():RgbStressComparison? {
        val off=snapshot().firstOrNull{it.mode==RgbStressMode.RGB_OFF} ?: return null
        val max=snapshot().firstOrNull{it.mode==RgbStressMode.RGB_MAX} ?: return null
        return RgbStressComparison(
            fpsDelta=max.averageFps-off.averageFps,
            frameTimeDeltaMs=max.averageFrameMs-off.averageFrameMs,
            cpuDeltaPercent=max.averageCpuPercent-off.averageCpuPercent,
            temperatureDeltaC=if(off.averageTemperatureC!=null && max.averageTemperatureC!=null)
                max.averageTemperatureC-off.averageTemperatureC else null,
            droppedFrameDelta=max.droppedFrames-off.droppedFrames,
            hardwareEvidence=off.hardwareSamples>0L && max.hardwareSamples>0L
        )
    }

    @Synchronized
    fun summary():String {
        val c=comparison() ?: return "RGB A/B • pending OFF+MAX"
        fun f(v:Double)=String.format(java.util.Locale.US,"%.1f",v)
        return "RGB A/B • MAX-OFF FPS=" + f(c.fpsDelta) +
            " frame=" + f(c.frameTimeDeltaMs) + "ms" +
            " CPU=" + f(c.cpuDeltaPercent) + "%" +
            " temp=" + (c.temperatureDeltaC?.let{f(it)+"°C"} ?: "--") +
            " drop=" + c.droppedFrameDelta +
            " • " + if(c.hardwareEvidence) "DEVICE=MEASURED" else "DEVICE=PENDING"
    }

    @Synchronized
    fun reset(){ data.clear() }
}


object WorkstationChromeContract {
    const val BRAND = "AIG CNC"
    const val WORKSTATION = "CNC AI WORKSTATION"
    const val ORIGINAL = "OFFICIAL RGB ORIGINAL"
    const val WORKSPACE = "2D CAD • LIVE WORKSPACE"
    const val SYSTEM_READY = "SYSTEM READY"
    const val MASTER_ORIGIN = "MASTER X0.000 Y0.000"
    const val PRECISION = "0.001 mm"
    const val FUNCTION_STRIP = "AI FOR REAL MACHINING • ACCURATE • REAL • SAFE • SMART"

    enum class Layout { COMPACT, WIDE }

    fun layout(widthDp:Int,heightDp:Int):Layout {
        require(widthDp>0 && heightDp>0)
        return if(minOf(widthDp,heightDp)<600) Layout.COMPACT else Layout.WIDE
    }

    fun requiredSections():Set<String> =
        setOf("BRAND","WORKSPACE","STATUS","FUNCTIONS")
}


object FloatingCadToolContract {
    const val TITLE = "CAD TOOL DECK"
    const val BACK = "BACK"
    const val CLOSE = "CLOSE"
    const val REOPEN = "TOOLS"
    val groups = listOf("CAD","VIEW","PHOTO","CORNER","EDIT","FILE")

    fun panelWidthDp(screenWidthDp:Int):Int {
        require(screenWidthDp>0)
        return when {
            screenWidthDp < 420 -> (screenWidthDp-24).coerceAtLeast(280)
            screenWidthDp < 700 -> 360
            else -> 430
        }
    }

    fun overlayPreservesWorkspace(panelVisible:Boolean):Boolean = true
}


object RgbGlassVisualContract {
    const val LAYER_COUNT = 3

    fun strokeDp(disabled:Boolean,pressed:Boolean,selected:Boolean,alarm:Boolean):Double = when {
        disabled -> 1.2
        alarm -> 4.0
        pressed -> 3.6
        selected -> 3.2
        else -> 2.0
    }

    fun elevationDp(disabled:Boolean,pressed:Boolean,selected:Boolean,alarm:Boolean):Double = when {
        disabled -> 0.0
        pressed -> 2.0
        alarm -> 11.0
        selected -> 9.0
        else -> 3.0
    }

    fun highlightAlpha(brightnessPercent:Int,active:Boolean,alarm:Boolean):Int {
        require(brightnessPercent in 0..100)
        if(alarm) return 92
        val base=if(active)58 else 34
        return (base*brightnessPercent/100.0).toInt().coerceIn(0,92)
    }

    fun alarmVisibleAtBrightness(brightnessPercent:Int):Boolean {
        require(brightnessPercent in 0..100)
        return true
    }
}


object CamWorkstationContract {
    const val TITLE = "REAL CAM"
    const val SAFE_Z = "SAFE-Z"
    const val TOOL_RADIUS = "TOOL RADIUS"
    const val WORK_OFFSET = "WORK OFFSET"
    const val CAM_READY = "CAM READY"
    const val TOOLPATH_FRESH = "TOOLPATH FRESH"
    const val TOOLPATH_STALE = "TOOLPATH STALE"
    const val MAKE_IT_REAL = "MAKE IT REAL."

    enum class Layout { MOBILE_COMPACT, DESKTOP_EXPANDED }

    fun layout(widthDp:Int):Layout {
        require(widthDp>0)
        return if(widthDp<840) Layout.MOBILE_COMPACT else Layout.DESKTOP_EXPANDED
    }

    val parameterKeys = listOf(
        "TOOL DIA","TOOL RADIUS","DEPTH","SAFE-Z","FEED","SPINDLE","WORK OFFSET",
        "LEAD-IN","LEAD-OUT","TOOL DIRECTION","TOOLPATH STATUS"
    )

    val pathColorsArgb = linkedMapOf(
        "G0" to 0xFF3DEBFF.toInt(),
        "CUTTING" to 0xFFFFB020.toInt(),
        "REGION" to 0x553B82F6,
        "TOOL" to 0xFF63FF9D.toInt(),
        "SELECTED" to 0xFFFFFFFF.toInt(),
        "WARNING" to 0xFFFF5252.toInt()
    )

    fun adaptiveTextSp(label:String,widthDp:Int):Double {
        require(widthDp>0)
        val base=if(widthDp<420)12.0 else if(widthDp<840)13.0 else 14.0
        return when {
            label.length>=18 -> base-3.0
            label.length>=12 -> base-2.0
            label.length>=8 -> base-1.0
            else -> base
        }.coerceAtLeast(9.0)
    }

    fun buttonMinWidthDp(layout:Layout,label:String):Int =
        when(layout){
            Layout.MOBILE_COMPACT -> (72 + label.length*2).coerceIn(72,132)
            Layout.DESKTOP_EXPANDED -> (88 + label.length*3).coerceIn(88,176)
        }

    fun runtimeBindingPolicy():String = "LIVE_CAM_STATE_ONLY"
}
