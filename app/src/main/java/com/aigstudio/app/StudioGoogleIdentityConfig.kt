package com.aigstudio.app

object StudioGoogleIdentityConfig {
    fun isReady(clientId: String): Boolean =
        clientId.trim().endsWith(".apps.googleusercontent.com")
}
