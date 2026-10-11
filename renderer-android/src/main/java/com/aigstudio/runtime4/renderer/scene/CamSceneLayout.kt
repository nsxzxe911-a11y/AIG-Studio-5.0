package com.aigstudio.runtime4.renderer

import com.aigstudio.runtime4.contract.*
import com.aigstudio.runtime4.contract.ui.AigUiLocalization
import kotlin.math.max

object CamSceneLayout {
    private val assets=setOf("aig-rgb/cam/cam.png")

    fun nodes(widthPx:Float,heightPx:Float,density:Float,state:CamState):List<SceneNode>{
        val touch=SharedVisualPolicy.touchPx(density);val gap=SharedVisualPolicy.gapPx(density);val landscape=widthPx>heightPx
        val descriptor=CamProfessionalDescriptor.descriptor(state)
        val controls=descriptor.components.filter{it.visible&&it.kind==com.aigstudio.runtime4.contract.ui.AigUiKind.BUTTON}
        val columns=if(landscape)8 else 5
        val button=max(touch,(widthPx-gap*(columns+1))/columns)
        val rows=max(1,(controls.size+columns-1)/columns)
        val deckTop=gap;val deckBottom=deckTop+gap+rows*(touch+gap)
        val bounds=linkedMapOf<String,UiBounds>()
        bounds["CAM.CONTROL_DECK"]=UiBounds(gap,deckTop,widthPx-gap,deckBottom)
        controls.forEachIndexed{index,component->
            val col=index%columns;val row=index/columns
            val left=gap*2+col*(button+gap);val top=deckTop+gap+row*(touch+gap)
            bounds[component.controlId]=UiBounds(left,top,(left+button).coerceAtMost(widthPx-gap*2),top+touch)
        }
        val nav=AxisNavigationLayout.layout(widthPx,heightPx,density,"NAV.CAM")
        val frameTop=deckBottom+gap
        val frameBottom=(nav.top-gap).coerceAtLeast(frameTop+touch)
        bounds["CAM.VIEWPORT.FRAME"]=UiBounds(gap,frameTop,widthPx-gap,frameBottom)
        val nodes=AigComponentNodeAdapter.nodes(descriptor,AigPageLayout(bounds,AigUiLocalization.labels("zh-TW"),assets,20)).toMutableList<SceneNode>()
        val inset=2f*density
        nodes+=SceneNode("CAM.VIEWPORT",UiBounds(gap+inset,frameTop+inset,widthPx-gap-inset,frameBottom-inset),1)
        nodes+=nav.buttons
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
        "CAM.ADD"->{val last=state.active?.points?.lastOrNull();CamCommand.AddPoint(state.active?.points?.size?:0,(last?.x?:0.0)+10.0,last?.y?:0.0,state.strategy.safeZMm,last?.a?:0.0,last?.b?:0.0,last?.c?:0.0,CamMotionKind.G0)}
        "CAM.EDIT"->{val p=state.active?.points?.firstOrNull()?:CamPointSnapshot(0.0,0.0,state.strategy.safeZMm,0.0,0.0,0.0,CamMotionKind.G0);CamCommand.ReplacePointXYZABC(0,p.x,p.y,state.strategy.safeZMm,10.0,20.0,30.0,CamMotionKind.G0)}
        "CAM.CUT_EDIT"->{val index=if((state.active?.points?.size?:0)>1)1 else 0;val p=state.active?.points?.getOrNull(index)?:CamPointSnapshot(10.0,0.0,state.strategy.depthMm,0.0,0.0,0.0,CamMotionKind.G1);CamCommand.ReplacePointXYZABC(index,p.x+10.0,p.y,state.strategy.depthMm,10.0,20.0,30.0,CamMotionKind.G1)}
        "CAM.AVOID"->CamCommand.InsertAvoidance(0,25.0,25.0,state.strategy.depthMm)
        "CAM.FIXTURE"->CamCommand.AddZone(CamZoneSnapshot("fixture-1",CamZoneKind.FIXTURE,-15.0,-10.0,15.0,10.0,5.0))
        "CAM.FREEZE"->if(state.active?.frozen==true)CamCommand.UnfreezeActive else CamCommand.FreezeActive
        "CAM.KEEP"->CamCommand.KeepActiveToolpath
        "CAM.ADOPT"->CamCommand.AdoptCandidate
        "CAM.SAVE"->CamCommand.SaveCandidateAsNewVersion
        else->null
    }
}
