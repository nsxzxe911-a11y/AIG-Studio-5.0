package com.aigstudio.runtime4.renderer

import com.aigstudio.runtime4.contract.SceneId

class SceneRouter(initial: SceneId = SceneId.HOME) {
    var current: SceneId = initial
        private set

    fun navigate(target: SceneId): SceneId {
        current = target
        return current
    }
}
