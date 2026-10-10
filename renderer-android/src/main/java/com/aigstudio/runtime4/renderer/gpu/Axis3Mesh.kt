package com.aigstudio.runtime4.renderer.gpu

enum class Axis3Part { BASE, COLUMN, TABLE, WORKPIECE, SPINDLE, TOOL }

data class Axis3PartMesh(val part:Axis3Part,val vertices:FloatArray)

object Axis3Mesh {
    fun parts():List<Axis3PartMesh> = listOf(
        Axis3PartMesh(Axis3Part.BASE,CuboidMeshFactory.vertices(6.4f,0.8f,5.0f)),
        Axis3PartMesh(Axis3Part.COLUMN,CuboidMeshFactory.vertices(1.2f,5.2f,1.4f)),
        Axis3PartMesh(Axis3Part.TABLE,CuboidMeshFactory.vertices(4.4f,0.5f,3.2f)),
        Axis3PartMesh(Axis3Part.WORKPIECE,CuboidMeshFactory.vertices(2.8f,0.8f,2.0f)),
        Axis3PartMesh(Axis3Part.SPINDLE,CuboidMeshFactory.vertices(0.9f,1.8f,0.9f)),
        Axis3PartMesh(Axis3Part.TOOL,CuboidMeshFactory.vertices(0.22f,2.0f,0.22f)),
    )
}