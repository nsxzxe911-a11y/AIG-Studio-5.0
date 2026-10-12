package com.aigstudio.app

import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class StudioGoogleIdentityConfigTest {
    @Test
    fun onlyRealGoogleWebClientIdsAreReady() {
        assertFalse(StudioGoogleIdentityConfig.isReady(""))
        assertFalse(StudioGoogleIdentityConfig.isReady("demo-client"))
        assertTrue(StudioGoogleIdentityConfig.isReady("123456.apps.googleusercontent.com"))
        assertTrue(StudioGoogleIdentityConfig.isReady(" 123456.apps.googleusercontent.com "))
    }
}
