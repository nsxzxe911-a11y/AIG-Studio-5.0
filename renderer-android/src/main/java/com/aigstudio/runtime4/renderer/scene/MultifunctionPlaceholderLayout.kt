package com.aigstudio.runtime4.renderer

import com.aigstudio.runtime4.contract.PageId
import com.aigstudio.runtime4.contract.ui.*

object MultifunctionPlaceholderLayout {
    fun nodes(widthPx:Float,heightPx:Float,density:Float):List<SceneNode>{
        val gap=SharedVisualPolicy.gapPx(density)
        val touch=SharedVisualPolicy.touchPx(density)
        val descriptor=AigUiPageDescriptor(PageId.MULTIFUNCTION,listOf(
            AigUiComponent("MULTIFUNCTION.INFO.PANEL",AigUiKind.PANEL,null,null,AigUiState.NORMAL,true,true,null),
            AigUiComponent("MULTIFUNCTION.INFO",AigUiKind.LABEL,"multifunction.pending",null,AigUiState.NORMAL,false,true,null),
            AigUiComponent("NAV.HOME",AigUiKind.NAV,"nav.home",null,AigUiState.NORMAL,true,true,AigUiAction.Navigate(PageId.HOME)),
        ))
        val panel=UiBounds(gap,gap,widthPx-gap,(heightPx-touch-gap*3).coerceAtLeast(gap+touch*2))
        val layout=AigPageLayout(
            boundsByControlId=mapOf(
                "MULTIFUNCTION.INFO.PANEL" to panel,
                "MULTIFUNCTION.INFO" to UiBounds(panel.left+gap,panel.top+gap,panel.right-gap,panel.top+touch),
                "NAV.HOME" to UiBounds(gap,heightPx-touch-gap,widthPx-gap,heightPx-gap),
            ),
            labelsByKey=AigUiLocalization.labels("zh-TW"),
        )
        return AigComponentNodeAdapter.nodes(descriptor,layout)
    }
}
