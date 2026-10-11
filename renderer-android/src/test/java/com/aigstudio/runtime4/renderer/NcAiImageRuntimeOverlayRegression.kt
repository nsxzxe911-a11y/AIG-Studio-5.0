package com.aigstudio.runtime4.renderer

import com.aigstudio.runtime4.contract.*
import org.junit.Assert.*
import org.junit.Test
import java.io.File

class NcAiImageRuntimeOverlayRegression {
    @Test fun ncOverlayUsesOnlyRealWorkingCopyAndFitsApprovedSkin(){
        val state=NcState.initial().copy(
            working=NcWorkingCopy("O9001",7L,"digest","G90 G54\nG0 X1. Y2.\nM30",5,false),
            camLink=NcCamLinkState.CONNECTED,
            editMode=NcEditMode.INSERT,
        )
        val plan=NcImageLiveOverlayPlan.build(state,2160f,3840f)
        assertTrue(plan.editor.left>=0f && plan.editor.right<=2160f)
        assertTrue(plan.editor.top>700f && plan.editor.bottom<2600f)
        assertEquals(listOf("0001  G90 G54","0002  G0 X1. Y2.","0003  M30"),plan.lines)
        assertTrue(plan.status.contains("O9001")); assertTrue(plan.status.contains("V7")); assertTrue(plan.status.contains("CONNECTED"))
        assertFalse(plan.status.contains("Bracket_01"))
    }

    @Test fun aiOverlayUsesRuntimeStateOrUnavailableNeverDemoConversation(){
        val state=AiState(available=true,vaultState="READY",summary="Verified local process",hasChanges=true,verified=false,issueCount=2)
        val plan=AiImageLiveOverlayPlan.build(state,2160f,3840f)
        assertTrue(plan.panel.left>=0f && plan.panel.right<=2160f)
        assertTrue(plan.rows.any{it.contains("READY")})
        assertTrue(plan.rows.any{it.contains("Verified local process")})
        assertTrue(plan.rows.any{it.contains("ISSUES 2")})
        assertTrue(plan.rows.none{it.contains("您好") || it.contains("這個材料")})
        val unavailable=AiImageLiveOverlayPlan.build(null,2160f,3840f)
        assertEquals(listOf("AI RUNTIME UNAVAILABLE"),unavailable.rows)
    }

    @Test fun rendererDrawsNcAndAiRuntimeAfterTheirSkins(){
        var root=File(System.getProperty("user.dir")).absoluteFile
        repeat(8){if(File(root,"settings.gradle.kts").isFile)return@repeat;root=root.parentFile?:error("repo root")}
        val source=File(root,"renderer-android/src/main/java/com/aigstudio/runtime4/renderer/gpu/AigGlesRenderer.kt").readText()
        assertTrue(source.contains("PageId.NC->drawNcImageLiveOverlay(p)"))
        assertTrue(source.contains("PageId.AI->drawAiImageLiveOverlay(p)"))
        assertTrue(source.contains("NcImageLiveOverlayPlan.build(state,widthPx,heightPx)"))
        assertTrue(source.contains("AiImageLiveOverlayPlan.build(aiStateSource?.snapshot(),widthPx,heightPx)"))
    }
}
