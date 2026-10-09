package com.aigstudio.production.runtime

import com.aigstudio.runtime4.contract.*
import kotlin.test.*

class CadCheckpointRegression {
    private fun tap(r:FourthCadRuntimeAdapter,a:CadPoint,b:CadPoint,tool:CadTool){r.dispatch(CadCommand.SelectTool(tool));r.dispatch(CadCommand.PointerDown(a));assertTrue(r.dispatch(CadCommand.PointerUp(b)).accepted)}
    private fun click(r:FourthCadRuntimeAdapter,p:CadPoint){r.dispatch(CadCommand.PointerDown(p));assertTrue(r.dispatch(CadCommand.PointerUp(p)).accepted)}
    private fun select(r:FourthCadRuntimeAdapter,p:CadPoint){r.dispatch(CadCommand.SelectTool(CadTool.SELECT));click(r,p)}

    private fun richRuntime():FourthCadRuntimeAdapter {
        val r=FourthCadRuntimeAdapter()
        tap(r,CadPoint(0.0,0.0),CadPoint(20.0,0.0),CadTool.LINE);select(r,CadPoint(10.0,0.0));assertTrue(r.dispatch(CadCommand.ApplySelectedDimension(CadDimensionKind.LENGTH,25.0)).accepted)
        r.dispatch(CadCommand.SetActiveLayer(CadLayer.CENTERLINE));r.dispatch(CadCommand.SelectTool(CadTool.ARC));click(r,CadPoint(50.0,50.0));click(r,CadPoint(60.0,50.0));click(r,CadPoint(50.0,60.0))
        r.dispatch(CadCommand.ToggleLayerVisibility(CadLayer.CENTERLINE));r.dispatch(CadCommand.SetActiveLayer(CadLayer.WORKPIECE))
        tap(r,CadPoint(100.0,100.0),CadPoint(120.0,100.0),CadTool.LINE);tap(r,CadPoint(120.0,100.0),CadPoint(120.0,120.0),CadTool.LINE)
        select(r,CadPoint(110.0,100.0));select(r,CadPoint(120.0,110.0));assertTrue(r.dispatch(CadCommand.ToggleTopology).accepted)
        r.dispatch(CadCommand.SetActiveLayer(CadLayer.ORIGIN))
        return r
    }

    @Test fun checkpointRoundTripsGeometryArcLayersTopologyAndDimensions() {
        val source=richRuntime(); val raw=(source as CadPersistencePort).exportCheckpoint()
        assertTrue(raw.startsWith("AIG_CAD_CHECKPOINT_V1\n")); assertTrue(raw.trimEnd().endsWith("END"))
        val restored=FourthCadRuntimeAdapter(); val result=(restored as CadPersistencePort).restoreCheckpoint(raw)
        assertTrue(result.accepted); assertEquals(CadLayer.ORIGIN,result.state.activeLayer); assertFalse(result.state.layerVisibility.getValue(CadLayer.CENTERLINE))
        assertEquals(1,result.state.topologyCount); assertEquals(1,result.state.dimensions.size); assertEquals(25.0,result.state.dimensions.single().valueMm,1e-9)
        assertTrue(restored.dispatch(CadCommand.ToggleLayerVisibility(CadLayer.CENTERLINE)).accepted)
        assertTrue(restored.snapshot().primitives.any{it is CadPrimitiveSnapshot.Arc})
    }

    @Test fun corruptCheckpointIsRejectedWithoutReplacingLiveCad() {
        val r=FourthCadRuntimeAdapter();tap(r,CadPoint(0.0,0.0),CadPoint(10.0,0.0),CadTool.LINE);val before=r.snapshot()
        val bad=(r as CadPersistencePort).restoreCheckpoint("AIG_CAD_CHECKPOINT_V1\nE|BROKEN")
        assertFalse(bad.accepted);assertEquals(MessageSeverity.WARNING,bad.state.message?.severity);assertEquals(before.revision,bad.state.revision);assertEquals(before.primitives,bad.state.primitives)
    }
}
