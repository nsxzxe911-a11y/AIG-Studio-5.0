package com.aigstudio.runtime4.contract

import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFailsWith

class AxisContractRegression {
    @Test fun initialAxis3StateIsExactZero() {
        val state = AxisSceneState.initial(AxisMode.AXIS3)
        assertEquals(AxisMode.AXIS3, state.mode)
        assertEquals(AxisPoseSnapshot.ZERO, state.pose)
        assertEquals(-1, state.blockIndex)
        assertEquals(0, state.blockCount)
    }

    @Test fun axis3NormalizationSuppressesAllRotaryAxes() {
        val raw = AxisPoseSnapshot(1.25, -2.5, 3.75, 10.0, 20.0, 30.0)
        assertEquals(AxisPoseSnapshot(1.25, -2.5, 3.75, 0.0, 0.0, 0.0), raw.forMode(AxisMode.AXIS3))
    }

    @Test fun higherAxisModesSuppressOnlyUnsupportedRotaries() {
        val raw = AxisPoseSnapshot(1.0, 2.0, 3.0, 10.0, 20.0, 30.0)
        assertEquals(AxisPoseSnapshot(1.0, 2.0, 3.0, 10.0, 0.0, 0.0), raw.forMode(AxisMode.AXIS4))
        assertEquals(AxisPoseSnapshot(1.0, 2.0, 3.0, 10.0, 20.0, 0.0), raw.forMode(AxisMode.AXIS5))
        assertEquals(raw, raw.forMode(AxisMode.AXIS6))
    }

    @Test fun poseRejectsNonFiniteMachiningValues() {
        assertFailsWith<IllegalArgumentException> {
            AxisPoseSnapshot(Double.NaN, 0.0, 0.0, 0.0, 0.0, 0.0)
        }
    }
}