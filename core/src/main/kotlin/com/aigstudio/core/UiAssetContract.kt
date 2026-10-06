package com.aigstudio.core

object UiAssetContract {
    // Existing generated RGB button pack remains immutable for CAD/CAM/SIM/tool buttons.
    const val RGB_PACK_VERSION = "184"
    const val ANDROID_ROOT = "aig-generated-rgb/approved/" + RGB_PACK_VERSION
    const val DESKTOP_ROOT = "/aig-generated-rgb/approved/" + RGB_PACK_VERSION

    // Studio 372 canonical professional page visuals. app/desktop Gradle package
    // uiux/assets directly, so Android and Windows resolve the same binaries.
    const val HOME_PACK_VERSION = "372"
    const val HOME_PACK_ID = "MORNING_APPROVED_RGB_PLUS_CANONICAL_UIUX"
    const val CANONICAL_UI_ROOT = ""
    const val STARTUP_VISUAL = "startup.png"
    const val HOME_VISUAL = "home.png"
    const val CAD_VISUAL = "cad.png"
    const val CAM_VISUAL = "cam.jpg"
    const val SIM_VISUAL = "sim.jpg"
    const val MACHINE_VISUAL = "machine.jpg"
    const val AXIS3_VISUAL = "axis3.jpg"
    const val AXIS4_VISUAL = "axis4.png"
    const val AXIS5_VISUAL = "axis5.jpg"
    const val SIX_AXIS_VISUAL_POLICY = "PROCEDURAL_RGB_GLASS"
    const val SURFACE_MAP = "../uiux/professional-surface-map.json"

    // Startup retains its separately verified Studio-owned binary until the
    // final Morning binary import task replaces it with an exact approved copy.
    const val ANDROID_HOME_ROOT = "visuals"
    const val DESKTOP_HOME_ROOT = "/visuals"
    const val ANDROID_HOME_FILE = "studio_startup_original.png"
    const val DESKTOP_HOME_FILE = "studio_startup_original.png"
    const val HOME_APPROVAL_MANIFEST = "design/theme/startup-visual.sha256"
    const val HOME_AUTHORITY_SHA256 = "a2e7b24d32fb9c852b83ee176480f59cb43559fe152ac3e05e0aa2c52f0a82ac"
    const val ANDROID_HOME_SHA256 = HOME_AUTHORITY_SHA256
    const val DESKTOP_HOME_SHA256 = HOME_AUTHORITY_SHA256
}
