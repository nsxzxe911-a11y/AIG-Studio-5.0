import com.aigstudio.runtime4.contract.*
import com.aigstudio.core.NcMachineTravelLimits

fun main() {
    check(runCatching { NcAxisRangeSnapshot(5.0,-5.0) }.isFailure)
    val profile=NcMachineProfileSnapshot(
        id="fanuc-6ax", axisCount=6,
        x=NcAxisRangeSnapshot(-1000.0,1000.0),
        y=NcAxisRangeSnapshot(-1000.0,1000.0),
        z=NcAxisRangeSnapshot(-500.0,500.0),
        a=NcAxisRangeSnapshot(-360.0,360.0),
        b=NcAxisRangeSnapshot(-360.0,360.0),
        c=NcAxisRangeSnapshot(-180.0,180.0),
        customCodes=setOf("M42","M44","G34"),
        g34Profile="XY_J0_I_DIAMETER_K_COUNT",
        revision=3L,
        digest="profile-digest",
    )
    check(profile.axisCount==6 && profile.c!!.contains(35.0))
    val block=MotionBlockSnapshot(
        lineNumber=7,raw="G1 X1. Y2. Z-3. A10. B20. C35. F150.",
        x=1.0,y=2.0,z=-3.0,a=10.0,b=20.0,c=35.0,
        motion=NcMotionKind.G1,feed=150.0,spindle=2300.0,tool=9,
        mCodes=listOf("M8"),sourceWorkOffset="G54"
    )
    val motion=MotionProgram("MP1",9L,"motion-digest",listOf(block))
    check(motion.blocks.single().c==35.0)
    check(motion.blocks.single().motion==NcMotionKind.G1)
    val working=NcWorkingCopy("NC1",4L,"nc-digest","G90 G54\nG1 X1. C35. F150.",cursorOffset=22,frozen=false)
    val state=NcState.initial(profile).copy(working=working,motionProgram=motion)
    check(state.working.program.contains("C35"))
    check(state.motionProgram!!.blocks.single().c==35.0)
    check(state.camLink==NcCamLinkState.DISCONNECTED)
    val limits=NcMachineTravelLimits.verified(
        xMin=-1000.0,xMax=1000.0,yMin=-1000.0,yMax=1000.0,zMin=-500.0,zMax=500.0,
        aMin=-360.0,aMax=360.0,bMin=-360.0,bMax=360.0,cMin=-180.0,cMax=180.0
    )
    check(limits.rangeFor('C')!!.contains(35.0))
    check(!limits.rangeFor('C')!!.contains(181.0))
    println("FOURTH_NC_CONTRACT_PASS|AIG_CNC|XYZABC|MOTION_PROGRAM|MACHINE_PROFILE|C_TRAVEL")
}