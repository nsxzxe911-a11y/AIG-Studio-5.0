package com.aigstudio.app

enum class StudioEntryScreen {
    STARTUP,
    LOGIN,
    HOME
}

object StudioEntryGateContract {
    const val STARTUP_BACKGROUND_ASSET = "aig_mobile_login_master_q90"
    const val LOGIN_BACKGROUND_ASSET = STARTUP_BACKGROUND_ASSET
    const val ENGINEERING_OVERLAY_ALLOWED = false
    const val OFFLINE_DIRECT_REQUIRES_NETWORK = false
    const val OFFLINE_DIRECT_REQUIRES_CREDENTIALS = false

    val productionOrder = listOf(
        StudioEntryScreen.STARTUP,
        StudioEntryScreen.LOGIN,
        StudioEntryScreen.HOME
    )

    val startupProgress = listOf(0, 25, 50, 75, 100)
    val offlineProgress = listOf(20, 45, 70, 90, 100)

    fun canTransition(from: StudioEntryScreen, to: StudioEntryScreen): Boolean = when (from) {
        StudioEntryScreen.STARTUP -> to == StudioEntryScreen.LOGIN
        StudioEntryScreen.LOGIN -> to == StudioEntryScreen.HOME
        StudioEntryScreen.HOME -> false
    }

    fun runtimeOverlaysAllowed(sessionAuthenticated: Boolean): Boolean =
        sessionAuthenticated
}
