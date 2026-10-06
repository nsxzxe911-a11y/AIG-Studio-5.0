package com.aigstudio.app.ui.bridge

import com.aigstudio.core.ui.RuntimeAction
import com.aigstudio.core.ui.RuntimeActionKind
import com.aigstudio.core.ui.RuntimeActionSink

/** Routes modular CAD controls back to the proven CadView/MainActivity callbacks. */
class CadCallbackBridge(
    private val tool: (String) -> Unit,
    private val edit: (String) -> Unit,
    private val command: (String) -> Unit
) : RuntimeActionSink {
    override fun dispatch(action: RuntimeAction) {
        when (action.kind) {
            RuntimeActionKind.TOOL -> tool(action.id)
            RuntimeActionKind.EDIT -> edit(action.id)
            RuntimeActionKind.COMMAND -> command(action.id)
            else -> Unit
        }
    }
}
