plugins { id("com.android.application") }
android {
    namespace = "com.aigstudio.production"
    compileSdk = 36
    defaultConfig {
        applicationId = "com.aigstudio.production.clean387"
        minSdk = 26
        targetSdk = 36
        versionCode = 387001
        versionName = "387-clean-nc"
    }
    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
}
dependencies { implementation(project(":core")) }

dependencies { implementation(project(":production-runtime")) }
