package com.aigstudio.core

import kotlin.math.*

enum class ContourSide { OUTSIDE, INSIDE }
enum class ContourDirection { CCW, CW }
enum class CamPathMode { AUTO, MANUAL }

data class ManualCamPoint(
    val x:Double,
    val y:Double,
    val z:Double,
    val rapid:Boolean,
    val arcI:Double?=null,
    val arcJ:Double?=null,
    val clockwise:Boolean?=null,
    val axisA:Double=0.0,
    val axisB:Double=0.0,
    val axisC:Double=0.0
)

data class CamSettings(
    val toolDiameter: Double = 10.0,
    val depth: Double = -2.0,
    val safeZ: Double = 5.0,
    val feedMmMin: Double = 150.0,
    val climb: Boolean = true,
    val contourSide: ContourSide = ContourSide.OUTSIDE,
    val contourDirection: ContourDirection = if (climb) ContourDirection.CCW else ContourDirection.CW,
    val pathMode: CamPathMode = CamPathMode.AUTO,
    val manualPath: List<ManualCamPoint> = emptyList(),
    val leadInMm: Double = 2.0,
    val leadOutMm: Double = 2.0
) {
    init {
        require(toolDiameter > 0.0) { "Tool diameter must be positive" }
        require(depth < 0.0) { "Cut depth must be below Z0" }
        require(safeZ > 0.0) { "Safe-Z must be positive" }
        require(feedMmMin > 0.0) { "Feed must be positive" }
        require(leadInMm >= 0.0 && leadOutMm >= 0.0) { "Lead-in/out must be non-negative" }
        if(pathMode==CamPathMode.MANUAL) require(manualPath.size>=2) {
            "Manual CAM path requires at least two points"
        }
    }
}

enum class MultiAxisInterpolationMode { INDEXED, LINEAR_SYNC }

data class MultiAxisOrientationSchedule(
    val startA: Double,
    val startB: Double,
    val endA: Double,
    val endB: Double,
    val mode: MultiAxisInterpolationMode = MultiAxisInterpolationMode.LINEAR_SYNC,
    val startC: Double = 0.0,
    val endC: Double = 0.0
) {
    init {
        listOf(startA,startB,endA,endB,startC,endC).forEach {
            require(it.isFinite() && abs(it)<=360.0) { "Unsafe multi-axis schedule angle" }
        }
    }
    fun at(progress:Double):Pair<Double,Double> {
        val abc=atABC(progress)
        return abc.first to abc.second
    }
    fun atABC(progress:Double):Triple<Double,Double,Double> {
        val p=progress.coerceIn(0.0,1.0)
        return if(mode==MultiAxisInterpolationMode.INDEXED) Triple(endA,endB,endC)
        else Triple(
            startA+(endA-startA)*p,
            startB+(endB-startB)*p,
            startC+(endC-startC)*p
        )
    }
    fun isContinuous():Boolean =
        mode==MultiAxisInterpolationMode.LINEAR_SYNC &&
            (abs(endA-startA)>EPS || abs(endB-startB)>EPS || abs(endC-startC)>EPS)
}

/** CAM receives a read-only geometry snapshot. It never receives DrawingDocument itself. */
class CamModel private constructor(
    val sourceRevision: Long,
    val geometry: DrawingSnapshot,
    val settings: CamSettings,
    val toolpaths: List<Toolpath>
) {
    companion object {
        fun fromCad(
            revision: Long,
            snapshot: DrawingSnapshot,
            settings: CamSettings = CamSettings(),
            axisA: Double = 0.0,
            axisB: Double = 0.0,
            axisSchedule: MultiAxisOrientationSchedule? = null,
            axisC: Double = 0.0
        ): CamModel = CamModel(
            revision,
            snapshot,
            settings,
            if(settings.pathMode==CamPathMode.MANUAL)
                CamEngine.generateManual(settings,axisA,axisB,axisSchedule,axisC)
            else
                CamEngine.generate(snapshot, settings, axisA, axisB, axisSchedule,axisC)
        )
    }
}

data class Toolpath(val moves: List<Move>) {
    init { require(moves.isNotEmpty()) }
}

sealed interface Move {
    val to: Vec2
    val z: Double
    val rapid: Boolean
    val axisA: Double
    val axisB: Double
    val axisC: Double
}

