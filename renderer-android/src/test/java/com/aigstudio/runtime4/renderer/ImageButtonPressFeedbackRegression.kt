package com.aigstudio.runtime4.renderer

import kotlin.math.abs
import org.junit.Assert.*
import org.junit.Test

class ImageButtonPressFeedbackRegression {
    @Test fun pressedFeedbackStaysInsideExactHitboxAndFeelsDepressed(){
        val source=UiBounds(100f,200f,300f,320f)
        val plan=ImageButtonPressFeedback.plan(source)
        assertTrue(plan.depressed.left>source.left)
        assertTrue(plan.depressed.right<source.right)
        assertTrue(plan.depressed.top>source.top)
        assertTrue(plan.depressed.bottom<source.bottom)
        assertEquals(0.95f,plan.depressed.width/source.width,0.01f)
        assertEquals(0.95f,plan.depressed.height/source.height,0.01f)
        val sourceCy=(source.top+source.bottom)/2f
        val pressedCy=(plan.depressed.top+plan.depressed.bottom)/2f
        assertTrue(pressedCy>sourceCy)
        assertTrue(plan.topShade.top>=plan.depressed.top && plan.topShade.bottom<=plan.depressed.bottom)
        assertTrue(plan.bottomHighlight.top>=plan.depressed.top && plan.bottomHighlight.bottom<=plan.depressed.bottom)
    }

    @Test fun imageNavigationHitboxesNeverEscapeArtwork(){
        val homeImage=HomeImageNavigationLayout.imageBounds(1080f,1920f)
        HomeImageNavigationLayout.nodes(1080f,1920f).forEach{n->
            assertTrue(n.bounds.left>=homeImage.left && n.bounds.right<=homeImage.right)
            assertTrue(n.bounds.top>=homeImage.top && n.bounds.bottom<=homeImage.bottom)
        }
        val multiImage=MultifunctionImageInteractionLayout.imageBounds(1080f,1920f)
        MultifunctionImageInteractionLayout.nodes(1080f,1920f).forEach{n->
            assertTrue(n.bounds.left>=multiImage.left && n.bounds.right<=multiImage.right)
            assertTrue(n.bounds.top>=multiImage.top && n.bounds.bottom<=multiImage.bottom)
        }
    }
}
