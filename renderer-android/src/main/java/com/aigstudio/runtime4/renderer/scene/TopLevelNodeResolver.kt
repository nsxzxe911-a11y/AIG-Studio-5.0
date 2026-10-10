package com.aigstudio.runtime4.renderer
import com.aigstudio.runtime4.contract.SceneId

data class TopLevelNodeSources(
    val home:()->List<SceneNode>, val cad:()->List<SceneNode>, val cam:()->List<SceneNode>, val sim:()->List<SceneNode>,
    val axis3:()->List<SceneNode>, val axis4:()->List<SceneNode>, val axis5:()->List<SceneNode>, val axis6:()->List<SceneNode>,
    val nc:()->List<SceneNode>, val ai:()->List<SceneNode>,
)
object TopLevelNodeResolver {
    fun resolve(scene:SceneId,s:TopLevelNodeSources):List<SceneNode> = when(scene){
        SceneId.HOME->s.home(); SceneId.CAD->s.cad(); SceneId.CAM->s.cam(); SceneId.SIM->s.sim()
        SceneId.AXIS3->s.axis3(); SceneId.AXIS4->s.axis4(); SceneId.AXIS5->s.axis5(); SceneId.AXIS6->s.axis6()
        SceneId.NC->s.nc(); SceneId.AI->s.ai()
    }
}