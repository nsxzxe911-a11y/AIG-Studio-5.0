package com.aigstudio.runtime4.contract

import com.aigstudio.runtime4.contract.ui.*
import kotlin.test.*

class ProfessionalUiContractRegression {
    @Test fun navigationBindingsCoverEveryProfessionalPage(){
        val expected=setOf(
            PageId.HOME,PageId.CAD,PageId.CAM,PageId.SIM,PageId.MULTIFUNCTION,
            PageId.AXIS3,PageId.AXIS4,PageId.AXIS5,PageId.AXIS6,PageId.NC,PageId.AI,
        )
        val components=expected.map{page->
            AigUiComponent(
                controlId="NAV."+page.name,
                kind=AigUiKind.NAV,
                labelKey="nav."+page.name.lowercase(),
                iconAsset=null,
                state=AigUiState.NORMAL,
                enabled=true,
                visible=true,
                action=AigUiAction.Navigate(page),
            )
        }
        val descriptor=AigUiPageDescriptor(PageId.HOME,components)
        assertEquals(expected,descriptor.components.map{(it.action as AigUiAction.Navigate).page}.toSet())
    }

    @Test fun descriptorRejectsDuplicateControlIds(){
        val item=AigUiComponent("NAV.HOME",AigUiKind.NAV,"nav.home",null,AigUiState.NORMAL,true,true,AigUiAction.Navigate(PageId.HOME))
        assertFailsWith<IllegalArgumentException>{AigUiPageDescriptor(PageId.HOME,listOf(item,item))}
    }

    @Test fun visibleInteractiveComponentsRequireRealActions(){
        assertFailsWith<IllegalArgumentException>{
            AigUiComponent("HOME.FAKE",AigUiKind.BUTTON,"home.fake",null,AigUiState.NORMAL,true,true,null)
        }
        assertFailsWith<IllegalArgumentException>{
            AigUiComponent("HOME.CARD",AigUiKind.CARD,"home.card",null,AigUiState.NORMAL,true,true,null)
        }
    }

    @Test fun visibleLabelsRequireNonblankLocalizationKeys(){
        assertFailsWith<IllegalArgumentException>{
            AigUiComponent("HOME.LABEL",AigUiKind.LABEL,"",null,AigUiState.NORMAL,true,true,null)
        }
    }

    @Test fun actionsWrapExistingTypedDomainCommands(){
        assertEquals(CadCommand.Undo,(AigUiAction.Cad(CadCommand.Undo)).command)
        assertEquals(CamCommand.StartManual,(AigUiAction.Cam(CamCommand.StartManual)).command)
        assertEquals(NcCommand.ToggleBlockSkip,(AigUiAction.Nc(NcCommand.ToggleBlockSkip)).command)
        assertEquals(AiCommand.Verify,(AigUiAction.Ai(AiCommand.Verify)).command)
        assertEquals(AigSimCommand.STEP,(AigUiAction.Sim(AigSimCommand.STEP)).command)
    }

    @Test fun localeChangesPresentationOnlyNeverIdentityOrAction(){
        val component=AigUiComponent("NAV.HOME",AigUiKind.NAV,"nav.home",null,AigUiState.NORMAL,true,true,AigUiAction.Navigate(PageId.HOME))
        val zh=mapOf("nav.home" to "首頁")
        val en=mapOf("nav.home" to "Home")
        val key=component.labelKey ?: error("NAV.HOME labelKey missing")
        assertEquals("首頁",zh.getValue(key))
        assertEquals("Home",en.getValue(key))
        assertEquals("NAV.HOME",component.controlId)
        assertEquals(AigUiAction.Navigate(PageId.HOME),component.action)
    }
}
