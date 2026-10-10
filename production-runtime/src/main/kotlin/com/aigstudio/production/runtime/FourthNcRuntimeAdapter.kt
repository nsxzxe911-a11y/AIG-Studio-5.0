package com.aigstudio.production.runtime

import com.aigstudio.runtime4.contract.*
import java.security.MessageDigest

class FourthNcRuntimeAdapter(
    profile:NcMachineProfileSnapshot=NcMachineProfileSnapshot.defaultFanuc3Ax(),
):NcRuntimePort {
    private var workingRevision=0L
    private var motionRevision=0L
    private var saveRevision=0L
    private var state:NcState

    init {
        val initial=CleanNcSession.DEFAULT_PROGRAM
        workingRevision=1L
        motionRevision=1L
        val working=NcWorkingCopy("NC1",workingRevision,programDigest(initial),initial,initial.length,false)
        val parsed=NcMotionAdapter.parse(initial,profile,motionRevision)
        state=NcState.initial(profile).copy(working=working,motionProgram=parsed.first,diagnostics=parsed.second,message=messageFor(parsed.second))
    }

    override fun snapshot():NcState=state

    override fun dispatch(command:NcCommand):NcDispatchResult = try {
        when(command){
            is NcCommand.SetProgram->replaceProgram(command.text,normalize(command.text).length)
            is NcCommand.InsertText->insertText(command.text)
            NcCommand.Backspace->backspace()
            NcCommand.DeleteForward->deleteForward()
            is NcCommand.SetCursor->setCursor(command.offset)
            NcCommand.NewBlock->insertText("\n")
            NcCommand.ToggleBlockSkip->toggleBlockSkip()
            NcCommand.Validate->reparseCurrent()
            NcCommand.ConnectCam->{state=state.copy(camLink=NcCamLinkState.CONNECTED,message=null);accepted()}
            NcCommand.DisconnectCam->{state=state.copy(camLink=NcCamLinkState.DISCONNECTED,message=null);accepted()}
            is NcCommand.ReceiveCandidate->receiveCandidate(command.candidate)
            NcCommand.PreviewCandidate->previewCandidate()
            NcCommand.KeepWorkingCopy->{state=state.copy(previewCandidateId=null,message=null);accepted()}
            NcCommand.AdoptCandidate->adoptCandidate()
            NcCommand.SaveCandidateAsNewVersion->saveCandidate()
            NcCommand.FreezeActive->{state=state.copy(working=state.working.copy(frozen=true),message=null);accepted()}
            NcCommand.UnfreezeActive->{state=state.copy(working=state.working.copy(frozen=false),message=null);accepted()}
            is NcCommand.SelectMachineProfile->{state=state.copy(machineProfile=command.profile);reparseCurrent()}
            NcCommand.ClearLocalMessage->{state=state.copy(message=null);accepted()}
        }
    } catch(e:IllegalArgumentException){rejected(e.message?:"NC input rejected")}
      catch(e:IllegalStateException){rejected(e.message?:"NC state rejected")}
      catch(e:Exception){
        state=state.copy(message=RuntimeMessage(MessageSeverity.ALARM,e.message?:"NC operation failed"));NcDispatchResult(false,state)
      }

    private fun replaceProgram(raw:String,cursor:Int):NcDispatchResult{
        if(state.working.frozen)return rejected("NC Working Copy is frozen")
        val text=normalize(raw);require(text.toByteArray(Charsets.UTF_8).size<=MAX_PROGRAM_BYTES){"NC program is too large"}
        require(cursor in 0..text.length){"NC cursor out of range"}
        workingRevision++;motionRevision++
        val working=NcWorkingCopy("NC"+workingRevision,workingRevision,programDigest(text),text,cursor,false)
        val parsed=NcMotionAdapter.parse(text,state.machineProfile,motionRevision)
        state=state.copy(working=working,motionProgram=parsed.first,diagnostics=parsed.second,message=messageFor(parsed.second))
        return accepted()
    }

    private fun insertText(text:String):NcDispatchResult{
        if(state.working.frozen)return rejected("NC Working Copy is frozen")
        val w=state.working;require(w.cursorOffset in 0..w.program.length){"NC cursor out of range"}
        val normalized=normalize(text)
        val next=w.program.substring(0,w.cursorOffset)+normalized+w.program.substring(w.cursorOffset)
        return replaceProgram(next,w.cursorOffset+normalized.length)
    }
    private fun backspace():NcDispatchResult{
        if(state.working.frozen)return rejected("NC Working Copy is frozen")
        val w=state.working;if(w.cursorOffset==0)return accepted()
        require(w.cursorOffset in 0..w.program.length){"NC cursor out of range"}
        return replaceProgram(w.program.removeRange(w.cursorOffset-1,w.cursorOffset),w.cursorOffset-1)
    }
    private fun deleteForward():NcDispatchResult{
        if(state.working.frozen)return rejected("NC Working Copy is frozen")
        val w=state.working;require(w.cursorOffset in 0..w.program.length){"NC cursor out of range"}
        if(w.cursorOffset==w.program.length)return accepted()
        return replaceProgram(w.program.removeRange(w.cursorOffset,w.cursorOffset+1),w.cursorOffset)
    }
    private fun setCursor(offset:Int):NcDispatchResult{
        require(offset in 0..state.working.program.length){"NC cursor out of range"}
        state=state.copy(working=state.working.copy(cursorOffset=offset),message=null);return accepted()
    }
    private fun toggleBlockSkip():NcDispatchResult{
        if(state.working.frozen)return rejected("NC Working Copy is frozen")
        val w=state.working;val start=w.program.lastIndexOf('\n',w.cursorOffset.coerceAtMost(w.program.length)-1).let{if(it<0)0 else it+1}
        val had=start<w.program.length && w.program[start]=='/'
        val next=if(had) w.program.removeRange(start,start+1) else w.program.substring(0,start)+"/"+w.program.substring(start)
        val cursor=(w.cursorOffset+(if(had)-1 else 1)).coerceIn(0,next.length)
        return replaceProgram(next,cursor)
    }
    private fun reparseCurrent():NcDispatchResult{
        motionRevision++
        val parsed=NcMotionAdapter.parse(state.working.program,state.machineProfile,motionRevision)
        state=state.copy(motionProgram=parsed.first,diagnostics=parsed.second,message=messageFor(parsed.second));return accepted()
    }
    private fun receiveCandidate(candidate:NcCandidate):NcDispatchResult{
        require(programDigest(candidate.program)==candidate.digest){"NC candidate digest mismatch"}
        state=state.copy(candidate=candidate,previewCandidateId=null,message=null)
        return accepted()
    }
    private fun previewCandidate():NcDispatchResult{
        val candidate=state.candidate ?: return rejected("No NC candidate to preview")
        state=state.copy(previewCandidateId=candidate.id,message=null);return accepted()
    }
    private fun adoptCandidate():NcDispatchResult{
        if(state.working.frozen)return rejected("NC Working Copy is frozen")
        val candidate=state.candidate ?: return rejected("No NC candidate to adopt")
        workingRevision++;motionRevision++
        val text=normalize(candidate.program)
        val parsed=NcMotionAdapter.parse(text,state.machineProfile,motionRevision)
        state=state.copy(
            working=NcWorkingCopy("NC"+workingRevision,workingRevision,candidate.digest,text,text.length,false),
            candidate=null,previewCandidateId=null,motionProgram=parsed.first,diagnostics=parsed.second,message=messageFor(parsed.second)
        )
        return accepted()
    }
    private fun saveCandidate():NcDispatchResult{
        val candidate=state.candidate ?: return rejected("No NC candidate to save")
        saveRevision++
        val record=NcSaveRecord(saveRevision,"CANDIDATE",candidate.id,candidate.digest,"Candidate "+candidate.id+" saved")
        state=state.copy(savedCandidates=state.savedCandidates+candidate,saveHistory=state.saveHistory+record,message=null)
        return accepted()
    }
    private fun accepted()=NcDispatchResult(true,state)
    private fun rejected(text:String):NcDispatchResult{state=state.copy(message=RuntimeMessage(MessageSeverity.WARNING,text));return NcDispatchResult(false,state)}
    private fun messageFor(diagnostics:List<NcDiagnostic>)=diagnostics.firstOrNull()?.let{RuntimeMessage(MessageSeverity.WARNING,"L"+it.lineNumber+" "+it.message)}
    private fun normalize(text:String)=text.replace("\r\n","\n").replace('\r','\n')
    private fun programDigest(text:String)=MessageDigest.getInstance("SHA-256").digest(text.toByteArray(Charsets.UTF_8)).joinToString(""){"%02x".format(it)}
    companion object { const val MAX_PROGRAM_BYTES=1_048_576 }
}