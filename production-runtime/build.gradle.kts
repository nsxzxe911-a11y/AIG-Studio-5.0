plugins { kotlin("jvm") }

dependencies { implementation(project(":core")) }

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
