package com.aigstudio.core

import java.util.concurrent.atomic.AtomicLong

/**
 * AIG CNC project-scoped connectivity policy.
 *
 * Network access is optional transport for project sync/update. CAD/CAM/SIM/NC
 * remain local-first and continue to work when connectivity is unavailable.
 */
object AigProjectConnectivityPolicy {
    const val POLICY="AIG_PROJECT_LOCAL_FIRST_LATEST_WINS"
    const val OFFLINE_FIRST=true
    const val NETWORK_REQUIRED_FOR_LOCAL_RUNTIME=false
    const val UI_THREAD_BLOCKING_ALLOWED=false
    const val AUTO_APPLY_REMOTE=false
    const val AUTO_ROLLBACK=false
    const val AUTO_DOWNGRADE=false
    const val STALE_RESULT_SUPPRESSION=true
    const val MAX_IN_FLIGHT_REQUESTS=1
    const val RECONNECT_DEBOUNCE_MS=40L
    const val RETRY_BASE_MS=120L
    const val RETRY_MAX_MS=6_500L

    fun statusZhTw(validatedNetwork:Boolean,pending:Boolean,conflict:Boolean):String = when {
        conflict -> "同步有差異 • 請選擇新版 / 保留本機 / 另存副本"
        !validatedNetwork && pending -> "離線使用中 • 同步暫停 • 本機資料已保留"
        !validatedNetwork -> "離線模式 • Runtime 可繼續使用"
        pending -> "專案同步中 • Runtime 可繼續操作"
        else -> "專案連線就緒"
    }

    fun retryDelayMs(attempt:Int):Long {
        val safe=attempt.coerceIn(0,8)
        var delay=RETRY_BASE_MS
        repeat(safe) { delay=(delay*2L).coerceAtMost(RETRY_MAX_MS) }
        return delay.coerceAtMost(RETRY_MAX_MS)
    }
}

class AigProjectRequestGeneration {
    private val value=AtomicLong(0L)
    fun next():Long=value.incrementAndGet()
    fun current():Long=value.get()
    fun isCurrent(token:Long):Boolean=token==value.get()
}
