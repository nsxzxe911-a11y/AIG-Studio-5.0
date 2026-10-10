package com.aigstudio.runtime4.renderer.gpu

import com.aigstudio.runtime4.contract.AxisMode
import com.aigstudio.runtime4.contract.AxisSceneState
import com.aigstudio.runtime4.renderer.machine.MachineAxis
import com.aigstudio.runtime4.renderer.machine.MachineProfile4AxHrtStyle
import com.aigstudio.runtime4.renderer.machine.MachineVec3

data class Axis4VisualPose(val x:Double,val y:Double,val z:Double,val aDegrees:Double)
data class Axis4WorkholdingTransform(val pivot:MachineVec3,val angleDegrees:Double)

object Axis4Presentation {
    fun from(state:AxisSceneState):Axis4VisualPose {
        val pose=state.pose.forMode(AxisMode.AXIS4)
        return Axis4VisualPose(pose.x,pose.y,pose.z,pose.a)
    }
    fun workholdingTransform(state:AxisSceneState):Axis4WorkholdingTransform {
        val pose=state.pose.forMode(AxisMode.AXIS4)
        val pivot=MachineProfile4AxHrtStyle.joints.single{it.axis==MachineAxis.A}.pivot
        return Axis4WorkholdingTransform(pivot,pose.a)
    }
}