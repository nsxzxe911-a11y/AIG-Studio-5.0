package com.aigstudio.runtime4.renderer

import com.aigstudio.runtime4.contract.*
import com.aigstudio.runtime4.contract.ui.*
import org.junit.Assert.*
import org.junit.Test

class ProfessionalCadRegression {
    @Test fun cadDescriptorKeepsRealActionsAndUsesWorkstationRegions(){
        val descriptor=CadProfessionalDescriptor.descriptor(false,false,false)
        assertEquals(PageId.CAD,descriptor.page)
        assertEquals(AigUiKind.PANEL,descriptor.components.first{it.controlId=="CAD.LEFT_TOOLBAR"}.kind)
        assertEquals(AigUiKind.PANEL,descriptor.components.first{it.controlId=="CAD.INSPECTOR"}.kind)
        assertEquals(AigUiKind.VIEWPORT,descriptor.components.first{it.controlId=="CAD.VIEWPORT.FRAME"}.kind)
        assertNull(descriptor.components.firstOrNull{it.controlId=="CAD.CONTROL_DECK"})
        val buttons=descriptor.components.filter{it.visible&&it.kind==AigUiKind.BUTTON}
        assertTrue(buttons.all{it.action!=null&&it.enabled})
        assertEquals(AigUiAction.Cad(CadCommand.SelectTool(CadTool.LINE)),buttons.first{it.controlId=="CAD.LINE"}.action)
        assertEquals("aig-rgb/cad/arc.png",buttons.first{it.controlId=="CAD.ARC"}.iconAsset)
    }

    @Test fun professionalTopNavigationIsOneCompactProductRow(){
        val nav=ProfessionalTopNavigationLayout.layout(1080f,1920f,2f,"NAV.CAD")
        assertEquals(listOf("NAV.HOME","NAV.CAD","NAV.CAM","NAV.SIM","NAV.3AX","NAV.4AX","NAV.5AX","NAV.6AX","NAV.NC","NAV.AI"),nav.buttons.map{it.id})
        assertTrue(nav.buttons.all{it.bounds.top==nav.buttons.first().bounds.top})
        assertTrue(nav.buttons.all{it.bounds.height>=96f})
        assertTrue(nav.buttons.none{it.id=="NAV.MULTIFUNCTION"})
        assertTrue(nav.buttons.map{it.id}.containsAll(setOf("NAV.3AX","NAV.4AX","NAV.5AX","NAV.6AX")))
        assertEquals(VisualState.SELECTED,nav.buttons.first{it.id=="NAV.CAD"}.visualState)
    }

    @Test fun cadLandscapeIsToolbarCanvasInspectorAndPortraitInspectorBecomesBottomSheet(){
        val landscape=CadSceneLayout.nodes(1920f,1080f,2f,false,false,false)
        val lViewport=landscape.first{it.id=="CAD.VIEWPORT"}.bounds
        val lTools=landscape.first{it.id=="CAD.LEFT_TOOLBAR"}.bounds
        val lInspector=landscape.first{it.id=="CAD.INSPECTOR"}.bounds
        assertTrue(lTools.right<=lViewport.left)
        assertTrue(lViewport.right<=lInspector.left)
        assertTrue("landscape canvas must dominate width",lViewport.width>=1920f*0.62f)

        val portrait=CadSceneLayout.nodes(1080f,1920f,2f,false,false,false)
        val pViewport=portrait.first{it.id=="CAD.VIEWPORT"}.bounds
        val pTools=portrait.first{it.id=="CAD.LEFT_TOOLBAR"}.bounds
        val pInspector=portrait.first{it.id=="CAD.INSPECTOR"}.bounds
        assertTrue(pTools.right<=pViewport.left)
        assertTrue("portrait inspector must collapse below canvas",pInspector.top>=pViewport.bottom)
        assertTrue(pViewport.width>=1080f*0.72f)
    }

    @Test fun cadUsesGraphiteWorkstationRolesButKeepsAigRgbIcons(){
        val nodes=CadSceneLayout.nodes(1920f,1080f,2f,false,false,false)
        assertEquals(RgbSkinRole.WORKSTATION_PANEL,(nodes.first{it.id=="CAD.LEFT_TOOLBAR"} as RgbGlassPanelNode).skinRole)
        val line=nodes.first{it.id=="CAD.LINE"} as RgbGlassButtonNode
        assertEquals(RgbSkinRole.WORKSTATION_CONTROL,line.skinRole)
        assertEquals("aig-rgb/cad/line.png",line.textureRef)
        assertFalse(line.usesFallback)
        assertEquals(WorkstationSkinProfile.GRAPHITE,AigWorkstationSkinTokens.defaultProfile)
    }

    @Test fun cadConnectionIsAStatusChipInsteadOfAnotherLargeCard(){
        val state=PageCapabilityState.disconnected(PageId.CAD)
        val nodes=ProductControlDeck.nodes(PageId.CAD,state,false,1920f,1080f,2f)
        assertEquals(1,nodes.size)
        val chip=nodes.single() as RgbGlassButtonNode
        assertEquals(RgbSkinRole.STATUS_CHIP,chip.skinRole)
        assertTrue(chip.bounds.width<1920f*0.20f)
        assertTrue(chip.bounds.height<=120f)
    }
}
