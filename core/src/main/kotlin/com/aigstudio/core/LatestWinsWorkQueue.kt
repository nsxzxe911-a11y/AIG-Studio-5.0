package com.aigstudio.core

import java.util.concurrent.ExecutorService
import java.util.concurrent.Executors
import java.util.concurrent.ThreadFactory
import java.util.concurrent.atomic.AtomicBoolean
import java.util.concurrent.atomic.AtomicLong
import java.util.concurrent.atomic.AtomicReference

/**
 * Bounded single-worker scheduler for expensive SIM/mesh/background work.
 * At most one pending value is retained; newer work replaces stale pending
 * work instead of growing an unbounded queue.
 *
 * A normal worker exception is isolated to that item: the Runtime remains
 * usable and later work can continue. Fatal VM errors are deliberately not
 * swallowed here.
 */
class LatestWinsWorkQueue<T>(
    threadName:String,
    private val worker:(T)->Unit
):AutoCloseable {
    private val closed=AtomicBoolean(false)
    private val draining=AtomicBoolean(false)
    private val pending=AtomicReference<T?>(null)
    private val submitted=AtomicLong(0)
    private val executed=AtomicLong(0)
    private val replaced=AtomicLong(0)
    private val failed=AtomicLong(0)
    @Volatile private var faultListener:((Throwable)->Unit)?=null
    private val executor:ExecutorService=Executors.newSingleThreadExecutor(ThreadFactory { runnable ->
        Thread(runnable,threadName).apply { isDaemon=true; priority=Thread.NORM_PRIORITY }
    })

    fun setFaultListener(listener:(Throwable)->Unit):LatestWinsWorkQueue<T> {
        faultListener=listener
        return this
    }

    fun submit(value:T):Boolean {
        if(closed.get()) return false
        submitted.incrementAndGet()
        if(pending.getAndSet(value)!=null) replaced.incrementAndGet()
        scheduleDrain()
        return true
    }

    private fun scheduleDrain() {
        if(!draining.compareAndSet(false,true)) return
        executor.execute {
            try {
                while(!closed.get()) {
                    val value=pending.getAndSet(null) ?: break
                    try {
                        worker(value)
                        executed.incrementAndGet()
                    } catch(e:Exception) {
                        failed.incrementAndGet()
                        try {
                            faultListener?.invoke(e)
                        } catch(_:Exception) {
                            // Diagnostic listeners are not allowed to terminate the queue.
                        }
                    }
                }
            } finally {
                draining.set(false)
                if(!closed.get() && pending.get()!=null) scheduleDrain()
            }
        }
    }

    fun stats():LatestWinsWorkStats=LatestWinsWorkStats(
        submitted=submitted.get(),
        executed=executed.get(),
        replaced=replaced.get(),
        failed=failed.get(),
        hasPending=pending.get()!=null,
        running=draining.get()
    )

    override fun close() {
        if(!closed.compareAndSet(false,true)) return
        pending.set(null)
        executor.shutdownNow()
    }
}

data class LatestWinsWorkStats(
    val submitted:Long,
    val executed:Long,
    val replaced:Long,
    val failed:Long,
    val hasPending:Boolean,
    val running:Boolean
)
