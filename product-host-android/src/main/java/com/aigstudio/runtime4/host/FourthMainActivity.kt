package com.aigstudio.runtime4.host

import android.app.Activity
import android.os.Bundle
import android.util.Log
import com.aigstudio.production.runtime.FourthCadRuntimeAdapter
import com.aigstudio.production.runtime.FourthCamRuntimeAdapter
import com.aigstudio.production.runtime.FourthNcRuntimeAdapter
import com.aigstudio.runtime4.renderer.gpu.AigGlesView

class FourthMainActivity:Activity(){
    private lateinit var glesView:AigGlesView
    private lateinit var cadRuntime:RecoveringCadRuntimePort
    private lateinit var camRuntime:RecoveringCamRuntimePort
    private lateinit var ncRuntime:RecoveringNcRuntimePort
    private lateinit var recoveryPlan:FourthRuntimeRecoveryPlan

    override fun onCreate(savedInstanceState:Bundle?){
        super.onCreate(savedInstanceState)
        val cadAdapter=FourthCadRuntimeAdapter()
        val camAdapter=FourthCamRuntimeAdapter()
        val ncAdapter=FourthNcRuntimeAdapter()
        cadRuntime=RecoveringCadRuntimePort(cadAdapter,CadAutosaveController(filesDir,cadAdapter))
        camRuntime=RecoveringCamRuntimePort(camAdapter,CamAutosaveController(filesDir,camAdapter))
        ncRuntime=RecoveringNcRuntimePort(ncAdapter,NcAutosaveController(filesDir,ncAdapter))
        recoveryPlan=FourthRuntimeRecoveryPlan(
            cadComplete={val r=cadRuntime.completeRecovery();RecoveryDomainStatus("CAD",r?.accepted,r==null)},
            camComplete={val r=camRuntime.completeRecovery();RecoveryDomainStatus("CAM",r?.accepted,r==null)},
            ncComplete={val r=ncRuntime.completeRecovery();RecoveryDomainStatus("NC",r?.accepted,r==null)},
            cadSave={cadRuntime.saveNowIfReady()},
            camSave={camRuntime.saveNowIfReady()},
            ncSave={ncRuntime.saveNowIfReady()},
        )
        glesView=AigGlesView(this,cadRuntime,camRuntime,ncRuntime){
            recoveryPlan.completeAll().forEach{status->
                Log.i("AIG4","AIG4_${status.domain}|RECOVERY|"+recoveryStatus(status))
                status.warning?.let{Log.w("AIG4","AIG4_${status.domain}|RECOVERY|WARNING|$it")}
            }
            glesView.requestRender()
        }
        setContentView(glesView)
    }

    private fun recoveryStatus(status:RecoveryDomainStatus)=when{
        status.warning!=null->"REJECTED_LOCAL_WARNING"
        status.missing->"NO_CHECKPOINT"
        status.accepted==true->"RESTORED"
        else->"REJECTED_LOCAL_WARNING"
    }
    override fun onResume(){super.onResume();glesView.onResume()}
    override fun onPause(){
        recoveryPlan.saveAll().filter{it.warning!=null}.forEach{Log.w("AIG4","AIG4_${it.domain}|AUTOSAVE|WARNING|${it.warning}")}
        glesView.onPause();super.onPause()
    }
}