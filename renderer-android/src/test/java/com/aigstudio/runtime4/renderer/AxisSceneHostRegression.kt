package com.aigstudio.runtime4.renderer

import com.aigstudio.runtime4.contract.SceneId
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class AxisSceneHostRegression {
    @Test fun latestRequestedSceneWinsAndStaleCommitIsRejected() {
        val host = AxisSceneHost(SceneId.HOME)
        val axis = host.request(SceneId.AXIS3)
        val home = host.request(SceneId.HOME)
        assertFalse(host.commit(axis))
        assertEquals(SceneId.HOME, host.activeScene)
        assertTrue(host.commit(home))
        assertEquals(SceneId.HOME, host.activeScene)
    }

    @Test fun explicitNavigationMaps3axWithoutHomeFallback() {
        assertEquals(SceneId.AXIS3, SharedVisualPolicy.destination("NAV.3AX"))
        assertEquals(SceneId.CAD, SharedVisualPolicy.destination("NAV.CAD"))
        assertEquals(null, SharedVisualPolicy.destination("NAV.4AX"))
    }
}