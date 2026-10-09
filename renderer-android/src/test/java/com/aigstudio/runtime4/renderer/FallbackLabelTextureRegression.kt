package com.aigstudio.runtime4.renderer

import com.aigstudio.runtime4.contract.CadCommand
import org.junit.Assert.assertEquals
import org.junit.Test

class FallbackLabelTextureRegression {
    @Test fun missingImageUsesGeneratedLabelTexturePlan() {
        val node = RgbGlassButtonNode(
            id = "CAD.OFFSET",
            bounds = UiBounds(0f, 0f, 160f, 160f),
            z = 4,
            label = "OFFSET",
            textureRef = null,
            commandBinding = CadCommand.Offset(5.0),
        )
        assertEquals(
            RgbNodeTexturePlan.GeneratedLabel("OFFSET"),
            RgbNodeTexturePlan.forNode(node),
        )
    }

    @Test fun approvedImageKeepsDirectAssetTexturePlan() {
        val node = RgbGlassButtonNode(
            id = "CAD.LINE",
            bounds = UiBounds(0f, 0f, 160f, 160f),
            z = 4,
            label = "LINE",
            textureRef = "aig-rgb/icons/line.png",
            commandBinding = CadCommand.SelectTool(com.aigstudio.runtime4.contract.CadTool.LINE),
        )
        assertEquals(
            RgbNodeTexturePlan.Asset("aig-rgb/icons/line.png"),
            RgbNodeTexturePlan.forNode(node),
        )
    }
}
