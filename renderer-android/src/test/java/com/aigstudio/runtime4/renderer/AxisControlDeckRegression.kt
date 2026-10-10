package com.aigstudio.runtime4.renderer

import com.aigstudio.runtime4.contract.AxisMode
import org.junit.Assert.*
import org.junit.Test

class AxisControlDeckRegression {
    @Test fun everyAxisOwnsPrimaryControlsAndRotariesGrowByMode(){
        val common=setOf(AxisControlAction.VIEW,AxisControlAction.AXIS,AxisControlAction.PLAY,AxisControlAction.DISPLAY)
        val a=setOf(AxisControlAction.A_MINUS,AxisControlAction.A_PLUS);val b=setOf(AxisControlAction.B_MINUS,AxisControlAction.B_PLUS);val c=setOf(AxisControlAction.C_MINUS,AxisControlAction.C_PLUS)
        assertEquals(common,AxisControlDeck.forMode(AxisMode.AXIS3).map{it.action}.toSet())
        assertEquals(common+a,AxisControlDeck.forMode(AxisMode.AXIS4).map{it.action}.toSet())
        assertEquals(common+a+b,AxisControlDeck.forMode(AxisMode.AXIS5).map{it.action}.toSet())
        assertEquals(common+a+b+c,AxisControlDeck.forMode(AxisMode.AXIS6).map{it.action}.toSet())
    }

    @Test fun controlsAreLocalUniqueAndNeverRequireNeighborConnection(){
        AxisMode.entries.forEach{mode->val d=AxisControlDeck.forMode(mode);assertEquals(d.size,d.map{it.controlId}.toSet().size);assertTrue(d.all{it.enabled});assertTrue(d.all{!it.requiresConnection})}
    }

    @Test fun portraitAndLandscapeControlDeckHasNoOverlapAnd48dpTargets(){
        val density=2f
        AxisMode.entries.forEach{mode->listOf(1080f to 1920f,1920f to 1080f).forEach{(w,h)->
            val layout=AxisControlDeck.layout(mode,w,h,density);val buttons=layout.nodes.filterIsInstance<RgbGlassButtonNode>()
            assertTrue(buttons.all{it.bounds.width>=48f*density&&it.bounds.height>=48f*density})
            buttons.forEachIndexed{i,a->buttons.drop(i+1).forEach{b->val overlap=a.bounds.left<b.bounds.right&&a.bounds.right>b.bounds.left&&a.bounds.top<b.bounds.bottom&&a.bounds.bottom>b.bounds.top;assertFalse("{mode.name} {a.id} overlaps {b.id}",overlap)}}
            assertTrue(layout.viewportTop>layout.nodes.maxOf{it.bounds.bottom}-1f)
        }}
    }

    @Test fun rgbSkinHasSemanticGlassStatesAndPanelRole(){
        assertNotEquals(RgbSkinTokens.fillFor(VisualState.NORMAL).toList(),RgbSkinTokens.fillFor(VisualState.SELECTED).toList())
        assertNotEquals(RgbSkinTokens.fillFor(VisualState.PRESSED).toList(),RgbSkinTokens.fillFor(VisualState.DISABLED).toList())
        assertNotEquals(RgbSkinTokens.edgeFor(0,VisualState.NORMAL).toList(),RgbSkinTokens.edgeFor(2,VisualState.NORMAL).toList())
        val layout=AxisControlDeck.layout(AxisMode.AXIS6,1080f,1920f,2f)
        assertTrue(layout.nodes.any{it is RgbGlassPanelNode})
        assertTrue(layout.nodes.filterIsInstance<RgbGlassButtonNode>().all{it.skinRole==RgbSkinRole.CONTROL})
    }

    @Test fun sceneLayoutsConsumeDescriptorsWithStableIds(){
        val expected6=AxisControlDeck.forMode(AxisMode.AXIS6).map{it.controlId}.toSet()
        val nodes6=Axis6SceneLayout.nodes(1080f,1920f,2f).filterIsInstance<RgbGlassButtonNode>().filter{it.id.startsWith("AXIS6.")}
        assertEquals(expected6,nodes6.map{it.id}.toSet());assertFalse(nodes6.any{it.id=="AXIS6."})
    }
}