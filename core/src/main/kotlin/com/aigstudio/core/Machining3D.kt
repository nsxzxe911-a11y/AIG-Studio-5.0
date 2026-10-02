package com.aigstudio.core

import kotlin.math.*

data class Vec3(val x: Double, val y: Double, val z: Double)
data class Triangle3D(val a: Int, val b: Int, val c: Int)
data class Mesh3D(val vertices: List<Vec3>, val triangles: List<Triangle3D>)

data class Stock3D(
    val minX: Double,
    val minY: Double,
    val maxX: Double,
    val maxY: Double,
    val thickness: Double = 20.0
) {
    init {
        require(maxX > minX && maxY > minY)
        require(thickness > 0.0)
    }

    companion object {
        fun fromSnapshot(
            snapshot: DrawingSnapshot,
            margin: Double = 10.0,
            thickness: Double = 20.0,
            manualPath:List<ManualCamPoint> = emptyList()
        ): Stock3D {
            val e = if(snapshot.entities.isNotEmpty()) {
                extents(snapshot)
            } else {
                require(manualPath.isNotEmpty()) { "No CAD geometry or manual CAM path for stock bounds" }
                val minX=manualPath.minOf{it.x}
                val maxX=manualPath.maxOf{it.x}
                val minY=manualPath.minOf{it.y}
                val maxY=manualPath.maxOf{it.y}
                val padX=if(maxX-minX<CNC_RESOLUTION_MM) max(1.0,margin) else 0.0
                val padY=if(maxY-minY<CNC_RESOLUTION_MM) max(1.0,margin) else 0.0
                Extents2D(minX-padX,minY-padY,maxX+padX,maxY+padY)
            }
            return Stock3D(e.minX - margin, e.minY - margin, e.maxX + margin, e.maxY + margin, thickness)
        }
    }
}

enum class FixtureKind { FIXTURE, CLAMP, VISE, MACHINE_ENVELOPE }

data class FixtureObstacle(
    val id:Long,
    val kind:FixtureKind,
    val minX:Double,
    val minY:Double,
    val minZ:Double,
    val maxX:Double,
    val maxY:Double,
    val maxZ:Double,
    val clearanceMm:Double=1.0,
    val enabled:Boolean=true
) {
    init {
        require(id>0L){"Fixture id must be positive"}
        require(listOf(minX,minY,minZ,maxX,maxY,maxZ,clearanceMm).all{it.isFinite()}){"Fixture bounds must be finite"}
        require(maxX-minX>=CNC_RESOLUTION_MM && maxY-minY>=CNC_RESOLUTION_MM && maxZ-minZ>=CNC_RESOLUTION_MM){"Fixture bounds are degenerate"}
        require(clearanceMm in 0.0..1000.0){"Fixture clearance out of range"}
    }
    fun label():String=kind.name+" #"+id
}

data class ToolAssemblyConfig(
    val holderDiameter:Double=32.0,
    val holderLength:Double=50.0,
    val stickout:Double=35.0
) {
    init {
        require(holderDiameter.isFinite() && holderDiameter in CNC_RESOLUTION_MM..1000.0){"Unsafe holder diameter"}
        require(holderLength.isFinite() && holderLength in CNC_RESOLUTION_MM..5000.0){"Unsafe holder length"}
        require(stickout.isFinite() && stickout in CNC_RESOLUTION_MM..5000.0){"Unsafe tool stickout"}
    }
}

data class MachiningRiskReport(
    val collisionCount:Int,
    val overcutCount:Int,
    val warnings:List<String>,
    val fixtureCoverageKnown:Boolean
) {
    val ok:Boolean get()=collisionCount==0 && overcutCount==0
    val preflightReady:Boolean get()=ok && fixtureCoverageKnown
    val fixtureCoverageWord:String get()=if(fixtureCoverageKnown)"MODELED" else "UNMODELED"
}

private data class Extents2D(val minX: Double, val minY: Double, val maxX: Double, val maxY: Double)

private fun extents(snapshot: DrawingSnapshot): Extents2D {
    require(snapshot.entities.isNotEmpty()) { "No CAD geometry" }
    val xs = mutableListOf<Double>()
    val ys = mutableListOf<Double>()
    snapshot.entities.forEach { e ->
        when (e) {
            is Line -> {
                xs += e.a.x; xs += e.b.x
                ys += e.a.y; ys += e.b.y
            }
            is Circle -> {
                xs += e.center.x - e.radius; xs += e.center.x + e.radius
                ys += e.center.y - e.radius; ys += e.center.y + e.radius
            }
            is Arc -> {
                xs += e.center.x - e.radius; xs += e.center.x + e.radius
                ys += e.center.y - e.radius; ys += e.center.y + e.radius
            }
        }
    }
    return Extents2D(xs.min(), ys.min(), xs.max(), ys.max())
}

