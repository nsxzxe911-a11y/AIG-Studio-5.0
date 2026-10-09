package com.aigstudio.production.runtime

import com.aigstudio.runtime4.contract.*
import kotlin.math.hypot

class FourthCadRuntimeAdapter(
    private val session: CleanCadSession = CleanCadSession(),
) : CadRuntimePort {
    private var state: CadState = CadState.initial()
    private var gestureStart: CadPoint? = null

    override fun snapshot(): CadState = synced()

    override fun dispatch(command: CadCommand): CadDispatchResult = try {
        when (command) {
            is CadCommand.SelectTool -> {
                if (command.tool != CadTool.SELECT) session.clearSelection()
                state = synced().copy(activeTool = command.tool, message = null)
                accepted()
            }
            CadCommand.CycleSnap -> {
                val modes = CadSnapMode.entries
                val next = modes[(modes.indexOf(state.snapMode) + 1) % modes.size]
                state = synced().copy(snapMode = next, message = null)
                accepted()
            }
            is CadCommand.PointerDown -> {
                gestureStart = if (state.activeTool == CadTool.SELECT) command.point else snap(command.point, null)
                state = synced().copy(message = null)
                accepted()
            }
            is CadCommand.PointerUp -> finishGesture(command.point)
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
    )
}
