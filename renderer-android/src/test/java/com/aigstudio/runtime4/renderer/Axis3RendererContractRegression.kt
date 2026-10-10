package com.aigstudio.runtime4.renderer

import com.aigstudio.runtime4.renderer.gpu.AxisRendererStateSource
import com.aigstudio.runtime4.renderer.gpu.FourthRenderRoute
import com.aigstudio.runtime4.renderer.gpu.RenderRoutePolicy
import com.aigstudio.runtime4.contract.*
import org.junit.Assert.assertEquals
import org.junit.Test

private class AxisRendererRuntimeStub : AxisRuntimePort {
    var lastMode: AxisMode? = null
    override fun snapshot(mode: AxisMode, blockIndex: Int): AxisSceneState {
        lastMode = mode
        return AxisSceneState.initial(mode).copy(pose = AxisPoseSnapshot(1.0, 2.0, 3.0, 0.0, 0.0, 0.0))
    }
}

class Axis3RendererContractRegression {
    @Test fun implementedAxesHaveDedicatedRoutesAndUnimplementedAxisNeverFallsBackHome() {
        assertEquals(FourthRenderRoute.AXIS3, RenderRoutePolicy.forScene(SceneId.AXIS3))
        assertEquals(FourthRenderRoute.AXIS4, RenderRoutePolicy.forScene(SceneId.AXIS4))
        assertEquals(FourthRenderRoute.AXIS5, RenderRoutePolicy.forScene(SceneId.AXIS5))
        assertEquals(FourthRenderRoute.AXIS6, RenderRoutePolicy.forScene(SceneId.AXIS6))
        assertEquals(FourthRenderRoute.UNAVAILABLE, RenderRoutePolicy.forScene(SceneId.SIM))
    }

    @Test fun rendererStateSourceRequestsAxis3Truth() {
        val runtime = AxisRendererRuntimeStub()
        val source = AxisRendererStateSource(runtime)
        val state = source.snapshotForFrame(AxisMode.AXIS3)
        assertEquals(AxisMode.AXIS3, runtime.lastMode)
        assertEquals(AxisPoseSnapshot(1.0, 2.0, 3.0, 0.0, 0.0, 0.0), state.pose)
    }
}