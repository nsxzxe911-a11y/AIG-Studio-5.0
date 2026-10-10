plugins { id("com.android.application") }

android {
    namespace = "com.aigstudio.runtime4.host"
    compileSdk = 36
    defaultConfig {
        applicationId = "com.aigstudio.production.fourth395"
        minSdk = 26
        targetSdk = 36
        versionCode = 411001
        versionName = "411-fourth-professional-multifunction"
    }
    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
}

dependencies {
    implementation(project(":runtime-contract"))
    implementation(project(":production-runtime"))
    implementation(project(":renderer-android"))
    testImplementation("junit:junit:4.13.2")
}

tasks.matching { it.name.endsWith("UnitTest") }.configureEach {
    inputs.file(project.layout.projectDirectory.file("build.gradle.kts"))
}


