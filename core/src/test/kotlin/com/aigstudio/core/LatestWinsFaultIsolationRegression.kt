package com.aigstudio.core

import java.util.concurrent.CountDownLatch
import java.util.concurrent.TimeUnit
import java.util.concurrent.atomic.AtomicInteger

object LatestWinsFaultIsolationRegression {
    @JvmStatic fun main(args:Array<String>) {
        val executed=mutableListOf<Int>()
        val faults=AtomicInteger(0)
        val done=CountDownLatch(1)

        LatestWinsWorkQueue<Int>("fault-isolation") { value ->
            if(value==1) error("expected worker fault")
            synchronized(executed) { executed += value }
            done.countDown()
        }.setFaultListener { faults.incrementAndGet() }.use { queue ->
            check(queue.submit(1))
            Thread.sleep(100)
            check(queue.submit(2))
            check(done.await(2,TimeUnit.SECONDS))
            Thread.sleep(50)
            val stats=queue.stats()
            check(executed==listOf(2))
            check(faults.get()==1)
            check(stats.failed==1L)
            check(stats.executed==1L)
            check(stats.submitted==2L)
        }

        println("LATEST_WINS_FAULT_ISOLATION_PASS")
    }
}
