package com.aigstudio.core.ui

/**
 * Product Runtime page lifecycle.
 *
 * The approved AIG RGB visual is mounted first. Functional content is never
 * allowed to become READY before the visual, skin and callbacks are attached.
 */
enum class RuntimeMountStage {
    ASSET,
    SKIN,
    VIEW,
    CALLBACK,
    READY
}

data class RuntimePageMountSpec(
    val surface: RuntimeSurface,
    val visualAsset: String,
    val overlayPolicy: String,
    val assetFirst: Boolean = true,
    val lazyFunctionGroups: Boolean = true,
    val groups: List<String> = RuntimeModuleCatalog.descriptor(surface).groups
)

class RuntimePageMountState(val spec: RuntimePageMountSpec) {
    private val completed = mutableListOf<RuntimeMountStage>()

    fun mark(stage: RuntimeMountStage) {
        val order = RuntimeMountStage.entries
        val expected = order.getOrNull(completed.size)
            ?: error("Runtime page already READY: ${spec.surface}")
        require(stage == expected) {
            "Runtime page mount order violation: ${spec.surface} expected=$expected actual=$stage"
        }
        completed += stage
    }

    fun has(stage: RuntimeMountStage): Boolean = stage in completed
    fun completedStages(): List<RuntimeMountStage> = completed.toList()
    val ready: Boolean get() = completed.lastOrNull() == RuntimeMountStage.READY
}

object RuntimePageMountCatalog {
    val specs: List<RuntimePageMountSpec> = listOf(
        RuntimePageMountSpec(RuntimeSurface.HOME, "home.png", "AIG_RGB_HOME"),
        RuntimePageMountSpec(RuntimeSurface.CAD, "cad.png", "AIG_RGB_CAD+LIVE_2D_CANVAS"),
        RuntimePageMountSpec(RuntimeSurface.CAM, "cam.jpg", "AIG_RGB_CAM+LIVE_TOOLPATH"),
        RuntimePageMountSpec(RuntimeSurface.SIM, "sim.jpg", "AIG_RGB_SIM+LIVE_REMOVAL"),
        RuntimePageMountSpec(RuntimeSurface.AXIS3, "axis3.jpg", "AIG_RGB_3AX+LIVE_MACHINE_MODEL"),
        RuntimePageMountSpec(RuntimeSurface.AXIS4, "axis4.png", "AIG_RGB_4AX+LIVE_A"),
        RuntimePageMountSpec(RuntimeSurface.AXIS5, "axis5.jpg", "AIG_RGB_5AX+LIVE_AB"),
        RuntimePageMountSpec(RuntimeSurface.AXIS6, "machine.jpg", "PROCEDURAL_RGB_GLASS+LIVE_ABC_6AX_MODEL"),
        RuntimePageMountSpec(RuntimeSurface.NC, "machine.jpg", "AIG_RGB_MACHINE+LIVE_NC_EDITOR"),
        RuntimePageMountSpec(RuntimeSurface.AI, "home.png", "AIG_RGB_HOME+LIVE_AI_PANEL")
    )

    private val bySurface = specs.associateBy { it.surface }

    init {
        require(specs.all { it.assetFirst }) { "Every Runtime page must mount AIG RGB asset first" }
        require(specs.all { it.lazyFunctionGroups }) { "Function groups must be lazy to keep the page light" }
        require(bySurface.keys == RuntimeSurface.entries.toSet()) {
            "Runtime page mount catalog must cover every RuntimeSurface exactly once"
        }
    }

    fun spec(surface: RuntimeSurface): RuntimePageMountSpec =
        bySurface[surface] ?: error("Runtime page mount spec missing: $surface")
}
