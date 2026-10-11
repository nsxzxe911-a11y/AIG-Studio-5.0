package com.aigstudio.runtime4.renderer

import com.aigstudio.runtime4.contract.*
import org.junit.Assert.assertFalse
import org.junit.Test

private class DeckOverlapRuntime:PageConnectionRuntimePort {
    private val links=mutableMapOf<Pair<PageId,PageId>,Boolean>()
    override fun snapshot(page:PageId)=PageCapabilityState(page,true,PageId.entries.filter{it!=page}.map{PageConnection(page,it,links[page to it]==true)})
    override fun setConnection(source:PageId,target:PageId,connected:Boolean):PageCapabilityState { links[source to target]=connected;return snapshot(source) }
}

class ProductControlDeckNoOverlapRegression {
    @Test fun ncPortraitLinkDeckNeverCoversCncControls() {
        listOf(Triple(1080f,1920f,2f),Triple(1080f,2316f,3f)).forEach { (w,h,density) ->
            val runtime=DeckOverlapRuntime();val controller=ProductControlDeckController(runtime)
            val ncControls=NcSceneLayout.nodes(w,h,density,NcState.initial()).filter{it.id.startsWith("NC.")&&it.id!="NC.EDITOR"&&!it.id.startsWith("NC.DIAG.")}
            fun assertNoOverlap()=controller.nodes(PageId.NC,w,h,density).forEach { deck -> ncControls.forEach { control ->
                val overlap=deck.bounds.left<control.bounds.right&&deck.bounds.right>control.bounds.left&&deck.bounds.top<control.bounds.bottom&&deck.bounds.bottom>control.bounds.top
                assertFalse("${deck.id} overlaps ${control.id} at density=$density",overlap)
            }}
            assertNoOverlap()
            controller.activate(PageId.NC,"LINKS.NC")
            assertNoOverlap()
        }
    }
}
