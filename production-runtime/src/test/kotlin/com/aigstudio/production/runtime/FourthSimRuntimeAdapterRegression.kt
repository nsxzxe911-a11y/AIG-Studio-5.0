package com.aigstudio.production.runtime

import com.aigstudio.runtime4.contract.*
import kotlin.test.*

class FourthSimRuntimeAdapterRegression {
    @Test fun localMotionProgramRunsTrueMaterialRemovalWithoutCamConnection() {
        val nc=FourthNcRuntimeAdapter()
        val program=listOf(
            "G90 G54",
            "G0 X0. Y0. Z5.",
            "G1 Z-3. F150.",
            "G1 X20. Y0. Z-3.",
            "G1 X20. Y20. Z-3.",
            "G0 Z5."
        ).joinToString("\n")
        assertTrue(nc.dispatch(NcCommand.SetProgram(program)).accepted)
        val sim=FourthSimRuntimeAdapter { nc.snapshot().motionProgram }
        val result=sim.run()
        assertTrue(result.ready)
        assertTrue(result.removedCells>0)
        assertTrue(result.minDepthMm<=-3.0+1e-9)
        assertTrue(result.removedVolumeMm3>0.0)
        assertEquals(nc.snapshot().motionProgram!!.digest,result.motionDigest)
        assertNull(result.message)
    }

    @Test fun missingMotionIsLocalInfoNotCrashOrGlobalLock() {
        val sim=FourthSimRuntimeAdapter { null }
        val result=sim.run()
        assertFalse(result.ready)
        assertEquals(MessageSeverity.INFO,result.message?.severity)
        assertEquals("SIM_MOTION_NOT_AVAILABLE",result.message?.text)
        assertEquals(0,result.removedCells)
    }
}
