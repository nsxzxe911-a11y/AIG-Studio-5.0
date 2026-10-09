package com.aigstudio.runtime4.host

import android.app.Activity
import android.os.Bundle
import android.util.Log
import com.aigstudio.production.runtime.FourthCadRuntimeAdapter
import com.aigstudio.runtime4.renderer.gpu.AigGlesView

class FourthMainActivity : Activity() {
    private lateinit var glesView: AigGlesView
    private lateinit var runtime: RecoveringCadRuntimePort

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        val adapter = FourthCadRuntimeAdapter()
        val autosave = CadAutosaveController(filesDir, adapter)
        runtime = RecoveringCadRuntimePort(adapter, autosave)
        glesView = AigGlesView(this, runtime) {
            val restored = runtime.completeRecovery()
            Log.i("AIG4", "AIG4_CAD|RECOVERY|" + when {
                restored == null -> "NO_CHECKPOINT"
                restored.accepted -> "RESTORED"
                else -> "REJECTED_LOCAL_WARNING"
            })
            glesView.requestRender()
        }
        setContentView(glesView)
    }

    override fun onResume() {
        super.onResume()
        glesView.onResume()
    }

    override fun onPause() {
        runCatching { runtime.saveNowIfReady() }
            .onFailure { Log.w("AIG4", "AIG4_CAD|AUTOSAVE|WARNING|${it.message}") }
        glesView.onPause()
        super.onPause()
    }
}
