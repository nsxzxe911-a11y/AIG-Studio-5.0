package com.aigstudio.runtime4.renderer

import com.aigstudio.runtime4.contract.*
import com.aigstudio.runtime4.renderer.gpu.*
import com.aigstudio.runtime4.renderer.machine.*
import org.junit.Assert.*
import org.junit.Test

class Axis6SceneRegression {
    @Test fun navigationRouteAndAdaptiveLayoutAreDedicatedToAxis6(){
        assertEquals(SceneId.AXIS6,SharedVisualPolicy.destination("NAV.6AX"));assertEquals(FourthRenderRoute.AXIS6,RenderRoutePolicy.forScene(SceneId.AXIS6))
        listOf(1080f to 1920f,1920f to 1080f).forEach{(w,h)->val nodes=Axis6SceneLayout.nodes(w,h,1f);assertTrue(nodes.any{it.id=="AXIS6.VIEWPORT"});val buttons=nodes.filterIsInstance<RgbGlassButtonNode>();assertTrue(buttons.all{it.bounds.width>=48f&&it.bounds.height>=48f});assertEquals(VisualState.SELECTED,buttons.single{it.id=="NAV.6AX"}.visualState)}
    }

    @Test fun presentationPreservesNonzeroC(){
        val state=AxisSceneState(AxisMode.AXIS6,AxisPoseSnapshot(1.0,2.0,-3.0,10.0,20.0,30.0),"MP6",6L,7,8);val v=Axis6Presentation.from(state)
        assertEquals(1.0,v.x,0.0);assertEquals(2.0,v.y,0.0);assertEquals(-3.0,v.z,0.0);assertEquals(10.0,v.aDegrees,0.0);assertEquals(20.0,v.bDegrees,0.0);assertEquals(30.0,v.cDegrees,0.0)
    }

    @Test fun toolHeadUsesNestedABCAndDoesNotMutateSource(){
        val original=AxisPoseSnapshot(1.0,2.0,-3.0,10.0,20.0,30.0);val state=AxisSceneState(AxisMode.AXIS6,original,"MP6",6L,7,8);val f=Axis6Presentation.kinematicFrame(state)
        assertEquals(f.a.id,f.b.parentId);assertEquals(f.b.id,f.c.parentId);assertEquals(MachineVec3(1f,0f,0f),f.a.direction);assertEquals(MachineVec3(0f,0f,1f),f.b.direction);assertEquals(MachineVec3(0f,1f,0f),f.c.direction)
        val zero=Axis6Presentation.toolReferencePoint(state.copy(pose=original.copy(a=0.0,b=0.0,c=0.0)));val a=Axis6Presentation.toolReferencePoint(state.copy(pose=original.copy(b=0.0,c=0.0)));val ab=Axis6Presentation.toolReferencePoint(state.copy(pose=original.copy(c=0.0)));val abc=Axis6Presentation.toolReferencePoint(state)
        assertNotEquals(zero,a);assertNotEquals(a,ab);assertNotEquals(ab,abc);assertEquals(original,state.pose)
    }

    @Test fun spindleCIsRoundVolume(){val v=Axis6Mesh.parts().single{it.part==Axis6Part.SPINDLE_C}.vertices;val xz=v.indices.filter{it%6==0}.map{Pair(v[it],v[it+2])}.toSet();assertTrue(xz.size>=12)}
}