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
val uiVerifySideLoad = providers.gradleProperty("aigUiVerifySideLoad").orNull == "true"
val googleWebClientId = providers.gradleProperty("AIG_GOOGLE_WEB_CLIENT_ID").orNull
    ?: System.getenv("AIG_GOOGLE_WEB_CLIENT_ID").orEmpty()
val googleWebClientIdLiteral = "\"" + googleWebClientId
    .replace("\\", "\\\\")
    .replace("\"", "\\\"") + "\""

android {
    namespace = "com.aigstudio.app"
    compileSdk = androidCompileSdk
    defaultConfig {
        applicationId = if (uiVerifySideLoad) "com.aigstudio.app.uiverify$releaseMajor" else "com.aigstudio.app"
        minSdk = 26
        targetSdk = androidTargetSdk
        versionCode = releaseVersionCode
        versionName = releaseVersionName
        buildConfigField("String", "GOOGLE_WEB_CLIENT_ID", googleWebClientIdLiteral)
    }
    sourceSets.getByName("main").assets.srcDir(rootProject.file("shared/tutorial"))
    buildFeatures {
        buildConfig = true
    }
    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
}

dependencies {
    implementation(project(":core"))
    implementation("androidx.credentials:credentials:1.6.0")
    implementation("androidx.credentials:credentials-play-services-auth:1.6.0")
    implementation("com.google.android.libraries.identity.googleid:googleid:1.1.1")
    testImplementation("junit:junit:4.13.2")
}

tasks.register("verifyAndroidPlatform") {
    doLast {
        check(androidCompileSdk == 36) { "compileSdk must track current stable Android API 36: $androidCompileSdk" }
        check(androidTargetSdk == 36) { "targetSdk must track current stable Android API 36: $androidTargetSdk" }
        println("STUDIO_ANDROID_PLATFORM_BASELINE_PASS|API_36_STABLE|AGP_9_4_0|BUILT_IN_KOTLIN|NO_BUILD_TOOLS_PIN|API_37_PREVIEW_NOT_RELEASE_BASELINE")
        println("STUDIO_ANDROID_INSTALL_IDENTITY|"+if(uiVerifySideLoad)"UI_VERIFY_SIDELOAD|com.aigstudio.app.uiverify$releaseMajor" else "PRODUCTION|com.aigstudio.app")
    }
}
