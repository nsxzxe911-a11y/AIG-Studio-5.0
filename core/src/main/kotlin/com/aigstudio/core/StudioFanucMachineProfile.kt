package com.aigstudio.core

object StudioFanucMachineProfile {
    val g34VendorProfile:G34VendorProfile =
        G34VendorProfile.xyJ0IDiameterKCount(defaultStartAngleDeg=90.0)

    fun rotaryProfile(optionalCodes:Set<String> = emptySet()):RotaryAxisClampProfile =
        RotaryAxisClampProfile.configured(
            installedOptionalCodes=optionalCodes,
            g34VendorProfile=g34VendorProfile,
        )
}
