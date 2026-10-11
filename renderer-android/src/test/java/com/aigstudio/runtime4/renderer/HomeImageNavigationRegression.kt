package com.aigstudio.runtime4.renderer

import com.aigstudio.runtime4.contract.PageId
import com.aigstudio.runtime4.contract.ui.AigUiAction
import org.junit.Assert.*
import org.junit.Test

class HomeImageNavigationRegression {
    @Test fun approvedHomeTopNavigationIsTheSharedTenButtonFamily(){
        val nodes=PrimaryPageNavigationLayout.nodes(941f,1672f,PageId.HOME)
        val pages=nodes.mapNotNull{(it.aigActionBinding as? AigUiAction.Navigate)?.page}
        assertEquals(10,nodes.size)
        assertEquals(listOf(PageId.HOME,PageId.CAD,PageId.CAM,PageId.SIM,PageId.AXIS3,PageId.AXIS4,PageId.AXIS5,PageId.AXIS6,PageId.NC,PageId.AI),pages)
        assertFalse(PageId.MULTIFUNCTION in pages)
        assertEquals(VisualState.SELECTED,nodes.single{(it.aigActionBinding as AigUiAction.Navigate).page==PageId.HOME}.visualState)
    }
}
