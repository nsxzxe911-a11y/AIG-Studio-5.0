package com.aigstudio.runtime4.renderer
import com.aigstudio.runtime4.contract.*
import kotlin.math.max
object AiSceneLayout{
 fun nodes(w:Float,h:Float,d:Float):List<SceneNode>{val touch=SharedVisualPolicy.touchPx(d);val gap=SharedVisualPolicy.gapPx(d);val nav=AxisNavigationLayout.layout(w,h,d,"NAV.AI");val labels=listOf("OPEN","VERIFY","RESTORE");val cw=max(touch,(w-gap*4f)/3f);val controls=labels.mapIndexed{i,label->val l=gap+i*(cw+gap);RgbGlassButtonNode("AI."+label,UiBounds(l,gap,(l+cw).coerceAtMost(w-gap),gap+touch),30,label,null,null,skinRole=RgbSkinRole.CONTROL)};val top=gap+touch+gap;return controls+SceneNode("AI.STATUS",UiBounds(gap,top,w-gap,(nav.top-gap).coerceAtLeast(top)),1)+nav.buttons}
}
class AiSceneController(private val runtime:AiRuntimePort){fun nodes(w:Float,h:Float,d:Float)=AiSceneLayout.nodes(w,h,d);fun activate(id:String):AiDispatchResult?=when(id){"AI.OPEN"->runtime.dispatch(AiCommand.OpenMain);"AI.VERIFY"->runtime.dispatch(AiCommand.Verify);"AI.RESTORE"->runtime.dispatch(AiCommand.RestoreWorkingToMain);else->null}}
