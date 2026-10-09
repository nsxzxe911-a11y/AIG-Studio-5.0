plugins { kotlin("jvm") }

dependencies {
    implementation(project(":core"))
    implementation(project(":runtime-contract"))
    testImplementation(kotlin("test-junit5"))
}

kotlin { jvmToolchain(17) }

tasks.register<JavaExec>("cleanCadRegression") {
    dependsOn("testClasses")
    classpath = sourceSets["test"].runtimeClasspath
    mainClass.set("com.aigstudio.production.runtime.CleanCadSessionRegressionKt")
}

tasks.register<JavaExec>("cleanCamRegression") {
    dependsOn("testClasses")
    classpath = sourceSets["test"].runtimeClasspath
    mainClass.set("CleanCamSessionRegressionKt")
}

tasks.register<JavaExec>("cleanSimRegression") {
    dependsOn("testClasses")
    classpath = sourceSets["test"].runtimeClasspath
    mainClass.set("CleanSimSessionRegressionKt")
}


tasks.register<JavaExec>("cleanAxisRegression") {
    dependsOn("testClasses")
    classpath = sourceSets["test"].runtimeClasspath
    mainClass.set("CleanAxisSessionRegressionKt")
}

tasks.register<JavaExec>("cleanNcRegression") {
    dependsOn("testClasses")
    classpath = sourceSets["test"].runtimeClasspath
    mainClass.set("CleanNcSessionRegressionKt")
}

tasks.register<JavaExec>("cleanAiRegression") {
    dependsOn("testClasses")
    classpath = sourceSets["test"].runtimeClasspath
    mainClass.set("CleanAiSessionRegressionKt")
}

tasks.register<JavaExec>("cleanAiUpdateRegression") {
    dependsOn("testClasses")
    classpath = sourceSets["test"].runtimeClasspath
    mainClass.set("CleanAiUpdateSessionRegressionKt")
}
tasks.register<JavaExec>("cleanAiContinuityRegression") {
    dependsOn("testClasses")
    classpath = sourceSets["test"].runtimeClasspath
    mainClass.set("CleanAiContinuitySessionRegressionKt")
}
tasks.register<JavaExec>("cleanCadAdvancedRegression") {
    dependsOn("testClasses")
    classpath = sourceSets["test"].runtimeClasspath
    mainClass.set("CleanCadAdvancedRegressionKt")
}


tasks.register<JavaExec>("cleanCadCornerRegression") {
    dependsOn("testClasses")
    classpath = sourceSets["test"].runtimeClasspath
    mainClass.set("CleanCadCornerRegressionKt")
}


tasks.register<JavaExec>("cleanCadSnapRegression") {
    dependsOn("testClasses")
    classpath = sourceSets["test"].runtimeClasspath
    mainClass.set("CleanCadSnapRegressionKt")
}


tasks.register<JavaExec>("cleanCadTopologyRegression") {
    dependsOn("testClasses")
    classpath = sourceSets["test"].runtimeClasspath
    mainClass.set("CleanCadTopologyRegressionKt")
}

tasks.test { useJUnitPlatform() }
