package com.aigstudio.runtime4.renderer

import com.aigstudio.runtime4.contract.UnifiedButtonTokens
import org.junit.Assert.*
import org.junit.Test
import java.io.File

class UnifiedButtonRenderingRegression {
    @Test fun policyUsesSharedGeometryTokens(){
        assertEquals(UnifiedButtonTokens.MIN_TOUCH_DP,UnifiedButtonRenderPolicy.minTouchDp,0f)
        assertEquals(UnifiedButtonTokens.PREFERRED_TOUCH_DP,UnifiedButtonRenderPolicy.preferredTouchDp,0f)
        assertEquals(UnifiedButtonTokens.PRESSED_SCALE,UnifiedButtonRenderPolicy.pressedScale,0f)
        val source=UiBounds(100f,200f,300f,320f)
        val pressed=UnifiedButtonRenderPolicy.pressedBounds(source)
        assertEquals(0.95f,pressed.width/source.width,0.001f)
        assertEquals(0.95f,pressed.height/source.height,0.001f)
        assertTrue(pressed.top>source.top && pressed.bottom<source.bottom)
    }

    @Test fun safetyStatesBeatPressedAndSelected(){
        val bounds=UiBounds(0f,0f,100f,100f)
        val alarm=RgbGlassButtonNode("X",bounds,1,"X",null,null,visualState=VisualState.ALARM)
        assertEquals(VisualState.ALARM,UnifiedButtonRenderPolicy.stateFor(alarm,pressed=true,selected=true))
        val disabled=RgbGlassButtonNode("Y",bounds,1,"Y",null,null,visualState=VisualState.SELECTED,enabled=false)
        assertEquals(VisualState.DISABLED,UnifiedButtonRenderPolicy.stateFor(disabled,pressed=true,selected=true))
    }

    @Test fun activeGlesRendererRoutesNormalAndImagePressThroughUnifiedPolicy(){
        var root=File(System.getProperty("user.dir"))
        repeat(8){if(File(root,"settings.gradle.kts").isFile)return@repeat;root=root.parentFile?:root}
        val source=File(root,"renderer-android/src/main/java/com/aigstudio/runtime4/renderer/gpu/AigGlesRenderer.kt").readText()
        assertTrue(source.contains("UnifiedButtonRenderPolicy.stateFor"))
        assertTrue(source.contains("UnifiedButtonRenderPolicy.pressedOverlayFill"))
    }
}
