package com.aigstudio.runtime4.renderer

import com.aigstudio.runtime4.contract.*
import com.aigstudio.runtime4.contract.ui.*
import com.aigstudio.runtime4.renderer.gpu.FourthRenderRoute
import com.aigstudio.runtime4.renderer.gpu.RenderRoutePolicy
import org.junit.Assert.*
import org.junit.Test

class MultifunctionPageRegression {
    private val expectedRoutes=linkedMapOf(
        "MULTI.SIM" to PageId.SIM,
        "MULTI.3AX" to PageId.AXIS3,
        "MULTI.4AX" to PageId.AXIS4,
        "MULTI.5AX" to PageId.AXIS5,
        "MULTI.6AX" to PageId.AXIS6,
        "MULTI.NC" to PageId.NC,
        "MULTI.AI" to PageId.AI,
    )

    @Test fun dedicatedPageHasSevenRealRoutedCards(){
        val descriptor=MultifunctionDescriptor.descriptor()
        assertEquals(PageId.MULTIFUNCTION,descriptor.page)
        val cards=descriptor.components.filter{it.kind==AigUiKind.CARD}
        assertEquals(expectedRoutes.keys,cards.map{it.controlId}.toSet())
        assertEquals(cards.size,cards.map{it.controlId}.toSet().size)
        cards.forEach{card->
            assertTrue(card.visible)
            assertTrue(card.enabled)
            assertFalse(card.labelKey.isNullOrBlank())
            assertFalse(card.iconAsset.isNullOrBlank())
            assertEquals(expectedRoutes.getValue(card.controlId),(card.action as AigUiAction.Navigate).page)
        }
        assertEquals(FourthRenderRoute.MULTIFUNCTION,RenderRoutePolicy.forScene(SceneId.MULTIFUNCTION))
    }

    @Test fun futureModulesNeverAppearAsDecorativeClickableImages(){
        val interactive=MultifunctionDescriptor.descriptor().components.filter{it.kind in setOf(AigUiKind.CARD,AigUiKind.BUTTON,AigUiKind.NAV)}
        assertTrue(interactive.all{it.action!=null})
        assertFalse(interactive.any{it.controlId.startsWith("MULTI.FUTURE")})
    }

    @Test fun portraitAndLandscapeCardsAreTouchSafeAndNonOverlapping(){
        listOf(Triple(1080f,1920f,2f),Triple(1920f,1080f,2f)).forEach{(w,h,d)->
            val nodes=MultifunctionSceneLayout.nodes(w,h,d)
            val cards=nodes.filterIsInstance<RgbGlassButtonNode>().filter{it.id.startsWith("MULTI.")}
            assertEquals(7,cards.size)
            cards.forEach{card->
                assertTrue("${card.id} width",card.bounds.width>=48f*d)
                assertTrue("${card.id} height",card.bounds.height>=48f*d)
                assertNotNull(card.aigActionBinding)
            }
            cards.indices.forEach{i->for(j in i+1 until cards.size){
                val a=cards[i].bounds;val b=cards[j].bounds
                val overlap=a.left<b.right&&a.right>b.left&&a.top<b.bottom&&a.bottom>b.top
                assertFalse("overlap ${cards[i].id} / ${cards[j].id}",overlap)
            }}
        }
    }
}
