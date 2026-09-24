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
        fun fromSnapshot(snapshot: DrawingSnapshot, margin: Double = 10.0, thickness: Double = 20.0): Stock3D {
            val e = extents(snapshot)
            return Stock3D(e.minX - margin, e.minY - margin, e.maxX + margin, e.maxY + margin, thickness)
        }
    }
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

        for (path in toolpaths) {
            var previous: Move? = null
            for (move in path.moves) {
                val prev = previous
                if (!move.rapid && move.z < 0.0) {
                    if (move is ArcFeed && prev != null) {
                        val center = prev.to + move.centerOffset
                        val radius = prev.to.distanceTo(center)
                        if (radius < EPS) {
                            carve(field, move.to.x, move.to.y, toolRadius, move.z)
                        } else {
                            val a0 = atan2(prev.to.y - center.y, prev.to.x - center.x)
                            val a1 = atan2(move.to.y - center.y, move.to.x - center.x)
                            var sweep = a1 - a0
                            if (move.clockwise) while (sweep >= 0.0) sweep -= 2.0 * Math.PI
                            else while (sweep <= 0.0) sweep += 2.0 * Math.PI
                            val arcLength = abs(sweep) * radius
                            val steps = max(4, ceil(arcLength / max(toolRadius / 3.0, 0.25)).toInt())
                            for (i in 0..steps) {
                                val a = a0 + sweep * i / steps
                                carve(field, center.x + radius * cos(a), center.y + radius * sin(a), toolRadius, move.z)
                            }
                        }
                    } else if (prev == null || prev.to.distanceTo(move.to) < EPS) {
                        carve(field, move.to.x, move.to.y, toolRadius, move.z)
                    } else {
                        val distance = prev.to.distanceTo(move.to)
                        val stepMm = max(toolRadius / 3.0, 0.25)
                        val steps = max(1, ceil(distance / stepMm).toInt())
                        for (i in 0..steps) {
                            val t = i.toDouble() / steps
                            carve(
                                field,
                                prev.to.x + (move.to.x - prev.to.x) * t,
                                prev.to.y + (move.to.y - prev.to.y) * t,
                                toolRadius,
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

data class Machining3DResult(
    val cam: CamModel,
    val stock: Stock3D,
    val removal: RemovalField3D,
    val mesh: Mesh3D
)

object Machining3DEngine {
    fun build(
        snapshot: DrawingSnapshot,
        settings: CamSettings = CamSettings(),
        stock: Stock3D = Stock3D.fromSnapshot(snapshot)
    ): Machining3DResult {
        val cam = CamModel.fromCad(0L, snapshot, settings)
        require(cam.toolpaths.isNotEmpty()) { "CAM generated no toolpaths" }
        val removal = MaterialRemoval3D.simulate(cam.toolpaths, settings, stock)
        val mesh = SurfaceMesh3D.fromRemoval(removal)
        require(mesh.vertices.isNotEmpty() && mesh.triangles.isNotEmpty()) { "3D mesh generation failed" }
        return Machining3DResult(cam, stock, removal, mesh)
    }
}
