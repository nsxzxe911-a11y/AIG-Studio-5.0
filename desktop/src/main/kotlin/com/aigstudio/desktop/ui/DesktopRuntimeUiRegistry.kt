package com.aigstudio.desktop.ui

import com.aigstudio.core.ui.RuntimeActionSink
import com.aigstudio.core.ui.RuntimeSurface
import com.aigstudio.core.ui.RuntimeViewport
import javax.swing.JComponent

interface DesktopRuntimeUiModule {
    val surface: RuntimeSurface

    fun create(
        viewport: RuntimeViewport,
        actions: RuntimeActionSink
    ): JComponent

    fun onViewportChanged(viewport: RuntimeViewport) = Unit
    fun onActivated() = Unit
    fun onDeactivated() = Unit
}

class DesktopRuntimeUiRegistry(
    modules: Iterable<DesktopRuntimeUiModule> = emptyList()
) {
    private val bySurface = linkedMapOf<RuntimeSurface, DesktopRuntimeUiModule>()

    init {
        modules.forEach(::register)
    }

    fun register(module: DesktopRuntimeUiModule) {
        require(bySurface.put(module.surface, module) == null) {
            "Duplicate Desktop Runtime UI module: ${module.surface}"
        }
    }

    fun require(surface: RuntimeSurface): DesktopRuntimeUiModule =
        bySurface[surface] ?: error("Desktop Runtime UI module missing: $surface")

    fun registeredSurfaces(): Set<RuntimeSurface> = bySurface.keys.toSet()
}
