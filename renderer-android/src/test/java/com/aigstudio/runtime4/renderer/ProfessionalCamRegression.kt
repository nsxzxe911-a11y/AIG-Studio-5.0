package com.aigstudio.runtime4.renderer

import com.aigstudio.runtime4.contract.*
import com.aigstudio.runtime4.contract.ui.*
import org.junit.Assert.*
import org.junit.Test

class ProfessionalCamRegression {
    @Test fun camOwnsProfessionalDeckViewportAndRealActions(){
        val state=CamState.initial()
        val descriptor=CamProfessionalDescriptor.descriptor(state)
        assertEquals(PageId.CAM,descriptor.page)
        assertEquals(AigUiKind.CONTROL_DECK,descriptor.components.first{it.controlId=="CAM.CONTROL_DECK"}.kind)
        assertEquals(AigUiKind.VIEWPORT,descriptor.components.first{it.controlId=="CAM.VIEWPORT.FRAME"}.kind)
        val buttons=descriptor.components.filter{it.kind==AigUiKind.BUTTON}
        assertEquals(25,buttons.size)
        assertTrue(buttons.all{it.enabled&&it.action is AigUiAction.Cam})
        assertEquals(AigUiAction.Cam(CamCommand.StartManual),buttons.first{it.controlId=="CAM.MANUAL"}.action)
    }

    @Test fun camPortraitAndLandscapeKeepTouchSafeViewport(){
        val state=CamState.initial()
        listOf(Triple(1080f,1920f,2f),Triple(1920f,1080f,2f)).forEach{(w,h,d)->
            val nodes=CamSceneLayout.nodes(w,h,d,state)
            val viewport=nodes.first{it.id=="CAM.VIEWPORT"}.bounds
            assertTrue(nodes.first{it.id=="CAM.VIEWPORT.FRAME"} is RgbGlassPanelNode)
            assertTrue(viewport.width>48f*d&&viewport.height>48f*d)
            nodes.filterIsInstance<RgbGlassButtonNode>().filter{it.id.startsWith("CAM.")}.forEach{
                assertTrue("${it.id} width",it.bounds.width>=48f*d)
                assertTrue("${it.id} height",it.bounds.height>=48f*d)
            }
        }
    }

    @Test fun disconnectedCamKeepsManualControlsEnabled(){
        assertTrue(PageCapabilityState.disconnected(PageId.CAM).connections.all{!it.connected})
        val manual=CamProfessionalDescriptor.descriptor(CamState.initial()).components.first{it.controlId=="CAM.MANUAL"}
        assertTrue(manual.enabled)
        assertEquals(AigUiAction.Cam(CamCommand.StartManual),manual.action)
    }
}
