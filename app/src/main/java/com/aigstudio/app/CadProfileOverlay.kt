package com.aigstudio.app

import android.app.Activity
import android.app.AlertDialog
import android.content.Context
import android.text.InputType
import android.view.View
import android.view.ViewGroup
import android.widget.EditText
import android.widget.FrameLayout
import android.widget.LinearLayout
import android.widget.Toast
import com.aigstudio.core.*
import kotlin.math.roundToInt

/** Adds one CAD "輪廓" multifunction button beside the existing exact/3D assist rail. */
object CadProfileOverlayInstaller {
    private const val EXISTING_RAIL_TAG="AIG_CAD_EXACT_3D_ASSIST_V1"
    private const val BUTTON_TAG="AIG_CAD_PROFILE_TOOLS_V1"

    fun install(activity:Activity) {
        attach(activity,activity.window.decorView,0)
    }

    private fun attach(activity:Activity,decor:View,attempt:Int) {
        decor.postDelayed({
            val cad=findCadView(decor)
            val stage=cad?.parent as? FrameLayout
            val rail=stage?.findViewWithTag<View>(EXISTING_RAIL_TAG) as? LinearLayout
            if(cad==null || stage==null || rail==null) {
                if(attempt<4) attach(activity,decor,attempt+1)
                return@postDelayed
            }
            if(rail.findViewWithTag<View>(BUTTON_TAG)!=null) return@postDelayed
            rail.addView(RgbGlowButton(activity).apply {
                tag=BUTTON_TAG
                text="輪廓"
                contentDescription="CAD PROFILE MULTIFUNCTION • POLYLINE SLOT CHECK JOIN BREAK"
                minHeight=dp(activity,42)
                minWidth=dp(activity,86)
                textSize=10f
                maxLines=1
                setRgbState(0xFFFFB020.toInt(),false)
                setOnClickListener { showMenu(activity,cad) }
            })
        },if(attempt==0) 30L else 80L)
    }

    private fun findCadView(view:View):CadView? {
        if(view is CadView) return view
        if(view is ViewGroup) for(i in 0 until view.childCount) findCadView(view.getChildAt(i))?.let{return it}
        return null
    }

    private fun showMenu(activity:Activity,cad:CadView) {
        val labels=arrayOf(
            "POLYLINE • 開放多段線",
            "POLYLINE • 閉合輪廓",
            "SLOT • 長圓槽",
            "CHECK • 閉合輪廓檢查",
            "JOIN • 焊接兩線端點",
            "BREAK • 指定距離切斷線段"
        )
        AlertDialog.Builder(activity)
            .setTitle("CAD • 輪廓")
            .setItems(labels){d,w->
                d.dismiss()
                when(w) {
                    0 -> showPolyline(activity,cad,false)
                    1 -> showPolyline(activity,cad,true)
                    2 -> showSlot(activity,cad)
                    3 -> checkContour(activity,cad)
                    4 -> joinSelected(activity,cad)
                    5 -> breakSelected(activity,cad)
                }
            }
            .setNegativeButton("關閉",null)
            .show()
    }

    private fun showPolyline(activity:Activity,cad:CadView,closed:Boolean) {
        val input=EditText(activity).apply {
            hint="每行一點：X,Y"
            setText(if(closed) "0.000,0.000\n20.000,0.000\n20.000,10.000\n0.000,10.000" else "0.000,0.000\n20.000,0.000\n20.000,10.000")
            inputType=InputType.TYPE_CLASS_TEXT or InputType.TYPE_TEXT_FLAG_MULTI_LINE
            minLines=4
            maxLines=10
        }
        AlertDialog.Builder(activity)
            .setTitle(if(closed) "POLYLINE • 閉合" else "POLYLINE • 開放")
            .setMessage("輸入 X,Y；最小線段 0.001 mm。閉合模式會自動由最後一點接回第一點。")
            .setView(input)
            .setPositiveButton("建立"){_,_->
                runCatching {
                    val points=parsePoints(input.text.toString())
                    val lines=CadProfileTools.polyline(points,closed)
                    runCommand(cad,AddEntitiesCommand(lines))
                    refreshAssist(cad)
                    Toast.makeText(activity,"POLYLINE PASS • ${lines.size} segments • Undo/Redo READY",Toast.LENGTH_SHORT).show()
                }.onFailure { warn(activity,it.message ?: "POLYLINE blocked") }
            }
            .setNegativeButton("取消",null)
            .show()
    }

    private fun parsePoints(raw:String):List<Vec2> = raw.lineSequence()
        .map{it.trim()}.filter{it.isNotBlank()}.mapIndexed { index,line ->
            val parts=line.split(',', ' ', '\t').map{it.trim()}.filter{it.isNotBlank()}
            require(parts.size==2) { "第 ${index+1} 點格式應為 X,Y" }
            val x=parts[0].toDoubleOrNull() ?: error("第 ${index+1} 點 X 無效")
            val y=parts[1].toDoubleOrNull() ?: error("第 ${index+1} 點 Y 無效")
            Vec2(x,y)
        }.toList()

    private fun showSlot(activity:Activity,cad:CadView) {
        fields(
            activity,"SLOT • 長圓槽",
            listOf("中心 X" to "0.000","中心 Y" to "0.000","總長 L mm" to "20.000","寬 W mm" to "6.000","角度 °" to "0.000")
        ){v->
            val entities=CadProfileTools.slot(Vec2(v[0],v[1]),v[2],v[3],v[4])
            runCommand(cad,AddEntitiesCommand(entities))
            refreshAssist(cad)
            Toast.makeText(activity,"SLOT PASS • CLOSED CONTOUR • Undo/Redo READY",Toast.LENGTH_SHORT).show()
        }
    }

