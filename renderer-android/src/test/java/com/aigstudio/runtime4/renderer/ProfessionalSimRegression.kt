package com.aigstudio.runtime4.renderer

import com.aigstudio.runtime4.contract.*
import com.aigstudio.runtime4.contract.ui.*
import org.junit.Assert.*
import org.junit.Test

class ProfessionalSimRegression {
    @Test fun simOwnsProfessionalDeckViewportAndRealActions(){
        val descriptor=SimProfessionalDescriptor.descriptor()
        assertEquals(PageId.SIM,descriptor.page)
        assertEquals(AigUiKind.CONTROL_DECK,descriptor.components.first{it.controlId=="SIM.CONTROL_DECK"}.kind)
        assertEquals(AigUiKind.VIEWPORT,descriptor.components.first{it.controlId=="SIM.VIEWPORT.FRAME"}.kind)
        val buttons=descriptor.components.filter{it.kind==AigUiKind.BUTTON}
        assertEquals(setOf("SIM.PLAY","SIM.STEP","SIM.RESET","SIM.DISPLAY"),buttons.map{it.controlId}.toSet())
        assertTrue(buttons.all{it.enabled&&it.action is AigUiAction.Sim})
        assertEquals(AigUiAction.Sim(AigSimCommand.RUN),buttons.first{it.controlId=="SIM.PLAY"}.action)
    }

    @Test fun simPortraitAndLandscapeKeepTouchSafeViewport(){
        listOf(Triple(1080f,1920f,2f),Triple(1920f,1080f,2f)).forEach{(w,h,d)->
            val nodes=SimSceneLayout.nodes(w,h,d)
            val viewport=nodes.first{it.id=="SIM.VIEWPORT"}.bounds
            assertTrue(nodes.first{it.id=="SIM.VIEWPORT.FRAME"} is RgbGlassPanelNode)
            assertTrue(viewport.width>48f*d&&viewport.height>48f*d)
            nodes.filterIsInstance<RgbGlassButtonNode>().filter{it.id.startsWith("SIM.")}.forEach{
                assertTrue("${it.id} width",it.bounds.width>=48f*d)
                assertTrue("${it.id} height",it.bounds.height>=48f*d)
            }
        }
    }

    @Test fun disconnectedSimStillAllowsPlay(){
        assertTrue(PageCapabilityState.disconnected(PageId.SIM).connections.all{!it.connected})
        val play=SimProfessionalDescriptor.descriptor().components.first{it.controlId=="SIM.PLAY"}
        assertTrue(play.enabled)
        assertEquals(AigUiAction.Sim(AigSimCommand.RUN),play.action)
    }
}
