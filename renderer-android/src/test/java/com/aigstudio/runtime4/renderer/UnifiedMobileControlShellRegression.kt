package com.aigstudio.runtime4.renderer

import com.aigstudio.runtime4.contract.*
import com.aigstudio.runtime4.contract.ui.AigUiAction
import org.junit.Assert.*
import org.junit.Test

class UnifiedMobileControlShellRegression {
    private val w=1080f
    private val h=1920f
    private val d=2f

    @Test fun composeRemovesLegacyPageNavAndAddsSingleGlobalRibbon(){
        val base=listOf<SceneNode>(
            RgbGlassButtonNode("NAV.CAM",UiBounds(0f,0f,100f,100f),1,"CAM",null,null),
            RgbGlassButtonNode("IMG.CAD.NAV.CAM",UiBounds(0f,0f,100f,100f),2,"CAM",null,null,aigActionBinding=AigUiAction.Navigate(PageId.CAM)),
            SceneNode("KEEP",UiBounds(0f,200f,100f,300f),1),
        )
        val out=UnifiedMobileControlShell.compose(base,PageId.CAM,w,h,d,0)
        val ids=out.map{it.id}
        assertFalse("IMG.CAD.NAV.CAM" in ids)
        assertEquals(1,ids.count{it=="NAV.CAM"})
        assertTrue("KEEP" in ids)
        val global=out.filterIsInstance<RgbGlassButtonNode>().filter{it.id in GlobalPageRibbon.allControlIds}
        assertTrue(global.isNotEmpty())
        assertEquals("NAV.CAM",global.single{it.visualState==VisualState.SELECTED}.id)
    }

    @Test fun homeHasNoSpecialMultifunctionEntry(){
        val base=PrimaryPageNavigationLayout.nodes(w,h,PageId.HOME)
        val pages=base.mapNotNull{(it.aigActionBinding as? AigUiAction.Navigate)?.page}
        assertFalse(PageId.MULTIFUNCTION in pages)
        assertEquals(10,pages.size)
    }

    @Test fun realToolSourcesArePagedAndPreserveCommandBindings(){
        val cam=CamSceneLayout.nodes(w,h,d,CamState.initial())
        val camTools=UnifiedMobileControlShell.realToolButtons(cam,PageId.CAM)
        assertTrue(camTools.size>=20)
        assertTrue(camTools.all{it.camCommandBinding!=null || it.aigActionBinding is AigUiAction.Cam})
        assertTrue(UnifiedMobileControlShell.toolPages(cam,PageId.CAM).all{it.size in 1..4})

        val nc=NcSceneLayout.nodes(w,h,d,NcState.initial())
        val ncTools=UnifiedMobileControlShell.realToolButtons(nc,PageId.NC)
        assertTrue(ncTools.size>=30)
        assertTrue(ncTools.all{it.ncCommandBinding!=null})

        val sim=SimSceneLayout.nodes(w,h,d)
        assertEquals(setOf("SIM.PLAY","SIM.STEP","SIM.RESET","SIM.DISPLAY"),UnifiedMobileControlShell.realToolButtons(sim,PageId.SIM).map{it.id}.toSet())

        val ai=AiSceneLayout.nodes(w,h,d)
        assertEquals(setOf("AI.OPEN","AI.VERIFY","AI.RESTORE"),UnifiedMobileControlShell.realToolButtons(ai,PageId.AI).map{it.id}.toSet())
    }

    @Test fun axisPagesDoNotInventToolActionsWithoutDispatchPort(){
        val axis=Axis3SceneLayout.nodes(w,h,d)
        assertTrue(UnifiedMobileControlShell.realToolButtons(axis,PageId.AXIS3).isEmpty())
        assertTrue(UnifiedMobileControlShell.toolPages(axis,PageId.AXIS3).isEmpty())
    }

    @Test fun toolRibbonUsesLargeBottomSlotsAndKeepsOriginalControlIds(){
        val base=SimSceneLayout.nodes(w,h,d)
        val nodes=UnifiedMobileControlShell.toolRibbonNodes(base,PageId.SIM,w,h,d,0)
        assertEquals(listOf("SIM.PLAY","SIM.STEP","SIM.RESET","SIM.DISPLAY"),nodes.map{it.id})
        assertTrue(nodes.all{it.bounds.width>=56f*d && it.bounds.height>=56f*d})
    }
}
