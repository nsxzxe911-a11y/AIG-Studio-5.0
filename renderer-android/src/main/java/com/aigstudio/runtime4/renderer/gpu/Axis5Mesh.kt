package com.aigstudio.runtime4.renderer.gpu

import com.aigstudio.runtime4.renderer.machine.MachineProfile5AxTrunnionStyle

enum class Axis5Part { BASE, COLUMN, TABLE, TILT_SUPPORT_LEFT, TILT_SUPPORT_RIGHT, TILT_CRADLE, PLATTER, WORKPIECE, SPINDLE, TOOL }
data class Axis5PartMesh(val part:Axis5Part,val vertices:FloatArray)
object Axis5Mesh { fun parts():List<Axis5PartMesh> = MachineProfile5AxTrunnionStyle.parts.map{spec->val part=Axis5Part.valueOf(spec.id);val vertices=if(part==Axis5Part.PLATTER)CylinderMeshFactory.alongY(spec.size.y,minOf(spec.size.x,spec.size.z)/2f) else CuboidMeshFactory.vertices(spec.size.x,spec.size.y,spec.size.z);Axis5PartMesh(part,vertices)} }