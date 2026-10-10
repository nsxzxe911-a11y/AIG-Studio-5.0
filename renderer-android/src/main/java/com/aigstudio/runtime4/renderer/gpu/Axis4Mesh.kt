package com.aigstudio.runtime4.renderer.gpu

import com.aigstudio.runtime4.renderer.machine.MachineProfile4AxHrtStyle

enum class Axis4Part { BASE, COLUMN, TABLE, ROTARY_HOUSING, PLATTER, CHUCK, WORKPIECE, SPINDLE, TOOL }

data class Axis4PartMesh(val part:Axis4Part,val vertices:FloatArray)

object Axis4Mesh {
    fun parts():List<Axis4PartMesh> = MachineProfile4AxHrtStyle.parts.map{spec->
        val part=Axis4Part.valueOf(spec.id)
        val vertices=when(part){
            Axis4Part.PLATTER,Axis4Part.CHUCK->CylinderMeshFactory.alongX(spec.size.x,minOf(spec.size.y,spec.size.z)/2f)
            else->CuboidMeshFactory.vertices(spec.size.x,spec.size.y,spec.size.z)
        }
        Axis4PartMesh(part,vertices)
    }
}