import org.gradle.jvm.tasks.Jar
import java.io.File

plugins {
    kotlin("jvm")
    application
}

val releaseVersionName = File(rootProject.projectDir, "release-version.properties")
    .readLines()
    .first { it.startsWith("versionName=") }
    .substringAfter("=").trim()
require(releaseVersionName.matches(Regex("""\d+\.\d+\.\d+"""))) { "Invalid release version: $releaseVersionName" }

dependencies {
    implementation(project(":core"))
}

kotlin {
    jvmToolchain(17)
}

application {
    mainClass.set("com.aigstudio.bootstrap.DesktopBootstrapKt")
    applicationDefaultJvmArgs = listOf("-Dfile.encoding=UTF-8", "-Daigstudio.version=$releaseVersionName")
}

tasks.named<Jar>("jar") {
    archiveFileName.set("AIG_Studio_PC.jar")
}
