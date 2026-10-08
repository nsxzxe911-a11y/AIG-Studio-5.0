package com.aigstudio.core

data class DesktopVisualSettingsState(
    val visualBudget:VisualQualityBudget,
    val fpsCap:Int,
    val rgbBrightness:Int,
    val rgbBreathingEnabled:Boolean,
    val hudEnabled:Boolean
)

/** Desktop-only presentation budget derived from SharedSettingsSnapshot.
 * It never changes machining geometry, material-removal truth, or 0.001 mm precision. */
object DesktopVisualSettingsRuntime {
    @Volatile private var current=from(SharedSettingsSnapshot())

    private fun preset(q:RenderQuality):VisualQualityPreset=when(q){
        RenderQuality.ECO->VisualQualityPreset.LOW
        RenderQuality.BALANCED->VisualQualityPreset.BALANCED
        RenderQuality.HIGH->VisualQualityPreset.HIGH
        RenderQuality.ULTRA->VisualQualityPreset.ULTRA
    }
    private fun powerCap(p:PowerMode):Int=when(p){
        PowerMode.ECO->30
        PowerMode.BALANCED->60
        PowerMode.PERFORMANCE->120
        PowerMode.AUTO->120
    }
    private fun from(s:SharedSettingsSnapshot):DesktopVisualSettingsState{
        val p=preset(s.renderQuality)
        val budget=VisualQualityPolicy.budget(p)
        return DesktopVisualSettingsState(
            visualBudget=budget,
            fpsCap=kotlin.math.min(budget.maxFps,powerCap(s.powerMode)),
            rgbBrightness=s.rgbBrightness.coerceIn(0,100),
            rgbBreathingEnabled=s.rgbBreathingEnabled,
            hudEnabled=s.hudEnabled || s.systemHudEnabled
        )
    }

    @Synchronized fun apply(settings:SharedSettingsSnapshot):DesktopVisualSettingsState{
        val next=from(settings)
        VisualQualityRuntime.setRequested(next.visualBudget.preset)
        current=next
        return next
    }
    fun snapshot():DesktopVisualSettingsState=current
    fun fpsCap():Int=current.fpsCap
    fun rgbScale():Double=current.rgbBrightness/100.0
    fun rgbChannel(channel:Int):Int=(channel.coerceIn(0,255)*rgbScale()+0.5).toInt().coerceIn(0,255)
    fun rgbBreathingEnabled():Boolean=current.rgbBreathingEnabled
    fun hudEnabled():Boolean=current.hudEnabled
    fun geometryBudget(base:Int):Int=VisualQualityPolicy.scaleGeometryBudget(base,current.visualBudget.preset)
    fun toolpathStride():Int=current.visualBudget.toolpathDisplayStride
}
