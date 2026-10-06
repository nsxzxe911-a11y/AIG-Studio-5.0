package com.aigstudio.app.ui.bridge

import com.aigstudio.core.ui.RuntimeAction
import com.aigstudio.core.ui.RuntimeActionKind
import com.aigstudio.core.ui.RuntimeActionSink
import com.aigstudio.core.ui.RuntimeSurface

class HomeCallbackBridge(
    private val navigate: (RuntimeSurface) -> Unit,
    private val settings: () -> Unit
) : RuntimeActionSink {
    override fun dispatch(action: RuntimeAction) {
        when (action.kind) {
            RuntimeActionKind.NAVIGATE -> runCatching {
                RuntimeSurface.valueOf(action.id.trim().uppercase())
            }.getOrNull()?.let(navigate)
            RuntimeActionKind.SETTINGS -> settings()
            else -> Unit
        }
    }
}
