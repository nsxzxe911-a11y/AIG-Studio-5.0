package com.aigstudio.app

import android.os.Build

object RuntimeDeviceProfile {
    val isEmulator: Boolean by lazy {
        val fingerprint = Build.FINGERPRINT.lowercase()
        val model = Build.MODEL.lowercase()
        val manufacturer = Build.MANUFACTURER.lowercase()
        val brand = Build.BRAND.lowercase()
        val device = Build.DEVICE.lowercase()
        val product = Build.PRODUCT.lowercase()
        val hardware = Build.HARDWARE.lowercase()
        fingerprint.contains("generic") ||
            fingerprint.contains("emulator") ||
            model.contains("sdk_gphone") ||
            model.contains("emulator") ||
            manufacturer.contains("genymotion") ||
            hardware.contains("goldfish") ||
            hardware.contains("ranchu") ||
            (brand.startsWith("generic") && device.startsWith("generic")) ||
            product.contains("sdk")
    }

    val defaultSystemHudEnabled: Boolean get() = false
    val defaultTemperatureDisplayEnabled: Boolean get() = !isEmulator
    val systemMonitorIntervalMs: Long get() = if (isEmulator) 2_500L else 1_000L
    val temperatureIntervalMs: Long get() = if (isEmulator) 5_000L else 2_000L
    val verificationLabel: String get() = if (isEmulator) "EMULATOR VERIFICATION" else "PHYSICAL PERFORMANCE"
}
