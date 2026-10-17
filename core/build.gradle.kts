plugins {
    kotlin("jvm")
}

kotlin {
    jvmToolchain(17)
}

tasks.register<JavaExec>("coreRegression") {
    enabled = false
    description = "DISABLED BY USER POLICY: regression execution requires explicit user approval"
    dependsOn("testClasses")
    classpath = sourceSets["test"].runtimeClasspath
    mainClass.set("com.aigstudio.core.CoreRegressionTestKt")
}

tasks.register<JavaExec>("runtimeLinkRegression") {
    group = "verification"
    description = "Runs the focused HOME/Cockpit runtime-link synchronization gate"
    dependsOn("testClasses")
    classpath = sourceSets["test"].runtimeClasspath
    mainClass.set("com.aigstudio.core.RuntimeLinkRegressionKt")
}

tasks.register<JavaExec>("openRuntimePolicyRegression") {
    group = "verification"
    description = "Runs the focused full-open runtime policy gate"
    dependsOn("testClasses")
    classpath = sourceSets["test"].runtimeClasspath
    mainClass.set("com.aigstudio.core.OpenRuntimePolicyRegressionKt")
}

tasks.register<JavaExec>("tutorialPresentationRegression") {
    group = "verification"
    description = "Runs the focused Tutorial V1 banter/expression immutability gate"
    dependsOn("testClasses")
    classpath = sourceSets["test"].runtimeClasspath
    mainClass.set("com.aigstudio.core.tutorial.TutorialPresentationRegressionKt")
}

tasks.register<JavaExec>("rgbGlobalSkinRegression") {
    group = "verification"
    description = "Runs the focused AIG RGB Global Skin V1 semantic contract gate"
    dependsOn("testClasses")
    classpath = sourceSets["test"].runtimeClasspath
    mainClass.set("com.aigstudio.core.AigRgbGlobalSkinRegressionKt")
}

val pageAutonomyRegressionClasses = linkedMapOf(
    "pageRuntimeContractRegression" to "com.aigstudio.core.PageRuntimeContractRegressionKt",
    "pageCommandCatalogRegression" to "com.aigstudio.core.PageCommandCatalogRegressionKt",
    "cadPageRuntimeRegression" to "com.aigstudio.core.CadPageRuntimeRegressionKt",
    "camPageRuntimeRegression" to "com.aigstudio.core.CamPageRuntimeRegressionKt",
    "simAcceptancePolicyRegression" to "com.aigstudio.core.SimAcceptancePolicyRegressionKt",
    "simPageRuntimeRegression" to "com.aigstudio.core.SimPageRuntimeRegressionKt",
    "axisPageRuntimeRegression" to "com.aigstudio.core.AxisPageRuntimeRegressionKt",
    "ncSixAxisCompatibilityRegression" to "com.aigstudio.core.NcSixAxisCompatibilityRegressionKt",
    "fanucM98RepeatRegression" to "com.aigstudio.core.FanucM98RepeatRegressionKt",
    "ncCannedCyclePlannerRegression" to "com.aigstudio.core.NcCannedCyclePlannerRegressionKt",
    "ncFirstMotionRegression" to "com.aigstudio.core.NcFirstMotionRegressionKt",
    "fanucPostRuntimeRegression" to "com.aigstudio.core.FanucPostRuntimeRegressionKt",
    "ncPageRuntimeRegression" to "com.aigstudio.core.NcPageRuntimeRegressionKt",
    "homePageRuntimeRegression" to "com.aigstudio.core.HomePageRuntimeRegressionKt",
    "runtimePageBridgeRegression" to "com.aigstudio.core.RuntimePageBridgeRegressionKt",
    "machiningOrchestratorRegression" to "com.aigstudio.core.MachiningOrchestratorRegressionKt",
    "aiPageRuntimeRegression" to "com.aigstudio.core.AiPageRuntimeRegressionKt",
)

val pageAutonomyRegressionTasks = pageAutonomyRegressionClasses.map { (taskName, mainClassName) ->
    tasks.register<JavaExec>(taskName) {
        group = "verification"
        description = "Runs $mainClassName"
        dependsOn("testClasses")
        classpath = sourceSets["test"].runtimeClasspath
        mainClass.set(mainClassName)
    }
}

tasks.register("pageAutonomyRegression") {
    group = "verification"
    description = "Runs focused PageRuntime/Fanuc/bridge/AI regression mains"
    dependsOn(pageAutonomyRegressionTasks)
    dependsOn("runtimeLinkRegression")
}
