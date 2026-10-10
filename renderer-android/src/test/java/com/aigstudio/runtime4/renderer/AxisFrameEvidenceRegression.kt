package com.aigstudio.runtime4.renderer

import com.aigstudio.runtime4.renderer.gpu.AxisFrameEvidence
import com.aigstudio.runtime4.contract.*
import org.junit.Assert.assertEquals
import org.junit.Test

class AxisFrameEvidenceRegression {
    @Test fun markerKeepsMotionBlockAndRotaryValues() {
        val axis3=AxisSceneState(AxisMode.AXIS3,AxisPoseSnapshot(1.0,2.0,-3.0,0.0,0.0,0.0),"MP31",31L,7,8)
        val axis4=AxisSceneState(AxisMode.AXIS4,AxisPoseSnapshot(1.0,2.0,-3.0,10.0,20.0,30.0),"MP31",31L,7,8)
        assertEquals("AIG4_AXIS3|FIRST_FRAME|PASS|MOTION=MP31|BLOCK=7/8",AxisFrameEvidence.axis3Marker(axis3))
        assertEquals("AIG4_AXIS4|FIRST_FRAME|PASS|MOTION=MP31|A=10.000|BLOCK=7/8",AxisFrameEvidence.axis4Marker(axis4))
        val axis5=AxisSceneState(AxisMode.AXIS5,AxisPoseSnapshot(1.0,2.0,-3.0,10.0,20.0,30.0),"MP31",31L,7,8)
        assertEquals("AIG4_AXIS5|FIRST_FRAME|PASS|MOTION=MP31|A=10.000|B=20.000|BLOCK=7/8",AxisFrameEvidence.axis5Marker(axis5))
    }

    @Test fun localMessageSuffixPreservesSeverityAndText() {
        val message=RuntimeMessage(MessageSeverity.WARNING,"AXIS_LIMIT")
        assertEquals(" | WARNING: AXIS_LIMIT",AxisFrameEvidence.messageSuffix(message))
        assertEquals("",AxisFrameEvidence.messageSuffix(null))
    }
}