package com.aigstudio.runtime4.renderer

import com.aigstudio.runtime4.contract.*
import org.junit.Assert.*
import org.junit.Test

class CadSnapPresentationRegression {
    @Test fun snapPreviewMapsToGpuMarkerAndHudWithoutGeometryLogic(){
        val viewport=CadViewportNode(UiBounds(0f,0f,400f,400f))
        val state=CadState.initial().copy(snapMode=CadSnapMode.ENDPOINT,snapPreview=CadPoint(10.0,20.0))
        val p=CadSnapPresentation.from(state,viewport)
        assertEquals("SNAP=ENDPOINT",p.hudLabel)
        assertNotNull(p.marker)
        val center=viewport.worldToScreen(10.0,20.0)
        assertEquals(center.first,p.marker!!.centerX,0.001f)
        assertEquals(center.second,p.marker!!.centerY,0.001f)
        assertEquals(5,p.marker!!.diamond.size)
        assertEquals(4,p.marker!!.cross.size)
        val off=CadSnapPresentation.from(state.copy(snapMode=CadSnapMode.OFF,snapPreview=null),viewport)
        assertEquals("SNAP=OFF",off.hudLabel)
        assertNull(off.marker)
    }
}
