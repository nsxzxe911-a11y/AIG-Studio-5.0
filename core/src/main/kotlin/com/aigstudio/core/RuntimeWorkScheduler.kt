package com.aigstudio.core

import java.util.ArrayDeque
import java.util.concurrent.atomic.AtomicLong

object RuntimeWorkPolicy {
    const val RENDER_ON_DEMAND=true
    const val LATEST_REQUEST_WINS=true
    const val BOUNDED_QUEUE=true
    const val UI_THREAD_HEAVY_WORK_ALLOWED=false
    const val BACKGROUND_PRESENT_WHEN_HIDDEN=false
    const val CNC_TRUTH_RESOLUTION_MM=0.001
    const val DEFAULT_QUEUE_CAPACITY=8
}

data class RuntimeWorkItem<T>(val generation:Long,val payload:T)

/**
 * Small bounded queue for replaceable Runtime work such as mesh rebuilds,
 * surface requests and project scans. Consumers intentionally take only the
 * newest useful request so stale work cannot grow without bound.
 */
class BoundedLatestWorkQueue<T>(capacity:Int=RuntimeWorkPolicy.DEFAULT_QUEUE_CAPACITY) {
    private val maxSize=capacity.coerceIn(1,128)
    private val generation=AtomicLong(0L)
    private val queue=ArrayDeque<RuntimeWorkItem<T>>()

    @Synchronized
    fun submit(payload:T):Long {
        val id=generation.incrementAndGet()
        while(queue.size>=maxSize) queue.removeFirst()
        queue.addLast(RuntimeWorkItem(id,payload))
        return id
    }

    /** Returns only the newest queued request and discards stale queued work. */
    @Synchronized
    fun takeLatest():RuntimeWorkItem<T>? {
        if(queue.isEmpty()) return null
        val latest=queue.removeLast()
        queue.clear()
        return latest
    }

    @Synchronized fun clear()=queue.clear()
    @Synchronized fun size():Int=queue.size
    fun currentGeneration():Long=generation.get()
    fun isCurrent(token:Long):Boolean=token==generation.get()
}

/**
 * Render demand gate shared conceptually by Android Vulkan and Windows D3D11.
 * A visible dirty or animated scene may render. Hidden/idle scenes do not spin.
 */
class RenderDemandGate {
    @Volatile private var visible=true
    @Volatile private var dirty=true
    @Volatile private var animationActive=false

    fun setVisible(value:Boolean){ visible=value }
    fun markDirty(){ dirty=true }
    fun setAnimationActive(value:Boolean){ animationActive=value }
    fun shouldRender():Boolean=visible && (dirty || animationActive)
    fun onFramePresented(){ dirty=false }
}
