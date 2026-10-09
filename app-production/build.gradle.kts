plugins { id("com.android.application") }
android {
    namespace = "com.aigstudio.production"
    compileSdk = 36
    defaultConfig {
        applicationId = "com.aigstudio.production.clean394"
        minSdk = 26
        targetSdk = 36
        versionCode = 394001
        versionName = "394-cad-topology"
    }
    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
}
dependencies { implementation(project(":core")) }

dependencies { implementation(project(":production-runtime")) }
