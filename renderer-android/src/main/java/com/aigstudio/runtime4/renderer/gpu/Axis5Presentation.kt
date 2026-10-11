package com.aigstudio.runtime4.renderer.gpu

import com.aigstudio.runtime4.contract.AxisMode
import com.aigstudio.runtime4.contract.AxisSceneState
import com.aigstudio.runtime4.renderer.machine.*

data class Axis5VisualPose(val x:Double,val y:Double,val z:Double,val aDegrees:Double,val bDegrees:Double)
data class Axis5KinematicFrame(val a:MachineJointSpec,val b:MachineJointSpec,val aDegrees:Double,val bDegrees:Double)
object Axis5Presentation {
    fun from(state:AxisSceneState):Axis5VisualPose{val p=state.pose.forMode(AxisMode.AXIS5);return Axis5VisualPose(p.x,p.y,p.z,p.a,p.b)}
    fun kinematicFrame(state:AxisSceneState):Axis5KinematicFrame{val p=state.pose.forMode(AxisMode.AXIS5);val a=MachineProfile5AxTrunnionStyle.joints.single{it.axis==MachineAxis.A};val b=MachineProfile5AxTrunnionStyle.joints.single{it.axis==MachineAxis.B};return Axis5KinematicFrame(a,b,p.a,p.b)}
    fun workpieceReferencePoint(state:AxisSceneState):MachineVec3{val f=kinematicFrame(state);val s=MachineProfile5AxTrunnionStyle.parts.single{it.id=="WORKPIECE"};val probe=MachineVec3(s.offset.x+s.size.x/2f,s.offset.y,s.offset.z);val afterB=MachineKinematics.rotatePoint(probe,f.b.pivot,f.b.direction,f.bDegrees);return MachineKinematics.rotatePoint(afterB,f.a.pivot,f.a.direction,f.aDegrees)}
}