package com.aigstudio.core.ui

enum class RuntimeSurface {
    HOME, CAD, CAM, SIM, AXIS3, AXIS4, AXIS5, AXIS6, NC, AI
}

enum class RuntimeLayoutClass {
    PHONE_PORTRAIT,
    PHONE_LANDSCAPE,
    TABLET,
    DESKTOP
}

data class RuntimeViewport(
    val widthDp: Int,
    val heightDp: Int,
    val density: Float,
    val layoutClass: RuntimeLayoutClass
) {
    val isLandscape: Boolean get() = widthDp > heightDp
    val compact: Boolean get() = layoutClass == RuntimeLayoutClass.PHONE_PORTRAIT
}

object RuntimeResponsivePolicy {
    fun classify(widthDp: Int, heightDp: Int, density: Float = 1f): RuntimeViewport {
        require(widthDp > 0 && heightDp > 0) { "Viewport dimensions must be positive" }
        val layout = when {
            widthDp >= 1100 -> RuntimeLayoutClass.DESKTOP
            widthDp >= 720 -> RuntimeLayoutClass.TABLET
            widthDp > heightDp -> RuntimeLayoutClass.PHONE_LANDSCAPE
            else -> RuntimeLayoutClass.PHONE_PORTRAIT
        }
        return RuntimeViewport(widthDp, heightDp, density.coerceAtLeast(0.5f), layout)
    }
}

enum class RuntimeActionKind {
    NAVIGATE,
    TOOL,
    EDIT,
    COMMAND,
    SETTINGS
}

data class RuntimeAction(
    val kind: RuntimeActionKind,
    val id: String,
    val payload: Map<String, String> = emptyMap()
)

fun interface RuntimeActionSink {
    fun dispatch(action: RuntimeAction)
}

data class RuntimeModuleDescriptor(
    val surface: RuntimeSurface,
    val title: String,
    val groups: List<String>
)

object RuntimeModuleCatalog {
    val modules: List<RuntimeModuleDescriptor> = listOf(
        RuntimeModuleDescriptor(RuntimeSurface.HOME, "HOME", listOf("PROJECT", "STATUS", "QUICK")),
        RuntimeModuleDescriptor(RuntimeSurface.CAD, "CAD", listOf("DRAW", "EDIT", "SNAP", "VIEW")),
        RuntimeModuleDescriptor(RuntimeSurface.CAM, "CAM", listOf("SOURCE", "TOOLPATH", "AVOID", "VIEW")),
        RuntimeModuleDescriptor(RuntimeSurface.SIM, "SIM", listOf("PLAYBACK", "MATERIAL", "VIEW")),
        RuntimeModuleDescriptor(RuntimeSurface.AXIS3, "3AX", listOf("MOTION", "PLAYBACK", "VIEW")),
        RuntimeModuleDescriptor(RuntimeSurface.AXIS4, "4AX", listOf("A", "PLAYBACK", "VIEW")),
        RuntimeModuleDescriptor(RuntimeSurface.AXIS5, "5AX", listOf("A", "B", "PLAYBACK", "VIEW")),
        RuntimeModuleDescriptor(RuntimeSurface.AXIS6, "6AX", listOf("A", "B", "C", "PLAYBACK", "VIEW")),
        RuntimeModuleDescriptor(RuntimeSurface.NC, "NC", listOf("EDITOR", "KEYPAD", "ALARM")),
        RuntimeModuleDescriptor(RuntimeSurface.AI, "AI", listOf("ASSIST", "UPDATE", "RECOVERY"))
    )

    fun descriptor(surface: RuntimeSurface): RuntimeModuleDescriptor =
        modules.first { it.surface == surface }
}
