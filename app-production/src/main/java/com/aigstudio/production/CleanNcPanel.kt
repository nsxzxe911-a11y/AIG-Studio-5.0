package com.aigstudio.production

import android.content.Context
import android.graphics.Color
import android.graphics.Typeface
import android.graphics.drawable.GradientDrawable
import android.util.Log
import android.view.Gravity
import android.widget.Button
import android.widget.EditText
import android.widget.GridLayout
import android.widget.LinearLayout
import android.widget.TextView
import com.aigstudio.production.runtime.CleanNcSession

class CleanNcPanel(
    context:Context,
    private val session:CleanNcSession,
    private val onStatus:(String)->Unit
):LinearLayout(context) {
    private val info=TextView(context)
    private val editor=EditText(context)

    init {
        orientation=VERTICAL
        setPadding(dp(6),dp(6),dp(6),dp(6))
        info.apply { setTextColor(Color.rgb(99,255,157)); textSize=11f; typeface=Typeface.MONOSPACE; gravity=Gravity.START }
        addView(info,LayoutParams(-1,-2))
        editor.apply {
            contentDescription="NC EDITOR"
            setTextColor(Color.WHITE); setHintTextColor(Color.GRAY); textSize=12f; typeface=Typeface.MONOSPACE
            gravity=Gravity.TOP or Gravity.START; setPadding(dp(10),dp(8),dp(10),dp(8)); minLines=8
            background=GradientDrawable().apply { setColor(0xD807111B.toInt()); cornerRadius=dp(8).toFloat(); setStroke(dp(1),Color.rgb(61,235,255)) }
            setText(session.program())
        }
        addView(editor,LayoutParams(-1,0,1f))
        val grid=GridLayout(context).apply { columnCount=4; alignmentMode=GridLayout.ALIGN_BOUNDS }
        val actions=listOf(
            "VERIFY" to { verifyNow() },
            "SAMPLE" to { session.loadSample(); editor.setText(session.program()); verifyNow() },
            "G41" to { insert(" G41 ") },
            "G42" to { insert(" G42 ") },
            "G34/G83" to { insert("\nG34 J0. I30. K6 G83 R3. Z-20. Q2. F150.\n") },
            "M98 P4" to { insert("\nM98 P4\n") },
            "M98 P5" to { insert("\nM98 P5\n") },
            "NL" to { insert("\n") },
            "G" to { insert("G") }, "M" to { insert("M") }, "X" to { insert("X") }, "Y" to { insert("Y") },
            "Z" to { insert("Z") }, "F" to { insert("F") }, "S" to { insert("S") }, "T" to { insert("T") }
        )
        actions.forEachIndexed { i,(label,action) ->
            val b=Button(context).apply { text=label; isAllCaps=false; textSize=9f; setTextColor(Color.WHITE); contentDescription="NC $label"; setOnClickListener{action()} }
            grid.addView(b,GridLayout.LayoutParams().apply { width=0; height=dp(42); columnSpec=GridLayout.spec(i%4,1f); setMargins(dp(1),dp(1),dp(1),dp(1)) })
        }
        addView(grid,LayoutParams(-1,-2))
        verifyNow()
        Log.i("AIG-CLEAN-NC","CLEAN_NC_PANEL_MOUNT|PASS|REAL_FANUC_RUNTIME")
    }

    private fun insert(text:String) {
        val p=editor.selectionStart.coerceAtLeast(0)
        editor.text.insert(p,text)
        session.setProgram(editor.text.toString())
        info.text="NC EDIT • UNSAVED VERIFY • ${editor.lineCount} lines"
        onStatus("NC EDIT | VERIFY REQUIRED")
    }

    private fun verifyNow() {
        session.setProgram(editor.text.toString())
        val s=session.validate()
        info.setTextColor(if(s.ready) Color.rgb(99,255,157) else Color.rgb(255,210,77))
        info.text=if(s.ready) "${s.status}\n${s.timelineSummary}" else "${s.status}\n${s.alarmText}"
        onStatus(s.status)
        Log.i("AIG-CLEAN-NC","CLEAN_NC_VERIFY|${if(s.ready) "READY" else "ALARM"}|events=${s.eventCount}|line=${s.alarmLine ?: 0}")
    }

    private fun dp(v:Int)= (v*resources.displayMetrics.density).toInt().coerceAtLeast(1)
}
