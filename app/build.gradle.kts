import java.util.Properties

plugins {
    id("com.android.application")
}

val releaseVersion = Properties().apply {
    rootProject.file("release-version.properties").inputStream().use { load(it) }
}
val releaseVersionName = releaseVersion.getProperty("versionName")
    ?: error("versionName is required")
val releaseMajor = releaseVersionName.substringBefore('.').toInt()
val releaseVersionCode = releaseMajor * 10000
val androidCompileSdk = 36
val androidTargetSdk = 36

android {
    namespace = "com.aigstudio.app"
    compileSdk = androidCompileSdk
    defaultConfig {
        applicationId = "com.aigstudio.app"
        minSdk = 26
        targetSdk = androidTargetSdk
        versionCode = releaseVersionCode
        versionName = releaseVersionName
    }
    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
}

dependencies { implementation(project(":core")) }

tasks.register("verifyAndroidPlatform") {
    doLast {
        check(androidCompileSdk >= 36) { "compileSdk downgrade blocked: $androidCompileSdk" }
        check(androidTargetSdk >= 36) { "targetSdk downgrade blocked: $androidTargetSdk" }
    }
}
