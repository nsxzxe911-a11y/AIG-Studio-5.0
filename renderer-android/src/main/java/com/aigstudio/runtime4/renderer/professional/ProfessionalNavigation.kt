package com.aigstudio.runtime4.renderer

import com.aigstudio.runtime4.contract.PageId
import com.aigstudio.runtime4.contract.SceneId

fun PageId.toSceneId():SceneId=when(this){
    PageId.HOME->SceneId.HOME
    PageId.CAD->SceneId.CAD
    PageId.CAM->SceneId.CAM
    PageId.SIM->SceneId.SIM
    PageId.MULTIFUNCTION->SceneId.MULTIFUNCTION
    PageId.AXIS3->SceneId.AXIS3
    PageId.AXIS4->SceneId.AXIS4
    PageId.AXIS5->SceneId.AXIS5
    PageId.AXIS6->SceneId.AXIS6
    PageId.NC->SceneId.NC
    PageId.AI->SceneId.AI
}
