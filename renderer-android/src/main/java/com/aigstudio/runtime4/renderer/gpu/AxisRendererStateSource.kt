package com.aigstudio.runtime4.renderer.gpu

import com.aigstudio.runtime4.contract.AxisMode
import com.aigstudio.runtime4.contract.AxisRuntimePort
import com.aigstudio.runtime4.contract.AxisSceneState
import com.aigstudio.runtime4.contract.SceneId

enum class FourthRenderRoute { HOME, CAD, CAM, SIM, AXIS3, AXIS4, AXIS5, AXIS6, NC, AI, UNAVAILABLE }

object RenderRoutePolicy {
    fun forScene(scene: SceneId): FourthRenderRoute = when (scene) {
        SceneId.HOME -> FourthRenderRoute.HOME
        SceneId.CAD -> FourthRenderRoute.CAD
        SceneId.CAM -> FourthRenderRoute.CAM
        SceneId.SIM -> FourthRenderRoute.SIM
        SceneId.AXIS3 -> FourthRenderRoute.AXIS3
        SceneId.AXIS4 -> FourthRenderRoute.AXIS4
        SceneId.AXIS5 -> FourthRenderRoute.AXIS5
        SceneId.AXIS6 -> FourthRenderRoute.AXIS6
        SceneId.NC -> FourthRenderRoute.NC
        SceneId.AI -> FourthRenderRoute.AI
        else -> FourthRenderRoute.UNAVAILABLE
    }
}

class AxisRendererStateSource(private val runtime: AxisRuntimePort) {
    fun snapshotForFrame(mode: AxisMode): AxisSceneState = runtime.snapshot(mode)
}

