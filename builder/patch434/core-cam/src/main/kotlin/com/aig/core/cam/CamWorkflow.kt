package com.aig.core.cam

enum class CamSource { AUTO, MANUAL }
enum class Motion { G0, G1 }
enum class CutterComp { OFF, G41, G42 }
enum class CutSide { INNER, OUTER }
enum class CutDirection { CLIMB, CONVENTIONAL }

data class ManualCamPoint(
    val x: Double,
    val y: Double,
    val z: Double,
    val motion: Motion,
    val axisA: Double = 0.0,
    val axisB: Double = 0.0,
    val axisC: Double = 0.0
)

data class CamState(
    val source: CamSource = CamSource.MANUAL,
    val safeZ: Double = 3.0,
    val toolDiameter: Double = 10.0,
    val depth: Double = -5.0,
    val feed: Double = 500.0,
    val spindle: Double = 2000.0,
    val cutterComp: CutterComp = CutterComp.OFF,
    val cutSide: CutSide = CutSide.OUTER,
    val direction: CutDirection = CutDirection.CLIMB,
    val path: List<ManualCamPoint> = listOf(
        ManualCamPoint(0.0, 0.0, 3.0, Motion.G0),
        ManualCamPoint(0.0, 0.0, -1.0, Motion.G1)
    )
)

object CamWorkflow {
    const val AVOIDANCE_RULE = "lift to Safe-Z -> move XY -> landing XY at Safe-Z -> lower"

    fun setSafeZ(s: CamState, v: Double) = s.copy(safeZ = v)

    fun updatePoint(s: CamState, i: Int, p: ManualCamPoint): CamState {
        require(i in s.path.indices)
        val q = s.path.toMutableList()
        q[i] = p
        return s.copy(path = q)
    }

    fun appendPoint(s: CamState, p: ManualCamPoint) = s.copy(path = s.path + p)

    fun insertFixtureBypass(
        s: CamState,
        afterIndex: Int,
        safeX: Double,
        safeY: Double,
        landingX: Double,
        landingY: Double,
        landingZ: Double
    ): CamState {
        require(s.source == CamSource.MANUAL) { "Fixture bypass requires MANUAL" }
        require(afterIndex in s.path.indices)
        val from = s.path[afterIndex]
        fun keep(x: Double, y: Double, z: Double, motion: Motion) =
            ManualCamPoint(x, y, z, motion, from.axisA, from.axisB, from.axisC)

        val path = s.path.toMutableList()
        val i = afterIndex + 1
        path.add(i, keep(from.x, from.y, s.safeZ, Motion.G0))
        path.add(i + 1, keep(safeX, safeY, s.safeZ, Motion.G0))
        path.add(i + 2, keep(landingX, landingY, s.safeZ, Motion.G0))
        path.add(i + 3, keep(landingX, landingY, landingZ, Motion.G1))
        return s.copy(path = path)
    }
}