data class Rapid(
    override val to: Vec2,
    override val z: Double = 5.0,
    override val axisA: Double = 0.0,
    override val axisB: Double = 0.0,
    override val axisC: Double = 0.0
) : Move {
    override val rapid: Boolean = true
}

data class Feed(
    override val to: Vec2,
    val feedMmMin: Double,
    override val z: Double = -2.0,
    override val axisA: Double = 0.0,
    override val axisB: Double = 0.0,
    override val axisC: Double = 0.0
) : Move {
    override val rapid: Boolean = false
}

data class ArcFeed(
    override val to: Vec2,
    val centerOffset: Vec2,
    val clockwise: Boolean,
    val feedMmMin: Double,
    override val z: Double = -2.0,
    override val axisA: Double = 0.0,
    override val axisB: Double = 0.0,
    override val axisC: Double = 0.0
) : Move {
    override val rapid: Boolean = false
}

object ManualCamPathEngine {
    const val POLICY="CAM_MANUAL_PATH_INDEPENDENT_FROM_CAD"

    fun startBlank(settings:CamSettings,x:Double=0.0,y:Double=0.0):CamSettings {
        val z=settings.safeZ
        return settings.copy(
            pathMode=CamPathMode.MANUAL,
            manualPath=listOf(
                ManualCamPoint(x,y,z,true),
                ManualCamPoint(x,y,z,true)
            )
        )
    }

    fun adoptAuto(cam:CamModel):CamSettings {
        val manual=cam.toolpaths.flatMap { path ->
            path.moves.map { move ->
                when(move) {
                    is Rapid -> ManualCamPoint(move.to.x,move.to.y,move.z,true,axisA=move.axisA,axisB=move.axisB,axisC=move.axisC)
                    is Feed -> ManualCamPoint(move.to.x,move.to.y,move.z,false,axisA=move.axisA,axisB=move.axisB,axisC=move.axisC)
                    is ArcFeed -> ManualCamPoint(
                        move.to.x,move.to.y,move.z,false,
                        move.centerOffset.x,move.centerOffset.y,move.clockwise,
                        move.axisA,move.axisB,move.axisC
                    )
                }
            }
        }
        require(manual.size>=2){"AUTO CAM path required before manual adoption"}
        return cam.settings.copy(pathMode=CamPathMode.MANUAL,manualPath=manual)
    }

    fun useAuto(settings:CamSettings):CamSettings =
        settings.copy(pathMode=CamPathMode.AUTO)

    fun useManual(settings:CamSettings):CamSettings {
        require(settings.manualPath.size>=2){"Manual CAM path requires at least two points"}
        return settings.copy(pathMode=CamPathMode.MANUAL)
    }

    fun replacePoint(
        settings:CamSettings,index:Int,x:Double,y:Double,z:Double,rapid:Boolean
    ):CamSettings {
        require(index in settings.manualPath.indices){"Manual CAM point index out of range"}
        require(x.isFinite() && y.isFinite() && z.isFinite()){"Manual CAM point must be finite"}
        if(rapid) require(z+EPS>=settings.safeZ){"Rapid point must be at or above Safe-Z"}
        else require(z<=EPS){"Cut/plunge point must be at or below Z0"}
        val list=settings.manualPath.toMutableList()
        val old=list[index]
        list[index]=old.copy(x=x,y=y,z=z,rapid=rapid,arcI=null,arcJ=null,clockwise=null)
        return settings.copy(pathMode=CamPathMode.MANUAL,manualPath=list)
    }

    fun insertPoint(settings:CamSettings,index:Int,point:ManualCamPoint):CamSettings {
        require(index in 0..settings.manualPath.size){"Manual CAM insert index out of range"}
        if(point.rapid) require(point.z+EPS>=settings.safeZ){"Rapid point must be at or above Safe-Z"}
        else require(point.z<=EPS){"Cut/plunge point must be at or below Z0"}
        val list=settings.manualPath.toMutableList()
        list.add(index,point)
        return settings.copy(pathMode=CamPathMode.MANUAL,manualPath=list)
    }

    fun deletePoint(settings:CamSettings,index:Int):CamSettings {
        require(index in settings.manualPath.indices){"Manual CAM point index out of range"}
        require(settings.manualPath.size>2){"Manual CAM path must keep at least two points"}
        val list=settings.manualPath.toMutableList()
        list.removeAt(index)
        return settings.copy(pathMode=CamPathMode.MANUAL,manualPath=list)
    }

