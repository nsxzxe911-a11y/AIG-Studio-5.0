package com.aigstudio.runtime4.renderer

import com.aigstudio.runtime4.contract.*
import kotlin.math.max

object NcSceneLayout {
    private val controls=listOf(
        "NC.CAM_LINK","NC.PREVIEW","NC.KEEP","NC.ADOPT","NC.SAVE","NC.FREEZE","NC.VALIDATE",
        "NC.KEY.G","NC.KEY.M","NC.KEY.X","NC.KEY.Y","NC.KEY.Z","NC.KEY.A","NC.KEY.B","NC.KEY.C","NC.KEY.F","NC.KEY.S","NC.KEY.T",
        "NC.KEY.0","NC.KEY.1","NC.KEY.2","NC.KEY.3","NC.KEY.4","NC.KEY.5","NC.KEY.6","NC.KEY.7","NC.KEY.8","NC.KEY.9","NC.KEY.DOT","NC.KEY.MINUS",
        "NC.EOB","NC.INSERT","NC.BACKSPACE","NC.DELETE","NC.BLOCK_SKIP"
    )

    fun nodes(widthPx:Float,heightPx:Float,density:Float,state:NcState):List<SceneNode>{
        val touch=48f*density; val gap=6f*density; val landscape=widthPx>heightPx
        val columns=if(landscape)10 else 6
        val button=max(touch,(widthPx-gap*(columns+1))/columns)
        fun bounds(index:Int):UiBounds{val col=index%columns;val row=index/columns;val left=gap+col*(button+gap);val top=gap+row*(touch+gap);return UiBounds(left,top,left+button,top+touch)}
        val nodes=controls.mapIndexed{index,id->
            val visual=when(id){
                "NC.CAM_LINK"->if(state.camLink==NcCamLinkState.CONNECTED)VisualState.SELECTED else VisualState.NORMAL
                "NC.PREVIEW"->if(state.previewCandidateId!=null)VisualState.SELECTED else VisualState.NORMAL
                "NC.FREEZE"->if(state.working.frozen)VisualState.SELECTED else VisualState.NORMAL
                "NC.INSERT"->if(state.editMode==NcEditMode.REPLACE)VisualState.SELECTED else VisualState.NORMAL
                else->VisualState.NORMAL
            }
            RgbGlassButtonNode(id,bounds(index),30,labelFor(id),null,null,visual,ncCommandBinding=commandFor(id,state))
        }.toMutableList<SceneNode>()
        val rows=(controls.size+columns-1)/columns
        val toolbarBottom=gap+rows*(touch+gap)
        val navTop=heightPx-touch-gap
        val editorBounds=UiBounds(gap,toolbarBottom,widthPx-gap,navTop-gap)
        nodes+=NcEditorViewportNode("NC.EDITOR",editorBounds,1)
        val lineHeight=22f*density
        state.diagnostics.filter{it.severity!=MessageSeverity.INFO}.forEachIndexed{index,diagnostic->
            val top=(editorBounds.top+(diagnostic.lineNumber-1).coerceAtLeast(0)*lineHeight).coerceAtMost((editorBounds.bottom-lineHeight).coerceAtLeast(editorBounds.top))
            nodes+=SceneNode("NC.DIAG.${diagnostic.lineNumber}.$index",UiBounds(editorBounds.left,top,editorBounds.left+6f*density,top+lineHeight),12,VisualState.ALARM,enabled=false)
        }
        nodes+=RgbGlassButtonNode("NAV.HOME",UiBounds(gap,navTop,gap+touch,navTop+touch),50,"HOME","aig-rgb/icons/workspace.png",null)
        nodes+=RgbGlassButtonNode("NAV.CAD",UiBounds(gap*2+touch,navTop,gap*2+touch*2,navTop+touch),50,"CAD","aig-rgb/icons/cad.png",null)
        nodes+=RgbGlassButtonNode("NAV.CAM",UiBounds(gap*3+touch*2,navTop,gap*3+touch*3,navTop+touch),50,"CAM","aig-rgb/icons/cam.png",null)
        nodes+=RgbGlassButtonNode("NAV.NC",UiBounds(gap*4+touch*3,navTop,gap*4+touch*4,navTop+touch),50,"NC",null,null,VisualState.SELECTED)
        return nodes
    }

    fun commandFor(id:String,state:NcState):NcCommand?=when(id){
        "NC.CAM_LINK"->if(state.camLink==NcCamLinkState.CONNECTED)NcCommand.DisconnectCam else NcCommand.ConnectCam
        "NC.PREVIEW"->NcCommand.PreviewCandidate
        "NC.KEEP"->NcCommand.KeepWorkingCopy
        "NC.ADOPT"->NcCommand.AdoptCandidate
        "NC.SAVE"->NcCommand.SaveCandidateAsNewVersion
        "NC.FREEZE"->if(state.working.frozen)NcCommand.UnfreezeActive else NcCommand.FreezeActive
        "NC.VALIDATE"->NcCommand.Validate
        "NC.EOB"->NcCommand.NewBlock
        "NC.INSERT"->NcCommand.ToggleInsertMode
        "NC.BACKSPACE"->NcCommand.Backspace
        "NC.DELETE"->NcCommand.DeleteForward
        "NC.BLOCK_SKIP"->NcCommand.ToggleBlockSkip
        else->if(id.startsWith("NC.KEY.")){
            val token=id.substringAfter("NC.KEY.")
            NcCommand.InsertText(when(token){"DOT"->".";"MINUS"->"-";else->token})
        }else null
    }

    private fun labelFor(id:String)=id.substringAfterLast('.').let{when(it){"DOT"->".";"MINUS"->"-";"BACKSPACE"->"BS";"BLOCK_SKIP"->"/";else->it}}
}