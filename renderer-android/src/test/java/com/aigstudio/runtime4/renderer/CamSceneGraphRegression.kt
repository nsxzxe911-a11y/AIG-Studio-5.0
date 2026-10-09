package com.aigstudio.runtime4.renderer

import com.aigstudio.runtime4.contract.*
import org.junit.Assert.*
import org.junit.Test

class CamSceneGraphRegression {
    private class FakePort(var state:CamState=CamState.initial()):CamRuntimePort {
        var last:CamCommand?=null
        override fun snapshot()=state
        override fun dispatch(command:CamCommand):CamDispatchResult { last=command; return CamDispatchResult(true,state) }
    }

    @Test fun everyEnabledCamControlIsAGpuNodeWithRealCommand() {
        val state=CamState.initial()
        val nodes=CamSceneLayout.nodes(2316f,1080f,3f,state)
        val camControls=nodes.filterIsInstance<RgbGlassButtonNode>().filter{it.id.startsWith("CAM.") && it.enabled}
        assertTrue(camControls.size>=20)
        camControls.forEach { node -> assertNotNull("missing command for "+node.id,node.camCommandBinding) }
        assertTrue(nodes.any{it.id=="CAM.VIEWPORT"})
        assertFalse(nodes.any{it.javaClass.name.contains("android.widget")})
    }

    @Test fun controllerDispatchesCamOnlyAndUsesStateForToggleCommands() {
        val source=CamSourceSnapshot(CamSourceKind.PHOTO,"photo",1,"d",emptyList(),emptyList())
        val runtime=FakePort(CamState.initial().copy(source=source,sourceLink=CamSourceLinkState.CONNECTED,toolpathLink=CamToolpathLinkState.DISCONNECTED))
        val controller=CamSceneController(runtime)
        controller.activate("CAM.SOURCE_LINK"); assertEquals(CamCommand.DisconnectSource,runtime.last)
        controller.activate("CAM.TOOLPATH_LINK"); assertEquals(CamCommand.ConnectToolpath,runtime.last)
        controller.activate("CAD.LINE"); assertEquals(CamCommand.ConnectToolpath,runtime.last)
    }

    @Test fun homeAndCamLayoutsExposeDeterministicNavigation() {
        val home=HomeSceneLayout.nodes(2316f,1080f,3f).map{it.id}.toSet()
        assertTrue("NAV.CAD" in home); assertTrue("NAV.CAM" in home)
        val cam=CamSceneLayout.nodes(2316f,1080f,3f,CamState.initial()).map{it.id}.toSet()
        assertTrue("NAV.HOME" in cam); assertTrue("NAV.CAD" in cam); assertTrue("NAV.CAM" in cam)
    }
}
