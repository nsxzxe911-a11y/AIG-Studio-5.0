package com.aigstudio.runtime4.renderer

import com.aigstudio.runtime4.renderer.gpu.Axis4Mesh
import com.aigstudio.runtime4.renderer.gpu.Axis4Part
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class Axis4MeshRegression {
    @Test fun trunnionSceneHasIndependentThreeDimensionalParts() {
        val parts=Axis4Mesh.parts()
        assertEquals(setOf(Axis4Part.BASE,Axis4Part.COLUMN,Axis4Part.SUPPORT_LEFT,Axis4Part.SUPPORT_RIGHT,Axis4Part.TRUNNION,Axis4Part.WORKPIECE,Axis4Part.SPINDLE,Axis4Part.TOOL),parts.map{it.part}.toSet())
        parts.forEach{part->
            assertTrue("vertex format ",part.vertices.size>=36*6 && part.vertices.size%6==0)
            val xs=part.vertices.indices.filter{it%6==0}.map{part.vertices[it]}.toSet()
            val ys=part.vertices.indices.filter{it%6==1}.map{part.vertices[it]}.toSet()
            val zs=part.vertices.indices.filter{it%6==2}.map{part.vertices[it]}.toSet()
            assertTrue("3D X ",xs.size>1);assertTrue("3D Y ",ys.size>1);assertTrue("3D Z ",zs.size>1)
        }
    }
}