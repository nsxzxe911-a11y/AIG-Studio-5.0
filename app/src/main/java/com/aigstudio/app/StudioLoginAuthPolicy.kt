package com.aigstudio.app

data class StudioLoginDecision(
    val allowEnter: Boolean,
    val mode: String,
    val message: String
)

object StudioLoginAuthPolicy {
    fun decide(
        configured: Boolean,
        networkAvailable: Boolean,
        credentialsValid: Boolean
    ): StudioLoginDecision = when {
        !configured && !networkAvailable -> StudioLoginDecision(
            allowEnter = false,
            mode = "",
            message = "首次建立 AIG 本機登入需要網路"
        )
        !configured -> StudioLoginDecision(
            allowEnter = true,
            mode = "LOCAL_ENROLL",
            message = "本機 AIG 登入可建立"
        )
        !credentialsValid -> StudioLoginDecision(
            allowEnter = false,
            mode = "",
            message = "AIG 帳號或密碼不正確"
        )
        networkAvailable -> StudioLoginDecision(
            allowEnter = true,
            mode = "LOCAL_ONLINE",
            message = "AIG 登入成功 • ONLINE"
        )
        else -> StudioLoginDecision(
            allowEnter = true,
            mode = "LOCAL_OFFLINE",
            message = "AIG 登入成功 • OFFLINE"
        )
    }
}
