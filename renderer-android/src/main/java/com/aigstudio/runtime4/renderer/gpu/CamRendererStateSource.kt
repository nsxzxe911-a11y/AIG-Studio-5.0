package com.aigstudio.runtime4.renderer.gpu

import com.aigstudio.runtime4.contract.*

class CamRendererStateSource(private val runtime:CamRuntimePort){ fun snapshotForFrame():CamState=runtime.snapshot() }

data class CamPresentation(
    val active:List<CamPointSnapshot>,
    val candidate:List<CamPointSnapshot>,
    val localMessage:RuntimeMessage?,
    val globalBackdropAlarm:Boolean=false,
){
    companion object {
        fun from(state:CamState):CamPresentation {
            val candidate=if(state.previewCandidateId!=null && state.previewCandidateId==state.candidate?.id) state.candidate?.points ?: emptyList() else emptyList()
            return CamPresentation(state.active?.points?:emptyList(),candidate,state.message,false)
        }
    }
}

