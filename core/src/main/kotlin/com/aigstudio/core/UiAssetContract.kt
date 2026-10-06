package com.aigstudio.core

object UiAssetContract {
    // Existing generated RGB button pack remains immutable for CAD/CAM/SIM/tool buttons.
    const val RGB_PACK_VERSION = "184"
    const val ANDROID_ROOT = "aig-generated-rgb/approved/" + RGB_PACK_VERSION
    const val DESKTOP_ROOT = "/aig-generated-rgb/approved/" + RGB_PACK_VERSION

    // Shared Morning-approved HOME pack. The binaries are sourced from the
    // exact AIG-II authority SHA during release builds, verified, and then
    // embedded locally so Runtime stays offline-first.
    const val HOME_PACK_VERSION = "427"
    const val HOME_PACK_ID = "AIG_RGB_HOME_427"
    const val ANDROID_HOME_ROOT = "aig-generated-rgb/approved/" + HOME_PACK_VERSION
    const val DESKTOP_HOME_ROOT = "/aig-generated-rgb/approved/" + HOME_PACK_VERSION
    const val ANDROID_HOME_FILE = "home_mobile.jpg"
    const val DESKTOP_HOME_FILE = "home_desktop.jpg"
    const val HOME_AUTHORITY_REPO = "nsxzxe911-a11y/AIG-II"
    const val HOME_AUTHORITY_SHA = "221dd38fd4c24d9bb291f2d29ad9a54f324fc39a"
    const val ANDROID_HOME_SHA256 = "8835cded863074b4de9b848e12eb037254119b5a7f21e135b66657f764fbd652"
    const val DESKTOP_HOME_SHA256 = "02185fbd1dd8026ad17bf6cb1994bcd5a03d03e46b68bb45135d911d809ff9da"
}
