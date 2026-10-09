package com.aigstudio.production.runtime

import com.aigstudio.runtime4.contract.*
import kotlin.test.*
import kotlin.math.abs
import kotlin.math.hypot

class CadSnapPreviewRegression {
    private fun near(a:Double,b:Double,eps:Double=1e-6)=abs(a-b)<=eps
    private fun adapter():FourthCadRuntimeAdapter {
        val s=CleanCadSession()
        s.addLine(0.0,0.0,10.0,0.0)
        s.addLine(25.0,30.0,35.0,30.0); s.addLine(30.0,25.0,30.0,35.0)
        s.addCircle(50.0,50.0,5.0)
        return FourthCadRuntimeAdapter(s)
    }
    private fun setMode(a:FourthCadRuntimeAdapter,target:CadSnapMode){
        repeat(CadSnapMode.entries.size+1){ if(a.snapshot().snapMode==target)return; a.dispatch(CadCommand.CycleSnap) }
        error("snap mode not reached")
    }
    private fun preview(a:FourthCadRuntimeAdapter,mode:CadSnapMode,p:CadPoint,ref:CadPoint?=null):CadPoint {
        a.dispatch(CadCommand.SelectTool(CadTool.LINE)); setMode(a,mode)
        if(ref!=null)a.dispatch(CadCommand.PointerDown(ref))
        val before=a.snapshot().revision
        val r=a.dispatch(CadCommand.PointerMove(p))
        assertTrue(r.accepted); assertEquals(before,r.state.revision)
        return requireNotNull(r.state.snapPreview){"$mode preview missing"}
    }
    @Test fun authoritativeSnapModesExposePreviewWithoutRevisionMutation(){
        val a=adapter()
        preview(a,CadSnapMode.ENDPOINT,CadPoint(.2,.1)).also{assertTrue(near(it.x,0.0)&&near(it.y,0.0))}
        preview(a,CadSnapMode.MIDPOINT,CadPoint(5.1,.1)).also{assertTrue(near(it.x,5.0)&&near(it.y,0.0))}
        preview(a,CadSnapMode.CENTER,CadPoint(50.2,49.9)).also{assertTrue(near(it.x,50.0)&&near(it.y,50.0))}
        preview(a,CadSnapMode.INTERSECTION,CadPoint(30.2,30.1)).also{assertTrue(near(it.x,30.0)&&near(it.y,30.0))}
        preview(a,CadSnapMode.HORIZONTAL,CadPoint(8.0,.2),CadPoint(0.0,0.0)).also{assertTrue(near(it.x,8.0)&&near(it.y,0.0))}
        preview(a,CadSnapMode.VERTICAL,CadPoint(.2,8.0),CadPoint(0.0,0.0)).also{assertTrue(near(it.x,0.0)&&near(it.y,8.0))}
        preview(a,CadSnapMode.TANGENT,CadPoint(55.1,50.0)).also{assertTrue(near(hypot(it.x-50.0,it.y-50.0),5.0,1e-5))}
        setMode(a,CadSnapMode.OFF)
        assertNull(a.snapshot().snapPreview)
        val rev=a.snapshot().revision
        assertNull(a.dispatch(CadCommand.PointerMove(CadPoint(.2,.1))).state.snapPreview)
        assertEquals(rev,a.snapshot().revision)
    }
}
