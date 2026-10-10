package com.aigstudio.runtime4.renderer

import com.aigstudio.runtime4.contract.SceneId

class AxisSceneRequest internal constructor(val generation: Long, val target: SceneId)

class AxisSceneHost(initial: SceneId = SceneId.HOME) {
    private var generation = 0L
    var activeScene: SceneId = initial
        private set
    var requestedScene: SceneId = initial
        private set

    fun request(target: SceneId): AxisSceneRequest {
        generation += 1L
        requestedScene = target
        return AxisSceneRequest(generation, target)
    }

    fun commit(request: AxisSceneRequest): Boolean {
        if (request.generation != generation || request.target != requestedScene) return false
        activeScene = request.target
        return true
    }

    fun navigateImmediate(target: SceneId): SceneId {
        commit(request(target))
        return activeScene
    }
}