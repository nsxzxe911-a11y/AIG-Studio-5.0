package com.aigstudio.runtime4.renderer

import com.aigstudio.runtime4.contract.PageId
import com.aigstudio.runtime4.contract.ui.AigUiAction
import org.junit.Assert.assertEquals
import org.junit.Test

class MultifunctionCardTextureRegression {
    @Test fun cardWithApprovedIconKeepsIconAndLocalizedLabelTogether(){
        val node=RgbGlassButtonNode(
            id="MULTI.SIM",
            bounds=UiBounds(0f,0f,320f,220f),
            z=50,
            label="3D走刀",
            textureRef="aig-rgb/multifunction/sim.png",
            commandBinding=null,
            skinRole=RgbSkinRole.CARD,
            aigActionBinding=AigUiAction.Navigate(PageId.SIM),
        )
        assertEquals(
            RgbNodeTexturePlan.AssetWithLabel("aig-rgb/multifunction/sim.png","3D走刀"),
            RgbNodeTexturePlan.forNode(node),
        )
    }
}
