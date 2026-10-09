plugins {
    kotlin("jvm")
}

kotlin {
    jvmToolchain(17)
}

dependencies {
    testImplementation(kotlin("test"))
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

tasks.register<JavaExec>("sharedSettingsContractRegression") {
    group = "verification"
    description = "Checks shared Settings defaults, validation and truthful renderer options"
    dependsOn("testClasses")
    classpath = sourceSets["test"].runtimeClasspath
    mainClass.set("com.aigstudio.core.SharedSettingsContractRegressionKt")
}

tasks.register<JavaExec>("settingsLocalizationContractRegression") {
    group = "verification"
    description = "Checks Settings zh-TW/en-US keys and production locale state synchronization"
    dependsOn("testClasses")
    classpath = sourceSets["test"].runtimeClasspath
    mainClass.set("com.aigstudio.core.SettingsLocalizationContractRegressionKt")
}

tasks.register<JavaExec>("settingsAndroidWiringRegression") {
    group = "verification"
    description = "Checks Android shared Settings, truthful renderer and dialog localization wiring"
    dependsOn("testClasses")
    classpath = sourceSets["test"].runtimeClasspath
    mainClass.set("com.aigstudio.core.SettingsAndroidWiringRegressionKt")
}

tasks.register<JavaExec>("settingsDesktopWiringRegression") {
    group = "verification"
    description = "Checks Windows shared Settings, renderer truth, locale and FPS runtime wiring"
    dependsOn("testClasses")
    classpath = sourceSets["test"].runtimeClasspath
    mainClass.set("com.aigstudio.core.SettingsDesktopWiringRegressionKt")
}

tasks.register<JavaExec>("productionActionLinkRegression") {
    group = "verification"
    description = "Checks enabled product actions are linked and unavailable actions are explicitly disabled"
    dependsOn("testClasses")
    classpath = sourceSets["test"].runtimeClasspath
    mainClass.set("com.aigstudio.core.ProductionActionLinkRegressionKt")
}

tasks.register<JavaExec>("release373Regression") {
    group = "verification"
    description = "Checks forward-only AIG CNC 373 release metadata and preserves historical 372 evidence"
    dependsOn("testClasses")
    classpath = sourceSets["test"].runtimeClasspath
    mainClass.set("com.aigstudio.core.Release373RegressionKt")
}


tasks.register<JavaExec>("desktopVisualSettings374Regression") {
    group = "verification"
    description = "Checks AIG CNC Windows quality/power/RGB/HUD runtime consumers"
    dependsOn("testClasses")
    classpath = sourceSets["test"].runtimeClasspath
    mainClass.set("com.aigstudio.core.DesktopVisualSettings374RegressionKt")
}


tasks.register<JavaExec>("aiProgramWorkingCopy374Regression") {
    group = "verification"
    description = "Checks immutable NC main -> AI working copy -> verify -> explicit promote"
    dependsOn("testClasses")
    classpath = sourceSets["test"].runtimeClasspath
    mainClass.set("com.aigstudio.core.AiProgramWorkingCopy374RegressionKt")
}


tasks.register<JavaExec>("aiProgramWorkingCopyWiring374Regression") {
    group = "verification"
    description = "Checks AIG CNC Android/Windows AI program working-copy production wiring"
    dependsOn("testClasses")
    classpath = sourceSets["test"].runtimeClasspath
    mainClass.set("com.aigstudio.core.AiProgramWorkingCopyWiring374RegressionKt")
}


tasks.register<JavaExec>("cadLayerRuntime374Regression") {
    group = "verification"
    description = "Checks AIG CNC CAD layer metadata, V4 persistence, compatibility, and Android/Windows wiring"
    dependsOn("testClasses")
    classpath = sourceSets["test"].runtimeClasspath
    mainClass.set("com.aigstudio.core.CadLayerRuntime374RegressionKt")
}


tasks.register<JavaExec>("release374Regression") {
    group = "verification"
    description = "Checks forward-only AIG CNC 374 promotion and source-complete action contract"
    dependsOn("testClasses")
    classpath = sourceSets["test"].runtimeClasspath
    mainClass.set("com.aigstudio.core.Release374RegressionKt")
}


tasks.register<JavaExec>("release375TriStateRegression") {
    group = "verification"
    description = "Checks AIG CNC 375 shared three-state link release promotion"
    dependsOn("testClasses")
    classpath = sourceSets["test"].runtimeClasspath
    mainClass.set("com.aigstudio.core.Release375TriStateRegressionKt")
}

tasks.register<JavaExec>("release376LinkWaitingRegression") {
    group = "verification"
    description = "Checks AIG CNC 376 waiting presentation over three-state link truth"
    dependsOn("testClasses")
    classpath = sourceSets["test"].runtimeClasspath
    mainClass.set("com.aigstudio.core.Release376LinkWaitingRegressionKt")
}



tasks.register<JavaExec>("homeDirectEntries377Regression") {
    group = "verification"
    description = "Checks AIG CNC 377 direct HOME 3AX and NC/G-code entries on Android and Windows"
    dependsOn("testClasses")
    classpath = sourceSets["test"].runtimeClasspath
    mainClass.set("com.aigstudio.core.HomeDirectEntries377RegressionKt")
}
