package com.aigstudio.app

import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class Aig436VisualPageContractTest {
    @Test fun `ten pages stay in fixed production order`() {
        assertEquals(
            listOf("HOME","CAD","CAM","SIM","3AX","4AX","5AX","6AX","NC","AI"),
            Aig436VisualPageContract.pages.map { it.id }
        )
    }

    @Test fun `nav band is fixed and each page has one equal hotspot`() {
        assertTrue(Aig436VisualPageContract.NAV_TOP_FRACTION in 0.08f..0.11f)
        assertTrue(Aig436VisualPageContract.NAV_BOTTOM_FRACTION in 0.14f..0.17f)
        assertEquals(10, Aig436VisualPageContract.pages.size)
        assertEquals(0, Aig436VisualPageContract.pageIndexForXFraction(0.01f))
        assertEquals(9, Aig436VisualPageContract.pageIndexForXFraction(0.99f))
    }
}
