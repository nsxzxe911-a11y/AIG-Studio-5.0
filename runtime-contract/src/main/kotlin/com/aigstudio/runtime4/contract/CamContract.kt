package com.aigstudio.runtime4.contract

enum class CamMotionKind { G0, G1, G2, G3 }
enum class CamContourSide { OUTSIDE, INSIDE }
enum class CamContourDirection { CCW, CW }
enum class CamSourceKind { NONE, CAD_SNAPSHOT, AI_CAMERA, PHOTO }
enum class CamSourceLinkState { CONNECTED, DISCONNECTED }
enum class CamToolpathLinkState { CONNECTED, DISCONNECTED }
enum class CamZoneKind { FIXTURE, CLAMP, KEEP_OUT }

data class CamPointSnapshot(
    val x:Double,
    val y:Double,
    val z:Double,
    val a:Double,
    val b:Double,
    val c:Double,
    val motion:CamMotionKind,
    val arcI:Double?=null,
    val arcJ:Double?=null,
    val manualOverride:Boolean=false,
    val avoidance:Boolean=false,
)

data class CamSourcePoint(val xMm:Double,val yMm:Double)
data class CamContourSnapshot(val points:List<CamSourcePoint>)
data class CamZoneSnapshot(
    val id:String,
    val kind:CamZoneKind,
    val minX:Double,
    val minY:Double,
    val maxX:Double,
    val maxY:Double,
    val safeClearanceMm:Double,
)