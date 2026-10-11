package com.aigstudio.runtime4.renderer

import com.aigstudio.runtime4.contract.*
import org.junit.Assert.*
import org.junit.Test

class NcSceneGraphRegression {
    private class FakePort(var state:NcState=NcState.initial()):NcRuntimePort {
        var last:NcCommand?=null
        override fun snapshot()=state
        override fun dispatch(command:NcCommand):NcDispatchResult { last=command; return NcDispatchResult(true,state) }
    }

    @Test fun everyEnabledNcControlIsAGpuNodeWithRealCommand() {
        val candidate=NcCandidate("C1",1,"d","G90 G54",NcCandidateSourceKind.CAM_POST)
        val state=NcState.initial().copy(
            working=NcWorkingCopy("NC7",7,"w","G90 G54\nG1 X1. C35. F100.",12,true),
            camLink=NcCamLinkState.CONNECTED,candidate=candidate,previewCandidateId="C1"
        )
        val nodes=NcSceneLayout.nodes(2316f,1080f,3f,state)
        val controls=nodes.filterIsInstance<RgbGlassButtonNode>().filter{it.id.startsWith("NC.") && it.id!="NC.EDITOR" && it.enabled}
        assertTrue(controls.size>=25)
        controls.forEach{node->assertNotNull("missing NC command for "+node.id,node.ncCommandBinding)}
        assertTrue(nodes.any{it.id=="NC.EDITOR"})
        assertFalse(nodes.any{it.javaClass.name.contains("android.widget")})
        assertEquals(NcCommand.UnfreezeActive,(nodes.first{it.id=="NC.FREEZE"} as RgbGlassButtonNode).ncCommandBinding)
        assertEquals(NcCommand.DisconnectCam,(nodes.first{it.id=="NC.CAM_LINK"} as RgbGlassButtonNode).ncCommandBinding)
        assertEquals(NcCommand.InsertText("C"),(nodes.first{it.id=="NC.KEY.C"} as RgbGlassButtonNode).ncCommandBinding)
        assertEquals(NcCommand.ToggleInsertMode,(nodes.first{it.id=="NC.INSERT"} as RgbGlassButtonNode).ncCommandBinding)
        assertEquals(NcCommand.DeleteForward,(nodes.first{it.id=="NC.DELETE"} as RgbGlassButtonNode).ncCommandBinding)
        assertEquals(NcCommand.NewBlock,(nodes.first{it.id=="NC.EOB"} as RgbGlassButtonNode).ncCommandBinding)
        assertEquals(NcCommand.ToggleBlockSkip,(nodes.first{it.id=="NC.BLOCK_SKIP"} as RgbGlassButtonNode).ncCommandBinding)
    }

    @Test fun controllerDispatchesOnlyNcCommands() {
        val runtime=FakePort()
        val controller=NcSceneController(runtime)
        controller.activate("NC.KEY.G"); assertEquals(NcCommand.InsertText("G"),runtime.last)
        controller.activate("NC.INSERT"); assertEquals(NcCommand.ToggleInsertMode,runtime.last)
        controller.activate("CAD.LINE"); assertEquals(NcCommand.ToggleInsertMode,runtime.last)
    }

    @Test fun homeAndNcLayoutsExposeDeterministicNavigation() {
        val home=HomeSceneLayout.nodes(2316f,1080f,3f).map{it.id}.toSet()
        assertTrue("NAV.NC" in home)
        val cad=CadSceneLayout.nodes(2316f,1080f,3f,false).map{it.id}.toSet()
        assertTrue("NAV.CAM" in cad);assertTrue("NAV.NC" in cad)
        val cam=CamSceneLayout.nodes(2316f,1080f,3f,CamState.initial()).map{it.id}.toSet()
        assertTrue("NAV.NC" in cam)
        val nc=NcSceneLayout.nodes(2316f,1080f,3f,NcState.initial()).map{it.id}.toSet()
        assertTrue("NAV.HOME" in nc);assertTrue("NAV.CAD" in nc);assertTrue("NAV.CAM" in nc);assertTrue("NAV.NC" in nc)
    }
    @Test fun adaptiveLayoutProtectsEditorAndSeparatesCncKeypad() {
        val density=3f
        val landscape=NcSceneLayout.nodes(2316f,1080f,density,NcState.initial())
        val editorL=landscape.first{it.id=="NC.EDITOR"}.bounds
        val controlsL=landscape.filter{it.id.startsWith("NC.") && it.id!="NC.EDITOR" && !it.id.startsWith("NC.DIAG.")}
        assertTrue("landscape editor must keep majority width",editorL.width>=1200f)
        assertTrue("landscape editor must keep full working height",editorL.height>=820f)
        assertTrue("landscape controls must sit outside editor",controlsL.all{it.bounds.left>=editorL.right})
        assertTrue("landscape controls need 48dp touch height",controlsL.all{it.bounds.height>=48f*density})

        val portrait=NcSceneLayout.nodes(1080f,2316f,density,NcState.initial())
        val editorP=portrait.first{it.id=="NC.EDITOR"}.bounds
        val controlsP=portrait.filter{it.id.startsWith("NC.") && it.id!="NC.EDITOR" && !it.id.startsWith("NC.DIAG.")}
        assertTrue("portrait editor must keep upper working area",editorP.height>=1050f)
        assertTrue("portrait keypad must stay below editor",controlsP.all{it.bounds.top>=editorP.bottom})
        assertTrue("portrait controls need 48dp touch height",controlsP.all{it.bounds.height>=48f*density})
    }
    @Test fun diagnosticsAlarmOnlyAffectedLineNode() {
        val state=NcState.initial().copy(
            working=NcWorkingCopy("NC1",1,"d","G90 G54\nG999 X0.\nM30",0,false),
            diagnostics=listOf(NcDiagnostic(2,MessageSeverity.ALARM,"G999","bad")),
            message=RuntimeMessage(MessageSeverity.ALARM,"L2 bad")
        )
        val nodes=NcSceneLayout.nodes(2316f,1080f,3f,state)
        val alarms=nodes.filter{it.visualState==VisualState.ALARM}
        assertTrue(alarms.isNotEmpty())
        assertTrue(alarms.all{it.id.startsWith("NC.DIAG.")})
        assertNotEquals(VisualState.ALARM,nodes.first{it.id=="NC.EDITOR"}.visualState)
    }
}