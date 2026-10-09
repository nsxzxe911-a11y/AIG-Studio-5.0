package com.aigstudio.production.runtime

import com.aigstudio.core.CncControllerProfile
import com.aigstudio.core.NcEditorAlarmRouter
import com.aigstudio.core.NcExecutionTimeline
import com.aigstudio.core.NcSemanticAuthority

data class CleanNcSnapshot(
    val ready:Boolean,
    val status:String,
    val eventCount:Int,
    val alarmLine:Int?,
    val alarmText:String,
    val authoritySummary:String,
    val timelineSummary:String,
    val program:String
)

class CleanNcSession {
    private var programText:String = DEFAULT_PROGRAM

    fun program():String = programText
    fun setProgram(text:String) { programText = text.replace("\r\n","\n") }
    fun loadSample() { programText = DEFAULT_PROGRAM }

    fun validate():CleanNcSnapshot {
        val controller=CncControllerProfile.FANUC
        val authority=NcSemanticAuthority.programSummary(programText,controller)
        val timeline=NcExecutionTimeline.programSummary(programText,controller)
        val events=NcExecutionTimeline.build(programText,controller)
        val alarm=NcEditorAlarmRouter.firstAlarm(programText,controller)
        val ready=alarm==null && events.none{it.status!="READY"}
        val status=if(ready) "NC READY • FANUC • events=${events.size}" else "NC ALARM • L${alarm?.lineNumber ?: 0}"
        return CleanNcSnapshot(
            ready,status,events.size,alarm?.lineNumber,alarm?.compact().orEmpty(),authority,timeline,programText
        )
    }

    companion object {
        val DEFAULT_PROGRAM = listOf(
            "G90 G54",
            "G0 X0. Y0.",
            "S2300 M3",
            "G43 Z30. H1 M8",
            "G1 Z-10. F150.",
            "G80",
            "M30"
        ).joinToString("\n")
    }
}
