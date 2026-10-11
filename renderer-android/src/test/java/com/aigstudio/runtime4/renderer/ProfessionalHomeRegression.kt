package com.aigstudio.runtime4.renderer

import com.aigstudio.runtime4.contract.*
import com.aigstudio.runtime4.contract.ui.*
import org.junit.Assert.*
import org.junit.Test

class ProfessionalHomeRegression {
    @Test fun mobileHomeOwnsApprovedDashboardRegions(){
        val d=HomeProfessionalDescriptor.descriptor()
        val ids=d.components.map{it.controlId}.toSet()
        listOf(
            "HOME.HEADER","HOME.CONNECTIONS.PANEL","HOME.QUICK.PANEL","HOME.ONECLICK.PANEL",
            "HOME.FILES.PANEL","HOME.TOOLS.PANEL","HOME.USER.PANEL","HOME.LINKS.PANEL","HOME.SYSTEM.PANEL"
        ).forEach{assertTrue("missing $it",it in ids)}
    }

    @Test fun mobileHomeTopNavigationHasTenRealDestinations(){
        val d=HomeProfessionalDescriptor.descriptor()
        val expected=listOf(
            "NAV.HOME" to PageId.HOME,"NAV.CAD" to PageId.CAD,"NAV.CAM" to PageId.CAM,"NAV.SIM" to PageId.SIM,
            "NAV.3AX" to PageId.AXIS3,"NAV.4AX" to PageId.AXIS4,"NAV.5AX" to PageId.AXIS5,"NAV.6AX" to PageId.AXIS6,
            "NAV.NC" to PageId.NC,"NAV.AI" to PageId.AI,
        )
        expected.forEach{(id,page)->
            val c=d.components.single{it.controlId==id}
            assertEquals(AigUiAction.Navigate(page),c.action)
            assertTrue(c.enabled)
        }
        assertNull(d.components.firstOrNull{it.controlId=="NAV.MULTIFUNCTION"})
    }

    @Test fun mobileHomePortraitUsesTwoNavRowsAndNonOverlappingDashboard(){
        val nodes=HomeSceneLayout.nodes(1080f,2316f,3f)
        val nav=nodes.filterIsInstance<RgbGlassButtonNode>().filter{it.id.startsWith("NAV.")}
        assertEquals(10,nav.size)
        assertEquals(2,nav.map{it.bounds.top}.distinct().size)
        nav.forEach{assertTrue(it.bounds.width>=108f);assertTrue(it.bounds.height>=108f)}
        val panels=listOf("HOME.CONNECTIONS.PANEL","HOME.QUICK.PANEL","HOME.ONECLICK.PANEL","HOME.FILES.PANEL","HOME.SYSTEM.PANEL")
            .map{id->nodes.single{it.id==id}.bounds}
        panels.indices.forEach{i->for(j in i+1 until panels.size){
            val a=panels[i];val b=panels[j]
            assertFalse(a.left<b.right&&a.right>b.left&&a.top<b.bottom&&a.bottom>b.top)
        }}
    }

    @Test fun connectionStripUsesTruthfulNonClickableStatusCards(){
        val d=HomeProfessionalDescriptor.descriptor()
        val local=d.components.single{it.controlId=="HOME.CONNECTIONS.CAD"}
        val cloud=d.components.single{it.controlId=="HOME.CONNECTIONS.CLOUD"}
        assertEquals(AigUiKind.STATUS_CARD,local.kind)
        assertFalse(local.enabled);assertNull(local.action);assertEquals(AigUiState.SELECTED,local.state)
        assertFalse(cloud.enabled);assertNull(cloud.action);assertEquals(AigUiState.DISABLED,cloud.state)
        val node=HomeSceneLayout.nodes(1080f,2316f,3f).single{it.id=="HOME.CONNECTIONS.CAD"} as RgbGlassButtonNode
        assertEquals(RgbSkinRole.HOME_STATUS,node.skinRole)
        assertFalse(node.enabled)
    }

    @Test fun homepageInteractiveTilesNeverUseFakeActions(){
        val d=HomeProfessionalDescriptor.descriptor()
        val interactive=d.components.filter{it.enabled&&it.kind in setOf(AigUiKind.BUTTON,AigUiKind.NAV,AigUiKind.CARD)}
        assertTrue(interactive.isNotEmpty())
        assertTrue(interactive.all{it.action!=null})
    }

    @Test fun localOnlyPresentationNeverInventsMachineTelemetry(){
        val all=HomeLivePresentation.localOnly().labels("zh-TW").values.joinToString("|")
        listOf("42%","12000 rpm","192.168.","42°C","MACHINE RUNNING").forEach{assertFalse(all.contains(it))}
    }
}
