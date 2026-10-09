package com.aigstudio.runtime4.renderer

import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class NavigationRgbTextureRegression {
    @Test fun homeAndCadNavigationUseDirectRgbImageNodes() {
        val home = HomeSceneLayout.nodes(1080f, 1920f, 2f)
        val homeNode = home.first { it.id == "NAV.HOME" }
        val cadNode = home.first { it.id == "NAV.CAD" }
        assertTrue(homeNode is RgbGlassButtonNode)
        assertTrue(cadNode is RgbGlassButtonNode)
        assertEquals("aig-rgb/icons/workspace.png", (homeNode as RgbGlassButtonNode).textureRef)
        assertEquals("aig-rgb/icons/cad.png", (cadNode as RgbGlassButtonNode).textureRef)
        val cadScene = CadSceneLayout.nodes(1080f, 1920f, 2f, false)
        assertEquals("aig-rgb/icons/workspace.png", (cadScene.first { it.id == "NAV.HOME" } as RgbGlassButtonNode).textureRef)
        assertEquals("aig-rgb/icons/cad.png", (cadScene.first { it.id == "NAV.CAD" } as RgbGlassButtonNode).textureRef)
    }
}
