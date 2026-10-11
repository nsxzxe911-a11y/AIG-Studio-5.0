package com.aigstudio.runtime4.renderer

import com.aigstudio.runtime4.contract.*
import com.aigstudio.runtime4.renderer.gpu.Axis4Presentation
import com.aigstudio.runtime4.renderer.machine.MachineAxis
import com.aigstudio.runtime4.renderer.machine.MachineProfile4AxHrtStyle
import org.junit.Assert.assertEquals
import org.junit.Test

class Axis4MachineProfileRegression {
    @Test fun workholdingUsesDeclaredAPivotAndAuthoritativeAngle() {
        val state=AxisSceneState(AxisMode.AXIS4,AxisPoseSnapshot(1.0,2.0,-3.0,10.0,20.0,30.0),"MP4",4L,7,8)
        val transform=Axis4Presentation.workholdingTransform(state)
        val pivot=MachineProfile4AxHrtStyle.joints.single{it.axis==MachineAxis.A}.pivot
        assertEquals(pivot,transform.pivot)
        assertEquals(10.0,transform.angleDegrees,0.0)
    }

    @Test fun axis4ProjectionDropsUnsupportedRotaries() {
        val state=AxisSceneState(AxisMode.AXIS4,AxisPoseSnapshot(1.0,2.0,-3.0,10.0,20.0,30.0),"MP4",4L,7,8)
        val normalized=state.pose.forMode(AxisMode.AXIS4)
        assertEquals(10.0,normalized.a,0.0);assertEquals(0.0,normalized.b,0.0);assertEquals(0.0,normalized.c,0.0)
    }
}