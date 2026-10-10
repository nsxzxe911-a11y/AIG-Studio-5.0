package com.aigstudio.runtime4.renderer.machine

import com.aigstudio.runtime4.contract.AxisMode

enum class MachineAxis { X, Y, Z, A, B, C }
enum class JointKind { LINEAR, ROTARY }

data class MachineVec3(val x:Float,val y:Float,val z:Float)

data class MachineJointSpec(
    val id:String,
    val axis:MachineAxis,
    val kind:JointKind,
    val parentId:String?,
    val pivot:MachineVec3,
    val min:Double,
    val max:Double,
)

data class MachinePartSpec(
    val id:String,
    val parentJointId:String?,
    val size:MachineVec3,
    val offset:MachineVec3,
)

data class MachineProfile(
    val mode:AxisMode,
    val profileId:String,
    val joints:List<MachineJointSpec>,
    val parts:List<MachinePartSpec>,
    val workpieceAnchor:MachineVec3,
    val toolAnchor:MachineVec3,
)