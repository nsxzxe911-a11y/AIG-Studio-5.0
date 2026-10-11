package com.aigstudio.runtime4.renderer
import com.aigstudio.runtime4.contract.*
import org.junit.Assert.*
import org.junit.Test
class FullProductNavigationRegression{
 private val required=setOf("NAV.HOME","NAV.CAD","NAV.CAM","NAV.SIM","NAV.3AX","NAV.4AX","NAV.5AX","NAV.6AX","NAV.NC","NAV.AI")
 private fun assertFull(nodes:List<SceneNode>,selected:String){val buttons=nodes.filterIsInstance<RgbGlassButtonNode>();val ids=buttons.map{it.id}.toSet();assertTrue(ids.containsAll(required));assertEquals(VisualState.SELECTED,buttons.first{it.id==selected}.visualState)}
 @Test fun cadCamNcKeepFullProductNavigation(){assertFull(CadSceneLayout.nodes(1080f,1920f,2f,false),"NAV.CAD");assertFull(CamSceneLayout.nodes(1080f,1920f,2f,CamState.initial()),"NAV.CAM");assertFull(NcSceneLayout.nodes(1080f,1920f,2f,NcState.initial()),"NAV.NC")}
}
