package com.aigstudio.app.ui

import android.content.Context
import android.view.View
import com.aigstudio.core.ui.RuntimeActionSink
import com.aigstudio.core.ui.RuntimeSurface
import com.aigstudio.core.ui.RuntimeViewport

interface AndroidRuntimeUiModule {
    val surface: RuntimeSurface

    fun create(
        context: Context,
        viewport: RuntimeViewport,
        actions: RuntimeActionSink
    ): View

    fun bind(actions: RuntimeActionSink) = Unit
    fun onViewportChanged(viewport: RuntimeViewport) = Unit
    fun onActivated() = Unit
    fun onDeactivated() = Unit
}

class AndroidRuntimeUiRegistry(
    modules: Iterable<AndroidRuntimeUiModule> = emptyList()
) {
    private val bySurface = linkedMapOf<RuntimeSurface, AndroidRuntimeUiModule>()

    init {
        modules.forEach(::register)
    }

    fun register(module: AndroidRuntimeUiModule) {
        require(bySurface.put(module.surface, module) == null) {
            "Duplicate Android Runtime UI module: ${module.surface}"
        }
    }

    fun require(surface: RuntimeSurface): AndroidRuntimeUiModule =
        bySurface[surface] ?: error("Android Runtime UI module missing: $surface")

    fun registeredSurfaces(): Set<RuntimeSurface> = bySurface.keys.toSet()
}
