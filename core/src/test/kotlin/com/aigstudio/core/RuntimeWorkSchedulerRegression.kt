package com.aigstudio.core

import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertTrue

class RuntimeWorkSchedulerRegression {
    @Test
    fun latestRequestWinsAndQueueIsBounded() {
        val queue=BoundedLatestWorkQueue<String>(capacity=3)
        val g1=queue.submit("old-1")
        queue.submit("old-2")
        val g3=queue.submit("latest")
        assertTrue(g3>g1)
        assertEquals("latest",queue.takeLatest()?.payload)
        assertEquals(0,queue.size())
        assertTrue(queue.isCurrent(g3))
        assertFalse(queue.isCurrent(g1))
    }

    @Test
    fun renderDemandStopsWhenHiddenOrIdle() {
        val gate=RenderDemandGate()
        gate.setVisible(false)
        gate.markDirty()
        assertFalse(gate.shouldRender())
        gate.setVisible(true)
        assertTrue(gate.shouldRender())
        gate.onFramePresented()
        assertFalse(gate.shouldRender())
        gate.setAnimationActive(true)
        assertTrue(gate.shouldRender())
        gate.setVisible(false)
        assertFalse(gate.shouldRender())
    }

    @Test
    fun policyProtectsCncTruth() {
        assertTrue(RuntimeWorkPolicy.RENDER_ON_DEMAND)
        assertTrue(RuntimeWorkPolicy.LATEST_REQUEST_WINS)
        assertTrue(RuntimeWorkPolicy.BOUNDED_QUEUE)
        assertEquals(0.001,RuntimeWorkPolicy.CNC_TRUTH_RESOLUTION_MM)
    }
}
