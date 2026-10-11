package com.aigstudio.runtime4.renderer.gpu

import com.aigstudio.runtime4.contract.AxisMode
import com.aigstudio.runtime4.contract.AxisSceneState
import com.aigstudio.runtime4.renderer.machine.*

data class Axis6VisualPose(val x:Double,val y:Double,val z:Double,val aDegrees:Double,val bDegrees:Double,val cDegrees:Double)
data class Axis6KinematicFrame(val a:MachineJointSpec,val b:MachineJointSpec,val c:MachineJointSpec,val aDegrees:Double,val bDegrees:Double,val cDegrees:Double)
object Axis6Presentation {
    fun from(state:AxisSceneState):Axis6VisualPose { val p=state.pose.forMode(AxisMode.AXIS6);return Axis6VisualPose(p.x,p.y,p.z,p.a,p.b,p.c) }
    fun kinematicFrame(state:AxisSceneState):Axis6KinematicFrame {
        val p=state.pose.forMode(AxisMode.AXIS6);val profile=MachineProfile6AxNicStyle
        val a=profile.joints.single{it.axis==MachineAxis.A};val b=profile.joints.single{it.axis==MachineAxis.B};val c=profile.joints.single{it.axis==MachineAxis.C}
        return Axis6KinematicFrame(a,b,c,p.a,p.b,p.c)
    }
    fun toolReferencePoint(state:AxisSceneState):MachineVec3 {
        val f=kinematicFrame(state);val s=MachineProfile6AxNicStyle.parts.single{it.id=="TOOL"}
        val probe=MachineVec3(s.offset.x+s.size.x/2f,s.offset.y-s.size.y/2f,s.offset.z+s.size.z/2f)
        val afterC=MachineKinematics.rotatePoint(probe,f.c.pivot,f.c.direction,f.cDegrees)
        val afterB=MachineKinematics.rotatePoint(afterC,f.b.pivot,f.b.direction,f.bDegrees)
        return MachineKinematics.rotatePoint(afterB,f.a.pivot,f.a.direction,f.aDegrees)
    }
}