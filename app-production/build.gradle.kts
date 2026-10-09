plugins { id("com.android.application") }
android {
    namespace = "com.aigstudio.production"
    compileSdk = 36
    defaultConfig {
        applicationId = "com.aigstudio.production.clean389"
        minSdk = 26
        targetSdk = 36
        versionCode = 389001
        versionName = "389-ai-update-repair"
    }
    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
}
dependencies { implementation(project(":core")) }

dependencies { implementation(project(":production-runtime")) }
