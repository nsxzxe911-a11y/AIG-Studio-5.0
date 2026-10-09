package com.aigstudio.runtime4.renderer

import com.aigstudio.runtime4.contract.*
import com.aigstudio.runtime4.renderer.gpu.CamPresentation
import org.junit.Assert.*
import org.junit.Test

class CamPresentationRegression {
    @Test fun activeCandidateAndLocalMessageStaySeparated() {
        val activePoint=CamPointSnapshot(1.0,2.0,-1.0,10.0,20.0,30.0,CamMotionKind.G1,manualOverride=true)
        val candidatePoint=CamPointSnapshot(9.0,8.0,-2.0,0.0,0.0,0.0,CamMotionKind.G1)
        val active=CamToolpathVersion("TP1",1,"a",listOf(activePoint),false,null,1)
        val candidate=CamCandidateToolpath("C1",1,"c",listOf(candidatePoint),null,2)
        val state=CamState.initial().copy(active=active,candidate=candidate,previewCandidateId="C1",message=RuntimeMessage(MessageSeverity.WARNING,"LOCAL"))
        val p=CamPresentation.from(state)
        assertEquals(listOf(activePoint),p.active)
        assertEquals(listOf(candidatePoint),p.candidate)
        assertEquals("LOCAL",p.localMessage?.text)
        assertFalse(p.globalBackdropAlarm)
    }

    @Test fun linkAndFreezeVisualStateComeFromCamState() {
        val point=CamPointSnapshot(0.0,0.0,5.0,0.0,0.0,0.0,CamMotionKind.G0)
        val active=CamToolpathVersion("TP1",1,"x",listOf(point),true,null,0)
        val state=CamState.initial().copy(active=active,toolpathLink=CamToolpathLinkState.DISCONNECTED,sourceLink=CamSourceLinkState.CONNECTED)
        val nodes=CamSceneLayout.nodes(2316f,1080f,3f,state).filterIsInstance<RgbGlassButtonNode>()
        assertEquals(VisualState.SELECTED,nodes.single{it.id=="CAM.SOURCE_LINK"}.visualState)
        assertEquals(VisualState.SELECTED,nodes.single{it.id=="CAM.FREEZE"}.visualState)
        assertEquals(VisualState.NORMAL,nodes.single{it.id=="CAM.TOOLPATH_LINK"}.visualState)
    }
}
