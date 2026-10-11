package com.aigstudio.runtime4.renderer

import com.aigstudio.runtime4.renderer.gpu.Axis3Mesh
import com.aigstudio.runtime4.renderer.gpu.Axis3Part
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class Axis3MeshRegression {
    @Test fun machineMeshHasIndependentThreeDimensionalParts() {
        val parts = Axis3Mesh.parts()
        assertEquals(setOf(Axis3Part.BASE, Axis3Part.COLUMN, Axis3Part.TABLE, Axis3Part.WORKPIECE, Axis3Part.SPINDLE, Axis3Part.TOOL), parts.map { it.part }.toSet())
        parts.forEach { part ->
            assertTrue("vertex format ", part.vertices.size >= 36 * 6 && part.vertices.size % 6 == 0)
            val xs = part.vertices.indices.filter { it % 6 == 0 }.map { part.vertices[it] }.toSet()
            val ys = part.vertices.indices.filter { it % 6 == 1 }.map { part.vertices[it] }.toSet()
            val zs = part.vertices.indices.filter { it % 6 == 2 }.map { part.vertices[it] }.toSet()
            assertTrue("3D X ", xs.size > 1)
            assertTrue("3D Y ", ys.size > 1)
            assertTrue("3D Z ", zs.size > 1)
        }
    }
}