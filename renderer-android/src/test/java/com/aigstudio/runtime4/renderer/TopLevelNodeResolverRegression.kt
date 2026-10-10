package com.aigstudio.runtime4.renderer
import com.aigstudio.runtime4.contract.SceneId
import org.junit.Assert.*
import org.junit.Test
class TopLevelNodeResolverRegression {
 @Test fun everySceneResolvesItsOwnNodesWithoutHomeFallback(){
  fun n(id:String)=listOf(SceneNode(id,UiBounds(0f,0f,1f,1f),1))
  val s=TopLevelNodeSources(home={n("HOME")},cad={n("CAD")},cam={n("CAM")},sim={n("SIM")},axis3={n("AXIS3")},axis4={n("AXIS4")},axis5={n("AXIS5")},axis6={n("AXIS6")},nc={n("NC")},ai={n("AI")},multifunction={n("MULTIFUNCTION")})
  SceneId.entries.forEach{scene->assertEquals(scene.name,TopLevelNodeResolver.resolve(scene,s).single().id)}
 }
}
