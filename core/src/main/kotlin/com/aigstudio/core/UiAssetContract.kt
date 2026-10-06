package com.aigstudio.core

object UiAssetContract {
    // Existing generated RGB button pack remains immutable for CAD/CAM/SIM/tool buttons.
    const val RGB_PACK_VERSION = "184"
    const val ANDROID_ROOT = "aig-generated-rgb/approved/" + RGB_PACK_VERSION
    const val DESKTOP_ROOT = "/aig-generated-rgb/approved/" + RGB_PACK_VERSION

    // Studio-owned approved startup/HOME visual. Android and Windows contain the
    // same binary and design/theme/startup-visual.sha256 is the authority file.
    const val HOME_PACK_VERSION = "371"
    const val HOME_PACK_ID = "STUDIO_APPROVED_STARTUP_HOME"
    const val ANDROID_HOME_ROOT = "visuals"
    const val DESKTOP_HOME_ROOT = "/visuals"
    const val ANDROID_HOME_FILE = "studio_startup_original.png"
    const val DESKTOP_HOME_FILE = "studio_startup_original.png"
    const val HOME_APPROVAL_MANIFEST = "design/theme/startup-visual.sha256"
    const val HOME_AUTHORITY_SHA256 = "a2e7b24d32fb9c852b83ee176480f59cb43559fe152ac3e05e0aa2c52f0a82ac"
    const val ANDROID_HOME_SHA256 = HOME_AUTHORITY_SHA256
    const val DESKTOP_HOME_SHA256 = HOME_AUTHORITY_SHA256
}
