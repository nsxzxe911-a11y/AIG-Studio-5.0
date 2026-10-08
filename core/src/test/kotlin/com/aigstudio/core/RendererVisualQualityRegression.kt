package com.aigstudio.core

fun main(){
    val low=VisualQualityPolicy.budget(VisualQualityPreset.LOW)
    check(low.resolutionScale<=0.70)
    check(low.shadowMode==ShadowMode.OFF)
    check(low.materialRemovalDisplayStride>=3)
    check(low.trueMaterialRemoval)
    check(low.simulationPrecisionMm==0.001)

    val balanced=VisualQualityPolicy.budget(VisualQualityPreset.BALANCED)
    check(balanced.maxFps==60)
    check(balanced.trueMaterialRemoval)

    check(VisualQualityPolicy.adapt(VisualQualityPreset.ULTRA,ramGb=4,hardwareAccelerated=true,memoryPressure=VisualMemoryPressure.HIGH,thermalLevel=0)==VisualQualityPreset.LOW)
    check(VisualQualityPolicy.adapt(VisualQualityPreset.HIGH,ramGb=6,hardwareAccelerated=true,memoryPressure=VisualMemoryPressure.NORMAL,thermalLevel=0)==VisualQualityPreset.BALANCED)
    check(VisualQualityPolicy.adapt(VisualQualityPreset.ULTRA,ramGb=12,hardwareAccelerated=true,memoryPressure=VisualMemoryPressure.NORMAL,thermalLevel=0)==VisualQualityPreset.ULTRA)
    check(VisualQualityPolicy.adapt(VisualQualityPreset.HIGH,ramGb=12,hardwareAccelerated=false,memoryPressure=VisualMemoryPressure.NORMAL,thermalLevel=0)==VisualQualityPreset.LOW)

    println("AIGCNC_VISUAL_QUALITY_POLICY_PASS|LOW_BALANCED_HIGH_ULTRA|TRUE_REMOVAL_PRESERVED|0.001_MM_PRESERVED")
}
