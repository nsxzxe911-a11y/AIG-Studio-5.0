package com.aigstudio.runtime4.renderer.gpu

import com.aigstudio.runtime4.contract.AxisMode
import com.aigstudio.runtime4.contract.AxisSceneState
import com.aigstudio.runtime4.contract.RuntimeMessage
import java.util.Locale

object AxisFrameEvidence {
    fun messageSuffix(message: RuntimeMessage?): String =
        message?.let { " | ${it.severity.name}: ${it.text}" }.orEmpty()

    fun axis3Marker(state: AxisSceneState): String {
        val motion = state.motionProgramId ?: "NONE"
        return "AIG4_AXIS3|FIRST_FRAME|PASS|MOTION=$motion|BLOCK=${state.blockIndex}/${state.blockCount}"
    }

    fun axis4Marker(state: AxisSceneState): String {
        val motion = state.motionProgramId ?: "NONE"
        val a = state.pose.forMode(AxisMode.AXIS4).a
        return String.format(
            Locale.US,
            "AIG4_AXIS4|FIRST_FRAME|PASS|MOTION=%s|A=%.3f|BLOCK=%d/%d",
            motion,
            a,
            state.blockIndex,
            state.blockCount,
        )
    }

    fun axis5Marker(state: AxisSceneState): String {
        val motion=state.motionProgramId ?: "NONE"
        val pose=state.pose.forMode(AxisMode.AXIS5)
        return String.format(Locale.US,"AIG4_AXIS5|FIRST_FRAME|PASS|MOTION=%s|A=%.3f|B=%.3f|BLOCK=%d/%d",motion,pose.a,pose.b,state.blockIndex,state.blockCount)
    }
}