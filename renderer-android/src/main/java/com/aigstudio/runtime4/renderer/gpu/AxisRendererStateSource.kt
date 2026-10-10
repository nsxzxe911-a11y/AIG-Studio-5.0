package com.aigstudio.runtime4.renderer.gpu

import com.aigstudio.runtime4.contract.AxisMode
import com.aigstudio.runtime4.contract.AxisRuntimePort
import com.aigstudio.runtime4.contract.AxisSceneState
import com.aigstudio.runtime4.contract.SceneId

enum class FourthRenderRoute { HOME, CAD, CAM, AXIS3, NC, UNAVAILABLE }

object RenderRoutePolicy {
    fun forScene(scene: SceneId): FourthRenderRoute = when (scene) {
        SceneId.HOME -> FourthRenderRoute.HOME
        SceneId.CAD -> FourthRenderRoute.CAD
        SceneId.CAM -> FourthRenderRoute.CAM
        SceneId.AXIS3 -> FourthRenderRoute.AXIS3
        SceneId.NC -> FourthRenderRoute.NC
        else -> FourthRenderRoute.UNAVAILABLE
    }
}

class AxisRendererStateSource(private val runtime: AxisRuntimePort) {
    fun snapshotForFrame(mode: AxisMode): AxisSceneState = runtime.snapshot(mode)
}