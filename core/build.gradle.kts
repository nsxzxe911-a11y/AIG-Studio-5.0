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

tasks.register<JavaExec>("camManualMachiningContractRegression") {
    group = "verification"
    description = "Runs the focused CAM MANUAL machining completeness contract gate"
    dependsOn("testClasses")
    classpath = sourceSets["test"].runtimeClasspath
    mainClass.set("com.aigstudio.core.CamManualMachiningContractRegressionKt")
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


tasks.register<JavaExec>("coreRecoverySmoke") {
    group = "verification"
    description = "Focused REAL Studio core: MANUAL CAM, A/B/C, empty CAD, NC/project persistence"
    dependsOn("testClasses")
    classpath = sourceSets["test"].runtimeClasspath
    mainClass.set("com.aigstudio.core.CoreRecoverySmokeKt")
}

/** Explicit user-requested full core regression; original disabled
 * coreRegression task remains unchanged for historical policy accuracy.
 */
tasks.register<JavaExec>("coreDeepRecoveryRegression") {
    group = "verification"
    description = "Execute the full original core Regression main in core-first repair PR"
    dependsOn("testClasses")
    classpath = sourceSets["test"].runtimeClasspath
    mainClass.set("com.aigstudio.core.CoreRegressionTestKt")
}


tasks.register<JavaExec>("uiNavigationBindingRegression") {
    group = "verification"
    description = "Run ten-page real Button ID / Shared Command callback chain and reject mismatch"
    dependsOn("testClasses")
    classpath = sourceSets["test"].runtimeClasspath
    mainClass.set("com.aigstudio.core.UiNavigationBindingRegressionKt")
}