class RemovalField3D(
    val stock: Stock3D,
    val nx: Int = 160,
    val ny: Int = 120
) {
    init { require(nx >= 8 && ny >= 8) }
    val depth = DoubleArray(nx * ny) { 0.0 }
    operator fun get(ix: Int, iy: Int): Double = depth[iy * nx + ix]
    operator fun set(ix: Int, iy: Int, value: Double) { depth[iy * nx + ix] = value }
}

object MaterialRemoval3D {
    fun simulate(toolpaths: List<Toolpath>, settings: CamSettings, stock: Stock3D): RemovalField3D {
        require(toolpaths.isNotEmpty()) { "No CAM toolpath" }
        val field = RemovalField3D(stock)
        val toolRadius = settings.toolDiameter / 2.0
        fun conservativeProjectedRadius(move:Move):Double {
            val tiltDeg=min(80.0,hypot(move.axisA,move.axisB))
            val factor=1.0/cos(Math.toRadians(tiltDeg)).coerceAtLeast(0.1736481777)
            return (toolRadius*factor).coerceAtMost(toolRadius*5.76)
        }

        for (path in toolpaths) {
            var previous: Move? = null
            for (move in path.moves) {
                val prev = previous
                if (!move.rapid && move.z < 0.0) {
                    if (move is ArcFeed && prev != null) {
                        val center = prev.to + move.centerOffset
                        val radius = prev.to.distanceTo(center)
                        if (radius < EPS) {
                            carve(field, move.to.x, move.to.y, conservativeProjectedRadius(move), move.z)
                        } else {
                            val a0 = atan2(prev.to.y - center.y, prev.to.x - center.x)
                            val a1 = atan2(move.to.y - center.y, move.to.x - center.x)
                            var sweep = a1 - a0
                            if (move.clockwise) while (sweep >= 0.0) sweep -= 2.0 * Math.PI
                            else while (sweep <= 0.0) sweep += 2.0 * Math.PI
                            val arcLength = abs(sweep) * radius
                            val effectiveRadius=conservativeProjectedRadius(move)
                            val steps = max(4, ceil(arcLength / max(effectiveRadius / 3.0, 0.25)).toInt())
                            for (i in 0..steps) {
                                val a = a0 + sweep * i / steps
                                carve(field, center.x + radius * cos(a), center.y + radius * sin(a), effectiveRadius, move.z)
                            }
                        }
                    } else if (prev == null || prev.to.distanceTo(move.to) < EPS) {
                        carve(field, move.to.x, move.to.y, conservativeProjectedRadius(move), move.z)
                    } else {
                        val distance = prev.to.distanceTo(move.to)
                        val effectiveRadius=conservativeProjectedRadius(move)
                        val stepMm = max(effectiveRadius / 3.0, 0.25)
                        val steps = max(1, ceil(distance / stepMm).toInt())
                        for (i in 0..steps) {
                            val t = i.toDouble() / steps
                            carve(
                                field,
                                prev.to.x + (move.to.x - prev.to.x) * t,
                                prev.to.y + (move.to.y - prev.to.y) * t,
                                effectiveRadius,
                                move.z
                            )
                        }
                    }
                }
                previous = move
            }
        }
        return field
    }

    private fun carve(field: RemovalField3D, x: Double, y: Double, radius: Double, z: Double) {
        val sx = (field.stock.maxX - field.stock.minX) / (field.nx - 1)
        val sy = (field.stock.maxY - field.stock.minY) / (field.ny - 1)
        val ix0 = max(0, floor((x - radius - field.stock.minX) / sx).toInt())
        val ix1 = min(field.nx - 1, ceil((x + radius - field.stock.minX) / sx).toInt())
        val iy0 = max(0, floor((y - radius - field.stock.minY) / sy).toInt())
        val iy1 = min(field.ny - 1, ceil((y + radius - field.stock.minY) / sy).toInt())
        for (iy in iy0..iy1) for (ix in ix0..ix1) {
            val wx = field.stock.minX + ix * sx
            val wy = field.stock.minY + iy * sy
            if (hypot(wx - x, wy - y) <= radius) {
                field[ix, iy] = min(field[ix, iy], z)
            }
        }
    }
}

