package com.aigstudio.app

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class StudioEntryGateContractTest {
    @Test
    fun productionEntryOrderIsStartupLoginHomeOnly() {
        assertEquals(
            listOf(StudioEntryScreen.STARTUP, StudioEntryScreen.LOGIN, StudioEntryScreen.HOME),
            StudioEntryGateContract.productionOrder
        )
        assertTrue(StudioEntryGateContract.canTransition(StudioEntryScreen.STARTUP, StudioEntryScreen.LOGIN))
        assertTrue(StudioEntryGateContract.canTransition(StudioEntryScreen.LOGIN, StudioEntryScreen.HOME))
        assertFalse(StudioEntryGateContract.canTransition(StudioEntryScreen.STARTUP, StudioEntryScreen.HOME))
        assertFalse(StudioEntryGateContract.canTransition(StudioEntryScreen.HOME, StudioEntryScreen.LOGIN))
    }

    @Test
    fun startupUsesRgbAuthorityAndRealMilestones() {
        assertEquals("aig_mobile_login_master_q90", StudioEntryGateContract.STARTUP_BACKGROUND_ASSET)
        assertEquals(StudioEntryGateContract.STARTUP_BACKGROUND_ASSET, StudioEntryGateContract.LOGIN_BACKGROUND_ASSET)
        assertEquals(listOf(0, 25, 50, 75, 100), StudioEntryGateContract.startupProgress)
        assertFalse(StudioEntryGateContract.ENGINEERING_OVERLAY_ALLOWED)
    }

    @Test
    fun offlineDirectEntryDoesNotRequireNetworkOrCredentials() {
        assertFalse(StudioEntryGateContract.OFFLINE_DIRECT_REQUIRES_NETWORK)
        assertFalse(StudioEntryGateContract.OFFLINE_DIRECT_REQUIRES_CREDENTIALS)
        assertEquals(listOf(20, 45, 70, 90, 100), StudioEntryGateContract.offlineProgress)
    }

    @Test
    fun runtimeOverlaysAreForbiddenUntilAuthenticationPasses() {
        assertFalse(StudioEntryGateContract.runtimeOverlaysAllowed(sessionAuthenticated = false))
        assertTrue(StudioEntryGateContract.runtimeOverlaysAllowed(sessionAuthenticated = true))
    }
}
