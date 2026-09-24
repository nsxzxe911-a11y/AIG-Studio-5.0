package com.aigstudio.core

enum class FpsMode(val fps:Int){ FPS_30(30), FPS_60(60), FPS_120(120), AUTO(0) }
enum class GlowLevel{ OFF, LOW, MEDIUM, HIGH }
enum class PowerMode{ PERFORMANCE, BALANCED, ECO, AUTO }
enum class RenderQuality{ ULTRA, HIGH, BALANCED, ECO }
enum class OrientationMode{ AUTO, PORTRAIT, LANDSCAPE, WORKSPACE_FIRST }
enum class InputProfile{ TOUCH, SPEN, MOUSE }

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
    val powerMode:PowerMode=PowerMode.BALANCED,
    val renderQuality:RenderQuality=RenderQuality.HIGH,
    val vsync:Boolean=true,
    val idleRedrawThrottle:Boolean=true,
    val autoThermalThrottle:Boolean=true,
    val lowBatteryBalancedThreshold:Int=20,
    val lowBatteryEcoThreshold:Int=10,
    val animations:AnimationToggles=AnimationToggles(),
    val orientationMode:OrientationMode=OrientationMode.AUTO,
    val touchSensitivity:Double=1.0,
    val sPenSensitivity:Double=0.85,
    val mouseSensitivity:Double=1.0,
    val hudEnabled:Boolean=false
){
    init{
        require(maxFps in setOf(30,60,120))
        require(rgbBrightness in 0..100)
        require(selectedGlowBoostPercent in 0..25)
        require(glassOpacityPercent in 0..100)
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
        return when{
            target>=120->120
            target>=60->60
            else->30
        }
    }

    fun effectiveRgbBrightness(batteryPercent:Int=100,charging:Boolean=false):Int{
        if(powerMode!=PowerMode.AUTO || charging) return rgbBrightness
        return when{
            batteryPercent<=lowBatteryEcoThreshold->minOf(rgbBrightness,35)
            batteryPercent<=lowBatteryBalancedThreshold->minOf(rgbBrightness,50)
            else->rgbBrightness
        }
    }
}

object CncPrecisionContract{
    const val RESOLUTION_MM=0.001
    fun assertRendererIsolation(settings:RuntimeEnvironmentSettings){
        require(CNC_RESOLUTION_MM==RESOLUTION_MM)
        require(JOIN_TOLERANCE_MM==RESOLUTION_MM)
        settings.targetFps(120.0)
    }
}