object MachiningRiskScanner {
    private fun interpolatedMove(a:Move,b:Move,t:Double):Move =
        if(b.rapid) Rapid(
            Vec2(a.to.x+(b.to.x-a.to.x)*t,a.to.y+(b.to.y-a.to.y)*t),
            a.z+(b.z-a.z)*t,
            a.axisA+(b.axisA-a.axisA)*t,
            a.axisB+(b.axisB-a.axisB)*t,
            a.axisC+(b.axisC-a.axisC)*t
        ) else Feed(
            Vec2(a.to.x+(b.to.x-a.to.x)*t,a.to.y+(b.to.y-a.to.y)*t),
            1.0,
            a.z+(b.z-a.z)*t,
            a.axisA+(b.axisA-a.axisA)*t,
            a.axisB+(b.axisB-a.axisB)*t,
            a.axisC+(b.axisC-a.axisC)*t
        )

    private fun samples(a:Move,b:Move,stepMm:Double):List<Move> {
        if(b is ArcFeed) {
            val center=a.to+b.centerOffset
            val radius=a.to.distanceTo(center)
            if(radius>EPS) {
                val a0=atan2(a.to.y-center.y,a.to.x-center.x)
                val a1=atan2(b.to.y-center.y,b.to.x-center.x)
                var sweep=a1-a0
                if(b.clockwise){while(sweep>=0)sweep-=2*PI}else{while(sweep<=0)sweep+=2*PI}
                val n=max(1,ceil(abs(sweep)*radius/stepMm).toInt())
                return (1..n).map { i ->
                    val t=i.toDouble()/n
                    val angle=a0+sweep*t
                    Feed(
                        Vec2(center.x+radius*cos(angle),center.y+radius*sin(angle)),
                        b.feedMmMin,
                        a.z+(b.z-a.z)*t,
                        a.axisA+(b.axisA-a.axisA)*t,
                        a.axisB+(b.axisB-a.axisB)*t,
                        a.axisC+(b.axisC-a.axisC)*t
                    )
                }
            }
        }
        val len=hypot(hypot(b.to.x-a.to.x,b.to.y-a.to.y),b.z-a.z)
        val n=max(1,ceil(len/stepMm).toInt())
        return (1..n).map{interpolatedMove(a,b,it.toDouble()/n)}
    }

    private fun zOverlap(minA:Double,maxA:Double,minB:Double,maxB:Double)=
        maxA+EPS>=minB && maxB+EPS>=minA

    private fun machinePoint(move:Move):Vec3 =
        MachineKinematics3D.transform(
            Vec3(move.to.x,move.to.y,move.z),
            move.axisA,move.axisB,move.axisC
        )

    private fun collisionPart(
        move:Move,
        settings:CamSettings,
        assembly:ToolAssemblyConfig,
        fixture:FixtureObstacle
    ):String? {
        if(!fixture.enabled) return null
        val tilt=Math.toRadians(min(80.0,hypot(move.axisA,move.axisB)))
        val toolRadius=settings.toolDiameter/2.0
        val holderRadius=assembly.holderDiameter/2.0
        val shaftXY=toolRadius+assembly.stickout*sin(tilt)
        val holderXY=holderRadius+(assembly.stickout+assembly.holderLength)*sin(tilt)

        if(fixture.kind==FixtureKind.MACHINE_ENVELOPE) {
            val machine=machinePoint(move)
            val shaftTop=machine.z+assembly.stickout*cos(tilt)
            val holderTop=machine.z+(assembly.stickout+assembly.holderLength)*cos(tilt)
            val radius=max(shaftXY,holderXY)
            val outside=machine.x-radius<fixture.minX || machine.x+radius>fixture.maxX ||
                machine.y-radius<fixture.minY || machine.y+radius>fixture.maxY ||
                min(machine.z,holderTop)<fixture.minZ || max(machine.z,holderTop)>fixture.maxZ
            return if(outside)"MACHINE_ENVELOPE" else null
        }

        val shaftTop=move.z+assembly.stickout*cos(tilt)
        val holderTop=move.z+(assembly.stickout+assembly.holderLength)*cos(tilt)
        fun xy(radius:Double)=
            move.to.x>=fixture.minX-radius-fixture.clearanceMm &&
            move.to.x<=fixture.maxX+radius+fixture.clearanceMm &&
            move.to.y>=fixture.minY-radius-fixture.clearanceMm &&
            move.to.y<=fixture.maxY+radius+fixture.clearanceMm
        if(xy(shaftXY) && zOverlap(min(move.z,shaftTop),max(move.z,shaftTop),fixture.minZ,fixture.maxZ)) return "TOOL"
        if(xy(holderXY) && zOverlap(min(shaftTop,holderTop),max(shaftTop,holderTop),fixture.minZ,fixture.maxZ)) return "HOLDER"
        return null
    }

