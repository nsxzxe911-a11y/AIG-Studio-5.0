package com.aigstudio.runtime4.renderer

import com.aigstudio.runtime4.contract.*
import com.aigstudio.runtime4.contract.ui.*
import com.aigstudio.runtime4.renderer.gpu.FourthRenderRoute
import com.aigstudio.runtime4.renderer.gpu.RenderRoutePolicy
import org.junit.Assert.*
import org.junit.Test

class ProfessionalHomeRegression {
    @Test fun homeDescriptorHasProfessionalRegionsAndRealTopNavigation(){
        val d=HomeProfessionalDescriptor.descriptor()
        val ids=d.components.map{it.controlId}.toSet()
        listOf(
            "HOME.HEADER","HOME.MACHINE.CARD","HOME.PROJECT.CARD","HOME.HERO",
            "HOME.AI.CARD","HOME.QUICK.DECK","HOME.MULTIFUNCTION.OPEN",
        ).forEach{assertTrue("missing $it",it in ids)}
        val expected=listOf(
            "NAV.HOME" to "首頁","NAV.CAD" to "CAD製圖","NAV.CAM" to "CAM加工",
            "NAV.SIM" to "3D走刀","NAV.MULTIFUNCTION" to "多功能",
            "NAV.NC" to "NC程式","NAV.AI" to "AI智慧",
        )
        val zh=AigUiLocalization.labels("zh-TW")
        expected.forEach{(id,text)->
            val c=d.components.single{it.controlId==id}
            assertNotNull(c.action)
            assertEquals(text,zh.getValue(c.labelKey!!))
        }
    }

    @Test fun homeLayoutsAreAdaptiveNonOverlappingAndTouchSafe(){
        listOf(Triple(1080f,1920f,2f),Triple(1920f,1080f,2f)).forEach{(w,h,d)->
            val nodes=HomeSceneLayout.nodes(w,h,d)
            val interactive=nodes.filterIsInstance<RgbGlassButtonNode>().filter{it.visible&&it.enabled}
            interactive.forEach{node->
                assertTrue("${node.id} width",node.bounds.width>=48f*d)
                assertTrue("${node.id} height",node.bounds.height>=48f*d)
            }
            interactive.indices.forEach{i->for(j in i+1 until interactive.size){
                val a=interactive[i].bounds;val b=interactive[j].bounds
                val overlap=a.left<b.right&&a.right>b.left&&a.top<b.bottom&&a.bottom>b.top
                assertFalse("overlap ${interactive[i].id} / ${interactive[j].id}",overlap)
            }}
            val hero=nodes.single{it.id=="HOME.HERO"}.bounds
            assertTrue("hero width priority",hero.width>=w*0.45f)
            assertTrue("hero height priority",hero.height>=h*0.25f)
        }
    }

    @Test fun missingRuntimeUsesTruthfulLocalStatusNeverFictionalTelemetry(){
        val labels=HomeLivePresentation.localOnly().labels("zh-TW")
        assertEquals("機台未連線",labels.getValue("home.machine.value"))
        assertEquals("尚無工作專案",labels.getValue("home.project.value"))
        assertEquals("AI 本機功能可用",labels.getValue("home.ai.value"))
        val all=labels.values.joinToString("|")
        assertFalse(all.contains("95%"))
        assertFalse(all.contains("S2300"))
    }

    @Test fun multifunctionHomeControlHasRealDedicatedRouteSkeleton(){
        assertEquals(SceneId.MULTIFUNCTION,SharedVisualPolicy.destination("NAV.MULTIFUNCTION"))
        assertEquals(SceneId.MULTIFUNCTION,HomeProfessionalDescriptor.descriptor().components.single{it.controlId=="HOME.MULTIFUNCTION.OPEN"}.let{(it.action as AigUiAction.Navigate).page.toSceneId()})
        assertEquals(FourthRenderRoute.MULTIFUNCTION,RenderRoutePolicy.forScene(SceneId.MULTIFUNCTION))
    }
}
