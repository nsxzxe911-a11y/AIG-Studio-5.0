package com.aigstudio.runtime4.renderer

import com.aigstudio.runtime4.renderer.gpu.AxisGlesSceneRenderer
import com.aigstudio.runtime4.renderer.gpu.AxisRendererStateSource
import com.aigstudio.runtime4.renderer.gpu.FourthRenderRoute
import com.aigstudio.runtime4.contract.*
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

private class AxisModuleRuntimeStub : AxisRuntimePort {
    override fun snapshot(mode: AxisMode, blockIndex: Int): AxisSceneState = AxisSceneState.initial(mode)
}

class AxisRendererModularityRegression {
    @Test fun axisRendererModuleOwnsOnlyImplementedAxisRoutes() {
        val renderer = AxisGlesSceneRenderer(AxisRendererStateSource(AxisModuleRuntimeStub()))
        assertTrue(renderer.supports(FourthRenderRoute.AXIS3))
        assertFalse(renderer.supports(FourthRenderRoute.UNAVAILABLE))
    }
}