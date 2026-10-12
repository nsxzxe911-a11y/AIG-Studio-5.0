package com.aigstudio.app

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class StudioLoginAuthPolicyTest {
    @Test
    fun firstLocalAccountEnrollRequiresNetwork() {
        val decision = StudioLoginAuthPolicy.decide(
            configured = false,
            networkAvailable = false,
            credentialsValid = false
        )
        assertFalse(decision.allowEnter)
        assertEquals("首次建立 AIG 本機登入需要網路", decision.message)
    }

    @Test
    fun configuredCredentialsCanEnterOffline() {
        val decision = StudioLoginAuthPolicy.decide(
            configured = true,
            networkAvailable = false,
            credentialsValid = true
        )
        assertTrue(decision.allowEnter)
        assertEquals("LOCAL_OFFLINE", decision.mode)
    }

    @Test
    fun invalidCredentialsNeverEnter() {
        val decision = StudioLoginAuthPolicy.decide(
            configured = true,
            networkAvailable = true,
            credentialsValid = false
        )
        assertFalse(decision.allowEnter)
        assertEquals("AIG 帳號或密碼不正確", decision.message)
    }
}
