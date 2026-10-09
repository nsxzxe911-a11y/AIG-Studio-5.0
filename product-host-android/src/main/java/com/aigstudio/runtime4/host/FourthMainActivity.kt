package com.aigstudio.runtime4.host

import android.app.Activity
import android.os.Bundle
import com.aigstudio.production.runtime.FourthCadRuntimeAdapter
import com.aigstudio.runtime4.renderer.gpu.AigGlesView

class FourthMainActivity : Activity() {
    private lateinit var glesView: AigGlesView

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        glesView = AigGlesView(this, FourthCadRuntimeAdapter())
        setContentView(glesView)
    }

    override fun onResume() {
        super.onResume()
        glesView.onResume()
    }

    override fun onPause() {
        glesView.onPause()
        super.onPause()
    }
}
