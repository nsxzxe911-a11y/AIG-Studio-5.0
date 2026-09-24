plugins {
    id("com.android.application")
    kotlin("android")
}

android {
    namespace = "com.aigstudio.app"
    compileSdk = 35

    defaultConfig {
        applicationId = "com.aigstudio.app"
        minSdk = 26
        targetSdk = 35
        versionCode = 53500
        versionName = "5.35.0"
    }
}

kotlin {
    jvmToolchain(17)
}

dependencies {
    implementation(project(":core"))
}
