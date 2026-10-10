package com.aigstudio.runtime4.renderer.gpu

import com.aigstudio.runtime4.renderer.machine.MachineProfile6AxNicStyle

enum class Axis6Part { BASE, COLUMN, TABLE, WORKPIECE, SWIVEL_A, SWIVEL_B, SPINDLE_C, TOOL }
data class Axis6PartMesh(val part:Axis6Part,val vertices:FloatArray)
object Axis6Mesh {
    fun parts():List<Axis6PartMesh> = MachineProfile6AxNicStyle.parts.map{spec->
        val part=Axis6Part.valueOf(spec.id)
        val vertices=if(part==Axis6Part.SPINDLE_C) CylinderMeshFactory.alongY(spec.size.y,minOf(spec.size.x,spec.size.z)/2f) else CuboidMeshFactory.vertices(spec.size.x,spec.size.y,spec.size.z)
        Axis6PartMesh(part,vertices)
    }
}