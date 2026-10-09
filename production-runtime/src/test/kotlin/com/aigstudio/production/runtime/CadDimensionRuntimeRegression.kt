package com.aigstudio.production.runtime

import com.aigstudio.runtime4.contract.*
import kotlin.math.hypot
import kotlin.test.*

class CadDimensionRuntimeRegression {
    private fun tap(runtime:FourthCadRuntimeAdapter,a:CadPoint,b:CadPoint,tool:CadTool) {
        runtime.dispatch(CadCommand.SelectTool(tool)); runtime.dispatch(CadCommand.PointerDown(a))
        assertTrue(runtime.dispatch(CadCommand.PointerUp(b)).accepted)
    }
    private fun select(runtime:FourthCadRuntimeAdapter,p:CadPoint) {
        runtime.dispatch(CadCommand.SelectTool(CadTool.SELECT)); runtime.dispatch(CadCommand.PointerDown(p))
        assertTrue(runtime.dispatch(CadCommand.PointerUp(p)).accepted)
    }
    private fun segmentLength(s:CadState):Double = (s.primitives.single() as CadPrimitiveSnapshot.Segment).let{hypot(it.bx-it.ax,it.by-it.ay)}
    private fun radius(s:CadState):Double = when(val p=s.primitives.single()) {
        is CadPrimitiveSnapshot.Circle->p.radius; is CadPrimitiveSnapshot.Hole->p.radius
        else->error("expected circle/hole")
    }
    private fun bounds(s:CadState):DoubleArray {
        val pts=s.primitives.flatMap { p -> when(p) {
            is CadPrimitiveSnapshot.Segment->listOf(p.ax to p.ay,p.bx to p.by)
            is CadPrimitiveSnapshot.Rect->listOf(p.x1 to p.y1,p.x2 to p.y2)
            else->emptyList()
        }}
        return doubleArrayOf(pts.minOf{it.first},pts.minOf{it.second},pts.maxOf{it.first},pts.maxOf{it.second})
    }

    @Test fun lineDimensionDrivesGeometryAndUndoRedoRestoresMetadata() {
        val r=FourthCadRuntimeAdapter(); tap(r,CadPoint(0.0,0.0),CadPoint(20.0,0.0),CadTool.LINE); select(r,CadPoint(10.0,0.0))
        val driven=r.dispatch(CadCommand.ApplySelectedDimension(CadDimensionKind.LENGTH,25.0))
        assertTrue(driven.accepted); assertEquals(25.0,segmentLength(driven.state),1e-9)
        assertEquals(listOf(CadDimensionKind.LENGTH),driven.state.dimensions.map{it.targetKind})
        assertEquals(25.0,driven.state.dimensions.single().valueMm,1e-9)
        assertTrue(r.dispatch(CadCommand.Undo).accepted); assertEquals(20.0,segmentLength(r.snapshot()),1e-9); assertTrue(r.snapshot().dimensions.isEmpty())
        assertTrue(r.dispatch(CadCommand.Redo).accepted); assertEquals(25.0,segmentLength(r.snapshot()),1e-9); assertEquals(1,r.snapshot().dimensions.size)
    }

    @Test fun circleHoleAndRectDimensionsUseCoreGeometry() {
        val circle=FourthCadRuntimeAdapter(); tap(circle,CadPoint(0.0,0.0),CadPoint(10.0,0.0),CadTool.CIRCLE); select(circle,CadPoint(10.0,0.0))
        assertTrue(circle.dispatch(CadCommand.ApplySelectedDimension(CadDimensionKind.RADIUS,5.0)).accepted); assertEquals(5.0,radius(circle.snapshot()),1e-9)
        val hole=FourthCadRuntimeAdapter(); tap(hole,CadPoint(0.0,0.0),CadPoint(10.0,0.0),CadTool.HOLE); select(hole,CadPoint(10.0,0.0))
        assertTrue(hole.dispatch(CadCommand.ApplySelectedDimension(CadDimensionKind.DIAMETER,30.0)).accepted); assertEquals(15.0,radius(hole.snapshot()),1e-9)
        val rect=FourthCadRuntimeAdapter(); tap(rect,CadPoint(0.0,0.0),CadPoint(20.0,10.0),CadTool.RECT); select(rect,CadPoint(10.0,0.0))
        assertTrue(rect.dispatch(CadCommand.ApplySelectedDimension(CadDimensionKind.WIDTH,40.0)).accepted)
        var b=bounds(rect.snapshot()); assertEquals(40.0,b[2]-b[0],1e-9)
        assertTrue(rect.dispatch(CadCommand.ApplySelectedDimension(CadDimensionKind.HEIGHT,25.0)).accepted)
        b=bounds(rect.snapshot()); assertEquals(25.0,b[3]-b[1],1e-9)
    }

    @Test fun subResolutionDimensionIsLocalWarningAndCanBeRetried() {
        val r=FourthCadRuntimeAdapter(); tap(r,CadPoint(0.0,0.0),CadPoint(20.0,0.0),CadTool.LINE); select(r,CadPoint(10.0,0.0)); val rev=r.snapshot().revision
        val bad=r.dispatch(CadCommand.ApplySelectedDimension(CadDimensionKind.LENGTH,0.0005))
        assertFalse(bad.accepted); assertEquals(MessageSeverity.WARNING,bad.state.message?.severity); assertEquals(rev,bad.state.revision)
        assertTrue(r.dispatch(CadCommand.ApplySelectedDimension(CadDimensionKind.LENGTH,10.0)).accepted)
    }
}
