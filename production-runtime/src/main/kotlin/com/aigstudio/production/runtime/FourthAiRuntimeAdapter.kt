package com.aigstudio.production.runtime

import com.aigstudio.runtime4.contract.*

class FourthAiRuntimeAdapter(private val session:CleanAiSession=CleanAiSession()):AiRuntimePort {
    private var state=map(session.snapshot(),null)
    override fun snapshot():AiState=state
    override fun dispatch(command:AiCommand):AiDispatchResult = try {
        val next=when(command){
            AiCommand.OpenMain->session.openMain()
            is AiCommand.Stage->session.stage(command.program)
            AiCommand.Verify->session.verify()
            AiCommand.Promote->session.promote()
            AiCommand.RestoreWorkingToMain->session.restoreWorkingToMain()
            AiCommand.ClearLocalMessage->{ state=state.copy(message=null); return AiDispatchResult(true,state) }
        }
        val message=when {
            command is AiCommand.Verify && next.issueCount>0 -> RuntimeMessage(MessageSeverity.WARNING,next.summary)
            command is AiCommand.Verify -> RuntimeMessage(MessageSeverity.INFO,next.summary)
            else -> null
        }
        state=map(next,message); AiDispatchResult(true,state)
    } catch(e:IllegalArgumentException) { rejected(e.message ?: "AI input rejected") }
      catch(e:IllegalStateException) { rejected(e.message ?: "AI state rejected") }
      catch(e:Exception) { state=state.copy(message=RuntimeMessage(MessageSeverity.ALARM,e.message ?: "AI operation failed")); AiDispatchResult(false,state) }
    private fun rejected(text:String):AiDispatchResult { state=state.copy(message=RuntimeMessage(MessageSeverity.WARNING,text)); return AiDispatchResult(false,state) }
    private fun map(s:CleanAiSnapshot,message:RuntimeMessage?)=AiState(
        available=true,vaultState=s.state,summary=s.summary,immutableMainDigest=s.immutableMainDigest,workingDigest=s.workingDigest,
        verifiedDigest=s.verifiedDigest,hasChanges=s.hasChanges,verified=s.verified,issueCount=s.issueCount,
        currentMain=s.currentMain,workingProgram=s.workingProgram,message=message
    )
}
