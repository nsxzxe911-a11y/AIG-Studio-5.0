package com.aigstudio.runtime4.contract

enum class AxisMode { AXIS3, AXIS4, AXIS5, AXIS6 }

data class AxisPoseSnapshot(
    val x: Double,
    val y: Double,
    val z: Double,
    val a: Double,
    val b: Double,
    val c: Double,
) {
    init {
        require(listOf(x, y, z, a, b, c).all { it.isFinite() }) { "Axis pose values must be finite" }
    }

    fun forMode(mode: AxisMode): AxisPoseSnapshot = when (mode) {
        AxisMode.AXIS3 -> copy(a = 0.0, b = 0.0, c = 0.0)
        AxisMode.AXIS4 -> copy(b = 0.0, c = 0.0)
        AxisMode.AXIS5 -> copy(c = 0.0)
        AxisMode.AXIS6 -> this
    }

    companion object {
        val ZERO = AxisPoseSnapshot(0.0, 0.0, 0.0, 0.0, 0.0, 0.0)
    }
}

data class AxisSceneState(
    val mode: AxisMode,
    val pose: AxisPoseSnapshot,
    val motionProgramId: String? = null,
    val motionRevision: Long = 0L,
    val blockIndex: Int = -1,
    val blockCount: Int = 0,
    val message: RuntimeMessage? = null,
) {
    companion object {
        fun initial(mode: AxisMode) = AxisSceneState(mode = mode, pose = AxisPoseSnapshot.ZERO.forMode(mode))
    }
}

interface AxisRuntimePort {
    fun snapshot(mode: AxisMode, blockIndex: Int = -1): AxisSceneState
}