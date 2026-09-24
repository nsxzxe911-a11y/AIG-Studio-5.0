import java.util.Properties

plugins {
    id("com.android.application")
    kotlin("android")
}

val releaseVersion = Properties().apply {
    rootProject.file("../release-version.properties").inputStream().use { load(it) }
}
val releaseVersionName = releaseVersion.getProperty("versionName")
    ?: error("versionName is required")
val releaseMajor = releaseVersionName.substringBefore('.').toInt()
val releaseVersionCode = releaseMajor * 10000

android {
    namespace = "com.aigstudio.app"
    compileSdk = 35
    defaultConfig {
        applicationId = "com.aigstudio.app"
        minSdk = 26
        targetSdk = 35
        versionCode = releaseVersionCode
        versionName = releaseVersionName
    }
}

kotlin { jvmToolchain(17) }

dependencies { implementation(project(":core")) }
