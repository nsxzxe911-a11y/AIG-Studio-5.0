plugins { id("com.android.application") }
android {
    namespace = "com.aigstudio.production"
    compileSdk = 36
    defaultConfig {
        applicationId = "com.aigstudio.production.clean386"
        minSdk = 26
        targetSdk = 36
        versionCode = 386001
        versionName = "386-clean-456ax"
    }
    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
}
dependencies { implementation(project(":core")) }

dependencies { implementation(project(":production-runtime")) }
