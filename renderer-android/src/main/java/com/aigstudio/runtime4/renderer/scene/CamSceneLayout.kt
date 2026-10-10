package com.aigstudio.runtime4.renderer

import com.aigstudio.runtime4.contract.*
import kotlin.math.max

object CamSceneLayout {
    private val controls=listOf(
        "CAM.MANUAL","CAM.AUTO","CAM.PREVIEW","CAM.SOURCE_LINK","CAM.TOOLPATH_LINK",
        "CAM.TOOL","CAM.DIAMETER","CAM.DEPTH","CAM.SAFE_Z","CAM.FEED","CAM.SPEED",
        "CAM.SIDE","CAM.DIRECTION","CAM.LEAD_IN","CAM.LEAD_OUT","CAM.REGION",
        "CAM.ADD","CAM.EDIT","CAM.CUT_EDIT","CAM.AVOID","CAM.FIXTURE","CAM.FREEZE","CAM.KEEP","CAM.ADOPT","CAM.SAVE"
    )

    fun nodes(widthPx:Float,heightPx:Float,density:Float,state:CamState):List<SceneNode>{
        val touch=48f*density; val gap=8f*density; val landscape=widthPx>heightPx
        val columns=if(landscape)8 else 5; val button=max(touch,(widthPx-gap*(columns+1))/columns)
        fun bounds(index:Int):UiBounds{val col=index%columns;val row=index/columns;val left=gap+col*(button+gap);val top=gap+row*(touch+gap);return UiBounds(left,top,left+button,top+touch)}
        val nodes=controls.mapIndexed { index,id ->
            val visual=when(id){
                "CAM.SOURCE_LINK" -> if(state.sourceLink==CamSourceLinkState.CONNECTED) VisualState.SELECTED else VisualState.NORMAL
                "CAM.TOOLPATH_LINK" -> if(state.toolpathLink==CamToolpathLinkState.CONNECTED) VisualState.SELECTED else VisualState.NORMAL
                "CAM.FREEZE" -> if(state.active?.frozen==true) VisualState.SELECTED else VisualState.NORMAL
                "CAM.PREVIEW" -> if(state.previewCandidateId!=null) VisualState.SELECTED else VisualState.NORMAL
                else -> VisualState.NORMAL
            }
            RgbGlassButtonNode(id,bounds(index),30,id.substringAfter("CAM."),textureFor(id),null,visual,camCommandBinding=commandFor(id,state))
        }.toMutableList<SceneNode>()
        val rows=(controls.size+columns-1)/columns; val toolbarBottom=gap+rows*(touch+gap); val navTop=heightPx-touch-gap
        nodes+=SceneNode("CAM.VIEWPORT",UiBounds(gap,toolbarBottom,widthPx-gap,navTop-gap),1)
        nodes+=RgbGlassButtonNode("NAV.HOME",UiBounds(gap,navTop,gap+touch,navTop+touch),50,"HOME","aig-rgb/icons/workspace.png",null)
        nodes+=RgbGlassButtonNode("NAV.CAD",UiBounds(gap*2+touch,navTop,gap*2+touch*2,navTop+touch),50,"CAD","aig-rgb/icons/cad.png",null)
        nodes+=RgbGlassButtonNode("NAV.CAM",UiBounds(gap*3+touch*2,navTop,gap*3+touch*3,navTop+touch),50,"CAM","aig-rgb/icons/cam.png",null,VisualState.SELECTED)
        nodes+=RgbGlassButtonNode("NAV.NC",UiBounds(gap*4+touch*3,navTop,gap*4+touch*4,navTop+touch),50,"NC",null,null)
        return nodes
    }

