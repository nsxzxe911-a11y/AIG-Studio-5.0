package com.aigstudio.runtime4.renderer

import com.aigstudio.runtime4.contract.CadDispatchResult
import com.aigstudio.runtime4.contract.CadRuntimePort

class CadSceneController(private val runtime: CadRuntimePort) {
    private var toolGroupExpanded = false

    fun nodes(widthPx: Float, heightPx: Float, density: Float): List<SceneNode> =
        CadSceneLayout.nodes(widthPx, heightPx, density, toolGroupExpanded)

    fun activate(nodeId: String): CadDispatchResult? {
        if (nodeId == "CAD.TOOL_GROUP") {
            toolGroupExpanded = !toolGroupExpanded
            return null
        }
        val command = CadSceneLayout.commandFor(nodeId) ?: return null
        return runtime.dispatch(command)
    }

    fun state() = runtime.snapshot()
}
