package com.aigstudio.core

object UiAssetContract {
    // Existing generated RGB button pack remains immutable for CAD/CAM/SIM/tool buttons.
    const val RGB_PACK_VERSION = "184"
    const val ANDROID_ROOT = "aig-generated-rgb/approved/" + RGB_PACK_VERSION
    const val DESKTOP_ROOT = "/aig-generated-rgb/approved/" + RGB_PACK_VERSION

    // Separate AI-generated HOME pack. Never replace the 184 button pack.
    const val HOME_PACK_VERSION = "416"
    const val HOME_PACK_ID = "AIG_RGB_HOME_416"
    const val ANDROID_HOME_ROOT = "aig-generated-rgb/approved/" + HOME_PACK_VERSION
    const val DESKTOP_HOME_ROOT = "/aig-generated-rgb/approved/" + HOME_PACK_VERSION
    const val ANDROID_HOME_FILE = "home_mobile.jpg"
    const val DESKTOP_HOME_FILE = "home_desktop.jpg"
}
