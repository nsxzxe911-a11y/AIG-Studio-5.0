package com.aigstudio.runtime4.renderer
import com.aigstudio.runtime4.contract.*
import kotlin.math.ceil
import kotlin.math.floor
import kotlin.math.max

data class ProductControlDescriptor(val id:String,val source:PageId,val target:PageId?,val label:String,val connected:Boolean)

object ProductControlDeck {
    private fun targets(page:PageId):List<PageId> = when(page){
        PageId.HOME,PageId.MULTIFUNCTION->emptyList()
        PageId.CAD->listOf(PageId.CAM)
        PageId.CAM->listOf(PageId.CAD,PageId.SIM,PageId.NC)
        PageId.SIM->listOf(PageId.CAM,PageId.NC,PageId.AXIS3,PageId.AXIS4,PageId.AXIS5,PageId.AXIS6)
        PageId.AXIS3,PageId.AXIS4,PageId.AXIS5,PageId.AXIS6->listOf(PageId.SIM)
        PageId.NC->listOf(PageId.CAM,PageId.SIM,PageId.AI)
        PageId.AI->listOf(PageId.NC)
    }
    fun descriptors(page:PageId,state:PageCapabilityState,expanded:Boolean):List<ProductControlDescriptor>{
        val targets=targets(page);if(targets.isEmpty())return emptyList()
        val connectedCount=targets.count{target->state.connections.firstOrNull{it.target==target}?.connected==true}
        val head=ProductControlDescriptor("LINKS."+page.name,page,null,"LINK "+connectedCount+"/"+targets.size,connectedCount>0)
        if(!expanded)return listOf(head)
        return listOf(head)+targets.map{target->val on=state.connections.firstOrNull{it.target==target}?.connected==true;ProductControlDescriptor("LINK."+page.name+"."+target.name,page,target,target.name+if(on)" ON" else " OFF",on)}
    }
    fun nodes(page:PageId,state:PageCapabilityState,expanded:Boolean,widthPx:Float,heightPx:Float,density:Float):List<SceneNode>{
        val d=descriptors(page,state,expanded);if(d.isEmpty())return emptyList()
        val free=AxisNavigationLayout.freeSlots(widthPx,heightPx,density)
        if(free.size>=d.size)return d.mapIndexed{index,it->RgbGlassButtonNode(it.id,free[index],60,it.label,null,null,if(it.connected)VisualState.SELECTED else VisualState.NORMAL,skinRole=RgbSkinRole.CONTROL)}
        val touch=SharedVisualPolicy.touchPx(density);val gap=SharedVisualPolicy.gapPx(density);val count=d.size
        val maxColumns=max(1,floor((widthPx-gap)/(touch+gap)).toInt());val columns=max(1,minOf(count,maxColumns));val rows=ceil(count.toDouble()/columns.toDouble()).toInt()
        val buttonWidth=max(touch,(widthPx-gap*(columns+1))/columns);val panelHeight=rows*touch+max(0,rows-1)*gap
        val navTop=AxisNavigationLayout.layout(widthPx,heightPx,density,"NAV."+page.sceneNavName()).top
        val top=(heightPx*0.36f).coerceAtMost((navTop-gap-panelHeight).coerceAtLeast(gap)).coerceAtLeast(gap)
        return d.mapIndexed{index,it->val row=index/columns;val col=index%columns;val left=gap+col*(buttonWidth+gap);val y=top+row*(touch+gap);RgbGlassButtonNode(it.id,UiBounds(left,y,(left+buttonWidth).coerceAtMost(widthPx-gap),y+touch),60,it.label,null,null,if(it.connected)VisualState.SELECTED else VisualState.NORMAL,skinRole=RgbSkinRole.CONTROL)}
    }
}

class ProductControlDeckController(private val runtime:PageConnectionRuntimePort){
    private val expanded=mutableSetOf<PageId>()
    fun nodes(page:PageId,w:Float,h:Float,d:Float)=ProductControlDeck.nodes(page,runtime.snapshot(page),page in expanded,w,h,d)
    fun activate(page:PageId,id:String):PageCapabilityState?{
        if(id=="LINKS."+page.name){if(page in expanded)expanded.remove(page)else expanded.add(page);return runtime.snapshot(page)}
        if(!id.startsWith("LINK."))return null
        val parts=id.split('.');if(parts.size!=3||parts[1]!=page.name)return null
        val target=runCatching{PageId.valueOf(parts[2])}.getOrNull()?:return null
        val next=runtime.snapshot(page).connections.first{it.target==target}.connected.not()
        runtime.setConnection(page,target,next);runtime.setConnection(target,page,next)
        return runtime.snapshot(page)
    }
}

fun SceneId.toPageId():PageId=when(this){SceneId.HOME->PageId.HOME;SceneId.CAD->PageId.CAD;SceneId.CAM->PageId.CAM;SceneId.SIM->PageId.SIM;SceneId.MULTIFUNCTION->PageId.MULTIFUNCTION;SceneId.AXIS3->PageId.AXIS3;SceneId.AXIS4->PageId.AXIS4;SceneId.AXIS5->PageId.AXIS5;SceneId.AXIS6->PageId.AXIS6;SceneId.NC->PageId.NC;SceneId.AI->PageId.AI}
private fun PageId.sceneNavName():String=when(this){PageId.HOME->"HOME";PageId.CAD->"CAD";PageId.CAM->"CAM";PageId.SIM->"SIM";PageId.MULTIFUNCTION->"MULTIFUNCTION";PageId.AXIS3->"3AX";PageId.AXIS4->"4AX";PageId.AXIS5->"5AX";PageId.AXIS6->"6AX";PageId.NC->"NC";PageId.AI->"AI"}
