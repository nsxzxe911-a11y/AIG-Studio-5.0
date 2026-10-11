package com.aigstudio.runtime4.renderer

import com.aigstudio.runtime4.contract.*
import org.junit.Assert.*
import org.junit.Test
import java.io.File

class MobileRuntimeTruthRegression {
    private val primaryPages=listOf(
        PageId.HOME,PageId.CAD,PageId.CAM,PageId.SIM,
        PageId.AXIS3,PageId.AXIS4,PageId.AXIS5,PageId.AXIS6,PageId.NC,PageId.AI,
    )

    @Test fun everyPrimaryPageMasksBakedMachineStatusAndClock(){
        primaryPages.forEach { page ->
            val ids=MobileRuntimeTruthMaskLayout.sourceRegions(page).map{it.id}.toSet()
            assertTrue("$page must mask baked machine status", "HEADER.STATUS" in ids)
            assertTrue("$page must mask baked date/time", "HEADER.CLOCK" in ids)
        }
    }

    @Test fun dataHeavyPagesMaskTheirBakedRuntimeZones(){
        fun ids(page:PageId)=MobileRuntimeTruthMaskLayout.sourceRegions(page).map{it.id}.toSet()
        assertTrue(setOf("HOME.LINK_STATUS","HOME.RECENT_FILES","HOME.CONNECTIONS","HOME.SYSTEM_INFO").all{it in ids(PageId.HOME)})
        assertTrue(setOf("CAD.VIEWPORT","CAD.LAYERS","CAD.PROPERTIES").all{it in ids(PageId.CAD)})
        assertTrue(setOf("CAM.STRATEGY","CAM.POINTS").all{it in ids(PageId.CAM)})
        assertTrue("SIM.STATUS" in ids(PageId.SIM))
        assertTrue("AXIS3.COORD" in ids(PageId.AXIS3))
        assertTrue("AXIS4.STATUS" in ids(PageId.AXIS4))
        assertTrue("AXIS5.STATUS" in ids(PageId.AXIS5))
        assertTrue("AXIS6.COORD" in ids(PageId.AXIS6))
        assertTrue(setOf("NC.EDITOR","NC.STATUS").all{it in ids(PageId.NC)})
        assertTrue("AI.STATUS" in ids(PageId.AI))
    }

    @Test fun masksUseSameAdaptiveTransformAsSkin(){
        val source=MobileRuntimeTruthMaskLayout.sourceRegions(PageId.CAD).first{it.id=="CAD.VIEWPORT"}.rect
        val mapped=MobileRuntimeTruthMaskLayout.regions(PageId.CAD,2160f,3840f).first{it.id=="CAD.VIEWPORT"}.bounds
        val expected=AdaptivePageTransform.forViewport(856f,1836f,2160f,3840f).sourceRectToScreen(source)
        assertEquals(expected,mapped)
    }

    @Test fun cadTruthTextComesFromCadState(){
        val state=CadState.initial().copy(
            revision=7L,activeTool=CadTool.CIRCLE,snapMode=CadSnapMode.CENTER,
            primitives=listOf(CadPrimitiveSnapshot.Circle(1.0,2.0,3.0,true)),
            selectedCount=1,topologyCount=3,originX=4.5,originY=-2.25,
            activeLayer=CadLayer.DIMENSIONS,
        )
        val text=MobileRuntimeTruthTextPlan.cad(state).flatMap{it.lines}.joinToString(" | ")
        assertTrue(text.contains("REV 7"))
        assertTrue(text.contains("PRIM 1"))
        assertTrue(text.contains("SEL 1"))
        assertTrue(text.contains("SNAP CENTER"))
        assertTrue(text.contains("X4.500"))
        assertTrue(text.contains("Y-2.250"))
        assertFalse(text.contains("100.00"))
    }

    @Test fun axisTruthTextUsesOnlyAxesSupportedByMode(){
        val state=AxisSceneState(
            mode=AxisMode.AXIS5,
            pose=AxisPoseSnapshot(1.0,2.0,3.0,4.0,5.0,99.0),
            motionProgramId="O1234",motionRevision=9,blockIndex=4,blockCount=20,
        )
        val text=MobileRuntimeTruthTextPlan.axis(state).flatMap{it.lines}.joinToString(" | ")
        assertTrue(text.contains("X 1.000"));assertTrue(text.contains("A 4.000"));assertTrue(text.contains("B 5.000"))
        assertFalse(text.contains("C 99.000"))
        assertTrue(text.contains("O1234"));assertTrue(text.contains("BLOCK 5/20"))
    }

    @Test fun unavailableHomeDataUsesNeutralPlaceholdersNotDemoValues(){
        val text=(MobileRuntimeTruthTextPlan.header()+MobileRuntimeTruthTextPlan.home(null,null))
            .flatMap{it.lines}.joinToString(" | ")
        listOf("2025.06.13","10:24:17","192.168.","42%","68%","Bracket_01.nc").forEach{demo->
            assertFalse("demo value leaked: $demo",text.contains(demo))
        }
        assertTrue(text.contains("—"))
    }

    @Test fun rendererMasksBakedArtBeforeDrawingLivePageData(){
        var root=File(System.getProperty("user.dir"));repeat(8){if(File(root,"settings.gradle.kts").isFile)return@repeat;root=root.parentFile?:error("repo root not found")}
        val src=File(root,"renderer-android/src/main/java/com/aigstudio/runtime4/renderer/gpu/AigGlesRenderer.kt").readText()
        val mask=src.indexOf("drawRuntimeTruthMasks(p,page)")
        val cam=src.indexOf("PageId.CAM->drawCamImageLiveOverlay(p)")
        val sim=src.indexOf("PageId.SIM->if(simImageMapEnabled) drawSimImageLiveOverlay(p)")
        val axis=src.indexOf("PageId.AXIS3,PageId.AXIS4,PageId.AXIS5,PageId.AXIS6->drawAxisImageLiveOverlay(p,page)")
        assertTrue(mask>=0 && cam>mask && sim>mask && axis>mask)
        assertTrue(src.contains("PageId.HOME->drawHomeImageLiveOverlay(p)"))
        assertTrue(src.contains("PageId.CAD->drawCadImageLiveOverlay(p)"))
    }
}
