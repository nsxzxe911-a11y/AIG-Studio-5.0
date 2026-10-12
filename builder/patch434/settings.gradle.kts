pluginManagement { repositories { google(); mavenCentral(); gradlePluginPortal() } }
dependencyResolutionManagement { repositoriesMode.set(RepositoriesMode.FAIL_ON_PROJECT_REPOS); repositories { google(); mavenCentral() } }
rootProject.name = "AIG-Fifth-435"
include(":app",":core-ui",":core-cad",":core-cam",":core-fanuc",":core-sync",":core-settings",":feature-home",":feature-cad",":feature-cam",":feature-nc",":renderer-unity-api")
