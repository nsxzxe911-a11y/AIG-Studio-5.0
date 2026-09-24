plugins {
    kotlin("jvm")
}

kotlin {
    jvmToolchain(17)
}

tasks.register<JavaExec>("coreRegression") {
    dependsOn("testClasses")
    classpath = sourceSets["test"].runtimeClasspath
    mainClass.set("com.aigstudio.core.CoreRegressionTestKt")
}
