import org.gradle.jvm.tasks.Jar

plugins {
    kotlin("jvm")
    application
}

dependencies {
    implementation(project(":core"))
}

kotlin {
    jvmToolchain(17)
}

application {
    mainClass.set("com.aigstudio.desktop.DesktopAppKt")
}

tasks.named<Jar>("jar") {
    archiveFileName.set("AIG_Studio_PC.jar")
}