    private fun rotatingFixtureEnvelopeCollision(
        move:Move,
        fixture:FixtureObstacle,
        envelope:FixtureObstacle
    ):Boolean {
        if(!fixture.enabled || !envelope.enabled || fixture.kind==FixtureKind.MACHINE_ENVELOPE ||
            envelope.kind!=FixtureKind.MACHINE_ENVELOPE) return false
        val corners=listOf(
            Vec3(fixture.minX,fixture.minY,fixture.minZ),Vec3(fixture.maxX,fixture.minY,fixture.minZ),
            Vec3(fixture.minX,fixture.maxY,fixture.minZ),Vec3(fixture.maxX,fixture.maxY,fixture.minZ),
            Vec3(fixture.minX,fixture.minY,fixture.maxZ),Vec3(fixture.maxX,fixture.minY,fixture.maxZ),
            Vec3(fixture.minX,fixture.maxY,fixture.maxZ),Vec3(fixture.maxX,fixture.maxY,fixture.maxZ)
        ).map{MachineKinematics3D.transform(it,move.axisA,move.axisB,move.axisC)}
        val clearance=max(fixture.clearanceMm,envelope.clearanceMm)
        return corners.minOf{it.x}<envelope.minX+clearance ||
            corners.maxOf{it.x}>envelope.maxX-clearance ||
            corners.minOf{it.y}<envelope.minY+clearance ||
            corners.maxOf{it.y}>envelope.maxY-clearance ||
            corners.minOf{it.z}<envelope.minZ+clearance ||
            corners.maxOf{it.z}>envelope.maxZ-clearance
    }

    fun inspect(cam:CamModel,stock:Stock3D):MachiningRiskReport =
        inspect(cam,stock,emptyList(),ToolAssemblyConfig())

    fun inspect(
        cam:CamModel,
        stock:Stock3D,
        fixtures:List<FixtureObstacle>,
        toolAssembly:ToolAssemblyConfig=ToolAssemblyConfig()
    ):MachiningRiskReport {
        val warnings=mutableListOf<String>()
        val collisionKeys=linkedSetOf<String>()
        var overcuts=0
        val enabled=fixtures.filter{it.enabled}
        val coverage=enabled.any{it.kind!=FixtureKind.MACHINE_ENVELOPE}
        if(!coverage) warnings+="Fixture/clamp model not configured; real-world fixture collision coverage is UNMODELED"
        val moves=cam.toolpaths.flatMap{it.moves}
        moves.forEachIndexed { index,m ->
            if(m.rapid && m.z+EPS<cam.settings.safeZ){
                collisionKeys+="SAFE_Z:"+index
                warnings+="Rapid below Safe-Z at move "+index
            }
            if(!m.rapid && m.z < -stock.thickness-CNC_RESOLUTION_MM){
                overcuts++;warnings+="Cut below stock bottom at move "+index
            }
            if(!m.rapid && (m.to.x<stock.minX || m.to.x>stock.maxX || m.to.y<stock.minY || m.to.y>stock.maxY)){
                overcuts++;warnings+="Cut outside stock XY at move "+index
            }
        }
        if(moves.isNotEmpty() && enabled.isNotEmpty()){
            val step=max(0.25,min(cam.settings.toolDiameter/4.0,2.0))
            val envelopes=enabled.filter{it.kind==FixtureKind.MACHINE_ENVELOPE}
            val rotatingFixtures=enabled.filter{it.kind!=FixtureKind.MACHINE_ENVELOPE}
            fun inspectSample(segment:Int,m:Move){
                enabled.forEach { fixture ->
                    val part=collisionPart(m,cam.settings,toolAssembly,fixture)
                    if(part!=null){
                        val key="SEG"+segment+":F"+fixture.id+":"+part
                        if(collisionKeys.add(key)) warnings+=part+" collision with "+fixture.label()+" near segment "+segment
                    }
                }
                rotatingFixtures.forEach { fixture ->
                    envelopes.forEach { envelope ->
                        if(rotatingFixtureEnvelopeCollision(m,fixture,envelope)){
                            val key="SEG"+segment+":F"+fixture.id+":ENV"+envelope.id+":ROTARY_FIXTURE_ENVELOPE"
                            if(collisionKeys.add(key)) warnings+="ROTARY_FIXTURE_ENVELOPE collision: "+
                                fixture.label()+" exceeds "+envelope.label()+" after A/B/C posture near segment "+segment
                        }
                    }
                }
            }
            inspectSample(0,moves.first())
            moves.zipWithNext().forEachIndexed { index,(a,b) ->
                samples(a,b,step).forEach{inspectSample(index+1,it)}
            }
        }
        return MachiningRiskReport(collisionKeys.size,overcuts,warnings.distinct(),coverage)
    }
}

