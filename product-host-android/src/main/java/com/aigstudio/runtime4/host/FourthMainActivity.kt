package com.aigstudio.runtime4.host

import android.app.Activity
import android.os.Bundle
import android.util.Log
import com.aigstudio.production.runtime.FourthCadRuntimeAdapter
import com.aigstudio.production.runtime.FourthCamRuntimeAdapter
import com.aigstudio.runtime4.renderer.gpu.AigGlesView

class FourthMainActivity:Activity(){
    private lateinit var glesView:AigGlesView
    private lateinit var cadRuntime:RecoveringCadRuntimePort
    private lateinit var camRuntime:RecoveringCamRuntimePort

    override fun onCreate(savedInstanceState:Bundle?){
        super.onCreate(savedInstanceState)
        val cadAdapter=FourthCadRuntimeAdapter();cadRuntime=RecoveringCadRuntimePort(cadAdapter,CadAutosaveController(filesDir,cadAdapter))
        val camAdapter=FourthCamRuntimeAdapter();camRuntime=RecoveringCamRuntimePort(camAdapter,CamAutosaveController(filesDir,camAdapter))
        glesView=AigGlesView(this,cadRuntime,camRuntime){
            val cadRestored=cadRuntime.completeRecovery();val camRestored=camRuntime.completeRecovery()
            Log.i("AIG4","AIG4_CAD|RECOVERY|"+recoveryStatus(cadRestored?.accepted,cadRestored==null))
            Log.i("AIG4","AIG4_CAM|RECOVERY|"+recoveryStatus(camRestored?.accepted,camRestored==null))
            glesView.requestRender()
        }
        setContentView(glesView)
    }

    private fun recoveryStatus(accepted:Boolean?,missing:Boolean)=when{missing->"NO_CHECKPOINT";accepted==true->"RESTORED";else->"REJECTED_LOCAL_WARNING"}
    override fun onResume(){super.onResume();glesView.onResume()}
    override fun onPause(){
        runCatching{cadRuntime.saveNowIfReady()}.onFailure{Log.w("AIG4","AIG4_CAD|AUTOSAVE|WARNING|${it.message}")}
        runCatching{camRuntime.saveNowIfReady()}.onFailure{Log.w("AIG4","AIG4_CAM|AUTOSAVE|WARNING|${it.message}")}
        glesView.onPause();super.onPause()
    }
}
