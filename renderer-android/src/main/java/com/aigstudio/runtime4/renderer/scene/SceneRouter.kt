package com.aigstudio.runtime4.renderer

import com.aigstudio.runtime4.contract.SceneId

private fun canonicalScene(scene:SceneId):SceneId=
    if(scene==SceneId.MULTIFUNCTION) SceneId.HOME else scene

class SceneRouter(initial: SceneId = SceneId.HOME) {
    private val host = AxisSceneHost(canonicalScene(initial))
    val current: SceneId get() = host.activeScene

    fun navigate(target: SceneId): SceneId = host.navigateImmediate(canonicalScene(target))
    fun request(target: SceneId): AxisSceneRequest = host.request(canonicalScene(target))
    fun commit(request: AxisSceneRequest): Boolean = host.commit(request)
}
