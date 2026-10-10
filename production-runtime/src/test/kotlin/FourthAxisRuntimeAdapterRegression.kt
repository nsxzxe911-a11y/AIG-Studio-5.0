import com.aigstudio.production.runtime.FourthAxisRuntimeAdapter
import com.aigstudio.runtime4.contract.*
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertNotNull

private class AxisStubNcRuntime(private val state: NcState) : NcRuntimePort {
    override fun snapshot(): NcState = state
    override fun dispatch(command: NcCommand): NcDispatchResult = NcDispatchResult(false, state)
}

class FourthAxisRuntimeAdapterRegression {
    @Test fun emptyMotionProgramReturnsAxis3LocalNoMotionState() {
        val runtime = FourthAxisRuntimeAdapter(AxisStubNcRuntime(NcState.initial()))
        val state = runtime.snapshot(AxisMode.AXIS3)
        assertEquals(AxisMode.AXIS3, state.mode)
        assertEquals(AxisPoseSnapshot.ZERO, state.pose)
        assertEquals(-1, state.blockIndex)
        assertEquals(0, state.blockCount)
        assertNotNull(state.message)
    }

    @Test fun omittedCoordinatesCarryForwardWithoutChangingMotionTruth() {
        val motion = MotionProgram(
            id = "MP-7", revision = 7L, digest = "digest",
            blocks = listOf(
                MotionBlockSnapshot(1, "G0 X1 Y2 Z3 A10 B20 C30", x=1.0, y=2.0, z=3.0, a=10.0, b=20.0, c=30.0, motion=NcMotionKind.G0),
                MotionBlockSnapshot(2, "G1 X4 Z-1", x=4.0, z=-1.0, motion=NcMotionKind.G1),
            )
        )
        val nc = NcState.initial().copy(motionProgram = motion)
        val runtime = FourthAxisRuntimeAdapter(AxisStubNcRuntime(nc))
        val state = runtime.snapshot(AxisMode.AXIS6, 1)
        assertEquals(AxisPoseSnapshot(4.0, 2.0, -1.0, 10.0, 20.0, 30.0), state.pose)
        assertEquals("MP-7", state.motionProgramId)
        assertEquals(7L, state.motionRevision)
        assertEquals(1, state.blockIndex)
        assertEquals(2, state.blockCount)
        assertEquals(motion, nc.motionProgram)
    }

    @Test fun axis3SuppressesRotarySourceValuesAndMinusOneSelectsLastBlock() {
        val motion = MotionProgram(
            id="MP-3", revision=3L, digest="d3",
            blocks=listOf(MotionBlockSnapshot(1,"G1 X8 Y9 Z-2 A45 B30 C15",x=8.0,y=9.0,z=-2.0,a=45.0,b=30.0,c=15.0,motion=NcMotionKind.G1))
        )
        val runtime = FourthAxisRuntimeAdapter(AxisStubNcRuntime(NcState.initial().copy(motionProgram=motion)))
        val state = runtime.snapshot(AxisMode.AXIS3)
        assertEquals(AxisPoseSnapshot(8.0, 9.0, -2.0, 0.0, 0.0, 0.0), state.pose)
        assertEquals(0, state.blockIndex)
    }
}