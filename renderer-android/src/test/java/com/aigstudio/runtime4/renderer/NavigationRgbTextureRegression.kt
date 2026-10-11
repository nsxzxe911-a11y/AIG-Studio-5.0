package com.aigstudio.runtime4.renderer

import com.aigstudio.runtime4.contract.ui.AigUiAction
import org.junit.Assert.*
import org.junit.Test

class NavigationRgbTextureRegression {
    @Test fun professionalHomeNavigationUsesRealGeneratedRuntimeControls(){
        val home=HomeSceneLayout.nodes(1080f,1920f,2f)
        val homeNode=home.first{it.id=="NAV.HOME"} as RgbGlassButtonNode
        val cadNode=home.first{it.id=="NAV.CAD"} as RgbGlassButtonNode
        assertEquals("aig-rgb/home/workspace.png",homeNode.textureRef)
        assertEquals("aig-rgb/home/cad.png",cadNode.textureRef)
        assertTrue(homeNode.aigActionBinding is AigUiAction.Navigate)
        assertTrue(cadNode.aigActionBinding is AigUiAction.Navigate)
        assertEquals("首頁",homeNode.label)
        assertEquals("CAD製圖",cadNode.label)
        val cadScene=CadSceneLayout.nodes(1080f,1920f,2f,false)
        assertEquals("aig-rgb/home/workspace.png",(cadScene.first{it.id=="NAV.HOME"} as RgbGlassButtonNode).textureRef)
        assertEquals("aig-rgb/home/cad.png",(cadScene.first{it.id=="NAV.CAD"} as RgbGlassButtonNode).textureRef)
    }
}
