package com.aigstudio.runtime4.renderer
import com.aigstudio.runtime4.contract.*
import org.junit.Assert.*
import org.junit.Test
private class LinkRuntimeStub:PageConnectionRuntimePort{
 private val map=mutableMapOf<Pair<PageId,PageId>,Boolean>()
 override fun snapshot(page:PageId)=PageCapabilityState(page,true,PageId.entries.filter{it!=page}.map{PageConnection(page,it,map[page to it]==true)})
 override fun setConnection(source:PageId,target:PageId,connected:Boolean):PageCapabilityState{map[source to target]=connected;return snapshot(source)}
}
class ProductControlDeckRegression{
 @Test fun collapsedLandscapeDeckUsesReservedNavigationSlot(){val r=LinkRuntimeStub();val c=ProductControlDeckController(r);val w=1920f;val h=1080f;val d=2f;val navTop=AxisNavigationLayout.layout(w,h,d,"NAV.6AX").top;val deck=c.nodes(PageId.AXIS6,w,h,d);assertEquals(1,deck.size);assertTrue("collapsed landscape link must stay in nav band",deck.single().bounds.top>=navTop)}
 @Test fun collapsedDeckExpandsAndRealLinkToggleSynchronizesBothEnds(){val r=LinkRuntimeStub();val c=ProductControlDeckController(r);var nodes=c.nodes(PageId.CAD,1080f,1920f,2f);assertNotNull(nodes.firstOrNull{it.id=="LINKS.CAD"});assertNull(nodes.firstOrNull{it.id=="LINK.CAD.CAM"});c.activate(PageId.CAD,"LINKS.CAD");nodes=c.nodes(PageId.CAD,1080f,1920f,2f);assertNotNull(nodes.firstOrNull{it.id=="LINK.CAD.CAM"});c.activate(PageId.CAD,"LINK.CAD.CAM");assertTrue(r.snapshot(PageId.CAD).connections.single{it.target==PageId.CAM}.connected);assertTrue(r.snapshot(PageId.CAM).connections.single{it.target==PageId.CAD}.connected);assertTrue(r.snapshot(PageId.CAD).launchable)}
 @Test fun productDeckUsesUnusedNavCellsAndKeeps48dpTargets(){val r=LinkRuntimeStub();val c=ProductControlDeckController(r);c.activate(PageId.SIM,"LINKS.SIM");listOf(1080f to 1920f,1920f to 1080f).forEach{(w,h)->val nav=AxisNavigationLayout.layout(w,h,2f,"NAV.SIM").buttons;val deck=c.nodes(PageId.SIM,w,h,2f);assertTrue(deck.isNotEmpty());deck.filterIsInstance<RgbGlassButtonNode>().forEach{assertTrue(it.bounds.width>=96f&&it.bounds.height>=96f);assertTrue(it.bounds.right<=w&&it.bounds.bottom<=h)};deck.forEach{d->nav.forEach{n->val overlap=d.bounds.left<n.bounds.right&&d.bounds.right>n.bounds.left&&d.bounds.top<n.bounds.bottom&&d.bounds.bottom>n.bounds.top;assertFalse("deck overlaps nav ${d.id}/${n.id}",overlap)}}}}
}

