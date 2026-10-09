package com.aigstudio.production.runtime

import com.aigstudio.runtime4.contract.*
import kotlin.math.abs
import kotlin.math.atan2
import kotlin.math.hypot

class FourthCadRuntimeAdapter(
    private val session: CleanCadSession = CleanCadSession(),
) : CadRuntimePort {
    private var state: CadState = CadState.initial()
    private var gestureStart: CadPoint? = null
    private var arcCenter: CadPoint? = null
    private var arcStart: CadPoint? = null

    override fun snapshot(): CadState = synced()

    override fun dispatch(command: CadCommand): CadDispatchResult = try {
        when (command) {
            is CadCommand.SelectTool -> {
                if (command.tool != CadTool.SELECT) session.clearSelection()
                gestureStart = null
                arcCenter = null
                arcStart = null
                state = synced().copy(activeTool = command.tool, arcStage = 0, message = null)
                accepted()
            }
            CadCommand.CycleSnap -> {
                val modes = CadSnapMode.entries
                val next = modes[(modes.indexOf(state.snapMode) + 1) % modes.size]
                state = synced().copy(snapMode = next, message = null)
                accepted()
            }
            CadCommand.ToggleArcDirection -> {
                state = synced().copy(arcClockwise = !state.arcClockwise, message = null)
                accepted()
            }
            is CadCommand.SetActiveLayer -> {
                session.setActiveLayer(CleanCadLayer.valueOf(command.layer.name))
                state = synced().copy(message = null)
                accepted()
            }
            is CadCommand.ToggleLayerVisibility -> {
                session.toggleLayerVisibility(CleanCadLayer.valueOf(command.layer.name))
                state = synced().copy(message = null)
                accepted()
            }
            is CadCommand.AssignSelectionToLayer -> editMutation {
                session.assignSelectedLayer(CleanCadLayer.valueOf(command.layer.name))
            }
            is CadCommand.ApplySelectedDimension -> editMutation {
                session.applySelectedDimension(CleanCadDimensionKind.valueOf(command.kind.name),command.valueMm)
            }
            is CadCommand.PointerDown -> {
                if (state.activeTool != CadTool.ARC) {
                    gestureStart = if (state.activeTool == CadTool.SELECT) command.point else snap(command.point, null)
                }
                state = synced().copy(message = null)
                accepted()
            }
            is CadCommand.PointerUp -> if (state.activeTool == CadTool.ARC) finishArcTap(command.point) else finishGesture(command.point)
            CadCommand.Undo -> historyMutation(session.undo(), "Nothing to undo")
            CadCommand.Redo -> historyMutation(session.redo(), "Nothing to redo")
            CadCommand.Trim -> editMutation { session.trimSelected() }
            CadCommand.Extend -> editMutation { session.extendSelected() }
            is CadCommand.Offset -> editMutation { session.offsetSelected(command.distanceMm) }
            is CadCommand.Array -> editMutation { session.arraySelected(command.count, command.dxMm, command.dyMm) }
            is CadCommand.Chamfer -> editMutation { session.chamferSelected(command.distanceMm) }
            is CadCommand.Fillet -> editMutation { session.filletSelected(command.radiusMm) }
            CadCommand.ToggleTopology -> editMutation { session.toggleTopologySelected() }
            CadCommand.ClearMessage -> {
                state = synced().copy(message = null)
                accepted()
            }
        }
    } catch (e: IllegalArgumentException) {
        rejected(e.message ?: "CAD input rejected", MessageSeverity.WARNING)
    } catch (e: IllegalStateException) {
        rejected(e.message ?: "CAD state rejected", MessageSeverity.WARNING)
    } catch (e: Exception) {
        rejected(e.message ?: e::class.simpleName.orEmpty(), MessageSeverity.ALARM)
    }

    private fun finishArcTap(rawPoint: CadPoint): CadDispatchResult {
        val point = snap(rawPoint, arcCenter)
        return when (state.arcStage) {
            0 -> {
                arcCenter = point
                arcStart = null
                state = synced().copy(arcStage = 1, message = null)
                accepted()
            }
            1 -> {
                val center = arcCenter ?: error("ARC center missing")
                val radius = hypot(point.x - center.x, point.y - center.y)
                require(radius >= 0.001) { "ARC radius must be at least 0.001 mm" }
                arcStart = point
                state = synced().copy(arcStage = 2, message = null)
                accepted()
            }
            else -> {
                val center = arcCenter ?: error("ARC center missing")
                val start = arcStart ?: error("ARC start missing")
                val radius = hypot(start.x - center.x, start.y - center.y)
                val startDeg = Math.toDegrees(atan2(start.y - center.y, start.x - center.x))
                val endDeg = Math.toDegrees(atan2(point.y - center.y, point.x - center.x))
                var ccw = (endDeg - startDeg) % 360.0
                if (ccw < 0.0) ccw += 360.0
                require(abs(ccw) > 1e-9) { "ARC sweep must be non-zero" }
                val sweep = if (state.arcClockwise) ccw - 360.0 else ccw
                session.addArc(center.x, center.y, radius, startDeg, sweep)
                arcCenter = null
                arcStart = null
                state = synced().copy(revision = state.revision + 1L, arcStage = 0, message = null)
                accepted()
            }
        }
    }

    private fun finishGesture(rawEnd: CadPoint): CadDispatchResult {
        val start = gestureStart ?: return rejected("CAD gesture missing start", MessageSeverity.WARNING)
        gestureStart = null
        if (state.activeTool == CadTool.SELECT) {
            if (session.selectedCount() >= 2) session.clearSelection()
            val ok = session.selectNearest(rawEnd.x, rawEnd.y, session.selectedCount() > 0, 3.0)
            state = synced().copy(message = if (ok) null else RuntimeMessage(MessageSeverity.INFO, "SELECT MISS"))
            return CadDispatchResult(ok, state)
        }
        val end = snap(rawEnd, start)
        when (state.activeTool) {
            CadTool.LINE -> session.addLine(start.x, start.y, end.x, end.y)
            CadTool.RECT -> session.addRect(start.x, start.y, end.x, end.y)
            CadTool.CIRCLE -> session.addCircle(start.x, start.y, hypot(end.x - start.x, end.y - start.y))
            CadTool.HOLE -> session.addHole(start.x, start.y, hypot(end.x - start.x, end.y - start.y) * 2.0)
            CadTool.ARC -> error("ARC handled by three-tap state machine")
            CadTool.SELECT -> error("SELECT handled above")
        }
        state = synced().copy(revision = state.revision + 1L, message = null)
        return accepted()
    }

    private fun historyMutation(changed: Boolean, emptyMessage: String): CadDispatchResult {
        if (!changed) return rejected(emptyMessage, MessageSeverity.INFO)
        state = synced().copy(revision = state.revision + 1L, message = null)
        return accepted()
    }

    private inline fun editMutation(block: () -> Unit): CadDispatchResult {
        block()
        state = synced().copy(revision = state.revision + 1L, message = null)
        return accepted()
    }

    private fun snap(point: CadPoint, reference: CadPoint?): CadPoint {
        val mode = state.snapMode
        if (mode == CadSnapMode.OFF) return point
        if ((mode == CadSnapMode.HORIZONTAL || mode == CadSnapMode.VERTICAL) && reference == null) return point
        val cleanMode = CleanCadSnapMode.valueOf(mode.name)
        val snapped = session.snapPoint(point.x, point.y, 3.0, cleanMode, reference?.x, reference?.y) ?: return point
        return CadPoint(snapped.x, snapped.y)
    }

    private fun accepted(): CadDispatchResult = CadDispatchResult(true, synced())

    private fun rejected(text: String, severity: MessageSeverity): CadDispatchResult {
        state = synced().copy(message = RuntimeMessage(severity, text))
        return CadDispatchResult(false, state)
    }

    private fun synced(): CadState = state.copy(
        primitives = session.primitives().map { p ->
            when (p) {
                is CleanCadPrimitive.Segment -> CadPrimitiveSnapshot.Segment(p.ax,p.ay,p.bx,p.by,p.selected)
                is CleanCadPrimitive.CircleShape -> CadPrimitiveSnapshot.Circle(p.cx,p.cy,p.radius,p.selected)
                is CleanCadPrimitive.HoleShape -> CadPrimitiveSnapshot.Hole(p.cx,p.cy,p.radius,p.selected)
                is CleanCadPrimitive.ArcShape -> CadPrimitiveSnapshot.Arc(p.cx,p.cy,p.radius,p.startDeg,p.sweepDeg,p.selected)
            }
        },
        selectedCount = session.selectedCount(),
        topologyCount = session.topologyCount(),
        activeLayer = CadLayer.valueOf(session.activeLayer().name),
        layerVisibility = CadLayer.entries.associateWith { layer ->
            session.isLayerVisible(CleanCadLayer.valueOf(layer.name))
        },
        dimensions = session.dimensions().map { d ->
            CadDimensionSnapshot(d.id,CadDimensionKind.valueOf(d.kind.name),d.valueMm)
        },
    )
}
