package com.aigstudio.runtime4.contract

import kotlin.test.*

class PageCapabilityContractRegression {
    @Test fun everyPageIsLaunchableWhenAllNeighborsAreDisconnected(){
        PageId.entries.forEach{page->
            val state=PageCapabilityState.disconnected(page)
            assertTrue(state.launchable)
            assertEquals(PageId.entries.filter{it!=page}.toSet(),state.connections.map{it.target}.toSet())
            assertTrue(state.connections.all{!it.connected && it.source==page})
        }
    }

    @Test fun connectionFlagsAreIndependentValues(){
        val base=PageCapabilityState.disconnected(PageId.CAM)
        val cad=base.connections.first{it.target==PageId.CAD}
        val sim=base.connections.first{it.target==PageId.SIM}
        val changed=base.copy(connections=base.connections.map{if(it==cad)it.copy(connected=true) else it})
        assertTrue(changed.connections.first{it.target==PageId.CAD}.connected)
        assertFalse(changed.connections.first{it.target==PageId.SIM}.connected)
        assertFalse(sim.connected)
        assertTrue(changed.launchable)
    }

    @Test fun localAlarmNeverChangesLaunchability(){
        val state=PageCapabilityState.disconnected(PageId.NC).copy(status=PageLocalStatus(MessageSeverity.ALARM,"G-code line error"))
        assertTrue(state.launchable)
        assertEquals(MessageSeverity.ALARM,state.status?.severity)
        assertEquals("G-code line error",state.status?.text)
    }

    @Test fun contractCoversAllProductPages(){
        assertEquals(setOf(PageId.HOME,PageId.CAD,PageId.CAM,PageId.SIM,PageId.AXIS3,PageId.AXIS4,PageId.AXIS5,PageId.AXIS6,PageId.NC,PageId.AI),PageId.entries.toSet())
    }
}