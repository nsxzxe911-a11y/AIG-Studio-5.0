package com.aigstudio.runtime4.contract

import kotlin.test.*

class UnifiedControlContractRegression {
    @Test fun globalPageOrderIsExactAndExcludesMultifunction(){
        assertEquals(
            listOf(PageId.HOME,PageId.CAD,PageId.CAM,PageId.SIM,PageId.AXIS3,PageId.AXIS4,PageId.AXIS5,PageId.AXIS6,PageId.NC,PageId.AI),
            GlobalPageRibbonContract.pageOrder
        )
        assertFalse(PageId.MULTIFUNCTION in GlobalPageRibbonContract.pageOrder)
    }

    @Test fun unifiedTokensLockSafeTouchTargetsAndFiveStates(){
        assertEquals(56f,UnifiedButtonTokens.MIN_TOUCH_DP)
        assertEquals(64f,UnifiedButtonTokens.PREFERRED_TOUCH_DP)
        assertEquals(
            setOf(UnifiedVisualState.NORMAL,UnifiedVisualState.PRESSED,UnifiedVisualState.SELECTED,UnifiedVisualState.DISABLED,UnifiedVisualState.ALARM),
            UnifiedVisualState.entries.toSet()
        )
    }

    @Test fun globalSpecsHaveUniqueStableIdsAndSelectedState(){
        val specs=GlobalPageRibbonContract.specs(PageId.CAM)
        assertEquals(10,specs.size)
        assertEquals(specs.size,specs.map{it.controlId}.toSet().size)
        assertEquals("NAV.CAM",specs.single{it.page==PageId.CAM}.controlId)
        assertEquals(UnifiedVisualState.SELECTED,specs.single{it.page==PageId.CAM}.visualState)
        assertTrue(specs.all{it.kind==UnifiedControlKind.GLOBAL_NAV && it.minTouchDp>=56f})
    }

    @Test fun pageToolGroupingAcceptsOnlyApprovedMobileGroupSize(){
        assertFailsWith<IllegalArgumentException>{PageToolRibbonContract.group(listOf("A","B","C","D"),3)}
        assertFailsWith<IllegalArgumentException>{PageToolRibbonContract.group(listOf("A","B","C","D","E","F","G"),7)}
        assertEquals(listOf(listOf("A","B","C","D"),listOf("E")),PageToolRibbonContract.group(listOf("A","B","C","D","E"),4))
    }
}
