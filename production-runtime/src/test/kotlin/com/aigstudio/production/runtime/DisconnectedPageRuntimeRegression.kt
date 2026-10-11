package com.aigstudio.production.runtime

import com.aigstudio.runtime4.contract.*
import kotlin.test.*

class DisconnectedPageRuntimeRegression {
    @Test fun cadDrawsLocallyWhileAllConnectionsAreOff(){
        val runtime=ProductionPageRuntime()
        assertTrue(runtime.snapshot(PageId.CAD).connections.all{!it.connected})
        assertTrue(runtime.dispatchCad(CadCommand.SelectTool(CadTool.LINE)).accepted)
        assertTrue(runtime.dispatchCad(CadCommand.PointerDown(CadPoint(0.0,0.0))).accepted)
        val result=runtime.dispatchCad(CadCommand.PointerUp(CadPoint(20.0,0.0)))
        assertTrue(result.accepted);assertEquals(1,result.state.primitives.size);assertTrue(runtime.snapshot(PageId.CAD).launchable)
    }

    @Test fun camManualEditsXyzabcWithoutCadConnection(){
        val runtime=ProductionPageRuntime()
        assertFalse(runtime.snapshot(PageId.CAM).connections.single{it.target==PageId.CAD}.connected)
        assertTrue(runtime.dispatchCam(CamCommand.StartManual).accepted)
        assertTrue(runtime.dispatchCam(CamCommand.SetSafeZ(8.0)).accepted)
        assertTrue(runtime.dispatchCam(CamCommand.ReplacePointXYZABC(0,0.0,0.0,8.0,10.0,20.0,30.0,CamMotionKind.G0)).accepted)
        val result=runtime.dispatchCam(CamCommand.ReplacePointXYZABC(1,10.0,5.0,-2.0,15.0,25.0,35.0,CamMotionKind.G1))
        assertTrue(result.accepted);assertEquals(35.0,result.state.active!!.points[1].c,0.0);assertTrue(runtime.snapshot(PageId.CAM).launchable)
    }

    @Test fun ncEditorRemainsAuthoritativeWithoutCamConnection(){
        val runtime=ProductionPageRuntime()
        assertFalse(runtime.snapshot(PageId.NC).connections.single{it.target==PageId.CAM}.connected)
        val result=runtime.dispatchNc(NcCommand.SetProgram("G90 G54\nG0 X1. Y2. Z3. A10. B20. C30.\nM30"))
        assertTrue(result.accepted);assertTrue(result.state.working.program.contains("C30."));assertNotNull(result.state.motionProgram);assertTrue(runtime.snapshot(PageId.NC).launchable)
    }

    @Test fun aiAndAxesRemainLocalWhenDisconnected(){
        val runtime=ProductionPageRuntime()
        assertTrue(runtime.snapshot(PageId.AI).connections.all{!it.connected});assertTrue(runtime.aiSnapshot().summary.isNotBlank())
        val axis=runtime.axisSnapshot(AxisMode.AXIS6)
        assertNotNull(axis.motionProgramId);assertTrue(runtime.snapshot(PageId.AXIS6).launchable)
    }

    @Test fun connectionMetadataDoesNotMutateLocalContent(){
        val runtime=ProductionPageRuntime();runtime.dispatchNc(NcCommand.SetProgram("G90\nG0 X9.\nM30"));val before=runtime.ncSnapshot().working.digest
        runtime.setConnection(PageId.NC,PageId.CAM,true)
        assertTrue(runtime.snapshot(PageId.NC).connections.single{it.target==PageId.CAM}.connected)
        assertEquals(before,runtime.ncSnapshot().working.digest)
        assertTrue(runtime.snapshot(PageId.NC).launchable)
    }
}