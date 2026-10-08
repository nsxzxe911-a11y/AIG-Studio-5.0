package com.aigstudio.core

enum class VisualQualityPreset { LOW, BALANCED, HIGH, ULTRA }
enum class ShadowMode { OFF, LOW, HIGH, ULTRA }
enum class AntialiasMode { OFF, FXAA, MSAA_2X, MSAA_4X }
enum class MaterialVisualQuality { LOW, MEDIUM, HIGH, ULTRA }
enum class VisualMemoryPressure { NORMAL, MODERATE, HIGH, CRITICAL }

data class VisualQualityBudget(
    val preset:VisualQualityPreset,
    val maxFps:Int,
    val resolutionScale:Double,
    val shadowMode:ShadowMode,
    val antiAliasing:AntialiasMode,
    val reflectionsEnabled:Boolean,
    val transparencyEnabled:Boolean,
    val materialQuality:MaterialVisualQuality,
    val materialRemovalDisplayStride:Int,
    val toolpathDisplayStride:Int,
    val textureCacheScale:Double,
    val trueMaterialRemoval:Boolean=true,
    val simulationPrecisionMm:Double=0.001
){
    init{
        require(maxFps in setOf(30,60,90,120))
        require(resolutionScale in 0.5..1.0)
        require(materialRemovalDisplayStride in 1..8)
        require(toolpathDisplayStride in 1..8)
        require(textureCacheScale in 0.25..1.0)
        require(trueMaterialRemoval){"Visual quality may not disable true material removal"}
        require(simulationPrecisionMm==0.001){"Visual quality may not change machining precision"}
    }
}

object VisualQualityPolicy {
    fun adapt(
        requested:VisualQualityPreset,
        ramGb:Int,
        hardwareAccelerated:Boolean,
        memoryPressure:VisualMemoryPressure,
        thermalLevel:Int
    ):VisualQualityPreset{
        require(ramGb>0)
        require(thermalLevel>=0)
        if(!hardwareAccelerated || ramGb<=4 || memoryPressure>=VisualMemoryPressure.HIGH || thermalLevel>=4){
            return VisualQualityPreset.LOW
        }
        if(ramGb<=6 || memoryPressure==VisualMemoryPressure.MODERATE || thermalLevel>=2){
            return minPreset(requested,VisualQualityPreset.BALANCED)
        }
        return requested
    }

    fun budget(preset:VisualQualityPreset):VisualQualityBudget=when(preset){
        VisualQualityPreset.LOW->VisualQualityBudget(
            preset=preset,maxFps=30,resolutionScale=0.65,shadowMode=ShadowMode.OFF,
            antiAliasing=AntialiasMode.OFF,reflectionsEnabled=false,transparencyEnabled=false,
            materialQuality=MaterialVisualQuality.LOW,materialRemovalDisplayStride=4,
            toolpathDisplayStride=3,textureCacheScale=0.50
        )
        VisualQualityPreset.BALANCED->VisualQualityBudget(
            preset=preset,maxFps=60,resolutionScale=0.85,shadowMode=ShadowMode.LOW,
            antiAliasing=AntialiasMode.FXAA,reflectionsEnabled=false,transparencyEnabled=true,
            materialQuality=MaterialVisualQuality.MEDIUM,materialRemovalDisplayStride=2,
            toolpathDisplayStride=2,textureCacheScale=0.75
        )
        VisualQualityPreset.HIGH->VisualQualityBudget(
            preset=preset,maxFps=90,resolutionScale=1.0,shadowMode=ShadowMode.HIGH,
            antiAliasing=AntialiasMode.MSAA_2X,reflectionsEnabled=true,transparencyEnabled=true,
            materialQuality=MaterialVisualQuality.HIGH,materialRemovalDisplayStride=1,
            toolpathDisplayStride=1,textureCacheScale=1.0
        )
        VisualQualityPreset.ULTRA->VisualQualityBudget(
            preset=preset,maxFps=120,resolutionScale=1.0,shadowMode=ShadowMode.ULTRA,
            antiAliasing=AntialiasMode.MSAA_4X,reflectionsEnabled=true,transparencyEnabled=true,
            materialQuality=MaterialVisualQuality.ULTRA,materialRemovalDisplayStride=1,
            toolpathDisplayStride=1,textureCacheScale=1.0
        )
    }

    fun productLabelZhTw(preset:VisualQualityPreset):String=when(preset){
        VisualQualityPreset.LOW->"低負載"
        VisualQualityPreset.BALANCED->"平衡"
        VisualQualityPreset.HIGH->"高畫質"
        VisualQualityPreset.ULTRA->"極致"
    }

    private fun minPreset(a:VisualQualityPreset,b:VisualQualityPreset):VisualQualityPreset =
        if(a.ordinal<=b.ordinal)a else b
}

object VisualQualityRuntime {
    @Volatile private var requestedPreset=VisualQualityPreset.BALANCED
    @Volatile private var currentBudget=VisualQualityPolicy.budget(VisualQualityPreset.BALANCED)

    @Synchronized
    fun setRequested(preset:VisualQualityPreset){
        requestedPreset=preset
        currentBudget=VisualQualityPolicy.budget(preset)
    }

    fun requested():VisualQualityPreset=requestedPreset
    fun current():VisualQualityBudget=currentBudget

    @Synchronized
    fun updateFromHardware(
        ramGb:Int,
        hardwareAccelerated:Boolean,
        memoryPressure:VisualMemoryPressure=VisualMemoryPressure.NORMAL,
        thermalLevel:Int=0
    ):VisualQualityBudget{
        val effective=VisualQualityPolicy.adapt(
            requested=requestedPreset,
            ramGb=ramGb,
            hardwareAccelerated=hardwareAccelerated,
            memoryPressure=memoryPressure,
            thermalLevel=thermalLevel
        )
        return VisualQualityPolicy.budget(effective).also { currentBudget=it }
    }
}
