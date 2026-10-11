package com.aigstudio.production.runtime

import com.aigstudio.runtime4.contract.*

class FourthAxisRuntimeAdapter(
    private val ncRuntime: NcRuntimePort,
) : AxisRuntimePort {
    override fun snapshot(mode: AxisMode, blockIndex: Int): AxisSceneState {
        val ncState = ncRuntime.snapshot()
        val program = ncState.motionProgram
            ?: return AxisSceneState.initial(mode).copy(
                message = RuntimeMessage(MessageSeverity.INFO, "AXIS_MOTION_NOT_AVAILABLE")
            )
        if (program.blocks.isEmpty()) {
            return AxisSceneState.initial(mode).copy(
                motionProgramId = program.id,
                motionRevision = program.revision,
                message = RuntimeMessage(MessageSeverity.INFO, "AXIS_MOTION_EMPTY")
            )
        }
        val resolvedIndex = if (blockIndex < 0) program.blocks.lastIndex else blockIndex.coerceIn(0, program.blocks.lastIndex)
        return try {
            var pose = AxisPoseSnapshot.ZERO
            for (index in 0..resolvedIndex) {
                val block = program.blocks[index]
                pose = AxisPoseSnapshot(
                    x = block.x ?: pose.x,
                    y = block.y ?: pose.y,
                    z = block.z ?: pose.z,
                    a = block.a ?: pose.a,
                    b = block.b ?: pose.b,
                    c = block.c ?: pose.c,
                )
            }
            AxisSceneState(
                mode = mode,
                pose = pose.forMode(mode),
                motionProgramId = program.id,
                motionRevision = program.revision,
                blockIndex = resolvedIndex,
                blockCount = program.blocks.size,
                message = ncState.message,
            )
        } catch (e: IllegalArgumentException) {
            AxisSceneState.initial(mode).copy(
                motionProgramId = program.id,
                motionRevision = program.revision,
                blockIndex = resolvedIndex,
                blockCount = program.blocks.size,
                message = RuntimeMessage(MessageSeverity.WARNING, e.message ?: "AXIS_POSE_REJECTED"),
            )
        }
    }
}