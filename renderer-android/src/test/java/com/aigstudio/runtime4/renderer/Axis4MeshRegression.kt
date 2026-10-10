package com.aigstudio.runtime4.renderer

import com.aigstudio.runtime4.renderer.gpu.Axis4Mesh
import com.aigstudio.runtime4.renderer.gpu.Axis4Part
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class Axis4MeshRegression {
    @Test fun hrtSceneHasSingleRotaryTablePartsAndTrueVolumes() {
        val parts=Axis4Mesh.parts()
        assertEquals(setOf(Axis4Part.BASE,Axis4Part.COLUMN,Axis4Part.TABLE,Axis4Part.ROTARY_HOUSING,Axis4Part.PLATTER,Axis4Part.CHUCK,Axis4Part.WORKPIECE,Axis4Part.SPINDLE,Axis4Part.TOOL),parts.map{it.part}.toSet())
        parts.forEach{part->
            assertTrue(part.vertices.size>=36*6 && part.vertices.size%6==0)
            val xs=part.vertices.indices.filter{it%6==0}.map{part.vertices[it]}.toSet();val ys=part.vertices.indices.filter{it%6==1}.map{part.vertices[it]}.toSet();val zs=part.vertices.indices.filter{it%6==2}.map{part.vertices[it]}.toSet()
            assertTrue(xs.size>1);assertTrue(ys.size>1);assertTrue(zs.size>1)
        }
    }

    @Test fun platterAndChuckAreRoundMeshesNotBoxes() {
        listOf(Axis4Part.PLATTER,Axis4Part.CHUCK).forEach{kind->
            val v=Axis4Mesh.parts().single{it.part==kind}.vertices
            val yz=v.indices.filter{it%6==0}.map{index->Pair(v[index+1],v[index+2])}.toSet()
            assertTrue("round cross-section for ",yz.size>=12)
        }
    }
}