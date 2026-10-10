package com.aigstudio.runtime4.renderer.gpu

import com.aigstudio.runtime4.contract.AxisMode
import com.aigstudio.runtime4.contract.AxisSceneState

data class Axis4VisualPose(val x:Double,val y:Double,val z:Double,val aDegrees:Double)

object Axis4Presentation {
    fun from(state:AxisSceneState):Axis4VisualPose {
        val pose=state.pose.forMode(AxisMode.AXIS4)
        return Axis4VisualPose(pose.x,pose.y,pose.z,pose.a)
    }
}