object SurfaceMesh3D {
    fun fromRemoval(field: RemovalField3D): Mesh3D {
        val vertices = mutableListOf<Vec3>()
        val triangles = mutableListOf<Triangle3D>()
        val sx = (field.stock.maxX - field.stock.minX) / (field.nx - 1)
        val sy = (field.stock.maxY - field.stock.minY) / (field.ny - 1)

        fun topIndex(ix: Int, iy: Int) = iy * field.nx + ix

        for (iy in 0 until field.ny) {
            for (ix in 0 until field.nx) {
                vertices += Vec3(
                    field.stock.minX + ix * sx,
                    field.stock.minY + iy * sy,
                    field[ix, iy]
                )
            }
        }

        for (iy in 0 until field.ny - 1) {
            for (ix in 0 until field.nx - 1) {
                val a = topIndex(ix, iy)
                val b = topIndex(ix + 1, iy)
                val c = topIndex(ix + 1, iy + 1)
                val d = topIndex(ix, iy + 1)
                triangles += Triangle3D(a, b, c)
                triangles += Triangle3D(a, c, d)
            }
        }

        val perimeter = mutableListOf<Pair<Int, Int>>()
        for (ix in 0 until field.nx) perimeter += ix to 0
        for (iy in 1 until field.ny) perimeter += (field.nx - 1) to iy
        for (ix in field.nx - 2 downTo 0) perimeter += ix to (field.ny - 1)
        for (iy in field.ny - 2 downTo 1) perimeter += 0 to iy

        val bottomStart = vertices.size
        perimeter.forEach { (ix, iy) ->
            vertices += Vec3(
                field.stock.minX + ix * sx,
                field.stock.minY + iy * sy,
                -field.stock.thickness
            )
        }

        for (i in perimeter.indices) {
            val j = (i + 1) % perimeter.size
            val (ixA, iyA) = perimeter[i]
            val (ixB, iyB) = perimeter[j]
            val topA = topIndex(ixA, iyA)
            val topB = topIndex(ixB, iyB)
            val bottomA = bottomStart + i
            val bottomB = bottomStart + j
            triangles += Triangle3D(topA, topB, bottomB)
            triangles += Triangle3D(topA, bottomB, bottomA)
        }

        val bottomCenter = vertices.size
        vertices += Vec3(
            (field.stock.minX + field.stock.maxX) / 2.0,
            (field.stock.minY + field.stock.maxY) / 2.0,
            -field.stock.thickness
        )
        for (i in perimeter.indices) {
            val j = (i + 1) % perimeter.size
            triangles += Triangle3D(bottomCenter, bottomStart + j, bottomStart + i)
        }

        return Mesh3D(vertices, triangles)
    }
}


enum class MachineComponentRole {
    BASE, COLUMN, TABLE, TRUNNION, ROTARY_A, ROTARY_B, ROTARY_C, FIXTURE, SPINDLE, HOLDER, TOOL
}

data class MachineComponent3D(
    val id:String,
    val role:MachineComponentRole,
    val mesh:Mesh3D,
    val moving:Boolean=false,
    val axisBinding:String=""
)

data class MachineModel3D(
    val mode:String,
    val components:List<MachineComponent3D>,
    val sourceRevision:Long
) {
    fun component(role:MachineComponentRole):MachineComponent3D?=components.firstOrNull{it.role==role}
    fun roles():Set<MachineComponentRole> = components.map{it.role}.toSet()
    fun triangleCount():Int = components.sumOf{it.mesh.triangles.size}
}

object MachineKinematics3D {
    fun transform(v:Vec3,axisA:Double,axisB:Double):Vec3 =
        transform(v,axisA,axisB,0.0)

    fun transform(v:Vec3,axisA:Double,axisB:Double,axisC:Double):Vec3 {
        require(axisA.isFinite() && axisB.isFinite() && axisC.isFinite()){"Non-finite machine axis"}
        val a=Math.toRadians(axisA)
        val b=Math.toRadians(axisB)
        val c=Math.toRadians(axisC)
        val y1=v.y*cos(a)-v.z*sin(a)
        val z1=v.y*sin(a)+v.z*cos(a)
        val x2=v.x*cos(b)+z1*sin(b)
        val z2=-v.x*sin(b)+z1*cos(b)
        val x3=x2*cos(c)-y1*sin(c)
        val y3=x2*sin(c)+y1*cos(c)
        return Vec3(x3,y3,z2)
    }

    fun transform(mesh:Mesh3D,axisA:Double,axisB:Double):Mesh3D =
        transform(mesh,axisA,axisB,0.0)

