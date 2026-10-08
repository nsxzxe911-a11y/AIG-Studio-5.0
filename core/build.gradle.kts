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

tasks.register<JavaExec>("rendererCapabilityNegotiationRegression") {
    group = "verification"
    description = "Checks AUTO renderer ordering and no-fake GPU backend selection"
    dependsOn("testClasses")
    classpath = sourceSets["test"].runtimeClasspath
    mainClass.set("com.aigstudio.core.RendererCapabilityNegotiationRegressionKt")
}

tasks.register<JavaExec>("rendererVisualQualityRegression") {
    group = "verification"
    description = "Checks visual quality presets, hardware downgrade, and machining precision isolation"
    dependsOn("testClasses")
    classpath = sourceSets["test"].runtimeClasspath
    mainClass.set("com.aigstudio.core.RendererVisualQualityRegressionKt")
}

tasks.register<JavaExec>("rendererVisualQualityWiringRegression") {
    group = "verification"
    description = "Checks AIG CNC Android visual quality runtime wiring"
    dependsOn("testClasses")
    classpath = sourceSets["test"].runtimeClasspath
    mainClass.set("com.aigstudio.core.RendererVisualQualityWiringRegressionKt")
}
