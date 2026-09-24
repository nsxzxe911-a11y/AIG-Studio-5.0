import java.util.Properties

plugins {
    id("com.android.application")
    kotlin("android")
}

val releaseVersion = Properties().apply {
    rootProject.file("release-version.properties").inputStream().use { load(it) }
}

android {
    namespace = "com.aigstudio.app"
    compileSdk = 35
    defaultConfig {
        applicationId = "com.aigstudio.app"
        minSdk = 26
        targetSdk = 35
        versionCode = releaseVersion.getProperty("versionCode").toInt()
        versionName = releaseVersion.getProperty("versionName")
    }
}

kotlin { jvmToolchain(17) }

dependencies { implementation(project(":core")) }
