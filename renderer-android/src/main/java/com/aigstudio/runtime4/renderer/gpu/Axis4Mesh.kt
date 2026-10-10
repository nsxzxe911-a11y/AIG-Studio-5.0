package com.aigstudio.runtime4.renderer.gpu

enum class Axis4Part { BASE, COLUMN, SUPPORT_LEFT, SUPPORT_RIGHT, TRUNNION, WORKPIECE, SPINDLE, TOOL }

data class Axis4PartMesh(val part:Axis4Part,val vertices:FloatArray)

object Axis4Mesh {
    fun parts():List<Axis4PartMesh> = listOf(
        Axis4PartMesh(Axis4Part.BASE,CuboidMeshFactory.vertices(7.2f,0.8f,5.4f)),
        Axis4PartMesh(Axis4Part.COLUMN,CuboidMeshFactory.vertices(1.2f,4.8f,1.4f)),
        Axis4PartMesh(Axis4Part.SUPPORT_LEFT,CuboidMeshFactory.vertices(0.7f,2.2f,1.6f)),
        Axis4PartMesh(Axis4Part.SUPPORT_RIGHT,CuboidMeshFactory.vertices(0.7f,2.2f,1.6f)),
        Axis4PartMesh(Axis4Part.TRUNNION,CuboidMeshFactory.vertices(4.2f,0.5f,2.7f)),
        Axis4PartMesh(Axis4Part.WORKPIECE,CuboidMeshFactory.vertices(2.8f,0.8f,1.8f)),
        Axis4PartMesh(Axis4Part.SPINDLE,CuboidMeshFactory.vertices(0.9f,1.8f,0.9f)),
        Axis4PartMesh(Axis4Part.TOOL,CuboidMeshFactory.vertices(0.22f,2.0f,0.22f)),
    )
}