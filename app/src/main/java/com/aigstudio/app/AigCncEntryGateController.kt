package com.aigstudio.app

import android.app.Activity
import android.util.Log

object AigCncEntryGateController {
    @Volatile
    private var sessionAuthenticated = false

    fun runtimeOverlaysAllowed(): Boolean =
        StudioEntryGateContract.runtimeOverlaysAllowed(sessionAuthenticated)

    fun installIfNeeded(activity: Activity): Boolean {
        if (sessionAuthenticated) {
            Log.i(TAG, "screen=HOME_GATE_PASS")
            return false
        }
        showStartup(activity)
        return true
    }

    private fun showStartup(activity: Activity) {
        Log.i(TAG, "screen=STARTUP")
        activity.setContentView(
            AigCncStartupGateView(activity) {
                showLogin(activity)
            }
        )
    }

    private fun showLogin(activity: Activity) {
        Log.i(TAG, "screen=LOGIN")
        activity.setContentView(
            AigCncLoginGateView(activity) { mode, account ->
                Log.i(TAG, "auth=PASS|mode=$mode|account=${account.take(32)}")
                sessionAuthenticated = true
                activity.recreate()
            }
        )
    }

    private const val TAG = "AIGCNC_ENTRY"
}