    fun insertAvoidance(
        settings:CamSettings,
        afterIndex:Int,
        liftZ:Double,
        landingX:Double,
        landingY:Double,
        landingZ:Double
    ):CamSettings {
        require(afterIndex in settings.manualPath.indices){"Avoidance insertion point out of range"}
        require(liftZ.isFinite() && liftZ+EPS>=settings.safeZ){"Avoidance lift Z must be at or above Safe-Z"}
        require(landingX.isFinite() && landingY.isFinite() && landingZ.isFinite() && landingZ<=EPS) {
            "Avoidance landing point invalid"
        }
        val from=settings.manualPath[afterIndex]
        val list=settings.manualPath.toMutableList()
        val at=afterIndex+1
        list.add(at,ManualCamPoint(from.x,from.y,liftZ,true,axisA=from.axisA,axisB=from.axisB,axisC=from.axisC))
        list.add(at+1,ManualCamPoint(landingX,landingY,liftZ,true,axisA=from.axisA,axisB=from.axisB,axisC=from.axisC))
        list.add(at+2,ManualCamPoint(landingX,landingY,landingZ,false,axisA=from.axisA,axisB=from.axisB,axisC=from.axisC))
        return settings.copy(pathMode=CamPathMode.MANUAL,manualPath=list)
    }
}

object CamEngine {
    fun generateManual(
        settings:CamSettings,
        axisA:Double=0.0,
        axisB:Double=0.0,
        axisSchedule:MultiAxisOrientationSchedule?=null,
        axisC:Double=0.0
    ):List<Toolpath> {
        require(settings.pathMode==CamPathMode.MANUAL){"Manual CAM mode not active"}
        require(settings.manualPath.size>=2){"Manual CAM path requires at least two points"}
        val total=settings.manualPath.size.coerceAtLeast(1)
        val manualHasC=settings.manualPath.any{abs(it.axisC)>EPS}
        val moves=settings.manualPath.mapIndexed { index,p ->
            require(p.x.isFinite() && p.y.isFinite() && p.z.isFinite()){"Manual CAM point must be finite"}
            require(p.axisA.isFinite() && p.axisB.isFinite() && p.axisC.isFinite() &&
                abs(p.axisA)<=360.0 && abs(p.axisB)<=360.0 && abs(p.axisC)<=360.0) {
                "Manual CAM A/B/C out of range"
            }
            if(p.rapid) {
                require(p.z+EPS>=settings.safeZ){"Manual G0 below Safe-Z"}
                require(p.arcI==null && p.arcJ==null && p.clockwise==null){"Rapid point cannot carry arc metadata"}
            } else require(p.z<=EPS){"Manual cutting move above Z0"}
            val progress=if(total<=1)1.0 else index.toDouble()/(total-1).toDouble()
            val orientation=axisSchedule?.atABC(progress) ?: Triple(
                p.axisA,p.axisB,if(manualHasC)p.axisC else axisC
            )
            if(p.rapid) {
                Rapid(Vec2(p.x,p.y),p.z,orientation.first,orientation.second,orientation.third)
            } else if(p.arcI!=null || p.arcJ!=null || p.clockwise!=null) {
                require(p.arcI!=null && p.arcJ!=null && p.clockwise!=null){"Incomplete manual arc metadata"}
                ArcFeed(
                    Vec2(p.x,p.y),Vec2(p.arcI,p.arcJ),p.clockwise,
                    settings.feedMmMin,p.z,orientation.first,orientation.second,orientation.third
                )
            } else {
                Feed(Vec2(p.x,p.y),settings.feedMmMin,p.z,orientation.first,orientation.second,orientation.third)
            }
        }
        require(moves.first().rapid){"Manual CAM path must start with a Safe-Z rapid point"}
        return listOf(Toolpath(moves))
    }

