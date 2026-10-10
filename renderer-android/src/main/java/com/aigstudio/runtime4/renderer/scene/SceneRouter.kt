package com.aigstudio.runtime4.renderer

import com.aigstudio.runtime4.contract.SceneId

class SceneRouter(initial: SceneId = SceneId.HOME) {
    private val host = AxisSceneHost(initial)
    val current: SceneId get() = host.activeScene

    fun navigate(target: SceneId): SceneId = host.navigateImmediate(target)
    fun request(target: SceneId): AxisSceneRequest = host.request(target)
    fun commit(request: AxisSceneRequest): Boolean = host.commit(request)
}