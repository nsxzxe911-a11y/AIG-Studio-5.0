package com.aigstudio.core

data class StudioPackage(
    val id: String,
    val version: String,
    val dependencies: Set<String> = emptySet(),
    val enabledByDefault: Boolean = true,
    val integrityRequired: Boolean = true
)

data class StudioPackageBundle(
    val id: String,
    val version: String,
    val packages: List<StudioPackage>
)

data class StudioPackageValidation(
    val ok: Boolean,
    val missingDependencies: List<String>,
    val duplicatePackages: List<String>,
    val disabledRequiredPackages: List<String>
)

object StudioPackageRegistry {
    val official = StudioPackageBundle(
        id = "aig-cnc-studio-official",
        version = "5.0",
        packages = listOf(
            StudioPackage("cad-core","5.0"),
            StudioPackage("cam-core","5.0",setOf("cad-core")),
            StudioPackage("material-removal-3d","5.0",setOf("cam-core")),
            StudioPackage("mesh-3d-renderer","5.0",setOf("cad-core","material-removal-3d")),
            StudioPackage("fanuc-nc-editor","5.0",setOf("cam-core")),
            StudioPackage("rgb-glass-ui","5.0",setOf("cad-core")),
            StudioPackage("chatgpt-ai-update","5.0",setOf("rgb-glass-ui")),
            StudioPackage("network-security","5.0",setOf("chatgpt-ai-update"))
        )
    )

    fun validate(
        bundle: StudioPackageBundle = official,
        enabled: Set<String> = bundle.packages.filter { it.enabledByDefault }.map { it.id }.toSet()
    ): StudioPackageValidation {
        val duplicates = bundle.packages.groupBy { it.id }.filterValues { it.size > 1 }.keys.sorted()
        val known = bundle.packages.map { it.id }.toSet()
        val missing = bundle.packages
            .filter { it.id in enabled }
            .flatMap { p -> p.dependencies.filter { it !in known || it !in enabled }.map { p.id + "->" + it } }
            .distinct()
            .sorted()
        val disabledRequired = bundle.packages
            .filter { it.enabledByDefault && it.id !in enabled }
            .map { it.id }
            .sorted()
        return StudioPackageValidation(
            ok = duplicates.isEmpty() && missing.isEmpty() && disabledRequired.isEmpty(),
            missingDependencies = missing,
            duplicatePackages = duplicates,
            disabledRequiredPackages = disabledRequired
        )
    }

    fun requireHealthy(
        bundle: StudioPackageBundle = official,
        enabled: Set<String> = bundle.packages.map { it.id }.toSet()
    ) {
        val result = validate(bundle, enabled)
        require(result.ok) {
            "Studio package bundle invalid: duplicates=" + result.duplicatePackages +
                ", missing=" + result.missingDependencies +
                ", disabledRequired=" + result.disabledRequiredPackages
        }
    }
}
