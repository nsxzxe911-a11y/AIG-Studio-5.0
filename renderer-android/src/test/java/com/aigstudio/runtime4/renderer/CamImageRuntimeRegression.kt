package com.aigstudio.runtime4.renderer

import com.aigstudio.runtime4.contract.*
import com.aigstudio.runtime4.contract.ui.AigUiAction
import org.junit.Assert.*
import org.junit.Test
import java.io.File

class CamImageRuntimeRegression {
    @Test fun manifestLocksExactApproved856x1836CamArtwork(){
        assertEquals(856f,CamImagePixelManifest.referenceWidth,0.001f)
        assertEquals(1836f,CamImagePixelManifest.referenceHeight,0.001f)
        assertEquals("507dfa0dd85b891a55fa1102c8ae6509cfaea605c16e18d3d53f98a3e08e547a",CamImagePixelManifest.expectedSha256)
        assertEquals(ImagePixelRect(18f,470f,839f,879f),CamImagePixelManifest.viewport)
        assertEquals(ImagePixelRect(15f,1290f,530f,1573f),CamImagePixelManifest.pointPanel)
        var root=File(System.getProperty("user.dir")).absoluteFile
        repeat(8){if(File(root,"settings.gradle.kts").isFile)return@repeat;root=root.parentFile?:error("repo root")}
        val bytes=File(root,"renderer-android/src/main/assets/aig-rgb/page-surfaces/cam.png").readBytes()
        assertTrue(CamImagePixelManifest.isCompatibleBytes(bytes))
    }

    @Test fun imageControlsExposeOnlyVisibleUnambiguousRuntimeActions(){
        val state=CamState.initial()
        val nodes=CamImageInteractionLayout.nodes(856f,1836f,state)
        val buttons=nodes.filterIsInstance<RgbGlassButtonNode>()
        val ids=buttons.map{it.id}.toSet()
        val expected=setOf("CAM.AUTO","CAM.ADOPT","CAM.SAFE_Z","CAM.TOOL","CAM.DIAMETER","CAM.FEED","CAM.SPEED","CAM.DEPTH","CAM.SIDE","CAM.DIRECTION")
        assertEquals(expected,ids.filter{it.startsWith("CAM.")}.toSet())
        setOf("CAM.DELETE","CAM.COPY","CAM.MOVE_UP","CAM.MOVE_DOWN","CAM.EDIT","CAM.CUT_EDIT","CAM.AVOID","CAM.PREVIEW","CAM.ADD").forEach{assertFalse(it in ids)}
        buttons.filter{it.id.startsWith("CAM.")}.forEach { assertTrue("${it.id} must bind real CAM action",it.aigActionBinding is AigUiAction.Cam) }
        assertTrue(nodes.any{it.id=="CAM.VIEWPORT"})
        assertTrue(nodes.none{it.id.startsWith("IMG.CAM.NAV.")})
    }

    @Test fun liveOverlayUsesActualCamStateAndNeverArtworkDemoNumbers(){
        val strategy=CamStrategySnapshot(toolNumber=7,toolDiameterMm=12.345,depthMm=-7.25,safeZMm=18.75,feedMmMin=777.0,spindleRpm=4321.0,side=CamContourSide.INSIDE,direction=CamContourDirection.CW)
        val active=CamToolpathVersion("active",9,"digest",listOf(CamPointSnapshot(1.0,2.0,3.0,4.0,5.0,6.0,CamMotionKind.G0),CamPointSnapshot(11.0,12.0,-7.25,14.0,15.0,16.0,CamMotionKind.G1)))
        val state=CamState.initial().copy(strategy=strategy,active=active,zones=listOf(CamZoneSnapshot("fixture-1",CamZoneKind.FIXTURE,-1.0,-2.0,3.0,4.0,5.0)))
        val plan=CamImageLiveOverlayPlan.build(state,856f,1836f)
        assertTrue(plan.strategyStatus.contains("T7")); assertTrue(plan.strategyStatus.contains("12.345")); assertTrue(plan.strategyStatus.contains("-7.250")); assertTrue(plan.strategyStatus.contains("18.750"))
        assertTrue(plan.strategyStatus.contains("F 777.0")); assertTrue(plan.strategyStatus.contains("S 4321")); assertTrue(plan.strategyStatus.contains("INSIDE")); assertTrue(plan.strategyStatus.contains("CW"))
        assertTrue(plan.pointStatus.contains("ACTIVE 2")); assertTrue(plan.pointStatus.contains("ZONES 1"))
        assertFalse(plan.strategyStatus.contains("8000")); assertFalse(plan.strategyStatus.contains("1500"))
    }
}