    fun generate(
        snapshot: DrawingSnapshot,
        settings: CamSettings = CamSettings(),
        axisA: Double = 0.0,
        axisB: Double = 0.0,
        axisSchedule: MultiAxisOrientationSchedule? = null,
        axisC: Double = 0.0
    ): List<Toolpath> {
        require(axisA.isFinite() && axisB.isFinite() && axisC.isFinite() &&
            abs(axisA) <= 360.0 && abs(axisB) <= 360.0 && abs(axisC) <= 360.0) {
            "Unsafe CAM A/B/C orientation"
        }
        if (snapshot.entities.isEmpty()) return emptyList()
        val radiusComp = settings.toolDiameter / 2.0
        val radialSign = if (settings.contourSide == ContourSide.OUTSIDE) 1.0 else -1.0
        val lineNormalSign = if (settings.contourSide == ContourSide.OUTSIDE) -1.0 else 1.0
        val output = mutableListOf<Toolpath>()

        fun arcPath(center: Vec2, radius: Double, startAngle: Double, sweep: Double) {
            if (radius <= CNC_RESOLUTION_MM || abs(sweep) <= 1e-12) return
            val sourceCcw = sweep >= 0.0
            val wantCcw = settings.contourDirection == ContourDirection.CCW
            val directionSweep = if (sourceCcw == wantCcw) sweep else -sweep
            val actualStart = if (sourceCcw == wantCcw) startAngle else startAngle + sweep
            val start = Vec2(center.x + radius * cos(actualStart), center.y + radius * sin(actualStart))
            val leadStartAngle = actualStart
            val tangent = Vec2(-sin(leadStartAngle), cos(leadStartAngle)) * if (directionSweep >= 0.0) 1.0 else -1.0
            val leadIn = if (settings.leadInMm > 0.0) start - tangent * settings.leadInMm else start
            val moves = mutableListOf<Move>()
            moves += Rapid(leadIn, settings.safeZ)
            moves += Feed(leadIn, settings.feedMmMin, settings.depth)
            if (leadIn.distanceTo(start) >= CNC_RESOLUTION_MM) moves += Feed(start, settings.feedMmMin, settings.depth)

            val maxSweep = Math.PI
            val segments = max(1, ceil(abs(directionSweep) / maxSweep).toInt())
            var current = start
            for (i in 1..segments) {
                val a = actualStart + directionSweep * i / segments
                val next = Vec2(center.x + radius * cos(a), center.y + radius * sin(a))
                moves += ArcFeed(
                    to = next,
                    centerOffset = center - current,
                    clockwise = directionSweep < 0.0,
                    feedMmMin = settings.feedMmMin,
                    z = settings.depth
                )
                current = next
            }

            val endAngle = actualStart + directionSweep
            val end = Vec2(center.x + radius * cos(endAngle), center.y + radius * sin(endAngle))
            val endTangent = Vec2(-sin(endAngle), cos(endAngle)) * if (directionSweep >= 0.0) 1.0 else -1.0
            if (current.distanceTo(end) >= CNC_RESOLUTION_MM) {
                moves += ArcFeed(
                    to = end,
                    centerOffset = center - current,
                    clockwise = directionSweep < 0.0,
                    feedMmMin = settings.feedMmMin,
                    z = settings.depth
                )
            }
            val leadOut = if (settings.leadOutMm > 0.0) end + endTangent * settings.leadOutMm else end
            if (leadOut.distanceTo(end) >= CNC_RESOLUTION_MM) moves += Feed(leadOut, settings.feedMmMin, settings.depth)
            moves += Rapid(leadOut, settings.safeZ)
            output += Toolpath(moves)
        }

        fun pathFrom(points: List<Vec2>) {
            if (points.size < 2) return
            val ordered = if (settings.contourDirection == ContourDirection.CCW) points else points.reversed()
            val moves = mutableListOf<Move>()
            val first = ordered.first()
            val second = ordered.getOrElse(1) { first }
            val last = ordered.last()
            val beforeLast = ordered.getOrElse(ordered.lastIndex - 1) { last }
            fun offsetFrom(a: Vec2, b: Vec2, distance: Double): Vec2 {
                val dx = b.x - a.x
                val dy = b.y - a.y
                val len = hypot(dx, dy)
                if (len < CNC_RESOLUTION_MM || distance <= 0.0) return a
                return Vec2(a.x - dx / len * distance, a.y - dy / len * distance)
            }
            fun offsetPast(a: Vec2, b: Vec2, distance: Double): Vec2 {
                val dx = b.x - a.x
                val dy = b.y - a.y
                val len = hypot(dx, dy)
                if (len < CNC_RESOLUTION_MM || distance <= 0.0) return b
                return Vec2(b.x + dx / len * distance, b.y + dy / len * distance)
            }
            val leadIn = offsetFrom(first, second, settings.leadInMm)
            val leadOut = offsetPast(beforeLast, last, settings.leadOutMm)
            moves += Rapid(leadIn, settings.safeZ)
            moves += Feed(leadIn, settings.feedMmMin, settings.depth)
            if (leadIn.distanceTo(first) >= CNC_RESOLUTION_MM) moves += Feed(first, settings.feedMmMin, settings.depth)
            ordered.drop(1).forEach { moves += Feed(it, settings.feedMmMin, settings.depth) }
            if (leadOut.distanceTo(last) >= CNC_RESOLUTION_MM) moves += Feed(leadOut, settings.feedMmMin, settings.depth)
            moves += Rapid(leadOut, settings.safeZ)
            output += Toolpath(moves)
        }

        val rectGroups=snapshot.entities.filterIsInstance<Line>()
            .filter { it.id.startsWith("RECT:") }
            .groupBy { it.id.substringBeforeLast(':') }
        val processedRectRoots=mutableSetOf<String>()

        for (entity in snapshot.entities) {
            when (entity) {
                is Line -> {
                    val rectRoot=entity.id.takeIf { it.startsWith("RECT:") }?.substringBeforeLast(':')
                    if(rectRoot!=null) {
                        if(!processedRectRoots.add(rectRoot)) continue
                        val lines=rectGroups[rectRoot].orEmpty()
                        require(lines.size==4) { "RECT contour requires four edges" }
                        val pts=lines.flatMap { listOf(it.a,it.b) }
                        val minX=pts.minOf{it.x}; val maxX=pts.maxOf{it.x}
                        val minY=pts.minOf{it.y}; val maxY=pts.maxOf{it.y}
                        val comp=radiusComp*radialSign
                        val x0=minX-comp; val y0=minY-comp
                        val x1=maxX+comp; val y1=maxY+comp
                        require(x1-x0>=CNC_RESOLUTION_MM && y1-y0>=CNC_RESOLUTION_MM) {
                            "INSIDE contour collapses RECT after tool-radius compensation"
                        }
                        pathFrom(listOf(
                            Vec2(x0,y0),Vec2(x1,y0),Vec2(x1,y1),Vec2(x0,y1),Vec2(x0,y0)
                        ))
                    } else {
                        val d = entity.b - entity.a
                        val len = d.length()
                        if (len < CNC_RESOLUTION_MM) continue
                        val nx = -d.y / len * radiusComp * lineNormalSign
                        val ny = d.x / len * radiusComp * lineNormalSign
                        pathFrom(listOf(
                            Vec2(entity.a.x + nx, entity.a.y + ny),
                            Vec2(entity.b.x + nx, entity.b.y + ny)
                        ))
                    }
                }
                is Circle -> {
                    val r = entity.radius + radiusComp*radialSign
                    require(r>=CNC_RESOLUTION_MM) { "INSIDE contour collapses CIRCLE after tool-radius compensation" }
                    arcPath(entity.center, r, 0.0, 2.0 * Math.PI)
                }
                is Arc -> {
                    val r = entity.radius + radiusComp*radialSign
                    require(r>=CNC_RESOLUTION_MM) { "INSIDE contour collapses ARC after tool-radius compensation" }
                    val startA = atan2(entity.start.y - entity.center.y, entity.start.x - entity.center.x)
                    val endA = atan2(entity.end.y - entity.center.y, entity.end.x - entity.center.x)
                    var sweep = endA - startA
                    if (entity.clockwise) while (sweep >= 0.0) sweep -= 2.0 * Math.PI
                    else while (sweep <= 0.0) sweep += 2.0 * Math.PI
                    arcPath(entity.center, r, startA, sweep)
                }
            }
        }
        val totalMoves=output.sumOf { it.moves.size }.coerceAtLeast(1)
        var moveIndex=0
        return output.map { path ->
            Toolpath(path.moves.map { move ->
                val progress=if(totalMoves<=1) 1.0 else moveIndex.toDouble()/(totalMoves-1).toDouble()
                val orientation=axisSchedule?.atABC(progress) ?: Triple(axisA,axisB,axisC)
                moveIndex++
                when (move) {
                    is Rapid -> move.copy(axisA=orientation.first,axisB=orientation.second,axisC=orientation.third)
                    is Feed -> move.copy(axisA=orientation.first,axisB=orientation.second,axisC=orientation.third)
                    is ArcFeed -> move.copy(axisA=orientation.first,axisB=orientation.second,axisC=orientation.third)
                }
            })
        }
    }
}
