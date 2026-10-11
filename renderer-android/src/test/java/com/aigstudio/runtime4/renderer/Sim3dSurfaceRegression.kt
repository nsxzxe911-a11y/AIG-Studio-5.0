package com.aigstudio.runtime4.renderer

import com.aigstudio.runtime4.contract.PageId
import org.junit.Assert.assertEquals
import org.junit.Test

class Sim3dSurfaceRegression {
    @Test fun simUsesApproved941x1672UnifiedSkin(){
        assertEquals("aig-rgb/page-surfaces/sim.png",PageSurfaceTexturePlan.path(PageId.SIM))
        val size=PageSurfaceTexturePlan.imageSize(PageId.SIM)
        assertEquals(941f,size!!.first,0.01f)
        assertEquals(1672f,size.second,0.01f)
    }
}
