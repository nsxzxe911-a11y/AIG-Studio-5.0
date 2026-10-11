package com.aigstudio.runtime4.renderer

import com.aigstudio.runtime4.renderer.gpu.Axis4Presentation
import com.aigstudio.runtime4.contract.*
import org.junit.Assert.assertEquals
import org.junit.Test

class Axis4PresentationRegression {
    @Test fun visualPosePreservesXyzAndAWhileIgnoringUnsupportedRotaries() {
        val state=AxisSceneState(AxisMode.AXIS4,AxisPoseSnapshot(1.0,2.0,-3.0,10.0,20.0,30.0),"MP4",4L,7,8)
        val visual=Axis4Presentation.from(state)
        assertEquals(1.0,visual.x,0.0);assertEquals(2.0,visual.y,0.0);assertEquals(-3.0,visual.z,0.0);assertEquals(10.0,visual.aDegrees,0.0)
    }
}