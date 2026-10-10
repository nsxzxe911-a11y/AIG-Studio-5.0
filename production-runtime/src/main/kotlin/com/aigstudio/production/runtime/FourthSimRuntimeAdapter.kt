package com.aigstudio.production.runtime

import com.aigstudio.runtime4.contract.*
import kotlin.math.max

class FourthSimRuntimeAdapter(
    private val motionProvider:()->MotionProgram?,
):SimRuntimePort {
    private var state=SimState()
    override fun snapshot():SimState=state
    override fun reset():SimState { state=SimState(); return state }
    override fun run():SimState {
        val program=motionProvider() ?: return localInfo("SIM_MOTION_NOT_AVAILABLE")
        return try {
            val result=simulate(program)
            state=SimState(
                ready=true,motionProgramId=program.id,motionRevision=program.revision,motionDigest=program.digest,
                removedCells=result.removedCells,minDepthMm=result.minDepthMm,removedVolumeMm3=result.removedVolumeMm3,
                nx=result.nx,ny=result.ny,depth=result.depth.toList(),message=null,
            ); state
        } catch(e:IllegalArgumentException) { localWarning(e.message ?: "SIM_MOTION_REJECTED",program) }
          catch(e:IllegalStateException) { localWarning(e.message ?: "SIM_STATE_REJECTED",program) }
          catch(e:Exception) {
            state=SimState(motionProgramId=program.id,motionRevision=program.revision,motionDigest=program.digest,
                message=RuntimeMessage(MessageSeverity.ALARM,e.message ?: "SIM_FAILED")); state
          }
    }
    private fun localInfo(text:String):SimState { state=SimState(message=RuntimeMessage(MessageSeverity.INFO,text)); return state }
    private fun localWarning(text:String,program:MotionProgram):SimState {
        state=SimState(motionProgramId=program.id,motionRevision=program.revision,motionDigest=program.digest,
            message=RuntimeMessage(MessageSeverity.WARNING,text)); return state
    }
    private fun simulate(program:MotionProgram):CleanSimResult {
        require(program.blocks.isNotEmpty()){ "SIM motion program is empty" }
        var x=0.0;var y=0.0;var z=0.0;var a=0.0;var b=0.0;var c=0.0
        var safeZ=5.0
        program.blocks.forEach{it.z?.let{v->if(v>0.0)safeZ=max(safeZ,v)}}
        val points=mutableListOf<CamPointSnapshot>()
        program.blocks.forEach { block ->
            x=block.x ?: x; y=block.y ?: y; z=block.z ?: z; a=block.a ?: a; b=block.b ?: b; c=block.c ?: c
            when(block.motion) {
                NcMotionKind.G0 -> points += CamPointSnapshot(x,y,max(z,safeZ),a,b,c,CamMotionKind.G0,manualOverride=true)
                NcMotionKind.G1 -> if(z<=0.0) points += CamPointSnapshot(x,y,z,a,b,c,CamMotionKind.G1,manualOverride=true)
                NcMotionKind.G2,NcMotionKind.G3 -> if(z<=0.0) points += CamPointSnapshot(
                    x,y,z,a,b,c,if(block.motion==NcMotionKind.G2)CamMotionKind.G2 else CamMotionKind.G3,
                    block.arcI,block.arcJ,manualOverride=true
                )
                else -> Unit
            }
        }
        require(points.any{it.motion!=CamMotionKind.G0}){ "SIM requires cutting motion" }
        if(points.isEmpty() || points.first().motion!=CamMotionKind.G0) {
            val first=points.first(); points.add(0,CamPointSnapshot(first.x,first.y,safeZ,first.a,first.b,first.c,CamMotionKind.G0,manualOverride=true))
        }
        if(points.size==1) points += points.first()
        val depth=points.filter{it.motion!=CamMotionKind.G0}.minOf{it.z}.coerceAtMost(-0.001)
        val strategy=CamStrategySnapshot(toolDiameterMm=10.0,depthMm=depth,safeZMm=safeZ,feedMmMin=150.0,revision=program.revision)
        val cam=CleanCamSession(); cam.restoreBaseline(strategy,points)
        return CleanSimSession(cam).run()
    }
}
