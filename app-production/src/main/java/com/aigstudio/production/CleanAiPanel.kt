package com.aigstudio.production

import android.content.Context
import android.graphics.Color
import android.graphics.Typeface
import android.util.Log
import android.view.Gravity
import android.widget.Button
import android.widget.EditText
import android.widget.GridLayout
import android.widget.LinearLayout
import android.widget.TextView
import com.aigstudio.production.runtime.CleanAiSession
import com.aigstudio.production.runtime.CleanAiSnapshot
import com.aigstudio.production.runtime.CleanAiUpdateSession

class CleanAiPanel(
    context:Context,
    private val session:CleanAiSession,
    private val updateSession:CleanAiUpdateSession,
    private val onStatus:(String)->Unit
):LinearLayout(context) {
    private val state=TextView(context)
    private val digests=TextView(context)
    private val summary=TextView(context)
    private val updateState=TextView(context)
    private val editor=EditText(context)

    init {
        orientation=VERTICAL; setPadding(dp(8),dp(8),dp(8),dp(8))
        state.setTextColor(Color.rgb(99,255,157)); state.textSize=13f; state.setTypeface(state.typeface,Typeface.BOLD)
        digests.setTextColor(Color.rgb(61,235,255)); digests.textSize=10f
        summary.setTextColor(Color.LTGRAY); summary.textSize=10f; summary.maxLines=2
        updateState.setTextColor(Color.rgb(61,235,255)); updateState.textSize=10f
        updateState.text="UPDATE • LOCAL POLICY READY • ONLINE AGENT NOT CONNECTED"
        addView(state); addView(digests); addView(summary); addView(updateState)
        editor.apply {
            contentDescription="AI WORKING COPY EDITOR"; setTextColor(Color.WHITE); setHintTextColor(Color.GRAY)
            setBackgroundColor(0xCC07111B.toInt()); textSize=13f; gravity=Gravity.TOP or Gravity.START
            setPadding(dp(10),dp(8),dp(10),dp(8)); minLines=8
        }
        addView(editor,LayoutParams(-1,0,1f))
        val grid=GridLayout(context).apply { columnCount=3; rowCount=3 }
        listOf(
            Triple("OPEN MAIN","AI OPEN MAIN",{ openMain() }),
            Triple("STAGE EDIT","AI STAGE EDIT",{ stageEdit() }),
            Triple("VERIFY","AI VERIFY",{ verify() }),
            Triple("PROMOTE","AI PROMOTE",{ promote() }),
            Triple("RESTORE MAIN","AI RESTORE MAIN",{ restore() }),
            Triple("PACKAGE HEALTH","AI PACKAGE HEALTH",{ packageHealth() }),
            Triple("UPDATE RULES","AI UPDATE RULES",{ updateRules() })
        ).forEachIndexed { i,(label,desc,action) ->
            val b=Button(context).apply { text=label; contentDescription=desc; isAllCaps=false; textSize=9f; setOnClickListener{action()} }
            grid.addView(b,GridLayout.LayoutParams().apply { width=0; height=dp(44); columnSpec=GridLayout.spec(i%3,1f); rowSpec=GridLayout.spec(i/3,1f); setMargins(dp(2),dp(2),dp(2),dp(2)) })
        }
        addView(grid,LayoutParams(-1,-2))
        val snap=session.openMain(); editor.setText(snap.workingProgram); render(snap,"OPEN")
        Log.i("AIG-CLEAN-AI","CLEAN_AI_PANEL_MOUNT|PASS|IMMUTABLE_WORKING_VERIFIED|UPDATE_REPAIR_POLICY")
    }

    private fun openMain(){ val s=session.openMain(); editor.setText(s.workingProgram); render(s,"OPEN"); Log.i("AIG-CLEAN-AI","CLEAN_AI_OPEN|PASS") }
    private fun stageEdit(){ val s=session.stage(editor.text.toString()); render(s,"STAGED"); Log.i("AIG-CLEAN-AI","CLEAN_AI_STAGE|PASS|changes=${s.hasChanges}") }
    private fun verify(){ val s=session.verify(); render(s,if(s.verified)"VERIFIED" else "BLOCKED"); Log.i("AIG-CLEAN-AI","CLEAN_AI_VERIFY|${if(s.verified)"PASS" else "BLOCKED"}|issues=${s.issueCount}") }
    private fun promote(){
        val result=runCatching{session.promote()}
        if(result.isSuccess){ val s=result.getOrThrow(); editor.setText(s.currentMain); render(s,"PROMOTED"); Log.i("AIG-CLEAN-AI","CLEAN_AI_PROMOTE|PASS") }
        else { state.setTextColor(Color.rgb(255,196,64)); state.text="PROMOTE BLOCKED • VERIFY REQUIRED"; onStatus(state.text.toString()); Log.i("AIG-CLEAN-AI","CLEAN_AI_PROMOTE|BLOCKED|VERIFY_REQUIRED") }
    }
    private fun restore(){ val s=session.restoreWorkingToMain(); editor.setText(s.workingProgram); render(s,"RESTORED"); Log.i("AIG-CLEAN-AI","CLEAN_AI_RESTORE|PASS") }
    private fun packageHealth(){
        val u=updateSession.health(); updateState.setTextColor(if(u.packageHealthy) Color.rgb(99,255,157) else Color.rgb(255,196,64))
        updateState.text="UPDATE • ${u.status} • packages=${u.packageCount}"; Log.i("AIG-CLEAN-AI","CLEAN_AI_UPDATE_HEALTH|${if(u.packageHealthy)"PASS" else "BLOCKED"}|packages=${u.packageCount}")
    }
    private fun updateRules(){ updateState.setTextColor(Color.rgb(61,235,255)); updateState.text=updateSession.policySummary(); Log.i("AIG-CLEAN-AI","CLEAN_AI_UPDATE_POLICY|${updateSession.policySummary()}") }

    private fun render(s:CleanAiSnapshot,action:String){
        val ok=s.verified || s.issueCount==0; state.setTextColor(if(ok) Color.rgb(99,255,157) else Color.rgb(255,196,64))
        state.text="AI $action • ${s.state} • issues=${s.issueCount} • changes=${s.hasChanges}"
        fun short(v:String)=if(v.length>=12)v.take(12) else v
        digests.text="IMM=${short(s.immutableMainDigest)}  WORK=${short(s.workingDigest)}  VERIFIED=${short(s.verifiedDigest)}"
        summary.text=s.summary; onStatus(state.text.toString())
    }
    private fun dp(v:Int)= (v*resources.displayMetrics.density).toInt().coerceAtLeast(1)
}
