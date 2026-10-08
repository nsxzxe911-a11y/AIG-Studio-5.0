package com.aigstudio.core

import java.util.concurrent.CountDownLatch
import java.util.concurrent.TimeUnit
import java.util.concurrent.CopyOnWriteArrayList

fun main() {
    val firstEntered=CountDownLatch(1)
    val releaseFirst=CountDownLatch(1)
    val done=CountDownLatch(2)
    val executed=CopyOnWriteArrayList<Int>()
    LatestWinsWorkQueue<Int>("latest-wins-regression") { value ->
        executed += value
        if(value==1) {
            firstEntered.countDown()
            check(releaseFirst.await(2,TimeUnit.SECONDS))
        }
        done.countDown()
    }.use { queue ->
        check(queue.submit(1))
        check(firstEntered.await(2,TimeUnit.SECONDS))
        check(queue.submit(2))
        check(queue.submit(3))
        releaseFirst.countDown()
        check(done.await(2,TimeUnit.SECONDS))
        check(executed == listOf(1,3)) { "stale pending work executed: $executed" }
        val stats=queue.stats()
        check(stats.submitted==3L)
        check(stats.executed==2L)
        check(stats.replaced>=1L)
    }
    println("LATEST_WINS_WORK_QUEUE_PASS|BOUNDED_PENDING|STALE_WORK_REPLACED")
}
