package com.aigstudio.production.runtime

import com.aigstudio.core.*
import com.aigstudio.runtime4.contract.*
import java.security.MessageDigest
import kotlin.math.abs
import kotlin.math.roundToInt

data class NcPostBridgeResult(val accepted:Boolean,val candidate:NcCandidate?=null,val message:String?=null)

object NcPostBridge {
    fun fromCam(active:CamToolpathVersion,strategy:CamStrategySnapshot,profile:NcMachineProfileSnapshot):NcPostBridgeResult {
        if(active.points.any{abs(it.c)>1e-9}) return NcPostBridgeResult(false,message="6AX C-axis CAM -> NC post is not verified; Working Copy preserved")
        return try {
            val session=CleanCamSession()
            session.restoreBaseline(strategy,active.points)
            val model=CamModel.fromCad(active.revision,DrawingSnapshot(emptyList()),session.coreSettings())
            val post=FanucPostSettings(
                workOffset="G54",tool=strategy.toolNumber,h=1,spindle=strategy.spindleRpm.roundToInt(),coolant=true,
                toolChangeSubprogram=4,endSubprogram=5,
            )
            val program=FanucNc.generate(model,post).replace("\r\n","\n").replace('\r','\n')
            val motion=NcMotionAdapter.parse(program,profile,active.revision).first
            val digest=sha256(program)
            NcPostBridgeResult(true,NcCandidate(
                id="NCC"+active.revision,revision=active.revision,digest=digest,program=program,
                sourceKind=NcCandidateSourceKind.CAM_POST,sourceRevision=active.revision,motionProgram=motion,
            ))
        } catch(e:Exception){
            NcPostBridgeResult(false,message=e.message ?: "CAM -> NC post failed")
        }
    }
    private fun sha256(text:String)=MessageDigest.getInstance("SHA-256").digest(text.toByteArray(Charsets.UTF_8)).joinToString(""){"%02x".format(it)}
}