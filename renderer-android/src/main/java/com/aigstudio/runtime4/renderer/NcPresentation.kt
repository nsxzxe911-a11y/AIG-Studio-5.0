package com.aigstudio.runtime4.renderer

import com.aigstudio.runtime4.contract.*

data class NcLinePresentation(val number:Int,val text:String,val diagnostic:NcDiagnostic?)
data class NcPresentation(
    val workingId:String,val revision:Long,val cursorOffset:Int,val cursorLine:Int,
    val lines:List<NcLinePresentation>,val candidateId:String?,val previewCandidateId:String?,
    val frozen:Boolean,val camLink:NcCamLinkState,val localMessage:RuntimeMessage?
){
    companion object{
        fun from(state:NcState):NcPresentation{
            val text=state.working.program
            val rawLines=text.split('\n')
            val cursor=state.working.cursorOffset.coerceIn(0,text.length)
            val cursorLine=text.substring(0,cursor).count{it=='\n'}+1
            val byLine=state.diagnostics.groupBy{it.lineNumber}
            val lines=rawLines.mapIndexed{i,line->NcLinePresentation(i+1,line,byLine[i+1]?.firstOrNull())}
            return NcPresentation(state.working.id,state.working.revision,cursor,cursorLine,lines,state.candidate?.id,state.previewCandidateId,state.working.frozen,state.camLink,state.message)
        }
    }
}