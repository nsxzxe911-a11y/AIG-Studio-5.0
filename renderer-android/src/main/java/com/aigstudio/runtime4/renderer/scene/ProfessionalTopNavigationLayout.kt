package com.aigstudio.runtime4.renderer

data class ProfessionalTopNavigationResult(
    val top:Float,
    val bottom:Float,
    val buttons:List<RgbGlassButtonNode>,
)

object ProfessionalTopNavigationLayout {
    private data class Spec(val id:String,val label:String,val texture:String?)
    private val specs=listOf(
        Spec("NAV.HOME","首頁","aig-rgb/home/workspace.png"),
        Spec("NAV.CAD","CAD","aig-rgb/home/cad.png"),
        Spec("NAV.CAM","CAM","aig-rgb/home/cam.png"),
        Spec("NAV.SIM","SIM","aig-rgb/home/sim.png"),
        Spec("NAV.3AX","3AX","aig-rgb/home/3ax.png"),
        Spec("NAV.4AX","4AX","aig-rgb/home/4ax.png"),
        Spec("NAV.5AX","5AX","aig-rgb/home/5ax.png"),
        Spec("NAV.6AX","6AX","aig-rgb/home/tool_group.png"),
        Spec("NAV.NC","NC","aig-rgb/home/nc.png"),
        Spec("NAV.AI","AI","aig-rgb/home/ai.png"),
    )

    fun layout(widthPx:Float,heightPx:Float,density:Float,selectedId:String):ProfessionalTopNavigationResult {
        val touch=SharedVisualPolicy.touchPx(density)
        val outer=2f*density
        val gap=2f*density
        val available=(widthPx-outer*2-gap*(specs.size-1)).coerceAtLeast(1f)
        val buttonWidth=available/specs.size
        val top=outer
        val bottom=(top+touch).coerceAtMost(heightPx)
        val buttons=specs.mapIndexed{index,spec->
            val left=outer+index*(buttonWidth+gap)
            val right=(left+buttonWidth).coerceAtMost(widthPx-outer)
            RgbGlassButtonNode(
                id=spec.id,bounds=UiBounds(left,top,right,bottom),z=90,
                label=spec.label,textureRef=spec.texture,commandBinding=null,
                visualState=if(spec.id==selectedId)VisualState.SELECTED else VisualState.NORMAL,
                skinRole=RgbSkinRole.WORKSTATION_NAV,
            )
        }
        return ProfessionalTopNavigationResult(top,bottom,buttons)
    }
}