    private fun checkContour(activity:Activity,cad:CadView) {
        runCatching {
            val selected=selectedIds(cad)
            val all=cad.snapshot().entities
            val targets=if(selected.isEmpty()) all else all.filter{it.id in selected}
            require(targets.isNotEmpty()) { "沒有可檢查的 CAD 幾何" }
            val report=CadProfileTools.analyze(targets)
            val scope=if(selected.isEmpty()) "整張 CAD" else "選取 ${targets.size} 圖元"
            AlertDialog.Builder(activity)
                .setTitle(if(report.closed) "輪廓 CLOSED" else "輪廓尚未閉合")
                .setMessage("$scope\n${report.statusLabel()}\n\n閉合判斷容差：0.001 mm")
                .setPositiveButton("知道了",null)
                .show()
        }.onFailure { warn(activity,it.message ?: "Contour check blocked") }
    }

    private fun joinSelected(activity:Activity,cad:CadView) {
        runCatching {
            val lines=selectedEntities(cad).filterIsInstance<Line>()
            require(lines.size==2 && selectedIds(cad).size==2) { "JOIN 請只選取兩條 LINE" }
            val joined=CadProfileTools.join(lines[0],lines[1])
            runCommand(cad,ReplaceEntitiesCommand(lines,listOf(joined.first,joined.second)))
            refreshAssist(cad)
            Toast.makeText(activity,"JOIN PASS • endpoints welded <= 0.001 mm",Toast.LENGTH_SHORT).show()
        }.onFailure { warn(activity,it.message ?: "JOIN blocked") }
    }

    private fun breakSelected(activity:Activity,cad:CadView) {
        runCatching {
            val selected=selectedEntities(cad)
            require(selected.size==1 && selected.first() is Line) { "BREAK 請只選取一條 LINE" }
            selected.first() as Line
        }.onSuccess { line ->
            fields(activity,"BREAK • 距起點切斷",listOf("距起點 mm" to DisplayFormat.mm(line.length/2.0))){v->
                val pieces=CadProfileTools.breakLine(line,v[0])
                runCommand(cad,ReplaceEntitiesCommand(listOf(line),listOf(pieces.first,pieces.second)))
                refreshAssist(cad)
                Toast.makeText(activity,"BREAK PASS • 1 LINE → 2 LINE • Undo/Redo READY",Toast.LENGTH_SHORT).show()
            }
        }.onFailure { warn(activity,it.message ?: "BREAK blocked") }
    }

    private fun fields(activity:Activity,title:String,specs:List<Pair<String,String>>,apply:(List<Double>)->Unit) {
        val box=LinearLayout(activity).apply { orientation=LinearLayout.VERTICAL;setPadding(dp(activity,18),dp(activity,8),dp(activity,18),dp(activity,4)) }
        val inputs=specs.map{(label,initial)->EditText(activity).apply {
            hint=label;setText(initial);setSingleLine(true)
            inputType=InputType.TYPE_CLASS_NUMBER or InputType.TYPE_NUMBER_FLAG_DECIMAL or InputType.TYPE_NUMBER_FLAG_SIGNED
            box.addView(this)
        }}
        AlertDialog.Builder(activity)
            .setTitle(title)
            .setMessage("Master X0.000 Y0.000 • 0.001 mm • 套用後可 Undo/Redo")
            .setView(box)
            .setPositiveButton("套用"){_,_->
                val values=inputs.map{it.text.toString().trim().toDoubleOrNull()}
                if(values.any{it==null}) warn(activity,"數值格式錯誤；CAD 保持原狀。")
                else runCatching{apply(values.map{it!!})}.onFailure{warn(activity,it.message ?: "$title blocked")}
            }
            .setNegativeButton("取消",null)
            .show()
    }

    private fun selectedIds(cad:CadView):Set<EntityId> {
        val field=cad.javaClass.getDeclaredField("selectedIds")
        field.isAccessible=true
        @Suppress("UNCHECKED_CAST")
        return (field.get(cad) as? Set<EntityId>)?.toSet().orEmpty()
    }

    private fun selectedEntities(cad:CadView):List<Entity> {
        val ids=selectedIds(cad)
        return cad.snapshot().entities.filter{it.id in ids}
    }

    private fun runCommand(cad:CadView,command:Command) {
        val method=cad.javaClass.getDeclaredMethod("runGeometryCommand",Command::class.java)
        method.isAccessible=true
        runCatching { method.invoke(cad,command) }.getOrElse { throw (it.cause ?: it) }
    }

    private fun refreshAssist(cad:CadView) {
        cad.invalidate()
        val stage=cad.parent as? ViewGroup ?: return
        for(i in 0 until stage.childCount) (stage.getChildAt(i) as? CadAssist3DView)?.syncNow()
    }

    private fun warn(activity:Activity,message:String) {
        AlertDialog.Builder(activity)
            .setTitle("CAD 訊息")
            .setMessage("WARNING • $message\n\nCAD Runtime 保持可用；不回退版本。")
            .setPositiveButton("知道了",null)
            .show()
    }

    private fun dp(context:Context,value:Int)=(value*context.resources.displayMetrics.density).roundToInt()
}
