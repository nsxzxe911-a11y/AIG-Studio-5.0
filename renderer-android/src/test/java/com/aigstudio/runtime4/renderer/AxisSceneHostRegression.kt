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
        assertEquals(SceneId.AXIS4, SharedVisualPolicy.destination("NAV.4AX"))
    }
    @Test fun axis5ParticipatesInLatestWinsCycle() {
        val host=AxisSceneHost(SceneId.AXIS3)
        assertEquals(SceneId.AXIS4,host.navigateImmediate(SceneId.AXIS4))
        val stale=host.request(SceneId.AXIS3)
        val axis5=host.request(SceneId.AXIS5)
        assertFalse(host.commit(stale));assertTrue(host.commit(axis5));assertEquals(SceneId.AXIS5,host.activeScene)
        assertEquals(SceneId.AXIS3,host.navigateImmediate(SceneId.AXIS3))
    }
}