    fun transform(mesh:Mesh3D,axisA:Double,axisB:Double,axisC:Double):Mesh3D =
        if(abs(axisA)<=EPS && abs(axisB)<=EPS && abs(axisC)<=EPS) mesh
        else Mesh3D(mesh.vertices.map{transform(it,axisA,axisB,axisC)},mesh.triangles)
}

object MachineModel3DBuilder {
    private fun box(minX:Double,minY:Double,maxX:Double,maxY:Double,z0:Double,z1:Double):Mesh3D {
        val v=listOf(
            Vec3(minX,minY,z0),Vec3(maxX,minY,z0),Vec3(maxX,maxY,z0),Vec3(minX,maxY,z0),
            Vec3(minX,minY,z1),Vec3(maxX,minY,z1),Vec3(maxX,maxY,z1),Vec3(minX,maxY,z1)
        )
        val t=listOf(
            Triangle3D(0,1,2),Triangle3D(0,2,3),Triangle3D(4,6,5),Triangle3D(4,7,6),
            Triangle3D(0,4,5),Triangle3D(0,5,1),Triangle3D(1,5,6),Triangle3D(1,6,2),
            Triangle3D(2,6,7),Triangle3D(2,7,3),Triangle3D(3,7,4),Triangle3D(3,4,0)
        )
        return Mesh3D(v,t)
    }

    private fun cylinder(cx:Double,cy:Double,r:Double,z0:Double,z1:Double,n:Int=28):Mesh3D {
        val v=mutableListOf<Vec3>(); val t=mutableListOf<Triangle3D>()
        for(i in 0 until n){ val a=2*PI*i/n; v+=Vec3(cx+r*cos(a),cy+r*sin(a),z0) }
        for(i in 0 until n){ val a=2*PI*i/n; v+=Vec3(cx+r*cos(a),cy+r*sin(a),z1) }
        val bottom=v.size; v+=Vec3(cx,cy,z0)
        val top=v.size; v+=Vec3(cx,cy,z1)
        for(i in 0 until n){
            val j=(i+1)%n
            t+=Triangle3D(i,j,n+j); t+=Triangle3D(i,n+j,n+i)
            t+=Triangle3D(bottom,j,i); t+=Triangle3D(top,n+i,n+j)
        }
        return Mesh3D(v,t)
    }

    private fun inferMode(result:Machining3DResult):String {
        val moves=result.cam.toolpaths.flatMap{it.moves}
        return when {
            moves.any{abs(it.axisC)>EPS} -> "6AX"
            moves.any{abs(it.axisB)>EPS} -> "5AX"
            moves.any{abs(it.axisA)>EPS} -> "4AX"
            else -> "3AX"
        }
    }

