package com.aigstudio.runtime4.renderer

import com.aigstudio.runtime4.contract.PageId
import com.aigstudio.runtime4.contract.ui.*
import org.junit.Assert.*
import org.junit.Test
import java.io.File

class NoFakeProfessionalUiRegression {
    private fun repoRoot():File {
        var cursor=File(System.getProperty("user.dir")).absoluteFile
        repeat(8){
            if(File(cursor,"settings.gradle.kts").isFile)return cursor
            val parent=cursor.parentFile ?: error("repo root not found before filesystem root")
            cursor=parent
        }
        error("repo root not found from user.dir="+System.getProperty("user.dir"))
    }

    @Test fun rendererHasNoFullPageScreenshotOrTextCoverPath(){
        val root=repoRoot()
        val source=File(root,"renderer-android/src/main/java/com/aigstudio/runtime4/renderer/gpu/AigGlesRenderer.kt").readText()
        assertFalse(source.contains("FullSurfaceSkinPlan"))
        assertFalse(source.contains("MorningHomeTraditionalChinesePlan"))
        assertFalse(source.contains("morning-20261005"))
        assertFalse(source.contains("drawMorningHomeTraditionalChinese"))
    }

    @Test fun runtimePageArtworkIsVisualOnlyAndCadControlsStayModuleBound(){
        val root=repoRoot()
        assertFalse(File(root,"renderer-android/src/main/assets/aig-rgb/full-surface").exists())
        assertTrue(File(root,"renderer-android/src/main/assets/aig-rgb/page-surfaces/cad.png").isFile)
        assertEquals("aig-rgb/page-surfaces/cad.png",PageSurfaceTexturePlan.path(PageId.CAD))
        val ids=CadImageModuleCatalog.controlIds()
        assertTrue(ids.isNotEmpty())
        assertTrue(ids.all{CadImageModuleCatalog.component(it)?.action!=null})
        assertEquals(ids.size,ids.toSet().size)
    }

    @Test fun adapterPreservesActionAndFallsBackToLocalizedLabelWhenIconMissing(){
        val action=AigUiAction.Navigate(PageId.CAD)
        val component=AigUiComponent("NAV.CAD",AigUiKind.NAV,"nav.cad","icons/missing.png",AigUiState.NORMAL,true,true,action)
        val descriptor=AigUiPageDescriptor(PageId.HOME,listOf(component))
        val layout=AigPageLayout(
            boundsByControlId=mapOf("NAV.CAD" to UiBounds(0f,0f,220f,96f)),
            labelsByKey=mapOf("nav.cad" to "CAD製圖"),
            availableAssets=emptySet(),
        )
        val node=AigComponentNodeAdapter.nodes(descriptor,layout).single() as RgbGlassButtonNode
        assertEquals("CAD製圖",node.label)
        assertNull(node.textureRef)
        assertEquals(action,node.aigActionBinding)
        assertTrue(node.enabled)
        assertTrue(node.visible)
    }

    @Test fun professionalSemanticStatesMapExactly(){
        assertEquals(VisualState.NORMAL,AigProfessionalTokens.visualState(AigUiState.NORMAL))
        assertEquals(VisualState.PRESSED,AigProfessionalTokens.visualState(AigUiState.PRESSED))
        assertEquals(VisualState.SELECTED,AigProfessionalTokens.visualState(AigUiState.SELECTED))
        assertEquals(VisualState.DISABLED,AigProfessionalTokens.visualState(AigUiState.DISABLED))
        assertEquals(VisualState.ALARM,AigProfessionalTokens.visualState(AigUiState.ALARM))
    }}
