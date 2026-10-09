package com.aigstudio.runtime4.renderer

import com.aigstudio.runtime4.contract.SceneId
import org.junit.Assert.assertEquals
import org.junit.Test

class SceneRouterRegression {
    @Test fun homeCadHomeRoutingIsExplicit() {
        val router = SceneRouter(SceneId.HOME)
        assertEquals(SceneId.HOME, router.current)
        assertEquals(SceneId.CAD, router.navigate(SceneId.CAD))
        assertEquals(SceneId.HOME, router.navigate(SceneId.HOME))
    }
}