    fun commandFor(id:String,state:CamState):CamCommand?=when(id){
        "CAM.MANUAL"->CamCommand.StartManual
        "CAM.AUTO"->CamCommand.GenerateCandidate
        "CAM.PREVIEW"->CamCommand.PreviewCandidate
        "CAM.SOURCE_LINK"->if(state.sourceLink==CamSourceLinkState.CONNECTED)CamCommand.DisconnectSource else CamCommand.ConnectSource
        "CAM.TOOLPATH_LINK"->if(state.toolpathLink==CamToolpathLinkState.CONNECTED)CamCommand.DisconnectToolpath else CamCommand.ConnectToolpath
        "CAM.TOOL"->CamCommand.SetToolNumber(if(state.strategy.toolNumber==1)2 else 1)
        "CAM.DIAMETER"->CamCommand.SetToolDiameter(if(state.strategy.toolDiameterMm==10.0)6.0 else 10.0)
        "CAM.DEPTH"->CamCommand.SetDepth(if(state.strategy.depthMm==-2.0)-5.0 else -2.0)
        "CAM.SAFE_Z"->CamCommand.SetSafeZ(if(state.strategy.safeZMm<=5.0)8.0 else 5.0)
        "CAM.FEED"->CamCommand.SetFeed(if(state.strategy.feedMmMin==150.0)300.0 else 150.0)
        "CAM.SPEED"->CamCommand.SetSpeed(if(state.strategy.spindleRpm==2300.0)3200.0 else 2300.0)
        "CAM.SIDE"->CamCommand.SetContourSide(if(state.strategy.side==CamContourSide.OUTSIDE)CamContourSide.INSIDE else CamContourSide.OUTSIDE)
        "CAM.DIRECTION"->CamCommand.SetContourDirection(if(state.strategy.direction==CamContourDirection.CCW)CamContourDirection.CW else CamContourDirection.CCW)
        "CAM.LEAD_IN"->CamCommand.SetLeadIn(if(state.strategy.leadInMm==2.0)5.0 else 2.0)
        "CAM.LEAD_OUT"->CamCommand.SetLeadOut(if(state.strategy.leadOutMm==2.0)5.0 else 2.0)
        "CAM.REGION"->CamCommand.SetMachiningRegion(if(state.strategy.machiningRegion==null)CamMachiningRegion(-50.0,-50.0,50.0,50.0) else null)
        "CAM.ADD"->{val last=state.active?.points?.lastOrNull(); CamCommand.AddPoint(state.active?.points?.size?:0,(last?.x?:0.0)+10.0,last?.y?:0.0,state.strategy.safeZMm,last?.a?:0.0,last?.b?:0.0,last?.c?:0.0,CamMotionKind.G0)}
        "CAM.EDIT"->{val p=state.active?.points?.firstOrNull()?:CamPointSnapshot(0.0,0.0,state.strategy.safeZMm,0.0,0.0,0.0,CamMotionKind.G0); CamCommand.ReplacePointXYZABC(0,p.x,p.y,state.strategy.safeZMm,10.0,20.0,30.0,CamMotionKind.G0)}
        "CAM.CUT_EDIT"->{val index=if((state.active?.points?.size?:0)>1)1 else 0; val p=state.active?.points?.getOrNull(index)?:CamPointSnapshot(10.0,0.0,state.strategy.depthMm,0.0,0.0,0.0,CamMotionKind.G1); CamCommand.ReplacePointXYZABC(index,p.x+10.0,p.y,state.strategy.depthMm,10.0,20.0,30.0,CamMotionKind.G1)}
        "CAM.AVOID"->CamCommand.InsertAvoidance(0,25.0,25.0,state.strategy.depthMm)
        "CAM.FIXTURE"->CamCommand.AddZone(CamZoneSnapshot("fixture-1",CamZoneKind.FIXTURE,-15.0,-10.0,15.0,10.0,5.0))
        "CAM.FREEZE"->if(state.active?.frozen==true)CamCommand.UnfreezeActive else CamCommand.FreezeActive
        "CAM.KEEP"->CamCommand.KeepActiveToolpath
        "CAM.ADOPT"->CamCommand.AdoptCandidate
        "CAM.SAVE"->CamCommand.SaveCandidateAsNewVersion
        else->null
    }

    private fun textureFor(id:String):String?=when(id){"CAM.AUTO","CAM.MANUAL"->"aig-rgb/icons/cam.png";else->null}
}
