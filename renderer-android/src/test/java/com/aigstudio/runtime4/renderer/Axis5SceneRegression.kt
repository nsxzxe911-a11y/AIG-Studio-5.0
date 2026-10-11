package com.aigstudio.runtime4.renderer

import com.aigstudio.runtime4.contract.*
import com.aigstudio.runtime4.renderer.gpu.*
import com.aigstudio.runtime4.renderer.machine.*
import org.junit.Assert.*
import org.junit.Test

class Axis5SceneRegression {
    @Test fun navigationRouteAndAdaptiveLayoutAreDedicatedToAxis5() {
        assertEquals(SceneId.AXIS5,SharedVisualPolicy.destination("NAV.5AX"))
        assertEquals(FourthRenderRoute.AXIS5,RenderRoutePolicy.forScene(SceneId.AXIS5))
        listOf(1080f to 1920f,1920f to 1080f).forEach{(w,h)->
            val nodes=Axis5SceneLayout.nodes(w,h,1f)
            assertTrue(nodes.any{it.id=="AXIS5.VIEWPORT"})
            val buttons=nodes.filterIsInstance<RgbGlassButtonNode>()
            assertTrue(buttons.all{it.bounds.width>=48f && it.bounds.height>=48f})
            assertEquals(VisualState.SELECTED,buttons.single{it.id=="NAV.5AX"}.visualState)
        }
    }

    @Test fun presentationPreservesXyzABAndProjectsCToZero() {
        val state=AxisSceneState(AxisMode.AXIS5,AxisPoseSnapshot(1.0,2.0,-3.0,10.0,20.0,30.0),"MP5",5L,7,8)
        val v=Axis5Presentation.from(state)
        assertEquals(1.0,v.x,0.0);assertEquals(2.0,v.y,0.0);assertEquals(-3.0,v.z,0.0);assertEquals(10.0,v.aDegrees,0.0);assertEquals(20.0,v.bDegrees,0.0)
        assertEquals(0.0,state.pose.forMode(AxisMode.AXIS5).c,0.0)
    }

    @Test fun trunnionUsesNestedPhysicalAThenBWithoutMutatingSource() {
        val original=AxisPoseSnapshot(1.0,2.0,-3.0,30.0,45.0,99.0)
        val state=AxisSceneState(AxisMode.AXIS5,original,"MP5",5L,7,8)
        val frame=Axis5Presentation.kinematicFrame(state)
        assertEquals(MachineAxis.A,frame.a.axis);assertEquals(MachineAxis.B,frame.b.axis);assertEquals(frame.a.id,frame.b.parentId)
        val zero=Axis5Presentation.workpieceReferencePoint(state.copy(pose=original.copy(a=0.0,b=0.0)))
        val onlyA=Axis5Presentation.workpieceReferencePoint(state.copy(pose=original.copy(a=30.0,b=0.0)))
        val both=Axis5Presentation.workpieceReferencePoint(state.copy(pose=original.copy(a=30.0,b=45.0)))
        assertNotEquals(zero,onlyA);assertNotEquals(onlyA,both)
        assertEquals(original,state.pose)
    }

    @Test fun platterIsRoundAndProfileDirectionsArePhysical() {
        val platter=Axis5Mesh.parts().single{it.part==Axis5Part.PLATTER}.vertices
        val xz=platter.indices.filter{it%6==0}.map{Pair(platter[it],platter[it+2])}.toSet()
        assertTrue(xz.size>=12)
        val a=MachineProfile5AxTrunnionStyle.joints.single{it.axis==MachineAxis.A};val b=MachineProfile5AxTrunnionStyle.joints.single{it.axis==MachineAxis.B}
        assertEquals(MachineVec3(1f,0f,0f),a.direction)
        assertEquals(MachineVec3(0f,1f,0f),b.direction)
    }
}