    fun build(
        result:Machining3DResult,
        modeOverride:String?=null,
        axisAOverride:Double?=null,
        axisBOverride:Double?=null,
        toolPointOverride:Move?=null,
        axisCOverride:Double?=null
    ):MachineModel3D {
        val mode=(modeOverride ?: inferMode(result)).uppercase()
        require(mode in setOf("3AX","4AX","5AX","6AX")){"Unsupported machine model mode: $mode"}
        val stock=result.stock
        val cx=(stock.minX+stock.maxX)/2.0
        val cy=(stock.minY+stock.maxY)/2.0
        val span=max(stock.maxX-stock.minX,stock.maxY-stock.minY).coerceAtLeast(40.0)
        val floorZ=-stock.thickness
        val live=toolPointOverride ?: result.cam.toolpaths.lastOrNull()?.moves?.lastOrNull()
        val requestedA=axisAOverride ?: live?.axisA ?: 0.0
        val requestedB=axisBOverride ?: live?.axisB ?: 0.0
        val requestedC=axisCOverride ?: live?.axisC ?: 0.0
        val a=if(mode=="3AX")0.0 else requestedA
        val b=if(mode=="5AX" || mode=="6AX")requestedB else 0.0
        val c=if(mode=="6AX")requestedC else 0.0
        val out=mutableListOf<MachineComponent3D>()

        out+=MachineComponent3D("base",MachineComponentRole.BASE,
            box(cx-span*.82,cy-span*.68,cx+span*.82,cy+span*.68,floorZ-28.0,floorZ-20.0))
        out+=MachineComponent3D("column",MachineComponentRole.COLUMN,
            box(cx-span*.16,cy+span*.50,cx+span*.16,cy+span*.72,floorZ-20.0,span*.72))
        out+=MachineComponent3D("way_l",MachineComponentRole.BASE,
            box(cx-span*.58,cy-span*.43,cx-span*.42,cy+span*.38,floorZ-19.0,floorZ-13.0))
        out+=MachineComponent3D("way_r",MachineComponentRole.BASE,
            box(cx+span*.42,cy-span*.43,cx+span*.58,cy+span*.38,floorZ-19.0,floorZ-13.0))
        out+=MachineComponent3D("head_carriage",MachineComponentRole.COLUMN,
            box(cx-span*.24,cy+span*.34,cx+span*.24,cy+span*.54,span*.28,span*.48))

        val table=box(stock.minX-8.0,stock.minY-8.0,stock.maxX+8.0,stock.maxY+8.0,floorZ-10.0,floorZ-3.0)
        out+=MachineComponent3D("table",MachineComponentRole.TABLE,MachineKinematics3D.transform(table,a,b,c),mode!="3AX",
            when(mode){"6AX"->"A+B+C";"5AX"->"A+B";"4AX"->"A";else->""})
        val fixtureL=box(stock.minX-10.0,stock.minY-5.0,stock.minX-2.0,stock.maxY+5.0,floorZ-3.0,3.0)
        val fixtureR=box(stock.maxX+2.0,stock.minY-5.0,stock.maxX+10.0,stock.maxY+5.0,floorZ-3.0,3.0)
        out+=MachineComponent3D("fixture_l",MachineComponentRole.FIXTURE,MachineKinematics3D.transform(fixtureL,a,b,c),mode!="3AX")
        out+=MachineComponent3D("fixture_r",MachineComponentRole.FIXTURE,MachineKinematics3D.transform(fixtureR,a,b,c),mode!="3AX")
        result.fixtures.filter{it.enabled && it.kind!=FixtureKind.MACHINE_ENVELOPE}.forEach { fixture ->
            val mesh=box(fixture.minX,fixture.minY,fixture.maxX,fixture.maxY,fixture.minZ,fixture.maxZ)
            out+=MachineComponent3D(
                "user_fixture_"+fixture.id,
                MachineComponentRole.FIXTURE,
                MachineKinematics3D.transform(mesh,a,b,c),
                mode!="3AX",
                when(mode){"6AX"->"A+B+C";"5AX"->"A+B";"4AX"->"A";else->""}
            )
        }

        if(mode=="4AX" || mode=="5AX" || mode=="6AX"){
            out+=MachineComponent3D("trunnion_l",MachineComponentRole.TRUNNION,
                box(cx-span*.60,cy-span*.18,cx-span*.42,cy+span*.18,floorZ-20.0,floorZ+10.0))
            out+=MachineComponent3D("trunnion_r",MachineComponentRole.TRUNNION,
                box(cx+span*.42,cy-span*.18,cx+span*.60,cy+span*.18,floorZ-20.0,floorZ+10.0))
            out+=MachineComponent3D("trunnion_bridge",MachineComponentRole.TRUNNION,
                box(cx-span*.48,cy-span*.10,cx+span*.48,cy+span*.10,floorZ-16.0,floorZ-11.0))
            val rotaryA=cylinder(cx,cy,span*.40,floorZ-15.0,floorZ-8.0,32)
            out+=MachineComponent3D("rotary_a",MachineComponentRole.ROTARY_A,MachineKinematics3D.transform(rotaryA,a,0.0),true,"A")
        }
        if(mode=="5AX" || mode=="6AX"){
            val rotaryB=cylinder(cx,cy,span*.30,floorZ-8.0,floorZ-2.0,32)
            out+=MachineComponent3D("rotary_b",MachineComponentRole.ROTARY_B,MachineKinematics3D.transform(rotaryB,a,b,0.0),true,"B")
        }

        if(mode=="6AX"){
            val rotaryC=cylinder(cx,cy,span*.23,floorZ-2.0,floorZ+3.0,32)
            out+=MachineComponent3D("rotary_c",MachineComponentRole.ROTARY_C,MachineKinematics3D.transform(rotaryC,a,b,c),true,"C")
            val cMarker=box(cx+span*.12,cy-span*.025,cx+span*.24,cy+span*.025,floorZ+3.0,floorZ+5.5)
            out+=MachineComponent3D("rotary_c_marker",MachineComponentRole.ROTARY_C,MachineKinematics3D.transform(cMarker,a,b,c),true,"C")
        }

        val rawToolPoint=Vec3(
            live?.to?.x ?: cx,
            live?.to?.y ?: cy,
            live?.z ?: result.cam.settings.safeZ
        )
        val machineToolPoint=MachineKinematics3D.transform(rawToolPoint,a,b,c)
        val tx=machineToolPoint.x
        val ty=machineToolPoint.y
        val tz=machineToolPoint.z
        val toolRadius=max(.5,result.cam.settings.toolDiameter/2.0)
        val assembly=result.toolAssembly
        val holderRadius=max(toolRadius,assembly.holderDiameter/2.0)
        val stickout=assembly.stickout
        out+=MachineComponent3D("spindle",MachineComponentRole.SPINDLE,
            cylinder(tx,ty,max(holderRadius*1.25,8.0),tz+stickout+assembly.holderLength,tz+stickout+assembly.holderLength+38.0,32),true,"XYZ")
        out+=MachineComponent3D("holder",MachineComponentRole.HOLDER,
            cylinder(tx,ty,holderRadius,tz+stickout,tz+stickout+assembly.holderLength,28),true,"XYZ")
        out+=MachineComponent3D("tool",MachineComponentRole.TOOL,
            cylinder(tx,ty,toolRadius,tz,tz+stickout,24),true,"XYZ")
        return MachineModel3D(mode,out,result.cam.sourceRevision)
    }
}


