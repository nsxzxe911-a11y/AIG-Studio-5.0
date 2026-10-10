package com.aigstudio.production.runtime

import com.aigstudio.runtime4.contract.*
import kotlin.math.max

class FourthSimRuntimeAdapter(private val motionProvider:()->MotionProgram?):SimRuntimePort {
    private var stepIndex=-1
    private var displayMode="MATERIAL"
    private var state=SimState(displayMode=displayMode)
    override fun snapshot():SimState=state
    override fun reset():SimState { stepIndex=-1; state=SimState(displayMode=displayMode); return state }
    override fun toggleDisplay():SimState { displayMode=if(displayMode=="MATERIAL")"PATH" else "MATERIAL"; state=state.copy(displayMode=displayMode); return state }
    override fun run():SimState {
        val p=motionProvider() ?: return localInfo("SIM_MOTION_NOT_AVAILABLE")
        stepIndex=p.blocks.lastIndex
        return execute(p,stepIndex)
    }
    override fun step():SimState {
        val p=motionProvider() ?: return localInfo("SIM_MOTION_NOT_AVAILABLE")
        if(p.blocks.isEmpty())return localInfo("SIM_MOTION_EMPTY")
        stepIndex=(stepIndex+1).coerceIn(0,p.blocks.lastIndex)
        return execute(p,stepIndex)
    }
    private fun execute(program:MotionProgram,endIndex:Int):SimState = try {
        val prefix=program.copy(blocks=program.blocks.take(endIndex+1))
        val result=simulate(prefix)
        state=SimState(true,program.id,program.revision,program.digest,endIndex,program.blocks.size,displayMode,
            result.removedCells,result.minDepthMm,result.removedVolumeMm3,result.nx,result.ny,result.depth.toList(),null);state
    } catch(e:IllegalArgumentException) {
        val noCut=e.message=="SIM requires cutting motion"
        state=SimState(false,program.id,program.revision,program.digest,endIndex,program.blocks.size,displayMode,
            message=RuntimeMessage(if(noCut)MessageSeverity.INFO else MessageSeverity.WARNING,if(noCut)"SIM_STEP_NO_CUT_YET" else (e.message?:"SIM_MOTION_REJECTED")));state
    } catch(e:IllegalStateException){localWarning(e.message?:"SIM_STATE_REJECTED",program,endIndex)}
      catch(e:Exception){state=SimState(false,program.id,program.revision,program.digest,endIndex,program.blocks.size,displayMode,message=RuntimeMessage(MessageSeverity.ALARM,e.message?:"SIM_FAILED"));state}
    private fun localInfo(text:String):SimState{state=SimState(displayMode=displayMode,message=RuntimeMessage(MessageSeverity.INFO,text));return state}
    private fun localWarning(text:String,p:MotionProgram,index:Int):SimState{state=SimState(false,p.id,p.revision,p.digest,index,p.blocks.size,displayMode,message=RuntimeMessage(MessageSeverity.WARNING,text));return state}
    private fun simulate(program:MotionProgram):CleanSimResult {
        require(program.blocks.isNotEmpty()){ "SIM motion program is empty" }
        var x=0.0;var y=0.0;var z=0.0;var a=0.0;var b=0.0;var c=0.0;var safeZ=5.0
        program.blocks.forEach{it.z?.let{v->if(v>0.0)safeZ=max(safeZ,v)}}
        val points=mutableListOf<CamPointSnapshot>()
        program.blocks.forEach { block ->
            x=block.x?:x;y=block.y?:y;z=block.z?:z;a=block.a?:a;b=block.b?:b;c=block.c?:c
            when(block.motion){
                NcMotionKind.G0->points+=CamPointSnapshot(x,y,max(z,safeZ),a,b,c,CamMotionKind.G0,manualOverride=true)
                NcMotionKind.G1->if(z<=0.0)points+=CamPointSnapshot(x,y,z,a,b,c,CamMotionKind.G1,manualOverride=true)
                NcMotionKind.G2,NcMotionKind.G3->if(z<=0.0)points+=CamPointSnapshot(x,y,z,a,b,c,if(block.motion==NcMotionKind.G2)CamMotionKind.G2 else CamMotionKind.G3,block.arcI,block.arcJ,manualOverride=true)
                else->Unit
            }
        }
        require(points.any{it.motion!=CamMotionKind.G0}){"SIM requires cutting motion"}
        if(points.first().motion!=CamMotionKind.G0){val q=points.first();points.add(0,CamPointSnapshot(q.x,q.y,safeZ,q.a,q.b,q.c,CamMotionKind.G0,manualOverride=true))}
        val depth=points.filter{it.motion!=CamMotionKind.G0}.minOf{it.z}.coerceAtMost(-0.001)
        val cam=CleanCamSession();cam.restoreBaseline(CamStrategySnapshot(toolDiameterMm=10.0,depthMm=depth,safeZMm=safeZ,feedMmMin=150.0,revision=program.revision),points)
        return CleanSimSession(cam).run()
    }
}
