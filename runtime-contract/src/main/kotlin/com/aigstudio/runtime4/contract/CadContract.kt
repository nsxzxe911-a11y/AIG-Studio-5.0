package com.aigstudio.runtime4.contract

enum class SceneId { HOME, CAD, CAM, SIM, MULTIFUNCTION, AXIS3, AXIS4, AXIS5, AXIS6, NC, AI }

enum class CadTool { LINE, RECT, CIRCLE, ARC, HOLE, SELECT }
enum class CadSnapMode { OFF, ENDPOINT, MIDPOINT, CENTER, INTERSECTION, TANGENT, HORIZONTAL, VERTICAL }
enum class CadLayer { WORKPIECE, DIMENSIONS, CENTERLINE, TOOLPATH, SIMULATION, ORIGIN }
enum class CadDimensionKind { LENGTH, RADIUS, DIAMETER, WIDTH, HEIGHT }
data class CadDimensionSnapshot(val id:String,val targetKind:CadDimensionKind,val valueMm:Double)
enum class MessageSeverity { INFO, WARNING, ALARM }

data class CadPoint(val x: Double, val y: Double)

sealed interface CadPrimitiveSnapshot {
    val selected: Boolean
    data class Segment(val ax:Double,val ay:Double,val bx:Double,val by:Double,override val selected:Boolean=false):CadPrimitiveSnapshot
    data class Rect(val x1:Double,val y1:Double,val x2:Double,val y2:Double,override val selected:Boolean=false):CadPrimitiveSnapshot
    data class Circle(val cx:Double,val cy:Double,val radius:Double,override val selected:Boolean=false):CadPrimitiveSnapshot
    data class Hole(val cx:Double,val cy:Double,val radius:Double,override val selected:Boolean=false):CadPrimitiveSnapshot
    data class Arc(val cx:Double,val cy:Double,val radius:Double,val startDeg:Double,val sweepDeg:Double,override val selected:Boolean=false):CadPrimitiveSnapshot
}

data class RuntimeMessage(val severity: MessageSeverity,val text: String)

data class CadState(
    val revision: Long,
    val activeTool: CadTool,
    val snapMode: CadSnapMode,
    val snapPreview: CadPoint? = null,
    val primitives: List<CadPrimitiveSnapshot>,
    val selectedCount: Int,
    val topologyCount: Int,
    val originX: Double = 0.0,
    val originY: Double = 0.0,
    val arcClockwise: Boolean = false,
    val arcStage: Int = 0,
    val activeLayer: CadLayer = CadLayer.WORKPIECE,
    val layerVisibility: Map<CadLayer,Boolean> = CadLayer.entries.associateWith { true },
    val dimensions: List<CadDimensionSnapshot> = emptyList(),
    val message: RuntimeMessage? = null,
) {
    companion object {
        fun initial(): CadState = CadState(
            revision=0L, activeTool=CadTool.LINE, snapMode=CadSnapMode.OFF,
            primitives=emptyList(), selectedCount=0, topologyCount=0,
        )
    }
}

sealed interface CadCommand {
    data class SelectTool(val tool: CadTool) : CadCommand
    data object CycleSnap : CadCommand
    data object ToggleArcDirection : CadCommand
    data class SetActiveLayer(val layer:CadLayer) : CadCommand
    data class ToggleLayerVisibility(val layer:CadLayer) : CadCommand
    data class AssignSelectionToLayer(val layer:CadLayer) : CadCommand
    data class ApplySelectedDimension(val kind:CadDimensionKind,val valueMm:Double) : CadCommand
    data class PointerDown(val point: CadPoint) : CadCommand
    data class PointerMove(val point: CadPoint) : CadCommand
    data class PointerUp(val point: CadPoint) : CadCommand
    data object Undo : CadCommand
    data object Redo : CadCommand
    data object Trim : CadCommand
    data object Extend : CadCommand
    data class Offset(val distanceMm: Double) : CadCommand
    data class Array(val count: Int, val dxMm: Double, val dyMm: Double) : CadCommand
    data class Chamfer(val distanceMm: Double) : CadCommand
    data class Fillet(val radiusMm: Double) : CadCommand
    data object ToggleTopology : CadCommand
    data object ClearMessage : CadCommand
}

data class CadDispatchResult(val accepted:Boolean,val state:CadState)
interface CadRuntimePort { fun snapshot():CadState; fun dispatch(command:CadCommand):CadDispatchResult }
interface CadPersistencePort { fun exportCheckpoint():String; fun restoreCheckpoint(raw:String):CadDispatchResult }