data class Machining3DResult(
    val cam: CamModel,
    val stock: Stock3D,
    val removal: RemovalField3D,
    val mesh: Mesh3D,
    val fixtures:List<FixtureObstacle> = emptyList(),
    val toolAssembly:ToolAssemblyConfig = ToolAssemblyConfig()
)

data class ProgressiveMachining3DFrame(
    val index:Int,
    val total:Int,
    val progress:Double,
    val toolPoint:Move,
    val removal:RemovalField3D,
    val mesh:Mesh3D,
    val removedCells:Int
)

object ProgressiveMachining3D {
    fun frame(result:Machining3DResult,index:Int):ProgressiveMachining3DFrame {
        val flattened=result.cam.toolpaths.flatMap{it.moves}
        require(flattened.isNotEmpty()){"No CAM moves"}
        val i=index.coerceIn(0,flattened.lastIndex)
        var remaining=i+1
        val prefix=mutableListOf<Toolpath>()
        for(path in result.cam.toolpaths){
            if(remaining<=0) break
            val takeCount=min(remaining,path.moves.size)
            if(takeCount>0) prefix+=Toolpath(path.moves.take(takeCount))
            remaining-=takeCount
        }
        val removal=MaterialRemoval3D.simulate(prefix,result.cam.settings,result.stock)
        val mesh=SurfaceMesh3D.fromRemoval(removal)
        return ProgressiveMachining3DFrame(
            index=i,
            total=flattened.size,
            progress=if(flattened.size<=1)1.0 else i.toDouble()/flattened.lastIndex.toDouble(),
            toolPoint=flattened[i],
            removal=removal,
            mesh=mesh,
            removedCells=removal.depth.count{it<0.0}
        )
    }

    fun firstCuttingIndex(result:Machining3DResult):Int {
        val moves=result.cam.toolpaths.flatMap{it.moves}
        val index=moves.indexOfFirst{!it.rapid && it.z<0.0}
        return if(index<0)0 else index
    }

    fun progressiveIndex(result:Machining3DResult,fraction:Double):Int {
        val moves=result.cam.toolpaths.flatMap{it.moves}
        require(moves.isNotEmpty()){"No CAM moves"}
        return ((moves.lastIndex)*fraction.coerceIn(0.0,1.0)).roundToInt()
    }
}

object Machining3DEngine {
    fun build(
        snapshot: DrawingSnapshot,
        settings: CamSettings = CamSettings(),
        stock: Stock3D? = null,
        axisA: Double = 0.0,
        axisB: Double = 0.0,
        axisSchedule: MultiAxisOrientationSchedule? = null,
        fixtures:List<FixtureObstacle> = emptyList(),
        toolAssembly:ToolAssemblyConfig = ToolAssemblyConfig(),
        axisC:Double = 0.0
    ): Machining3DResult {
        val cam = CamModel.fromCad(0L, snapshot, settings, axisA, axisB, axisSchedule,axisC)
        require(cam.toolpaths.isNotEmpty()) { "CAM generated no toolpaths" }
        val resolvedStock=stock ?: Stock3D.fromSnapshot(
            snapshot,
            manualPath=if(settings.pathMode==CamPathMode.MANUAL)settings.manualPath else emptyList()
        )
        val removal = MaterialRemoval3D.simulate(cam.toolpaths, settings, resolvedStock)
        val mesh = SurfaceMesh3D.fromRemoval(removal)
        require(mesh.vertices.isNotEmpty() && mesh.triangles.isNotEmpty()) { "3D mesh generation failed" }
        return Machining3DResult(cam, resolvedStock, removal, mesh, fixtures.toList(), toolAssembly)
    }
}
