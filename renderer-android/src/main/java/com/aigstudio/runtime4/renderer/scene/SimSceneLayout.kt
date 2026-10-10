package com.aigstudio.runtime4.renderer
import com.aigstudio.runtime4.contract.*
import kotlin.math.max
object SimSceneLayout{
 fun nodes(w:Float,h:Float,d:Float):List<SceneNode>{val touch=SharedVisualPolicy.touchPx(d);val gap=SharedVisualPolicy.gapPx(d);val nav=AxisNavigationLayout.layout(w,h,d,"NAV.SIM");val labels=listOf("PLAY","STEP","RESET","DISPLAY");val cw=max(touch,(w-gap*5f)/4f);val controls=labels.mapIndexed{i,label->val l=gap+i*(cw+gap);RgbGlassButtonNode("SIM."+label,UiBounds(l,gap,(l+cw).coerceAtMost(w-gap),gap+touch),30,label,null,null,skinRole=RgbSkinRole.CONTROL)};val top=gap+touch+gap;return controls+SceneNode("SIM.VIEWPORT",UiBounds(gap,top,w-gap,(nav.top-gap).coerceAtLeast(top)),1)+nav.buttons}
}
class SimSceneController(private val runtime:SimRuntimePort){fun nodes(w:Float,h:Float,d:Float)=SimSceneLayout.nodes(w,h,d);fun activate(id:String):SimState?=when(id){"SIM.PLAY"->runtime.run();"SIM.STEP"->runtime.step();"SIM.RESET"->runtime.reset();"SIM.DISPLAY"->runtime.toggleDisplay();else->null}}
